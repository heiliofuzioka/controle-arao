import { addDays, addMonths, endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from 'date-fns';
import type { LocalDate } from './types';

/** Intervalo fechado de datas locais: start ≤ data ≤ end. */
export interface DateRange {
  start: LocalDate;
  end: LocalDate;
}

/** 'YYYY-MM' */
export type MonthKey = string;

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
