import type { Base } from './types';

/** Só os registros não apagados (a UI e os cálculos ignoram os que têm deletedAt). */
export function alive<T extends Pick<Base, 'deletedAt'>>(rows: readonly T[]): T[] {
  return rows.filter((r) => r.deletedAt === undefined);
}

/** Campos de um registro novo. `now` em ISO. */
export function newBase(id: string, now: string): Base {
  return { id, createdAt: now, updatedAt: now };
}

/** Aplica mudanças e atualiza updatedAt. */
export function touch<T extends Base>(record: T, changes: Partial<Omit<T, keyof Base>>, now: string): T {
  return { ...record, ...changes, updatedAt: now };
}

/** Exclusão marcada: nunca apagar de verdade. */
export function softDelete<T extends Base>(record: T, now: string): T {
  return { ...record, deletedAt: now, updatedAt: now };
}
