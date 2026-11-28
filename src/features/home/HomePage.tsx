import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shortcut } from '../../components/buttons';
import { CardPair, GoalBar, HeroCard, SectionTitle, StatCard, TitledCard } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { ActionPair, PageTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { loadActiveProducts } from '../../db/operations';
import { loadHomeData } from '../../db/queries';
import { toLocalDate } from '../../domain/dates';
import { homeSummary } from '../../domain/home';
import type { Expense, LocalDate, PersonalExpense } from '../../domain/types';
import { formatMonthName } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { isStandalone } from '../../lib/standalone';
import { ExpenseSheet } from '../expense/ExpenseSheet';
import { PersonalExpenseSheet } from '../personal/PersonalExpenseSheet';
import { WeekCloseSheet } from '../week-close/WeekCloseSheet';
import { CountSheet } from './CountSheet';
import styles from './HomePage.module.css';

type OpenSheet =
  | { kind: 'week'; weekStart?: LocalDate }
  | { kind: 'expense'; expense?: Expense }
  | { kind: 'personal'; personalExpense?: PersonalExpense }
  | { kind: 'count' }
  | null;

/** Início (mês atual): vendas, totais, meta, estoque e os atalhos. */
export function HomePage() {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const installed = isStandalone();
  const navigate = useNavigate();
  const today = toLocalDate(new Date());

  const home = useLiveQuery(async () => {
    const [data, products] = await Promise.all([loadHomeData(db), loadActiveProducts(db)]);
    return homeSummary(data, products, today);
  }, [today]);

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

  const shortcuts = (
    <>
      <Shortcut icon="calendar" highlight onClick={() => setSheet({ kind: 'week' })}>
        Fechar a semana
      </Shortcut>
      <ActionPair>
        <Shortcut icon="store" onClick={() => navigate('/acougue')}>
          Açougue
        </Shortcut>
        <Shortcut icon="receipt" onClick={() => setSheet({ kind: 'expense' })}>
          Despesa
        </Shortcut>
      </ActionPair>
      <Shortcut icon="wallet" onClick={() => setSheet({ kind: 'personal' })}>
        Gasto pessoal
      </Shortcut>
    </>
  );

  const s = home?.summary;

  return (
    <TabLayout actions={shortcuts} actionsLayout="stack">
      <PageTitle
        aside={today.slice(0, 4)}
        end={<img className={styles.mascot} src={`${import.meta.env.BASE_URL}brand/arao-mascote-azul.svg`} alt="" />}
      >
        {formatMonthName(today.slice(0, 7))}
      </PageTitle>

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

      {home?.showCountNotice && (
        <Notice action={{ label: 'Contar', onClick: () => setSheet({ kind: 'count' }) }}>
          Comece contando o que você tem em casa hoje
        </Notice>
      )}
      {home?.unclosedWeek && (
        <Notice kind="attention" action={{ label: 'Fechar', onClick: () => setSheet({ kind: 'week', weekStart: home.unclosedWeek! }) }}>
          A semana passada ainda não foi fechada
        </Notice>
      )}

      {home && s && (
        <>
          <HeroCard
            label="Vendas do mês"
            value={formatCents(s.revenueCents)}
            detail={
              s.revenueCents === 0
                ? 'Nenhuma venda ainda'
                : `${formatCents(s.receivedCents)} recebido · ${formatCents(s.pendingCents)} a receber`
            }
          />
          <CardPair>
            <StatCard label="Despesas" value={formatCents(s.expensesCents)} />
            <StatCard
              label="Lucro estimado"
              value={formatCents(home.profit.profitCents)}
              detail={home.profit.complete ? undefined : 'Falta o custo das receitas'}
            />
          </CardPair>
          <CardPair>
            <StatCard label="Gastos pessoais" value={formatCents(s.personalCents)} />
            <StatCard label="Sobrou" value={formatCents(s.leftoverCents)} />
          </CardPair>

          <TitledCard title="Meta do mês">
            {home.goals.revenue && <GoalBar label="Faturamento" progress={home.goals.revenue} />}
            {home.goals.profit && <GoalBar label="Lucro estimado" progress={home.goals.profit} tone="success" />}
            {!home.goals.revenue && !home.goals.profit && (
              <>
                <p className={styles.hint}>Defina quanto quer vender e lucrar no mês.</p>
                <button type="button" className={styles.link} onClick={() => navigate('/metas')}>
                  Definir meta
                </button>
              </>
            )}
            {(home.goals.revenue || home.goals.profit) && (
              <button type="button" className={styles.link} onClick={() => navigate('/metas')}>
                Mudar meta
              </button>
            )}
          </TitledCard>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <SectionTitle>Estoque</SectionTitle>
              {!home.showCountNotice && (
                <button type="button" className={styles.link} onClick={() => setSheet({ kind: 'count' })}>
                  Contar
                </button>
              )}
            </div>
            <EntryList>
              {home.stock.map((row) => (
                <EntryRow
                  key={row.product.id}
                  badge={<ProductBadge code={row.product.code} />}
                  title={row.product.name}
                  detail={row.counted ? `Em casa ${row.home} · No Açougue ${row.consignment}` : 'Ainda não contado'}
                  value={row.counted ? String(row.total) : '—'}
                />
              ))}
            </EntryList>
          </section>


          {/* Em telas baixas os atalhos rolam junto (o bloco preso embaixo some). */}
          <div className={styles.inlineShortcuts}>{shortcuts}</div>

          <p className={styles.version}>Versão {__APP_VERSION__}</p>
        </>
      )}

      {sheet?.kind === 'week' && <WeekCloseSheet initialWeekStart={sheet.weekStart} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'expense' && <ExpenseSheet expense={sheet.expense} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'personal' && (
        <PersonalExpenseSheet personalExpense={sheet.personalExpense} onClose={close} onSaved={saved} />
      )}
      {sheet?.kind === 'count' && <CountSheet onClose={close} onSaved={saved} />}
    </TabLayout>
  );
}
