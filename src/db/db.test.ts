import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ControleAraoDB } from './db';

let current: ControleAraoDB | undefined;
const openFresh = async () => {
  current = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await current.open();
  return current;
};

afterEach(async () => {
  await current?.delete();
  current = undefined;
});

describe('banco controle-arao', () => {
  it('cria os produtos do seed com preço 0', async () => {
    const db = await openFresh();
    const products = await db.products.toArray();
    expect(products).toHaveLength(4);
    expect(products.map((p) => [p.name, p.kind, p.code, p.priceCents, p.active])).toEqual(
      expect.arrayContaining([
        ['Gelinho', 'ice_pop', 'G', 0, true],
        ['Brownie', 'baked', 'B', 0, true],
        ['Brownie recheado', 'baked', 'R', 0, true],
        ['Torta', 'baked', 't', 0, true],
      ]),
    );
  });

  it('cria os pontos de venda com o modo certo', async () => {
    const db = await openFresh();
    const points = await db.salesPoints.toArray();
    expect(points).toHaveLength(2);
    expect(points.find((p) => p.name === 'Escola Piratininga')?.mode).toBe('direct');
    expect(points.find((p) => p.name === 'Açougue')?.mode).toBe('consignment');
  });

  it('cria as cinco categorias de despesa', async () => {
    const db = await openFresh();
    const names = (await db.expenseCategories.toArray()).map((c) => c.name).sort();
    expect(names).toEqual(['Embalagem', 'Gás', 'Ingredientes', 'Investimento', 'Mão de obra']);
  });

  it('não repete o seed quando o banco é reaberto', async () => {
    const db = await openFresh();
    db.close();
    await db.open();
    expect(await db.products.count()).toBe(4);
  });

  it('busca lançamentos por intervalo de datas', async () => {
    const db = await openFresh();
    const [product] = await db.products.toArray();
    await db.productions.bulkAdd([
      { id: '1', date: '2026-11-02', productId: product!.id, quantity: 10, loss: 0, createdAt: '' },
      { id: '2', date: '2026-11-09', productId: product!.id, quantity: 5, loss: 1, createdAt: '' },
    ]);
    const week = await db.productions
      .where('date')
      .between('2026-11-02', '2026-11-08', true, true)
      .toArray();
    expect(week.map((p) => p.id)).toEqual(['1']);
  });
});
