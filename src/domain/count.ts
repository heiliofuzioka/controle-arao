import { alive, newBase } from './records';
import { consignmentStock, homeStock, importedWeekCloseIds, type StockData } from './stock';
import type { ID, LocalDate, StockAdjustment } from './types';

/**
 * O produto já tem algum registro de estoque (contagem, fechamento ou entrega)?
 * Sem nenhum, o Início mostra "Ainda não contado".
 */
export function isCounted(data: StockData, productId: ID): boolean {
  const imported = importedWeekCloseIds(data.sales);
  return (
    alive(data.adjustments).some((a) => a.productId === productId) ||
    alive(data.weekCloses).some((w) => w.productId === productId && !imported.has(w.id)) ||
    alive(data.deliveries).some((d) => d.productId === productId)
  );
}

export interface StockCount {
  productId: ID;
  home: number;
  consignment: number;
}

/**
 * Contar estoque: compara o que o Arão contou com o que o app calcula e cria um ajuste
 * para cada diferença. A primeira contagem de um produto é "initial_count"; as outras, "correction".
 */
export function planStockCount(args: {
  data: StockData;
  counts: StockCount[];
  date: LocalDate;
  consignmentPointId: ID;
  newId: () => ID;
  now: string;
}): StockAdjustment[] {
  const { data, counts, date, consignmentPointId, newId, now } = args;
  const adjustments: StockAdjustment[] = [];
  for (const count of counts) {
    const reason = isCounted(data, count.productId) ? 'correction' : 'initial_count';
    const homeDelta = count.home - homeStock(data, count.productId, { until: date });
    const consignmentDelta =
      count.consignment - consignmentStock(data, count.productId, { pointId: consignmentPointId, until: date });
    if (homeDelta !== 0) {
      adjustments.push({ ...newBase(newId(), now), date, productId: count.productId, location: 'home', delta: homeDelta, reason });
    }
    if (consignmentDelta !== 0) {
      adjustments.push({
        ...newBase(newId(), now),
        date,
        productId: count.productId,
        location: 'consignment',
        pointId: consignmentPointId,
        delta: consignmentDelta,
        reason,
      });
    }
  }
  return adjustments;
}
