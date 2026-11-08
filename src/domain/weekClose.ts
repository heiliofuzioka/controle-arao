import { isInRange, shiftDays, weekRangeFromStart } from './dates';
import { multiplyCents } from './money';
import { alive, newBase, softDelete, touch } from './records';
import { homeStock, weekCloseDate, type StockData } from './stock';
import type { Cents, ID, LocalDate, Sale, WeekClose } from './types';

export interface WeekCloseInput {
  weekStart: LocalDate;
  productId: ID;
  produced: number;
  loss: number;
  soldDirect: number;
}

export interface WeekCloseCheck {
  ok: boolean;
  /** Estoque em casa no começo da semana (inclui ajustes feitos durante a semana). */
  startStock: number;
  /** Levado ao Açougue durante a semana. */
  delivered: number;
  /** O que dava para vender na mão: começo + produzido − perdido − entregue. */
  available: number;
  /** Ficou em casa no fim da semana. */
  leftover: number;
  error?: string;
}

const isCount = (n: number) => Number.isSafeInteger(n) && n >= 0;

/**
 * Confere um card do fechamento. Vender mais do que tinha em casa bloqueia o salvar,
 * com a conta para o Arão ("Tinha 2 em casa + 10 feitos = 12").
 * `existingId`: o fechamento dessa semana que está sendo editado (não conta duas vezes).
 */
export function checkWeekClose(data: StockData, input: WeekCloseInput, existingId?: ID): WeekCloseCheck {
  const { weekStart, productId, produced, loss, soldDirect } = input;
  const week = weekRangeFromStart(weekStart);

  const before = homeStock(data, productId, { until: shiftDays(week.start, -1), excludeWeekCloseId: existingId });
  let weekAdjustments = 0;
  for (const a of alive(data.adjustments))
    if (a.productId === productId && a.location === 'home' && isInRange(a.date, week)) weekAdjustments += a.delta;
  let delivered = 0;
  for (const d of alive(data.deliveries))
    if (d.productId === productId && isInRange(d.date, week)) delivered += d.quantity;

  const startStock = before + weekAdjustments;
  const available = startStock + produced - loss - delivered;
  const leftover = available - soldDirect;
  const result = { startStock, delivered, available, leftover };

  if (!isCount(produced)) return { ...result, ok: false, error: 'O que foi feito precisa ser um número inteiro, 0 ou mais.' };
  if (!isCount(soldDirect)) return { ...result, ok: false, error: 'O que foi vendido precisa ser um número inteiro, 0 ou mais.' };
  if (!isCount(loss)) return { ...result, ok: false, error: 'A perda precisa ser um número inteiro, 0 ou mais.' };
  if (leftover < 0) return { ...result, ok: false, error: `${explainAvailable(result, produced, loss)}. Vendeu ${soldDirect}.` };
  return { ...result, ok: true };
}

/** "Tinha 2 em casa + 10 feitos − 1 perdido − 4 no Açougue = 7" */
export function explainAvailable(
  check: Pick<WeekCloseCheck, 'startStock' | 'delivered' | 'available'>,
  produced: number,
  loss: number,
): string {
  let text = `Tinha ${check.startStock} em casa + ${produced} ${produced === 1 ? 'feito' : 'feitos'}`;
  if (loss > 0) text += ` − ${loss} ${loss === 1 ? 'perdido' : 'perdidos'}`;
  if (check.delivered > 0) text += ` − ${check.delivered} no Açougue`;
  return `${text} = ${check.available}`;
}

/** Valor sugerido da venda na mão (o Arão pode editar para dar desconto). */
export function defaultWeekCloseValue(soldDirect: number, priceCents: Cents): Cents {
  return multiplyCents(soldDirect, priceCents);
}

/** O fechamento já salvo de um produto numa semana (para editar em vez de duplicar). */
export function findWeekClose(weekCloses: WeekClose[], weekStart: LocalDate, productId: ID): WeekClose | undefined {
  return alive(weekCloses).find((w) => w.weekStart === weekStart && w.productId === productId);
}

/** Semana tem algum fechamento? */
export function isWeekClosed(weekCloses: WeekClose[], weekStart: LocalDate): boolean {
  return alive(weekCloses).some((w) => w.weekStart === weekStart);
}

export interface WeekClosePlan {
  /** Fechamento novo ou o existente atualizado. */
  weekClose: WeekClose;
  /** Venda na data do domingo, nova ou atualizada; com deletedAt quando a venda zerou. Ausente se não há o que gravar. */
  sale?: Sale;
}

export interface PlanWeekCloseArgs {
  input: WeekCloseInput & { valueCents: Cents; note?: string };
  directPointId: ID;
  /** Fechamento existente dessa semana e produto, e a venda dele. */
  existing?: { weekClose: WeekClose; sale?: Sale };
  newId: () => ID;
  now: string;
}

/**
 * Monta o que gravar ao salvar um card do fechamento (numa única transação Dexie).
 * Fechar de novo a mesma semana edita, não duplica.
 */
export function planWeekClose({ input, directPointId, existing, newId, now }: PlanWeekCloseArgs): WeekClosePlan {
  const fields = {
    weekStart: input.weekStart,
    productId: input.productId,
    produced: input.produced,
    loss: input.loss,
    soldDirect: input.soldDirect,
    valueCents: input.valueCents,
    note: input.note,
  };
  const weekClose: WeekClose = existing
    ? touch(existing.weekClose, fields, now)
    : { ...newBase(newId(), now), ...fields };

  const hasSale = input.soldDirect > 0 || input.valueCents > 0;
  const saleFields = {
    date: weekCloseDate(weekClose),
    pointId: directPointId,
    productId: weekClose.productId,
    quantity: input.soldDirect,
    valueCents: input.valueCents,
    origin: 'week_close' as const,
    weekCloseId: weekClose.id,
  };

  const oldSale = existing?.sale && !existing.sale.deletedAt ? existing.sale : undefined;
  if (oldSale) {
    return { weekClose, sale: hasSale ? touch(oldSale, saleFields, now) : softDelete(oldSale, now) };
  }
  return hasSale ? { weekClose, sale: { ...newBase(newId(), now), ...saleFields } } : { weekClose };
}
