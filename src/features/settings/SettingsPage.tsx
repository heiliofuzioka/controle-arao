import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionTitle } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { PageTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { monthKey, toLocalDate } from '../../domain/dates';
import { findGoal } from '../../domain/goals';
import { alive } from '../../domain/records';
import { formatMonthName, formatPlural } from '../../lib/format';
import { formatReais } from '../../lib/money';
import { CountSheet } from '../home/CountSheet';
import styles from './SettingsPage.module.css';

/**
 * Ajustes. Por enquanto só o que já existe: Produtos e receitas, Despesas e estoque.
 * "Backup e seus dados" e "Categorias de despesa" entram no passo 8.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const [counting, setCounting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const month = monthKey(toLocalDate(new Date()));

  const view = useLiveQuery(async () => {
    const [recipes, categories, products, goals] = await Promise.all([
      db.recipes.toArray(),
      db.categories.toArray(),
      db.products.toArray(),
      db.monthlyGoals.toArray(),
    ]);
    return {
      flavors: alive(recipes).length,
      categories: alive(categories).length,
      products: alive(products).length,
      goal: findGoal(goals, month),
    };
  }, [month]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const goal = view?.goal;
  const goalText = goal?.revenueCents
    ? `${formatMonthName(month)}: ${formatReais(goal.revenueCents)} de faturamento`
    : goal?.profitCents
      ? `${formatMonthName(month)}: ${formatReais(goal.profitCents)} de lucro`
      : 'Defina quanto quer vender no mês';

  return (
    <TabLayout>
      <PageTitle>Ajustes</PageTitle>

      {message && <Notice kind="success">{message}</Notice>}

      {view && (
        <>
          <section className={styles.section}>
            <SectionTitle>Produtos e receitas</SectionTitle>
            <EntryList>
              <EntryRow
                badge={<ProductBadge code="$" />}
                title="Receitas e preços"
                detail={
                  view.flavors > 0
                    ? `${formatPlural(view.flavors, 'sabor', 'sabores')} · custo, margem e preço`
                    : 'Custo, margem e preço de cada sabor'
                }
                chevron
                onClick={() => navigate('/receitas')}
              />
              <EntryRow
                badge={<ProductBadge code="P" />}
                title="Categorias e produtos"
                detail={`${formatPlural(view.categories, 'categoria', 'categorias')} · ${formatPlural(view.products, 'produto', 'produtos')}`}
                chevron
                onClick={() => navigate('/produtos')}
              />
              <EntryRow
                badge={<ProductBadge code="M" />}
                title="Metas"
                detail={goalText}
                chevron
                onClick={() => navigate('/metas')}
              />
            </EntryList>
          </section>

          <section className={styles.section}>
            <SectionTitle>Despesas e estoque</SectionTitle>
            <EntryList>
              <EntryRow
                badge={<ProductBadge code="E" />}
                title="Contar estoque"
                detail="Ajustar o que tem em casa e no Açougue"
                chevron
                onClick={() => setCounting(true)}
              />
            </EntryList>
          </section>

          <footer className={styles.footer}>
            <img className={styles.mascot} src={`${import.meta.env.BASE_URL}brand/arao-mascote-azul.svg`} alt="" />
            <p>Controle Arão · versão {__APP_VERSION__}</p>
          </footer>
        </>
      )}

      {counting && (
        <CountSheet
          onClose={() => setCounting(false)}
          onSaved={(text) => {
            setCounting(false);
            setMessage(text);
          }}
        />
      )}
    </TabLayout>
  );
}
