import { useLiveQuery } from 'dexie-react-hooks';
import { EntryList, EntryRow, IconBadge, ProductBadge } from '../../components/EntryList';
import { db } from '../../db/db';
import { formatCount, formatShortDate, formatWeekLabel } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { recentEntries, type RecentEntry } from './recent';

const joinDetail = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ');

/**
 * PROVISÓRIO: "Últimos lançamentos" no fim do Início, para editar e apagar despesas e
 * gastos pessoais até o Fechamento do mês (passo 6c) ter as listas dele.
 */
export function RecentList({ onOpen }: { onOpen: (entry: RecentEntry) => void }) {
  const entries = useLiveQuery(async () => {
    const [weekCloses, sales, expenses, expenseCategories, personalExpenses, deliveries, settlements, products] =
      await Promise.all([
        db.weekCloses.toArray(),
        db.sales.toArray(),
        db.expenses.toArray(),
        db.expenseCategories.toArray(),
        db.personalExpenses.toArray(),
        db.deliveries.toArray(),
        db.settlements.toArray(),
        db.products.toArray(),
      ]);
    return recentEntries(
      { weekCloses, sales, expenses, expenseCategories, personalExpenses, deliveries, settlements, products },
      15,
    );
  }, []);

  if (!entries || entries.length === 0) return null;
  return (
    <EntryList>
      {entries.map((entry) => (
        <RecentRow key={entry.key} entry={entry} onClick={() => onOpen(entry)} />
      ))}
    </EntryList>
  );
}

function RecentRow({ entry, onClick }: { entry: RecentEntry; onClick: () => void }) {
  if (entry.kind === 'week') {
    const { produced, soldDirect } = entry.totals;
    return (
      <EntryRow
        badge={<IconBadge icon="calendar" />}
        title={formatWeekLabel(entry.weekStart)}
        detail={`Produziu ${produced} · vendeu ${soldDirect} na mão`}
        value={formatCents(entry.totals.valueCents)}
        onClick={onClick}
      />
    );
  }
  if (entry.kind === 'expense') {
    return (
      <EntryRow
        badge={<IconBadge icon="receipt" />}
        title={entry.categoryName}
        detail={joinDetail(entry.expense.description, formatShortDate(entry.date))}
        value={`− ${formatCents(entry.expense.valueCents)}`}
        onClick={onClick}
      />
    );
  }
  if (entry.kind === 'delivery') {
    return (
      <EntryRow
        badge={<ProductBadge code={entry.product?.code ?? '?'} />}
        title={`Entrega · ${formatCount(entry.delivery.quantity, entry.product?.name ?? 'produto')}`}
        detail={`Açougue · ${formatShortDate(entry.date)}`}
        onClick={onClick}
      />
    );
  }
  if (entry.kind === 'settlement') {
    const s = entry.settlement;
    return (
      <EntryRow
        badge={<ProductBadge code={entry.product?.code ?? '?'} />}
        title={`Acerto · ${formatCount(s.soldQuantity, entry.product?.name ?? 'produto')}`}
        detail={joinDetail(s.paid ? 'Recebido' : 'A receber', formatShortDate(entry.date))}
        value={formatCents(s.valueCents)}
        onClick={onClick}
      />
    );
  }
  return (
    <EntryRow
      badge={<IconBadge icon="wallet" />}
      title="Gasto pessoal"
      detail={joinDetail(entry.personalExpense.description, formatShortDate(entry.date))}
      value={`− ${formatCents(entry.personalExpense.valueCents)}`}
      onClick={onClick}
    />
  );
}
