import { monthRange, monthsOfYear, yearRange } from './dates';
import { yearReport, type DashboardData, type YearMonth } from './dashboard';
import { alive } from './records';
import { compare, estimatedProfit, periodSummary, type Comparison } from './totals';
import type { Cents, MonthKey } from './types';

export interface YearSummary {
  year: number;
  revenueCents: Cents;
  expensesCents: Cents;
  profitCents: Cents;
  profitComplete: boolean;
  months: YearMonth[];
  /** Primeiro e último mês com vendas (ex.: junho a novembro); null se o ano não teve vendas. */
  activeMonths: { first: MonthKey; last: MonthKey } | null;
}

/** Tela Ano: totais do ano e janeiro a dezembro. */
export function yearSummary(data: DashboardData, year: number): YearSummary {
  const range = yearRange(year);
  const summary = periodSummary(data, range);
  const profit = estimatedProfit(data, range);
  const months = yearReport(data, year);
  const withSales = months.filter((m) => m.revenueCents > 0);
  return {
    year,
    revenueCents: summary.revenueCents,
    expensesCents: summary.expensesCents,
    profitCents: profit.profitCents,
    profitComplete: profit.complete,
    months,
    activeMonths: withSales.length > 0 ? { first: withSales[0]!.month, last: withSales.at(-1)!.month } : null,
  };
}

export interface YearComparisonMonth {
  month: MonthKey;
  /** O mesmo mês no outro ano. */
  otherMonth: MonthKey;
  revenueCents: Cents;
  otherRevenueCents: Cents;
  comparison: Comparison;
}

export interface YearComparison {
  year: number;
  otherYear: number;
  /** Meses comparados: os que tiveram vendas no ano escolhido. */
  months: YearComparisonMonth[];
  totalCents: Cents;
  otherTotalCents: Cents;
  total: Comparison;
}

/** Comparar com outro ano, mês a mês, nos meses em que o ano escolhido teve vendas. */
export function compareYears(data: DashboardData, year: number, otherYear: number): YearComparison {
  const months = monthsOfYear(year)
    .map((month) => {
      const otherMonth = `${otherYear}${month.slice(4)}`;
      const revenueCents = periodSummary(data, monthRange(month)).revenueCents;
      const otherRevenueCents = periodSummary(data, monthRange(otherMonth)).revenueCents;
      return { month, otherMonth, revenueCents, otherRevenueCents, comparison: compare(revenueCents, otherRevenueCents) };
    })
    .filter((m) => m.revenueCents > 0);
  const totalCents = months.reduce((t, m) => t + m.revenueCents, 0);
  const otherTotalCents = months.reduce((t, m) => t + m.otherRevenueCents, 0);
  return { year, otherYear, months, totalCents, otherTotalCents, total: compare(totalCents, otherTotalCents) };
}

/** Anos anteriores com alguma venda (para o "Comparar com"), do mais novo para o mais antigo. */
export function yearsWithSalesBefore(data: DashboardData, year: number): number[] {
  const years = new Set<number>();
  for (const s of alive(data.sales)) {
    const y = Number(s.date.slice(0, 4));
    if (y < year && s.valueCents > 0) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}
