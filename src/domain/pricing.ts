import { roundCents } from './money';
import type { Cents, ID, Ingredient, Product, Recipe, RecipeItem } from './types';

// Todos os custos aqui são em centavos SEM arredondar.
// Arredonda só na exibição e no preço final (priceForMargin).

/** custo do item = preço pago / tamanho da embalagem × quantidade usada */
export function itemCost(ingredient: Ingredient, quantity: number): number {
  if (!(ingredient.packageQty > 0)) {
    throw new Error(`Ingrediente "${ingredient.name}" sem tamanho de embalagem.`);
  }
  return (ingredient.pricePaidCents / ingredient.packageQty) * quantity;
}

export interface RecipeCost {
  ingredientsCost: number;
  /** Σ itens + mão de obra + outros custos do lote. */
  batchCost: number;
  /** custo do lote / rendimento + embalagem por unidade. */
  unitCost: number;
}

export function recipeCost(
  recipe: Recipe,
  items: RecipeItem[],
  ingredientsById: ReadonlyMap<ID, Ingredient>,
): RecipeCost {
  if (!(recipe.yield > 0)) throw new Error('O rendimento da receita precisa ser maior que 0.');
  let ingredientsCost = 0;
  for (const item of items) {
    if (item.recipeId !== recipe.id) continue;
    const ingredient = ingredientsById.get(item.ingredientId);
    if (!ingredient) throw new Error(`Ingrediente ${item.ingredientId} não encontrado.`);
    ingredientsCost += itemCost(ingredient, item.quantity);
  }
  const batchCost = ingredientsCost + recipe.laborPerBatchCents + recipe.otherCostsPerBatchCents;
  const unitCost = batchCost / recipe.yield + recipe.packagingPerUnitCents;
  return { ingredientsCost, batchCost, unitCost };
}

/** preço = custo por unidade / (1 − margem), arredondado para centavos. */
export function priceForMargin(unitCost: number, margin: number): Cents {
  if (!(margin >= 0 && margin < 1)) throw new Error('A margem precisa estar entre 0% e 99%.');
  return roundCents(unitCost / (1 - margin));
}

/** margem = (preço − custo) / preço. null se o preço for 0. */
export function marginForPrice(priceCents: Cents, unitCost: number): number | null {
  if (priceCents <= 0) return null;
  return (priceCents - unitCost) / priceCents;
}

/** markup = (preço − custo) / custo. null se o custo for 0. */
export function markupForPrice(priceCents: Cents, unitCost: number): number | null {
  if (unitCost <= 0) return null;
  return (priceCents - unitCost) / unitCost;
}

export interface MarginAlert {
  productId: ID;
  recipeId: ID;
  unitCost: number;
  priceCents: Cents;
  /** null quando o produto ainda não tem preço. */
  margin: number | null;
  targetMargin: number;
}

/**
 * Recalcula todas as receitas (ex.: depois de mudar o preço de um ingrediente)
 * e devolve os produtos cuja margem no preço atual ficou abaixo da meta.
 * Produto sem preço (0) também entra no aviso.
 */
export function productsBelowTarget(
  products: Product[],
  recipes: Recipe[],
  items: RecipeItem[],
  ingredients: Ingredient[],
): MarginAlert[] {
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const productsById = new Map(products.map((p) => [p.id, p]));
  const alerts: MarginAlert[] = [];
  for (const recipe of recipes) {
    const product = productsById.get(recipe.productId);
    if (!product) continue;
    const { unitCost } = recipeCost(recipe, items, ingredientsById);
    const margin = marginForPrice(product.priceCents, unitCost);
    if (margin === null || margin < recipe.targetMargin) {
      alerts.push({
        productId: product.id,
        recipeId: recipe.id,
        unitCost,
        priceCents: product.priceCents,
        margin,
        targetMargin: recipe.targetMargin,
      });
    }
  }
  return alerts;
}
