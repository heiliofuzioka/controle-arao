import type { Transaction } from 'dexie';
import { newBase } from '../domain/records';
import type { Category, ExpenseCategory, Product, SalesPoint } from '../domain/types';

type Fields<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** Categorias com o produto inicial de cada uma. Preços começam em 0: o Arão define em Ajustes. */
export const SEED_CATALOG: { category: Fields<Category>; product: Omit<Fields<Product>, 'categoryId'> }[] = [
  {
    category: { name: 'Geladinhos gourmet', order: 1 },
    product: { name: 'Gelinho', code: 'G', priceCents: 0, active: true },
  },
  {
    category: { name: 'Brownies tradicionais', order: 2 },
    product: { name: 'Brownie', code: 'B', priceCents: 0, active: true },
  },
  {
    category: { name: 'Brownies recheados', order: 3 },
    product: { name: 'Brownie recheado', code: 'R', priceCents: 0, active: true },
  },
  {
    category: { name: 'Tortas', order: 4 },
    product: { name: 'Torta', code: 't', priceCents: 0, active: true },
  },
];

export const SEED_SALES_POINTS: Fields<SalesPoint>[] = [
  { name: 'Venda direta', mode: 'direct', active: true },
  { name: 'Açougue', mode: 'consignment', active: true },
];

const PRODUCT_COST = new Set(['Ingredientes', 'Embalagens']);
export const SEED_EXPENSE_CATEGORIES: Fields<ExpenseCategory>[] = [
  'Ingredientes',
  'Embalagens',
  'Funcionários',
  'Energia elétrica',
  'Água',
  'Gás',
  'Transporte',
  'Equipamentos',
  'Manutenção',
  'Marketing',
  'Taxas',
  'Outras despesas',
].map((name) => ({ name, isProductCost: PRODUCT_COST.has(name) }));

/** Roda só na criação do banco (evento `populate` do Dexie). */
export async function seed(tx: Transaction): Promise<void> {
  const now = new Date().toISOString();
  const base = () => newBase(crypto.randomUUID(), now);

  const categories: Category[] = [];
  const products: Product[] = [];
  for (const { category, product } of SEED_CATALOG) {
    const c = { ...base(), ...category };
    categories.push(c);
    products.push({ ...base(), categoryId: c.id, ...product });
  }

  await tx.table('categories').bulkAdd(categories);
  await tx.table('products').bulkAdd(products);
  await tx.table('salesPoints').bulkAdd(SEED_SALES_POINTS.map((p) => ({ ...base(), ...p })));
  await tx.table('expenseCategories').bulkAdd(SEED_EXPENSE_CATEGORIES.map((c) => ({ ...base(), ...c })));
}
