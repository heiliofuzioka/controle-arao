import type { Unit } from './types';

/** Unidades que a tela aceita. kg e L são convertidos para g e ml antes de gravar. */
export type InputUnit = 'g' | 'kg' | 'ml' | 'L' | 'un';

const FACTOR: Record<InputUnit, [Unit, number]> = {
  g: ['g', 1],
  kg: ['g', 1000],
  ml: ['ml', 1],
  L: ['ml', 1000],
  un: ['un', 1],
};

/** Tira o ruído de float (1,2 × 1000 = 1200.0000000000002). */
const clean = (n: number) => Math.round(n * 1e6) / 1e6;

export function toBaseQuantity(value: number, unit: InputUnit): { quantity: number; unit: Unit } {
  const [base, factor] = FACTOR[unit];
  return { quantity: clean(value * factor), unit: base };
}

/** Unidades que a tela oferece para um ingrediente gravado na unidade base. */
export function inputUnitsFor(unit: Unit): InputUnit[] {
  if (unit === 'g') return ['g', 'kg'];
  if (unit === 'ml') return ['ml', 'L'];
  return ['un'];
}
