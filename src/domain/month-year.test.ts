import { describe, expect, it } from 'vitest';
import type { HomeData } from './home';
import { monthReport } from './month';
import { BUTCHER, OTHER, P, expense, expenseCategory, personal, points, product, sale, settlement, stockData, weekClose } from './testing';
import type { MonthlyGoal } from './types';
import { compareYears, yearSummary, yearsWithSalesBefore } from './year';

const products = [product({ id: P, name: 'Gelinho' }), product({ id: OTHER, name: 'Brownie', code: 'B' })];
const categories = [
  expenseCategory({ id: 'ing', name: 'Ingredientes', isProductCost: true }),
  expenseCategory({ id: 'gas', name: 'Gás' }),
];

const data = (o: Partial<HomeData> = {}) => ({
  ...stockData(),
  expenses: [],
  personalExpenses: [],
  expenseCategories: categories,
  goals: [] as MonthlyGoal[],
  unitCosts: new Map<string, number>(),
  points,
  ...o,
});

describe('Fechamento do mês', () => {
  it('mês vazio', () => {
    const r = monthReport(data(), products, '2026-11');
    expect(r.hasData).toBe(false);
    expect(r.revenueVsPrevious).toBeNull();
    expect(r.weeks).toHaveLength(5); // novembro/2026 tem 5 domingos
  });

  it('vendas, despesas, comparação com o mês anterior e despesas por categoria', () => {
    const r = monthReport(
      data({
        weekCloses: [weekClose({ id: 'w', weekStart: '2026-10-26', produced: 40, soldDirect: 36 })], // domingo 1/11
        sales: [
          sale({ date: '2026-11-01', quantity: 36, valueCents: 180000, weekCloseId: 'w' }),
          sale({ date: '2026-11-12', productId: OTHER, pointId: BUTCHER, origin: 'settlement', quantity: 10, valueCents: 100000 }),
          sale({ date: '2026-10-20', valueCents: 250000, quantity: 50 }),
        ],
        settlements: [settlement({ productId: OTHER, date: '2026-11-12', soldQuantity: 10, valueCents: 100000 })],
        expenses: [
          expense({ id: 'e1', date: '2026-11-07', categoryId: 'ing', valueCents: 112000 }),
          expense({ id: 'e2', date: '2026-11-02', categoryId: 'gas', valueCents: 8000 }),
          expense({ date: '2026-10-05', categoryId: 'gas', valueCents: 100000 }),
        ],
        personalExpenses: [personal({ date: '2026-11-10', valueCents: 32000 })],
      }),
      products,
      '2026-11',
    );
    expect(r.hasData).toBe(true);
    expect(r.summary).toMatchObject({ revenueCents: 280000, expensesCents: 120000, balanceCents: 160000, personalCents: 32000, leftoverCents: 128000 });
    expect(r.revenueVsPrevious).toMatchObject({ previous: 250000, ratio: 0.12 });
    expect(r.expensesVsPrevious).toMatchObject({ previous: 100000, ratio: 0.2 });
    expect(r.expenses.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(r.categories.map((c) => [c.category.name, c.totalCents, Math.round(c.share * 100)])).toEqual([
      ['Ingredientes', 112000, 93],
      ['Gás', 8000, 7],
    ]);
    expect(r.products.map((p) => [p.product.id, p.produced, p.sold, p.revenueCents])).toEqual([
      [P, 40, 36, 180000],
      [OTHER, 0, 10, 100000],
    ]);
    expect(r.personalExpenses).toHaveLength(1);
  });

  it('semanas do mês: a primeira começa no mês anterior e conta neste', () => {
    const r = monthReport(
      data({
        weekCloses: [weekClose({ weekStart: '2026-10-26', produced: 40, soldDirect: 36 })],
        sales: [sale({ date: '2026-11-01', quantity: 36, valueCents: 61200 })],
      }),
      products,
      '2026-11',
    );
    expect(r.weeks[0]).toMatchObject({ weekStart: '2026-10-26', startsInPreviousMonth: true, closed: true, produced: 40, sold: 36, revenueCents: 61200 });
    expect(r.weeks[1]).toMatchObject({ weekStart: '2026-11-02', startsInPreviousMonth: false, closed: false, revenueCents: 0 });
  });

  it('metas do mês', () => {
    const r = monthReport(
      data({
        sales: [sale({ date: '2026-11-08', valueCents: 274700 })],
        goals: [{ id: 'g', createdAt: '', updatedAt: '', month: '2026-11', revenueCents: 300000 }],
      }),
      products,
      '2026-11',
    );
    expect(r.goals.revenue).toMatchObject({ remainingCents: 25300 });
    expect(r.goals.profit).toBeNull();
  });
});

describe('Ano', () => {
  const yearData = data({
    sales: [
      sale({ date: '2026-06-14', valueCents: 212000 }),
      sale({ date: '2026-11-08', valueCents: 274700 }),
      sale({ date: '2025-06-15', valueCents: 184000 }),
      sale({ date: '2025-11-09', valueCents: 219000 }),
      sale({ date: '2024-03-03', valueCents: 1000 }),
    ],
    expenses: [expense({ date: '2026-07-01', categoryId: 'gas', valueCents: 5000 })],
  });

  it('totais e meses com vendas', () => {
    const y = yearSummary(yearData, 2026);
    expect(y).toMatchObject({ revenueCents: 486700, expensesCents: 5000, activeMonths: { first: '2026-06', last: '2026-11' } });
    expect(y.months).toHaveLength(12);
    expect(yearSummary(yearData, 2023).activeMonths).toBeNull();
  });

  it('comparar com outro ano nos meses em que este ano vendeu', () => {
    const c = compareYears(yearData, 2026, 2025);
    expect(c.months.map((m) => [m.month, m.revenueCents, m.otherRevenueCents])).toEqual([
      ['2026-06', 212000, 184000],
      ['2026-11', 274700, 219000],
    ]);
    expect(c.totalCents).toBe(486700);
    expect(c.otherTotalCents).toBe(403000);
    expect(c.total.ratio).toBeCloseTo(0.2077, 3);
  });

  it('anos anteriores com vendas', () => {
    expect(yearsWithSalesBefore(yearData, 2026)).toEqual([2025, 2024]);
    expect(yearsWithSalesBefore(yearData, 2024)).toEqual([]);
  });
});
