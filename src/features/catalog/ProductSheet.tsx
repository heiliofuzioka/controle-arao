import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton, ChoiceButton } from '../../components/buttons';
import { ErrorLine, MoneyField, TextField, Toggle } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { CatalogBlockedError, deleteProduct, loadStockData, saveCategory, saveProduct } from '../../db/operations';
import { catalogGroups, categoryNameError, productErrors, productInUse } from '../../domain/catalog';
import type { Cents, ID, Product } from '../../domain/types';
import styles from './Catalog.module.css';

interface Props {
  /** Produto a editar. Sem isso, é um produto novo. */
  product?: Product;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha "Novo produto" (tela 39), também usada para editar. */
export function ProductSheet({ product, onClose, onSaved }: Props) {
  const view = useLiveQuery(async () => {
    const [categories, products, recipes, stock] = await Promise.all([
      db.categories.toArray(),
      db.products.toArray(),
      db.recipes.toArray(),
      loadStockData(db),
    ]);
    return {
      categories: catalogGroups(categories, []).map((g) => g.category),
      allCategories: categories,
      products,
      inUse: product ? productInUse(product.id, { ...stock, recipes }) : false,
    };
  }, [product?.id]);

  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState<ID | null>(product?.categoryId ?? null);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [code, setCode] = useState(product?.code ?? '');
  const [priceCents, setPriceCents] = useState<Cents | null>(product ? product.priceCents || null : null);
  const [active, setActive] = useState(product?.active ?? true);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const creatingCategory = newCategory !== null;
  const errors = view
    ? productErrors({ name, code, categoryId: creatingCategory ? 'nova' : categoryId }, view.products, product?.id)
    : {};
  const newCategoryError = creatingCategory && view ? categoryNameError(newCategory, view.allCategories) : null;
  const valid = Object.keys(errors).length === 0 && !newCategoryError;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
      onSaved(message);
    } catch (error) {
      setFailure(error instanceof CatalogBlockedError ? error.message : 'Não deu para salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const save = () => {
    setTried(true);
    if (!valid || busy) return;
    // Categoria nova e produto na mesma transação: se o produto falhar, a categoria não fica.
    void run(
      () =>
        db.transaction('rw', db.categories, db.products, async () => {
          const category = creatingCategory ? await saveCategory(db, { name: newCategory }) : categoryId;
          await saveProduct(db, { id: product?.id, name, code, categoryId: category, priceCents: priceCents ?? 0, active });
        }),
      product ? 'Produto salvo' : 'Produto criado',
    );
  };

  return (
    <Sheet
      title={product ? 'Produto' : 'Novo produto'}
      onClose={onClose}
      footer={
        <>
          {failure && <Notice kind="error">{failure}</Notice>}
          {product && !view?.inUse && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() => void run(() => deleteProduct(db, product.id), 'Produto apagado')}
            >
              Apagar mesmo
            </BigButton>
          )}
          {product && !view?.inUse && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar produto
            </BigButton>
          )}
          <BigButton onClick={save} disabled={busy || !view}>
            Salvar produto
          </BigButton>
        </>
      }
    >
      <TextField
        label="Nome"
        placeholder="Brownie de pote"
        value={name}
        onChange={setName}
        maxLength={40}
        autoFocus={!product}
        error={tried ? errors.name : undefined}
      />

      <div className={styles.group} role="group" aria-label="Categoria">
        <p className={styles.label}>Categoria</p>
        <div className={styles.chips}>
          {view?.categories.map((category) => (
            <ChoiceButton
              key={category.id}
              selected={!creatingCategory && category.id === categoryId}
              onClick={() => {
                setCategoryId(category.id);
                setNewCategory(null);
              }}
            >
              {category.name}
            </ChoiceButton>
          ))}
          <ChoiceButton selected={creatingCategory} onClick={() => setNewCategory(creatingCategory ? null : '')}>
            + Nova
          </ChoiceButton>
        </div>
        {tried && !creatingCategory && errors.categoryId && <ErrorLine>{errors.categoryId}</ErrorLine>}
      </div>

      {creatingCategory && (
        <TextField
          label="Nome da categoria nova"
          placeholder="Cookies"
          value={newCategory}
          onChange={setNewCategory}
          maxLength={40}
          autoFocus
          error={tried && newCategoryError ? newCategoryError : undefined}
        />
      )}

      <div className={styles.pair}>
        <TextField
          label="Sigla"
          placeholder="P"
          value={code}
          onChange={setCode}
          maxLength={2}
          error={tried ? errors.code : undefined}
        />
        <MoneyField label="Preço" valueCents={priceCents} onChange={setPriceCents} />
      </div>

      {product ? (
        <Toggle
          label="Ainda vendo"
          detail={active ? 'Aparece no fechamento da semana' : 'Não aparece no fechamento; o histórico continua'}
          checked={active}
          onChange={setActive}
        />
      ) : (
        <p className={styles.hint}>O produto novo aparece no fechamento da semana, nos gráficos e nas receitas.</p>
      )}
      {product && view?.inUse && (
        <p className={styles.hint}>Este produto já tem lançamentos ou receitas: para tirar do fechamento, desligue "Ainda vendo".</p>
      )}
      {product && (
        <p className={styles.hint}>Preço novo vale para as próximas semanas. As vendas antigas não mudam.</p>
      )}
    </Sheet>
  );
}
