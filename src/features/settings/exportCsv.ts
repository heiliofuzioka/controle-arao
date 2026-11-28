import { backupFileName } from '../../db/backup';
import { db } from '../../db/db';
import { buildCsv } from '../../domain/csv';
import { shareFile } from '../../lib/share';

/** Monta a planilha com todos os lançamentos e entrega pelo compartilhar do iPhone. */
export async function exportCsv(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const [sales, deliveries, settlements, expenses, personalExpenses, products, points, expenseCategories] = await Promise.all([
    db.sales.toArray(),
    db.deliveries.toArray(),
    db.settlements.toArray(),
    db.expenses.toArray(),
    db.personalExpenses.toArray(),
    db.products.toArray(),
    db.salesPoints.toArray(),
    db.expenseCategories.toArray(),
  ]);
  const csv = buildCsv({ sales, deliveries, settlements, expenses, personalExpenses, products, points, expenseCategories });
  return shareFile(csv, backupFileName(new Date(), 'csv'), 'text/csv');
}
