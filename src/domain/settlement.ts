import { multiplyCents, sumCents } from './money';
import { alive, newBase, touch } from './records';
import type { Cents, LocalDate, Sale, Settlement } from './types';

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
      error: `O Açougue tinha ${stockBefore}, mas sobra mais perda dá ${remaining + loss}. Confira os números.`,
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
