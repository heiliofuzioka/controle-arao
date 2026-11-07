// Tipos do domínio. Veja o glossário no CLAUDE.md (UI pt-BR → código).

export type ID = string; // crypto.randomUUID()
export type Cents = number; // inteiro, sempre centavos
export type LocalDate = string; // 'YYYY-MM-DD' no fuso do aparelho

export type ProductKind = 'ice_pop' | 'baked';
export interface Product {
  id: ID;
  name: string;
  kind: ProductKind;
  code: string;
  priceCents: Cents;
  active: boolean;
}

export type SalesPointMode = 'direct' | 'consignment';
export interface SalesPoint {
  id: ID;
  name: string;
  mode: SalesPointMode;
  active: boolean;
}

export interface Production {
  id: ID;
  date: LocalDate;
  productId: ID;
  quantity: number;
  loss: number;
  note?: string;
  createdAt: string;
}

export type SaleOrigin = 'direct' | 'settlement' | 'import';
export interface Sale {
  id: ID;
  date: LocalDate;
  time?: string;
  pointId: ID;
  productId: ID;
  quantity: number;
  valueCents: Cents;
  origin: SaleOrigin;
  settlementId?: ID;
  note?: string;
  createdAt: string;
}

export interface Delivery {
  id: ID;
  date: LocalDate;
  pointId: ID;
  productId: ID;
  quantity: number;
  createdAt: string;
}

export interface Settlement {
  id: ID;
  date: LocalDate;
  pointId: ID;
  productId: ID;
  remaining: number;
  loss: number;
  soldQuantity: number;
  valueCents: Cents;
  paid: boolean;
  paidDate?: LocalDate;
  createdAt: string;
}

export type StockLocation = 'home' | 'consignment';
export interface StockAdjustment {
  id: ID;
  date: LocalDate;
  productId: ID;
  location: StockLocation;
  pointId?: ID;
  delta: number;
  reason: 'initial_count' | 'correction';
  note?: string;
}

export interface ExpenseCategory {
  id: ID;
  name: string;
}

export interface Expense {
  id: ID;
  date: LocalDate;
  valueCents: Cents;
  categoryId: ID;
  description?: string;
  createdAt: string;
}

export interface PersonalExpense {
  id: ID;
  date: LocalDate;
  valueCents: Cents;
  description?: string;
  createdAt: string;
}

export type Unit = 'g' | 'ml' | 'un';
export interface Ingredient {
  id: ID;
  name: string;
  pricePaidCents: Cents;
  packageQty: number; // na unidade base (g, ml ou un)
  unit: Unit;
  updatedAt: string;
}

export interface Recipe {
  id: ID;
  productId: ID;
  yield: number;
  packagingPerUnitCents: Cents;
  laborPerBatchCents: Cents;
  otherCostsPerBatchCents: Cents;
  targetMargin: number; // 0–1
}

export interface RecipeItem {
  id: ID;
  recipeId: ID;
  ingredientId: ID;
  quantity: number; // na unidade do ingrediente
}
