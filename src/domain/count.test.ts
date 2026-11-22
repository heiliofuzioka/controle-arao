import { describe, expect, it } from 'vitest';
import { isCounted, planStockCount } from './count';
import { consignmentStock, homeStock } from './stock';
import { BUTCHER, OTHER, P, adjustment, delivery, sale, stockData, weekClose } from './testing';

describe('produto contado ou não', () => {
  it('sem nenhum registro: ainda não contado', () => {
    expect(isCounted(stockData(), P)).toBe(false);
  });

  it('contagem, fechamento ou entrega contam como registro', () => {
    expect(isCounted(stockData({ adjustments: [adjustment()] }), P)).toBe(true);
    expect(isCounted(stockData({ weekCloses: [weekClose()] }), P)).toBe(true);
    expect(isCounted(stockData({ deliveries: [delivery()] }), P)).toBe(true);
    expect(isCounted(stockData({ adjustments: [adjustment({ deletedAt: 'x' })] }), P)).toBe(false);
  });

  it('fechamento importado do caderno não conta', () => {
    const data = stockData({ weekCloses: [weekClose({ id: 'imp' })], sales: [sale({ origin: 'import', weekCloseId: 'imp' })] });
    expect(isCounted(data, P)).toBe(false);
  });
});

describe('contar estoque', () => {
  let n = 0;
  const newId = () => `aj-${++n}`;

  it('primeira contagem cria ajustes iniciais em casa e no Açougue', () => {
    const plan = planStockCount({
      data: stockData(),
      counts: [{ productId: P, home: 30, consignment: 4 }, { productId: OTHER, home: 0, consignment: 0 }],
      date: '2026-11-22',
      consignmentPointId: BUTCHER,
      newId,
      now: 'agora',
    });
    expect(plan.map((a) => [a.productId, a.location, a.pointId, a.delta, a.reason])).toEqual([
      [P, 'home', undefined, 30, 'initial_count'],
      [P, 'consignment', BUTCHER, 4, 'initial_count'],
      [OTHER, 'home', undefined, 0, 'initial_count'], // contou zero: fica registrado
    ]);
    expect(isCounted(stockData({ adjustments: plan }), OTHER)).toBe(true);
    const after = stockData({ adjustments: plan });
    expect(homeStock(after, P)).toBe(30);
    expect(consignmentStock(after, P)).toBe(4);
  });

  it('recontar corrige só a diferença', () => {
    const data = stockData({ weekCloses: [weekClose({ produced: 20, soldDirect: 5 })], deliveries: [delivery({ quantity: 10 })] });
    // calculado: em casa 5, no Açougue 10
    const plan = planStockCount({
      data,
      counts: [{ productId: P, home: 3, consignment: 10 }],
      date: '2026-11-22',
      consignmentPointId: BUTCHER,
      newId,
      now: 'agora',
    });
    expect(plan.map((a) => [a.location, a.delta, a.reason])).toEqual([['home', -2, 'correction']]);
  });
});
