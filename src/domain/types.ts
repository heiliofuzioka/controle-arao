// Tipos do domínio. Veja o glossário no CLAUDE.md (UI pt-BR → código).

export type ID = string; // crypto.randomUUID()
export type Cents = number; // inteiro, sempre centavos
export type LocalDate = string; // 'YYYY-MM-DD' no fuso do aparelho
export type MonthKey = string; // 'YYYY-MM'

/** Todo registro estende Base (pronto para sincronizar na v2). Nunca apagar: marcar deletedAt. */
export interface Base {
  id: ID;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Category extends Base {
  name: string;
  order: number;
}

export interface Product extends Base {
  categoryId: ID;
  name: string;
  code: string;
  priceCents: Cents;
  active: boolean;
}

export type SalesPointMode = 'direct' | 'consignment';
export interface SalesPoint extends Base {
  name: string;
  mode: SalesPointMode;
  active: boolean;
}

/** Fechamento da semana: uma linha por produto por semana. */
export interface WeekClose extends Base {
  weekStart: LocalDate; // segunda
  productId: ID;
  produced: number;
  loss: number;
  soldDirect: number;
  valueCents: Cents; // soldDirect × preço, editável
  note?: string;
}

export type SaleOrigin = 'week_close' | 'settlement' | 'import';
export interface Sale extends Base {
  date: LocalDate;
  pointId: ID;
  productId: ID;
  quantity: number;
  valueCents: Cents;
  origin: SaleOrigin;
  weekCloseId?: ID;
  settlementId?: ID;
}

export interface Delivery extends Base {
  date: LocalDate;
  pointId: ID;
  productId: ID;
  quantity: number;
}

export interface Settlement extends Base {
  date: LocalDate;
  pointId: ID;
  productId: ID;
  remaining: number;
  loss: number;
  soldQuantity: number;
  valueCents: Cents;
  paid: boolean;
  paidDate?: LocalDate;
}

export type StockLocation = 'home' | 'consignment';
export interface StockAdjustment extends Base {
  date: LocalDate;
  productId: ID;
  location: StockLocation;
  pointId?: ID;
  delta: number;
  reason: 'initial_count' | 'correction';
  note?: string;
}

export interface ExpenseCategory extends Base {
  name: string;
  /** true: Ingredientes e Embalagens (já entram no custo dos produtos). */
  isProductCost: boolean;
}

export interface Expense extends Base {
  date: LocalDate;
  valueCents: Cents;
  categoryId: ID;
  description?: string;
}

export interface PersonalExpense extends Base {
  date: LocalDate;
  valueCents: Cents;
  description?: string;
}

export interface MonthlyGoal extends Base {
  month: MonthKey;
  revenueCents?: Cents;
  profitCents?: Cents;
}

export type Unit = 'g' | 'ml' | 'un';
export interface Ingredient extends Base {
  name: string;
  pricePaidCents: Cents;
  packageQty: number; // na unidade base (g, ml ou un)
  unit: Unit;
}

/** Receita = um sabor de um produto. */
export interface Recipe extends Base {
  productId: ID;
  name: string;
  yield: number;
  packagingPerUnitCents: Cents;
  laborPerBatchCents: Cents;
  otherCostsPerBatchCents: Cents;
  targetMargin: number; // 0–1
  preparation?: string;
  notes?: string;
  active: boolean;
}

export interface RecipeItem extends Base {
  recipeId: ID;
  ingredientId: ID;
  quantity: number; // na unidade do ingrediente
}
