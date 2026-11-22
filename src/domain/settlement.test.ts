import { describe, expect, it } from 'vitest';
import { computeSettlement, markPaid, markUnpaid, planSettlement, receivableCents, saleFromSettlement } from './settlement';
import { BUTCHER, P, sale, settlement } from './testing';

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
    if (!r.ok) expect(r.error).toBe('Sobra e perda passam do que tinha no Açougue (10). Confira os números.');
    const r2 = computeSettlement({ stockBefore: 8, remaining: 10, loss: 0, priceCents: 800 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe('Sobrou mais do que tinha no Açougue (8). Confira os números.');
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

describe('desfazer o Recebi', () => {
  it('volta para a receber e tira a data do pagamento', () => {
    const paid = markPaid(settlement({ valueCents: 6400 }), '2026-11-09', 't1');
    const undone = markUnpaid(paid, 't2');
    expect(undone).toMatchObject({ paid: false, updatedAt: 't2' });
    expect('paidDate' in undone).toBe(false);
    expect(receivableCents([undone])).toBe(6400);
  });
});

describe('salvar o acerto', () => {
  let n = 0;
  const newId = () => `novo-${++n}`;
  const input = { date: '2026-11-22', pointId: BUTCHER, productId: P, remaining: 2, loss: 0, soldQuantity: 6, valueCents: 4800 };

  it('cria o acerto a receber e a venda na data do acerto', () => {
    n = 0;
    const plan = planSettlement({ input, newId, now: 'agora' });
    expect(plan.settlement).toMatchObject({ id: 'novo-1', paid: false, soldQuantity: 6, valueCents: 4800, createdAt: 'agora' });
    expect('paidDate' in plan.settlement).toBe(false);
    expect(plan.sale).toMatchObject({ id: 'novo-2', date: '2026-11-22', quantity: 6, valueCents: 4800, origin: 'settlement', settlementId: 'novo-1' });
  });

  it('acerto sem nada a receber já nasce recebido e não cria venda', () => {
    const plan = planSettlement({ input: { ...input, remaining: 6, loss: 2, soldQuantity: 0, valueCents: 0 }, newId, now: 'agora' });
    expect(plan.settlement).toMatchObject({ paid: true, paidDate: '2026-11-22', loss: 2 });
    expect(plan.sale).toBeUndefined();
  });

  it('editar mantém o id, a venda e o Recebi', () => {
    const old = settlement({ id: 'a1', createdAt: 'antes', paid: true, paidDate: '2026-11-23', valueCents: 4800, soldQuantity: 6 });
    const oldSale = sale({ id: 's1', settlementId: 'a1', origin: 'settlement', createdAt: 'antes' });
    const plan = planSettlement({ input: { ...input, remaining: 3, soldQuantity: 5, valueCents: 4000 }, existing: { settlement: old, sale: oldSale }, newId, now: 'depois' });
    expect(plan.settlement).toMatchObject({ id: 'a1', createdAt: 'antes', updatedAt: 'depois', paid: true, paidDate: '2026-11-23', valueCents: 4000 });
    expect(plan.sale).toMatchObject({ id: 's1', createdAt: 'antes', updatedAt: 'depois', quantity: 5, valueCents: 4000 });
  });

  it('se a venda zerou na edição, a venda antiga é marcada como apagada', () => {
    const old = settlement({ id: 'a1', valueCents: 4800 });
    const oldSale = sale({ id: 's1', settlementId: 'a1', origin: 'settlement' });
    const plan = planSettlement({ input: { ...input, soldQuantity: 0, valueCents: 0 }, existing: { settlement: old, sale: oldSale }, newId, now: 'depois' });
    expect(plan.sale).toMatchObject({ id: 's1', deletedAt: 'depois' });
    expect(plan.settlement.paid).toBe(true);
  });
});
