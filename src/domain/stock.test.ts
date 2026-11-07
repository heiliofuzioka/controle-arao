import { describe, expect, it } from 'vitest';
import { consignmentStock, homeStock, stockByProduct } from './stock';
import {
  BUTCHER,
  OTHER,
  P,
  adjustment,
  delivery,
  production,
  sale,
  settlement,
  stockData,
} from './testing';

describe('estoque em casa', () => {
  it('produção − perdas − vendas diretas − entregas + ajustes de casa', () => {
    const data = stockData({
      productions: [production({ quantity: 50, loss: 2 }), production({ quantity: 10 })],
      sales: [sale({ quantity: 8 })],
      deliveries: [delivery({ quantity: 20 })],
      adjustments: [
        adjustment({ delta: 5, reason: 'initial_count' }),
        adjustment({ delta: -1 }),
        adjustment({ delta: 100, location: 'consignment', pointId: BUTCHER }),
      ],
    });
    // 60 − 2 − 8 − 20 + 5 − 1
    expect(homeStock(data, P)).toBe(34);
  });

  it('vendas do acerto e importadas não saem de casa', () => {
    const data = stockData({
      productions: [production({ quantity: 10 })],
      sales: [sale({ quantity: 4, origin: 'settlement' }), sale({ quantity: 3, origin: 'import' })],
    });
    expect(homeStock(data, P)).toBe(10);
  });

  it('separa por produto', () => {
    const data = stockData({
      productions: [production({ quantity: 10 }), production({ productId: OTHER, quantity: 7 })],
    });
    expect(homeStock(data, P)).toBe(10);
    expect(homeStock(data, OTHER)).toBe(7);
    expect(homeStock(data, 'nada')).toBe(0);
  });
});

describe('estoque no Açougue', () => {
  const data = stockData({
    deliveries: [delivery({ quantity: 30 }), delivery({ quantity: 10 })],
    settlements: [settlement({ id: 'a1', soldQuantity: 20, loss: 2, remaining: 18 })],
    adjustments: [
      adjustment({ location: 'consignment', pointId: BUTCHER, delta: 3, reason: 'initial_count' }),
      adjustment({ location: 'home', delta: 50 }),
    ],
  });

  it('entregas − vendidos − perdas nos acertos + ajustes do Açougue', () => {
    // 40 − 20 − 2 + 3
    expect(consignmentStock(data, P)).toBe(21);
    expect(consignmentStock(data, P, { pointId: BUTCHER })).toBe(21);
  });

  it('filtra por ponto', () => {
    expect(consignmentStock(data, P, { pointId: 'outro' })).toBe(0);
  });

  it('pode ignorar um acerto (editar acerto)', () => {
    expect(consignmentStock(data, P, { excludeSettlementId: 'a1' })).toBe(43);
  });

  it('entregar tira de casa e põe no Açougue', () => {
    const d = stockData({ productions: [production({ quantity: 10 })], deliveries: [delivery({ quantity: 6 })] });
    expect(homeStock(d, P)).toBe(4);
    expect(consignmentStock(d, P)).toBe(6);
  });
});

describe('estoque por produto', () => {
  it('junta casa e Açougue', () => {
    const data = stockData({
      productions: [production({ quantity: 10 })],
      deliveries: [delivery({ quantity: 4 })],
    });
    expect(stockByProduct(data, [P, OTHER])).toEqual([
      { productId: P, home: 6, consignment: 4 },
      { productId: OTHER, home: 0, consignment: 0 },
    ]);
  });
});
