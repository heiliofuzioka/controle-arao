import { previousWeekUnclosed } from './alerts';
import { isCounted } from './count';
import { monthKey, monthRange } from './dates';
import { findGoal, goalProgress, type GoalProgress } from './goals';
import { alive } from './records';
import { consignmentStock, homeStock, importedWeekCloseIds, type StockData } from './stock';
import { estimatedProfit, periodSummary, type EstimatedProfit, type PeriodSummary } from './totals';
import type { Expense, ExpenseCategory, ID, LocalDate, MonthlyGoal, PersonalExpense, Product } from './types';

export interface HomeStockRow {
  product: Product;
  /** false = "Ainda não contado" e "—". */
  counted: boolean;
  home: number;
  consignment: number;
  total: number;
}

export interface HomeSummary {
  month: string;
  summary: PeriodSummary;
  profit: EstimatedProfit;
  goals: { revenue: GoalProgress | null; profit: GoalProgress | null };
  stock: HomeStockRow[];
  /** Nenhum produto contado ainda: "Comece contando o que você tem em casa hoje". */
  showCountNotice: boolean;
  /** Segunda-feira da semana passada, se ela não foi fechada (só depois de ter começado a usar). */
  unclosedWeek: LocalDate | null;
}

export interface HomeData extends StockData {
  settlements: StockData['settlements'];
  expenses: Expense[];
  personalExpenses: PersonalExpense[];
  expenseCategories: ExpenseCategory[];
  goals: MonthlyGoal[];
  /** Custo por unidade dos produtos que têm receita. */
  unitCosts: ReadonlyMap<ID, number>;
}

/** Tudo que o Início mostra para o mês de hoje. */
export function homeSummary(data: HomeData, products: Product[], today: LocalDate): HomeSummary {
  const month = monthKey(today);
  const range = monthRange(month);
  const summary = periodSummary(data, range);
  const profit = estimatedProfit(data, range);
  const goal = findGoal(data.goals, month);

  const stock = products.map((product) => {
    const home = homeStock(data, product.id);
    const consignment = consignmentStock(data, product.id);
    return { product, counted: isCounted(data, product.id), home, consignment, total: home + consignment };
  });

  // O aviso da semana passada só aparece depois que ele já fechou alguma semana no app
  // (no primeiro uso, a tela mostra só o "Comece contando").
  const imported = importedWeekCloseIds(data.sales);
  const startedClosing = alive(data.weekCloses).some((w) => !imported.has(w.id));

  return {
    month,
    summary,
    profit,
    goals: {
      revenue: goalProgress(goal?.revenueCents, summary.revenueCents),
      profit: goalProgress(goal?.profitCents, profit.profitCents),
    },
    stock,
    showCountNotice: !stock.some((s) => s.counted),
    unclosedWeek: startedClosing ? previousWeekUnclosed(data.weekCloses, today) : null,
  };
}
