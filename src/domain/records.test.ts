import { describe, expect, it } from 'vitest';
import { alive, newBase, softDelete, touch } from './records';
import { product } from './testing';

describe('registros', () => {
  it('registro novo nasce com createdAt = updatedAt e sem deletedAt', () => {
    expect(newBase('id-1', 'agora')).toEqual({ id: 'id-1', createdAt: 'agora', updatedAt: 'agora' });
  });

  it('editar atualiza updatedAt e mantém createdAt', () => {
    const p = product({ createdAt: 'antes', updatedAt: 'antes', priceCents: 0 });
    expect(touch(p, { priceCents: 500 }, 'agora')).toMatchObject({ priceCents: 500, createdAt: 'antes', updatedAt: 'agora' });
  });

  it('apagar só marca deletedAt; alive() esconde', () => {
    const p = product();
    const gone = softDelete(p, 'agora');
    expect(gone).toMatchObject({ id: p.id, deletedAt: 'agora', updatedAt: 'agora' });
    expect(alive([p, gone])).toEqual([p]);
  });
});
