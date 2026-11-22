import { multiplyCents, sumCents } from './money';
import { alive, newBase, softDelete, touch } from './records';
import type { Cents, ID, LocalDate, Sale, Settlement } from './types';

export interface SettlementInput {
  /** Estoque no Açougue antes do acerto. */
  stockBefore: number;
  /** Quantos ainda estão lá. */
  remaining: number;
  /** Quantos se perderam lá. */
  loss: number;
  priceCents: Cents;
}

export type SettlementResult =
  | { ok: true; soldQuantity: number; valueCents: Cents }
  | { ok: false; error: string };

const isCount = (n: number) => Number.isSafeInteger(n) && n >= 0;

/**
 * Vendidos = estoque antes − sobra − perda. Valor = vendidos × preço.
 * Se der negativo, o acerto é bloqueado com uma mensagem para o Arão.
 */
export function computeSettlement(input: SettlementInput): SettlementResult {
  const { stockBefore, remaining, loss, priceCents } = input;
  if (!isCount(remaining)) return { ok: false, error: 'A quantidade que sobrou precisa ser um número inteiro, 0 ou mais.' };
  if (!isCount(loss)) return { ok: false, error: 'A perda precisa ser um número inteiro, 0 ou mais.' };

  const soldQuantity = stockBefore - remaining - loss;
  if (soldQuantity < 0) {
    return {
      ok: false,
      error:
        loss > 0
          ? `Sobra e perda passam do que tinha no Açougue (${stockBefore}). Confira os números.`
          : `Sobrou mais do que tinha no Açougue (${stockBefore}). Confira os números.`,
    };
  }
  return { ok: true, soldQuantity, valueCents: multiplyCents(soldQuantity, priceCents) };
}

/** A venda que nasce do acerto (gravada na mesma transação, na data do acerto). */
export function saleFromSettlement(settlement: Settlement, saleId: string, now: string): Sale {
  return {
    ...newBase(saleId, now),
    date: settlement.date,
    pointId: settlement.pointId,
    productId: settlement.productId,
    quantity: settlement.soldQuantity,
    valueCents: settlement.valueCents,
    origin: 'settlement',
    settlementId: settlement.id,
  };
}

/** A receber = soma dos acertos ainda não pagos. */
export function receivableCents(settlements: Settlement[]): Cents {
  return sumCents(alive(settlements).filter((s) => !s.paid).map((s) => s.valueCents));
}

/** Botão "Recebi". */
export function markPaid(settlement: Settlement, paidDate: LocalDate, now: string): Settlement {
  return touch(settlement, { paid: true, paidDate }, now);
}

/** Desfazer o "Recebi". */
export function markUnpaid(settlement: Settlement, now: string): Settlement {
  const { paidDate: _removed, ...rest } = settlement;
  return { ...rest, paid: false, updatedAt: now };
}

export interface SettlementPlanInput {
  date: LocalDate;
  pointId: ID;
  productId: ID;
  remaining: number;
  loss: number;
  soldQuantity: number;
  /** vendidos × preço, ou o valor digitado quando o produto ainda não tem preço. */
  valueCents: Cents;
}

export interface SettlementPlan {
  settlement: Settlement;
  /** Venda na data do acerto; com deletedAt quando deixou de existir. Ausente se não há venda. */
  sale?: Sale;
}

/**
 * Monta o que gravar ao salvar um acerto (numa única transação Dexie).
 * Acerto sem nada a receber (valor 0) já nasce como recebido (decisão de 22/11).
 * Editar mantém o "Recebi" de um acerto que ainda tem valor.
 */
export function planSettlement(args: {
  input: SettlementPlanInput;
  existing?: { settlement: Settlement; sale?: Sale };
  newId: () => ID;
  now: string;
}): SettlementPlan {
  const { input, existing, newId, now } = args;
  const paid = input.valueCents === 0 || (existing?.settlement.paid ?? false);
  const paidDate = paid ? (existing?.settlement.paidDate ?? input.date) : undefined;

  const base: Settlement = existing ? existing.settlement : ({ ...newBase(newId(), now) } as Settlement);
  const { paidDate: _old, ...withoutPaidDate } = base;
  const settlement: Settlement = {
    ...withoutPaidDate,
    ...input,
    paid,
    ...(paidDate ? { paidDate } : {}),
    updatedAt: now,
  };

  const hasSale = input.soldQuantity > 0 || input.valueCents > 0;
  const oldSale = existing?.sale && !existing.sale.deletedAt ? existing.sale : undefined;
  if (!hasSale) return oldSale ? { settlement, sale: softDelete(oldSale, now) } : { settlement };
  const fresh = saleFromSettlement(settlement, oldSale?.id ?? newId(), now);
  return { settlement, sale: oldSale ? { ...fresh, createdAt: oldSale.createdAt } : fresh };
}
