import { describe, expect, it } from 'vitest';
import { findGoal, goalProgress } from './goals';
import type { MonthlyGoal } from './types';

const goal = (o: Partial<MonthlyGoal>): MonthlyGoal => ({ id: 'g', createdAt: '', updatedAt: '', month: '2026-11', ...o });

describe('metas do mês', () => {
  it('acha a meta do mês, ignorando apagadas', () => {
    const goals = [goal({ id: 'a', month: '2026-10' }), goal({ id: 'b', deletedAt: 'x' }), goal({ id: 'c' })];
    expect(findGoal(goals, '2026-11')?.id).toBe('c');
    expect(findGoal(goals, '2026-12')).toBeUndefined();
  });

  it('mostra alcançado, % e quanto falta', () => {
    expect(goalProgress(300000, 225000)).toEqual({
      targetCents: 300000,
      achievedCents: 225000,
      ratio: 0.75,
      remainingCents: 75000,
      reached: false,
    });
  });

  it('meta batida não tem falta', () => {
    expect(goalProgress(100000, 120000)).toMatchObject({ ratio: 1.2, remainingCents: 0, reached: true });
  });

  it('sem meta não mostra progresso', () => {
    expect(goalProgress(undefined, 5000)).toBeNull();
    expect(goalProgress(0, 5000)).toBeNull();
  });
});
