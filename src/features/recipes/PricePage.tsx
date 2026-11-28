import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { BigButton } from '../../components/buttons';
import { CardPair, SectionTitle, StatCard } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { MoneyField, PercentField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { BackTitle, TabLayout } from '../../components/TabLayout';
import { marginForPrice, markupForPrice, priceForMargin, recipeCost, unitProfit } from '../../domain/pricing';
import { alive } from '../../domain/records';
import { formatPercentInput, parsePercentInput, recipeTitle } from '../../domain/recipes';
import type { Cents, Product, Recipe } from '../../domain/types';
import { formatCents, formatPercent } from '../../lib/money';
import { ApplyPriceSheet } from './ApplyPriceSheet';
import { loadRecipeData } from './recipeData';
import styles from './Recipes.module.css';

/** Margem para o campo: aceita só 0% a 99% (fora disso o campo fica vazio). */
const marginOrNull = (m: number | null) => (m !== null && m >= 0 && m < 1 ? m : null);

/** Preço (tela 31): margem e preço ligados nos dois sentidos; aplicar ao produto com confirmação. */
export function PricePage() {
  const { id = '' } = useParams();

  const view = useLiveQuery(async () => {
    const data = await loadRecipeData();
    const recipe = data.recipes.find((r) => r.id === id && !r.deletedAt);
    if (!recipe) return { missing: true as const };
    const product = data.products.find((p) => p.id === recipe.productId);
    if (!product) return { missing: true as const };
    const cost = (r: Recipe) => recipeCost(r, data.items, data.ingredientsById).unitCost;
    return {
      missing: false as const,
      recipe,
      product,
      unitCost: cost(recipe),
      others: alive(data.recipes)
        .filter((r) => r.productId === product.id && r.id !== recipe.id && r.active)
        .map((r) => ({ recipe: r, unitCost: cost(r) })),
    };
  }, [id]);

  if (view?.missing) return <Navigate to="/receitas" replace />;
  if (!view) return <TabLayout>{null}</TabLayout>;
  return <PriceCalculator key={view.recipe.id} {...view} />;
}

function PriceCalculator({
  recipe,
  product,
  unitCost,
  others,
}: {
  recipe: Recipe;
  product: Product;
  unitCost: number;
  others: { recipe: Recipe; unitCost: number }[];
}) {
  // Começa no preço atual do produto; sem preço, no preço que dá a margem da meta.
  const [price, setPrice] = useState<Cents | null>(() =>
    product.priceCents > 0 ? product.priceCents : priceForMargin(unitCost, recipe.targetMargin),
  );
  const [margin, setMargin] = useState<number | null>(() =>
    product.priceCents > 0 ? marginOrNull(marginForPrice(product.priceCents, unitCost)) : recipe.targetMargin,
  );
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const changeMargin = (value: number | null) => {
    setMargin(value);
    if (value !== null) setPrice(priceForMargin(unitCost, value));
  };
  const changePrice = (value: Cents | null) => {
    setPrice(value);
    if (value !== null && value > 0) setMargin(marginOrNull(marginForPrice(value, unitCost)));
  };

  const priceOk = price !== null && price > 0;
  const actualMargin = priceOk ? marginForPrice(price, unitCost) : null;
  const markup = priceOk ? markupForPrice(price, unitCost) : null;
  const title = recipeTitle(product, recipe);

  return (
    <TabLayout
      actions={
        <BigButton disabled={!priceOk} onClick={() => setConfirming(true)}>
          {priceOk ? `Aplicar ${formatCents(price)} ao ${product.name}` : 'Coloque um preço'}
        </BigButton>
      }
    >
      <BackTitle>Preço</BackTitle>

      <p className={styles.subtitle}>
        {title} · custo {formatCents(Math.round(unitCost))} por unidade
      </p>

      {message && <Notice kind="success">{message}</Notice>}
      {unitCost === 0 && <Notice kind="attention">Coloque os ingredientes da receita para saber o custo</Notice>}

      <div className={styles.pair}>
        <PercentField
          label="Margem"
          value={margin}
          onChange={changeMargin}
          parse={parsePercentInput}
          format={formatPercentInput}
          hint={<p className={styles.hint}>Muda o preço</p>}
        />
        <MoneyField label="Preço" valueCents={price} onChange={changePrice} hint={<p className={styles.hint}>Muda a margem</p>} />
      </div>

      {actualMargin !== null && actualMargin < 0 && (
        <Notice kind="attention">Com esse preço você perde {formatCents(Math.round(-unitProfit(price!, unitCost)))} em cada unidade</Notice>
      )}

      <CardPair>
        <StatCard label="Lucro por unidade" value={priceOk ? formatCents(Math.round(unitProfit(price, unitCost))) : '—'} />
        <StatCard
          label="Markup"
          value={markup === null ? '—' : formatPercent(markup)}
          detail="em cima do custo"
        />
      </CardPair>

      {others.length > 0 && (
        <>
          <section className={styles.section}>
            <SectionTitle>Outros sabores do {product.name}</SectionTitle>
            <EntryList>
              {others.map((other) => (
                <EntryRow
                  key={other.recipe.id}
                  badge={<ProductBadge code={product.code} />}
                  title={other.recipe.name}
                  detail={
                    margin === null
                      ? `Custo ${formatCents(Math.round(other.unitCost))}`
                      : `Custo ${formatCents(Math.round(other.unitCost))} · ${formatPercent(margin)} de margem`
                  }
                  value={margin === null ? undefined : formatCents(priceForMargin(other.unitCost, margin))}
                />
              ))}
            </EntryList>
          </section>
          <Notice>O preço vale para o {product.name} inteiro. Escolha um que funcione para todos os sabores.</Notice>
        </>
      )}

      {confirming && priceOk && (
        <ApplyPriceSheet
          product={product}
          priceCents={price}
          allFlavors={others.length > 0}
          onClose={() => setConfirming(false)}
          onApplied={(text) => {
            setConfirming(false);
            setMessage(text);
          }}
        />
      )}
    </TabLayout>
  );
}
