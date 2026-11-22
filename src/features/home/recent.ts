import { alive } from '../../domain/records';
import { importedWeekCloseIds, weekCloseDate } from '../../domain/stock';
import type {
  Cents,
  Delivery,
  Expense,
  ExpenseCategory,
  LocalDate,
  PersonalExpense,
  Product,
  Sale,
  Settlement,
  WeekClose,
} from '../../domain/types';
import { weekCloseTotals, type WeekCloseTotals } from '../../domain/weekClose';

export type RecentEntry =
  | { kind: 'week'; key: string; date: LocalDate; changedAt: string; weekStart: LocalDate; totals: WeekCloseTotals }
  | { kind: 'expense'; key: string; date: LocalDate; changedAt: string; expense: Expense; categoryName: string }
  | { kind: 'personal'; key: string; date: LocalDate; changedAt: string; personalExpense: PersonalExpense }
  | { kind: 'delivery'; key: string; date: LocalDate; changedAt: string; delivery: Delivery; product?: Product }
  | { kind: 'settlement'; key: string; date: LocalDate; changedAt: string; settlement: Settlement; product?: Product };

export interface RecentData {
  weekCloses: WeekClose[];
  sales: Sale[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  personalExpenses: PersonalExpense[];
  deliveries?: Delivery[];
  settlements?: Settlement[];
  products?: Product[];
}

/**
 * Últimos lançamentos, do mais novo para o mais antigo: uma linha por semana fechada,
 * uma por despesa, gasto pessoal, entrega e acerto. Semanas importadas do caderno não entram.
 */
export function recentEntries(data: RecentData, limit = 30): RecentEntry[] {
  const entries: RecentEntry[] = [];

  const imported = importedWeekCloseIds(data.sales);
  const weeks = new Map<LocalDate, WeekClose[]>();
  for (const w of alive(data.weekCloses)) {
    if (imported.has(w.id)) continue;
    weeks.set(w.weekStart, [...(weeks.get(w.weekStart) ?? []), w]);
  }
  for (const [weekStart, closes] of weeks) {
    entries.push({
      kind: 'week',
      key: `week-${weekStart}`,
      date: weekCloseDate({ weekStart }),
      changedAt: closes.map((c) => c.updatedAt).sort().at(-1) ?? '',
      weekStart,
      totals: weekCloseTotals(closes),
    });
  }

  const categoryNames = new Map(data.expenseCategories.map((c) => [c.id, c.name]));
  for (const expense of alive(data.expenses)) {
    entries.push({
      kind: 'expense',
      key: expense.id,
      date: expense.date,
      changedAt: expense.updatedAt,
      expense,
      categoryName: categoryNames.get(expense.categoryId) ?? 'Despesa',
    });
  }

  for (const personalExpense of alive(data.personalExpenses)) {
    entries.push({
      kind: 'personal',
      key: personalExpense.id,
      date: personalExpense.date,
      changedAt: personalExpense.updatedAt,
      personalExpense,
    });
  }

  const products = new Map((data.products ?? []).map((p) => [p.id, p]));
  for (const delivery of alive(data.deliveries ?? [])) {
    entries.push({
      kind: 'delivery',
      key: delivery.id,
      date: delivery.date,
      changedAt: delivery.updatedAt,
      delivery,
      product: products.get(delivery.productId),
    });
  }
  for (const settlement of alive(data.settlements ?? [])) {
    entries.push({
      kind: 'settlement',
      key: settlement.id,
      date: settlement.date,
      changedAt: settlement.updatedAt,
      settlement,
      product: products.get(settlement.productId),
    });
  }

  return entries
    .sort((a, b) => b.date.localeCompare(a.date) || b.changedAt.localeCompare(a.changedAt))
    .slice(0, limit);
}

/** Valor que aparece à direita da linha. */
export function entryValueCents(entry: RecentEntry): Cents {
  if (entry.kind === 'week') return entry.totals.valueCents;
  if (entry.kind === 'expense') return entry.expense.valueCents;
  if (entry.kind === 'personal') return entry.personalExpense.valueCents;
  if (entry.kind === 'settlement') return entry.settlement.valueCents;
  return 0;
}
