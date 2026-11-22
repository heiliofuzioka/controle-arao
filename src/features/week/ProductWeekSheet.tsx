import { useLiveQuery } from 'dexie-react-hooks';
import { Footnote } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { loadStockData } from '../../db/operations';
import type { Delivery, LocalDate, Product, Settlement } from '../../domain/types';
import { weekProductEntries, type WeekProductRow } from '../../domain/week';
import { formatCount, formatWeekRangeShort, formatWeekdayDate } from '../../lib/format';
import { formatCents } from '../../lib/money';
import styles from './ProductWeekSheet.module.css';

const soldText = (n: number) => (n === 1 ? '1 vendido' : `${n} vendidos`);

/** "Brownie · semana": os lançamentos de um produto na semana. Tocar abre para editar ou apagar. */
export function ProductWeekSheet({
  product,
  weekStart,
  row,
  onClose,
  onOpenWeekClose,
  onOpenDelivery,
  onOpenSettlement,
}: {
  product: Product;
  weekStart: LocalDate;
  row?: WeekProductRow;
  onClose: () => void;
  onOpenWeekClose: () => void;
  onOpenDelivery: (delivery: Delivery) => void;
  onOpenSettlement: (settlement: Settlement) => void;
}) {
  const entries = useLiveQuery(
    async () => weekProductEntries(await loadStockData(db), product.id, weekStart),
    [product.id, weekStart],
  );

  const summary = row
    ? `${formatWeekRangeShort(weekStart)} · produziu ${row.produced} · vendeu ${row.sold} · ${formatCents(row.revenueCents)}`
    : formatWeekRangeShort(weekStart);

  return (
    <Sheet title={`${product.name} · semana`} onClose={onClose}>
      <p className={styles.summary}>{summary}</p>

      {entries && entries.length === 0 && <Footnote>Nada lançado para {product.name} nesta semana.</Footnote>}

      {entries && entries.length > 0 && (
        <>
          <EntryList>
            {entries.map((entry) => {
              if (entry.kind === 'weekClose') {
                const w = entry.weekClose;
                const parts = [`Produziu ${w.produced}`, w.loss > 0 ? `perdeu ${w.loss}` : '', `vendeu ${w.soldDirect} na mão`];
                return (
                  <EntryRow
                    key={w.id}
                    badge={<ProductBadge code={product.code} />}
                    title="Fechamento da semana"
                    detail={parts.filter(Boolean).join(' · ')}
                    value={formatCents(w.valueCents)}
                    onClick={onOpenWeekClose}
                  />
                );
              }
              if (entry.kind === 'delivery') {
                const d = entry.delivery;
                return (
                  <EntryRow
                    key={d.id}
                    badge={<ProductBadge code="A" />}
                    title="Entrega ao Açougue"
                    detail={`${formatWeekdayDate(d.date)} · ${formatCount(d.quantity, product.name)}`}
                    value="—"
                    onClick={() => onOpenDelivery(d)}
                  />
                );
              }
              const s = entry.settlement;
              return (
                <EntryRow
                  key={s.id}
                  badge={<ProductBadge code="A" />}
                  title="Acerto do Açougue"
                  detail={`${formatWeekdayDate(s.date)} · ${soldText(s.soldQuantity)}`}
                  value={formatCents(s.valueCents)}
                  onClick={() => onOpenSettlement(s)}
                />
              );
            })}
          </EntryList>
          <Footnote>Toque num lançamento para editar ou apagar. Os totais mudam na hora.</Footnote>
        </>
      )}
    </Sheet>
  );
}
