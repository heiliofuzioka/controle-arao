import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { backupFileName, exportBackup, markBackupDone } from '../../db/backup';
import { db } from '../../db/db';
import { loadBackupStatus } from '../../db/queries';
import { toLocalDate } from '../../domain/dates';
import { formatBackupMoment } from '../../lib/format';
import { shareFile } from '../../lib/share';
import { exportCsv as buildAndShareCsv } from './exportCsv';
import styles from './SettingsPage.module.css';

/** "Fazer backup" (telas 41 e 42): salva o arquivo pela folha de compartilhar do iPhone; também exporta a planilha. */
export function BackupSheet({ onClose }: { onClose: () => void }) {
  const today = toLocalDate(new Date());
  const status = useLiveQuery(() => loadBackupStatus(db, today), [today]);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saveBackup = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const now = new Date();
      const fileName = backupFileName(now);
      const backup = await exportBackup(db, now);
      const result = await shareFile(JSON.stringify(backup), fileName, 'application/json');
      if (result === 'cancelled') {
        setNotice({ kind: 'info', text: 'O backup não foi salvo. Toque de novo e escolha onde guardar.' });
      } else {
        await markBackupDone(db, now, fileName);
        setDone(true);
      }
    } catch {
      setNotice({ kind: 'error', text: 'Não deu para fazer o backup. Tente de novo.' });
    }
    setBusy(false);
  };

  const exportCsv = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await buildAndShareCsv();
      if (result !== 'cancelled') setNotice({ kind: 'success', text: 'Planilha pronta' });
    } catch {
      setNotice({ kind: 'error', text: 'Não deu para exportar a planilha. Tente de novo.' });
    }
    setBusy(false);
  };

  const last = status?.last;
  const overdue = !!status?.reminder;

  if (done && last) {
    return (
      <Sheet title="Fazer backup" size="auto" onClose={onClose} footer={<BigButton variant="secondary" onClick={onClose}>Fechar</BigButton>}>
        <Notice kind="success">Backup salvo</Notice>
        <div className={styles.statusCard}>
          <p className={styles.statusLabel}>Último backup</p>
          <p className={styles.statusValue}>{formatBackupMoment(last.at, today)}</p>
          {last.fileName && <p className={styles.statusDetail}>{last.fileName}</p>}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Fazer backup"
      size="auto"
      onClose={onClose}
      footer={
        <>
          {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
          <BigButton disabled={busy || !status} onClick={() => void saveBackup()}>
            Salvar backup agora
          </BigButton>
          <BigButton variant="secondary" disabled={busy || !status} onClick={() => void exportCsv()}>
            Exportar planilha (CSV)
          </BigButton>
        </>
      }
    >
      {status && (
        <div className={`${styles.statusCard} ${overdue ? styles.attention : ''}`}>
          <p className={styles.statusLabel}>Último backup</p>
          <p className={styles.statusValue}>{last ? formatBackupMoment(last.at, today) : 'Nenhum ainda'}</p>
          <p className={styles.statusDetail}>Faça pelo menos uma vez por semana</p>
        </div>
      )}
      <p className={styles.text}>
        Toque em Salvar. O iPhone vai perguntar onde guardar: escolha Arquivos (iCloud) ou mande no WhatsApp para você mesmo.
      </p>
    </Sheet>
  );
}
