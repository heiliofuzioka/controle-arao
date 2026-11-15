import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Notice.module.css';

type Kind = 'info' | 'attention' | 'success' | 'error';

const ICON: Record<Kind, IconName> = { info: 'info', attention: 'alert', success: 'success', error: 'error' };

/** Aviso: informação e atenção são suaves; sucesso e erro têm fundo sólido. */
export function Notice({
  kind = 'info',
  children,
  action,
}: {
  kind?: Kind;
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className={`${styles.notice} ${styles[kind]}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={ICON[kind]} />
      <p className={styles.text}>{children}</p>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
