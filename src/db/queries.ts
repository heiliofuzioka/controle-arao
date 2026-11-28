// Leituras usadas pelas telas (sempre dentro de useLiveQuery, para os totais mudarem na hora).
import { backupReminder } from '../domain/alerts';
import { toLocalDate } from '../domain/dates';
import type { HomeData } from '../domain/home';
import { unitCostByProduct } from '../domain/pricing';
import { alive } from '../domain/records';
import type { LocalDate, SalesPoint } from '../domain/types';
import { loadLastBackup } from './backup';
import type { ControleAraoDB } from './db';
import { loadStockData } from './operations';

/** Tudo que o Início, a Semana e os totais do mês precisam. */
export async function loadHomeData(db: ControleAraoDB): Promise<HomeData & { points: SalesPoint[] }> {
  const [stock, expenses, personalExpenses, expenseCategories, goals, products, recipes, recipeItems, ingredients, points] =
    await Promise.all([
      loadStockData(db),
      db.expenses.toArray(),
      db.personalExpenses.toArray(),
      db.expenseCategories.toArray(),
      db.monthlyGoals.toArray(),
      db.products.toArray(),
      db.recipes.toArray(),
      db.recipeItems.toArray(),
      db.ingredients.toArray(),
      db.salesPoints.toArray(),
    ]);
  return {
    ...stock,
    expenses,
    personalExpenses,
    expenseCategories,
    goals,
    unitCosts: unitCostByProduct(products, recipes, recipeItems, ingredients),
    points,
  };
}

/** Último backup e se é hora de avisar (Início, Painel e Ajustes). */
export async function loadBackupStatus(db: ControleAraoDB, today: LocalDate) {
  const [last, ...tables] = await Promise.all([
    loadLastBackup(db),
    db.weekCloses.toArray(),
    db.expenses.toArray(),
    db.personalExpenses.toArray(),
    db.deliveries.toArray(),
    db.recipes.toArray(),
  ]);
  const hasData = tables.some((rows) => alive(rows as { deletedAt?: string }[]).length > 0);
  const lastDay = last ? toLocalDate(new Date(last.at)) : undefined;
  return { last, reminder: backupReminder(lastDay, today, hasData) };
}
