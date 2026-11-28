import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BigButton, ChoiceButton } from '../../components/buttons';
import { HeroCard, SectionTitle } from '../../components/cards';
import { ErrorLine, MoneyField, PercentField, Stepper, TextArea, TextField, Toggle } from '../../components/fields';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { ProductPicker } from '../../components/ProductPicker';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { deleteRecipe, RecipeBlockedError, saveRecipe } from '../../db/operations';
import { recipeCost } from '../../domain/pricing';
import { alive } from '../../domain/records';
import {
  formatPercentInput,
  formatQuantityInput,
  parsePercentInput,
  parseQuantityInput,
  pricePerBaseUnit,
  quantityForInput,
  recipeErrors,
} from '../../domain/recipes';
import type { Cents, ID, Ingredient, Recipe, RecipeItem } from '../../domain/types';
import { inputUnitsFor, toBaseQuantity, type InputUnit } from '../../domain/units';
import { formatCents } from '../../lib/money';
import { IngredientPickerSheet } from './IngredientPickerSheet';
import { loadRecipeData } from './recipeData';
import styles from './Recipes.module.css';

/** Meta de margem de um sabor novo (a mesma das telas de exemplo). */
const DEFAULT_MARGIN = 0.6;

interface ItemRow {
  key: string;
  id?: ID;
  ingredientId: ID;
  text: string;
  unit: InputUnit;
}

/** Nova receita / Editar receita. Não tem tela no desenho: segue os campos do livro (tela 30). */
export function RecipeFormPage() {
  const { id } = useParams();
  const data = useLiveQuery(loadRecipeData, []);
  if (!data) return <TabLayout>{null}</TabLayout>;
  const recipe = id ? data.recipes.find((r) => r.id === id && !r.deletedAt) : undefined;
  if (id && !recipe) return <Navigate to="/receitas" replace />;
  return (
    <RecipeForm
      key={id ?? 'nova'}
      recipe={recipe}
      items={recipe ? alive(data.items).filter((i) => i.recipeId === recipe.id) : []}
      ingredientsById={data.ingredientsById}
    />
  );
}

function RecipeForm({
  recipe,
  items,
  ingredientsById,
}: {
  recipe?: Recipe;
  items: RecipeItem[];
  ingredientsById: ReadonlyMap<ID, Ingredient>;
}) {
  const navigate = useNavigate();
  const products = useLiveQuery(async () => (await loadRecipeData()).products, []);
  const allRecipes = useLiveQuery(() => db.recipes.toArray(), []);

  const [name, setName] = useState(recipe?.name ?? '');
  const [productId, setProductId] = useState<ID | null>(recipe?.productId ?? null);
  const [batchYield, setBatchYield] = useState(recipe?.yield ?? 0);
  const [rows, setRows] = useState<ItemRow[]>(() =>
    [...items]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((item) => {
        const unit = ingredientsById.get(item.ingredientId)?.unit ?? 'g';
        const shown = quantityForInput(item.quantity, unit);
        return { key: item.id, id: item.id, ingredientId: item.ingredientId, text: formatQuantityInput(shown.value), unit: shown.unit };
      }),
  );
  const [packaging, setPackaging] = useState<Cents | null>(recipe?.packagingPerUnitCents || null);
  const [labor, setLabor] = useState<Cents | null>(recipe?.laborPerBatchCents || null);
  const [other, setOther] = useState<Cents | null>(recipe?.otherCostsPerBatchCents || null);
  const [margin, setMargin] = useState<number | null>(recipe?.targetMargin ?? DEFAULT_MARGIN);
  const [preparation, setPreparation] = useState(recipe?.preparation ?? '');
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [active, setActive] = useState(recipe?.active ?? true);
  const [picking, setPicking] = useState(false);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Produtos que aparecem: os ativos, mais o da receita (se ele parou de ser vendido).
  const shownProducts = (products ?? []).filter((p) => p.active || p.id === recipe?.productId);

  const draftItems = rows.map((row) => {
    const value = parseQuantityInput(row.text);
    return { id: row.id, ingredientId: row.ingredientId, quantity: value === null ? null : toBaseQuantity(value, row.unit).quantity };
  });
  const draft = { name, productId, yield: batchYield, items: draftItems, targetMargin: margin };
  const errors = allRecipes ? recipeErrors(draft, allRecipes, recipe?.id) : {};
  const valid = Object.keys(errors).length === 0;

  // Custo ao vivo (só quando os números fecham).
  const preview =
    batchYield > 0 && draftItems.every((i) => i.quantity !== null)
      ? recipeCost(
          {
            ...(recipe ?? ({} as Recipe)),
            id: 'rascunho',
            yield: batchYield,
            packagingPerUnitCents: packaging ?? 0,
            laborPerBatchCents: labor ?? 0,
            otherCostsPerBatchCents: other ?? 0,
          },
          draftItems.map((i, n) => ({
            id: `i${n}`,
            createdAt: '',
            updatedAt: '',
            recipeId: 'rascunho',
            ingredientId: i.ingredientId,
            quantity: i.quantity ?? 0,
          })),
          ingredientsById,
        )
      : null;

  const updateRow = (key: string, change: Partial<ItemRow>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const save = async () => {
    setTried(true);
    if (!valid || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const savedId = await saveRecipe(db, {
        id: recipe?.id,
        productId: productId!,
        name,
        yield: batchYield,
        packagingPerUnitCents: packaging ?? 0,
        laborPerBatchCents: labor ?? 0,
        otherCostsPerBatchCents: other ?? 0,
        targetMargin: margin!,
        preparation,
        notes,
        active,
        items: draftItems.map((i) => ({ id: i.id, ingredientId: i.ingredientId, quantity: i.quantity! })),
      });
      navigate(`/receitas/${savedId}`, { replace: true });
    } catch (error) {
      setFailure(error instanceof RecipeBlockedError ? error.message : 'Não deu para salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!recipe) return;
    setBusy(true);
    try {
      await deleteRecipe(db, recipe.id);
      navigate('/receitas', { replace: true });
    } catch {
      setFailure('Não deu para apagar. Tente de novo.');
      setBusy(false);
    }
  };

  return (
    <TabLayout
      actions={
        <BigButton onClick={() => void save()} disabled={busy || !allRecipes}>
          Salvar receita
        </BigButton>
      }
    >
      <BackTitle>{recipe ? 'Editar receita' : 'Nova receita'}</BackTitle>

      <TextField
        label="Sabor"
        placeholder="Tradicional"
        value={name}
        onChange={setName}
        maxLength={40}
        autoFocus={!recipe}
        error={tried ? errors.name : undefined}
      />

      <div className={styles.group}>
        <ProductPicker products={shownProducts} selectedId={productId} onSelect={setProductId} />
        {tried && errors.productId && <ErrorLine>{errors.productId}</ErrorLine>}
      </div>

      <div className={styles.group}>
        <Stepper label="Quantas unidades o lote rende?" value={batchYield} onChange={setBatchYield} large invalid={tried && !!errors.yield} />
        {tried && errors.yield && <ErrorLine>{errors.yield}</ErrorLine>}
      </div>

      <section className={styles.section}>
        <SectionTitle>Ingredientes do lote</SectionTitle>
        {rows.length > 0 && (
          <ul className={styles.itemList}>
            {rows.map((row) => {
              const ingredient = ingredientsById.get(row.ingredientId);
              const value = parseQuantityInput(row.text);
              const cost =
                ingredient && value !== null ? pricePerBaseUnit(ingredient) * toBaseQuantity(value, row.unit).quantity : null;
              const units = ingredient ? inputUnitsFor(ingredient.unit) : [row.unit];
              return (
                <li key={row.key} className={styles.itemRow}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemName}>{ingredient?.name ?? 'Ingrediente apagado'}</span>
                    <span className={styles.itemCost}>{cost === null ? '—' : formatCents(Math.round(cost))}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={`Tirar ${ingredient?.name ?? 'ingrediente'}`}
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                  <div className={styles.itemInputs}>
                    <input
                      className={`${styles.textInput} ${styles.quantityInput} ${tried && value === null ? styles.invalid : ''}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      aria-label={`Quantidade de ${ingredient?.name ?? 'ingrediente'}`}
                      value={row.text}
                      onChange={(e) => updateRow(row.key, { text: e.target.value })}
                    />
                    {units.map((u) => (
                      <ChoiceButton key={u} selected={u === row.unit} onClick={() => updateRow(row.key, { unit: u })}>
                        {u}
                      </ChoiceButton>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {tried && errors.items && <ErrorLine>{errors.items}</ErrorLine>}
        <BigButton variant="secondary" onClick={() => setPicking(true)}>
          Adicionar ingrediente
        </BigButton>
      </section>

      <section className={styles.section}>
        <SectionTitle>Outros custos</SectionTitle>
        <MoneyField
          label="Mão de obra por lote"
          valueCents={labor}
          onChange={setLabor}
          hint={<p className={styles.hint}>Diária da avó ÷ lotes feitos no dia</p>}
        />
        <MoneyField label="Embalagem por unidade" valueCents={packaging} onChange={setPackaging} />
        <MoneyField
          label="Outros custos do lote"
          valueCents={other}
          onChange={setOther}
          hint={<p className={styles.hint}>Gás, luz e o que mais entra no lote</p>}
        />
      </section>

      <PercentField
        label="Margem que você quer"
        value={margin}
        onChange={setMargin}
        parse={parsePercentInput}
        format={formatPercentInput}
        error={tried ? errors.targetMargin : undefined}
        hint={<p className={styles.hint}>Quanto do preço fica de lucro. Usada para avisar quando o custo sobe.</p>}
      />

      <TextArea label="Modo de preparo (opcional)" value={preparation} onChange={setPreparation} />
      <TextArea label="Observações (opcional)" value={notes} onChange={setNotes} />

      {recipe && (
        <Toggle
          label="Ainda faço este sabor"
          detail={active ? 'Entra no custo do produto' : 'Fica no livro, mas não entra no custo'}
          checked={active}
          onChange={setActive}
        />
      )}

      {preview && (
        <HeroCard
          label="Custo de cada unidade"
          value={formatCents(Math.round(preview.unitCost))}
          detail={`Lote ${formatCents(Math.round(preview.batchCost))} · rende ${batchYield}`}
        />
      )}

      {failure && <Notice kind="error">{failure}</Notice>}

      {recipe &&
        (confirmDelete ? (
          <BigButton variant="danger" disabled={busy} onClick={() => void remove()}>
            Apagar mesmo
          </BigButton>
        ) : (
          <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
            Apagar receita
          </BigButton>
        ))}

      {picking && (
        <IngredientPickerSheet
          exclude={rows.map((r) => r.ingredientId)}
          onClose={() => setPicking(false)}
          onPick={(ingredient) => {
            setPicking(false);
            setRows((current) => [
              ...current,
              { key: crypto.randomUUID(), ingredientId: ingredient.id, text: '', unit: inputUnitsFor(ingredient.unit)[0]! },
            ]);
          }}
        />
      )}
    </TabLayout>
  );
}
