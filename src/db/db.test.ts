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
  it('cria as 4 categorias com um produto cada, preço 0', async () => {
    const db = await openFresh();
    const categories = await db.categories.orderBy('order').toArray();
    const products = await db.products.toArray();
    expect(categories.map((c) => c.name)).toEqual([
      'Geladinhos gourmet',
      'Brownies tradicionais',
      'Brownies recheados',
      'Tortas',
    ]);
    const byCategory = (name: string) =>
      products.find((p) => p.categoryId === categories.find((c) => c.name === name)!.id);
    expect(byCategory('Geladinhos gourmet')).toMatchObject({ name: 'Gelinho', code: 'G', priceCents: 0, active: true });
    expect(byCategory('Brownies tradicionais')).toMatchObject({ name: 'Brownie', code: 'B' });
    expect(byCategory('Brownies recheados')).toMatchObject({ name: 'Brownie recheado', code: 'R' });
    expect(byCategory('Tortas')).toMatchObject({ name: 'Torta', code: 't' });
    expect(products).toHaveLength(4);
  });

  it('cria Venda direta e Açougue', async () => {
    const db = await openFresh();
    const points = await db.salesPoints.toArray();
    expect(points.map((p) => [p.name, p.mode])).toEqual(
      expect.arrayContaining([
        ['Venda direta', 'direct'],
        ['Açougue', 'consignment'],
      ]),
    );
    expect(points).toHaveLength(2);
  });

  it('cria as 12 categorias de despesa; só Ingredientes e Embalagens são custo do produto', async () => {
    const db = await openFresh();
    const cats = await db.expenseCategories.toArray();
    expect(cats).toHaveLength(12);
    expect(cats.filter((c) => c.isProductCost).map((c) => c.name).sort()).toEqual(['Embalagens', 'Ingredientes']);
  });

  it('todo registro do seed tem id, createdAt e updatedAt, sem deletedAt', async () => {
    const db = await openFresh();
    const rows = [
      ...(await db.categories.toArray()),
      ...(await db.products.toArray()),
      ...(await db.salesPoints.toArray()),
      ...(await db.expenseCategories.toArray()),
    ];
    for (const r of rows) {
      expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(r.createdAt).toBeTruthy();
      expect(r.updatedAt).toBe(r.createdAt);
      expect(r.deletedAt).toBeUndefined();
    }
  });

  it('não repete o seed quando o banco é reaberto', async () => {
    const db = await openFresh();
    db.close();
    await db.open();
    expect(await db.products.count()).toBe(4);
  });

  it('acha o fechamento de uma semana por produto', async () => {
    const db = await openFresh();
    const [product] = await db.products.toArray();
    const base = { createdAt: '', updatedAt: '', produced: 10, loss: 0, soldDirect: 5, valueCents: 0 };
    await db.weekCloses.bulkAdd([
      { ...base, id: '1', weekStart: '2026-11-02', productId: product!.id },
      { ...base, id: '2', weekStart: '2026-11-09', productId: product!.id },
    ]);
    const found = await db.weekCloses.where({ weekStart: '2026-11-09', productId: product!.id }).first();
    expect(found?.id).toBe('2');
  });
});
