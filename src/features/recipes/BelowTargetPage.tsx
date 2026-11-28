import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/buttons';
import { Footnote, SectionTitle } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { priceForMargin } from '../../domain/pricing';
import { belowTargetList } from '../../domain/recipes';
import { formatPlural } from '../../lib/format';
import { formatCents, formatPercent } from '../../lib/money';
import { loadRecipeData } from './recipeData';

/** Sabores abaixo da meta de margem (tela 33), com o preço que volta a dar a meta. */
export function BelowTargetPage() {
  const navigate = useNavigate();
  const rose = (useLocation().state as { rose?: string } | null)?.rose;

  const below = useLiveQuery(async () => {
    const data = await loadRecipeData();
    return belowTargetList(data.products, data.recipes, data.items, data.ingredients);
  }, []);

  const count = below?.length ?? 0;
  const summary =
    count === 1 ? '1 sabor ficou abaixo da margem.' : `${formatPlural(count, 'sabor', 'sabores')} ficaram abaixo da margem.`;

  return (
    <TabLayout
      actions={
        count > 0 && (
          <BigButton onClick={() => navigate(`/receitas/${below![0]!.recipeId}/preco`)}>Ver e aplicar novos preços</BigButton>
        )
      }
    >
      <BackTitle>Receitas</BackTitle>

      {below && count === 0 && <Notice kind="success">Todos os sabores estão dentro da margem</Notice>}

      {count > 0 && (
        <>
          <Notice kind="attention">{rose ? `${rose} subiu de preço. ${summary}` : summary}</Notice>
          <SectionTitle>Abaixo da meta</SectionTitle>
          <EntryList>
            {below!.map((alert) => (
              <EntryRow
                key={alert.recipeId}
                badge={<ProductBadge code={alert.product.code} />}
                title={alert.title}
                detail={`${alert.margin === null ? 'Sem preço' : `Margem ${formatPercent(alert.margin)}`} · meta ${formatPercent(alert.targetMargin)}`}
                value={formatCents(priceForMargin(alert.unitCost, alert.targetMargin))}
                onClick={() => navigate(`/receitas/${alert.recipeId}/preco`)}
              />
            ))}
          </EntryList>
          <Footnote>O valor à direita é o preço que volta a dar a margem da meta. Toque num sabor para calcular.</Footnote>
        </>
      )}
    </TabLayout>
  );
}
