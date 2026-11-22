import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { Stepper } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { ProductPicker } from '../../components/ProductPicker';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { ButcherBlockedError, deleteDelivery, loadActiveProducts, loadStockData, saveDelivery } from '../../db/operations';
import { toLocalDate } from '../../domain/dates';
import { consignmentStock, homeStock } from '../../domain/stock';
import type { Delivery, ID } from '../../domain/types';
import { formatCount } from '../../lib/format';
import styles from './butcherSheets.module.css';

interface Props {
  /** Entrega a editar. Sem isso, é uma entrega nova (hoje). */
  delivery?: Delivery;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha "Entregar no Açougue": produto, quantidade e como fica depois. */
export function DeliverySheet({ delivery, onClose, onSaved }: Props) {
  const data = useLiveQuery(async () => {
    const [products, stock] = await Promise.all([loadActiveProducts(db), loadStockData(db)]);
    return { products, stock };
  }, []);
  const [productId, setProductId] = useState<ID | null>(delivery?.productId ?? null);
  const [quantity, setQuantity] = useState(delivery?.quantity ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = data?.products.find((p) => p.id === productId);
  // Na edição, "agora" é sem esta entrega.
  const editingSame = delivery && delivery.productId === productId ? delivery.quantity : 0;
  const atButcher = data && productId ? consignmentStock(data.stock, productId) - editingSame : 0;
  const atHome = data && productId ? homeStock(data.stock, productId) + editingSame - quantity : 0;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSaved(message);
    } catch (e) {
      setError(e instanceof ButcherBlockedError ? e.message : 'Não deu para salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const save = () => {
    if (!product || quantity <= 0 || busy) return;
    void run(
      () => saveDelivery(db, { id: delivery?.id, date: delivery?.date ?? toLocalDate(new Date()), productId: product.id, quantity }),
      delivery ? 'Entrega salva' : `${formatCount(quantity, product.name)} no Açougue`,
    );
  };

  const label = !product
    ? 'Escolha o produto'
    : quantity <= 0
      ? 'Quantos vai levar?'
      : delivery
        ? 'Salvar entrega'
        : `Entregar ${formatCount(quantity, product.name)}`;

  return (
    <Sheet
      title="Entregar no Açougue"
      onClose={onClose}
      footer={
        <>
          {error && <Notice kind="error">{error}</Notice>}
          {delivery && confirmDelete && (
            <BigButton variant="danger" disabled={busy} onClick={() => void run(() => deleteDelivery(db, delivery.id), 'Entrega apagada')}>
              Apagar mesmo
            </BigButton>
          )}
          {delivery && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar entrega
            </BigButton>
          )}
          <BigButton onClick={save} disabled={!product || quantity <= 0 || busy}>
            {label}
          </BigButton>
        </>
      }
    >
      {data && (
        <ProductPicker
          products={data.products}
          selectedId={productId}
          onSelect={(id) => {
            setProductId(id);
            setError(null);
          }}
        />
      )}

      <Stepper large label="Quantos vai levar?" value={quantity} onChange={(q) => { setQuantity(q); setError(null); }} />

      {product && (
        <section className={styles.summary}>
          <p className={styles.summaryLabel}>No Açougue depois da entrega</p>
          <p className={styles.summaryValue}>{formatCount(atButcher + quantity, product.name)}</p>
          <p className={styles.summaryLabel}>
            Agora: {atButcher}
            {/* Antes do fechamento da semana o estoque de casa ainda não conta o que foi feito. */}
            {atHome >= 0 ? ` · Em casa ficam ${atHome}` : ''}
          </p>
        </section>
      )}
    </Sheet>
  );
}
