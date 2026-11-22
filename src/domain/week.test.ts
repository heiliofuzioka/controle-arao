import { describe, expect, it } from 'vitest';
import { BUTCHER, OTHER, P, delivery, points, product, sale, settlement, stockData, weekClose } from './testing';
import { weekProductEntries, weekReport } from './week';

const products = [product({ id: P, name: 'Gelinho' }), product({ id: OTHER, name: 'Brownie', code: 'B' })];
const WEEK = '2026-11-02'; // 2 a 8 de nov

describe('relatório da semana', () => {
  it('semana não fechada e sem vendas', () => {
    const r = weekReport({ ...stockData(), points }, products, WEEK);
    expect(r).toMatchObject({ closed: false, revenueCents: 0, hasData: false });
  });

  it('faturamento, na mão × Açougue e por produto', () => {
    const data = {
      ...stockData({
        weekCloses: [
          weekClose({ id: 'w1', productId: P, produced: 40, soldDirect: 36, valueCents: 18000 }),
          weekClose({ id: 'w2', productId: OTHER, produced: 48, loss: 2, soldDirect: 16, valueCents: 12800 }),
        ],
        sales: [
          sale({ productId: P, quantity: 36, valueCents: 18000, weekCloseId: 'w1' }),
          sale({ productId: OTHER, quantity: 16, valueCents: 12800, weekCloseId: 'w2' }),
          sale({ productId: OTHER, date: '2026-11-07', pointId: BUTCHER, origin: 'settlement', quantity: 12, valueCents: 9600 }),
          sale({ productId: OTHER, date: '2026-11-10', pointId: BUTCHER, origin: 'settlement', quantity: 99, valueCents: 1 }), // outra semana
        ],
        deliveries: [delivery({ productId: OTHER, date: '2026-11-05', quantity: 30 })],
        settlements: [settlement({ productId: OTHER, date: '2026-11-07', soldQuantity: 12 })],
      }),
      points,
    };
    const r = weekReport(data, products, WEEK);
    expect(r).toMatchObject({
      closed: true,
      revenueCents: 40400,
      produced: 88,
      sold: 64,
      direct: { valueCents: 30800, quantity: 52 },
      consignment: { valueCents: 9600, quantity: 12 },
      hasData: true,
    });
    expect(r.rows.map((x) => [x.product.id, x.produced, x.sold, x.leftover, x.revenueCents])).toEqual([
      [P, 40, 36, 4, 18000],
      [OTHER, 48, 28, 0, 22400], // 48 − 2 − 16 − 30 = 0 em casa
    ]);
    expect(r.leftover).toBe(4);
  });

  it('semana não fechada mas com acerto do Açougue tem dados', () => {
    const data = {
      ...stockData({ sales: [sale({ date: '2026-11-04', pointId: BUTCHER, origin: 'settlement', quantity: 2, valueCents: 1600 })] }),
      points,
    };
    expect(weekReport(data, products, WEEK)).toMatchObject({ closed: false, revenueCents: 1600, hasData: true });
  });
});

describe('lançamentos de um produto na semana', () => {
  it('fechamento primeiro, depois entregas e acertos pela data', () => {
    const data = stockData({
      weekCloses: [weekClose({ id: 'w', productId: OTHER }), weekClose({ productId: P })],
      deliveries: [delivery({ id: 'd', productId: OTHER, date: '2026-11-05' }), delivery({ productId: OTHER, date: '2026-11-12' })],
      settlements: [
        settlement({ id: 'a2', productId: OTHER, date: '2026-11-08' }),
        settlement({ id: 'a1', productId: OTHER, date: '2026-11-07' }),
        settlement({ productId: OTHER, date: '2026-11-06', deletedAt: 'x' }),
      ],
    });
    const entries = weekProductEntries(data, OTHER, WEEK);
    expect(entries.map((e) => [e.kind, e.date])).toEqual([
      ['weekClose', '2026-11-08'],
      ['delivery', '2026-11-05'],
      ['settlement', '2026-11-07'],
      ['settlement', '2026-11-08'],
    ]);
  });

  it('não mostra o fechamento importado do caderno', () => {
    const data = stockData({
      weekCloses: [weekClose({ id: 'imp', productId: P })],
      sales: [sale({ origin: 'import', weekCloseId: 'imp' })],
    });
    expect(weekProductEntries(data, P, WEEK)).toEqual([]);
  });
});
