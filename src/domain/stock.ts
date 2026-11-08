import { shiftDays } from './dates';
import { alive } from './records';
import type { Delivery, ID, LocalDate, Sale, Settlement, StockAdjustment, WeekClose } from './types';

export interface StockData {
  weekCloses: WeekClose[];
  /** Usado só para reconhecer fechamentos importados do caderno. */
  sales: Sale[];
  deliveries: Delivery[];
  settlements: Settlement[];
  adjustments: StockAdjustment[];
}

/** Data em que o fechamento conta: o domingo da semana. */
export function weekCloseDate(weekClose: Pick<WeekClose, 'weekStart'>): LocalDate {
  return shiftDays(weekClose.weekStart, 6);
}

/**
 * Fechamentos importados do caderno não mexem no estoque: o caderno só anota
 * o que foi vendido, não o que foi produzido (decisão de 08/11).
 */
export function importedWeekCloseIds(sales: Sale[]): Set<ID> {
  const ids = new Set<ID>();
  for (const s of alive(sales)) if (s.origin === 'import' && s.weekCloseId) ids.add(s.weekCloseId);
  return ids;
}

export interface HomeStockOptions {
  /** Conta só o que aconteceu até essa data (inclusive). */
  until?: LocalDate;
  /** Ignora um fechamento (para recalcular ao editar esse fechamento). */
  excludeWeekCloseId?: ID;
}

/**
 * Estoque em casa = produzido − perdas − vendidos na mão − entregas ao Açougue + ajustes "home".
 */
export function homeStock(data: StockData, productId: ID, options: HomeStockOptions = {}): number {
  const { until, excludeWeekCloseId } = options;
  const upTo = (date: LocalDate) => until === undefined || date <= until;
  const imported = importedWeekCloseIds(data.sales);
  let total = 0;
  for (const w of alive(data.weekCloses))
    if (w.productId === productId && w.id !== excludeWeekCloseId && !imported.has(w.id) && upTo(weekCloseDate(w)))
      total += w.produced - w.loss - w.soldDirect;
  for (const d of alive(data.deliveries))
    if (d.productId === productId && upTo(d.date)) total -= d.quantity;
  for (const a of alive(data.adjustments))
    if (a.productId === productId && a.location === 'home' && upTo(a.date)) total += a.delta;
  return total;
}

export interface ConsignmentStockOptions {
  /** Só um ponto de consignação. Sem isso, soma todos. */
  pointId?: ID;
  /** Conta só o que aconteceu até essa data (inclusive). */
  until?: LocalDate;
  /** Ignora um acerto (para recalcular o "antes" ao editar esse acerto). */
  excludeSettlementId?: ID;
}

/**
 * Estoque no Açougue = entregas − vendidos nos acertos − perdas nos acertos + ajustes "consignment".
 */
export function consignmentStock(
  data: StockData,
  productId: ID,
  options: ConsignmentStockOptions = {},
): number {
  const { pointId, until, excludeSettlementId } = options;
  const atPoint = (id?: ID) => pointId === undefined || id === pointId;
  const upTo = (date: LocalDate) => until === undefined || date <= until;
  let total = 0;
  for (const d of alive(data.deliveries))
    if (d.productId === productId && atPoint(d.pointId) && upTo(d.date)) total += d.quantity;
  for (const s of alive(data.settlements))
    if (s.productId === productId && atPoint(s.pointId) && s.id !== excludeSettlementId && upTo(s.date))
      total -= s.soldQuantity + s.loss;
  for (const a of alive(data.adjustments))
    if (a.productId === productId && a.location === 'consignment' && atPoint(a.pointId) && upTo(a.date))
      total += a.delta;
  return total;
}

export interface ProductStock {
  productId: ID;
  home: number;
  consignment: number;
}

export function stockByProduct(data: StockData, productIds: ID[], until?: LocalDate): ProductStock[] {
  return productIds.map((productId) => ({
    productId,
    home: homeStock(data, productId, { until }),
    consignment: consignmentStock(data, productId, { until }),
  }));
}
