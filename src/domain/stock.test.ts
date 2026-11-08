import { describe, expect, it } from 'vitest';
import { consignmentStock, homeStock, stockByProduct, weekCloseDate } from './stock';
import { BUTCHER, OTHER, P, adjustment, delivery, sale, settlement, stockData, weekClose } from './testing';

describe('estoque em casa', () => {
  it('produzido − perdas − vendidos na mão − entregas + ajustes de casa', () => {
    const data = stockData({
      weekCloses: [weekClose({ produced: 60, loss: 2, soldDirect: 8 })],
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

  it('ignora registros apagados', () => {
    const data = stockData({
      weekCloses: [weekClose({ produced: 10 }), weekClose({ produced: 99, deletedAt: 'x' })],
      deliveries: [delivery({ quantity: 5, deletedAt: 'x' })],
    });
    expect(homeStock(data, P)).toBe(10);
  });

  it('fechamento importado do caderno não mexe no estoque', () => {
    const imported = weekClose({ id: 'w-import', produced: 0, soldDirect: 40 });
    const data = stockData({
      weekCloses: [imported, weekClose({ weekStart: '2026-11-09', produced: 10 })],
      sales: [sale({ origin: 'import', weekCloseId: 'w-import', quantity: 40 })],
    });
    expect(homeStock(data, P)).toBe(10);
  });

  it('o fechamento conta no domingo da semana', () => {
    expect(weekCloseDate({ weekStart: '2026-11-02' })).toBe('2026-11-08');
    const data = stockData({ weekCloses: [weekClose({ produced: 10 })] });
    expect(homeStock(data, P, { until: '2026-11-07' })).toBe(0);
    expect(homeStock(data, P, { until: '2026-11-08' })).toBe(10);
  });

  it('pode ignorar um fechamento (editar o fechamento)', () => {
    const data = stockData({ weekCloses: [weekClose({ id: 'w1', produced: 10 }), weekClose({ produced: 3 })] });
    expect(homeStock(data, P, { excludeWeekCloseId: 'w1' })).toBe(3);
  });

  it('separa por produto', () => {
    const data = stockData({
      weekCloses: [weekClose({ produced: 10 }), weekClose({ productId: OTHER, produced: 7 })],
    });
    expect(homeStock(data, P)).toBe(10);
    expect(homeStock(data, OTHER)).toBe(7);
    expect(homeStock(data, 'nada')).toBe(0);
  });
});

describe('estoque no Açougue', () => {
  const data = stockData({
    deliveries: [delivery({ quantity: 30 }), delivery({ quantity: 10, date: '2026-11-10' })],
    settlements: [settlement({ id: 'a1', soldQuantity: 20, loss: 2, remaining: 8 })],
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

  it('filtra por ponto e por data', () => {
    expect(consignmentStock(data, P, { pointId: 'outro' })).toBe(0);
    expect(consignmentStock(data, P, { until: '2026-11-05' })).toBe(33);
  });

  it('pode ignorar um acerto (editar acerto)', () => {
    expect(consignmentStock(data, P, { excludeSettlementId: 'a1' })).toBe(43);
  });

  it('entregar tira de casa e põe no Açougue', () => {
    const d = stockData({ weekCloses: [weekClose({ produced: 10 })], deliveries: [delivery({ quantity: 6 })] });
    expect(homeStock(d, P)).toBe(4);
    expect(consignmentStock(d, P)).toBe(6);
  });
});

describe('estoque por produto', () => {
  it('junta casa e Açougue', () => {
    const data = stockData({
      weekCloses: [weekClose({ produced: 10 })],
      deliveries: [delivery({ quantity: 4 })],
    });
    expect(stockByProduct(data, [P, OTHER])).toEqual([
      { productId: P, home: 6, consignment: 4 },
      { productId: OTHER, home: 0, consignment: 0 },
    ]);
  });
});
