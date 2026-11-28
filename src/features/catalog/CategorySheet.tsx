import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { CatalogBlockedError, deleteCategory, saveCategory } from '../../db/operations';
import { categoryNameError } from '../../domain/catalog';
import { alive } from '../../domain/records';
import type { Category } from '../../domain/types';
import styles from './Catalog.module.css';

interface Props {
  /** Categoria a renomear. Sem isso, é uma categoria nova. */
  category?: Category;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha da categoria: nome; apagar só quando não tem produto. */
export function CategorySheet({ category, onClose, onSaved }: Props) {
  const view = useLiveQuery(async () => {
    const [categories, products] = await Promise.all([db.categories.toArray(), db.products.toArray()]);
    return {
      categories,
      empty: category ? !alive(products).some((p) => p.categoryId === category.id) : true,
    };
  }, [category?.id]);

  const [name, setName] = useState(category?.name ?? '');
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const error = view ? categoryNameError(name, view.categories, category?.id) : null;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
      onSaved(message);
    } catch (e) {
      setFailure(e instanceof CatalogBlockedError ? e.message : 'Não deu para salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const save = () => {
    setTried(true);
    if (error || busy || !view) return;
    void run(() => saveCategory(db, { id: category?.id, name }), category ? 'Categoria salva' : 'Categoria criada');
  };

  return (
    <Sheet
      title={category ? 'Categoria' : 'Nova categoria'}
      size="auto"
      onClose={onClose}
      footer={
        <>
          {failure && <Notice kind="error">{failure}</Notice>}
          {category && view?.empty && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() => void run(() => deleteCategory(db, category.id), 'Categoria apagada')}
            >
              Apagar mesmo
            </BigButton>
          )}
          {category && view?.empty && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar categoria
            </BigButton>
          )}
          <BigButton onClick={save} disabled={busy || !view}>
            Salvar categoria
          </BigButton>
        </>
      }
    >
      <TextField
        label="Nome"
        placeholder="Cookies"
        value={name}
        onChange={setName}
        maxLength={40}
        autoFocus={!category}
        error={tried && error ? error : undefined}
      />
      {category && view && !view.empty && (
        <p className={styles.hint}>Para apagar a categoria, mude os produtos dela para outra antes.</p>
      )}
    </Sheet>
  );
}
