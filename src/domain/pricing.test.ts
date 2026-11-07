import { describe, expect, it } from 'vitest';
import {
  itemCost,
  marginForPrice,
  markupForPrice,
  priceForMargin,
  productsBelowTarget,
  recipeCost,
} from './pricing';
import type { Ingredient, Product, Recipe, RecipeItem } from './types';

const ingredient = (o: Partial<Ingredient>): Ingredient => ({
  id: 'x',
  name: 'x',
  pricePaidCents: 0,
  packageQty: 1,
  unit: 'g',
  updatedAt: '',
  ...o,
});

const leite = ingredient({ id: 'leite', name: 'Leite condensado', pricePaidCents: 600, packageQty: 395 });
const cacau = ingredient({ id: 'cacau', name: 'Cacau', pricePaidCents: 1500, packageQty: 200 });

const recipe: Recipe = {
  id: 'r1',
  productId: 'brownie',
  yield: 20,
  packagingPerUnitCents: 15,
  laborPerBatchCents: 2000,
  otherCostsPerBatchCents: 300,
  targetMargin: 0.5,
};
const items: RecipeItem[] = [
  { id: 'i1', recipeId: 'r1', ingredientId: 'leite', quantity: 790 },
  { id: 'i2', recipeId: 'r1', ingredientId: 'cacau', quantity: 100 },
  { id: 'i3', recipeId: 'outra', ingredientId: 'cacau', quantity: 999 },
];
const ingredientsById = new Map([leite, cacau].map((i) => [i.id, i]));

describe('custo', () => {
  it('custo do item = preço pago / embalagem × quantidade', () => {
    expect(itemCost(leite, 790)).toBe(1200);
    expect(itemCost(cacau, 50)).toBe(375);
    // sem arredondar: 600 / 395 × 100
    expect(itemCost(leite, 100)).toBeCloseTo(151.8987, 4);
  });

  it('recusa ingrediente sem tamanho de embalagem', () => {
    expect(() => itemCost(ingredient({ packageQty: 0 }), 10)).toThrow();
  });

  it('custo do lote e por unidade', () => {
    expect(recipeCost(recipe, items, ingredientsById)).toEqual({
      ingredientsCost: 1950, // 1200 + 750
      batchCost: 4250, // 1950 + 2000 + 300
      unitCost: 227.5, // 4250 / 20 + 15
    });
  });

  it('recusa rendimento 0 e ingrediente que sumiu', () => {
    expect(() => recipeCost({ ...recipe, yield: 0 }, items, ingredientsById)).toThrow();
    expect(() => recipeCost(recipe, items, new Map())).toThrow();
  });
});

describe('margem, preço e markup', () => {
  it('custo R$4 com 50% de margem dá preço R$8 (markup 100%)', () => {
    expect(priceForMargin(400, 0.5)).toBe(800);
    expect(marginForPrice(800, 400)).toBe(0.5);
    expect(markupForPrice(800, 400)).toBe(1);
  });

  it('arredonda só o preço final', () => {
    // 227,5 / 0,7 = 325
    expect(priceForMargin(227.5, 0.3)).toBe(325);
    // 100 / 0,7 = 142,857… → 143
    expect(priceForMargin(100, 0.3)).toBe(143);
  });

  it('margem e preço se convertem nos dois sentidos', () => {
    const cost = 227.5;
    const price = priceForMargin(cost, 0.45);
    expect(marginForPrice(price, cost)).toBeCloseTo(0.45, 2);
  });

  it('margem fora de 0–99% é recusada', () => {
    expect(() => priceForMargin(400, 1)).toThrow();
    expect(() => priceForMargin(400, -0.1)).toThrow();
  });

  it('sem preço não tem margem; sem custo não tem markup', () => {
    expect(marginForPrice(0, 400)).toBeNull();
    expect(markupForPrice(800, 0)).toBeNull();
  });

  it('margem pode ser negativa quando o preço não cobre o custo', () => {
    expect(marginForPrice(200, 400)).toBe(-1);
  });
});

describe('aviso de margem abaixo da meta', () => {
  const product = (priceCents: number): Product => ({
    id: 'brownie',
    name: 'Brownie',
    kind: 'baked',
    code: 'B',
    priceCents,
    active: true,
  });

  it('não avisa quando a margem está na meta', () => {
    // custo 227,5; preço 500 → margem 54,5%
    expect(productsBelowTarget([product(500)], [recipe], items, [leite, cacau])).toEqual([]);
  });

  it('avisa quando o ingrediente sobe e a margem cai', () => {
    const caro = { ...cacau, pricePaidCents: 6000 }; // 100 g passam a custar 3000
    // lote = 1200 + 3000 + 2300 = 6500 → unidade = 325 + 15 = 340; margem a R$5 = 32%
    const alerts = productsBelowTarget([product(500)], [recipe], items, [leite, caro]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ productId: 'brownie', unitCost: 340, priceCents: 500, targetMargin: 0.5 });
    expect(alerts[0]!.margin).toBeCloseTo(0.32, 5);
  });

  it('avisa produto ainda sem preço', () => {
    const alerts = productsBelowTarget([product(0)], [recipe], items, [leite, cacau]);
    expect(alerts[0]?.margin).toBeNull();
  });
});
