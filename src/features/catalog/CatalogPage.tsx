import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BigButton } from '../../components/buttons';
import { SectionTitle } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { catalogGroups, flavorCount } from '../../domain/catalog';
import type { Category, Product } from '../../domain/types';
import { formatPlural } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { CategorySheet } from './CategorySheet';
import styles from './Catalog.module.css';
import { ProductSheet } from './ProductSheet';

type OpenSheet = { kind: 'product'; product?: Product } | { kind: 'category'; category?: Category } | null;

/** Categorias e produtos (Ajustes): criar, editar e organizar. */
export function CatalogPage() {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<string | null>(null);

  const view = useLiveQuery(async () => {
    const [categories, products, recipes] = await Promise.all([
      db.categories.toArray(),
      db.products.toArray(),
      db.recipes.toArray(),
    ]);
    return { groups: catalogGroups(categories, products), recipes };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const close = () => setSheet(null);
  const saved = (text: string) => {
    setSheet(null);
    setMessage(text);
  };

  const detail = (product: Product) => {
    const flavors = flavorCount(view?.recipes ?? [], product.id);
    const parts = [
      product.code,
      product.priceCents > 0 ? formatCents(product.priceCents) : 'Sem preço',
      ...(flavors > 0 ? [formatPlural(flavors, 'sabor', 'sabores')] : []),
    ];
    return product.active ? parts.join(' · ') : `${parts.join(' · ')} · não vende mais`;
  };

  return (
    <TabLayout
      actions={
        <>
          <BigButton variant="secondary" onClick={() => setSheet({ kind: 'category' })}>
            Nova categoria
          </BigButton>
          <BigButton onClick={() => setSheet({ kind: 'product' })}>Novo produto</BigButton>
        </>
      }
    >
      <BackTitle>Categorias e produtos</BackTitle>

      {message && <Notice kind="success">{message}</Notice>}

      {view?.groups.map(({ category, products }) => (
        <section key={category.id} className={styles.section}>
          <div className={styles.head}>
            <SectionTitle>{category.name}</SectionTitle>
            <button
              type="button"
              className={styles.link}
              aria-label={`Editar a categoria ${category.name}`}
              onClick={() => setSheet({ kind: 'category', category })}
            >
              Editar
            </button>
          </div>
          {products.length > 0 ? (
            <EntryList>
              {products.map((product) => (
                <EntryRow
                  key={product.id}
                  badge={<ProductBadge code={product.code} />}
                  title={product.name}
                  detail={detail(product)}
                  chevron
                  onClick={() => setSheet({ kind: 'product', product })}
                />
              ))}
            </EntryList>
          ) : (
            <p className={styles.empty}>Nenhum produto nesta categoria</p>
          )}
        </section>
      ))}

      {sheet?.kind === 'product' && <ProductSheet product={sheet.product} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'category' && <CategorySheet category={sheet.category} onClose={close} onSaved={saved} />}
    </TabLayout>
  );
}
