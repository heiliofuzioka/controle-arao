import { describe, expect, it } from 'vitest';
import {
  belowTargetList,
  formatPercentInput,
  formatQuantity,
  formatQuantityInput,
  ingredientErrors,
  ingredientFields,
  parsePercentInput,
  parseQuantityInput,
  pricePerBaseUnit,
  quantityForInput,
  recipeBook,
  recipeErrors,
  recipeLines,
  recipeTitle,
  referencePrice,
  recipesUsingIngredient,
} from './recipes';
import { OTHER, P, ingredient, product, recipe, recipeItem } from './testing';

describe('quantidades', () => {
  it('mostra kg e L a partir de 1000', () => {
    expect(formatQuantity(400, 'g')).toBe('400 g');
    expect(formatQuantity(1000, 'g')).toBe('1 kg');
    expect(formatQuantity(1500, 'ml')).toBe('1,5 L');
    expect(formatQuantity(30, 'un')).toBe('30 un');
    expect(formatQuantity(0.5, 'un')).toBe('0,5 un');
  });

  it('campo: unidade grande quando passa de 1000', () => {
    expect(quantityForInput(1000, 'g')).toEqual({ value: 1, unit: 'kg' });
    expect(quantityForInput(395, 'g')).toEqual({ value: 395, unit: 'g' });
    expect(quantityForInput(12, 'un')).toEqual({ value: 12, unit: 'un' });
  });

  it('lê "0,5", "1.5" e recusa vazio, zero e texto', () => {
    expect(parseQuantityInput('0,5')).toBe(0.5);
    expect(parseQuantityInput(' 1.5 ')).toBe(1.5);
    expect(parseQuantityInput(',5')).toBe(0.5);
    expect(parseQuantityInput('400')).toBe(400);
    expect(parseQuantityInput('')).toBeNull();
    expect(parseQuantityInput('0')).toBeNull();
    expect(parseQuantityInput('abc')).toBeNull();
    expect(formatQuantityInput(0.5)).toBe('0,5');
  });

  it('margem digitada', () => {
    expect(parsePercentInput('60')).toBe(0.6);
    expect(parsePercentInput('62,5')).toBe(0.625);
    expect(parsePercentInput('0')).toBe(0);
    expect(parsePercentInput('100')).toBeNull();
    expect(parsePercentInput('')).toBeNull();
    expect(formatPercentInput(0.6)).toBe('60');
    expect(formatPercentInput(0.625)).toBe('62,5');
  });
});

describe('ingredientes', () => {
  it('preço por grama', () => {
    expect(pricePerBaseUnit(ingredient({ pricePaidCents: 4290, packageQty: 1000 }))).toBeCloseTo(4.29);
  });

  it('preço por kg, L ou unidade', () => {
    expect(referencePrice(ingredient({ pricePaidCents: 1290, packageQty: 200, unit: 'g' }))).toEqual({ cents: 6450, unit: 'kg' });
    expect(referencePrice(ingredient({ pricePaidCents: 500, packageQty: 500, unit: 'ml' }))).toEqual({ cents: 1000, unit: 'L' });
    expect(referencePrice(ingredient({ pricePaidCents: 1690, packageQty: 30, unit: 'un' })).cents).toBeCloseTo(56.33, 1);
  });

  it('pede nome, preço e tamanho; nome não repete', () => {
    const list = [ingredient({ id: 'a', name: 'Açúcar' })];
    expect(ingredientErrors({ name: '', pricePaidCents: null, packageQty: null, unit: 'g' }, list)).toEqual({
      name: 'Coloque o nome do ingrediente',
      pricePaidCents: 'Coloque quanto pagou',
      packageQty: 'Coloque o tamanho da embalagem',
    });
    expect(ingredientErrors({ name: 'açúcar', pricePaidCents: 549, packageQty: 1, unit: 'kg' }, list).name).toBe(
      'Já existe um ingrediente com esse nome',
    );
    expect(ingredientErrors({ name: 'Açúcar', pricePaidCents: 549, packageQty: 1, unit: 'kg' }, list, 'a')).toEqual({});
  });

  it('grava kg em g', () => {
    expect(ingredientFields({ name: ' Açúcar ', pricePaidCents: 549, packageQty: 1.2, unit: 'kg' })).toEqual({
      name: 'Açúcar',
      pricePaidCents: 549,
      packageQty: 1200,
      unit: 'g',
    });
  });

  it('receitas que usam o ingrediente', () => {
    const recipes = [recipe({ id: 'r1' }), recipe({ id: 'r2', deletedAt: 'x' })];
    const items = [
      recipeItem({ recipeId: 'r1', ingredientId: 'i' }),
      recipeItem({ recipeId: 'r2', ingredientId: 'i' }),
      recipeItem({ recipeId: 'r1', ingredientId: 'j', deletedAt: 'x' }),
    ];
    expect(recipesUsingIngredient('i', recipes, items).map((r) => r.id)).toEqual(['r1']);
    expect(recipesUsingIngredient('j', recipes, items)).toEqual([]);
  });
});

describe('receitas', () => {
  it('título do sabor', () => {
    const brownie = { name: 'Brownie' };
    expect(recipeTitle(brownie, { name: 'Tradicional' })).toBe('Brownie tradicional');
    expect(recipeTitle(brownie, { name: 'Leite Ninho' })).toBe('Brownie Leite Ninho');
    expect(recipeTitle({ name: 'Gelinho' }, { name: 'Nutella' })).toBe('Gelinho Nutella');
    expect(recipeTitle({ name: 'Gelinho' }, { name: 'Maracujá' })).toBe('Gelinho maracujá');
    expect(recipeTitle({ name: 'Brownie recheado' }, { name: 'Recheado' })).toBe('Brownie recheado');
    expect(recipeTitle(brownie, { name: 'Brownie de Ninho' })).toBe('Brownie de Ninho');
    expect(recipeTitle(undefined, { name: 'Morango' })).toBe('Morango');
  });

  const choc = ingredient({ id: 'choc', name: 'Chocolate', pricePaidCents: 4290, packageQty: 1000 });
  const ovos = ingredient({ id: 'ovos', name: 'Ovos', pricePaidCents: 1690, packageQty: 30, unit: 'un' });
  const items = [
    recipeItem({ id: 'a', recipeId: 'r1', ingredientId: 'choc', quantity: 400, createdAt: '1' }),
    recipeItem({ id: 'b', recipeId: 'r1', ingredientId: 'ovos', quantity: 4, createdAt: '2' }),
    recipeItem({ id: 'c', recipeId: 'r1', ingredientId: 'ovos', quantity: 9, deletedAt: 'x' }),
  ];

  it('linhas do lote com o custo de cada ingrediente', () => {
    const lines = recipeLines('r1', items, new Map([choc, ovos].map((i) => [i.id, i])));
    expect(lines.map((l) => l.ingredient.name)).toEqual(['Chocolate', 'Ovos']);
    expect(lines[0]!.cost).toBeCloseTo(1716);
    expect(lines[1]!.cost).toBeCloseTo(225.33, 1);
  });

  it('livro agrupado por produto, sem produtos sem receita', () => {
    const products = [product({ id: P, name: 'Gelinho' }), product({ id: OTHER, name: 'Brownie', code: 'B' })];
    const recipes = [
      recipe({ id: 'r1', productId: OTHER, name: 'Tradicional', yield: 24 }),
      recipe({ id: 'r2', productId: OTHER, name: 'Velho', deletedAt: 'x' }),
    ];
    const book = recipeBook(products, recipes, items, [choc, ovos]);
    expect(book).toHaveLength(1);
    expect(book[0]!.product.id).toBe(OTHER);
    expect(book[0]!.recipes[0]).toMatchObject({ title: 'Brownie tradicional', hasIngredients: true });
    expect(book[0]!.recipes[0]!.unitCost).toBeGreaterThan(0);
  });

  it('validação do formulário', () => {
    const ok = { name: 'Morango', productId: P, yield: 20, items: [{ ingredientId: 'x', quantity: 10 }], targetMargin: 0.6 };
    expect(recipeErrors(ok, [])).toEqual({});
    expect(
      recipeErrors({ name: ' ', productId: null, yield: 0, items: [{ ingredientId: 'x', quantity: null }], targetMargin: null }, []),
    ).toEqual({
      name: 'Coloque o nome do sabor',
      productId: 'Escolha o produto',
      yield: 'Quantas unidades o lote rende?',
      items: 'Coloque a quantidade de cada ingrediente',
      targetMargin: 'A margem vai de 0% a 99%',
    });
    const existing = [recipe({ id: 'm', productId: P, name: 'morango' })];
    expect(recipeErrors(ok, existing).name).toBe('Esse produto já tem um sabor com esse nome');
    expect(recipeErrors(ok, existing, 'm')).toEqual({});
  });

  it('lista dos abaixo da meta com título e produto', () => {
    const products = [product({ id: OTHER, name: 'Brownie', priceCents: 0 })];
    const list = belowTargetList(products, [recipe({ id: 'r1', productId: OTHER, name: 'Tradicional', yield: 24 })], items, [
      choc,
      ovos,
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: 'Brownie tradicional', margin: null });
  });
});
