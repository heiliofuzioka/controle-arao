import { describe, expect, it } from 'vitest';
import { inputUnitsFor, toBaseQuantity } from './units';

describe('unidades', () => {
  it('converte kg para g e L para ml', () => {
    expect(toBaseQuantity(1.2, 'kg')).toEqual({ quantity: 1200, unit: 'g' });
    expect(toBaseQuantity(0.395, 'L')).toEqual({ quantity: 395, unit: 'ml' });
  });

  it('mantém g, ml e un', () => {
    expect(toBaseQuantity(395, 'g')).toEqual({ quantity: 395, unit: 'g' });
    expect(toBaseQuantity(200, 'ml')).toEqual({ quantity: 200, unit: 'ml' });
    expect(toBaseQuantity(12, 'un')).toEqual({ quantity: 12, unit: 'un' });
  });

  it('oferece as unidades compatíveis', () => {
    expect(inputUnitsFor('g')).toEqual(['g', 'kg']);
    expect(inputUnitsFor('ml')).toEqual(['ml', 'L']);
    expect(inputUnitsFor('un')).toEqual(['un']);
  });
});
