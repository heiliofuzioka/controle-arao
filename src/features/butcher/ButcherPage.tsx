import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BigButton } from '../../components/buttons';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { PageTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { consignmentPoint, loadActiveProducts, loadStockData, setSettlementPaid } from '../../db/operations';
import { butcherSummary } from '../../domain/butcher';
import { toLocalDate } from '../../domain/dates';
import type { Product, Settlement } from '../../domain/types';
import { formatCount, formatShortDate } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { DeliverySheet } from './DeliverySheet';
import styles from './ButcherPage.module.css';
import { SettlementSheet } from './SettlementSheet';

type OpenSheet = { kind: 'delivery' } | { kind: 'settlement'; settlement?: Settlement } | null;
type Message = { text: string; undo?: () => void } | null;

const pendingCount = (n: number) =>
  n === 0 ? 'Nenhum acerto esperando pagamento' : n === 1 ? '1 acerto esperando pagamento' : `${n} acertos esperando pagamento`;

/** Aba Açougue: a receber, acertos esperando pagamento e o que está lá agora. */
export function ButcherPage() {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<Message>(null);

  const view = useLiveQuery(async () => {
    const [products, stock, point, allProducts] = await Promise.all([
      loadActiveProducts(db),
      loadStockData(db),
      consignmentPoint(db),
      db.products.toArray(),
    ]);
    return { summary: butcherSummary(stock, products, point.id), productsById: new Map(allProducts.map((p) => [p.id, p])) };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), message.undo ? 6000 : 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const received = async (settlement: Settlement) => {
    await setSettlementPaid(db, settlement.id, true, toLocalDate(new Date()));
    setMessage({
      text: `${formatCents(settlement.valueCents)} recebido`,
      undo: () => {
        void setSettlementPaid(db, settlement.id, false, settlement.date);
        setMessage(null);
      },
    });
  };

  const saved = (text: string) => {
    setSheet(null);
    setMessage({ text });
  };

  const summary = view?.summary;

  return (
    <TabLayout
      actions={
        <>
          <BigButton onClick={() => setSheet({ kind: 'delivery' })}>Entregar</BigButton>
          <BigButton variant="secondary" onClick={() => setSheet({ kind: 'settlement' })}>
            Fazer acerto
          </BigButton>
        </>
      }
    >
      <PageTitle>Açougue</PageTitle>

      {message && (
        <Notice kind="success" action={message.undo ? { label: 'Desfazer', onClick: message.undo } : undefined}>
          {message.text}
        </Notice>
      )}

      {summary && !summary.hasDeliveries && (
        <Notice>Entregue produtos ao Açougue e faça o acerto quando ele vender</Notice>
      )}

      {summary && (
        <>
          <section className={styles.receivable}>
            <p className={styles.receivableLabel}>A receber</p>
            <p className={styles.receivableValue}>{formatCents(summary.receivableCents)}</p>
            <p className={styles.receivableLabel}>{pendingCount(summary.pending.length)}</p>
          </section>

          {summary.pending.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Esperando pagamento</h2>
              <ul className={styles.list}>
                {summary.pending.map((settlement) => (
                  <PendingRow
                    key={settlement.id}
                    settlement={settlement}
                    product={view.productsById.get(settlement.productId)}
                    onOpen={() => setSheet({ kind: 'settlement', settlement })}
                    onReceived={() => void received(settlement)}
                  />
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>No Açougue agora</h2>
            <EntryList>
              {summary.stock.map((row) => (
                <EntryRow
                  key={row.product.id}
                  badge={<ProductBadge code={row.product.code} />}
                  title={row.product.name}
                  detail={row.lastDelivery ? `Entregue ${formatShortDate(row.lastDelivery)}` : 'Nada entregue'}
                  value={String(row.quantity)}
                />
              ))}
            </EntryList>
          </section>
        </>
      )}

      {sheet?.kind === 'delivery' && <DeliverySheet onClose={() => setSheet(null)} onSaved={saved} />}
      {sheet?.kind === 'settlement' && (
        <SettlementSheet settlement={sheet.settlement} onClose={() => setSheet(null)} onSaved={saved} />
      )}
    </TabLayout>
  );
}

/** "R$ 64,00 · 8 Brownies · 31/10 · A receber" + Recebi. Tocar no texto abre o acerto. */
function PendingRow({
  settlement,
  product,
  onOpen,
  onReceived,
}: {
  settlement: Settlement;
  product?: Product;
  onOpen: () => void;
  onReceived: () => void;
}) {
  return (
    <li className={styles.pendingRow}>
      <button type="button" className={styles.pendingInfo} onClick={onOpen}>
        <ProductBadge code={product?.code ?? '?'} />
        <span className={styles.pendingTexts}>
          <span className={styles.pendingValue}>{formatCents(settlement.valueCents)}</span>
          <span className={styles.pendingDetail}>
            {formatCount(settlement.soldQuantity, product?.name ?? 'produto')} · {formatShortDate(settlement.date)}
          </span>
          <span className={styles.pendingStatus}>A receber</span>
        </span>
      </button>
      <button type="button" className={styles.receivedButton} onClick={onReceived}>
        Recebi
      </button>
    </li>
  );
}
