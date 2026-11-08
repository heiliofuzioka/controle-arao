import { daysBetween, shiftDays, weekStartOf } from './dates';
import { alive } from './records';
import type { ID, LocalDate, Product, Recipe, Settlement, WeekClose } from './types';
import { isWeekClosed } from './weekClose';

export const BACKUP_MAX_DAYS = 7;
export const SETTLEMENT_MAX_DAYS = 14;

/** Backup com mais de 7 dias (ou nunca feito). */
export function isBackupOverdue(lastBackup: LocalDate | undefined, today: LocalDate): boolean {
  return lastBackup === undefined || daysBetween(lastBackup, today) > BACKUP_MAX_DAYS;
}

/** Acertos a receber há mais de 14 dias. */
export function overdueSettlements(settlements: Settlement[], today: LocalDate): Settlement[] {
  return alive(settlements).filter((s) => !s.paid && daysBetween(s.date, today) > SETTLEMENT_MAX_DAYS);
}

/** Produtos ativos sem nenhum sabor ativo (lucro estimado incompleto). */
export function productsWithoutRecipe(products: Product[], recipes: Recipe[]): Product[] {
  const withRecipe = new Set(alive(recipes).filter((r) => r.active).map((r) => r.productId));
  return alive(products).filter((p) => p.active && !withRecipe.has(p.id));
}

/** A semana anterior ficou sem fechamento? Devolve a segunda dela, ou null. */
export function previousWeekUnclosed(weekCloses: WeekClose[], today: LocalDate): LocalDate | null {
  const previous = shiftDays(weekStartOf(today), -7);
  return isWeekClosed(weekCloses, previous) ? null : previous;
}

export type Alert =
  | { kind: 'backup' }
  | { kind: 'settlement_overdue'; settlementIds: ID[] }
  | { kind: 'missing_recipe'; productIds: ID[] }
  | { kind: 'week_unclosed'; weekStart: LocalDate };

/** Alertas do topo, na ordem em que aparecem. */
export function alerts(args: {
  today: LocalDate;
  lastBackup?: LocalDate;
  settlements: Settlement[];
  products: Product[];
  recipes: Recipe[];
  weekCloses: WeekClose[];
}): Alert[] {
  const out: Alert[] = [];
  if (isBackupOverdue(args.lastBackup, args.today)) out.push({ kind: 'backup' });
  const overdue = overdueSettlements(args.settlements, args.today);
  if (overdue.length) out.push({ kind: 'settlement_overdue', settlementIds: overdue.map((s) => s.id) });
  const missing = productsWithoutRecipe(args.products, args.recipes);
  if (missing.length) out.push({ kind: 'missing_recipe', productIds: missing.map((p) => p.id) });
  const unclosed = previousWeekUnclosed(args.weekCloses, args.today);
  if (unclosed) out.push({ kind: 'week_unclosed', weekStart: unclosed });
  return out;
}
