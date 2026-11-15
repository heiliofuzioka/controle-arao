import { alive } from '../../domain/records';
import { importedWeekCloseIds, weekCloseDate } from '../../domain/stock';
import type { Cents, Expense, ExpenseCategory, LocalDate, PersonalExpense, Sale, WeekClose } from '../../domain/types';
import { weekCloseTotals, type WeekCloseTotals } from '../../domain/weekClose';

export type RecentEntry =
  | { kind: 'week'; key: string; date: LocalDate; changedAt: string; weekStart: LocalDate; totals: WeekCloseTotals }
  | { kind: 'expense'; key: string; date: LocalDate; changedAt: string; expense: Expense; categoryName: string }
  | { kind: 'personal'; key: string; date: LocalDate; changedAt: string; personalExpense: PersonalExpense };

export interface RecentData {
  weekCloses: WeekClose[];
  sales: Sale[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  personalExpenses: PersonalExpense[];
}

/**
 * Últimos lançamentos, do mais novo para o mais antigo: uma linha por semana fechada,
 * uma por despesa e uma por gasto pessoal. Semanas importadas do caderno não entram.
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

  return entries
    .sort((a, b) => b.date.localeCompare(a.date) || b.changedAt.localeCompare(a.changedAt))
    .slice(0, limit);
}

/** Valor que aparece à direita da linha. */
export function entryValueCents(entry: RecentEntry): Cents {
  if (entry.kind === 'week') return entry.totals.valueCents;
  if (entry.kind === 'expense') return entry.expense.valueCents;
  return entry.personalExpense.valueCents;
}
