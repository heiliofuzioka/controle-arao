import { scaleLinear } from 'd3-scale';
import type { BucketTotal } from '../../domain/dashboard';
import { formatDayShortMonth, formatMonthShort } from '../../lib/format';
import { formatCompactReais } from '../../lib/money';
import styles from './Dashboard.module.css';
import { Legend } from './WaveChart';

const PLOT_HEIGHT = 170;

/**
 * Gráfico de colunas "Faturamento e lucro": coluna azul = faturamento; dentro, coluna verde
 * mais estreita = lucro estimado. Eixo a partir de R$ 0; a coluna atual mostra o valor.
 */
export function ColumnChart({
  buckets,
  subtitle,
  compact = false,
}: {
  buckets: BucketTotal[];
  subtitle: string;
  compact?: boolean;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.revenueCents));
  const scale = scaleLinear().domain([0, max]).nice(4);
  const ticks = scale.ticks(4);
  const top = scale.domain()[1] ?? max;
  const height = (cents: number) => Math.max(0, (cents / top) * PLOT_HEIGHT);
  const sparse = buckets.length > 9;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <h2 className={styles.chartTitle}>Faturamento e lucro</h2>
        {!compact && <p className={styles.chartSubtitle}>{subtitle}</p>}
      </div>
      <Legend
        items={[
          { label: 'Faturamento', color: 'var(--cor-grafico-faturamento)' },
          { label: 'Lucro', color: 'var(--cor-grafico-lucro)' },
        ]}
      />

      <div className={styles.columns} role="img" aria-label={`Colunas de faturamento com o lucro dentro. ${subtitle}.`}>
        <div className={styles.yAxis} style={{ height: PLOT_HEIGHT }}>
          {[...ticks].reverse().map((t) => (
            <span key={t} className={styles.yLabel} style={{ bottom: (t / top) * PLOT_HEIGHT }}>
              {formatCompactReais(t)}
            </span>
          ))}
        </div>
        <div className={styles.bars}>
          {buckets.map((b, i) => (
            <div key={b.key} className={styles.barSlot}>
              <div className={styles.barArea} style={{ height: PLOT_HEIGHT }}>
                {b.isCurrent && b.revenueCents > 0 && (
                  <span className={styles.barValue} style={{ bottom: height(b.revenueCents) + 6 }}>
                    {formatCompactReais(b.revenueCents)}
                  </span>
                )}
                <div
                  className={`${styles.bar} ${b.isCurrent ? styles.barCurrent : ''}`}
                  style={{ height: height(b.revenueCents) }}
                >
                  <div className={styles.barProfit} style={{ height: height(Math.max(0, b.profitCents)) }} />
                </div>
              </div>
              <span className={`${styles.barLabel} ${b.isCurrent ? styles.barLabelCurrent : ''}`}>
                {/* Com muitas colunas (ano), um rótulo sim, outro não; o atual sempre aparece. */}
                {sparse && i % 2 === 1 && !b.isCurrent
                  ? ' '
                  : b.kind === 'week'
                    ? formatDayShortMonth(b.key)
                    : formatMonthShort(b.key)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!compact && <p className={styles.chartSubtitle}>Lucro estimado é a coluna verde, dentro do faturamento</p>}
    </div>
  );
}
