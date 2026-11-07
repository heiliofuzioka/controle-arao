import type { Cents } from '../domain/types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCents(cents: Cents): string {
  return brl.format(cents / 100);
}

/**
 * Lê o que o Arão digitou ("12,50", "12.50", "1.234,56", "R$ 5") e devolve centavos.
 * Devolve null se o texto não for um valor válido (vazio, negativo, mais de 2 casas).
 */
export function parseCentsInput(text: string): Cents | null {
  let s = text.replace(/R\$|\s/g, '');
  if (s === '' || /[^0-9.,]/.test(s)) return null;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = s.split('.').length - 1;
    const decimals = s.length - s.lastIndexOf('.') - 1;
    // "12.50" é decimal; "1.234" e "1.234.567" são milhar.
    if (dots > 1 || (dots === 1 && decimals === 3)) s = s.replace(/\./g, '');
  }

  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(s);
  if (!match || (match[1] === '' && !match[2])) return null;
  const reais = Number(match[1] || '0');
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  return reais * 100 + cents;
}
