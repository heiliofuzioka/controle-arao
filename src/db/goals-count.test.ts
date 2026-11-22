import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { alive } from '../domain/records';
import { consignmentStock, homeStock } from '../domain/stock';
import { ControleAraoDB } from './db';
import { loadStockData, saveMonthlyGoal, saveStockCount } from './operations';

let db: ControleAraoDB;
let gelinho: string;

beforeEach(async () => {
  db = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await db.open();
  gelinho = (await db.products.toArray()).find((p) => p.code === 'G')!.id;
});

afterEach(async () => {
  await db.delete();
});

describe('contar estoque', () => {
  it('grava a contagem e o estoque passa a bater', async () => {
    expect(await saveStockCount(db, '2026-11-22', [{ productId: gelinho, home: 30, consignment: 4 }])).toBe(2);
    const data = await loadStockData(db);
    expect(homeStock(data, gelinho)).toBe(30);
    expect(consignmentStock(data, gelinho)).toBe(4);
    expect((await db.stockAdjustments.toArray()).every((a) => a.reason === 'initial_count')).toBe(true);
  });

  it('contar de novo igual não cria nada; diferente corrige', async () => {
    await saveStockCount(db, '2026-11-22', [{ productId: gelinho, home: 30, consignment: 4 }]);
    expect(await saveStockCount(db, '2026-11-22', [{ productId: gelinho, home: 30, consignment: 4 }])).toBe(0);
    await saveStockCount(db, '2026-11-23', [{ productId: gelinho, home: 28, consignment: 4 }]);
    const last = (await db.stockAdjustments.toArray()).find((a) => a.reason === 'correction');
    expect(last).toMatchObject({ delta: -2, reason: 'correction', location: 'home' });
  });
});

describe('metas do mês', () => {
  it('cria, edita e tira uma meta sem duplicar o mês', async () => {
    await saveMonthlyGoal(db, '2026-11', { revenueCents: 300000, profitCents: 120000 }, 't1');
    await saveMonthlyGoal(db, '2026-11', { revenueCents: 350000, profitCents: null }, 't2');
    const goals = alive(await db.monthlyGoals.toArray());
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ month: '2026-11', revenueCents: 350000, createdAt: 't1', updatedAt: 't2' });
    expect('profitCents' in goals[0]!).toBe(false);
  });
});
