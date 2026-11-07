import { describe, expect, it } from 'vitest';
import { formatCents, parseCentsInput } from './money';

describe('formatCents', () => {
  it('formata em reais', () => {
    expect(formatCents(1250)).toMatch(/^R\$\s12,50$/);
    expect(formatCents(274700)).toMatch(/^R\$\s2\.747,00$/);
    expect(formatCents(0)).toMatch(/^R\$\s0,00$/);
  });
});

describe('parseCentsInput', () => {
  it.each([
    ['12,50', 1250],
    ['12,5', 1250],
    ['12.50', 1250],
    ['12', 1200],
    ['0,99', 99],
    [',50', 50],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['R$ 5', 500],
    [' 7,00 ', 700],
  ])('lê "%s" como %i centavos', (text, cents) => {
    expect(parseCentsInput(text)).toBe(cents);
  });

  it.each(['', 'abc', '-5', '1,234', '12,50,1', ','])('recusa "%s"', (text) => {
    expect(parseCentsInput(text)).toBeNull();
  });
});
