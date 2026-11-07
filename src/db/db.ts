import Dexie, { type EntityTable } from 'dexie';
import type {
  Delivery,
  Expense,
  ExpenseCategory,
  Ingredient,
  PersonalExpense,
  Product,
  Production,
  Recipe,
  RecipeItem,
  Sale,
  SalesPoint,
  Settlement,
  StockAdjustment,
} from '../domain/types';
import { seed } from './seed';

/** Valores soltos do app (ex.: data do último backup). */
export interface MetaEntry {
  key: string;
  value: unknown;
}

export const DB_NAME = 'controle-arao';

/** Versão do schema gravada no backup. Acompanha a última db.version(n). */
export const SCHEMA_VERSION = 1;

export class ControleAraoDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  salesPoints!: EntityTable<SalesPoint, 'id'>;
  productions!: EntityTable<Production, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  deliveries!: EntityTable<Delivery, 'id'>;
  settlements!: EntityTable<Settlement, 'id'>;
  stockAdjustments!: EntityTable<StockAdjustment, 'id'>;
  expenseCategories!: EntityTable<ExpenseCategory, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  personalExpenses!: EntityTable<PersonalExpense, 'id'>;
  ingredients!: EntityTable<Ingredient, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  recipeItems!: EntityTable<RecipeItem, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name: string = DB_NAME) {
    super(name);

    // Toda mudança de schema cria uma nova db.version(n) com migração.
    // Nunca editar uma versão antiga.
    // Booleanos (active, paid) não são indexáveis no IndexedDB: filtrar em memória.
    this.version(1).stores({
      products: 'id, name',
      salesPoints: 'id, name',
      productions: 'id, date, productId',
      sales: 'id, date, pointId, productId, origin, settlementId',
      deliveries: 'id, date, pointId, productId',
      settlements: 'id, date, pointId, productId',
      stockAdjustments: 'id, date, productId, location',
      expenseCategories: 'id, name',
      expenses: 'id, date, categoryId',
      personalExpenses: 'id, date',
      ingredients: 'id, name',
      recipes: 'id, productId',
      recipeItems: 'id, recipeId, ingredientId',
      meta: 'key',
    });

    this.on('populate', (tx) => seed(tx));
  }
}

export const db = new ControleAraoDB();
