import { describe, expect, it } from 'vitest';
import {
  itemCost,
  marginForPrice,
  markupForPrice,
  priceForMargin,
  productUnitCost,
  recipeCost,
  recipesBelowTarget,
  unitCostByProduct,
  unitProfit,
} from './pricing';
import { OTHER, P, ingredient, product, recipe, recipeItem } from './testing';

const leite = ingredient({ id: 'leite', name: 'Leite condensado', pricePaidCents: 600, packageQty: 395 });
const cacau = ingredient({ id: 'cacau', name: 'Cacau', pricePaidCents: 1500, packageQty: 200 });
const ingredients = [leite, cacau];

const tradicional = recipe({
  id: 'r1',
  productId: OTHER,
  name: 'Tradicional',
  yield: 20,
  packagingPerUnitCents: 15,
  laborPerBatchCents: 2000,
  otherCostsPerBatchCents: 300,
  targetMargin: 0.5,
});
const items = [
  recipeItem({ recipeId: 'r1', ingredientId: 'leite', quantity: 790 }),
  recipeItem({ recipeId: 'r1', ingredientId: 'cacau', quantity: 100 }),
  recipeItem({ recipeId: 'r1', ingredientId: 'cacau', quantity: 999, deletedAt: 'x' }),
  recipeItem({ recipeId: 'outra', ingredientId: 'cacau', quantity: 999 }),
];
const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));

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

  it('custo do lote e por unidade (ignora itens apagados)', () => {
    expect(recipeCost(tradicional, items, ingredientsById)).toEqual({
      ingredientsCost: 1950, // 1200 + 750
      batchCost: 4250, // 1950 + 2000 + 300
      unitCost: 227.5, // 4250 / 20 + 15
    });
  });

  it('recusa rendimento 0 e ingrediente que sumiu', () => {
    expect(() => recipeCost({ ...tradicional, yield: 0 }, items, ingredientsById)).toThrow();
    expect(() => recipeCost(tradicional, items, new Map())).toThrow();
  });
});

describe('margem, preço, markup e lucro por unidade', () => {
  it('custo R$4 com 50% de margem dá preço R$8 (markup 100%, lucro R$4)', () => {
    expect(priceForMargin(400, 0.5)).toBe(800);
    expect(marginForPrice(800, 400)).toBe(0.5);
    expect(markupForPrice(800, 400)).toBe(1);
    expect(unitProfit(800, 400)).toBe(400);
  });

  it('arredonda só o preço final', () => {
    expect(priceForMargin(227.5, 0.3)).toBe(325);
    expect(priceForMargin(100, 0.3)).toBe(143); // 142,857…
  });

  it('margem e preço se convertem nos dois sentidos', () => {
    const price = priceForMargin(227.5, 0.45);
    expect(marginForPrice(price, 227.5)).toBeCloseTo(0.45, 2);
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

describe('custo do produto com vários sabores', () => {
  const ninho = recipe({ id: 'r2', productId: OTHER, name: 'Ninho', yield: 10 });
  const ninhoItems = [recipeItem({ recipeId: 'r2', ingredientId: 'leite', quantity: 395 })]; // 600 / 10 = 60

  it('é a média dos sabores ativos', () => {
    // (227,5 + 60) / 2
    expect(productUnitCost(OTHER, [tradicional, ninho], [...items, ...ninhoItems], ingredients)).toBe(143.75);
  });

  it('ignora sabores inativos ou apagados', () => {
    const recipes = [tradicional, { ...ninho, active: false }];
    expect(productUnitCost(OTHER, recipes, [...items, ...ninhoItems], ingredients)).toBe(227.5);
    expect(productUnitCost(OTHER, [{ ...tradicional, deletedAt: 'x' }], items, ingredients)).toBeNull();
  });

  it('sem receita não calcula', () => {
    expect(productUnitCost(P, [tradicional], items, ingredients)).toBeNull();
    const map = unitCostByProduct([product({ id: P }), product({ id: OTHER })], [tradicional], items, ingredients);
    expect(map.get(OTHER)).toBe(227.5);
    expect(map.has(P)).toBe(false);
  });
});

describe('aviso de margem abaixo da meta, por sabor', () => {
  const brownie = (priceCents: number) => product({ id: OTHER, name: 'Brownie', priceCents });

  it('não avisa quando a margem está na meta', () => {
    expect(recipesBelowTarget([brownie(500)], [tradicional], items, ingredients)).toEqual([]);
  });

  it('avisa quando o ingrediente sobe e a margem cai', () => {
    const caro = { ...cacau, pricePaidCents: 6000 }; // 100 g passam a custar 3000
    // lote = 1200 + 3000 + 2300 = 6500 → unidade = 325 + 15 = 340; margem a R$5 = 32%
    const alerts = recipesBelowTarget([brownie(500)], [tradicional], items, [leite, caro]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ productId: OTHER, recipeName: 'Tradicional', unitCost: 340, priceCents: 500 });
    expect(alerts[0]!.margin).toBeCloseTo(0.32, 5);
  });

  it('avisa sabor de produto ainda sem preço', () => {
    const alerts = recipesBelowTarget([brownie(0)], [tradicional], items, ingredients);
    expect(alerts[0]?.margin).toBeNull();
  });
});
