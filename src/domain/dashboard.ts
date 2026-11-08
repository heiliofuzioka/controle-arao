import {
  isInRange,
  lastMonths,
  lastWeeks,
  monthKey,
  monthRange,
  monthsOfYear,
  previousMonth,
  weekRange,
  weekRangeFromStart,
  weeksOfMonth,
  yearRange,
  type DateRange,
} from './dates';
import { alive } from './records';
import { compare, estimatedProfit, periodSummary, ratio, type Comparison, type PeriodSummary, type ProfitData, type SummaryData } from './totals';
import type { Cents, ID, LocalDate, MonthKey, Sale } from './types';

/** Filtro do Painel. */
export type Period = 'week' | 'month' | '2months' | '6months' | 'year';

/** Intervalo de cada filtro, a partir de hoje. "Ano" é o ano do calendário. */
export function periodRange(period: Period, today: LocalDate): DateRange {
  const month = monthKey(today);
  switch (period) {
    case 'week':
      return weekRange(today);
    case 'month':
      return monthRange(month);
    case '2months':
      return { start: monthRange(previousMonth(month)).start, end: monthRange(month).end };
    case '6months':
      return { start: monthRange(lastMonths(today, 6)[0]!).start, end: monthRange(month).end };
    case 'year':
      return yearRange(Number(today.slice(0, 4)));
  }
}

export interface Bucket {
  /** weekStart ('YYYY-MM-DD') ou mês ('YYYY-MM'). */
  key: string;
  kind: 'week' | 'month';
  range: DateRange;
  /** A coluna atual mostra o valor numa etiqueta. */
  isCurrent: boolean;
}

const weekBucket = (weekStart: LocalDate, today: LocalDate): Bucket => {
  const range = weekRangeFromStart(weekStart);
  return { key: weekStart, kind: 'week', range, isCurrent: isInRange(today, range) };
};
const monthBucket = (month: MonthKey, today: LocalDate): Bucket => ({
  key: month,
  kind: 'month',
  range: monthRange(month),
  isCurrent: monthKey(today) === month,
});

/**
 * Colunas do gráfico "Faturamento e lucro":
 * Semana → últimas 8 semanas; Mês e 2 meses → uma por semana; 6 meses e Ano → uma por mês.
 */
export function columnBuckets(period: Period, today: LocalDate): Bucket[] {
  const month = monthKey(today);
  switch (period) {
    case 'week':
      return lastWeeks(today, 8).map((w) => weekBucket(w, today));
    case 'month':
      return weeksOfMonth(month).map((w) => weekBucket(w, today));
    case '2months':
      return [...weeksOfMonth(previousMonth(month)), ...weeksOfMonth(month)].map((w) => weekBucket(w, today));
    case '6months':
      return lastMonths(today, 6).map((m) => monthBucket(m, today));
    case 'year':
      return monthsOfYear(Number(today.slice(0, 4))).map((m) => monthBucket(m, today));
  }
}

export type DashboardData = SummaryData & ProfitData;

export interface BucketTotal extends Bucket {
  revenueCents: Cents;
  profitCents: Cents;
  profitComplete: boolean;
}

/** Faturamento e lucro estimado de cada coluna. */
export function bucketTotals(data: DashboardData, buckets: Bucket[]): BucketTotal[] {
  return buckets.map((b) => {
    const profit = estimatedProfit(data, b.range);
    return { ...b, revenueCents: profit.revenueCents, profitCents: profit.profitCents, profitComplete: profit.complete };
  });
}

export interface WeekProductPoint {
  weekStart: LocalDate;
  /** Faturamento de cada produto na semana. */
  byProduct: Record<ID, Cents>;
  totalCents: Cents;
}

/**
 * Gráfico de ondas "Vendas por produto": um ponto por semana, faturamento por produto.
 * O agrupamento visual (Brownie = tradicional + recheado) fica na tela.
 */
export function weeklyProductSeries(sales: Sale[], productIds: ID[], weekStarts: LocalDate[]): WeekProductPoint[] {
  const points = weekStarts.map((weekStart) => ({
    weekStart,
    range: weekRangeFromStart(weekStart),
    byProduct: Object.fromEntries(productIds.map((id) => [id, 0])) as Record<ID, Cents>,
    totalCents: 0,
  }));
  for (const s of alive(sales)) {
    const point = points.find((p) => isInRange(s.date, p.range));
    if (!point || !(s.productId in point.byProduct)) continue;
    point.byProduct[s.productId]! += s.valueCents;
    point.totalCents += s.valueCents;
  }
  return points.map(({ weekStart, byProduct, totalCents }) => ({ weekStart, byProduct, totalCents }));
}

export interface DashboardCards {
  summary: PeriodSummary;
  profitCents: Cents;
  profitComplete: boolean;
  missingProductIds: ID[];
  /** Anel do Faturamento: % já recebido. */
  receivedRatio: number | null;
  /** Anel das Despesas: % do faturamento. */
  expensesRatio: number | null;
  /** Anel do Lucro estimado: margem. */
  marginRatio: number | null;
}

/** Número grande ("Sobrou no período") e os três cards do Painel. */
export function dashboardCards(data: DashboardData, range: DateRange): DashboardCards {
  const summary = periodSummary(data, range);
  const profit = estimatedProfit(data, range);
  return {
    summary,
    profitCents: profit.profitCents,
    profitComplete: profit.complete,
    missingProductIds: profit.missingProductIds,
    receivedRatio: ratio(summary.receivedCents, summary.revenueCents),
    expensesRatio: ratio(summary.expensesCents, summary.revenueCents),
    marginRatio: ratio(profit.profitCents, summary.revenueCents),
  };
}

export interface YearMonth {
  month: MonthKey;
  revenueCents: Cents;
  profitCents: Cents;
  profitComplete: boolean;
  /** Crescimento ou queda do faturamento em relação ao mês anterior. */
  revenueVsPrevious: Comparison;
}

/** Tela Ano: janeiro a dezembro, com crescimento ou queda mês a mês. */
export function yearReport(data: DashboardData, year: number): YearMonth[] {
  const months = [`${year - 1}-12`, ...monthsOfYear(year)];
  const totals = bucketTotals(
    data,
    months.map((m) => ({ key: m, kind: 'month' as const, range: monthRange(m), isCurrent: false })),
  );
  return totals.slice(1).map((t, i) => ({
    month: t.key,
    revenueCents: t.revenueCents,
    profitCents: t.profitCents,
    profitComplete: t.profitComplete,
    revenueVsPrevious: compare(t.revenueCents, totals[i]!.revenueCents),
  }));
}
