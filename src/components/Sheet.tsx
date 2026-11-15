import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import styles from './Sheet.module.css';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Ação principal, presa embaixo. */
  footer?: ReactNode;
  /** 'full' ocupa a tela toda; 'auto' tem a altura do conteúdo (ex.: Gasto pessoal). */
  size?: 'full' | 'auto';
}

/** Folha que sobe de baixo, com o Cabeçalho de folha (alça, título e fechar). */
export function Sheet({ title, onClose, children, footer, size = 'full' }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.backdrop}>
      <section
        className={`${styles.sheet} ${size === 'full' ? styles.full : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.header}>
          <div className={styles.grabber} aria-hidden="true" />
          <div className={styles.titleRow}>
            <h1 id={titleId} className={styles.title}>
              {title}
            </h1>
            <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
