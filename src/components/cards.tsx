import type { ReactNode } from 'react';
import type { GoalProgress } from '../domain/goals';
import { formatPercent, formatReais } from '../lib/money';
import { Icon } from './Icon';
import styles from './cards.module.css';

/** Card azul de destaque: "Vendas do mês R$ 2.747,00 …". */
export function HeroCard({ label, value, detail }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <section className={styles.hero}>
      <p className={styles.heroLabel}>{label}</p>
      <p className={styles.heroValue}>{value}</p>
      {detail && <p className={styles.heroLabel}>{detail}</p>}
    </section>
  );
}

/** Card de total: "Despesas R$ 1.811,00". */
export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <section className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {detail && <p className={styles.statDetail}>{detail}</p>}
    </section>
  );
}

/** Dois cards lado a lado. */
export function CardPair({ children }: { children: ReactNode }) {
  return <div className={styles.pair}>{children}</div>;
}

/** Barra de meta: "Faturamento 92% · R$ 2.747 de R$ 3.000 · barra · Faltam R$ 253". */
export function GoalBar({
  label,
  progress,
  tone = 'action',
  extra,
}: {
  label: string;
  progress: GoalProgress;
  tone?: 'action' | 'success';
  /** Complemento do "Faltam" (ex.: "22 dias para o fim do mês"). */
  extra?: string;
}) {
  const width = Math.max(0, Math.min(100, progress.ratio * 100));
  const missing = progress.reached ? 'Meta batida!' : `Faltam ${formatReais(progress.remainingCents)}`;
  return (
    <div className={styles.goal}>
      <div className={styles.goalHead}>
        <p className={styles.goalLabel}>{label}</p>
        <p className={styles.goalPercent}>{formatPercent(progress.ratio)}</p>
      </div>
      <p className={styles.goalValue}>
        {formatReais(progress.achievedCents)} de {formatReais(progress.targetCents)}
      </p>
      <div
        className={styles.goalTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
      >
        <div className={`${styles.goalFill} ${tone === 'success' ? styles.goalSuccess : ''}`} style={{ width: `${width}%` }} />
      </div>
      <p className={styles.goalDetail}>{extra && !progress.reached ? `${missing} · ${extra}` : missing}</p>
    </div>
  );
}

/** Card branco com título (ex.: "Meta do mês", "Até agora"). */
export function TitledCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.titled}>
      <h2 className={styles.titledTitle}>{title}</h2>
      {children}
    </section>
  );
}

/** Seletor de período: ‹ Semana de 3 a 9 de nov ›. */
export function PeriodPicker({
  label,
  onPrevious,
  onNext,
  nextDisabled = false,
  previousLabel = 'Anterior',
  nextLabel = 'Próximo',
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className={styles.picker}>
      <button type="button" className={styles.pickerButton} aria-label={previousLabel} onClick={onPrevious}>
        <Icon name="chevronLeft" size={22} />
      </button>
      <p className={styles.pickerLabel} aria-live="polite">
        {label}
      </p>
      <button type="button" className={styles.pickerButton} aria-label={nextLabel} disabled={nextDisabled} onClick={onNext}>
        <Icon name="chevronRight" size={22} />
      </button>
    </div>
  );
}

/** Título de seção (Nunito 20 forte). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>;
}

/** Texto de rodapé ("Toque num lançamento para editar…"). */
export function Footnote({ children }: { children: ReactNode }) {
  return <p className={styles.footnote}>{children}</p>;
}
