import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/buttons';
import { SectionTitle } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { alive } from '../../domain/records';
import { belowTargetList, recipeBook } from '../../domain/recipes';
import { formatPlural } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { loadRecipeData } from './recipeData';
import styles from './Recipes.module.css';

/** Receitas (tela 29): o livro, um grupo por produto, com o custo de cada sabor. */
export function RecipesPage() {
  const navigate = useNavigate();

  const view = useLiveQuery(async () => {
    const data = await loadRecipeData();
    return {
      book: recipeBook(data.products, data.recipes, data.items, data.ingredients),
      below: belowTargetList(data.products, data.recipes, data.items, data.ingredients).length,
      hasIngredients: alive(data.ingredients).length > 0,
    };
  }, []);

  return (
    <TabLayout
      actions={
        <>
          <BigButton variant="secondary" onClick={() => navigate('/ingredientes')}>
            Ingredientes
          </BigButton>
          <BigButton onClick={() => navigate('/receitas/nova')}>Nova receita</BigButton>
        </>
      }
    >
      <BackTitle>Receitas</BackTitle>

      {view && view.below > 0 && (
        <Notice kind="attention" action={{ label: 'Ver', onClick: () => navigate('/receitas/abaixo') }}>
          {view.below === 1
            ? 'Um sabor está abaixo da margem'
            : `${formatPlural(view.below, 'sabor', 'sabores')} estão abaixo da margem`}
        </Notice>
      )}

      {view && view.book.length === 0 && (
        <Notice>
          {view.hasIngredients
            ? 'Cadastre a receita de cada sabor: o app calcula o custo de cada unidade'
            : 'Comece pelos ingredientes (quanto pagou em cada um) e depois cadastre as receitas'}
        </Notice>
      )}

      {view?.book.map(({ product, recipes }) => (
        <section key={product.id} className={styles.section}>
          <SectionTitle>{product.name}</SectionTitle>
          <EntryList>
            {recipes.map(({ recipe, unitCost, hasIngredients }) => (
              <EntryRow
                key={recipe.id}
                badge={<ProductBadge code={product.code} />}
                title={recipe.name}
                detail={
                  (hasIngredients ? `${formatCents(Math.round(unitCost))} por unidade` : 'Sem ingredientes ainda') +
                  (recipe.active ? '' : ' · não faz mais')
                }
                chevron
                onClick={() => navigate(`/receitas/${recipe.id}`)}
              />
            ))}
          </EntryList>
        </section>
      ))}
    </TabLayout>
  );
}
