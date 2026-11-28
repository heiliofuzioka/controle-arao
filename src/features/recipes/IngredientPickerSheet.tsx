import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { EntryList, EntryRow, IconBadge } from '../../components/EntryList';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { formatQuantity } from '../../domain/recipes';
import type { ID, Ingredient } from '../../domain/types';
import { formatCents } from '../../lib/money';
import { IngredientSheet } from './IngredientSheet';
import { sortedIngredients } from './recipeData';
import styles from './Recipes.module.css';

/** Escolher um ingrediente para a receita (ou cadastrar um novo na hora). */
export function IngredientPickerSheet({
  exclude,
  onClose,
  onPick,
}: {
  /** Ingredientes que já estão na receita. */
  exclude: ID[];
  onClose: () => void;
  onPick: (ingredient: Ingredient) => void;
}) {
  const [creating, setCreating] = useState(false);
  const ingredients = useLiveQuery(async () => sortedIngredients(await db.ingredients.toArray()), []);
  const available = (ingredients ?? []).filter((i) => !exclude.includes(i.id));

  if (creating) {
    return (
      <IngredientSheet
        onClose={() => setCreating(false)}
        onSaved={async ({ id }) => {
          const created = await db.ingredients.get(id);
          if (created) onPick(created);
          else setCreating(false);
        }}
      />
    );
  }

  return (
    <Sheet
      title="Adicionar ingrediente"
      onClose={onClose}
      footer={
        <BigButton variant="secondary" onClick={() => setCreating(true)}>
          Novo ingrediente
        </BigButton>
      }
    >
      {ingredients && available.length === 0 && (
        <p className={styles.hint}>
          {ingredients.length === 0 ? 'Nenhum ingrediente cadastrado ainda.' : 'Todos os ingredientes já estão na receita.'}
        </p>
      )}
      {available.length > 0 && (
        <EntryList>
          {available.map((ingredient) => (
            <EntryRow
              key={ingredient.id}
              badge={<IconBadge icon="receipt" />}
              title={ingredient.name}
              detail={`${formatCents(ingredient.pricePaidCents)} por ${formatQuantity(ingredient.packageQty, ingredient.unit)}`}
              onClick={() => onPick(ingredient)}
            />
          ))}
        </EntryList>
      )}
    </Sheet>
  );
}
