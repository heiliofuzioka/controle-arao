import { describe, expect, it } from 'vitest';
import {
  checkWeekClose,
  defaultWeekCloseValue,
  findWeekClose,
  isWeekClosed,
  planWeekClose,
} from './weekClose';
import { DIRECT, P, adjustment, delivery, sale, stockData, weekClose } from './testing';

const input = { weekStart: '2026-11-09', productId: P, produced: 10, loss: 0, soldDirect: 0 };

describe('conferir o card do fechamento', () => {
  // semana anterior deixou 2 em casa
  const data = stockData({ weekCloses: [weekClose({ id: 'w-prev', produced: 12, soldDirect: 10 })] });

  it('mostra o que tinha, o que dava para vender e o que sobrou', () => {
    expect(checkWeekClose(data, { ...input, soldDirect: 8 })).toEqual({
      ok: true,
      startStock: 2,
      delivered: 0,
      available: 12,
      leftover: 4,
    });
  });

  it('bloqueia vender mais do que tinha, com a conta', () => {
    const r = checkWeekClose(data, { ...input, soldDirect: 13 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Tinha 2 em casa + 10 feitos = 12. Vendeu 13.');
  });

  it('desconta perdas e o que foi levado ao Açougue na semana', () => {
    const d = { ...data, deliveries: [delivery({ date: '2026-11-11', quantity: 4 }), delivery({ date: '2026-11-20', quantity: 50 })] };
    const r = checkWeekClose(d, { ...input, loss: 1, soldDirect: 8 });
    expect(r).toMatchObject({ ok: false, startStock: 2, delivered: 4, available: 7, leftover: -1 });
    expect(r.error).toBe('Tinha 2 em casa + 10 feitos − 1 perdido − 4 no Açougue = 7. Vendeu 8.');
  });

  it('entrega de semana anterior já saiu do estoque do começo', () => {
    const d = { ...data, deliveries: [delivery({ date: '2026-11-05', quantity: 2 })] };
    expect(checkWeekClose(d, input).startStock).toBe(0);
  });

  it('a contagem de estoque feita durante a semana entra no que tinha', () => {
    const d = stockData({ adjustments: [adjustment({ date: '2026-11-10', delta: 5, reason: 'initial_count' })] });
    expect(checkWeekClose(d, { ...input, produced: 0, soldDirect: 5 })).toMatchObject({ ok: true, startStock: 5, leftover: 0 });
  });

  it('ao editar, não conta o próprio fechamento duas vezes', () => {
    const d = stockData({ weekCloses: [weekClose({ id: 'w1', weekStart: '2026-11-09', produced: 10, soldDirect: 10 })] });
    expect(checkWeekClose(d, { ...input, soldDirect: 10 }, 'w1')).toMatchObject({ ok: true, startStock: 0, leftover: 0 });
  });

  it('bloqueia números negativos ou quebrados', () => {
    expect(checkWeekClose(data, { ...input, produced: -1 }).ok).toBe(false);
    expect(checkWeekClose(data, { ...input, soldDirect: 1.5 }).ok).toBe(false);
    expect(checkWeekClose(data, { ...input, loss: -1 }).ok).toBe(false);
  });

  it('valor sugerido = vendidos × preço', () => {
    expect(defaultWeekCloseValue(8, 500)).toBe(4000);
  });
});

describe('achar o fechamento da semana', () => {
  const list = [
    weekClose({ id: 'a', weekStart: '2026-11-02' }),
    weekClose({ id: 'b', weekStart: '2026-11-09', deletedAt: 'x' }),
  ];

  it('acha por semana e produto, ignorando apagados', () => {
    expect(findWeekClose(list, '2026-11-02', P)?.id).toBe('a');
    expect(findWeekClose(list, '2026-11-09', P)).toBeUndefined();
  });

  it('diz se a semana foi fechada', () => {
    expect(isWeekClosed(list, '2026-11-02')).toBe(true);
    expect(isWeekClosed(list, '2026-11-09')).toBe(false);
  });
});

describe('salvar o fechamento', () => {
  let n = 0;
  const newId = () => `novo-${++n}`;
  const card = { ...input, soldDirect: 8, valueCents: 3800 };

  it('cria o fechamento e a venda na data do domingo', () => {
    n = 0;
    const plan = planWeekClose({ input: card, directPointId: DIRECT, newId, now: 'agora' });
    expect(plan.weekClose).toMatchObject({ id: 'novo-1', weekStart: '2026-11-09', produced: 10, soldDirect: 8, valueCents: 3800, createdAt: 'agora' });
    expect(plan.sale).toEqual({
      id: 'novo-2',
      createdAt: 'agora',
      updatedAt: 'agora',
      date: '2026-11-15',
      pointId: DIRECT,
      productId: P,
      quantity: 8,
      valueCents: 3800,
      origin: 'week_close',
      weekCloseId: 'novo-1',
    });
  });

  it('fechar de novo a mesma semana edita, não duplica', () => {
    const old = weekClose({ id: 'w1', weekStart: '2026-11-09', createdAt: 'antes', updatedAt: 'antes' });
    const oldSale = sale({ id: 's1', weekCloseId: 'w1', createdAt: 'antes', updatedAt: 'antes' });
    const plan = planWeekClose({ input: card, directPointId: DIRECT, existing: { weekClose: old, sale: oldSale }, newId, now: 'agora' });
    expect(plan.weekClose).toMatchObject({ id: 'w1', createdAt: 'antes', updatedAt: 'agora', soldDirect: 8 });
    expect(plan.sale).toMatchObject({ id: 's1', createdAt: 'antes', updatedAt: 'agora', quantity: 8, valueCents: 3800 });
  });

  it('semana sem venda na mão não cria venda', () => {
    const plan = planWeekClose({ input: { ...card, soldDirect: 0, valueCents: 0 }, directPointId: DIRECT, newId, now: 'agora' });
    expect(plan.sale).toBeUndefined();
  });

  it('se a venda zerou na edição, a venda antiga é marcada como apagada', () => {
    const old = weekClose({ id: 'w1', weekStart: '2026-11-09' });
    const oldSale = sale({ id: 's1', weekCloseId: 'w1' });
    const plan = planWeekClose({
      input: { ...card, soldDirect: 0, valueCents: 0 },
      directPointId: DIRECT,
      existing: { weekClose: old, sale: oldSale },
      newId,
      now: 'agora',
    });
    expect(plan.sale).toMatchObject({ id: 's1', deletedAt: 'agora' });
  });
});
