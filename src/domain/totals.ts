import { isInRange, type DateRange } from './dates';
import { sumCents } from './money';
import type { Cents, Expense, ID, PersonalExpense, Production, Sale, Settlement } from './types';

export interface SummaryData {
  sales: Sale[];
  settlements: Settlement[];
  expenses: Expense[];
  personalExpenses: PersonalExpense[];
}

export interface PeriodSummary {
  /** Soma das vendas do período (Açougue conta na data do acerto). */
  revenueCents: Cents;
  /** Parte do faturamento que já entrou no bolso. */
  receivedCents: Cents;
  /** Parte do faturamento que vem de acertos ainda não pagos. */
  pendingCents: Cents;
  expensesCents: Cents;
  /** Faturamento − despesas. */
  grossProfitCents: Cents;
  personalCents: Cents;
  /** Lucro bruto − gastos pessoais. */
  leftoverCents: Cents;
}

export function periodSummary(data: SummaryData, range: DateRange): PeriodSummary {
  const unpaid = new Set(data.settlements.filter((s) => !s.paid).map((s) => s.id));
  const sales = data.sales.filter((s) => isInRange(s.date, range));

  const revenueCents = sumCents(sales.map((s) => s.valueCents));
  const pendingCents = sumCents(
    sales
      .filter((s) => s.origin === 'settlement' && s.settlementId !== undefined && unpaid.has(s.settlementId))
      .map((s) => s.valueCents),
  );
  const expensesCents = sumCents(data.expenses.filter((e) => isInRange(e.date, range)).map((e) => e.valueCents));
  const personalCents = sumCents(
    data.personalExpenses.filter((e) => isInRange(e.date, range)).map((e) => e.valueCents),
  );
  const grossProfitCents = revenueCents - expensesCents;

  return {
    revenueCents,
    receivedCents: revenueCents - pendingCents,
    pendingCents,
    expensesCents,
    grossProfitCents,
    personalCents,
    leftoverCents: grossProfitCents - personalCents,
  };
}

export interface SalesCell {
  pointId: ID;
  productId: ID;
  quantity: number;
  valueCents: Cents;
}

/** Quantidade e faturamento por ponto × produto no período (telas Semana e Mês). */
export function salesByPointAndProduct(sales: Sale[], range: DateRange): SalesCell[] {
  const cells = new Map<string, SalesCell>();
  for (const s of sales) {
    if (!isInRange(s.date, range)) continue;
    const key = `${s.pointId}|${s.productId}`;
    const cell = cells.get(key) ?? { pointId: s.pointId, productId: s.productId, quantity: 0, valueCents: 0 };
    cell.quantity += s.quantity;
    cell.valueCents = sumCents([cell.valueCents, s.valueCents]);
    cells.set(key, cell);
  }
  return [...cells.values()];
}

export interface QuantityValue {
  quantity: number;
  valueCents: Cents;
}

/** Junta as células por uma chave (ex.: total por produto ou por ponto). */
export function totalBy(cells: SalesCell[], key: 'pointId' | 'productId'): Map<ID, QuantityValue> {
  const out = new Map<ID, QuantityValue>();
  for (const c of cells) {
    const t = out.get(c[key]) ?? { quantity: 0, valueCents: 0 };
    t.quantity += c.quantity;
    t.valueCents += c.valueCents;
    out.set(c[key], t);
  }
  return out;
}

/** Lançamentos de uma célula (tocar numa célula da Semana). */
export function salesInCell(sales: Sale[], range: DateRange, pointId: ID, productId: ID): Sale[] {
  return sales
    .filter((s) => isInRange(s.date, range) && s.pointId === pointId && s.productId === productId)
    .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
}

export interface ProductionTotal {
  quantity: number;
  loss: number;
}

export function productionByProduct(productions: Production[], range: DateRange): Map<ID, ProductionTotal> {
  const out = new Map<ID, ProductionTotal>();
  for (const p of productions) {
    if (!isInRange(p.date, range)) continue;
    const t = out.get(p.productId) ?? { quantity: 0, loss: 0 };
    t.quantity += p.quantity;
    t.loss += p.loss;
    out.set(p.productId, t);
  }
  return out;
}

export function expensesByCategory(expenses: Expense[], range: DateRange): Map<ID, Cents> {
  const out = new Map<ID, Cents>();
  for (const e of expenses) {
    if (!isInRange(e.date, range)) continue;
    out.set(e.categoryId, sumCents([out.get(e.categoryId) ?? 0, e.valueCents]));
  }
  return out;
}

export interface Comparison {
  current: number;
  previous: number;
  delta: number;
  /** Variação relativa (0,1 = +10%). null quando o mês anterior é 0. */
  ratio: number | null;
}

/** Comparação com o mês anterior. */
export function compare(current: number, previous: number): Comparison {
  return {
    current,
    previous,
    delta: current - previous,
    ratio: previous === 0 ? null : (current - previous) / Math.abs(previous),
  };
}
