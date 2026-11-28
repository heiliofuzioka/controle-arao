import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backupFileName,
  backupSummary,
  BackupError,
  exportBackup,
  loadLastBackup,
  markBackupDone,
  parseBackup,
  restoreBackup,
} from './backup';
import { ControleAraoDB } from './db';
import { saveExpense } from './operations';

let db: ControleAraoDB;
let other: ControleAraoDB;

beforeEach(async () => {
  db = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  other = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await Promise.all([db.open(), other.open()]);
});

afterEach(async () => {
  await Promise.all([db.delete(), other.delete()]);
});

describe('backup', () => {
  it('nome do arquivo com dia e mês', () => {
    expect(backupFileName(new Date(2026, 10, 7, 15, 10))).toBe('controle-arao-07-11.json');
    expect(backupFileName(new Date(2026, 0, 31), 'csv')).toBe('controle-arao-31-01.csv');
  });

  it('exporta, lê e restaura em outro aparelho (substitui tudo)', async () => {
    const category = (await db.expenseCategories.toArray())[0]!.id;
    await saveExpense(db, { date: '2026-11-20', valueCents: 4200, categoryId: category, description: 'Mercado' });
    const backup = await exportBackup(db, new Date('2026-11-28T15:10:00Z'));
    expect(backup).toMatchObject({ app: 'controle-arao', schemaVersion: 1, exportedAt: '2026-11-28T15:10:00.000Z' });

    const parsed = parseBackup(JSON.stringify(backup));
    expect(backupSummary(parsed)).toEqual({ weeks: 0, expenses: 1, recipes: 0 });

    // O outro banco tem o seed dele (ids diferentes): depois de restaurar, fica igual ao primeiro.
    await restoreBackup(other, parsed);
    expect(await other.expenses.toArray()).toEqual(await db.expenses.toArray());
    expect((await other.products.toArray()).map((p) => p.id).sort()).toEqual(
      (await db.products.toArray()).map((p) => p.id).sort(),
    );
    expect(await loadLastBackup(other)).toEqual({ at: '2026-11-28T15:10:00.000Z', fileName: null });
  });

  it('recusa arquivo que não é backup, com defeito ou de versão mais nova', async () => {
    const good = await exportBackup(db);
    expect(() => parseBackup('oi')).toThrow('Esse arquivo não é um backup do Controle Arão.');
    expect(() => parseBackup(JSON.stringify({ app: 'outro', tables: {} }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ ...good, schemaVersion: 99 }))).toThrow('versão mais nova');
    const broken = { ...good, tables: { ...good.tables, sales: [{ semId: true }] } };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('Esse backup está com defeito.');
    const missing = { ...good, tables: { ...good.tables, recipes: undefined } };
    expect(() => parseBackup(JSON.stringify(missing))).toThrow('Esse backup está com defeito.');
  });

  it('guarda a data e o nome do último backup', async () => {
    expect(await loadLastBackup(db)).toBeUndefined();
    await markBackupDone(db, new Date('2026-11-07T18:10:00Z'), 'controle-arao-07-11.json');
    expect(await loadLastBackup(db)).toEqual({ at: '2026-11-07T18:10:00.000Z', fileName: 'controle-arao-07-11.json' });
  });
});
