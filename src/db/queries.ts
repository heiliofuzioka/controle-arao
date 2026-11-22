// Leituras usadas pelas telas (sempre dentro de useLiveQuery, para os totais mudarem na hora).
import type { HomeData } from '../domain/home';
import { unitCostByProduct } from '../domain/pricing';
import type { ControleAraoDB } from './db';
import { loadStockData } from './operations';

/** Tudo que o Início, a Semana e os totais do mês precisam. */
export async function loadHomeData(db: ControleAraoDB): Promise<HomeData & { points: Awaited<ReturnType<ControleAraoDB['salesPoints']['toArray']>> }> {
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
