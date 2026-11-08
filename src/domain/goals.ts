import { alive } from './records';
import type { Cents, MonthKey, MonthlyGoal } from './types';

export function findGoal(goals: MonthlyGoal[], month: MonthKey): MonthlyGoal | undefined {
  return alive(goals).find((g) => g.month === month);
}

export interface GoalProgress {
  targetCents: Cents;
  achievedCents: Cents;
  /** % atingido (1 = 100%). Pode passar de 1 e ficar negativo (lucro negativo). */
  ratio: number;
  /** Quanto falta; 0 quando já bateu. */
  remainingCents: Cents;
  reached: boolean;
}

/** Progresso de uma meta. null quando não há meta (a tela mostra "Definir meta"). */
export function goalProgress(targetCents: Cents | undefined, achievedCents: Cents): GoalProgress | null {
  if (targetCents === undefined || targetCents <= 0) return null;
  return {
    targetCents,
    achievedCents,
    ratio: achievedCents / targetCents,
    remainingCents: Math.max(0, targetCents - achievedCents),
    reached: achievedCents >= targetCents,
  };
}
