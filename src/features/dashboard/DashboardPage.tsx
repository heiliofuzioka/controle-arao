import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notice } from '../../components/Notice';
import { TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { loadActiveProducts } from '../../db/operations';
import { loadHomeData } from '../../db/queries';
import {
  bucketTotals,
  columnBuckets,
  dashboardAlerts,
  dashboardCards,
  hasClosedWeek,
  periodRange,
  waveLayers,
  waveWeeks,
  weeklyProductSeries,
  type Period,
} from '../../domain/dashboard';
import { monthKey, monthRange, toLocalDate, weekRangeFromStart } from '../../domain/dates';
import { findGoal, goalProgress, type GoalProgress } from '../../domain/goals';
import { formatMonthName, formatPeriodLabel } from '../../lib/format';
import { formatCents, formatPercent, formatReais } from '../../lib/money';
import { WeekCloseSheet } from '../week-close/WeekCloseSheet';
import { ColumnChart } from './ColumnChart';
import styles from './Dashboard.module.css';
import { Ring } from './Ring';
import { WaveChart } from './WaveChart';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: '2months', label: '2 meses' },
  { key: '6months', label: '6 meses' },
  { key: 'year', label: 'Ano' },
];

const PERIOD_KIND: Record<Period, 'week' | 'month' | 'months' | 'year'> = {
  week: 'week',
  month: 'month',
  '2months': 'months',
  '6months': 'months',
  year: 'year',
};

function columnSubtitle(period: Period, today: string): string {
  const month = monthKey(today);
  const range = periodRange(period, today);
  switch (period) {
    case 'week':
      return 'Por semana · últimas 8 semanas';
    case 'month':
      return `Por semana de ${formatMonthName(month).toLowerCase()}`;
    case '2months':
      return `Por semana · ${formatMonthName(range.start.slice(0, 7)).toLowerCase()} e ${formatMonthName(month).toLowerCase()}`;
    case '6months':
      return `Por mês · ${formatMonthName(range.start.slice(0, 7)).toLowerCase()} a ${formatMonthName(month).toLowerCase()}`;
    case 'year':
      return `Por mês · ${today.slice(0, 4)}`;
  }
}

/** Painel (aba, fundo escuro): sobrou no período, três cards, metas e os dois gráficos. */
export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [sheetWeek, setSheetWeek] = useState<string | null>(null);
  const navigate = useNavigate();
  const today = toLocalDate(new Date());

  // Fundo escuro também atrás da barra de status do iPhone.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content') ?? '#F4F2ED';
    document.documentElement.dataset.tone = 'dark';
    meta?.setAttribute('content', '#0E1C3D');
    return () => {
      delete document.documentElement.dataset.tone;
      meta?.setAttribute('content', previous);
    };
  }, []);

  const view = useLiveQuery(async () => {
    const [data, products] = await Promise.all([loadHomeData(db), loadActiveProducts(db)]);
    const range = periodRange(period, today);
    const weeks = waveWeeks(period, today);
    const month = monthKey(today);
    const goal = findGoal(data.goals, month);
    const monthCards = dashboardCards(data, monthRange(month));
    return {
      range,
      cards: dashboardCards(data, range),
      goals: {
        revenue: goalProgress(goal?.revenueCents, monthCards.summary.revenueCents),
        profit: goalProgress(goal?.profitCents, monthCards.profitCents),
      },
      hasCharts: hasClosedWeek(data.weekCloses, data.sales),
      // Sem nenhuma receita, o lucro estimado não tem como descontar o custo dos produtos.
      hasRecipes: data.unitCosts.size > 0,
      layers: waveLayers(products),
      points: weeklyProductSeries(data.sales, products.map((p) => p.id), weeks),
      weekTotals: bucketTotals(
        data,
        weeks.map((w) => ({ key: w, kind: 'week' as const, range: weekRangeFromStart(w), isCurrent: false })),
      ),
      columns: bucketTotals(data, columnBuckets(period, today)),
      alerts: dashboardAlerts(data, today),
    };
  }, [period, today]);

  const cards = view?.cards;
  const s = cards?.summary;
  // Deitado: um gráfico por vez — ondas para semana, mês e 2 meses; colunas para 6 meses e ano.
  const landscapeChart = period === '6months' || period === 'year' ? 'columns' : 'waves';

  const filter = (
    <div className={styles.filter} role="group" aria-label="Período">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={styles.filterButton}
          aria-pressed={p.key === period}
          onClick={() => setPeriod(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <TabLayout tone="dark" hideTabsInLandscape>
      <div className={styles.page}>
        <div className={styles.side}>
          <header className={styles.header}>
            <div className={styles.titleRow}>
              <img className={styles.mascot} src={`${import.meta.env.BASE_URL}brand/arao-mascote-creme.svg`} alt="" />
              <h1 className={styles.title}>Painel</h1>
            </div>
            {view && <p className={styles.periodLabel}>{formatPeriodLabel(view.range, PERIOD_KIND[period])}</p>}
          </header>

          <div className={styles.leftover}>
            <p className={styles.leftoverLabel}>Sobrou no período</p>
            <p className={styles.leftoverValue}>{s ? formatCents(s.leftoverCents) : ' '}</p>
          </div>

          {view?.alerts.map((alert) =>
            alert.kind === 'settlement_overdue' ? (
              <Notice key="overdue" kind="attention" action={{ label: 'Ver', onClick: () => navigate('/acougue') }}>
                {alert.count === 1 ? 'Um acerto está a receber há mais de 14 dias' : `${alert.count} acertos estão a receber há mais de 14 dias`}
              </Notice>
            ) : (
              <Notice key="week" kind="attention" action={{ label: 'Fechar', onClick: () => setSheetWeek(alert.weekStart) }}>
                A semana passada ainda não foi fechada
              </Notice>
            ),
          )}

          <div className={`${styles.stickyFilter} ${styles.portraitOnly}`}>{filter}</div>

          {cards && s && (
            <>
              <section className={styles.card}>
                <div className={styles.cardTexts}>
                  <p className={styles.cardLabel}>Faturamento</p>
                  <p className={styles.cardValue}>{formatCents(s.revenueCents)}</p>
                  <p className={styles.cardDetail}>
                    {s.revenueCents === 0 ? 'Nada vendido ainda' : `${formatPercent(cards.receivedRatio ?? 0)} já recebido`}
                  </p>
                </div>
                <Ring ratio={cards.receivedRatio} tone="revenue" />
              </section>
              <section className={styles.card}>
                <div className={styles.cardTexts}>
                  <p className={styles.cardLabel}>Despesas</p>
                  <p className={styles.cardValue}>{formatCents(s.expensesCents)}</p>
                  <p className={styles.cardDetail}>
                    {cards.expensesRatio === null ? '—' : `${formatPercent(cards.expensesRatio)} do faturamento`}
                  </p>
                </div>
                <Ring ratio={cards.expensesRatio} tone="expense" />
              </section>
              <section className={styles.card}>
                <div className={styles.cardTexts}>
                  <p className={styles.cardLabel}>Lucro estimado</p>
                  <p className={styles.cardValue}>{formatCents(cards.profitCents)}</p>
                  <p className={styles.cardDetail}>
                    {!cards.profitComplete || !view.hasRecipes
                      ? 'Cadastre as receitas para calcular'
                      : cards.marginRatio === null
                        ? '—'
                        : `${formatPercent(cards.marginRatio)} de margem`}
                  </p>
                </div>
                <Ring ratio={cards.marginRatio} tone="profit" />
              </section>
            </>
          )}
        </div>

        <div className={styles.main}>
          <div className={`${styles.stickyFilter} ${styles.landscapeOnly}`}>{filter}</div>

          {view && (
            <section className={`${styles.goalsCard} ${styles.portraitOnly}`}>
              <h2 className={styles.chartTitle}>Metas de {formatMonthName(monthKey(today)).toLowerCase()}</h2>
              {view.goals.revenue && <DarkGoal label="Faturamento" progress={view.goals.revenue} tone="revenue" />}
              {view.goals.profit && <DarkGoal label="Lucro estimado" progress={view.goals.profit} tone="profit" />}
              {!view.goals.revenue && !view.goals.profit && (
                <button type="button" className={styles.link} onClick={() => navigate('/metas')}>
                  Definir meta
                </button>
              )}
            </section>
          )}

          {view && !view.hasCharts && (
            <section className={styles.emptyCard}>
              <img className={styles.emptyMascot} src={`${import.meta.env.BASE_URL}brand/arao-mascote-creme.svg`} alt="" />
              <h2 className={styles.emptyTitle}>Os gráficos aparecem aqui</h2>
              <p className={styles.emptyText}>
                Depois da primeira semana fechada, você vê aqui as ondas de cada produto e as colunas de faturamento e lucro.
              </p>
            </section>
          )}

          {view && view.hasCharts && (
            <>
              <div className={landscapeChart === 'waves' ? '' : styles.portraitOnly}>
                <WaveChart points={view.points} layers={view.layers} weekTotals={view.weekTotals} highlight={view.range} />
              </div>
              <div className={landscapeChart === 'columns' ? '' : styles.portraitOnly}>
                <ColumnChart buckets={view.columns} subtitle={columnSubtitle(period, today)} />
              </div>
            </>
          )}
        </div>
      </div>

      {sheetWeek && (
        <WeekCloseSheet initialWeekStart={sheetWeek} onClose={() => setSheetWeek(null)} onSaved={() => setSheetWeek(null)} />
      )}
    </TabLayout>
  );
}

function DarkGoal({ label, progress, tone }: { label: string; progress: GoalProgress; tone: 'revenue' | 'profit' }) {
  const width = Math.max(0, Math.min(100, progress.ratio * 100));
  return (
    <div className={styles.goal}>
      <div className={styles.goalHead}>
        <p className={styles.cardLabel}>{label}</p>
        <p className={styles.goalPercent}>{formatPercent(progress.ratio)}</p>
      </div>
      <p className={styles.goalValue}>
        {formatReais(progress.achievedCents)} de {formatReais(progress.targetCents)}
      </p>
      <div className={styles.goalTrack} role="progressbar" aria-label={label} aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${styles.goalFill} ${styles[`goal_${tone}`]}`} style={{ width: `${width}%` }} />
      </div>
      <p className={styles.cardDetail}>{progress.reached ? 'Meta batida!' : `Faltam ${formatReais(progress.remainingCents)}`}</p>
    </div>
  );
}
