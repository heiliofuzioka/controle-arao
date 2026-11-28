import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BigButton } from '../../components/buttons';
import { CardPair, GoalBar, HeroCard, PeriodPicker, SectionTitle, StatCard, TitledCard } from '../../components/cards';
import { EntryList, EntryRow, IconBadge, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { loadActiveProducts } from '../../db/operations';
import { loadHomeData } from '../../db/queries';
import { monthKey, monthRange, previousMonth, shiftDays, shiftMonth, toLocalDate } from '../../domain/dates';
import { monthReport } from '../../domain/month';
import type { Expense, PersonalExpense } from '../../domain/types';
import { formatMonthName, formatMonthShort, formatShortDate, formatWeekCompact } from '../../lib/format';
import { formatCents, formatPercent, formatReais, formatSignedPercent } from '../../lib/money';
import { ExpenseSheet } from '../expense/ExpenseSheet';
import { PersonalExpenseSheet } from '../personal/PersonalExpenseSheet';
import styles from './MonthPage.module.css';

type OpenSheet =
  | { kind: 'expense'; expense?: Expense }
  | { kind: 'personal'; personalExpense?: PersonalExpense }
  | null;

const isMonthKey = (value: string | undefined): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Fechamento do mês (pelo Painel): totais, metas, produtos, despesas, categorias e semanas. */
export function MonthPage() {
  const { month: param } = useParams();
  const today = toLocalDate(new Date());
  if (!isMonthKey(param)) return <Navigate to={`/mes/${monthKey(today)}`} replace />;
  return <MonthView month={param} today={today} />;
}

function MonthView({ month, today }: { month: string; today: string }) {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<string | null>(null);
  const currentMonth = monthKey(today);

  const report = useLiveQuery(async () => {
    const [data, products] = await Promise.all([loadHomeData(db), loadActiveProducts(db)]);
    return { ...monthReport(data, products, month), hasRecipes: data.unitCosts.size > 0 };
  }, [month]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const saved = (text: string) => {
    setSheet(null);
    setMessage(text);
  };

  const goTo = (target: string) => navigate(`/mes/${target}`, { replace: true });
  // Lançamento novo num mês passado começa no último dia dele.
  const defaultDate = month === currentMonth ? today : monthRange(month).end;
  const previousName = formatMonthName(previousMonth(month)).toLowerCase();
  const previousShort = formatMonthShort(previousMonth(month));
  const s = report?.summary;

  return (
    <TabLayout>
      <BackTitle>Fechamento do mês</BackTitle>

      <PeriodPicker
        label={formatMonthName(month, true)}
        previousLabel="Mês anterior"
        nextLabel="Próximo mês"
        nextDisabled={month >= currentMonth}
        onPrevious={() => goTo(shiftMonth(month, -1))}
        onNext={() => goTo(shiftMonth(month, 1))}
      />

      {message && <Notice kind="success">{message}</Notice>}

      {report && s && (
        <>
          <HeroCard
            label="Vendas"
            value={formatCents(s.revenueCents)}
            detail={
              report.revenueVsPrevious?.ratio != null
                ? `${formatSignedPercent(report.revenueVsPrevious.ratio)} que ${previousName}`
                : 'Sem mês anterior para comparar'
            }
          />

          {!report.hasData && <Notice>Feche as semanas e registre as despesas: o mês aparece aqui</Notice>}

          {report.hasData && (
            <>
              <CardPair>
                <StatCard
                  label="Despesas"
                  value={formatCents(s.expensesCents)}
                  detail={
                    report.expensesVsPrevious?.ratio != null
                      ? `${formatSignedPercent(report.expensesVsPrevious.ratio)} que ${previousShort}.`
                      : undefined
                  }
                />
                <StatCard label="Saldo" value={formatCents(s.balanceCents)} detail="vendas − despesas" />
              </CardPair>
              <CardPair>
                <StatCard
                  label="Lucro estimado"
                  value={formatCents(report.profit.profitCents)}
                  detail={
                    !report.hasRecipes || !report.profit.complete
                      ? 'Cadastre as receitas para calcular'
                      : report.marginRatio === null
                        ? undefined
                        : `${formatPercent(report.marginRatio)} de margem`
                  }
                />
                <StatCard
                  label="Sobrou"
                  value={formatCents(s.leftoverCents)}
                  detail={s.personalCents > 0 ? `após ${formatReais(s.personalCents)} pessoais` : undefined}
                />
              </CardPair>

              <TitledCard title="Metas do mês">
                {report.goals.revenue && <GoalBar label="Faturamento" progress={report.goals.revenue} />}
                {report.goals.profit && <GoalBar label="Lucro estimado" progress={report.goals.profit} tone="success" />}
                {!report.goals.revenue && !report.goals.profit && (
                  <>
                    <p className={styles.hint}>Sem meta para este mês.</p>
                    <button type="button" className={styles.link} onClick={() => navigate('/metas')}>
                      Definir meta
                    </button>
                  </>
                )}
              </TitledCard>

              <SectionTitle>Por produto</SectionTitle>
              <EntryList>
                {report.products.map((row) => (
                  <EntryRow
                    key={row.product.id}
                    badge={<ProductBadge code={row.product.code} />}
                    title={row.product.name}
                    detail={`Produziu ${row.produced} · vendeu ${row.sold}`}
                    value={formatCents(row.revenueCents)}
                  />
                ))}
              </EntryList>

              <SectionTitle>Despesas do mês · {formatCents(s.expensesCents)}</SectionTitle>
              {report.expenses.length > 0 && (
                <EntryList>
                  {report.expenses.map((expense) => {
                    const category = report.categories.find((c) => c.category.id === expense.categoryId)?.category.name ?? 'Despesa';
                    return (
                      <EntryRow
                        key={expense.id}
                        badge={<IconBadge icon="receipt" />}
                        title={expense.description ?? category}
                        detail={`${expense.description ? `${category} · ` : ''}${formatShortDate(expense.date)}`}
                        value={`− ${formatCents(expense.valueCents)}`}
                        onClick={() => setSheet({ kind: 'expense', expense })}
                      />
                    );
                  })}
                </EntryList>
              )}
              <BigButton variant="secondary" onClick={() => setSheet({ kind: 'expense' })}>
                Adicionar despesa
              </BigButton>

              {report.categories.length > 0 && (
                <>
                  <SectionTitle>Por categoria</SectionTitle>
                  <EntryList>
                    {report.categories.map((row, i) => (
                      <EntryRow
                        key={row.category.id}
                        badge={<IconBadge icon="receipt" />}
                        title={row.category.name}
                        detail={i === 0 ? `${formatPercent(row.share)} das despesas` : formatPercent(row.share)}
                        value={formatCents(row.totalCents)}
                      />
                    ))}
                  </EntryList>
                </>
              )}

              <SectionTitle>Gastos pessoais · {formatCents(s.personalCents)}</SectionTitle>
              {report.personalExpenses.length > 0 && (
                <EntryList>
                  {report.personalExpenses.map((item) => (
                    <EntryRow
                      key={item.id}
                      badge={<IconBadge icon="wallet" />}
                      title={item.description ?? 'Gasto pessoal'}
                      detail={formatShortDate(item.date)}
                      value={`− ${formatCents(item.valueCents)}`}
                      onClick={() => setSheet({ kind: 'personal', personalExpense: item })}
                    />
                  ))}
                </EntryList>
              )}
              <BigButton variant="secondary" onClick={() => setSheet({ kind: 'personal' })}>
                Adicionar gasto pessoal
              </BigButton>

              <SectionTitle>Semanas do mês</SectionTitle>
              <EntryList>
                {report.weeks.map((week, i) => {
                  const sunday = shiftDays(week.weekStart, 6);
                  const detail = week.startsInPreviousMonth
                    ? `Conta em ${formatMonthShort(month)} (domingo ${Number(sunday.slice(8))}/${Number(sunday.slice(5, 7))})`
                    : week.closed
                      ? `Produziu ${week.produced} · vendeu ${week.sold}`
                      : 'Ainda não fechada';
                  return (
                    <EntryRow
                      key={week.weekStart}
                      badge={<ProductBadge code={String(i + 1)} />}
                      title={formatWeekCompact(week.weekStart)}
                      detail={detail}
                      value={formatCents(week.revenueCents)}
                      onClick={() => navigate('/semana', { state: { weekStart: week.weekStart } })}
                    />
                  );
                })}
              </EntryList>
            </>
          )}
        </>
      )}

      {sheet?.kind === 'expense' && (
        <ExpenseSheet expense={sheet.expense} defaultDate={defaultDate} onClose={() => setSheet(null)} onSaved={saved} />
      )}
      {sheet?.kind === 'personal' && (
        <PersonalExpenseSheet
          personalExpense={sheet.personalExpense}
          defaultDate={defaultDate}
          onClose={() => setSheet(null)}
          onSaved={saved}
        />
      )}
    </TabLayout>
  );
}
