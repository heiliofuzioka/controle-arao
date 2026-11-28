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

/** "3 a 9 de novembro" ou "27 de outubro a 2 de novembro". */
export function formatWeekRangeLong(weekStart: LocalDate): string {
  const end = shiftDays(weekStart, 6);
  const sameMonth = weekStart.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${fmt(weekStart, 'd')} a ${fmt(end, "d 'de' MMMM")}`
    : `${fmt(weekStart, "d 'de' MMMM")} a ${fmt(end, "d 'de' MMMM")}`;
}

/** "3 a 9 de nov" (curto, sem "Semana de"). */
export function formatWeekRangeShort(weekStart: LocalDate): string {
  return formatWeekLabel(weekStart).replace(/^Semana de /, '');
}

/** "Novembro" e "Novembro de 2026". */
export function formatMonthName(month: string, withYear = false): string {
  const name = fmt(`${month}-01`, withYear ? "MMMM 'de' yyyy" : 'MMMM');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "Qua 05/11" */
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatWeekdayDate(date: LocalDate): string {
  return `${WEEKDAYS[parseLocalDate(date).getDay()]} ${formatShortDate(date)}`;
}

/** "17 nov" (dia e mês curto, para gráficos). */
export function formatDayShortMonth(date: LocalDate): string {
  return fmt(date, "d MMM");
}

/** "jun" (mês curto, para gráficos). */
export function formatMonthShort(month: string): string {
  return fmt(`${month}-01`, 'MMM');
}

/** Rótulo do período do Painel: "16 a 22 de nov", "1 a 30 de nov", "out a nov", "jun a nov", "2026". */
export function formatPeriodLabel(range: { start: LocalDate; end: LocalDate }, kind: 'week' | 'month' | 'months' | 'year'): string {
  if (kind === 'year') return range.start.slice(0, 4);
  if (kind === 'months') return `${formatMonthShort(range.start.slice(0, 7))} a ${formatMonthShort(range.end.slice(0, 7))}`;
  if (kind === 'month') return `${fmt(range.start, 'd')} a ${fmt(range.end, "d 'de' MMM")}`;
  return formatWeekRangeShort(range.start);
}

/** "3 a 9 nov" ou "27 out a 2 nov" (semanas do mês). */
export function formatWeekCompact(weekStart: LocalDate): string {
  const end = shiftDays(weekStart, 6);
  const sameMonth = weekStart.slice(0, 7) === end.slice(0, 7);
  return `${fmt(weekStart, sameMonth ? 'd' : 'd MMM')} a ${fmt(end, 'd MMM')}`;
}

/** Quantidade com singular e plural escritos (palavras como "sabor/sabores"). */
export function formatPlural(quantity: number, one: string, many: string): string {
  return `${quantity} ${quantity === 1 ? one : many}`;
}
