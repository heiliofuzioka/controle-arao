import { db } from '../../db/db';
import { loadProductsInOrder } from '../../db/operations';
import { alive, byCreation } from '../../domain/records';
import type { Ingredient } from '../../domain/types';

/** Tudo que as telas de Receitas leem (sempre dentro de useLiveQuery). */
export async function loadRecipeData() {
  const [products, recipes, items, ingredients] = await Promise.all([
    loadProductsInOrder(db),
    db.recipes.toArray(),
    db.recipeItems.toArray(),
    db.ingredients.toArray(),
  ]);
  return {
    products,
    recipes,
    items,
    /** Inclui os apagados (uma receita antiga pode ainda apontar para um). */
    ingredients,
    ingredientsById: new Map(ingredients.map((i) => [i.id, i])),
  };
}

/** Ingredientes não apagados, na ordem em que foram cadastrados. */
export function sortedIngredients(ingredients: Ingredient[]): Ingredient[] {
  return byCreation(alive(ingredients));
}
