import type { Delivery, ID, Production, Sale, Settlement, StockAdjustment } from './types';

export interface StockData {
  productions: Production[];
  sales: Sale[];
  deliveries: Delivery[];
  settlements: Settlement[];
  adjustments: StockAdjustment[];
}

/**
 * Estoque em casa = produção − perdas da produção − vendas diretas − entregas + ajustes "home".
 * Vendas de acerto e importadas não mexem no estoque de casa
 * (as do acerto já saíram de casa na entrega).
 */
export function homeStock(data: StockData, productId: ID): number {
  let total = 0;
  for (const p of data.productions) if (p.productId === productId) total += p.quantity - p.loss;
  for (const s of data.sales)
    if (s.productId === productId && s.origin === 'direct') total -= s.quantity;
  for (const d of data.deliveries) if (d.productId === productId) total -= d.quantity;
  for (const a of data.adjustments)
    if (a.productId === productId && a.location === 'home') total += a.delta;
  return total;
}

export interface ConsignmentStockOptions {
  /** Só um ponto de consignação. Sem isso, soma todos. */
  pointId?: ID;
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
  const { pointId, excludeSettlementId } = options;
  const atPoint = (id?: ID) => pointId === undefined || id === pointId;
  let total = 0;
  for (const d of data.deliveries)
    if (d.productId === productId && atPoint(d.pointId)) total += d.quantity;
  for (const s of data.settlements)
    if (s.productId === productId && atPoint(s.pointId) && s.id !== excludeSettlementId)
      total -= s.soldQuantity + s.loss;
  for (const a of data.adjustments)
    if (a.productId === productId && a.location === 'consignment' && atPoint(a.pointId))
      total += a.delta;
  return total;
}

export interface ProductStock {
  productId: ID;
  home: number;
  consignment: number;
}

export function stockByProduct(data: StockData, productIds: ID[]): ProductStock[] {
  return productIds.map((productId) => ({
    productId,
    home: homeStock(data, productId),
    consignment: consignmentStock(data, productId),
  }));
}
