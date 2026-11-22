import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { ProductBadge } from '../../components/EntryList';
import { Stepper } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { loadActiveProducts, loadStockData, saveStockCount } from '../../db/operations';
import { toLocalDate } from '../../domain/dates';
import { consignmentStock, homeStock } from '../../domain/stock';
import type { ID } from '../../domain/types';
import styles from './CountSheet.module.css';

type Counts = Record<ID, { home: number; consignment: number }>;

/**
 * Folha "Contar estoque": quanto tem de cada produto em casa e no Açougue hoje.
 * Grava só a diferença para o que o app calcula (sem desenho próprio; decisão de 22/11).
 */
export function CountSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const today = toLocalDate(new Date());
  const data = useLiveQuery(async () => {
    const [products, stock] = await Promise.all([loadActiveProducts(db), loadStockData(db)]);
    return { products, stock };
  }, []);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Começa com o que o app calcula hoje (nunca abaixo de zero).
  if (data && counts === null) {
    const initial: Counts = {};
    for (const p of data.products) {
      initial[p.id] = {
        home: Math.max(0, homeStock(data.stock, p.id, { until: today })),
        consignment: Math.max(0, consignmentStock(data.stock, p.id, { until: today })),
      };
    }
    setCounts(initial);
  }

  const update = (id: ID, changes: Partial<{ home: number; consignment: number }>) =>
    setCounts((c) => (c && c[id] ? { ...c, [id]: { ...c[id], ...changes } } : c));

  const save = async () => {
    if (!counts || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await saveStockCount(
        db,
        today,
        Object.entries(counts).map(([productId, c]) => ({ productId, ...c })),
      );
      onSaved('Estoque contado');
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Contar estoque"
      onClose={onClose}
      footer={
        <>
          {failed && <Notice kind="error">Não deu para salvar. Tente de novo.</Notice>}
          <BigButton onClick={() => void save()} disabled={!counts || busy}>
            Salvar contagem
          </BigButton>
        </>
      }
    >
      <Notice>Conte o que você tem hoje, em casa e no Açougue</Notice>
      {data &&
        counts &&
        data.products.map((product) => {
          const c = counts[product.id];
          if (!c) return null;
          return (
            <section key={product.id} className={styles.card} aria-label={product.name}>
              <div className={styles.head}>
                <ProductBadge code={product.code} />
                <p className={styles.name}>{product.name}</p>
              </div>
              <div className={styles.pair}>
                <Stepper label="Em casa" value={c.home} onChange={(home) => update(product.id, { home })} />
                <Stepper
                  label="No Açougue"
                  value={c.consignment}
                  onChange={(consignment) => update(product.id, { consignment })}
                />
              </div>
            </section>
          );
        })}
    </Sheet>
  );
}
