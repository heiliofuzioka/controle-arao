import type { Transaction } from 'dexie';
import type { ExpenseCategory, Product, SalesPoint } from '../domain/types';

const newId = () => crypto.randomUUID();

// Preços ainda não confirmados: começam em 0 e o Arão define em Ajustes.
export const SEED_PRODUCTS: Omit<Product, 'id'>[] = [
  { name: 'Gelinho', kind: 'ice_pop', code: 'G', priceCents: 0, active: true },
  { name: 'Brownie', kind: 'baked', code: 'B', priceCents: 0, active: true },
  { name: 'Brownie recheado', kind: 'baked', code: 'R', priceCents: 0, active: true },
  { name: 'Torta', kind: 'baked', code: 't', priceCents: 0, active: true },
];

export const SEED_SALES_POINTS: Omit<SalesPoint, 'id'>[] = [
  { name: 'Escola Piratininga', mode: 'direct', active: true },
  { name: 'Açougue', mode: 'consignment', active: true },
];

export const SEED_EXPENSE_CATEGORIES: Omit<ExpenseCategory, 'id'>[] = [
  { name: 'Ingredientes' },
  { name: 'Mão de obra' },
  { name: 'Embalagem' },
  { name: 'Gás' },
  { name: 'Investimento' },
];

/** Roda só na criação do banco (evento `populate` do Dexie). */
export async function seed(tx: Transaction): Promise<void> {
  await tx.table('products').bulkAdd(SEED_PRODUCTS.map((p) => ({ id: newId(), ...p })));
  await tx.table('salesPoints').bulkAdd(SEED_SALES_POINTS.map((p) => ({ id: newId(), ...p })));
  await tx
    .table('expenseCategories')
    .bulkAdd(SEED_EXPENSE_CATEGORIES.map((c) => ({ id: newId(), ...c })));
}
