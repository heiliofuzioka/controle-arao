import type { Cents } from './types';

export function assertCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) throw new Error(`Valor em centavos precisa ser inteiro: ${value}`);
  return value;
}

/** Soma valores em centavos (só inteiros). */
export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const v of values) total += assertCents(v);
  return total;
}

/** quantidade × preço, em centavos. */
export function multiplyCents(quantity: number, priceCents: Cents): Cents {
  if (!Number.isSafeInteger(quantity)) throw new Error(`Quantidade precisa ser inteira: ${quantity}`);
  return assertCents(quantity * assertCents(priceCents));
}

/** Arredonda um valor calculado (ex.: preço sugerido) para centavos inteiros. */
export function roundCents(value: number): Cents {
  if (!Number.isFinite(value)) throw new Error(`Valor inválido: ${value}`);
  return Math.round(value);
}
