import { isInRange, weekRangeFromStart } from './dates';
import { alive } from './records';
import { homeStock, importedWeekCloseIds, weekCloseDate, type StockData } from './stock';
import { productPeriodReport } from './totals';
import type { Cents, Delivery, ID, LocalDate, Product, SalesPoint, Settlement, WeekClose } from './types';
import { isWeekClosed } from './weekClose';

export interface WeekProductRow {
  product: Product;
  produced: number;
  /** Vendido na mão + Açougue. */
  sold: number;
  /** Estoque em casa no fim da semana. */
  leftover: number;
  revenueCents: Cents;
}

export interface WeekReport {
  weekStart: LocalDate;
  closed: boolean;
  revenueCents: Cents;
  produced: number;
  sold: number;
  leftover: number;
  direct: { valueCents: Cents; quantity: number };
  consignment: { valueCents: Cents; quantity: number };
  rows: WeekProductRow[];
  /** Houve alguma venda ou fechamento na semana (para mostrar os cards). */
  hasData: boolean;
}

/**
 * Tela Semana: faturamento, divisão na mão × Açougue e, por produto,
 * produzido, vendido (na mão + Açougue), sobrou (estoque em casa no fim) e faturamento.
 */
export function weekReport(
  data: StockData & { points: SalesPoint[] },
  products: Product[],
  weekStart: LocalDate,
): WeekReport {
  const range = weekRangeFromStart(weekStart);
  const report = productPeriodReport(data, products.map((p) => p.id), range);
  const rows: WeekProductRow[] = report.map((r, i) => ({
    product: products[i]!,
    produced: r.produced,
    sold: r.sold,
    leftover: homeStock(data, r.productId, { until: range.end }),
    revenueCents: r.revenueCents,
  }));

  const sum = (pick: (r: (typeof report)[number]) => number) => report.reduce((t, r) => t + pick(r), 0);
  const consignmentPoints = new Set(data.points.filter((p) => p.mode === 'consignment').map((p) => p.id));
  let directValue = 0;
  let consignmentValue = 0;
  for (const s of alive(data.sales)) {
    if (!isInRange(s.date, range)) continue;
    if (consignmentPoints.has(s.pointId)) consignmentValue += s.valueCents;
    else directValue += s.valueCents;
  }

  const revenueCents = directValue + consignmentValue;
  const closed = isWeekClosed(data.weekCloses, weekStart);
  return {
    weekStart,
    closed,
    revenueCents,
    produced: sum((r) => r.produced),
    sold: sum((r) => r.sold),
    leftover: rows.reduce((t, r) => t + r.leftover, 0),
    direct: { valueCents: directValue, quantity: sum((r) => r.soldDirect) },
    consignment: { valueCents: consignmentValue, quantity: sum((r) => r.soldConsignment) },
    rows,
    hasData: closed || revenueCents > 0 || report.some((r) => r.sold > 0),
  };
}

export type WeekEntry =
  | { kind: 'weekClose'; date: LocalDate; weekClose: WeekClose }
  | { kind: 'delivery'; date: LocalDate; delivery: Delivery }
  | { kind: 'settlement'; date: LocalDate; settlement: Settlement };

/**
 * Lançamentos de um produto na semana (tocar num produto na tela Semana):
 * o fechamento primeiro, depois entregas e acertos pela data.
 */
export function weekProductEntries(data: StockData, productId: ID, weekStart: LocalDate): WeekEntry[] {
  const range = weekRangeFromStart(weekStart);
  const imported = importedWeekCloseIds(data.sales);
  const entries: WeekEntry[] = [];
  for (const w of alive(data.weekCloses))
    if (w.productId === productId && w.weekStart === weekStart && !imported.has(w.id))
      entries.push({ kind: 'weekClose', date: weekCloseDate(w), weekClose: w });

  const others: WeekEntry[] = [];
  for (const d of alive(data.deliveries))
    if (d.productId === productId && isInRange(d.date, range)) others.push({ kind: 'delivery', date: d.date, delivery: d });
  for (const s of alive(data.settlements))
    if (s.productId === productId && isInRange(s.date, range))
      others.push({ kind: 'settlement', date: s.date, settlement: s });
  const created = (e: WeekEntry) =>
    e.kind === 'delivery' ? e.delivery.createdAt : e.kind === 'settlement' ? e.settlement.createdAt : '';
  others.sort((a, b) => a.date.localeCompare(b.date) || created(a).localeCompare(created(b)));
  return [...entries, ...others];
}
