import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BigButton } from '../../components/buttons';
import { TextField, Toggle } from '../../components/fields';
import { EntryList, EntryRow, IconBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { CatalogBlockedError, deleteExpenseCategory, saveExpenseCategory } from '../../db/operations';
import { categoryNameError } from '../../domain/catalog';
import { alive, byCreation } from '../../domain/records';
import type { ExpenseCategory } from '../../domain/types';
import { formatPlural } from '../../lib/format';
import styles from './SettingsPage.module.css';

/** Categorias de despesa (Ajustes). Não tem tela no desenho: lista e folha, como Categorias e produtos. */
export function ExpenseCategoriesPage() {
  const [sheet, setSheet] = useState<{ category?: ExpenseCategory } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const view = useLiveQuery(async () => {
    const [categories, expenses] = await Promise.all([db.expenseCategories.toArray(), db.expenses.toArray()]);
    const used = new Map<string, number>();
    for (const e of alive(expenses)) used.set(e.categoryId, (used.get(e.categoryId) ?? 0) + 1);
    return { categories: byCreation(alive(categories)), used };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <TabLayout actions={<BigButton onClick={() => setSheet({})}>Nova categoria</BigButton>}>
      <BackTitle>Categorias de despesa</BackTitle>
      {message && <Notice kind="success">{message}</Notice>}

      {view && (
        <EntryList>
          {view.categories.map((category) => {
            const count = view.used.get(category.id) ?? 0;
            return (
              <EntryRow
                key={category.id}
                badge={<IconBadge icon="receipt" />}
                title={category.name}
                detail={[
                  count > 0 ? formatPlural(count, 'despesa', 'despesas') : 'Nenhuma despesa',
                  ...(category.isProductCost ? ['já entra no custo das receitas'] : []),
                ].join(' · ')}
                chevron
                onClick={() => setSheet({ category })}
              />
            );
          })}
        </EntryList>
      )}

      {sheet && view && (
        <ExpenseCategorySheet
          category={sheet.category}
          categories={view.categories}
          used={sheet.category ? (view.used.get(sheet.category.id) ?? 0) > 0 : false}
          onClose={() => setSheet(null)}
          onSaved={(text) => {
            setSheet(null);
            setMessage(text);
          }}
        />
      )}
    </TabLayout>
  );
}

function ExpenseCategorySheet({
  category,
  categories,
  used,
  onClose,
  onSaved,
}: {
  category?: ExpenseCategory;
  categories: ExpenseCategory[];
  used: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [isProductCost, setIsProductCost] = useState(category?.isProductCost ?? false);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const error = categoryNameError(name, categories, category?.id);

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
    if (error || busy) return;
    void run(
      () => saveExpenseCategory(db, { id: category?.id, name, isProductCost }),
      category ? 'Categoria salva' : 'Categoria criada',
    );
  };

  return (
    <Sheet
      title={category ? 'Categoria de despesa' : 'Nova categoria'}
      size="auto"
      onClose={onClose}
      footer={
        <>
          {failure && <Notice kind="error">{failure}</Notice>}
          {category && !used && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() => void run(() => deleteExpenseCategory(db, category.id), 'Categoria apagada')}
            >
              Apagar mesmo
            </BigButton>
          )}
          {category && !used && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar categoria
            </BigButton>
          )}
          <BigButton onClick={save} disabled={busy}>
            Salvar categoria
          </BigButton>
        </>
      }
    >
      <TextField
        label="Nome"
        placeholder="Aluguel"
        value={name}
        onChange={setName}
        maxLength={40}
        autoFocus={!category}
        error={tried && error ? error : undefined}
      />
      <Toggle
        label="Já entra no custo das receitas"
        detail={
          isProductCost
            ? 'Como Ingredientes e Embalagens: não desconta de novo no lucro'
            : 'Desconta do lucro estimado do mês'
        }
        checked={isProductCost}
        onChange={setIsProductCost}
      />
      {category && used && <p className={styles.hint}>Esta categoria já tem despesas, por isso não pode ser apagada.</p>}
    </Sheet>
  );
}
