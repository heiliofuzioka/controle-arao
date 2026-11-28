import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { alive } from '../domain/records';
import { ControleAraoDB } from './db';
import { deleteIngredient, deleteRecipe, RecipeBlockedError, saveIngredient, saveRecipe, type RecipeSaveInput } from './operations';
import { loadHomeData } from './queries';

let db: ControleAraoDB;
let brownie: string;

beforeEach(async () => {
  db = new ControleAraoDB(`test-${crypto.randomUUID()}`);
  await db.open();
  brownie = (await db.products.toArray()).find((p) => p.code === 'B')!.id;
});

afterEach(async () => {
  await db.delete();
});

const recipeInput = (o: Partial<RecipeSaveInput>): RecipeSaveInput => ({
  productId: brownie,
  name: 'Tradicional',
  yield: 24,
  packagingPerUnitCents: 20,
  laborPerBatchCents: 3000,
  otherCostsPerBatchCents: 0,
  targetMargin: 0.6,
  preparation: '',
  notes: '',
  active: true,
  items: [],
  ...o,
});

describe('ingredientes', () => {
  it('grava em g e avisa quando o preço sobe', async () => {
    const { id, rose } = await saveIngredient(db, { name: 'Chocolate 50%', pricePaidCents: 4290, packageQty: 1, unit: 'kg' });
    expect(rose).toBe(false);
    expect(await db.ingredients.get(id)).toMatchObject({ packageQty: 1000, unit: 'g' });

    const up = await saveIngredient(db, { id, name: 'Chocolate 50%', pricePaidCents: 4990, packageQty: 1, unit: 'kg' });
    expect(up.rose).toBe(true);
    const down = await saveIngredient(db, { id, name: 'Chocolate 50%', pricePaidCents: 4990, packageQty: 2, unit: 'kg' });
    expect(down.rose).toBe(false);
  });

  it('ingrediente numa receita não se apaga', async () => {
    const { id } = await saveIngredient(db, { name: 'Ovos', pricePaidCents: 1690, packageQty: 30, unit: 'un' });
    const recipeId = await saveRecipe(db, recipeInput({ items: [{ ingredientId: id, quantity: 4 }] }));
    await expect(deleteIngredient(db, id)).rejects.toBeInstanceOf(RecipeBlockedError);
    await deleteRecipe(db, recipeId);
    await deleteIngredient(db, id);
    expect((await db.ingredients.get(id))!.deletedAt).toBeDefined();
  });
});

describe('receitas', () => {
  it('cria, troca itens e o custo do produto aparece nos totais', async () => {
    const choc = (await saveIngredient(db, { name: 'Chocolate', pricePaidCents: 4290, packageQty: 1, unit: 'kg' })).id;
    const ovos = (await saveIngredient(db, { name: 'Ovos', pricePaidCents: 1690, packageQty: 30, unit: 'un' })).id;
    const id = await saveRecipe(
      db,
      recipeInput({ preparation: '  Derreta.  ', items: [{ ingredientId: choc, quantity: 400 }, { ingredientId: ovos, quantity: 4 }] }),
    );
    const recipe = await db.recipes.get(id);
    expect(recipe).toMatchObject({ preparation: 'Derreta.', name: 'Tradicional' });
    expect(recipe!.notes).toBeUndefined();

    const items = alive(await db.recipeItems.where('recipeId').equals(id).toArray());
    expect(items).toHaveLength(2);
    const chocItem = items.find((i) => i.ingredientId === choc)!;

    // Edição: muda a quantidade do chocolate, tira os ovos, limpa o modo de preparo.
    await saveRecipe(db, recipeInput({ id, items: [{ id: chocItem.id, ingredientId: choc, quantity: 500 }] }));
    const after = alive(await db.recipeItems.where('recipeId').equals(id).toArray());
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: chocItem.id, quantity: 500 });
    expect((await db.recipes.get(id))!.preparation).toBeUndefined();

    const data = await loadHomeData(db);
    // (4290/1000×500 + 3000) / 24 + 20
    expect(data.unitCosts.get(brownie)).toBeCloseTo((2145 + 3000) / 24 + 20);
  });

  it('não grava sem rendimento nem sabor repetido', async () => {
    await expect(saveRecipe(db, recipeInput({ yield: 0 }))).rejects.toThrow('Quantas unidades o lote rende?');
    await saveRecipe(db, recipeInput({}));
    await expect(saveRecipe(db, recipeInput({ name: 'tradicional' }))).rejects.toThrow('Esse produto já tem um sabor com esse nome');
  });
});
