import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SectionTitle } from '../../components/cards';
import { EntryList, EntryRow, LetterBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { PageTitle, TabLayout } from '../../components/TabLayout';
import { BackupError, parseBackup, type BackupFile } from '../../db/backup';
import { db } from '../../db/db';
import { loadBackupStatus } from '../../db/queries';
import { monthKey, toLocalDate } from '../../domain/dates';
import { findGoal } from '../../domain/goals';
import { alive } from '../../domain/records';
import { formatBackupReminder, formatMonthName, formatPlural, formatShortDate } from '../../lib/format';
import { formatReais } from '../../lib/money';
import { CountSheet } from '../home/CountSheet';
import { BackupSheet } from './BackupSheet';
import { exportCsv } from './exportCsv';
import { RestoreSheet } from './RestoreSheet';
import styles from './SettingsPage.module.css';

type OpenSheet = { kind: 'backup' } | { kind: 'restore'; fileName: string; backup: BackupFile } | { kind: 'count' } | null;

/** Ajustes (tela 40): backup e dados, produtos e receitas, despesas e estoque. */
export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  // "Fazer agora" do Início e do Painel chega aqui com a folha de backup aberta.
  const [sheet, setSheet] = useState<OpenSheet>(() =>
    (location.state as { backup?: boolean } | null)?.backup ? { kind: 'backup' } : null,
  );
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const today = toLocalDate(new Date());
  const month = monthKey(today);

  const view = useLiveQuery(async () => {
    const [recipes, categories, products, goals, expenseCategories, backup] = await Promise.all([
      db.recipes.toArray(),
      db.categories.toArray(),
      db.products.toArray(),
      db.monthlyGoals.toArray(),
      db.expenseCategories.toArray(),
      loadBackupStatus(db, today),
    ]);
    return {
      flavors: alive(recipes).length,
      categories: alive(categories).length,
      products: alive(products).length,
      expenseCategories: alive(expenseCategories).length,
      goal: findGoal(goals, month),
      backup,
    };
  }, [month, today]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      setSheet({ kind: 'restore', fileName: file.name, backup });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof BackupError ? error.message : 'Não deu para ler o arquivo. Tente de novo.',
      });
    }
  };

  const closeSheet = () => setSheet(null);
  const goal = view?.goal;
  const goalText = goal?.revenueCents
    ? `${formatMonthName(month)}: ${formatReais(goal.revenueCents)} de faturamento`
    : goal?.profitCents
      ? `${formatMonthName(month)}: ${formatReais(goal.profitCents)} de lucro`
      : 'Defina quanto quer vender no mês';
  const last = view?.backup.last;

  return (
    <TabLayout>
      <PageTitle>Ajustes</PageTitle>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {view?.backup.reminder && (
        <Notice kind="attention" action={{ label: 'Fazer agora', onClick: () => setSheet({ kind: 'backup' }) }}>
          {formatBackupReminder(view.backup.reminder.days)}
        </Notice>
      )}

      {view && (
        <>
          <section className={styles.section}>
            <SectionTitle>Backup e seus dados</SectionTitle>
            <EntryList>
              <EntryRow
                badge={<LetterBadge letter="B" />}
                title="Fazer backup"
                detail={`${last ? `Último: ${formatShortDate(toLocalDate(new Date(last.at)))}` : 'Nenhum ainda'} · vai para Arquivos ou WhatsApp`}
                chevron
                onClick={() => setSheet({ kind: 'backup' })}
              />
              <EntryRow
                badge={<LetterBadge letter="R" />}
                title="Restaurar backup"
                detail="Substitui tudo que está no app"
                chevron
                onClick={() => fileInput.current?.click()}
              />
              <EntryRow
                badge={<LetterBadge letter="X" />}
                title="Exportar planilha"
                detail="Arquivo CSV para Excel"
                chevron
                onClick={() =>
                  void exportCsv()
                    .then((r) => r !== 'cancelled' && setMessage({ kind: 'success', text: 'Planilha pronta' }))
                    .catch(() => setMessage({ kind: 'error', text: 'Não deu para exportar a planilha. Tente de novo.' }))
                }
              />
            </EntryList>
            <input
              ref={fileInput}
              className={styles.fileInput}
              type="file"
              accept=".json,application/json"
              aria-label="Escolher arquivo de backup"
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </section>

          <section className={styles.section}>
            <SectionTitle>Produtos e receitas</SectionTitle>
            <EntryList>
              <EntryRow
                badge={<LetterBadge letter="$" />}
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
                badge={<LetterBadge letter="P" />}
                title="Categorias e produtos"
                detail={`${formatPlural(view.categories, 'categoria', 'categorias')} · ${formatPlural(view.products, 'produto', 'produtos')}`}
                chevron
                onClick={() => navigate('/produtos')}
              />
              <EntryRow
                badge={<LetterBadge letter="M" />}
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
                badge={<LetterBadge letter="C" />}
                title="Categorias de despesa"
                detail={formatPlural(view.expenseCategories, 'categoria', 'categorias')}
                chevron
                onClick={() => navigate('/categorias-despesa')}
              />
              <EntryRow
                badge={<LetterBadge letter="E" />}
                title="Contar estoque"
                detail="Ajustar o que tem em casa e no Açougue"
                chevron
                onClick={() => setSheet({ kind: 'count' })}
              />
            </EntryList>
          </section>

          <footer className={styles.footer}>
            <img className={styles.mascot} src={`${import.meta.env.BASE_URL}brand/arao-mascote-azul.svg`} alt="" />
            <p>Controle Arão · versão {__APP_VERSION__}</p>
          </footer>
        </>
      )}

      {sheet?.kind === 'backup' && <BackupSheet onClose={closeSheet} />}
      {sheet?.kind === 'restore' && (
        <RestoreSheet
          fileName={sheet.fileName}
          backup={sheet.backup}
          onClose={closeSheet}
          onRestored={() => {
            setSheet(null);
            setMessage({ kind: 'success', text: 'Backup restaurado' });
          }}
        />
      )}
      {sheet?.kind === 'count' && (
        <CountSheet
          onClose={closeSheet}
          onSaved={(text) => {
            setSheet(null);
            setMessage({ kind: 'success', text });
          }}
        />
      )}
    </TabLayout>
  );
}
