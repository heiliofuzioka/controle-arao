import styles from './Dashboard.module.css';

const SIZE = 56;
const STROKE = 5;
const R = (SIZE - STROKE) / 2 - 0.22;

/** Anel dos cards do Painel: trilho escuro e o arco da porcentagem, com o número no meio. */
export function Ring({ ratio, tone }: { ratio: number | null; tone: 'profit' | 'expense' | 'revenue' }) {
  const value = ratio === null || !Number.isFinite(ratio) ? 0 : ratio;
  const clamped = Math.max(0, Math.min(1, value));
  const circumference = 2 * Math.PI * R;
  const percent = `${Math.round(value * 100)}%`;
  return (
    <div className={styles.ring} aria-hidden="true">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--cor-painel-trilho)" strokeWidth={STROKE} />
        {clamped > 0 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            className={styles[`ring_${tone}`]}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </svg>
      <span className={styles.ringText}>{percent}</span>
    </div>
  );
}
