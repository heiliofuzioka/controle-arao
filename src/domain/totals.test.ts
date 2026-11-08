import { describe, expect, it } from 'vitest';
import { monthRange, weekRange } from './dates';
import {
  compare,
  estimatedProfit,
  expensesByCategory,
  periodSummary,
  productPeriodReport,
  ratio,
  revenueByMode,
} from './totals';
import { BUTCHER, OTHER, P, expense, expenseCategory, personal, points, sale, settlement, weekClose } from './testing';

const nov = monthRange('2026-11');

describe('resumo do período', () => {
  const data = {
    sales: [
      sale({ date: '2026-11-08', valueCents: 1500 }),
      sale({ date: '2026-11-05', pointId: BUTCHER, origin: 'settlement', settlementId: 'a-aberto', valueCents: 8000 }),
      sale({ date: '2026-11-03', pointId: BUTCHER, origin: 'settlement', settlementId: 'a-pago', valueCents: 5000 }),
      sale({ date: '2026-10-31', valueCents: 99900 }), // outro mês
      sale({ date: '2026-11-08', valueCents: 4242, deletedAt: 'x' }), // apagada
    ],
    settlements: [
      settlement({ id: 'a-aberto', date: '2026-11-05', valueCents: 8000 }),
      settlement({ id: 'a-pago', date: '2026-11-03', valueCents: 5000, paid: true, paidDate: '2026-11-04' }),
    ],
    expenses: [
      expense({ date: '2026-11-01', valueCents: 4000 }),
      expense({ date: '2026-11-20', valueCents: 1000 }),
      expense({ date: '2026-10-30', valueCents: 777 }),
    ],
    personalExpenses: [personal({ date: '2026-11-10', valueCents: 2000 }), personal({ date: '2026-12-01', valueCents: 5 })],
  };

  it('calcula faturamento, recebido, a receber, saldo e sobra', () => {
    expect(periodSummary(data, nov)).toEqual({
      revenueCents: 14500,
      receivedCents: 6500,
      pendingCents: 8000,
      expensesCents: 5000,
      balanceCents: 9500,
      personalCents: 2000,
      leftoverCents: 7500,
    });
  });

  it('venda do Açougue conta na data do acerto', () => {
    const s = periodSummary(data, { start: '2026-11-05', end: '2026-11-05' });
    expect(s.revenueCents).toBe(8000);
    expect(s.pendingCents).toBe(8000);
  });

  it('saldo e sobra podem ficar negativos', () => {
    const s = periodSummary(
      { sales: [], settlements: [], expenses: [expense({ valueCents: 300 })], personalExpenses: [personal({ valueCents: 200 })] },
      nov,
    );
    expect(s.balanceCents).toBe(-300);
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

describe('lucro estimado', () => {
  const ingredientes = expenseCategory({ id: 'ingredientes', name: 'Ingredientes', isProductCost: true });
  const embalagens = expenseCategory({ id: 'embalagens', name: 'Embalagens', isProductCost: true });
  const gas = expenseCategory({ id: 'gas', name: 'Gás' });
  const base = {
    sales: [
      sale({ productId: P, quantity: 10, valueCents: 5000 }),
      sale({ productId: OTHER, quantity: 4, valueCents: 3200, pointId: BUTCHER, origin: 'settlement' }),
    ],
    expenses: [
      expense({ categoryId: 'ingredientes', valueCents: 2000 }),
      expense({ categoryId: 'embalagens', valueCents: 300 }),
      expense({ categoryId: 'gas', valueCents: 700 }),
    ],
    expenseCategories: [ingredientes, embalagens, gas],
  };

  it('desconta o custo dos produtos e só as despesas que não são de produto', () => {
    const r = estimatedProfit({ ...base, unitCosts: new Map([[P, 150], [OTHER, 227.5]]) }, nov);
    // custo = 10 × 150 + 4 × 227,5 = 2410; outras despesas = 700 (gás)
    expect(r).toEqual({
      profitCents: 8200 - 2410 - 700,
      revenueCents: 8200,
      productCostCents: 2410,
      otherExpensesCents: 700,
      complete: true,
      missingProductIds: [],
    });
  });

  it('arredonda o custo dos produtos só no total', () => {
    const r = estimatedProfit({ ...base, unitCosts: new Map([[P, 0.15], [OTHER, 0.125]]) }, nov);
    // 1,5 + 0,5 = 2
    expect(r.productCostCents).toBe(2);
  });

  it('produto vendido sem receita deixa o lucro incompleto', () => {
    const r = estimatedProfit({ ...base, unitCosts: new Map([[P, 150]]) }, nov);
    expect(r.complete).toBe(false);
    expect(r.missingProductIds).toEqual([OTHER]);
    expect(r.productCostCents).toBe(1500);
  });
});

describe('relatórios por produto', () => {
  it('divide o faturamento entre venda na mão e Açougue', () => {
    const sales = [
      sale({ valueCents: 1500 }),
      sale({ pointId: BUTCHER, origin: 'settlement', valueCents: 3000 }),
      sale({ pointId: BUTCHER, origin: 'import', valueCents: 200 }),
    ];
    expect(revenueByMode(sales, points, nov)).toEqual({ directCents: 1500, consignmentCents: 3200 });
  });

  it('produzido, vendido (mão + Açougue) e faturamento por produto', () => {
    const rows = productPeriodReport(
      {
        weekCloses: [
          weekClose({ weekStart: '2026-11-02', produced: 40, loss: 2 }),
          weekClose({ weekStart: '2026-10-26', produced: 5 }), // domingo 01/11: conta em novembro
          weekClose({ weekStart: '2026-11-30', produced: 99 }), // domingo 06/12: dezembro
        ],
        sales: [
          sale({ quantity: 30, valueCents: 15000 }),
          sale({ pointId: BUTCHER, origin: 'settlement', quantity: 6, valueCents: 3000 }),
          sale({ productId: OTHER, quantity: 2, valueCents: 1600 }),
        ],
        points,
      },
      [P, OTHER],
      nov,
    );
    expect(rows).toEqual([
      { productId: P, produced: 45, loss: 2, soldDirect: 30, soldConsignment: 6, sold: 36, revenueCents: 18000 },
      { productId: OTHER, produced: 0, loss: 0, soldDirect: 2, soldConsignment: 0, sold: 2, revenueCents: 1600 },
    ]);
  });

  it('a semana mostra só o que caiu nela', () => {
    const rows = productPeriodReport(
      { weekCloses: [weekClose({ weekStart: '2026-11-02', produced: 10 })], sales: [], points },
      [P],
      weekRange('2026-11-09'),
    );
    expect(rows[0]!.produced).toBe(0);
  });

  it('soma despesas por categoria', () => {
    const map = expensesByCategory(
      [
        expense({ categoryId: 'ingredientes', valueCents: 4000 }),
        expense({ categoryId: 'ingredientes', valueCents: 500 }),
        expense({ categoryId: 'gas', valueCents: 1000 }),
        expense({ categoryId: 'gas', valueCents: 1, deletedAt: 'x' }),
      ],
      nov,
    );
    expect(map.get('ingredientes')).toBe(4500);
    expect(map.get('gas')).toBe(1000);
  });
});

describe('porcentagens e comparação', () => {
  it('calcula fração e protege a divisão por 0', () => {
    expect(ratio(25, 100)).toBe(0.25);
    expect(ratio(5, 0)).toBeNull();
  });

  it('dá a diferença e a variação', () => {
    expect(compare(11000, 10000)).toEqual({ current: 11000, previous: 10000, delta: 1000, ratio: 0.1 });
    expect(compare(5000, 10000).ratio).toBe(-0.5);
    expect(compare(5000, 0).ratio).toBeNull();
  });
});
