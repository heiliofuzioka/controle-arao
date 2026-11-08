// Construtores de dados para os testes do domínio. Não usar no app.
import type { StockData } from './stock';
import type {
  Delivery,
  Expense,
  ExpenseCategory,
  Ingredient,
  PersonalExpense,
  Product,
  Recipe,
  RecipeItem,
  Sale,
  SalesPoint,
  Settlement,
  StockAdjustment,
  WeekClose,
} from './types';

let seq = 0;
const base = () => ({ id: `id-${++seq}`, createdAt: 'c', updatedAt: 'c' });

export const P = 'gelinho';
export const OTHER = 'brownie';
export const DIRECT = 'venda-direta';
export const BUTCHER = 'acougue';

export const points: SalesPoint[] = [
  { ...base(), id: DIRECT, name: 'Venda direta', mode: 'direct', active: true },
  { ...base(), id: BUTCHER, name: 'Açougue', mode: 'consignment', active: true },
];

export const product = (o: Partial<Product> = {}): Product => ({
  ...base(),
  id: P,
  categoryId: 'cat',
  name: 'Gelinho',
  code: 'G',
  priceCents: 0,
  active: true,
  ...o,
});

export const weekClose = (o: Partial<WeekClose> = {}): WeekClose => ({
  ...base(),
  weekStart: '2026-11-02',
  productId: P,
  produced: 0,
  loss: 0,
  soldDirect: 0,
  valueCents: 0,
  ...o,
});

export const sale = (o: Partial<Sale> = {}): Sale => ({
  ...base(),
  date: '2026-11-08',
  pointId: DIRECT,
  productId: P,
  quantity: 0,
  valueCents: 0,
  origin: 'week_close',
  ...o,
});

export const delivery = (o: Partial<Delivery> = {}): Delivery => ({
  ...base(),
  date: '2026-11-04',
  pointId: BUTCHER,
  productId: P,
  quantity: 0,
  ...o,
});

export const settlement = (o: Partial<Settlement> = {}): Settlement => ({
  ...base(),
  date: '2026-11-06',
  pointId: BUTCHER,
  productId: P,
  remaining: 0,
  loss: 0,
  soldQuantity: 0,
  valueCents: 0,
  paid: false,
  ...o,
});

export const adjustment = (o: Partial<StockAdjustment> = {}): StockAdjustment => ({
  ...base(),
  date: '2026-11-01',
  productId: P,
  location: 'home',
  delta: 0,
  reason: 'correction',
  ...o,
});

export const expenseCategory = (o: Partial<ExpenseCategory> = {}): ExpenseCategory => ({
  ...base(),
  name: 'Gás',
  isProductCost: false,
  ...o,
});

export const expense = (o: Partial<Expense> = {}): Expense => ({
  ...base(),
  date: '2026-11-03',
  valueCents: 0,
  categoryId: 'gas',
  ...o,
});

export const personal = (o: Partial<PersonalExpense> = {}): PersonalExpense => ({
  ...base(),
  date: '2026-11-03',
  valueCents: 0,
  ...o,
});

export const ingredient = (o: Partial<Ingredient> = {}): Ingredient => ({
  ...base(),
  name: 'x',
  pricePaidCents: 0,
  packageQty: 1,
  unit: 'g',
  ...o,
});

export const recipe = (o: Partial<Recipe> = {}): Recipe => ({
  ...base(),
  productId: P,
  name: 'Tradicional',
  yield: 1,
  packagingPerUnitCents: 0,
  laborPerBatchCents: 0,
  otherCostsPerBatchCents: 0,
  targetMargin: 0.5,
  active: true,
  ...o,
});

export const recipeItem = (o: Partial<RecipeItem> = {}): RecipeItem => ({
  ...base(),
  recipeId: 'r',
  ingredientId: 'i',
  quantity: 0,
  ...o,
});

export const stockData = (o: Partial<StockData> = {}): StockData => ({
  weekCloses: [],
  sales: [],
  deliveries: [],
  settlements: [],
  adjustments: [],
  ...o,
});
