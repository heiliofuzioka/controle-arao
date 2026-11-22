import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { alive } from '../domain/records';
import { receivableCents } from '../domain/settlement';
import { consignmentStock, homeStock } from '../domain/stock';
import { ControleAraoDB } from './db';
import {
  ButcherBlockedError,
  deleteDelivery,
  deleteSettlement,
  loadStockData,
  saveDelivery,
  saveSettlement,
  saveWeekClose,
  setSettlementPaid,
} from './operations';

let db: ControleAraoDB;
let brownie: string;

beforeEach(async () => {
  db = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await db.open();
  brownie = (await db.products.toArray()).find((p) => p.code === 'B')!.id;
});

afterEach(async () => {
  await db.delete();
});

const setPrice = (priceCents: number) => db.products.update(brownie, { priceCents });
const stock = async () => consignmentStock(await loadStockData(db), brownie);

describe('entregar no Açougue', () => {
  it('tira de casa e põe no Açougue', async () => {
    await saveWeekClose(db, '2026-11-09', [{ productId: brownie, produced: 20, loss: 0, soldDirect: 0, valueCents: 0 }]);
    await saveDelivery(db, { date: '2026-11-17', productId: brownie, quantity: 8 });
    const data = await loadStockData(db);
    expect(consignmentStock(data, brownie)).toBe(8);
    expect(homeStock(data, brownie)).toBe(12);
    const [delivery] = await db.deliveries.toArray();
    const butcher = (await db.salesPoints.toArray()).find((p) => p.mode === 'consignment')!;
    expect(delivery).toMatchObject({ pointId: butcher.id, date: '2026-11-17', quantity: 8 });
  });

  it('recusa entrega sem quantidade', async () => {
    await expect(saveDelivery(db, { date: '2026-11-17', productId: brownie, quantity: 0 })).rejects.toBeInstanceOf(ButcherBlockedError);
  });

  it('não deixa apagar uma entrega que o Açougue já vendeu', async () => {
    await setPrice(800);
    const id = await saveDelivery(db, { date: '2026-11-17', productId: brownie, quantity: 8 });
    await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0 });
    await expect(deleteDelivery(db, id)).rejects.toThrow('O Açougue já vendeu parte dessa entrega');
    await expect(saveDelivery(db, { id, date: '2026-11-17', productId: brownie, quantity: 5 })).rejects.toBeInstanceOf(ButcherBlockedError);
    await saveDelivery(db, { id, date: '2026-11-17', productId: brownie, quantity: 6 }); // sobra 0: pode
    expect(await stock()).toBe(0);
  });

  it('apagar marca a entrega', async () => {
    const id = await saveDelivery(db, { date: '2026-11-17', productId: brownie, quantity: 8 });
    await deleteDelivery(db, id);
    expect(alive(await db.deliveries.toArray())).toHaveLength(0);
    expect(await db.deliveries.count()).toBe(1);
  });
});

describe('acerto do Açougue', () => {
  beforeEach(async () => {
    await saveDelivery(db, { date: '2026-11-17', productId: brownie, quantity: 8 });
  });

  it('com preço: vendidos × preço, a receber, e a venda na data do acerto', async () => {
    await setPrice(800);
    await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0 });
    const [settlement] = await db.settlements.toArray();
    expect(settlement).toMatchObject({ soldQuantity: 6, valueCents: 4800, paid: false, remaining: 2 });
    const [sale] = await db.sales.toArray();
    expect(sale).toMatchObject({ date: '2026-11-20', quantity: 6, valueCents: 4800, origin: 'settlement', settlementId: settlement!.id });
    expect(await stock()).toBe(2);
    expect(receivableCents(await db.settlements.toArray())).toBe(4800);
  });

  it('com preço, o valor digitado é ignorado', async () => {
    await setPrice(800);
    await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0, manualValueCents: 1 });
    expect((await db.settlements.toArray())[0]!.valueCents).toBe(4800);
  });

  it('sem preço: usa o valor digitado; sem valor, bloqueia', async () => {
    await expect(saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0 })).rejects.toThrow(
      'Coloque o valor do que o Açougue vendeu.',
    );
    await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0, manualValueCents: 4500 });
    expect((await db.settlements.toArray())[0]).toMatchObject({ soldQuantity: 6, valueCents: 4500, paid: false });
  });

  it('bloqueia sobra maior do que tinha, sem gravar nada', async () => {
    await setPrice(800);
    await expect(saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 10, loss: 0 })).rejects.toThrow(
      'Sobrou mais do que tinha no Açougue (8). Confira os números.',
    );
    expect(await db.settlements.count()).toBe(0);
    expect(await db.sales.count()).toBe(0);
  });

  it('nada vendido: guarda a contagem já como recebido', async () => {
    await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 6, loss: 2 });
    expect((await db.settlements.toArray())[0]).toMatchObject({ soldQuantity: 0, loss: 2, valueCents: 0, paid: true, paidDate: '2026-11-20' });
    expect(await db.sales.count()).toBe(0);
    expect(await stock()).toBe(6);
  });

  it('editar recalcula a partir do estoque de antes, sem contar ele mesmo', async () => {
    await setPrice(800);
    const id = await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0 });
    await saveSettlement(db, { id, date: '2026-11-20', productId: brownie, remaining: 4, loss: 1 });
    const settlements = await db.settlements.toArray();
    const sales = await db.sales.toArray();
    expect(settlements).toHaveLength(1);
    expect(sales).toHaveLength(1);
    expect(settlements[0]).toMatchObject({ soldQuantity: 3, valueCents: 2400 });
    expect(sales[0]).toMatchObject({ quantity: 3, valueCents: 2400 });
    expect(await stock()).toBe(4);
  });

  it('Recebi, desfazer e apagar', async () => {
    await setPrice(800);
    const id = await saveSettlement(db, { date: '2026-11-20', productId: brownie, remaining: 2, loss: 0 });
    await setSettlementPaid(db, id, true, '2026-11-22');
    expect(await db.settlements.get(id)).toMatchObject({ paid: true, paidDate: '2026-11-22' });
    expect(receivableCents(await db.settlements.toArray())).toBe(0);

    await setSettlementPaid(db, id, false, '2026-11-22');
    const undone = await db.settlements.get(id);
    expect(undone).toMatchObject({ paid: false });
    expect(undone!.paidDate).toBeUndefined();

    await deleteSettlement(db, id);
    expect(alive(await db.settlements.toArray())).toHaveLength(0);
    expect(alive(await db.sales.toArray())).toHaveLength(0);
    expect(await stock()).toBe(8); // o que tinha volta a contar
  });
});
