import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ControleAraoDB } from './db';
import {
  CatalogBlockedError,
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveProduct,
  saveStockCount,
  setProductPrice,
} from './operations';

let db: ControleAraoDB;
let tortas: string;

beforeEach(async () => {
  db = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await db.open();
  tortas = (await db.categories.toArray()).find((c) => c.name === 'Tortas')!.id;
});

afterEach(async () => {
  await db.delete();
});

describe('produtos', () => {
  it('cria, edita o preço e apaga um produto sem uso', async () => {
    const id = await saveProduct(db, {
      name: ' Brownie de pote ',
      code: 'P',
      categoryId: tortas,
      priceCents: 1100,
      active: true,
    });
    expect(await db.products.get(id)).toMatchObject({ name: 'Brownie de pote', code: 'P', priceCents: 1100 });

    await setProductPrice(db, id, 1250);
    expect((await db.products.get(id))!.priceCents).toBe(1250);

    await deleteProduct(db, id);
    expect((await db.products.get(id))!.deletedAt).toBeDefined();
  });

  it('não deixa sigla repetida', async () => {
    await expect(
      saveProduct(db, { name: 'Outro', code: 'G', categoryId: tortas, priceCents: 0, active: true }),
    ).rejects.toThrow('A sigla G já é do Gelinho');
  });

  it('produto com contagem de estoque não se apaga', async () => {
    const gelinho = (await db.products.toArray()).find((p) => p.code === 'G')!.id;
    await saveStockCount(db, '2026-11-22', [{ productId: gelinho, home: 3, consignment: 0 }]);
    await expect(deleteProduct(db, gelinho)).rejects.toBeInstanceOf(CatalogBlockedError);
  });
});

describe('categorias', () => {
  it('categoria nova vai para o fim; com produto não se apaga', async () => {
    const id = await saveCategory(db, { name: 'Cookies' });
    expect((await db.categories.get(id))!.order).toBe(5);
    await expect(saveCategory(db, { name: 'cookies' })).rejects.toThrow('Já existe uma categoria com esse nome');

    await expect(deleteCategory(db, tortas)).rejects.toThrow('Mude os produtos dessa categoria antes de apagar.');
    await deleteCategory(db, id);
    expect((await db.categories.get(id))!.deletedAt).toBeDefined();
  });
});

describe('categorias de despesa', () => {
  it('cria, renomeia e só apaga sem despesa', async () => {
    const { saveExpenseCategory, deleteExpenseCategory, saveExpense } = await import('./operations');
    const id = await saveExpenseCategory(db, { name: 'Aluguel', isProductCost: false });
    await expect(saveExpenseCategory(db, { name: 'gás', isProductCost: false })).rejects.toThrow(
      'Já existe uma categoria com esse nome',
    );
    await saveExpenseCategory(db, { id, name: 'Aluguel da cozinha', isProductCost: false });
    expect((await db.expenseCategories.get(id))!.name).toBe('Aluguel da cozinha');
    const expense = await saveExpense(db, { date: '2026-11-20', valueCents: 100, categoryId: id, description: '' });
    await expect(deleteExpenseCategory(db, id)).rejects.toThrow('Essa categoria já tem despesas');
    const { deleteExpense } = await import('./operations');
    await deleteExpense(db, expense);
    await deleteExpenseCategory(db, id);
    expect((await db.expenseCategories.get(id))!.deletedAt).toBeDefined();
  });
});
