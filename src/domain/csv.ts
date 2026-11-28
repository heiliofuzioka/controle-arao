// Planilha CSV (Ajustes → Exportar planilha): um lançamento por linha, para abrir no Excel.
import { alive } from './records';
import type {
  Delivery,
  Expense,
  ExpenseCategory,
  PersonalExpense,
  Product,
  Sale,
  SalesPoint,
  Settlement,
} from './types';

export const CSV_HEADER = ['Data', 'Tipo', 'Produto', 'Quantidade', 'Valor (R$)', 'Categoria', 'Descrição', 'Situação'];

export interface CsvData {
  sales: Sale[];
  deliveries: Delivery[];
  settlements: Settlement[];
  expenses: Expense[];
  personalExpenses: PersonalExpense[];
  products: Product[];
  points: SalesPoint[];
  expenseCategories: ExpenseCategory[];
}

/** "2026-11-08" → "08/11/2026" (o Excel em português reconhece como data). */
const brDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

/** Centavos → "1234,50" (sem ponto de milhar, vírgula decimal: vira número no Excel em português). */
const brMoney = (cents: number) => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
};

/** Campo com ; aspas ou quebra de linha vai entre aspas. Começo com = + - @ ganha ' (não vira fórmula). */
function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text) && !/^-?\d/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Linhas da planilha (sem cabeçalho), da data mais antiga para a mais nova. */
export function csvRows(data: CsvData): string[][] {
  const product = new Map(data.products.map((p) => [p.id, p.name]));
  const point = new Map(data.points.map((p) => [p.id, p]));
  const category = new Map(data.expenseCategories.map((c) => [c.id, c.name]));
  const settlement = new Map(data.settlements.map((s) => [s.id, s]));
  const rows: { date: string; order: number; cells: string[] }[] = [];

  for (const sale of alive(data.sales)) {
    const consignment = point.get(sale.pointId)?.mode === 'consignment';
    const paid = sale.settlementId ? settlement.get(sale.settlementId)?.paid : true;
    rows.push({
      date: sale.date,
      order: 0,
      cells: [
        brDate(sale.date),
        sale.origin === 'import' ? (consignment ? 'Venda no Açougue (caderno)' : 'Venda (caderno)') : consignment ? 'Venda no Açougue' : 'Venda',
        product.get(sale.productId) ?? '',
        String(sale.quantity),
        brMoney(sale.valueCents),
        '',
        '',
        paid ? 'Recebido' : 'A receber',
      ],
    });
  }
  for (const delivery of alive(data.deliveries)) {
    rows.push({
      date: delivery.date,
      order: 1,
      cells: [brDate(delivery.date), 'Entrega no Açougue', product.get(delivery.productId) ?? '', String(delivery.quantity), '', '', '', ''],
    });
  }
  for (const expense of alive(data.expenses)) {
    rows.push({
      date: expense.date,
      order: 2,
      cells: [
        brDate(expense.date),
        'Despesa',
        '',
        '',
        brMoney(expense.valueCents),
        category.get(expense.categoryId) ?? '',
        expense.description ?? '',
        '',
      ],
    });
  }
  for (const personal of alive(data.personalExpenses)) {
    rows.push({
      date: personal.date,
      order: 3,
      cells: [brDate(personal.date), 'Gasto pessoal', '', '', brMoney(personal.valueCents), '', personal.description ?? '', ''],
    });
  }

  return rows
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
    .map((r) => r.cells);
}

/** Texto do arquivo: separador ";" e quebra CRLF (padrão do Excel em português), com BOM para os acentos. */
export function buildCsv(data: CsvData): string {
  const lines = [CSV_HEADER, ...csvRows(data)].map((row) => row.map(cell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}
