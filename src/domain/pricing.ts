import { roundCents } from './money';
import { alive } from './records';
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

/** Custo de um sabor. `ingredientsById` deve incluir ingredientes apagados que ainda estejam numa receita. */
export function recipeCost(
  recipe: Recipe,
  items: RecipeItem[],
  ingredientsById: ReadonlyMap<ID, Ingredient>,
): RecipeCost {
  if (!(recipe.yield > 0)) throw new Error('O rendimento da receita precisa ser maior que 0.');
  let ingredientsCost = 0;
  for (const item of alive(items)) {
    if (item.recipeId !== recipe.id) continue;
    const ingredient = ingredientsById.get(item.ingredientId);
    if (!ingredient) throw new Error(`Ingrediente ${item.ingredientId} não encontrado.`);
    ingredientsCost += itemCost(ingredient, item.quantity);
  }
  const batchCost = ingredientsCost + recipe.laborPerBatchCents + recipe.otherCostsPerBatchCents;
  const unitCost = batchCost / recipe.yield + recipe.packagingPerUnitCents;
  return { ingredientsCost, batchCost, unitCost };
}

/** preço sugerido = custo por unidade / (1 − margem), arredondado para centavos. */
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

/** lucro por unidade = preço − custo (sem arredondar). */
export function unitProfit(priceCents: Cents, unitCost: number): number {
  return priceCents - unitCost;
}

const activeRecipes = (recipes: Recipe[]) => alive(recipes).filter((r) => r.active);

/**
 * Custo por unidade de um produto = média do custo por unidade dos sabores ativos.
 * null quando o produto não tem receita (as telas avisam "cadastre a receita").
 */
export function productUnitCost(
  productId: ID,
  recipes: Recipe[],
  items: RecipeItem[],
  ingredients: Ingredient[],
): number | null {
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const own = activeRecipes(recipes).filter((r) => r.productId === productId);
  if (own.length === 0) return null;
  const total = own.reduce((sum, r) => sum + recipeCost(r, items, ingredientsById).unitCost, 0);
  return total / own.length;
}

/** Custo por unidade de cada produto que tem receita. */
export function unitCostByProduct(
  products: Product[],
  recipes: Recipe[],
  items: RecipeItem[],
  ingredients: Ingredient[],
): Map<ID, number> {
  const out = new Map<ID, number>();
  for (const p of alive(products)) {
    const cost = productUnitCost(p.id, recipes, items, ingredients);
    if (cost !== null) out.set(p.id, cost);
  }
  return out;
}

export interface MarginAlert {
  productId: ID;
  recipeId: ID;
  recipeName: string;
  unitCost: number;
  priceCents: Cents;
  /** null quando o produto ainda não tem preço. */
  margin: number | null;
  targetMargin: number;
}

/**
 * Recalcula todos os sabores (ex.: depois de mudar o preço de um ingrediente) e devolve
 * os que ficaram abaixo da meta de margem no preço atual do produto.
 * Produto sem preço (0) também entra no aviso (confirmado em 08/11).
 */
export function recipesBelowTarget(
  products: Product[],
  recipes: Recipe[],
  items: RecipeItem[],
  ingredients: Ingredient[],
): MarginAlert[] {
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const productsById = new Map(alive(products).map((p) => [p.id, p]));
  const alerts: MarginAlert[] = [];
  for (const recipe of activeRecipes(recipes)) {
    const product = productsById.get(recipe.productId);
    if (!product) continue;
    const { unitCost } = recipeCost(recipe, items, ingredientsById);
    const margin = marginForPrice(product.priceCents, unitCost);
    if (margin === null || margin < recipe.targetMargin) {
      alerts.push({
        productId: product.id,
        recipeId: recipe.id,
        recipeName: recipe.name,
        unitCost,
        priceCents: product.priceCents,
        margin,
        targetMargin: recipe.targetMargin,
      });
    }
  }
  return alerts;
}
