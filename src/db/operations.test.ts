import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { alive } from '../domain/records';
import { homeStock } from '../domain/stock';
import { ControleAraoDB } from './db';
import {
  WeekCloseBlockedError,
  deleteExpense,
  deleteWeekClose,
  deletePersonalExpense,
  loadStockData,
  saveExpense,
  savePersonalExpense,
  saveWeekClose,
} from './operations';

let db: ControleAraoDB;
let gelinho: string;
let brownie: string;

beforeEach(async () => {
  db = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await db.open();
  const products = await db.products.toArray();
  gelinho = products.find((p) => p.code === 'G')!.id;
  brownie = products.find((p) => p.code === 'B')!.id;
});

afterEach(async () => {
  await db.delete();
});

const card = (productId: string, produced: number, soldDirect: number, valueCents: number, loss = 0) => ({
  productId,
  produced,
  loss,
  soldDirect,
  valueCents,
});

describe('salvar o fechamento da semana', () => {
  it('cria um fechamento por produto e a venda na mão no domingo', async () => {
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 40, 36, 18000), card(brownie, 10, 0, 0)], 'agora');

    const closes = await db.weekCloses.toArray();
    expect(closes).toHaveLength(2);
    expect(closes.find((w) => w.productId === gelinho)).toMatchObject({
      weekStart: '2026-11-09',
      produced: 40,
      soldDirect: 36,
      valueCents: 18000,
      createdAt: 'agora',
    });

    const sales = await db.sales.toArray();
    expect(sales).toHaveLength(1); // o Brownie não vendeu na mão
    const direct = (await db.salesPoints.toArray()).find((p) => p.mode === 'direct')!;
    expect(sales[0]).toMatchObject({
      date: '2026-11-15',
      pointId: direct.id,
      productId: gelinho,
      quantity: 36,
      valueCents: 18000,
      origin: 'week_close',
    });
  });

  it('fechar de novo a mesma semana edita, não duplica', async () => {
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 40, 36, 18000)], 'antes');
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 40, 30, 15000)], 'depois');

    const closes = await db.weekCloses.toArray();
    const sales = await db.sales.toArray();
    expect(closes).toHaveLength(1);
    expect(sales).toHaveLength(1);
    expect(closes[0]).toMatchObject({ soldDirect: 30, createdAt: 'antes', updatedAt: 'depois' });
    expect(sales[0]).toMatchObject({ quantity: 30, valueCents: 15000, createdAt: 'antes', updatedAt: 'depois' });
    expect(homeStock(await loadStockData(db), gelinho)).toBe(10);
  });

  it('se a venda zera na edição, a venda antiga fica marcada como apagada', async () => {
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 40, 36, 18000)]);
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 40, 0, 0)]);
    const sales = await db.sales.toArray();
    expect(sales).toHaveLength(1);
    expect(alive(sales)).toHaveLength(0);
  });

  it('usa o que sobrou da semana anterior', async () => {
    await saveWeekClose(db, '2026-11-02', [card(gelinho, 12, 10, 5000)]);
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 10, 12, 6000)]); // 2 + 10 = 12
    expect(homeStock(await loadStockData(db), gelinho)).toBe(0);
  });

  it('bloqueia vender mais do que tinha e não grava nada', async () => {
    const attempt = saveWeekClose(db, '2026-11-09', [card(brownie, 5, 5, 4000), card(gelinho, 10, 15, 7500)]);
    await expect(attempt).rejects.toBeInstanceOf(WeekCloseBlockedError);
    await expect(attempt).rejects.toMatchObject({ productId: gelinho });
    expect(await db.weekCloses.count()).toBe(0); // o Brownie também não foi salvo
    expect(await db.sales.count()).toBe(0);
  });
});

describe('despesas e gastos pessoais', () => {
  it('cria, edita e apaga uma despesa (exclusão marcada)', async () => {
    const [category] = await db.expenseCategories.toArray();
    const id = await saveExpense(
      db,
      { date: '2026-11-08', valueCents: 4200, categoryId: category!.id, description: '  Mercado do dia ' },
      't1',
    );
    expect(await db.expenses.get(id)).toMatchObject({ valueCents: 4200, description: 'Mercado do dia', createdAt: 't1' });

    await saveExpense(db, { id, date: '2026-11-07', valueCents: 5000, categoryId: category!.id, description: '' }, 't2');
    const edited = await db.expenses.get(id);
    expect(edited).toMatchObject({ date: '2026-11-07', valueCents: 5000, createdAt: 't1', updatedAt: 't2' });
    expect(edited!.description).toBeUndefined();
    expect(await db.expenses.count()).toBe(1);

    await deleteExpense(db, id, 't3');
    expect(await db.expenses.get(id)).toMatchObject({ deletedAt: 't3', updatedAt: 't3' });
    expect(await db.expenses.count()).toBe(1);
  });

  it('cria, edita e apaga um gasto pessoal', async () => {
    const id = await savePersonalExpense(db, { date: '2026-11-08', valueCents: 2500, description: 'Lanche' }, 't1');
    await savePersonalExpense(db, { id, date: '2026-11-08', valueCents: 3000 }, 't2');
    expect(await db.personalExpenses.get(id)).toMatchObject({ valueCents: 3000, createdAt: 't1', updatedAt: 't2' });
    await deletePersonalExpense(db, id, 't3');
    expect(alive(await db.personalExpenses.toArray())).toHaveLength(0);
    expect(await db.personalExpenses.count()).toBe(1);
  });
});

describe('apagar a semana', () => {
  it('marca os fechamentos e as vendas da semana; as outras semanas ficam', async () => {
    await saveWeekClose(db, '2026-11-02', [card(gelinho, 12, 10, 5000)]);
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 10, 8, 4000), card(brownie, 5, 5, 4000)]);
    await deleteWeekClose(db, '2026-11-09', 'agora');

    const closes = await db.weekCloses.toArray();
    const sales = await db.sales.toArray();
    expect(closes).toHaveLength(3);
    expect(alive(closes).map((w) => w.weekStart)).toEqual(['2026-11-02']);
    expect(alive(sales)).toHaveLength(1);
    expect(sales.filter((s) => s.deletedAt === 'agora')).toHaveLength(2);
    expect(homeStock(await loadStockData(db), gelinho)).toBe(2);
  });

  it('depois de apagar, fechar a mesma semana cria de novo', async () => {
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 10, 8, 4000)]);
    await deleteWeekClose(db, '2026-11-09');
    await saveWeekClose(db, '2026-11-09', [card(gelinho, 6, 6, 3000)]);
    expect(alive(await db.weekCloses.toArray())).toHaveLength(1);
    expect(alive(await db.sales.toArray())[0]).toMatchObject({ quantity: 6, valueCents: 3000 });
  });
});
