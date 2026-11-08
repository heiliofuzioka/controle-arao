import { isInRange, type DateRange } from './dates';
import { roundCents, sumCents } from './money';
import { alive } from './records';
import { weekCloseDate } from './stock';
import type {
  Cents,
  Expense,
  ExpenseCategory,
  ID,
  PersonalExpense,
  Sale,
  SalesPoint,
  Settlement,
  WeekClose,
} from './types';

const inRange = <T extends { date: string; deletedAt?: string }>(rows: T[], range: DateRange) =>
  alive(rows).filter((r) => isInRange(r.date, range));

export interface SummaryData {
  sales: Sale[];
  settlements: Settlement[];
  expenses: Expense[];
  personalExpenses: PersonalExpense[];
}

export interface PeriodSummary {
  /** Soma das vendas do período (Açougue conta na data do acerto). */
  revenueCents: Cents;
  /** Parte do faturamento que já entrou: venda direta + importadas + acertos pagos. */
  receivedCents: Cents;
  /** Parte do faturamento que vem de acertos ainda não pagos. */
  pendingCents: Cents;
  expensesCents: Cents;
  /** Saldo = faturamento − despesas. */
  balanceCents: Cents;
  personalCents: Cents;
  /** Sobra = saldo − gastos pessoais. */
  leftoverCents: Cents;
}

export function periodSummary(data: SummaryData, range: DateRange): PeriodSummary {
  const unpaid = new Set(alive(data.settlements).filter((s) => !s.paid).map((s) => s.id));
  const sales = inRange(data.sales, range);

  const revenueCents = sumCents(sales.map((s) => s.valueCents));
  const pendingCents = sumCents(
    sales
      .filter((s) => s.origin === 'settlement' && s.settlementId !== undefined && unpaid.has(s.settlementId))
      .map((s) => s.valueCents),
  );
  const expensesCents = sumCents(inRange(data.expenses, range).map((e) => e.valueCents));
  const personalCents = sumCents(inRange(data.personalExpenses, range).map((e) => e.valueCents));
  const balanceCents = revenueCents - expensesCents;

  return {
    revenueCents,
    receivedCents: revenueCents - pendingCents,
    pendingCents,
    expensesCents,
    balanceCents,
    personalCents,
    leftoverCents: balanceCents - personalCents,
  };
}

export interface ProfitData {
  sales: Sale[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  /** Custo por unidade de cada produto que tem receita (pricing.unitCostByProduct). */
  unitCosts: ReadonlyMap<ID, number>;
}

export interface EstimatedProfit {
  /** faturamento − custo dos produtos vendidos − despesas que não são custo do produto. */
  profitCents: Cents;
  revenueCents: Cents;
  productCostCents: Cents;
  /** Despesas fora de Ingredientes e Embalagens (essas já estão no custo dos produtos). */
  otherExpensesCents: Cents;
  /** false quando algum produto vendido não tem receita (lucro incompleto). */
  complete: boolean;
  missingProductIds: ID[];
}

/**
 * Lucro estimado sem contar Ingredientes e Embalagens duas vezes.
 * Produto vendido sem receita fica sem custo e marca o resultado como incompleto.
 */
export function estimatedProfit(data: ProfitData, range: DateRange): EstimatedProfit {
  const sales = inRange(data.sales, range);
  const productCategories = new Set(data.expenseCategories.filter((c) => c.isProductCost).map((c) => c.id));

  let productCost = 0;
  const missing = new Set<ID>();
  for (const s of sales) {
    const unit = data.unitCosts.get(s.productId);
    if (unit === undefined) {
      if (s.quantity > 0) missing.add(s.productId);
    } else {
      productCost += unit * s.quantity;
    }
  }

  const revenueCents = sumCents(sales.map((s) => s.valueCents));
  const productCostCents = roundCents(productCost);
  const otherExpensesCents = sumCents(
    inRange(data.expenses, range)
      .filter((e) => !productCategories.has(e.categoryId))
      .map((e) => e.valueCents),
  );

  return {
    profitCents: revenueCents - productCostCents - otherExpensesCents,
    revenueCents,
    productCostCents,
    otherExpensesCents,
    complete: missing.size === 0,
    missingProductIds: [...missing],
  };
}

/** Faturamento dividido entre venda na mão e Açougue (pelo modo do ponto). */
export function revenueByMode(sales: Sale[], points: SalesPoint[], range: DateRange): { directCents: Cents; consignmentCents: Cents } {
  const consignment = new Set(points.filter((p) => p.mode === 'consignment').map((p) => p.id));
  let directCents = 0;
  let consignmentCents = 0;
  for (const s of inRange(sales, range)) {
    if (consignment.has(s.pointId)) consignmentCents += s.valueCents;
    else directCents += s.valueCents;
  }
  return { directCents, consignmentCents };
}

export interface ProductPeriodRow {
  productId: ID;
  produced: number;
  loss: number;
  soldDirect: number;
  soldConsignment: number;
  /** vendido na mão + Açougue */
  sold: number;
  revenueCents: Cents;
}

/**
 * Por produto no período: produzido, vendido (na mão + Açougue) e faturamento.
 * Fechamentos contam no domingo da semana.
 */
export function productPeriodReport(
  data: { weekCloses: WeekClose[]; sales: Sale[]; points: SalesPoint[] },
  productIds: ID[],
  range: DateRange,
): ProductPeriodRow[] {
  const consignment = new Set(data.points.filter((p) => p.mode === 'consignment').map((p) => p.id));
  const rows = new Map<ID, ProductPeriodRow>(
    productIds.map((productId) => [
      productId,
      { productId, produced: 0, loss: 0, soldDirect: 0, soldConsignment: 0, sold: 0, revenueCents: 0 },
    ]),
  );
  for (const w of alive(data.weekCloses)) {
    const row = rows.get(w.productId);
    if (!row || !isInRange(weekCloseDate(w), range)) continue;
    row.produced += w.produced;
    row.loss += w.loss;
  }
  for (const s of inRange(data.sales, range)) {
    const row = rows.get(s.productId);
    if (!row) continue;
    if (consignment.has(s.pointId)) row.soldConsignment += s.quantity;
    else row.soldDirect += s.quantity;
    row.sold += s.quantity;
    row.revenueCents += s.valueCents;
  }
  return [...rows.values()];
}

export function expensesByCategory(expenses: Expense[], range: DateRange): Map<ID, Cents> {
  const out = new Map<ID, Cents>();
  for (const e of inRange(expenses, range)) out.set(e.categoryId, (out.get(e.categoryId) ?? 0) + e.valueCents);
  return out;
}

/** Fração (para anéis e porcentagens). null quando o total é 0. */
export function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

export interface Comparison {
  current: number;
  previous: number;
  delta: number;
  /** Variação relativa (0,1 = +10%). null quando o anterior é 0. */
  ratio: number | null;
}

/** Comparação com o período anterior (mês anterior, outro ano…). */
export function compare(current: number, previous: number): Comparison {
  return {
    current,
    previous,
    delta: current - previous,
    ratio: previous === 0 ? null : (current - previous) / Math.abs(previous),
  };
}
