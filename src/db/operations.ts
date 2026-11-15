// Gravações do app. Cada função roda numa única transação Dexie.
// Nunca apaga de verdade: exclusão marca deletedAt.
import { alive, byCreation, newBase, softDelete, touch } from '../domain/records';
import type { StockData } from '../domain/stock';
import type { Cents, Expense, ID, LocalDate, PersonalExpense } from '../domain/types';
import { checkWeekClose, findWeekClose, planWeekClose } from '../domain/weekClose';
import type { ControleAraoDB } from './db';

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

/** Tudo que os cálculos de estoque precisam. */
export async function loadStockData(db: ControleAraoDB): Promise<StockData> {
  const [weekCloses, sales, deliveries, settlements, adjustments] = await Promise.all([
    db.weekCloses.toArray(),
    db.sales.toArray(),
    db.deliveries.toArray(),
    db.settlements.toArray(),
    db.stockAdjustments.toArray(),
  ]);
  return { weekCloses, sales, deliveries, settlements, adjustments };
}

export interface WeekCloseCardInput {
  productId: ID;
  produced: number;
  loss: number;
  soldDirect: number;
  valueCents: Cents;
}

/** O fechamento não pôde ser salvo (ex.: vendeu mais do que tinha). */
export class WeekCloseBlockedError extends Error {
  constructor(
    public readonly productId: ID,
    message: string,
  ) {
    super(message);
    this.name = 'WeekCloseBlockedError';
  }
}

/**
 * Salva o fechamento da semana: um WeekClose por produto e a venda na mão no domingo.
 * Fechar de novo a mesma semana edita os mesmos registros.
 */
export async function saveWeekClose(
  db: ControleAraoDB,
  weekStart: LocalDate,
  cards: readonly WeekCloseCardInput[],
  now: string = nowIso(),
): Promise<void> {
  await db.transaction(
    'rw',
    [db.weekCloses, db.sales, db.deliveries, db.settlements, db.stockAdjustments, db.salesPoints],
    async () => {
      const data = await loadStockData(db);
      const directPoint = byCreation(alive(await db.salesPoints.toArray())).find((p) => p.mode === 'direct');
      if (!directPoint) throw new Error('Ponto de venda direta não encontrado.');

      for (const card of cards) {
        const existing = findWeekClose(data.weekCloses, weekStart, card.productId);
        const check = checkWeekClose(data, { weekStart, ...card }, existing?.id);
        if (!check.ok) throw new WeekCloseBlockedError(card.productId, check.error ?? 'Confira os números.');

        const existingSale = existing
          ? data.sales.find((s) => s.weekCloseId === existing.id && s.origin === 'week_close' && !s.deletedAt)
          : undefined;
        const plan = planWeekClose({
          input: { weekStart, ...card },
          directPointId: directPoint.id,
          existing: existing ? { weekClose: existing, sale: existingSale } : undefined,
          newId,
          now,
        });
        await db.weekCloses.put(plan.weekClose);
        if (plan.sale) await db.sales.put(plan.sale);
      }
    },
  );
}

export interface ExpenseInput {
  /** Presente quando é edição. */
  id?: ID;
  date: LocalDate;
  valueCents: Cents;
  categoryId: ID;
  description?: string;
}

const cleanText = (text?: string) => {
  const t = text?.trim();
  return t ? t : undefined;
};

export async function saveExpense(db: ControleAraoDB, input: ExpenseInput, now: string = nowIso()): Promise<ID> {
  const fields = {
    date: input.date,
    valueCents: input.valueCents,
    categoryId: input.categoryId,
    description: cleanText(input.description),
  };
  return db.transaction('rw', db.expenses, async () => {
    const current = input.id ? await db.expenses.get(input.id) : undefined;
    const record: Expense = current ? touch(current, fields, now) : { ...newBase(newId(), now), ...fields };
    await db.expenses.put(record);
    return record.id;
  });
}

export async function deleteExpense(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', db.expenses, async () => {
    const current = await db.expenses.get(id);
    if (current) await db.expenses.put(softDelete(current, now));
  });
}

export interface PersonalExpenseInput {
  id?: ID;
  date: LocalDate;
  valueCents: Cents;
  description?: string;
}

export async function savePersonalExpense(
  db: ControleAraoDB,
  input: PersonalExpenseInput,
  now: string = nowIso(),
): Promise<ID> {
  const fields = { date: input.date, valueCents: input.valueCents, description: cleanText(input.description) };
  return db.transaction('rw', db.personalExpenses, async () => {
    const current = input.id ? await db.personalExpenses.get(input.id) : undefined;
    const record: PersonalExpense = current ? touch(current, fields, now) : { ...newBase(newId(), now), ...fields };
    await db.personalExpenses.put(record);
    return record.id;
  });
}

export async function deletePersonalExpense(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', db.personalExpenses, async () => {
    const current = await db.personalExpenses.get(id);
    if (current) await db.personalExpenses.put(softDelete(current, now));
  });
}
