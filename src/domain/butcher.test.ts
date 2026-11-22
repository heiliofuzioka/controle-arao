import { describe, expect, it } from 'vitest';
import { butcherSummary } from './butcher';
import { BUTCHER, OTHER, P, delivery, product, settlement, stockData } from './testing';

const products = [product({ id: P, name: 'Gelinho' }), product({ id: OTHER, name: 'Brownie' })];

describe('tela do Açougue', () => {
  it('sem nada entregue', () => {
    const s = butcherSummary(stockData(), products, BUTCHER);
    expect(s).toMatchObject({ receivableCents: 0, pending: [], hasDeliveries: false });
    expect(s.stock.map((r) => [r.product.id, r.quantity, r.lastDelivery])).toEqual([
      [P, 0, undefined],
      [OTHER, 0, undefined],
    ]);
  });

  it('a receber, pendentes em ordem e o que está lá agora', () => {
    const data = stockData({
      deliveries: [
        delivery({ productId: OTHER, quantity: 16, date: '2026-10-28' }),
        delivery({ productId: OTHER, quantity: 4, date: '2026-11-05' }),
        delivery({ productId: P, quantity: 5, date: '2026-11-07', pointId: 'outro' }),
      ],
      settlements: [
        settlement({ id: 'novo', productId: OTHER, date: '2026-11-08', soldQuantity: 2, valueCents: 1600 }),
        settlement({ id: 'velho', productId: OTHER, date: '2026-10-31', soldQuantity: 8, valueCents: 6400 }),
        settlement({ id: 'pago', productId: OTHER, date: '2026-10-20', soldQuantity: 1, valueCents: 800, paid: true }),
        settlement({ id: 'apagado', productId: OTHER, date: '2026-10-21', valueCents: 999, deletedAt: 'x' }),
      ],
    });
    const s = butcherSummary(data, products, BUTCHER);
    expect(s.receivableCents).toBe(8000);
    expect(s.pending.map((p) => p.id)).toEqual(['velho', 'novo']);
    expect(s.hasDeliveries).toBe(true);
    // Brownie: 20 entregues − 11 vendidos
    expect(s.stock.find((r) => r.product.id === OTHER)).toMatchObject({ quantity: 9, lastDelivery: '2026-11-05' });
    // entrega de outro ponto não conta
    expect(s.stock.find((r) => r.product.id === P)).toMatchObject({ quantity: 0, lastDelivery: undefined });
  });
});
