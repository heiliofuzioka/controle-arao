// Backup e restauração (Ajustes). O arquivo é o único jeito de levar os dados para outro lugar na v1.
import type { ControleAraoDB } from './db';
import { SCHEMA_VERSION } from './db';

/** Tabelas que vão no backup (todas menos `meta`, que guarda coisas do aparelho, como a data do último backup). */
export const BACKUP_TABLES = [
  'categories',
  'products',
  'salesPoints',
  'weekCloses',
  'sales',
  'deliveries',
  'settlements',
  'stockAdjustments',
  'expenseCategories',
  'expenses',
  'personalExpenses',
  'monthlyGoals',
  'ingredients',
  'recipes',
  'recipeItems',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  app: 'controle-arao';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTable, unknown[]>;
}

/** O arquivo escolhido não dá para restaurar. A mensagem vai para a tela. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "controle-arao-07-11.json" (dia e mês de hoje). */
export function backupFileName(date: Date, extension: 'json' | 'csv' = 'json'): string {
  return `controle-arao-${pad(date.getDate())}-${pad(date.getMonth() + 1)}.${extension}`;
}

/** Tudo do banco, inclusive o que foi apagado (deletedAt), para a v2 poder sincronizar. */
export async function exportBackup(db: ControleAraoDB, now: Date = new Date()): Promise<BackupFile> {
  const tables = {} as Record<BackupTable, unknown[]>;
  await db.transaction('r', BACKUP_TABLES.map((t) => db.table(t)), async () => {
    for (const name of BACKUP_TABLES) tables[name] = await db.table(name).toArray();
  });
  return { app: 'controle-arao', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), tables };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Lê e confere o arquivo de backup. Lança BackupError com uma frase para o Arão. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Esse arquivo não é um backup do Controle Arão.');
  }
  if (!isRecord(data) || data.app !== 'controle-arao' || !isRecord(data.tables)) {
    throw new BackupError('Esse arquivo não é um backup do Controle Arão.');
  }
  if (typeof data.schemaVersion !== 'number' || !Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) {
    throw new BackupError('Esse backup está com defeito.');
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('Esse backup é de uma versão mais nova do app. Abra o app com internet para atualizar e tente de novo.');
  }
  if (typeof data.exportedAt !== 'string' || Number.isNaN(Date.parse(data.exportedAt))) {
    throw new BackupError('Esse backup está com defeito.');
  }
  const tables = data.tables;
  for (const name of BACKUP_TABLES) {
    const rows = tables[name];
    if (!Array.isArray(rows) || !rows.every((r) => isRecord(r) && typeof r.id === 'string' && r.id.length > 0)) {
      throw new BackupError('Esse backup está com defeito.');
    }
  }
  return data as unknown as BackupFile;
}

/** Quanto tem no backup (para a tela de confirmação). */
export function backupSummary(backup: BackupFile): { weeks: number; expenses: number; recipes: number } {
  const live = (rows: unknown[]) => rows.filter((r): r is Record<string, unknown> => isRecord(r) && r.deletedAt === undefined);
  const count = (rows: unknown[]) => live(rows).length;
  return {
    weeks: new Set(live(backup.tables.weekCloses).map((w) => w.weekStart)).size,
    expenses: count(backup.tables.expenses),
    recipes: count(backup.tables.recipes),
  };
}

/**
 * Substitui tudo que está no app pelo backup (só depois da confirmação "Substituir tudo").
 * Única operação que apaga de verdade: o conteúdo inteiro é trocado pelo do arquivo.
 */
export async function restoreBackup(db: ControleAraoDB, backup: BackupFile): Promise<void> {
  // Versões antigas do backup passarão por migração aqui quando existir db.version(2).
  await db.transaction('rw', [...BACKUP_TABLES.map((t) => db.table(t)), db.meta], async () => {
    for (const name of BACKUP_TABLES) {
      const table = db.table(name);
      await table.clear();
      await table.bulkAdd(backup.tables[name]);
    }
    // Os dados agora são os do backup: ele conta como o último backup feito.
    await db.meta.put({ key: LAST_BACKUP_KEY, value: { at: backup.exportedAt, fileName: null } });
  });
}

export const LAST_BACKUP_KEY = 'lastBackup';

export interface LastBackup {
  /** Data e hora em ISO. */
  at: string;
  fileName: string | null;
}

export async function loadLastBackup(db: ControleAraoDB): Promise<LastBackup | undefined> {
  const entry = await db.meta.get(LAST_BACKUP_KEY);
  const value = entry?.value;
  if (!isRecord(value) || typeof value.at !== 'string') return undefined;
  return { at: value.at, fileName: typeof value.fileName === 'string' ? value.fileName : null };
}

export async function markBackupDone(db: ControleAraoDB, at: Date, fileName: string): Promise<void> {
  await db.meta.put({ key: LAST_BACKUP_KEY, value: { at: at.toISOString(), fileName } });
}
