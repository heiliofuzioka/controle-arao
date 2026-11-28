import { useLiveQuery } from 'dexie-react-hooks';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BigButton } from '../../components/buttons';
import { HeroCard, SectionTitle } from '../../components/cards';
import { EntryList, EntryRow, IconBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { recipeCost } from '../../domain/pricing';
import { formatQuantity, recipeLines, recipeTitle } from '../../domain/recipes';
import { formatCents } from '../../lib/money';
import { loadRecipeData } from './recipeData';
import styles from './Recipes.module.css';

/** Detalhe do sabor (tela 30): custo de cada unidade, ingredientes do lote, outros custos, preparo. */
export function RecipeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const view = useLiveQuery(async () => {
    const data = await loadRecipeData();
    const recipe = data.recipes.find((r) => r.id === id && !r.deletedAt);
    if (!recipe) return { missing: true as const };
    const product = data.products.find((p) => p.id === recipe.productId);
    const category = product ? await db.categories.get(product.categoryId) : undefined;
    return {
      missing: false as const,
      recipe,
      product,
      category,
      title: recipeTitle(product, recipe),
      cost: recipeCost(recipe, data.items, data.ingredientsById),
      lines: recipeLines(recipe.id, data.items, data.ingredientsById),
    };
  }, [id]);

  if (view?.missing) return <Navigate to="/receitas" replace />;
  const v = view && !view.missing ? view : null;

  return (
    <TabLayout
      actions={
        v && (
          <>
            <BigButton variant="secondary" onClick={() => navigate(`/receitas/${id}/editar`)}>
              Editar
            </BigButton>
            <BigButton onClick={() => navigate(`/receitas/${id}/preco`)}>Calcular preço</BigButton>
          </>
        )
      }
    >
      <BackTitle>{v?.title ?? ''}</BackTitle>

      {v && (
        <>
          <div className={styles.chips}>
            {v.category && <span className={styles.chip}>{v.category.name}</span>}
            <span className={styles.chip}>Rende {v.recipe.yield}</span>
            {!v.recipe.active && <span className={styles.chip}>Não faz mais</span>}
          </div>

          <HeroCard
            label="Custo de cada unidade"
            value={formatCents(Math.round(v.cost.unitCost))}
            detail={`Lote ${formatCents(Math.round(v.cost.batchCost))} · rende ${v.recipe.yield}`}
          />

          <section className={styles.section}>
            <SectionTitle>Ingredientes do lote</SectionTitle>
            {v.lines.length > 0 ? (
              <EntryList>
                {v.lines.map(({ item, ingredient, cost }) => (
                  <EntryRow
                    key={item.id}
                    badge={<IconBadge icon="receipt" />}
                    title={ingredient.name}
                    detail={formatQuantity(item.quantity, ingredient.unit)}
                    value={formatCents(Math.round(cost))}
                  />
                ))}
              </EntryList>
            ) : (
              <Notice action={{ label: 'Editar', onClick: () => navigate(`/receitas/${id}/editar`) }}>
                Coloque os ingredientes para calcular o custo
              </Notice>
            )}
          </section>

          {(v.recipe.laborPerBatchCents > 0 || v.recipe.packagingPerUnitCents > 0 || v.recipe.otherCostsPerBatchCents > 0) && (
            <section className={styles.section}>
              <SectionTitle>Outros custos do lote</SectionTitle>
              <EntryList>
                {v.recipe.laborPerBatchCents > 0 && (
                  <EntryRow
                    badge={<IconBadge icon="wallet" />}
                    title="Mão de obra"
                    detail="Diária da avó ÷ lotes do dia"
                    value={formatCents(v.recipe.laborPerBatchCents)}
                  />
                )}
                {v.recipe.packagingPerUnitCents > 0 && (
                  <EntryRow
                    badge={<IconBadge icon="wallet" />}
                    title="Embalagem"
                    detail={`${formatCents(v.recipe.packagingPerUnitCents)} por unidade`}
                    value={formatCents(v.recipe.packagingPerUnitCents * v.recipe.yield)}
                  />
                )}
                {v.recipe.otherCostsPerBatchCents > 0 && (
                  <EntryRow
                    badge={<IconBadge icon="wallet" />}
                    title="Outros custos"
                    detail="Gás, luz e o que mais entra no lote"
                    value={formatCents(v.recipe.otherCostsPerBatchCents)}
                  />
                )}
              </EntryList>
            </section>
          )}

          {v.recipe.preparation && (
            <section className={styles.section}>
              <SectionTitle>Modo de preparo</SectionTitle>
              <p className={styles.textCard}>{v.recipe.preparation}</p>
            </section>
          )}

          {v.recipe.notes && (
            <section className={styles.section}>
              <SectionTitle>Observações</SectionTitle>
              <p className={styles.textCard}>{v.recipe.notes}</p>
            </section>
          )}
        </>
      )}
    </TabLayout>
  );
}
