import { describe, expect, it } from 'vitest';
import { homeSummary, type HomeData } from './home';
import { BUTCHER, OTHER, P, adjustment, expense, expenseCategory, personal, product, sale, settlement, stockData, weekClose } from './testing';
import type { MonthlyGoal } from './types';

const products = [product({ id: P, name: 'Gelinho' }), product({ id: OTHER, name: 'Brownie', code: 'B' })];
const TODAY = '2026-11-22'; // domingo; semana passada = 9 a 15

const base = (o: Partial<HomeData> = {}): HomeData => ({
  ...stockData(),
  expenses: [],
  personalExpenses: [],
  expenseCategories: [expenseCategory({ id: 'gas' })],
  goals: [],
  unitCosts: new Map(),
  ...o,
});

const goal = (o: Partial<MonthlyGoal>): MonthlyGoal => ({ id: 'g', createdAt: '', updatedAt: '', month: '2026-11', ...o });

describe('Início', () => {
  it('primeiro uso: tudo zerado, nada contado, sem aviso de semana', () => {
    const h = homeSummary(base(), products, TODAY);
    expect(h.summary.revenueCents).toBe(0);
    expect(h.showCountNotice).toBe(true);
    expect(h.unclosedWeek).toBeNull();
    expect(h.stock.map((s) => s.counted)).toEqual([false, false]);
    expect(h.goals).toEqual({ revenue: null, profit: null });
  });

  it('vendas do mês, recebido, a receber, despesas, lucro, gastos e sobra', () => {
    const h = homeSummary(
      base({
        sales: [
          sale({ date: '2026-11-08', quantity: 60, valueCents: 30000 }),
          sale({ date: '2026-11-20', pointId: BUTCHER, origin: 'settlement', settlementId: 'a1', valueCents: 4300 }),
          sale({ date: '2026-10-31', valueCents: 99999 }),
        ],
        settlements: [settlement({ id: 'a1', date: '2026-11-20', valueCents: 4300 })],
        expenses: [expense({ date: '2026-11-03', categoryId: 'gas', valueCents: 1000 })],
        personalExpenses: [personal({ date: '2026-11-05', valueCents: 500 })],
      }),
      products,
      TODAY,
    );
    expect(h.month).toBe('2026-11');
    expect(h.summary).toMatchObject({ revenueCents: 34300, receivedCents: 30000, pendingCents: 4300, expensesCents: 1000, leftoverCents: 32800 });
    // sem receitas: o lucro não desconta o custo dos produtos e fica incompleto
    expect(h.profit).toMatchObject({ profitCents: 33300, complete: false });
  });

  it('meta do mês', () => {
    const h = homeSummary(
      base({ sales: [sale({ date: '2026-11-08', valueCents: 274700 })], goals: [goal({ revenueCents: 300000 })] }),
      products,
      TODAY,
    );
    expect(h.goals.revenue).toMatchObject({ achievedCents: 274700, remainingCents: 25300 });
    expect(h.goals.profit).toBeNull();
  });

  it('estoque em casa e no Açougue, e o aviso de contar some depois da contagem', () => {
    const h = homeSummary(
      base({
        adjustments: [
          adjustment({ productId: P, delta: 30, reason: 'initial_count' }),
          adjustment({ productId: P, location: 'consignment', pointId: BUTCHER, delta: 4, reason: 'initial_count' }),
        ],
      }),
      products,
      TODAY,
    );
    expect(h.showCountNotice).toBe(false);
    expect(h.stock[0]).toMatchObject({ counted: true, home: 30, consignment: 4, total: 34 });
    expect(h.stock[1]).toMatchObject({ counted: false });
  });

  it('avisa a semana passada sem fechamento depois que já fechou alguma', () => {
    const h = homeSummary(base({ weekCloses: [weekClose({ weekStart: '2026-11-02' })] }), products, TODAY);
    expect(h.unclosedWeek).toBe('2026-11-09');
    const fechada = homeSummary(base({ weekCloses: [weekClose({ weekStart: '2026-11-09' })] }), products, TODAY);
    expect(fechada.unclosedWeek).toBeNull();
  });
});
