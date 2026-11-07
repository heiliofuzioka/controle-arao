import { describe, expect, it } from 'vitest';
import { multiplyCents, roundCents, sumCents } from './money';

describe('dinheiro em centavos', () => {
  it('soma sem erro de float', () => {
    // 0,10 + 0,20 em float dá 0.30000000000000004
    expect(sumCents([10, 20])).toBe(30);
    expect(sumCents([])).toBe(0);
  });

  it('recusa valores quebrados', () => {
    expect(() => sumCents([10.5])).toThrow();
    expect(() => multiplyCents(1.5, 100)).toThrow();
  });

  it('multiplica quantidade por preço', () => {
    expect(multiplyCents(7, 350)).toBe(2450);
    expect(multiplyCents(0, 350)).toBe(0);
  });

  it('arredonda para o centavo mais próximo', () => {
    expect(roundCents(266.6666)).toBe(267);
    expect(roundCents(266.4)).toBe(266);
    expect(() => roundCents(Infinity)).toThrow();
  });
});
