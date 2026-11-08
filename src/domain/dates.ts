import { addDays, addMonths, endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from 'date-fns';
import type { LocalDate, MonthKey } from './types';

/** Intervalo fechado de datas locais: start ≤ data ≤ end. */
export interface DateRange {
  start: LocalDate;
  end: LocalDate;
}

const LOCAL_DATE = 'yyyy-MM-dd';
const WEEK = { weekStartsOn: 1 } as const; // segunda a domingo

/** Data no fuso do aparelho (nunca usar toISOString, que é UTC). */
export function toLocalDate(d: Date): LocalDate {
  return format(d, LOCAL_DATE);
}

/** Hora local 'HH:mm'. */
export function toLocalTime(d: Date): string {
  return format(d, 'HH:mm');
}

/** Converte 'YYYY-MM-DD' para Date à meia-noite local. */
export function parseLocalDate(date: LocalDate): Date {
  const d = parse(date, LOCAL_DATE, new Date(2000, 0, 1));
  if (Number.isNaN(d.getTime())) throw new Error(`Data inválida: ${date}`);
  return d;
}

export function isInRange(date: LocalDate, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

/** Semana de segunda a domingo que contém a data. */
export function weekRange(date: LocalDate): DateRange {
  const d = parseLocalDate(date);
  return { start: toLocalDate(startOfWeek(d, WEEK)), end: toLocalDate(endOfWeek(d, WEEK)) };
}

/** Os 7 dias (segunda → domingo) da semana que contém a data. */
export function weekDays(date: LocalDate): LocalDate[] {
  const monday = startOfWeek(parseLocalDate(date), WEEK);
  return Array.from({ length: 7 }, (_, i) => toLocalDate(addDays(monday, i)));
}

/** Domingo da semana (usado na importação do caderno). */
export function sundayOfWeek(date: LocalDate): LocalDate {
  return weekRange(date).end;
}

export function shiftWeek(date: LocalDate, weeks: number): LocalDate {
  return toLocalDate(addDays(parseLocalDate(date), weeks * 7));
}

export function monthKey(date: LocalDate): MonthKey {
  return date.slice(0, 7);
}

export function monthRange(month: MonthKey): DateRange {
  const d = parseLocalDate(`${month}-01`);
  return { start: toLocalDate(startOfMonth(d)), end: toLocalDate(endOfMonth(d)) };
}

export function shiftMonth(month: MonthKey, months: number): MonthKey {
  return monthKey(toLocalDate(addMonths(parseLocalDate(`${month}-01`), months)));
}

export function previousMonth(month: MonthKey): MonthKey {
  return shiftMonth(month, -1);
}

/** Dias inteiros entre duas datas locais (b − a). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  // Math.round absorve a hora a mais/a menos de horário de verão.
  return Math.round(ms / 86_400_000);
}

/** Segunda-feira da semana que contém a data. */
export function weekStartOf(date: LocalDate): LocalDate {
  return weekRange(date).start;
}

/** Semana a partir da segunda (weekStart). */
export function weekRangeFromStart(weekStart: LocalDate): DateRange {
  return { start: weekStart, end: shiftDays(weekStart, 6) };
}

export function shiftDays(date: LocalDate, days: number): LocalDate {
  return toLocalDate(addDays(parseLocalDate(date), days));
}

/**
 * Semanas que contam no mês: as que terminam (domingo) dentro dele, porque o
 * fechamento da semana é lançado no domingo. Dá 4 ou 5 semanas; a primeira pode
 * começar no mês anterior.
 */
export function weeksOfMonth(month: MonthKey): LocalDate[] {
  const { start, end } = monthRange(month);
  const weeks: LocalDate[] = [];
  for (let sunday = sundayOfWeek(start); sunday <= end; sunday = shiftDays(sunday, 7)) {
    weeks.push(shiftDays(sunday, -6));
  }
  return weeks;
}

/** As últimas `count` semanas terminando na semana da data (mais antiga primeiro). */
export function lastWeeks(date: LocalDate, count: number): LocalDate[] {
  const current = weekStartOf(date);
  return Array.from({ length: count }, (_, i) => shiftDays(current, (i - count + 1) * 7));
}

/** Os últimos `count` meses terminando no mês da data (mais antigo primeiro). */
export function lastMonths(date: LocalDate, count: number): MonthKey[] {
  const current = monthKey(date);
  return Array.from({ length: count }, (_, i) => shiftMonth(current, i - count + 1));
}

export function yearRange(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function monthsOfYear(year: number): MonthKey[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}
