import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import styles from './TabLayout.module.css';

/**
 * Abas que já existem. Painel e Ajustes entram quando cada tela ficar pronta
 * (decisão de 22/11).
 */
const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/acougue', label: 'Açougue', icon: 'store' },
  { to: '/semana', label: 'Semana', icon: 'calendar' },
];

/** Tela com barra de abas: conteúdo que rola, ações presas embaixo e a Barra de abas. */
export function TabLayout({
  children,
  actions,
  actionsLayout = 'row',
}: {
  children: ReactNode;
  actions?: ReactNode;
  /** 'row': botões lado a lado; 'stack': um embaixo do outro (atalhos do Início). */
  actionsLayout?: 'row' | 'stack';
}) {
  return (
    <div className={styles.layout}>
      <main className={styles.content}>{children}</main>
      {actions && <div className={actionsLayout === 'row' ? styles.actions : styles.actionsStack}>{actions}</div>}
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

/** Título grande da tela (Fredoka 34), com um complemento opcional ao lado ("2026") e algo à direita. */
export function PageTitle({ children, aside, end }: { children: ReactNode; aside?: ReactNode; end?: ReactNode }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        {children}
        {aside && <span className={styles.aside}>{aside}</span>}
      </h1>
      {end}
    </header>
  );
}

/** Título com o botão de voltar (telas abertas por dentro de outra, como Metas). */
export function BackTitle({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.back}
        aria-label="Voltar"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      >
        <Icon name="chevronLeft" size={22} />
      </button>
      <h1 className={`${styles.title} ${styles.titleGrow}`}>{children}</h1>
    </header>
  );
}

/** Linha de dois botões dentro das ações empilhadas. */
export function ActionPair({ children }: { children: ReactNode }) {
  return <div className={styles.actionPair}>{children}</div>;
}
