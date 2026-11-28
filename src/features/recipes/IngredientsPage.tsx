import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/buttons';
import { EntryList, EntryRow, IconBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { belowTargetList, formatQuantity, referencePrice } from '../../domain/recipes';
import type { Ingredient } from '../../domain/types';
import { formatCents } from '../../lib/money';
import { IngredientSheet } from './IngredientSheet';
import { loadRecipeData, sortedIngredients } from './recipeData';

type OpenSheet = { ingredient?: Ingredient } | null;

/** Ingredientes (tela 32): o preço pago em cada um. Mudar o preço recalcula todas as receitas. */
export function IngredientsPage() {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<string | null>(null);
  const data = useLiveQuery(loadRecipeData, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const saved = async ({ name, rose, message: text }: { name: string; rose: boolean; message: string }) => {
    setSheet(null);
    if (rose) {
      // O preço subiu: se algum sabor ficou abaixo da margem, mostra quais (tela 33).
      const fresh = await loadRecipeData();
      const below = belowTargetList(fresh.products, fresh.recipes, fresh.items, fresh.ingredients);
      if (below.length > 0) {
        navigate('/receitas/abaixo', { state: { rose: name } });
        return;
      }
    }
    setMessage(text);
  };

  const ingredients = data ? sortedIngredients(data.ingredients) : [];

  return (
    <TabLayout actions={<BigButton variant="secondary" onClick={() => setSheet({})}>Adicionar ingrediente</BigButton>}>
      <BackTitle>Ingredientes</BackTitle>

      {message && <Notice kind="success">{message}</Notice>}

      {data && ingredients.length === 0 && (
        <Notice>Cadastre o que vai nas receitas e quanto pagou em cada um</Notice>
      )}

      {ingredients.length > 0 && (
        <EntryList>
          {ingredients.map((ingredient) => {
            const ref = referencePrice(ingredient);
            return (
              <EntryRow
                key={ingredient.id}
                badge={<IconBadge icon="receipt" />}
                title={ingredient.name}
                detail={`${formatCents(ingredient.pricePaidCents)} por ${formatQuantity(ingredient.packageQty, ingredient.unit)}`}
                value={`${formatCents(Math.round(ref.cents))}/${ref.unit}`}
                onClick={() => setSheet({ ingredient })}
              />
            );
          })}
        </EntryList>
      )}

      {sheet && <IngredientSheet ingredient={sheet.ingredient} onClose={() => setSheet(null)} onSaved={(r) => void saved(r)} />}
    </TabLayout>
  );
}
