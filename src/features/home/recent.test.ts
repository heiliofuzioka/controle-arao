import { describe, expect, it } from 'vitest';
import { OTHER, expense, expenseCategory, personal, sale, weekClose } from '../../domain/testing';
import { entryValueCents, recentEntries } from './recent';

const empty = { weekCloses: [], sales: [], expenses: [], expenseCategories: [], personalExpenses: [] };

describe('últimos lançamentos', () => {
  it('junta os produtos de uma semana numa linha só', () => {
    const entries = recentEntries({
      ...empty,
      weekCloses: [
        weekClose({ weekStart: '2026-11-02', produced: 40, soldDirect: 36, valueCents: 18000 }),
        weekClose({ weekStart: '2026-11-02', productId: OTHER, produced: 48, loss: 2, soldDirect: 16, valueCents: 12800 }),
        weekClose({ weekStart: '2026-11-02', produced: 99, deletedAt: 'x' }),
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'week',
      weekStart: '2026-11-02',
      date: '2026-11-08',
      totals: { produced: 88, loss: 2, soldDirect: 52, valueCents: 30800 },
    });
    expect(entryValueCents(entries[0]!)).toBe(30800);
  });

  it('não mostra semanas importadas do caderno', () => {
    const entries = recentEntries({
      ...empty,
      weekCloses: [weekClose({ id: 'w-import', weekStart: '2026-08-03' })],
      sales: [sale({ origin: 'import', weekCloseId: 'w-import' })],
    });
    expect(entries).toEqual([]);
  });

  it('ordena do mais novo para o mais antigo e esconde os apagados', () => {
    const entries = recentEntries({
      ...empty,
      weekCloses: [weekClose({ weekStart: '2026-11-02' })], // conta no domingo, 08/11
      expenseCategories: [expenseCategory({ id: 'gas', name: 'Gás' })],
      expenses: [
        expense({ id: 'e1', date: '2026-11-09', valueCents: 4200, categoryId: 'gas' }),
        expense({ id: 'e2', date: '2026-11-01', valueCents: 100, categoryId: 'sumiu' }),
        expense({ id: 'e3', date: '2026-11-10', deletedAt: 'x' }),
      ],
      personalExpenses: [personal({ id: 'p1', date: '2026-11-05', valueCents: 2500 })],
    });
    expect(entries.map((e) => e.key)).toEqual(['e1', 'week-2026-11-02', 'p1', 'e2']);
    expect(entries[0]).toMatchObject({ kind: 'expense', categoryName: 'Gás' });
    expect(entries[3]).toMatchObject({ categoryName: 'Despesa' });
  });

  it('no mesmo dia, o que foi mexido por último vem primeiro', () => {
    const entries = recentEntries({
      ...empty,
      personalExpenses: [
        personal({ id: 'cedo', date: '2026-11-05', updatedAt: '2026-11-05T10:00:00.000Z' }),
        personal({ id: 'tarde', date: '2026-11-05', updatedAt: '2026-11-05T18:00:00.000Z' }),
      ],
    });
    expect(entries.map((e) => e.key)).toEqual(['tarde', 'cedo']);
  });

  it('respeita o limite', () => {
    const personalExpenses = Array.from({ length: 5 }, (_, i) => personal({ date: `2026-11-0${i + 1}` }));
    expect(recentEntries({ ...empty, personalExpenses }, 3)).toHaveLength(3);
  });
});
