import { describe, expect, it } from 'vitest';
import {
  bucketTotals,
  columnBuckets,
  dashboardAlerts,
  dashboardCards,
  hasClosedWeek,
  layerValue,
  periodRange,
  waveLayers,
  waveWeeks,
  weeklyProductSeries,
  yearReport,
  type DashboardData,
} from './dashboard';
import { BUTCHER, OTHER, P, expense, expenseCategory, product, sale, settlement, weekClose } from './testing';

const today = '2026-11-08'; // domingo

describe('filtro de período', () => {
  it('dá o intervalo de cada filtro', () => {
    expect(periodRange('week', today)).toEqual({ start: '2026-11-02', end: '2026-11-08' });
    expect(periodRange('month', today)).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(periodRange('2months', today)).toEqual({ start: '2026-10-01', end: '2026-11-30' });
    expect(periodRange('6months', today)).toEqual({ start: '2026-06-01', end: '2026-11-30' });
    expect(periodRange('year', today)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('colunas do gráfico Faturamento e lucro', () => {
  it('Semana: últimas 8 semanas, a atual marcada', () => {
    const b = columnBuckets('week', today);
    expect(b).toHaveLength(8);
    expect(b[7]).toMatchObject({ key: '2026-11-02', kind: 'week', isCurrent: true });
    expect(b[0]!.key).toBe('2026-09-14');
  });

  it('Mês e 2 meses: uma coluna por semana', () => {
    expect(columnBuckets('month', today).map((b) => b.key)).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
    ]);
    expect(columnBuckets('2months', today)).toHaveLength(9); // 4 de outubro + 5 de novembro
  });

  it('6 meses e Ano: uma coluna por mês', () => {
    expect(columnBuckets('6months', today).map((b) => b.key)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    const year = columnBuckets('year', today);
    expect(year).toHaveLength(12);
    expect(year.find((b) => b.isCurrent)?.key).toBe('2026-11');
  });
});

const data: DashboardData = {
  sales: [
    sale({ date: '2026-11-08', productId: P, quantity: 10, valueCents: 5000 }),
    sale({ date: '2026-11-06', productId: OTHER, quantity: 4, valueCents: 3200, pointId: BUTCHER, origin: 'settlement', settlementId: 'a1' }),
    sale({ date: '2026-10-25', productId: P, quantity: 2, valueCents: 1000 }),
  ],
  settlements: [settlement({ id: 'a1', date: '2026-11-06', valueCents: 3200 })],
  expenses: [expense({ date: '2026-11-03', categoryId: 'gas', valueCents: 800 })],
  personalExpenses: [],
  expenseCategories: [expenseCategory({ id: 'gas' })],
  unitCosts: new Map([[P, 200], [OTHER, 300]]),
};

describe('totais das colunas', () => {
  it('faturamento e lucro estimado por coluna', () => {
    const [oct, nov] = bucketTotals(data, columnBuckets('6months', today).slice(4));
    expect(oct).toMatchObject({ key: '2026-10', revenueCents: 1000, profitCents: 600, profitComplete: true });
    // 8200 − (10×200 + 4×300) − 800
    expect(nov).toMatchObject({ key: '2026-11', revenueCents: 8200, profitCents: 4200 });
  });
});

describe('gráfico de ondas', () => {
  it('faturamento por produto, um ponto por semana', () => {
    const series = weeklyProductSeries(data.sales, [P, OTHER], ['2026-10-19', '2026-11-02']);
    expect(series).toEqual([
      { weekStart: '2026-10-19', byProduct: { [P]: 1000, [OTHER]: 0 }, totalCents: 1000 },
      { weekStart: '2026-11-02', byProduct: { [P]: 5000, [OTHER]: 3200 }, totalCents: 8200 },
    ]);
  });
});

describe('cards do Painel', () => {
  it('sobra, três cards e os anéis', () => {
    const c = dashboardCards(data, periodRange('month', today));
    expect(c.summary.revenueCents).toBe(8200);
    expect(c.summary.leftoverCents).toBe(7400);
    expect(c.profitCents).toBe(4200);
    expect(c.receivedRatio).toBeCloseTo(5000 / 8200);
    expect(c.expensesRatio).toBeCloseTo(800 / 8200);
    expect(c.marginRatio).toBeCloseTo(4200 / 8200);
  });

  it('sem faturamento os anéis ficam vazios', () => {
    const c = dashboardCards(data, periodRange('week', '2026-12-20'));
    expect(c.receivedRatio).toBeNull();
    expect(c.marginRatio).toBeNull();
  });
});

describe('tela Ano', () => {
  it('janeiro a dezembro com crescimento sobre o mês anterior', () => {
    const months = yearReport(data, 2026);
    expect(months).toHaveLength(12);
    expect(months[9]).toMatchObject({ month: '2026-10', revenueCents: 1000 });
    expect(months[10]!.revenueVsPrevious).toMatchObject({ current: 8200, previous: 1000, delta: 7200 });
    expect(months[0]!.revenueVsPrevious.previous).toBe(0); // dezembro do ano anterior
  });
});

describe('gráfico de ondas e alertas', () => {
  it('semanas das ondas: pelo menos 8, ou o período inteiro', () => {
    const month = waveWeeks('month', today);
    expect(month).toHaveLength(8);
    expect(month[7]).toBe('2026-11-02');
    const six = waveWeeks('6months', today);
    expect(six[0]).toBe('2026-06-01'); // segunda da semana de 1/6
    expect(six.at(-1)).toBe('2026-11-02');
    expect(waveWeeks('year', today)[0]).toBe('2025-12-29');
  });

  it('camadas: Brownie junta tradicional e recheado; produto novo vai na frente', () => {
    const layers = waveLayers([
      product({ id: 'g', code: 'G', name: 'Gelinho' }),
      product({ id: 'b', code: 'B', name: 'Brownie' }),
      product({ id: 'r', code: 'R', name: 'Brownie recheado' }),
      product({ id: 't', code: 't', name: 'Torta' }),
      product({ id: 'c', code: 'C', name: 'Cookie' }),
    ]);
    expect(layers.map((l) => [l.label, l.tone, l.productIds])).toEqual([
      ['Brownie', 'brownie', ['b', 'r']],
      ['Torta', 'torta', ['t']],
      ['Gelinho', 'gelinho', ['g']],
      ['Cookie', 'other', ['c']],
    ]);
    expect(layerValue({ weekStart: 'x', byProduct: { b: 100, r: 50, t: 9 }, totalCents: 159 }, layers[0]!)).toBe(150);
  });

  it('sem semana fechada, os gráficos não aparecem', () => {
    expect(hasClosedWeek([], [])).toBe(false);
    expect(hasClosedWeek([weekClose()], [])).toBe(true);
    expect(hasClosedWeek([weekClose({ id: 'imp' })], [sale({ origin: 'import', weekCloseId: 'imp' })])).toBe(false);
  });

  it('alertas: acerto atrasado e semana passada sem fechamento', () => {
    expect(dashboardAlerts({ settlements: [], weekCloses: [], sales: [] }, today)).toEqual([]);
    const alerts = dashboardAlerts(
      { settlements: [settlement({ date: '2026-10-01' })], weekCloses: [weekClose({ weekStart: '2026-10-19' })], sales: [] },
      today,
    );
    expect(alerts).toEqual([
      { kind: 'settlement_overdue', count: 1 },
      { kind: 'week_unclosed', weekStart: '2026-10-26' },
    ]);
  });
});
