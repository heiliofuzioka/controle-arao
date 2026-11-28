import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './EntryList.module.css';

/** Cor da sigla de cada produto do seed. Produto novo usa o tom neutro. */
const BADGE_CLASS: Record<string, string | undefined> = {
  G: styles.gelinho,
  B: styles.brownie,
  R: styles.recheado,
  t: styles.torta,
};

/** Sigla do produto num círculo (enquanto as fotos não chegam). */
export function ProductBadge({ code }: { code: string }) {
  return (
    <span className={`${styles.badge} ${BADGE_CLASS[code] ?? ''}`} aria-hidden="true">
      {code}
    </span>
  );
}

/** Ícone num círculo neutro (despesa, semana…). */
export function IconBadge({ icon }: { icon: IconName }) {
  return (
    <span className={`${styles.badge} ${styles.iconBadge}`} aria-hidden="true">
      <Icon name={icon} size={20} />
    </span>
  );
}

/** Grupo de linhas de lançamento num card só. */
export function EntryList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}

/** Linha de lançamento: selo, título, detalhe e valor. Tocar abre para editar. */
export function EntryRow({
  badge,
  title,
  detail,
  value,
  onClick,
  chevron = false,
}: {
  badge: ReactNode;
  title: string;
  detail?: string;
  value?: string;
  onClick?: () => void;
  /** Seta à direita: a linha abre outra tela. */
  chevron?: boolean;
}) {
  const content = (
    <>
      {badge}
      <span className={styles.texts}>
        <span className={styles.title}>{title}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
      {value && <span className={styles.value}>{value}</span>}
      {chevron && (
        <span className={styles.chevron} aria-hidden="true">
          <Icon name="chevronRight" size={20} />
        </span>
      )}
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" className={styles.row} onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className={styles.row}>{content}</div>
      )}
    </li>
  );
}
