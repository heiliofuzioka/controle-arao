import { describe, expect, it } from 'vitest';
import {
  formatCount,
  formatDayLabel,
  formatDayMonth,
  formatMonthName,
  formatShortDate,
  formatWeekLabel,
  formatWeekRangeLong,
  formatWeekRangeShort,
  formatWeekdayDate,
} from './format';

describe('formatação de datas', () => {
  it('rótulo da semana', () => {
    expect(formatWeekLabel('2026-11-02')).toBe('Semana de 2 a 8 de nov');
    expect(formatWeekLabel('2026-10-26')).toBe('Semana de 26 de out a 1 de nov');
    expect(formatWeekLabel('2026-12-28')).toBe('Semana de 28 de dez a 3 de jan');
  });

  it('dia e mês', () => {
    expect(formatDayMonth('2026-11-08')).toBe('8 de nov');
    expect(formatDayMonth('2025-11-08', '2026')).toBe('8 de nov de 2025');
  });

  it('hoje, ontem e outros dias', () => {
    expect(formatDayLabel('2026-11-08', '2026-11-08')).toBe('Hoje, 8 de nov');
    expect(formatDayLabel('2026-11-07', '2026-11-08')).toBe('Ontem, 7 de nov');
    expect(formatDayLabel('2026-11-05', '2026-11-08')).toBe('5 de nov');
    expect(formatDayLabel('2025-12-31', '2026-01-01')).toBe('Ontem, 31 de dez de 2025');
  });

  it('data curta', () => {
    expect(formatShortDate('2026-11-07')).toBe('07/11');
  });
});

describe('quantidade com nome', () => {
  it('põe no plural', () => {
    expect(formatCount(1, 'Brownie')).toBe('1 Brownie');
    expect(formatCount(8, 'Brownie')).toBe('8 Brownies');
    expect(formatCount(4, 'Torta')).toBe('4 Tortas');
    expect(formatCount(2, 'Brownie recheado')).toBe('2 Brownies recheados');
    expect(formatCount(0, 'Gelinho')).toBe('0 Gelinhos');
  });
});

describe('semana, mês e dia da semana', () => {
  it('intervalo da semana por extenso e curto', () => {
    expect(formatWeekRangeLong('2026-11-02')).toBe('2 a 8 de novembro');
    expect(formatWeekRangeLong('2026-10-26')).toBe('26 de outubro a 1 de novembro');
    expect(formatWeekRangeShort('2026-11-02')).toBe('2 a 8 de nov');
  });

  it('nome do mês', () => {
    expect(formatMonthName('2026-11')).toBe('Novembro');
    expect(formatMonthName('2026-11', true)).toBe('Novembro de 2026');
  });

  it('dia da semana com a data', () => {
    expect(formatWeekdayDate('2026-11-05')).toBe('Qui 05/11');
    expect(formatWeekdayDate('2026-11-08')).toBe('Dom 08/11');
  });
});
