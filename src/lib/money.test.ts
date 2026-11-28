import { describe, expect, it } from 'vitest';
import {
  formatCents,
  formatCentsPlain,
  formatCompactReais,
  formatPercent,
  formatReais,
  formatSignedPercent,
  parseCentsInput,
} from './money';

describe('formatCents', () => {
  it('formata em reais', () => {
    expect(formatCents(1250)).toMatch(/^R\$\s12,50$/);
    expect(formatCents(274700)).toMatch(/^R\$\s2\.747,00$/);
    expect(formatCents(0)).toMatch(/^R\$\s0,00$/);
  });
});

describe('formatCentsPlain', () => {
  it('formata sem o R$', () => {
    expect(formatCentsPlain(4200)).toBe('42,00');
    expect(formatCentsPlain(123456)).toBe('1.234,56');
    expect(parseCentsInput(formatCentsPlain(123456))).toBe(123456);
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

describe('metas', () => {
  it('reais redondos e porcentagem', () => {
    expect(formatReais(274700)).toMatch(/^R\$\s2\.747$/);
    expect(formatReais(25350)).toMatch(/^R\$\s254$/);
    expect(formatPercent(2747 / 3000)).toBe('92%');
    expect(formatPercent(1.2)).toBe('120%');
  });
});

describe('valores curtos dos gráficos', () => {
  it('reais e milhares', () => {
    expect(formatCompactReais(74200)).toMatch(/^R\$\s742$/);
    expect(formatCompactReais(0)).toMatch(/^R\$\s0$/);
    expect(formatCompactReais(274700)).toBe('R$ 2,7 mil');
    expect(formatCompactReais(300000)).toBe('R$ 3 mil');
    expect(formatCompactReais(1496400)).toBe('R$ 15 mil');
  });
});

describe('variação com sinal', () => {
  it('mais, menos e zero', () => {
    expect(formatSignedPercent(0.12)).toBe('+12%');
    expect(formatSignedPercent(-0.031)).toBe('−3%');
    expect(formatSignedPercent(0.001)).toBe('0%');
  });
});
