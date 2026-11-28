import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState } from 'react';
import { BigButton, ChoiceButton } from '../../components/buttons';
import { ErrorLine, MoneyField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { deleteIngredient, RecipeBlockedError, saveIngredient } from '../../db/operations';
import {
  formatQuantityInput,
  ingredientErrors,
  ingredientFields,
  parseQuantityInput,
  quantityForInput,
  recipesUsingIngredient,
  referencePrice,
} from '../../domain/recipes';
import type { Cents, ID, Ingredient } from '../../domain/types';
import type { InputUnit } from '../../domain/units';
import { formatPlural } from '../../lib/format';
import { formatCents } from '../../lib/money';
import styles from './Recipes.module.css';

const UNITS: InputUnit[] = ['g', 'kg', 'ml', 'L', 'un'];

interface Props {
  /** Ingrediente a editar. Sem isso, é um ingrediente novo. */
  ingredient?: Ingredient;
  onClose: () => void;
  /** `rose`: o preço subiu (as receitas se recalculam e podem ficar abaixo da margem). */
  onSaved: (result: { id: ID; name: string; rose: boolean; message: string }) => void;
}

/** Folha do ingrediente: nome, quanto pagou e o tamanho da embalagem. */
export function IngredientSheet({ ingredient, onClose, onSaved }: Props) {
  const quantityId = useId();
  const initial = ingredient ? quantityForInput(ingredient.packageQty, ingredient.unit) : null;

  const view = useLiveQuery(async () => {
    const [ingredients, recipes, items] = await Promise.all([
      db.ingredients.toArray(),
      db.recipes.toArray(),
      db.recipeItems.toArray(),
    ]);
    return { ingredients, usedIn: ingredient ? recipesUsingIngredient(ingredient.id, recipes, items).length : 0 };
  }, [ingredient?.id]);

  const [name, setName] = useState(ingredient?.name ?? '');
  const [priceCents, setPriceCents] = useState<Cents | null>(ingredient?.pricePaidCents ?? null);
  const [quantityText, setQuantityText] = useState(initial ? formatQuantityInput(initial.value) : '');
  const [unit, setUnit] = useState<InputUnit>(initial?.unit ?? 'g');
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const input = { name, pricePaidCents: priceCents, packageQty: parseQuantityInput(quantityText), unit };
  const errors = view ? ingredientErrors(input, view.ingredients, ingredient?.id) : {};
  const valid = Object.keys(errors).length === 0;
  const preview = valid ? referencePrice(ingredientFields(input)) : null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
    } catch (error) {
      setFailure(error instanceof RecipeBlockedError ? error.message : 'Não deu para salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const save = () => {
    setTried(true);
    if (!valid || busy || !view) return;
    void run(async () => {
      const result = await saveIngredient(db, { id: ingredient?.id, ...input });
      onSaved({ ...result, name: name.trim(), message: ingredient ? 'Ingrediente salvo' : 'Ingrediente criado' });
    });
  };

  return (
    <Sheet
      title={ingredient ? 'Ingrediente' : 'Novo ingrediente'}
      onClose={onClose}
      footer={
        <>
          {failure && <Notice kind="error">{failure}</Notice>}
          {ingredient && view?.usedIn === 0 && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await deleteIngredient(db, ingredient.id);
                  onSaved({ id: ingredient.id, name: ingredient.name, rose: false, message: 'Ingrediente apagado' });
                })
              }
            >
              Apagar mesmo
            </BigButton>
          )}
          {ingredient && view?.usedIn === 0 && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar ingrediente
            </BigButton>
          )}
          <BigButton onClick={save} disabled={busy || !view}>
            Salvar ingrediente
          </BigButton>
        </>
      }
    >
      <TextField
        label="Nome"
        placeholder="Chocolate 50%"
        value={name}
        onChange={setName}
        maxLength={40}
        autoFocus={!ingredient}
        error={tried ? errors.name : undefined}
      />

      <MoneyField
        label="Quanto pagou"
        valueCents={priceCents}
        onChange={setPriceCents}
        error={tried ? errors.pricePaidCents : undefined}
      />

      <div className={styles.group}>
        <label htmlFor={quantityId} className={styles.label}>
          Tamanho da embalagem
        </label>
        <input
          id={quantityId}
          className={`${styles.textInput} ${tried && errors.packageQty ? styles.invalid : ''}`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="1"
          value={quantityText}
          onChange={(e) => setQuantityText(e.target.value)}
        />
        <div className={styles.units} role="group" aria-label="Unidade">
          {UNITS.map((u) => (
            <ChoiceButton key={u} selected={u === unit} onClick={() => setUnit(u)}>
              {u}
            </ChoiceButton>
          ))}
        </div>
        {tried && errors.packageQty && <ErrorLine>{errors.packageQty}</ErrorLine>}
      </div>

      {preview && (
        <p className={styles.hint}>
          Sai a {formatCents(preview.cents)} por {preview.unit}
        </p>
      )}
      {ingredient && view && view.usedIn > 0 && (
        <p className={styles.hint}>
          Está em {formatPlural(view.usedIn, 'receita', 'receitas')}. Mudar o preço recalcula o custo de todas.
        </p>
      )}
    </Sheet>
  );
}
