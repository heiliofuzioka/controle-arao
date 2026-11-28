import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { setProductPrice } from '../../db/operations';
import type { Cents, Product } from '../../domain/types';
import { formatCents } from '../../lib/money';
import styles from './Recipes.module.css';

/** "Aplicar novo preço?" (tela 34): muda o preço do produto só depois da confirmação. */
export function ApplyPriceSheet({
  product,
  priceCents,
  allFlavors,
  onClose,
  onApplied,
}: {
  product: Product;
  priceCents: Cents;
  /** O produto tem mais de um sabor: o preço vale para todos. */
  allFlavors: boolean;
  onClose: () => void;
  onApplied: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const same = product.priceCents === priceCents;

  const apply = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await setProductPrice(db, product.id, priceCents);
      onApplied(`${product.name} agora custa ${formatCents(priceCents)}`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Aplicar novo preço?"
      size="auto"
      onClose={onClose}
      footer={
        <>
          {failed && <Notice kind="error">Não deu para salvar. Tente de novo.</Notice>}
          <BigButton disabled={busy || same} onClick={() => void apply()}>
            {same ? 'Já é o preço atual' : `Aplicar ${formatCents(priceCents)}`}
          </BigButton>
          <BigButton variant="secondary" disabled={busy} onClick={onClose}>
            Agora não
          </BigButton>
        </>
      }
    >
      <div className={styles.priceCard}>
        <p className={styles.priceCardLabel}>
          {product.name}
          {allFlavors ? ' (todos os sabores)' : ''}
        </p>
        <p className={styles.priceChange}>
          <span>{product.priceCents > 0 ? formatCents(product.priceCents) : 'Sem preço'}</span>
          <span className={styles.arrow} aria-label="para">
            →
          </span>
          <span>{formatCents(priceCents)}</span>
        </p>
        <p className={styles.priceCardDetail}>Vale para as próximas semanas. As vendas antigas não mudam.</p>
      </div>
    </Sheet>
  );
}
