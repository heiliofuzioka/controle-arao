import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { useId, useState, type PointerEvent } from 'react';
import { layerValue, type BucketTotal, type WaveLayer, type WeekProductPoint } from '../../domain/dashboard';
import { isInRange, shiftDays, type DateRange } from '../../domain/dates';
import { formatDayShortMonth } from '../../lib/format';
import { formatReais } from '../../lib/money';
import styles from './Dashboard.module.css';
import { useWidth } from './useWidth';

const HEIGHT = 170;

const TONE_COLOR: Record<WaveLayer['tone'], string> = {
  brownie: 'var(--cor-grafico-brownie)',
  torta: 'var(--cor-grafico-torta)',
  gelinho: 'var(--cor-grafico-gelinho)',
  other: 'var(--cor-painel-texto-secundario)',
};

/**
 * Gráfico de ondas "Vendas por produto": um ponto por semana, uma onda por camada
 * (de trás para a frente). Tocar mostra a linha e o card com os valores e o lucro da semana.
 */
export function WaveChart({
  points,
  layers,
  weekTotals,
  highlight,
  compact = false,
}: {
  points: WeekProductPoint[];
  layers: WaveLayer[];
  /** Faturamento e lucro de cada semana (mesma ordem de `points`). */
  weekTotals: BucketTotal[];
  /** Faixa do período escolhido. */
  highlight: DateRange;
  /** Deitado: sem a legenda e o subtítulo (vão no cabeçalho). */
  compact?: boolean;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const n = points.length;
  const max = Math.max(1, ...points.flatMap((p) => layers.map((l) => layerValue(p, l))));
  const x = scaleLinear()
    .domain([0, Math.max(1, n - 1)])
    .range([0, Math.max(1, width)]);
  const y = scaleLinear()
    .domain([0, max * 1.15])
    .range([HEIGHT, 8]);

  // Faixa do período: das semanas que caem nele.
  const inPeriod = points.map((p, i) => ({ i, on: isInRange(p.weekStart, highlight) || isInRange(shiftDays(p.weekStart, 6), highlight) }));
  const first = inPeriod.find((p) => p.on)?.i;
  const last = [...inPeriod].reverse().find((p) => p.on)?.i;
  const step = n > 1 ? width / (n - 1) : width;
  const bandStart = first === undefined ? null : Math.max(0, x(first) - step / 2);
  const bandEnd = last === undefined ? null : Math.min(width, x(last) + step / 2);

  // Rótulos de data: no máximo um a cada ~70px.
  const maxLabels = Math.max(2, Math.floor(width / 70));
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));
  const labels = points.map((p, i) => ({ i, text: formatDayShortMonth(p.weekStart) })).filter(({ i }) => (n - 1 - i) % labelEvery === 0);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(x.invert(e.clientX - rect.left));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };

  const activePoint = active === null ? null : points[active];
  const activeTotal = active === null ? null : weekTotals[active];
  const tooltipLeft = active === null ? 0 : x(active) > width / 2 ? Math.max(0, x(active) - 162) : Math.min(width - 150, x(active) + 12);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <h2 className={styles.chartTitle}>Vendas por produto</h2>
        {!compact && <p className={styles.chartSubtitle}>Valor vendido por semana</p>}
      </div>
      <Legend items={layers.map((l) => ({ label: l.label, color: TONE_COLOR[l.tone] }))} />

      <div ref={wrapRef} className={styles.waveWrap}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Vendas por produto, por semana. Toque para ver os valores."
            onPointerDown={pick}
            onPointerMove={(e) => e.buttons > 0 && pick(e)}
          >
            <defs>
              {layers.map((l) => (
                <linearGradient key={l.key} id={`${gradientId}-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={TONE_COLOR[l.tone]} stopOpacity={0.75} />
                  <stop offset="1" stopColor={TONE_COLOR[l.tone]} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            {bandStart !== null && bandEnd !== null && (
              <rect x={bandStart} y={0} width={bandEnd - bandStart} height={HEIGHT} rx={12} fill="#FFFFFF" fillOpacity={0.08} />
            )}
            {layers.map((l) => {
              const values = points.map((p) => layerValue(p, l));
              const fill = area<number>()
                .x((_, i) => x(i))
                .y0(HEIGHT)
                .y1((v) => y(v))
                .curve(curveMonotoneX)(values);
              const stroke = line<number>()
                .x((_, i) => x(i))
                .y((v) => y(v))
                .curve(curveMonotoneX)(values);
              return (
                <g key={l.key}>
                  <path d={fill ?? ''} fill={`url(#${gradientId}-${l.key})`} />
                  <path d={stroke ?? ''} fill="none" stroke={TONE_COLOR[l.tone]} strokeWidth={2} />
                </g>
              );
            })}
            {active !== null && (
              <line x1={x(active)} x2={x(active)} y1={0} y2={HEIGHT} stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="3 4" />
            )}
          </svg>
        )}

        {activePoint && activeTotal && (
          <div className={styles.tooltip} style={{ left: tooltipLeft }} role="status">
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipStrong}>Semana</span>
              <span className={styles.tooltipStrong}>{formatDayShortMonth(activePoint.weekStart)}</span>
            </div>
            {layers.map((l) => (
              <div key={l.key} className={styles.tooltipRow}>
                <span>{l.label}</span>
                <span className={styles.tooltipStrong}>{formatReais(layerValue(activePoint, l))}</span>
              </div>
            ))}
            <p className={styles.tooltipStrong}>Lucro</p>
            <p className={styles.tooltipValue}>{formatReais(activeTotal.profitCents)}</p>
          </div>
        )}
      </div>

      <div className={styles.xLabels}>
        {labels.map(({ i, text }) => (
          <span key={i} className={styles.xLabel} style={{ left: x(i) }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className={styles.legend}>
      {items.map((item) => (
        <span key={item.label} className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
