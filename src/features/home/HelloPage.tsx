import { useEffect, useState } from 'react';
import { isStandalone } from '../../lib/standalone';
import styles from './HelloPage.module.css';

function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function HelloPage() {
  const installed = isStandalone();
  const online = useOnline();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Olá, Arão!</h1>
      <p>O Controle Arão está funcionando.</p>

      <section className={styles.card}>
        <div className={styles.status}>
          <span>Tela de início</span>
          <span className={installed ? styles.ok : styles.warn}>
            {installed ? 'Instalado' : 'Não instalado'}
          </span>
        </div>
        {!installed && (
          <p className={styles.hint}>
            No Safari, toque em Compartilhar → Adicionar à Tela de Início.
          </p>
        )}
        <div className={styles.status}>
          <span>Internet</span>
          <span className={online ? styles.ok : styles.warn}>{online ? 'Com internet' : 'Sem internet'}</span>
        </div>
      </section>

      <p className={styles.hint}>Versão {__APP_VERSION__}</p>
    </main>
  );
}
