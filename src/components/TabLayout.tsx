import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import styles from './TabLayout.module.css';

/**
 * Abas que já existem. Semana, Painel e Ajustes entram quando cada tela ficar pronta
 * (decisão de 22/11).
 */
const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/acougue', label: 'Açougue', icon: 'store' },
];

/** Tela com barra de abas: conteúdo que rola, ações presas embaixo e a Barra de abas. */
export function TabLayout({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.layout}>
      <main className={styles.content}>{children}</main>
      {actions && <div className={styles.actions}>{actions}</div>}
      <nav className={styles.tabs} aria-label="Abas">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
            {({ isActive }) => (
              <>
                <span className={styles.tabIcon}>
                  <Icon name={tab.icon} size={isActive ? 24 : 26} />
                </span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Título grande da tela (Fredoka 34). */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className={styles.title}>{children}</h1>;
}
