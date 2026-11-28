// Livro de receitas e ingredientes: textos, validação e listas. Os custos ficam em pricing.ts.
import { recipeCost, recipesBelowTarget, type MarginAlert } from './pricing';
import { alive, byCreation } from './records';
import type { Cents, ID, Ingredient, Product, Recipe, RecipeItem, Unit } from './types';
import { inputUnitsFor, toBaseQuantity, type InputUnit } from './units';

const decimal = (n: number, max = 3) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: max, useGrouping: false });

/** Quantidade na unidade mais fácil de ler: 1000 g → "1 kg", 400 g → "400 g", 30 un → "30 un". */
export function formatQuantity(quantity: number, unit: Unit): string {
  if (unit === 'g' && quantity >= 1000) return `${decimal(quantity / 1000)} kg`;
  if (unit === 'ml' && quantity >= 1000) return `${decimal(quantity / 1000)} L`;
  return `${decimal(quantity)} ${unit}`;
}

/** Unidade e número para mostrar num campo (1000 g → 1 kg). */
export function quantityForInput(quantity: number, unit: Unit): { value: number; unit: InputUnit } {
  const [small, big] = inputUnitsFor(unit);
  if (big && quantity >= 1000) return { value: quantity / 1000, unit: big };
  return { value: quantity, unit: small! };
}

/** "0,5", "1.5", "400" → número; vazio, zero ou inválido → null. */
export function parseQuantityInput(text: string): number | null {
  const clean = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(clean) && !/^\d*\.\d+$/.test(clean)) return null;
  const value = Number(clean);
  return value > 0 ? value : null;
}

/** Número para o campo de quantidade ("0,5"). */
export function formatQuantityInput(value: number): string {
  return decimal(value);
}

/** Preço de 1 g, 1 ml ou 1 un, em centavos (sem arredondar). */
export function pricePerBaseUnit(ingredient: Pick<Ingredient, 'pricePaidCents' | 'packageQty'>): number {
  return ingredient.packageQty > 0 ? ingredient.pricePaidCents / ingredient.packageQty : 0;
}

export interface IngredientInput {
  name: string;
  pricePaidCents: Cents | null;
  /** Tamanho da embalagem na unidade da tela. */
  packageQty: number | null;
  unit: InputUnit;
}

export type IngredientErrors = Partial<Record<'name' | 'pricePaidCents' | 'packageQty', string>>;

export function ingredientErrors(input: IngredientInput, ingredients: Ingredient[], editingId?: ID): IngredientErrors {
  const errors: IngredientErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Coloque o nome do ingrediente';
  else if (
    alive(ingredients).some(
      (i) => i.id !== editingId && i.name.trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
    )
  ) {
    errors.name = 'Já existe um ingrediente com esse nome';
  }
  if (!(input.pricePaidCents !== null && input.pricePaidCents > 0)) errors.pricePaidCents = 'Coloque quanto pagou';
  if (!(input.packageQty !== null && input.packageQty > 0)) errors.packageQty = 'Coloque o tamanho da embalagem';
  return errors;
}

/** Ingrediente na unidade base (kg → g, L → ml), pronto para gravar. */
export function ingredientFields(input: IngredientInput): Pick<Ingredient, 'name' | 'pricePaidCents' | 'packageQty' | 'unit'> {
  const { quantity, unit } = toBaseQuantity(input.packageQty ?? 0, input.unit);
  return { name: input.name.trim(), pricePaidCents: input.pricePaidCents ?? 0, packageQty: quantity, unit };
}

/** Em quantas receitas (não apagadas) o ingrediente está. */
export function recipesUsingIngredient(ingredientId: ID, recipes: Recipe[], items: RecipeItem[]): Recipe[] {
  const ids = new Set(alive(items).filter((i) => i.ingredientId === ingredientId).map((i) => i.recipeId));
  return alive(recipes).filter((r) => ids.has(r.id));
}

/** Título do sabor: "Brownie tradicional", "Gelinho Nutella". Se o sabor já tem o nome do produto, fica só o sabor. */
export function recipeTitle(product: Pick<Product, 'name'> | undefined, recipe: Pick<Recipe, 'name'>): string {
  if (!product) return recipe.name;
  const flavor = recipe.name.trim();
  const productName = product.name.trim();
  const lower = (t: string) => t.toLocaleLowerCase('pt-BR');
  if (lower(flavor).startsWith(lower(productName))) return flavor;
  // Sabor único com o mesmo nome do produto ("Recheado" do Brownie recheado): fica o nome do produto.
  if (lower(productName).endsWith(lower(flavor))) return productName;
  // "Tradicional" → "Brownie tradicional"; nomes próprios com mais de uma maiúscula ("Leite Ninho") ficam como estão.
  const words = flavor.split(/\s+/);
  const single = words.length === 1 && /^\p{Lu}\p{Ll}+$/u.test(flavor) && !PROPER.has(flavor);
  return `${productName} ${single ? lower(flavor) : flavor}`;
}

/** Sabores com nome de marca que não viram minúscula. */
const PROPER = new Set(['Nutella', 'Ninho', 'Oreo', 'Kinder', 'Ovomaltine', 'Prestígio', 'Sensação', 'Kitkat', 'KitKat']);

export interface RecipeLine {
  item: RecipeItem;
  ingredient: Ingredient;
  /** Centavos sem arredondar. */
  cost: number;
}

/** Ingredientes do lote, com o custo de cada um, na ordem em que foram colocados. */
export function recipeLines(recipeId: ID, items: RecipeItem[], ingredientsById: ReadonlyMap<ID, Ingredient>): RecipeLine[] {
  return byCreation(alive(items).filter((i) => i.recipeId === recipeId)).flatMap((item) => {
    const ingredient = ingredientsById.get(item.ingredientId);
    if (!ingredient) return [];
    return [{ item, ingredient, cost: pricePerBaseUnit(ingredient) * item.quantity }];
  });
}

export interface RecipeBookEntry {
  recipe: Recipe;
  title: string;
  unitCost: number;
  hasIngredients: boolean;
}

export interface RecipeBookGroup {
  product: Product;
  recipes: RecipeBookEntry[];
}

/** Livro de receitas: um grupo por produto (na ordem dos produtos), sabores na ordem de criação. */
export function recipeBook(
  products: Product[],
  recipes: Recipe[],
  items: RecipeItem[],
  ingredients: Ingredient[],
): RecipeBookGroup[] {
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));
  const live = byCreation(alive(recipes));
  return products
    .map((product) => ({
      product,
      recipes: live
        .filter((r) => r.productId === product.id)
        .map((recipe) => ({
          recipe,
          title: recipeTitle(product, recipe),
          unitCost: recipeCost(recipe, items, ingredientsById).unitCost,
          hasIngredients: alive(items).some((i) => i.recipeId === recipe.id),
        })),
    }))
    .filter((g) => g.recipes.length > 0);
}

export interface RecipeItemDraft {
  /** Item já gravado (edição). */
  id?: ID;
  ingredientId: ID;
  /** Na unidade base do ingrediente. null = campo vazio ou inválido. */
  quantity: number | null;
}

export interface RecipeDraft {
  name: string;
  productId: ID | null;
  yield: number;
  items: RecipeItemDraft[];
  /** 0–1. null = campo vazio ou inválido. */
  targetMargin: number | null;
}

export type RecipeErrors = Partial<Record<'name' | 'productId' | 'yield' | 'items' | 'targetMargin', string>>;

export function recipeErrors(draft: RecipeDraft, recipes: Recipe[], editingId?: ID): RecipeErrors {
  const errors: RecipeErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Coloque o nome do sabor';
  if (!draft.productId) errors.productId = 'Escolha o produto';
  else if (
    name &&
    alive(recipes).some(
      (r) =>
        r.id !== editingId &&
        r.productId === draft.productId &&
        r.name.trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
    )
  ) {
    errors.name = 'Esse produto já tem um sabor com esse nome';
  }
  if (!(draft.yield > 0)) errors.yield = 'Quantas unidades o lote rende?';
  if (draft.items.some((i) => i.quantity === null)) errors.items = 'Coloque a quantidade de cada ingrediente';
  if (draft.targetMargin === null || draft.targetMargin < 0 || draft.targetMargin >= 1) {
    errors.targetMargin = 'A margem vai de 0% a 99%';
  }
  return errors;
}

/** Margem digitada ("60", "62,5") → 0,6. Vazio ou inválido → null. */
export function parsePercentInput(text: string): number | null {
  const clean = text.trim().replace('%', '').replace(',', '.');
  if (clean === '' || !/^\d+(\.\d+)?$/.test(clean)) return null;
  const value = Number(clean) / 100;
  return value >= 0 && value < 1 ? value : null;
}

/** 0,6 → "60"; 0,625 → "62,5" (campo de margem). */
export function formatPercentInput(ratio: number): string {
  return decimal(Math.round(ratio * 1000) / 10, 1);
}

/** Sabores abaixo da meta com o título de cada um e o preço que volta a dar a meta. */
export function belowTargetList(
  products: Product[],
  recipes: Recipe[],
  items: RecipeItem[],
  ingredients: Ingredient[],
): (MarginAlert & { title: string; product: Product })[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return recipesBelowTarget(products, recipes, items, ingredients).map((alert) => {
    const product = byId.get(alert.productId)!;
    return { ...alert, product, title: recipeTitle(product, { name: alert.recipeName }) };
  });
}

/**
 * Preço de referência do ingrediente: por kg, por L ou por unidade.
 * (Por grama quase tudo daria "R$ 0,00/g"; por kg dá para comparar com o mercado.)
 */
export function referencePrice(ingredient: Pick<Ingredient, 'pricePaidCents' | 'packageQty' | 'unit'>): { cents: number; unit: 'kg' | 'L' | 'un' } {
  const perBase = pricePerBaseUnit(ingredient);
  if (ingredient.unit === 'g') return { cents: perBase * 1000, unit: 'kg' };
  if (ingredient.unit === 'ml') return { cents: perBase * 1000, unit: 'L' };
  return { cents: perBase, unit: 'un' };
}
