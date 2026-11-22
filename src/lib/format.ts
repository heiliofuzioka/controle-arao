import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate, shiftDays } from '../domain/dates';
import type { LocalDate } from '../domain/types';

const fmt = (date: LocalDate, pattern: string) => format(parseLocalDate(date), pattern, { locale: ptBR });

/** "8 de nov" (com o ano quando não é o ano de referência: "8 de nov de 2025"). */
export function formatDayMonth(date: LocalDate, referenceYear?: string): string {
  const withYear = referenceYear !== undefined && date.slice(0, 4) !== referenceYear;
  return fmt(date, withYear ? "d 'de' MMM 'de' yyyy" : "d 'de' MMM");
}

/** "Semana de 3 a 9 de nov" ou, cruzando o mês, "Semana de 27 de out a 2 de nov". */
export function formatWeekLabel(weekStart: LocalDate): string {
  const end = shiftDays(weekStart, 6);
  const sameMonth = weekStart.slice(0, 7) === end.slice(0, 7);
  const start = sameMonth ? fmt(weekStart, 'd') : formatDayMonth(weekStart);
  return `Semana de ${start} a ${formatDayMonth(end)}`;
}

/** "Hoje, 8 de nov", "Ontem, 7 de nov" ou "5 de nov". */
export function formatDayLabel(date: LocalDate, today: LocalDate): string {
  const text = formatDayMonth(date, today.slice(0, 4));
  if (date === today) return `Hoje, ${text}`;
  if (date === shiftDays(today, -1)) return `Ontem, ${text}`;
  return text;
}

/** "07/11" */
export function formatShortDate(date: LocalDate): string {
  return fmt(date, 'dd/MM');
}

/**
 * "1 Brownie", "8 Brownies", "2 Brownies recheados", "3 Tortas".
 * Regra simples do português: palavra terminada em vogal ganha "s".
 */
export function formatCount(quantity: number, name: string): string {
  if (quantity === 1) return `1 ${name}`;
  const plural = name
    .split(' ')
    .map((word) => (/[aeiouáéíóú]$/i.test(word) ? `${word}s` : word))
    .join(' ');
  return `${quantity} ${plural}`;
}
