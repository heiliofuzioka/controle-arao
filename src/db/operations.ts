// Gravações do app. Cada função roda numa única transação Dexie.
// Nunca apaga de verdade: exclusão marca deletedAt.
import { categoryNameError, nextCategoryOrder, productErrors, productInUse } from '../domain/catalog';
import { alive, byCreation, newBase, softDelete, touch } from '../domain/records';
import { computeSettlement, markPaid, markUnpaid, planSettlement } from '../domain/settlement';
import { consignmentStock, deliveryChangeError, stockBeforeSettlement, type StockData } from '../domain/stock';
import { planStockCount, type StockCount } from '../domain/count';
import type {
  Cents,
  Delivery,
  Expense,
  ID,
  LocalDate,
  MonthlyGoal,
  PersonalExpense,
  Product,
  SalesPoint,
} from '../domain/types';
import { checkWeekClose, findWeekClose, planWeekClose } from '../domain/weekClose';
import type { ControleAraoDB } from './db';

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

/** Tudo que os cálculos de estoque precisam. */
export async function loadStockData(db: ControleAraoDB): Promise<StockData> {
  const [weekCloses, sales, deliveries, settlements, adjustments] = await Promise.all([
    db.weekCloses.toArray(),
    db.sales.toArray(),
    db.deliveries.toArray(),
    db.settlements.toArray(),
    db.stockAdjustments.toArray(),
  ]);
  return { weekCloses, sales, deliveries, settlements, adjustments };
}

/** Produtos ativos, na ordem das categorias (e da criação dentro de cada categoria). */
export async function loadActiveProducts(db: ControleAraoDB): Promise<Product[]> {
  const [products, categories] = await Promise.all([db.products.toArray(), db.categories.toArray()]);
  const order = new Map(categories.map((c) => [c.id, c.order]));
  return byCreation(alive(products).filter((p) => p.active)).sort(
    (a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0),
  );
}

export interface WeekCloseCardInput {
  productId: ID;
  produced: number;
  loss: number;
  soldDirect: number;
  valueCents: Cents;
}

/** O fechamento não pôde ser salvo (ex.: vendeu mais do que tinha). */
export class WeekCloseBlockedError extends Error {
  constructor(
    public readonly productId: ID,
    message: string,
  ) {
    super(message);
    this.name = 'WeekCloseBlockedError';
  }
}

/**
 * Salva o fechamento da semana: um WeekClose por produto e a venda na mão no domingo.
 * Fechar de novo a mesma semana edita os mesmos registros.
 */
export async function saveWeekClose(
  db: ControleAraoDB,
  weekStart: LocalDate,
  cards: readonly WeekCloseCardInput[],
  now: string = nowIso(),
): Promise<void> {
  await db.transaction(
    'rw',
    [db.weekCloses, db.sales, db.deliveries, db.settlements, db.stockAdjustments, db.salesPoints],
    async () => {
      const data = await loadStockData(db);
      const directPoint = byCreation(alive(await db.salesPoints.toArray())).find((p) => p.mode === 'direct');
      if (!directPoint) throw new Error('Ponto de venda direta não encontrado.');

      for (const card of cards) {
        const existing = findWeekClose(data.weekCloses, weekStart, card.productId);
        const check = checkWeekClose(data, { weekStart, ...card }, existing?.id);
        if (!check.ok) throw new WeekCloseBlockedError(card.productId, check.error ?? 'Confira os números.');

        const existingSale = existing
          ? data.sales.find((s) => s.weekCloseId === existing.id && s.origin === 'week_close' && !s.deletedAt)
          : undefined;
        const plan = planWeekClose({
          input: { weekStart, ...card },
          directPointId: directPoint.id,
          existing: existing ? { weekClose: existing, sale: existingSale } : undefined,
          newId,
          now,
        });
        await db.weekCloses.put(plan.weekClose);
        if (plan.sale) await db.sales.put(plan.sale);
      }
    },
  );
}

export interface ExpenseInput {
  /** Presente quando é edição. */
  id?: ID;
  date: LocalDate;
  valueCents: Cents;
  categoryId: ID;
  description?: string;
}

const cleanText = (text?: string) => {
  const t = text?.trim();
  return t ? t : undefined;
};

export async function saveExpense(db: ControleAraoDB, input: ExpenseInput, now: string = nowIso()): Promise<ID> {
  const fields = {
    date: input.date,
    valueCents: input.valueCents,
    categoryId: input.categoryId,
    description: cleanText(input.description),
  };
  return db.transaction('rw', db.expenses, async () => {
    const current = input.id ? await db.expenses.get(input.id) : undefined;
    const record: Expense = current ? touch(current, fields, now) : { ...newBase(newId(), now), ...fields };
    await db.expenses.put(record);
    return record.id;
  });
}

export async function deleteExpense(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', db.expenses, async () => {
    const current = await db.expenses.get(id);
    if (current) await db.expenses.put(softDelete(current, now));
  });
}

export interface PersonalExpenseInput {
  id?: ID;
  date: LocalDate;
  valueCents: Cents;
  description?: string;
}

export async function savePersonalExpense(
  db: ControleAraoDB,
  input: PersonalExpenseInput,
  now: string = nowIso(),
): Promise<ID> {
  const fields = { date: input.date, valueCents: input.valueCents, description: cleanText(input.description) };
  return db.transaction('rw', db.personalExpenses, async () => {
    const current = input.id ? await db.personalExpenses.get(input.id) : undefined;
    const record: PersonalExpense = current ? touch(current, fields, now) : { ...newBase(newId(), now), ...fields };
    await db.personalExpenses.put(record);
    return record.id;
  });
}

export async function deletePersonalExpense(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', db.personalExpenses, async () => {
    const current = await db.personalExpenses.get(id);
    if (current) await db.personalExpenses.put(softDelete(current, now));
  });
}

// ── Açougue ──

/** O ponto de consignação (Açougue). */
export async function consignmentPoint(db: ControleAraoDB): Promise<SalesPoint> {
  const point = byCreation(alive(await db.salesPoints.toArray())).find((p) => p.mode === 'consignment');
  if (!point) throw new Error('Açougue não encontrado.');
  return point;
}

/** A entrega ou o acerto não pôde ser salvo; a mensagem é para o Arão. */
export class ButcherBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ButcherBlockedError';
  }
}

export interface DeliveryInput {
  /** Presente quando é edição. */
  id?: ID;
  date: LocalDate;
  productId: ID;
  quantity: number;
}

export async function saveDelivery(db: ControleAraoDB, input: DeliveryInput, now: string = nowIso()): Promise<ID> {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw new ButcherBlockedError('Coloque quantos vai levar.');
  }
  return db.transaction(
    'rw',
    [db.deliveries, db.weekCloses, db.sales, db.settlements, db.stockAdjustments, db.salesPoints],
    async () => {
      const point = await consignmentPoint(db);
      const current = input.id ? await db.deliveries.get(input.id) : undefined;
      if (current) {
        // Diminuir ou trocar o produto de uma entrega não pode deixar o Açougue negativo.
        const data = await loadStockData(db);
        const sameProduct = current.productId === input.productId;
        const delta = sameProduct ? input.quantity - current.quantity : -current.quantity;
        const error = deliveryChangeError(data, current.productId, current.pointId, delta);
        if (error) throw new ButcherBlockedError(error);
      }
      const fields = { date: input.date, pointId: current?.pointId ?? point.id, productId: input.productId, quantity: input.quantity };
      const record: Delivery = current ? touch(current, fields, now) : { ...newBase(newId(), now), ...fields };
      await db.deliveries.put(record);
      return record.id;
    },
  );
}

export async function deleteDelivery(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', [db.deliveries, db.weekCloses, db.sales, db.settlements, db.stockAdjustments], async () => {
    const current = await db.deliveries.get(id);
    if (!current || current.deletedAt) return;
    const error = deliveryChangeError(await loadStockData(db), current.productId, current.pointId, -current.quantity);
    if (error) throw new ButcherBlockedError(error);
    await db.deliveries.put(softDelete(current, now));
  });
}

export interface SettlementInput {
  /** Presente quando é edição (o produto não muda). */
  id?: ID;
  date: LocalDate;
  productId: ID;
  remaining: number;
  loss: number;
  /** Valor digitado quando o produto não tem preço. Com preço, vale vendidos × preço. */
  manualValueCents?: Cents;
}

/**
 * Salva o acerto e a venda dele na mesma transação.
 * Vendidos = estoque no Açougue antes do acerto − sobra − perda.
 */
export async function saveSettlement(db: ControleAraoDB, input: SettlementInput, now: string = nowIso()): Promise<ID> {
  return db.transaction(
    'rw',
    [db.settlements, db.sales, db.deliveries, db.weekCloses, db.stockAdjustments, db.salesPoints, db.products],
    async () => {
      const current = input.id ? await db.settlements.get(input.id) : undefined;
      const pointId = current?.pointId ?? (await consignmentPoint(db)).id;
      const productId = current?.productId ?? input.productId;
      const product = await db.products.get(productId);
      if (!product) throw new Error('Produto não encontrado.');

      const data = await loadStockData(db);
      const stockBefore = current ? stockBeforeSettlement(data, current) : consignmentStock(data, productId, { pointId });
      const result = computeSettlement({ stockBefore, remaining: input.remaining, loss: input.loss, priceCents: product.priceCents });
      if (!result.ok) throw new ButcherBlockedError(result.error);

      const valueCents = product.priceCents > 0 ? result.valueCents : (input.manualValueCents ?? 0);
      if (result.soldQuantity > 0 && valueCents === 0) {
        throw new ButcherBlockedError('Coloque o valor do que o Açougue vendeu.');
      }

      const currentSale = current
        ? data.sales.find((s) => s.settlementId === current.id && s.origin === 'settlement' && !s.deletedAt)
        : undefined;
      const plan = planSettlement({
        input: {
          date: input.date,
          pointId,
          productId,
          remaining: input.remaining,
          loss: input.loss,
          soldQuantity: result.soldQuantity,
          valueCents,
        },
        existing: current ? { settlement: current, sale: currentSale } : undefined,
        newId,
        now,
      });
      await db.settlements.put(plan.settlement);
      if (plan.sale) await db.sales.put(plan.sale);
      return plan.settlement.id;
    },
  );
}

/** Apaga o acerto e a venda dele (exclusão marcada). */
export async function deleteSettlement(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', [db.settlements, db.sales], async () => {
    const current = await db.settlements.get(id);
    if (!current || current.deletedAt) return;
    await db.settlements.put(softDelete(current, now));
    const sales = await db.sales.where('settlementId').equals(id).toArray();
    for (const sale of alive(sales)) await db.sales.put(softDelete(sale, now));
  });
}

/** Botão "Recebi" (e "Desfazer"). */
export async function setSettlementPaid(
  db: ControleAraoDB,
  id: ID,
  paid: boolean,
  paidDate: LocalDate,
  now: string = nowIso(),
): Promise<void> {
  await db.transaction('rw', db.settlements, async () => {
    const current = await db.settlements.get(id);
    if (!current) return;
    await db.settlements.put(paid ? markPaid(current, paidDate, now) : markUnpaid(current, now));
  });
}

/** Apaga o fechamento de uma semana inteira e as vendas na mão dele (exclusão marcada). */
export async function deleteWeekClose(db: ControleAraoDB, weekStart: LocalDate, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', [db.weekCloses, db.sales], async () => {
    const closes = alive(await db.weekCloses.where('weekStart').equals(weekStart).toArray());
    for (const close of closes) {
      await db.weekCloses.put(softDelete(close, now));
      const sales = await db.sales.where('weekCloseId').equals(close.id).toArray();
      for (const sale of alive(sales)) await db.sales.put(softDelete(sale, now));
    }
  });
}

// ── Contar estoque e metas ──

/** Contagem de estoque: um ajuste para cada diferença entre o contado e o calculado. */
export async function saveStockCount(
  db: ControleAraoDB,
  date: LocalDate,
  counts: StockCount[],
  now: string = nowIso(),
): Promise<number> {
  return db.transaction(
    'rw',
    [db.stockAdjustments, db.weekCloses, db.sales, db.deliveries, db.settlements, db.salesPoints],
    async () => {
      const point = await consignmentPoint(db);
      const adjustments = planStockCount({
        data: await loadStockData(db),
        counts,
        date,
        consignmentPointId: point.id,
        newId,
        now,
      });
      await db.stockAdjustments.bulkPut(adjustments);
      return adjustments.length;
    },
  );
}

/** Metas do mês (faturamento e lucro estimado). Valor vazio ou 0 = sem meta. */
export async function saveMonthlyGoal(
  db: ControleAraoDB,
  month: string,
  goal: { revenueCents: Cents | null; profitCents: Cents | null },
  now: string = nowIso(),
): Promise<void> {
  await db.transaction('rw', db.monthlyGoals, async () => {
    const current = alive(await db.monthlyGoals.where('month').equals(month).toArray())[0];
    const revenueCents = goal.revenueCents && goal.revenueCents > 0 ? goal.revenueCents : undefined;
    const profitCents = goal.profitCents && goal.profitCents > 0 ? goal.profitCents : undefined;
    const base: MonthlyGoal = current
      ? { ...current, updatedAt: now }
      : ({ ...newBase(newId(), now), month } as MonthlyGoal);
    const { revenueCents: _r, profitCents: _p, ...rest } = base;
    await db.monthlyGoals.put({
      ...rest,
      ...(revenueCents ? { revenueCents } : {}),
      ...(profitCents ? { profitCents } : {}),
    });
  });
}

// ── Categorias e produtos ──

/** Não deu para gravar no catálogo (nome repetido, categoria com produtos…). */
export class CatalogBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogBlockedError';
  }
}

export interface ProductSaveInput {
  id?: ID;
  name: string;
  code: string;
  categoryId: ID | null;
  priceCents: Cents;
  active: boolean;
}

/** Cria ou edita um produto. O preço novo vale para as próximas semanas (vendas antigas guardam o valor). */
export async function saveProduct(db: ControleAraoDB, input: ProductSaveInput, now: string = nowIso()): Promise<ID> {
  return db.transaction('rw', db.products, db.categories, async () => {
    const products = await db.products.toArray();
    const errors = productErrors(input, products, input.id);
    const first = errors.name ?? errors.code ?? errors.categoryId;
    if (first) throw new CatalogBlockedError(first);
    const category = await db.categories.get(input.categoryId!);
    if (!category || category.deletedAt) throw new CatalogBlockedError('Escolha a categoria');
    const fields = {
      name: input.name.trim(),
      code: input.code.trim(),
      categoryId: input.categoryId!,
      priceCents: Math.max(0, input.priceCents),
      active: input.active,
    };
    if (input.id) {
      const current = await db.products.get(input.id);
      if (!current || current.deletedAt) throw new CatalogBlockedError('Esse produto foi apagado.');
      await db.products.put(touch(current, fields, now));
      return input.id;
    }
    const id = newId();
    await db.products.add({ ...newBase(id, now), ...fields });
    return id;
  });
}

/** Só o preço (calculadora de Receitas, depois da confirmação). */
export async function setProductPrice(db: ControleAraoDB, id: ID, priceCents: Cents, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', db.products, async () => {
    const current = await db.products.get(id);
    if (!current || current.deletedAt) throw new CatalogBlockedError('Esse produto foi apagado.');
    await db.products.put(touch(current, { priceCents: Math.max(0, Math.round(priceCents)) }, now));
  });
}

/** Apaga um produto que nunca foi usado. Produto usado só pode deixar de ser vendido. */
export async function deleteProduct(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction(
    'rw',
    [db.products, db.recipes, db.weekCloses, db.sales, db.deliveries, db.settlements, db.stockAdjustments],
    async () => {
      const current = await db.products.get(id);
      if (!current || current.deletedAt) return;
      const data = { ...(await loadStockData(db)), recipes: await db.recipes.toArray() };
      if (productInUse(id, data)) {
        throw new CatalogBlockedError('Esse produto já tem lançamentos ou receitas. Desligue "Ainda vendo" em vez de apagar.');
      }
      await db.products.put(softDelete(current, now));
    },
  );
}

/** Cria ou renomeia uma categoria. Categoria nova vai para o fim da lista. */
export async function saveCategory(
  db: ControleAraoDB,
  input: { id?: ID; name: string },
  now: string = nowIso(),
): Promise<ID> {
  return db.transaction('rw', db.categories, async () => {
    const categories = await db.categories.toArray();
    const error = categoryNameError(input.name, categories, input.id);
    if (error) throw new CatalogBlockedError(error);
    const name = input.name.trim();
    if (input.id) {
      const current = await db.categories.get(input.id);
      if (!current || current.deletedAt) throw new CatalogBlockedError('Essa categoria foi apagada.');
      await db.categories.put(touch(current, { name }, now));
      return input.id;
    }
    const id = newId();
    await db.categories.add({ ...newBase(id, now), name, order: nextCategoryOrder(categories) });
    return id;
  });
}

/** Apaga uma categoria vazia. */
export async function deleteCategory(db: ControleAraoDB, id: ID, now: string = nowIso()): Promise<void> {
  await db.transaction('rw', db.categories, db.products, async () => {
    const current = await db.categories.get(id);
    if (!current || current.deletedAt) return;
    const products = alive(await db.products.where('categoryId').equals(id).toArray());
    if (products.length > 0) throw new CatalogBlockedError('Mude os produtos dessa categoria antes de apagar.');
    await db.categories.put(softDelete(current, now));
  });
}
