import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shortcut } from '../../components/buttons';
import { EntryList, EntryRow, IconBadge, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import type { Delivery, Expense, LocalDate, PersonalExpense, Settlement } from '../../domain/types';
import { formatCount, formatShortDate, formatWeekLabel } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { isStandalone } from '../../lib/standalone';
import { DeliverySheet } from '../butcher/DeliverySheet';
import { SettlementSheet } from '../butcher/SettlementSheet';
import { ExpenseSheet } from '../expense/ExpenseSheet';
import { PersonalExpenseSheet } from '../personal/PersonalExpenseSheet';
import { WeekCloseSheet } from '../week-close/WeekCloseSheet';
import styles from './HomePage.module.css';
import { recentEntries, type RecentEntry } from './recent';

type OpenSheet =
  | { kind: 'week'; weekStart?: LocalDate }
  | { kind: 'expense'; expense?: Expense }
  | { kind: 'personal'; personalExpense?: PersonalExpense }
  | { kind: 'delivery'; delivery: Delivery }
  | { kind: 'settlement'; settlement: Settlement }
  | null;

const joinDetail = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ');

/**
 * Início PROVISÓRIO: os atalhos e a lista dos últimos lançamentos, para abrir,
 * editar e apagar. O Início de verdade (totais, estoque, meta, avisos) é do passo 6.
 */
export function HomePage() {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const installed = isStandalone();
  const navigate = useNavigate();

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
    return recentEntries({
      weekCloses,
      sales,
      expenses,
      expenseCategories,
      personalExpenses,
      deliveries,
      settlements,
      products,
    });
  }, []);

  // O aviso de "salvo" some sozinho.
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const close = () => setSheet(null);
  const saved = (text: string) => {
    setSheet(null);
    setMessage(text);
  };

  const open = (entry: RecentEntry) => {
    if (entry.kind === 'week') setSheet({ kind: 'week', weekStart: entry.weekStart });
    else if (entry.kind === 'expense') setSheet({ kind: 'expense', expense: entry.expense });
    else if (entry.kind === 'personal') setSheet({ kind: 'personal', personalExpense: entry.personalExpense });
    else if (entry.kind === 'delivery') setSheet({ kind: 'delivery', delivery: entry.delivery });
    else setSheet({ kind: 'settlement', settlement: entry.settlement });
  };

  return (
    <TabLayout>
      <header className={styles.header}>
        <img className={styles.mascot} src={`${import.meta.env.BASE_URL}brand/arao-mascote-azul.svg`} alt="" />
        <h1 className={styles.title}>Olá, Arão!</h1>
      </header>

      {message && <Notice kind="success">{message}</Notice>}

      {!installed && (
        <Notice action={{ label: 'Como fazer', onClick: () => setShowInstall((v) => !v) }}>
          Instale o app na Tela de Início
        </Notice>
      )}
      {!installed && showInstall && (
        <p className={styles.hint}>
          No Safari, toque em Compartilhar, escolha Adicionar à Tela de Início e abra pelo ícone do papagaio.
        </p>
      )}

      <nav className={styles.shortcuts} aria-label="Lançar">
        <Shortcut icon="calendar" highlight onClick={() => setSheet({ kind: 'week' })}>
          Fechar a semana
        </Shortcut>
        <Shortcut icon="store" onClick={() => navigate('/acougue')}>
          Açougue
        </Shortcut>
        <Shortcut icon="receipt" onClick={() => setSheet({ kind: 'expense' })}>
          Despesa
        </Shortcut>
        <Shortcut icon="wallet" onClick={() => setSheet({ kind: 'personal' })}>
          Gasto pessoal
        </Shortcut>
      </nav>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Últimos lançamentos</h2>
        {entries && entries.length === 0 && (
          <p className={styles.hint}>Nada lançado ainda. Comece fechando a semana.</p>
        )}
        {entries && entries.length > 0 && (
          <EntryList>
            {entries.map((entry) => (
              <RecentRow key={entry.key} entry={entry} onClick={() => open(entry)} />
            ))}
          </EntryList>
        )}
      </section>

      <p className={styles.version}>Versão {__APP_VERSION__}</p>

      {sheet?.kind === 'week' && (
        <WeekCloseSheet initialWeekStart={sheet.weekStart} onClose={close} onSaved={saved} />
      )}
      {sheet?.kind === 'expense' && <ExpenseSheet expense={sheet.expense} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'personal' && (
        <PersonalExpenseSheet personalExpense={sheet.personalExpense} onClose={close} onSaved={saved} />
      )}
      {sheet?.kind === 'delivery' && <DeliverySheet delivery={sheet.delivery} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'settlement' && <SettlementSheet settlement={sheet.settlement} onClose={close} onSaved={saved} />}
    </TabLayout>
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
