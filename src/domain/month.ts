import { isInRange, monthRange, previousMonth, weekRangeFromStart, weeksOfMonth } from './dates';
import { findGoal, goalProgress, type GoalProgress } from './goals';
import { alive } from './records';
import { compare, estimatedProfit, expensesByCategory, periodSummary, productPeriodReport, ratio, type Comparison, type EstimatedProfit, type PeriodSummary } from './totals';
import type { HomeData } from './home';
import type { Cents, Expense, ExpenseCategory, ID, LocalDate, MonthKey, PersonalExpense, Product, SalesPoint } from './types';
import { isWeekClosed } from './weekClose';

export interface MonthProductRow {
  product: Product;
  produced: number;
  sold: number;
  revenueCents: Cents;
}

export interface MonthCategoryRow {
  category: ExpenseCategory;
  totalCents: Cents;
  /** Parte das despesas do mês (0,62 = 62%). */
  share: number;
}

export interface MonthWeekRow {
  weekStart: LocalDate;
  /** A semana começa no mês anterior, mas conta neste (o domingo cai nele). */
  startsInPreviousMonth: boolean;
  closed: boolean;
  produced: number;
  sold: number;
  revenueCents: Cents;
}

export interface MonthReport {
  month: MonthKey;
  summary: PeriodSummary;
  profit: EstimatedProfit;
  /** Comparação com o mês anterior; null quando o anterior não teve vendas (ou despesas). */
  revenueVsPrevious: Comparison | null;
  expensesVsPrevious: Comparison | null;
  marginRatio: number | null;
  goals: { revenue: GoalProgress | null; profit: GoalProgress | null };
  products: MonthProductRow[];
  /** Despesas do mês, da mais nova para a mais antiga. */
  expenses: Expense[];
  categories: MonthCategoryRow[];
  personalExpenses: PersonalExpense[];
  weeks: MonthWeekRow[];
  /** O mês tem algum lançamento (venda, fechamento, despesa ou gasto). */
  hasData: boolean;
}

const byNewest = <T extends { date: string; createdAt: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

/** Fechamento do mês: vendas, despesas, saldo, lucro, sobra, metas, produtos, despesas, semanas. */
export function monthReport(
  data: HomeData & { points: SalesPoint[] },
  products: Product[],
  month: MonthKey,
): MonthReport {
  const range = monthRange(month);
  const previous = monthRange(previousMonth(month));
  const summary = periodSummary(data, range);
  const previousSummary = periodSummary(data, previous);
  const profit = estimatedProfit(data, range);
  const goal = findGoal(data.goals, month);

  const report = productPeriodReport(data, products.map((p) => p.id), range);
  const productRows = report.map((r, i) => ({
    product: products[i]!,
    produced: r.produced,
    sold: r.sold,
    revenueCents: r.revenueCents,
  }));

  const expenses = alive(data.expenses).filter((e) => isInRange(e.date, range)).sort(byNewest);
  const totals = expensesByCategory(data.expenses, range);
  const categoriesById = new Map<ID, ExpenseCategory>(data.expenseCategories.map((c) => [c.id, c]));
  const categories = [...totals.entries()]
    .map(([id, totalCents]) => ({
      category: categoriesById.get(id) ?? ({ id, name: 'Outras despesas', isProductCost: false, createdAt: '', updatedAt: '' } as ExpenseCategory),
      totalCents,
      share: summary.expensesCents === 0 ? 0 : totalCents / summary.expensesCents,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const weeks = weeksOfMonth(month).map((weekStart) => {
    const weekRange = weekRangeFromStart(weekStart);
    const weekReport = productPeriodReport(data, products.map((p) => p.id), weekRange);
    return {
      weekStart,
      startsInPreviousMonth: weekStart < range.start,
      closed: isWeekClosed(data.weekCloses, weekStart),
      produced: weekReport.reduce((t, r) => t + r.produced, 0),
      sold: weekReport.reduce((t, r) => t + r.sold, 0),
      revenueCents: periodSummary(data, weekRange).revenueCents,
    };
  });

  const personalExpenses = alive(data.personalExpenses).filter((e) => isInRange(e.date, range)).sort(byNewest);
  const hasData =
    summary.revenueCents > 0 ||
    expenses.length > 0 ||
    personalExpenses.length > 0 ||
    productRows.some((r) => r.produced > 0 || r.sold > 0);

  return {
    month,
    summary,
    profit,
    revenueVsPrevious: previousSummary.revenueCents > 0 ? compare(summary.revenueCents, previousSummary.revenueCents) : null,
    expensesVsPrevious: previousSummary.expensesCents > 0 ? compare(summary.expensesCents, previousSummary.expensesCents) : null,
    marginRatio: ratio(profit.profitCents, summary.revenueCents),
    goals: {
      revenue: goalProgress(goal?.revenueCents, summary.revenueCents),
      profit: goalProgress(goal?.profitCents, profit.profitCents),
    },
    products: productRows,
    expenses,
    categories,
    personalExpenses,
    weeks,
    hasData,
  };
}
