import { describe, expect, it } from 'vitest';
import { monthRange, weekRange } from './dates';
import {
  compare,
  expensesByCategory,
  periodSummary,
  productionByProduct,
  salesByPointAndProduct,
  salesInCell,
  totalBy,
} from './totals';
import { BUTCHER, OTHER, P, SCHOOL, production, sale, settlement } from './testing';
import type { Expense, PersonalExpense } from './types';

const expense = (date: string, valueCents: number, categoryId = 'ingredientes'): Expense => ({
  id: `${date}-${valueCents}`,
  date,
  valueCents,
  categoryId,
  createdAt: '',
});
const personal = (date: string, valueCents: number): PersonalExpense => ({
  id: `${date}-${valueCents}`,
  date,
  valueCents,
  createdAt: '',
});

describe('resumo do período', () => {
  const unpaid = settlement({ id: 'a-aberto', date: '2026-11-05', valueCents: 8000 });
  const paid = settlement({ id: 'a-pago', date: '2026-11-03', valueCents: 5000, paid: true, paidDate: '2026-11-04' });
  const data = {
    sales: [
      sale({ date: '2026-11-02', valueCents: 1500 }),
      sale({ date: '2026-11-05', pointId: BUTCHER, origin: 'settlement', settlementId: 'a-aberto', valueCents: 8000 }),
      sale({ date: '2026-11-03', pointId: BUTCHER, origin: 'settlement', settlementId: 'a-pago', valueCents: 5000 }),
      sale({ date: '2026-10-31', valueCents: 99900 }), // outro mês
    ],
    settlements: [unpaid, paid],
    expenses: [expense('2026-11-01', 4000), expense('2026-11-20', 1000, 'gas'), expense('2026-10-30', 777)],
    personalExpenses: [personal('2026-11-10', 2000), personal('2026-12-01', 5)],
  };

  it('calcula faturamento, recebido, a receber, lucro bruto e sobra', () => {
    expect(periodSummary(data, monthRange('2026-11'))).toEqual({
      revenueCents: 14500,
      receivedCents: 6500,
      pendingCents: 8000,
      expensesCents: 5000,
      grossProfitCents: 9500,
      personalCents: 2000,
      leftoverCents: 7500,
    });
  });

  it('venda do Açougue conta na data do acerto', () => {
    const s = periodSummary(data, { start: '2026-11-05', end: '2026-11-05' });
    expect(s.revenueCents).toBe(8000);
    expect(s.pendingCents).toBe(8000);
  });

  it('lucro e sobra podem ficar negativos', () => {
    const s = periodSummary(
      { sales: [], settlements: [], expenses: [expense('2026-11-01', 300)], personalExpenses: [personal('2026-11-01', 200)] },
      monthRange('2026-11'),
    );
    expect(s.grossProfitCents).toBe(-300);
    expect(s.leftoverCents).toBe(-500);
  });

  it('vendas importadas contam como recebidas', () => {
    const s = periodSummary(
      { sales: [sale({ date: '2026-08-09', origin: 'import', valueCents: 61700 })], settlements: [], expenses: [], personalExpenses: [] },
      monthRange('2026-08'),
    );
    expect(s.receivedCents).toBe(61700);
  });
});

describe('agrupamentos da Semana e do Mês', () => {
  const sales = [
    sale({ date: '2026-11-02', time: '10:00', quantity: 3, valueCents: 900 }),
    sale({ date: '2026-11-02', time: '09:00', quantity: 2, valueCents: 600 }),
    sale({ date: '2026-11-04', productId: OTHER, quantity: 1, valueCents: 800 }),
    sale({ date: '2026-11-06', pointId: BUTCHER, origin: 'settlement', quantity: 10, valueCents: 3000 }),
    sale({ date: '2026-11-09', quantity: 50, valueCents: 15000 }), // semana seguinte
  ];
  const week = weekRange('2026-11-04');

  it('soma quantidade e valor por ponto × produto', () => {
    const cells = salesByPointAndProduct(sales, week);
    expect(cells).toHaveLength(3);
    expect(cells).toContainEqual({ pointId: SCHOOL, productId: P, quantity: 5, valueCents: 1500 });
    expect(cells).toContainEqual({ pointId: SCHOOL, productId: OTHER, quantity: 1, valueCents: 800 });
    expect(cells).toContainEqual({ pointId: BUTCHER, productId: P, quantity: 10, valueCents: 3000 });
  });

  it('totaliza por ponto e por produto', () => {
    const cells = salesByPointAndProduct(sales, week);
    expect(totalBy(cells, 'pointId').get(SCHOOL)).toEqual({ quantity: 6, valueCents: 2300 });
    expect(totalBy(cells, 'pointId').get(BUTCHER)).toEqual({ quantity: 10, valueCents: 3000 });
    expect(totalBy(cells, 'productId').get(P)).toEqual({ quantity: 15, valueCents: 4500 });
  });

  it('lista os lançamentos de uma célula em ordem', () => {
    const list = salesInCell(sales, week, SCHOOL, P);
    expect(list.map((s) => s.time)).toEqual(['09:00', '10:00']);
  });

  it('soma produção e perda por produto', () => {
    const map = productionByProduct(
      [
        production({ quantity: 40, loss: 2 }),
        production({ quantity: 10, loss: 1 }),
        production({ productId: OTHER, quantity: 12 }),
        production({ date: '2026-12-01', quantity: 999 }),
      ],
      monthRange('2026-11'),
    );
    expect(map.get(P)).toEqual({ quantity: 50, loss: 3 });
    expect(map.get(OTHER)).toEqual({ quantity: 12, loss: 0 });
  });

  it('soma despesas por categoria', () => {
    const map = expensesByCategory(
      [expense('2026-11-01', 4000), expense('2026-11-02', 500), expense('2026-11-03', 1000, 'gas')],
      monthRange('2026-11'),
    );
    expect(map.get('ingredientes')).toBe(4500);
    expect(map.get('gas')).toBe(1000);
  });
});

describe('comparação com o mês anterior', () => {
  it('dá a diferença e a variação', () => {
    expect(compare(11000, 10000)).toEqual({ current: 11000, previous: 10000, delta: 1000, ratio: 0.1 });
    expect(compare(5000, 10000).ratio).toBe(-0.5);
  });

  it('sem mês anterior não tem variação', () => {
    expect(compare(5000, 0).ratio).toBeNull();
  });
});
