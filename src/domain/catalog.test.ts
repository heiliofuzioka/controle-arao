import { describe, expect, it } from 'vitest';
import {
  catalogGroups,
  categoryNameError,
  flavorCount,
  nextCategoryOrder,
  productErrors,
  productInUse,
} from './catalog';
import type { Category } from './types';
import { OTHER, P, product, recipe, stockData, weekClose } from './testing';

const category = (o: Partial<Category> = {}): Category => ({
  id: 'c1',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  name: 'Geladinhos gourmet',
  order: 1,
  ...o,
});

const products = [
  product({ id: P, name: 'Gelinho', code: 'G', categoryId: 'c1' }),
  product({ id: OTHER, name: 'Torta', code: 't', categoryId: 'c2' }),
];

describe('produto', () => {
  it('pede nome, categoria e sigla', () => {
    expect(productErrors({ name: ' ', code: '', categoryId: null }, products)).toEqual({
      name: 'Coloque o nome do produto',
      code: 'Coloque a sigla (1 ou 2 letras)',
      categoryId: 'Escolha a categoria',
    });
    expect(productErrors({ name: 'Brownie de pote', code: 'P', categoryId: 'c1' }, products)).toEqual({});
  });

  it('sigla com no máximo 2 letras e sem repetir (maiúscula conta)', () => {
    expect(productErrors({ name: 'X', code: 'Bdp', categoryId: 'c1' }, products).code).toBe(
      'A sigla tem no máximo 2 letras',
    );
    expect(productErrors({ name: 'X', code: 'G', categoryId: 'c1' }, products).code).toBe('A sigla G já é do Gelinho');
    expect(productErrors({ name: 'X', code: 'T', categoryId: 'c1' }, products).code).toBeUndefined();
  });

  it('nome repetido não vale, mas editar o próprio produto vale', () => {
    expect(productErrors({ name: 'gelinho ', code: 'X', categoryId: 'c1' }, products).name).toBe(
      'Já existe um produto com esse nome',
    );
    expect(productErrors({ name: 'Gelinho', code: 'G', categoryId: 'c1' }, products, P)).toEqual({});
  });

  it('produto apagado não bloqueia nome nem sigla', () => {
    const list = [...products, product({ id: 'old', name: 'Bolo', code: 'Bo', deletedAt: 'x' })];
    expect(productErrors({ name: 'Bolo', code: 'Bo', categoryId: 'c1' }, list)).toEqual({});
  });
});

describe('categoria', () => {
  const categories = [category(), category({ id: 'c2', name: 'Tortas', order: 4 })];

  it('nome vazio ou repetido', () => {
    expect(categoryNameError('', categories)).toBe('Coloque o nome da categoria');
    expect(categoryNameError('tortas', categories)).toBe('Já existe uma categoria com esse nome');
    expect(categoryNameError('Tortas', categories, 'c2')).toBeNull();
    expect(categoryNameError('Cookies', categories)).toBeNull();
  });

  it('categoria nova vai para o fim', () => {
    expect(nextCategoryOrder(categories)).toBe(5);
    expect(nextCategoryOrder([])).toBe(1);
  });

  it('agrupa os produtos por categoria, na ordem', () => {
    const groups = catalogGroups(
      [category({ id: 'c2', name: 'Tortas', order: 4 }), category(), category({ id: 'c3', deletedAt: 'x' })],
      [...products, product({ id: 'parado', categoryId: 'c1', active: false, createdAt: 'd' })],
    );
    expect(groups.map((g) => g.category.id)).toEqual(['c1', 'c2']);
    expect(groups[0]!.products.map((p) => p.id)).toEqual([P, 'parado']);
  });
});

describe('uso do produto', () => {
  it('sabores: só receitas ativas', () => {
    const recipes = [
      recipe({ id: 'a', productId: P }),
      recipe({ id: 'b', productId: P, active: false }),
      recipe({ id: 'c', productId: P, deletedAt: 'x' }),
    ];
    expect(flavorCount(recipes, P)).toBe(1);
  });

  it('produto com fechamento ou receita está em uso', () => {
    expect(productInUse(P, { ...stockData(), recipes: [] })).toBe(false);
    expect(productInUse(P, { ...stockData({ weekCloses: [weekClose({ productId: P })] }), recipes: [] })).toBe(true);
    expect(productInUse(P, { ...stockData(), recipes: [recipe({ productId: P })] })).toBe(true);
    expect(productInUse(P, { ...stockData(), recipes: [recipe({ productId: P, deletedAt: 'x' })] })).toBe(false);
  });
});
