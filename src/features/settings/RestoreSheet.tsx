import { format } from 'date-fns';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { backupSummary, restoreBackup, type BackupFile } from '../../db/backup';
import { db } from '../../db/db';
import { formatPlural } from '../../lib/format';
import styles from './SettingsPage.module.css';

/** "Restaurar backup?" (tela 43): troca tudo pelo arquivo, só depois de "Substituir tudo". */
export function RestoreSheet({
  fileName,
  backup,
  onClose,
  onRestored,
}: {
  fileName: string;
  backup: BackupFile;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const summary = backupSummary(backup);

  const restore = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await restoreBackup(db, backup);
      onRestored();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Restaurar backup?"
      size="auto"
      onClose={onClose}
      footer={
        <>
          {failed && <Notice kind="error">Não deu para restaurar. Nada foi mudado.</Notice>}
          <BigButton variant="danger" disabled={busy} onClick={() => void restore()}>
            Substituir tudo
          </BigButton>
          <BigButton variant="secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </BigButton>
        </>
      }
    >
      <div className={`${styles.statusCard} ${styles.attention}`}>
        <p className={styles.statusLabel}>Arquivo escolhido</p>
        <p className={`${styles.statusValue} ${styles.fileName}`}>{fileName}</p>
        <p className={styles.statusDetail}>Tudo que está no app agora será trocado por este backup.</p>
      </div>
      <p className={styles.text}>
        Feito em {format(new Date(backup.exportedAt), "dd/MM/yyyy 'às' HH:mm")}. Tem{' '}
        {formatPlural(summary.weeks, 'semana fechada', 'semanas fechadas')}, {formatPlural(summary.expenses, 'despesa', 'despesas')} e{' '}
        {formatPlural(summary.recipes, 'receita', 'receitas')}.
      </p>
    </Sheet>
  );
}
