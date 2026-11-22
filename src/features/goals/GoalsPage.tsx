import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BigButton } from '../../components/buttons';
import { GoalBar, PeriodPicker, TitledCard } from '../../components/cards';
import { MoneyField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { saveMonthlyGoal } from '../../db/operations';
import { loadHomeData } from '../../db/queries';
import { daysLeftInMonth, monthKey, monthRange, shiftMonth, toLocalDate } from '../../domain/dates';
import { findGoal, goalProgress } from '../../domain/goals';
import { estimatedProfit, periodSummary } from '../../domain/totals';
import type { Cents } from '../../domain/types';
import { formatMonthName } from '../../lib/format';
import styles from './GoalsPage.module.css';

/** Metas do mês: faturamento e lucro estimado, com o progresso até agora. */
export function GoalsPage() {
  const today = toLocalDate(new Date());
  const [month, setMonth] = useState(monthKey(today));
  const [revenue, setRevenue] = useState<Cents | null>(null);
  const [profit, setProfit] = useState<Cents | null>(null);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const view = useLiveQuery(async () => {
    const data = await loadHomeData(db);
    const range = monthRange(month);
    return {
      goal: findGoal(data.goals, month),
      revenueCents: periodSummary(data, range).revenueCents,
      profit: estimatedProfit(data, range),
    };
  }, [month]);

  // Ao abrir um mês, os campos começam com a meta salva dele.
  if (view && loadedMonth !== month) {
    setRevenue(view.goal?.revenueCents ?? null);
    setProfit(view.goal?.profitCents ?? null);
    setLoadedMonth(month);
  }

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await saveMonthlyGoal(db, month, { revenueCents: revenue, profitCents: profit });
      setMessage('Metas salvas');
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  const isCurrent = month === monthKey(today);
  const revenueProgress = view ? goalProgress(revenue ?? undefined, view.revenueCents) : null;
  const profitProgress = view ? goalProgress(profit ?? undefined, view.profit.profitCents) : null;
  const daysLeft = daysLeftInMonth(today);

  return (
    <TabLayout
      actions={
        <BigButton onClick={() => void save()} disabled={busy || !view}>
          Salvar metas
        </BigButton>
      }
    >
      <BackTitle>Metas</BackTitle>

      {message && <Notice kind="success">{message}</Notice>}
      {failed && <Notice kind="error">Não deu para salvar. Tente de novo.</Notice>}

      <PeriodPicker
        label={formatMonthName(month, true)}
        previousLabel="Mês anterior"
        nextLabel="Próximo mês"
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
      />

      <MoneyField label="Meta de faturamento" valueCents={revenue} onChange={setRevenue} />
      <MoneyField label="Meta de lucro estimado" valueCents={profit} onChange={setProfit} />

      <TitledCard title={isCurrent ? 'Até agora' : 'No mês'}>
        {revenueProgress && (
          <GoalBar
            label="Faturamento"
            progress={revenueProgress}
            extra={isCurrent && daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} para o fim do mês` : undefined}
          />
        )}
        {profitProgress && <GoalBar label="Lucro estimado" progress={profitProgress} tone="success" />}
        {!revenueProgress && !profitProgress && (
          <p className={styles.hint}>Coloque um valor nas metas para ver o progresso.</p>
        )}
        {profitProgress && view && !view.profit.complete && (
          <p className={styles.hint}>O lucro estimado ainda não desconta o custo dos produtos sem receita.</p>
        )}
      </TitledCard>
    </TabLayout>
  );
}
