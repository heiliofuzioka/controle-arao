// Categorias e produtos (Ajustes): validação, agrupamento e quando dá para apagar.
import { alive, byCreation } from './records';
import type { Category, ID, Product, Recipe } from './types';
import type { StockData } from './stock';

export interface ProductInput {
  name: string;
  code: string;
  categoryId: ID | null;
}

export type ProductErrors = Partial<Record<'name' | 'code' | 'categoryId', string>>;

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');

/** Erros do formulário de produto. A sigla diferencia maiúscula de minúscula ("t" da Torta). */
export function productErrors(input: ProductInput, products: Product[], editingId?: ID): ProductErrors {
  const errors: ProductErrors = {};
  const others = alive(products).filter((p) => p.id !== editingId);
  const name = input.name.trim();
  const code = input.code.trim();
  if (!name) errors.name = 'Coloque o nome do produto';
  else {
    const twin = others.find((p) => same(p.name, name));
    if (twin) errors.name = `Já existe um produto com esse nome`;
  }
  if (!input.categoryId) errors.categoryId = 'Escolha a categoria';
  if (!code) errors.code = 'Coloque a sigla (1 ou 2 letras)';
  else if ([...code].length > 2) errors.code = 'A sigla tem no máximo 2 letras';
  else {
    const twin = others.find((p) => p.code.trim() === code);
    if (twin) errors.code = `A sigla ${code} já é do ${twin.name}`;
  }
  return errors;
}

/** Erro do nome de uma categoria (vazio ou repetido). */
export function categoryNameError(name: string, categories: Category[], editingId?: ID): string | null {
  if (!name.trim()) return 'Coloque o nome da categoria';
  if (alive(categories).some((c) => c.id !== editingId && same(c.name, name))) return 'Já existe uma categoria com esse nome';
  return null;
}

/** Categoria nova entra no fim da lista. */
export function nextCategoryOrder(categories: Category[]): number {
  return alive(categories).reduce((max, c) => Math.max(max, c.order), 0) + 1;
}

export interface CatalogGroup {
  category: Category;
  /** Produtos da categoria (ativos e parados), na ordem de criação. */
  products: Product[];
}

/** Categorias na ordem, cada uma com os seus produtos. */
export function catalogGroups(categories: Category[], products: Product[]): CatalogGroup[] {
  const live = alive(products);
  return byCreation(alive(categories))
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ category, products: byCreation(live.filter((p) => p.categoryId === category.id)) }));
}

/** Quantos sabores (receitas ativas) cada produto tem. */
export function flavorCount(recipes: Recipe[], productId: ID): number {
  return alive(recipes).filter((r) => r.active && r.productId === productId).length;
}

/**
 * O produto já foi usado (fechamento, venda, entrega, acerto, contagem ou receita)?
 * Usado não se apaga: o Arão desliga "Ainda vendo" e ele some do fechamento, mas fica no histórico.
 */
export function productInUse(productId: ID, data: StockData & { recipes: Recipe[] }): boolean {
  const uses = (rows: { productId: ID; deletedAt?: string }[]) => alive(rows).some((r) => r.productId === productId);
  return (
    uses(data.weekCloses) ||
    uses(data.sales) ||
    uses(data.deliveries) ||
    uses(data.settlements) ||
    uses(data.adjustments) ||
    uses(data.recipes)
  );
}
