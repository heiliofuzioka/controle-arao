import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  isInRange,
  lastMonths,
  lastWeeks,
  monthsOfYear,
  weekRangeFromStart,
  weekStartOf,
  weeksOfMonth,
  yearRange,
  monthKey,
  monthRange,
  parseLocalDate,
  previousMonth,
  shiftMonth,
  shiftWeek,
  sundayOfWeek,
  toLocalDate,
  toLocalTime,
  weekDays,
  weekRange,
} from './dates';

describe('datas locais', () => {
  it('usa o fuso do aparelho, mesmo perto da meia-noite', () => {
    expect(toLocalDate(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07');
    expect(toLocalDate(new Date(2026, 10, 8, 0, 1))).toBe('2026-11-08');
    expect(toLocalTime(new Date(2026, 10, 7, 9, 5))).toBe('09:05');
  });

  it('converte texto para data e volta', () => {
    expect(toLocalDate(parseLocalDate('2026-02-28'))).toBe('2026-02-28');
    expect(() => parseLocalDate('2026-13-01')).toThrow();
  });

  it('compara intervalos fechados', () => {
    const r = { start: '2026-11-02', end: '2026-11-08' };
    expect(isInRange('2026-11-02', r)).toBe(true);
    expect(isInRange('2026-11-08', r)).toBe(true);
    expect(isInRange('2026-11-09', r)).toBe(false);
    expect(isInRange('2026-11-01', r)).toBe(false);
  });

  it('calcula dias entre datas', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
  });
});

describe('semana (segunda a domingo)', () => {
  it('começa na segunda e termina no domingo', () => {
    // 07/11/2026 é sábado
    expect(weekRange('2026-11-07')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(weekRange('2026-11-08')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });

  it('segunda começa uma semana nova', () => {
    expect(weekRange('2026-11-09')).toEqual({ start: '2026-11-09', end: '2026-11-15' });
  });

  it('lista os 7 dias e cruza a virada do mês', () => {
    expect(weekDays('2026-10-01')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('acha o domingo da semana (importação do caderno)', () => {
    expect(sundayOfWeek('2026-08-03')).toBe('2026-08-09');
    expect(sundayOfWeek('2026-08-09')).toBe('2026-08-09');
  });

  it('anda semanas para frente e para trás', () => {
    expect(shiftWeek('2026-11-02', 1)).toBe('2026-11-09');
    expect(shiftWeek('2026-11-02', -1)).toBe('2026-10-26');
  });
});

describe('mês do calendário', () => {
  it('pega o mês da data', () => {
    expect(monthKey('2026-08-31')).toBe('2026-08');
  });

  it('dá o primeiro e o último dia', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('volta para o mês anterior, inclusive na virada do ano', () => {
    expect(previousMonth('2026-11')).toBe('2026-10');
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('uma semana que cruza o mês tem cada dia no próprio mês', () => {
    const days = weekDays('2026-10-01');
    const sept = monthRange('2026-09');
    const oct = monthRange('2026-10');
    expect(days.filter((d) => isInRange(d, sept))).toHaveLength(3);
    expect(days.filter((d) => isInRange(d, oct))).toHaveLength(4);
  });
});

describe('semanas do mês e ano', () => {
  it('acha a segunda da semana', () => {
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02');
    expect(weekRangeFromStart('2026-11-02')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });

  it('o mês tem as semanas cujo domingo cai nele', () => {
    // outubro/2026: domingos 4, 11, 18, 25 → 4 semanas; a primeira começa em setembro
    expect(weeksOfMonth('2026-10')).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
    // novembro/2026: domingos 1, 8, 15, 22, 29 → 5 semanas
    expect(weeksOfMonth('2026-11')).toHaveLength(5);
    expect(weeksOfMonth('2026-11')[0]).toBe('2026-10-26');
  });

  it('lista as últimas semanas e os últimos meses', () => {
    expect(lastWeeks('2026-11-08', 3)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
    expect(lastMonths('2026-02-10', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('dá o ano inteiro', () => {
    expect(yearRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    expect(monthsOfYear(2026)).toHaveLength(12);
    expect(monthsOfYear(2026)[0]).toBe('2026-01');
    expect(monthsOfYear(2026)[11]).toBe('2026-12');
  });
});
