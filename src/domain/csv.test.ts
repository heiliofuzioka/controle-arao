import { describe, expect, it } from 'vitest';
import { buildCsv, csvRows, type CsvData } from './csv';
import { BUTCHER, delivery, expense, expenseCategory, personal, points, product, sale, settlement } from './testing';

const data = (o: Partial<CsvData> = {}): CsvData => ({
  sales: [],
  deliveries: [],
  settlements: [],
  expenses: [],
  personalExpenses: [],
  products: [product({ name: 'Gelinho' })],
  points,
  expenseCategories: [expenseCategory({ id: 'ing', name: 'Ingredientes' })],
  ...o,
});

describe('planilha CSV', () => {
  it('uma linha por lançamento, por data', () => {
    const rows = csvRows(
      data({
        sales: [
          sale({ date: '2026-11-08', quantity: 30, valueCents: 15000 }),
          sale({ date: '2026-11-10', pointId: BUTCHER, quantity: 4, valueCents: 2000, origin: 'settlement', settlementId: 's1' }),
          sale({ date: '2026-11-01', quantity: 9, valueCents: 999, deletedAt: 'x' }),
        ],
        settlements: [settlement({ id: 's1', paid: false })],
        deliveries: [delivery({ date: '2026-11-04', quantity: 10 })],
        expenses: [expense({ date: '2026-11-08', valueCents: 123456, categoryId: 'ing', description: 'Mercado' })],
        personalExpenses: [personal({ date: '2026-11-02', valueCents: 5000 })],
      }),
    );
    expect(rows).toEqual([
      ['02/11/2026', 'Gasto pessoal', '', '', '50,00', '', '', ''],
      ['04/11/2026', 'Entrega no Açougue', 'Gelinho', '10', '', '', '', ''],
      ['08/11/2026', 'Venda', 'Gelinho', '30', '150,00', '', '', 'Recebido'],
      ['08/11/2026', 'Despesa', '', '', '1234,56', 'Ingredientes', 'Mercado', ''],
      ['10/11/2026', 'Venda no Açougue', 'Gelinho', '4', '20,00', '', '', 'A receber'],
    ]);
  });

  it('arquivo com BOM, ";" e campos protegidos', () => {
    const csv = buildCsv(
      data({ personalExpenses: [personal({ date: '2026-11-02', valueCents: 5, description: '=SOMA(1;2) "x"' })] }),
    );
    expect(csv.startsWith('﻿Data;Tipo;Produto;Quantidade;Valor (R$);Categoria;Descrição;Situação\r\n')).toBe(true);
    expect(csv).toContain(`02/11/2026;Gasto pessoal;;;0,05;;"'=SOMA(1;2) ""x""";\r\n`);
  });
});
