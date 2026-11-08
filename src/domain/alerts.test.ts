import { describe, expect, it } from 'vitest';
import { alerts, isBackupOverdue, overdueSettlements, previousWeekUnclosed, productsWithoutRecipe } from './alerts';
import { OTHER, P, product, recipe, settlement, weekClose } from './testing';

const today = '2026-11-08';

describe('alertas do Painel', () => {
  it('backup com mais de 7 dias ou nunca feito', () => {
    expect(isBackupOverdue(undefined, today)).toBe(true);
    expect(isBackupOverdue('2026-11-01', today)).toBe(false); // 7 dias
    expect(isBackupOverdue('2026-10-31', today)).toBe(true); // 8 dias
  });

  it('acerto a receber há mais de 14 dias', () => {
    const list = [
      settlement({ id: 'velho', date: '2026-10-24' }), // 15 dias
      settlement({ id: 'limite', date: '2026-10-25' }), // 14 dias
      settlement({ id: 'pago', date: '2026-10-01', paid: true }),
    ];
    expect(overdueSettlements(list, today).map((s) => s.id)).toEqual(['velho']);
  });

  it('produto ativo sem sabor ativo', () => {
    const products = [product({ id: P }), product({ id: OTHER }), product({ id: 'inativo', active: false })];
    const recipes = [recipe({ productId: OTHER }), recipe({ productId: P, active: false })];
    expect(productsWithoutRecipe(products, recipes).map((p) => p.id)).toEqual([P]);
  });

  it('semana anterior sem fechamento', () => {
    expect(previousWeekUnclosed([], today)).toBe('2026-10-26');
    expect(previousWeekUnclosed([weekClose({ weekStart: '2026-10-26' })], today)).toBeNull();
  });

  it('junta os alertas na ordem', () => {
    const list = alerts({
      today,
      lastBackup: '2026-11-07',
      settlements: [settlement({ id: 'velho', date: '2026-10-01' })],
      products: [product({ id: P })],
      recipes: [recipe({ productId: P })],
      weekCloses: [],
    });
    expect(list).toEqual([
      { kind: 'settlement_overdue', settlementIds: ['velho'] },
      { kind: 'week_unclosed', weekStart: '2026-10-26' },
    ]);
  });
});
