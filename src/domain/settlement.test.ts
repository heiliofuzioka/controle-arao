import { describe, expect, it } from 'vitest';
import { computeSettlement, markPaid, receivableCents, saleFromSettlement } from './settlement';
import { settlement } from './testing';

describe('acerto', () => {
  it('vendidos = estoque antes − sobra − perda; valor = vendidos × preço', () => {
    expect(computeSettlement({ stockBefore: 40, remaining: 12, loss: 3, priceCents: 350 })).toEqual({
      ok: true,
      soldQuantity: 25,
      valueCents: 8750,
    });
  });

  it('aceita vender tudo e vender nada', () => {
    expect(computeSettlement({ stockBefore: 10, remaining: 0, loss: 0, priceCents: 500 })).toMatchObject({
      soldQuantity: 10,
      valueCents: 5000,
    });
    expect(computeSettlement({ stockBefore: 10, remaining: 10, loss: 0, priceCents: 500 })).toMatchObject({
      soldQuantity: 0,
      valueCents: 0,
    });
  });

  it('bloqueia quando sobra + perda passa do estoque', () => {
    const r = computeSettlement({ stockBefore: 10, remaining: 9, loss: 2, priceCents: 500 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('tinha 10');
  });

  it('bloqueia números negativos ou quebrados', () => {
    expect(computeSettlement({ stockBefore: 10, remaining: -1, loss: 0, priceCents: 500 }).ok).toBe(false);
    expect(computeSettlement({ stockBefore: 10, remaining: 1.5, loss: 0, priceCents: 500 }).ok).toBe(false);
    expect(computeSettlement({ stockBefore: 10, remaining: 0, loss: -2, priceCents: 500 }).ok).toBe(false);
  });

  it('cria a venda do acerto na data do acerto', () => {
    const s = settlement({ id: 'acerto-1', date: '2026-11-07', soldQuantity: 25, valueCents: 8750 });
    expect(saleFromSettlement(s, 'venda-1', 'agora')).toEqual({
      id: 'venda-1',
      createdAt: 'agora',
      updatedAt: 'agora',
      date: '2026-11-07',
      pointId: s.pointId,
      productId: s.productId,
      quantity: 25,
      valueCents: 8750,
      origin: 'settlement',
      settlementId: 'acerto-1',
    });
  });
});

describe('a receber', () => {
  it('soma só os acertos não pagos e não apagados', () => {
    const list = [
      settlement({ valueCents: 8750 }),
      settlement({ valueCents: 1000, paid: true, paidDate: '2026-11-03' }),
      settlement({ valueCents: 250 }),
      settlement({ valueCents: 7777, deletedAt: 'x' }),
    ];
    expect(receivableCents(list)).toBe(9000);
  });

  it('"Recebi" marca como pago, grava a data e atualiza updatedAt', () => {
    const s = settlement({ valueCents: 8750 });
    const paid = markPaid(s, '2026-11-09', 'agora');
    expect(paid).toMatchObject({ paid: true, paidDate: '2026-11-09', updatedAt: 'agora' });
    expect(s.paid).toBe(false);
    expect(receivableCents([paid])).toBe(0);
  });
});
