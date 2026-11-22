import type { ID, Product } from '../domain/types';
import { formatCents } from '../lib/money';
import { ProductBadge } from './EntryList';
import styles from './ProductPicker.module.css';

/** Seletor de produto: cards de 2 em 2 com a sigla, o nome e o preço. */
export function ProductPicker({
  products,
  selectedId,
  onSelect,
  disabled = false,
}: {
  products: Product[];
  selectedId: ID | null;
  onSelect: (id: ID) => void;
  /** Na edição o produto não muda. */
  disabled?: boolean;
}) {
  return (
    <div className={styles.group} role="group" aria-label="Produto">
      <p className={styles.label}>Produto</p>
      <div className={styles.grid}>
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            className={styles.card}
            aria-pressed={product.id === selectedId}
            disabled={disabled && product.id !== selectedId}
            onClick={() => onSelect(product.id)}
          >
            <span className={styles.badge}>
              <ProductBadge code={product.code} />
            </span>
            <span className={styles.texts}>
              <span className={styles.name}>{product.name}</span>
              <span className={styles.price}>
                {product.priceCents > 0 ? formatCents(product.priceCents) : 'Sem preço'}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
