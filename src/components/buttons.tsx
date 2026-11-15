import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './buttons.module.css';

type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'>;

/** Botão grande: a ação principal da tela, embaixo. */
export function BigButton({
  variant = 'primary',
  children,
  ...rest
}: NativeButton & { variant?: 'primary' | 'secondary' | 'danger'; children: ReactNode }) {
  return (
    <button type="button" className={`${styles.big} ${styles[variant]}`} {...rest}>
      {children}
    </button>
  );
}

/** Atalho do Início: ícone num círculo + nome. */
export function Shortcut({
  icon,
  highlight = false,
  children,
  ...rest
}: NativeButton & { icon: IconName; highlight?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={`${styles.shortcut} ${highlight ? styles.highlight : ''}`} {...rest}>
      <span className={styles.shortcutIcon}>
        <Icon name={icon} size={22} />
      </span>
      <span className={styles.shortcutLabel}>{children}</span>
    </button>
  );
}

/** Botão de escolha (ex.: categoria da despesa). */
export function ChoiceButton({
  selected,
  children,
  ...rest
}: NativeButton & { selected: boolean; children: ReactNode }) {
  return (
    <button type="button" className={styles.choice} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}
