import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CardPair, HeroCard, PeriodPicker, SectionTitle, StatCard } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { loadHomeData } from '../../db/queries';
import { bucketTotals } from '../../domain/dashboard';
import { monthKey, monthRange, monthsOfYear, toLocalDate } from '../../domain/dates';
import { compareYears, yearSummary, yearsWithSalesBefore } from '../../domain/year';
import { formatMonthName } from '../../lib/format';
import { formatCents, formatReais, formatSignedPercent } from '../../lib/money';
import { ColumnChart } from '../dashboard/ColumnChart';
import styles from '../month/MonthPage.module.css';

/** Ano (pelo Painel): janeiro a dezembro, mês a mês, e comparar com outro ano. */
export function YearPage() {
  const { year: param } = useParams();
  const today = toLocalDate(new Date());
  const year = Number(param);
  if (!param || !/^\d{4}$/.test(param)) return <Navigate to={`/ano/${today.slice(0, 4)}`} replace />;
  return <YearView key={year} year={year} today={today} />;
}

function YearView({ year, today }: { year: number; today: string }) {
  const navigate = useNavigate();
  const [compareWith, setCompareWith] = useState<number | null>(null);
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = monthKey(today);

  const view = useLiveQuery(async () => {
    const data = await loadHomeData(db);
    const summary = yearSummary(data, year);
    const otherYears = yearsWithSalesBefore(data, year);
    const previous = compareYears(data, year, year - 1);
    return {
      summary,
      otherYears,
      previous: previous.otherTotalCents > 0 ? previous : null,
      comparison: compareWith ? compareYears(data, year, compareWith) : null,
      columns: bucketTotals(
        data,
        monthsOfYear(year).map((m) => ({ key: m, kind: 'month' as const, range: monthRange(m), isCurrent: m === currentMonth })),
      ),
    };
  }, [year, compareWith]);

  const s = view?.summary;
  const active = s?.activeMonths;
  const activeText = active
    ? active.first === active.last
      ? formatMonthName(active.first).toLowerCase()
      : `${formatMonthName(active.first).toLowerCase()} a ${formatMonthName(active.last).toLowerCase()}`
    : '';
  const goTo = (y: number) => navigate(`/ano/${y}`, { replace: true });

  return (
    <TabLayout>
      <BackTitle>Ano</BackTitle>

      <PeriodPicker
        label={String(year)}
        previousLabel="Ano anterior"
        nextLabel="Próximo ano"
        nextDisabled={year >= currentYear}
        onPrevious={() => goTo(year - 1)}
        onNext={() => goTo(year + 1)}
      />

      {view && view.otherYears.length > 0 && (
        <div className={styles.chips} role="group" aria-label="Comparar com outro ano">
          {view.otherYears.map((y) => (
            <button
              key={y}
              type="button"
              className={styles.chip}
              aria-pressed={compareWith === y}
              onClick={() => setCompareWith(compareWith === y ? null : y)}
            >
              Comparar com {y}
            </button>
          ))}
        </div>
      )}

      {view && s && view.comparison && (
        <>
          <HeroCard
            label={`${year} contra ${view.comparison.otherYear}${activeText ? ` (${activeText})` : ''}`}
            value={view.comparison.total.ratio === null ? '—' : formatSignedPercent(view.comparison.total.ratio)}
            detail={`${formatCents(view.comparison.totalCents)} contra ${formatCents(view.comparison.otherTotalCents)}`}
          />
          <SectionTitle>Faturamento por mês</SectionTitle>
          <EntryList>
            {view.comparison.months.map((m) => (
              <EntryRow
                key={m.month}
                badge={<ProductBadge code={formatMonthName(m.month).charAt(0)} />}
                title={formatMonthName(m.month)}
                detail={`${view.comparison!.otherYear}: ${formatReais(m.otherRevenueCents)}${m.comparison.ratio === null ? '' : ` · ${formatSignedPercent(m.comparison.ratio)}`}`}
                value={formatReais(m.revenueCents)}
                onClick={() => navigate(`/mes/${m.month}`)}
              />
            ))}
          </EntryList>
        </>
      )}

      {view && s && !view.comparison && (
        <>
          <HeroCard
            label="Faturamento do ano"
            value={formatCents(s.revenueCents)}
            detail={
              !active
                ? 'Nenhuma venda neste ano'
                : view.previous?.total.ratio != null
                  ? `${activeText} · ${formatSignedPercent(view.previous.total.ratio)} que o mesmo período de ${year - 1}`
                  : activeText
            }
          />

          {!active && <Notice>Feche as semanas: o ano aparece aqui, mês a mês</Notice>}

          {active && (
            <>
              <CardPair>
                <StatCard label="Despesas" value={formatCents(s.expensesCents)} />
                <StatCard
                  label="Lucro estimado"
                  value={formatCents(s.profitCents)}
                  detail={s.profitComplete ? undefined : 'Falta o custo das receitas'}
                />
              </CardPair>

              <ColumnChart buckets={view.columns} tone="light" />

              <SectionTitle>Mês a mês</SectionTitle>
              <EntryList>
                {[...s.months]
                  .reverse()
                  .filter((m) => m.revenueCents > 0)
                  .map((m) => (
                    <EntryRow
                      key={m.month}
                      badge={<ProductBadge code={formatMonthName(m.month).charAt(0)} />}
                      title={formatMonthName(m.month)}
                      detail={`Lucro ${formatReais(m.profitCents)}${m.revenueVsPrevious.ratio === null ? '' : ` · ${formatSignedPercent(m.revenueVsPrevious.ratio)} vendas`}`}
                      value={formatCents(m.revenueCents)}
                      onClick={() => navigate(`/mes/${m.month}`)}
                    />
                  ))}
              </EntryList>
            </>
          )}
        </>
      )}
    </TabLayout>
  );
}
