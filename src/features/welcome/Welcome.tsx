import { useEffect } from 'react';
import { Icon } from '../../components/Icon';
import styles from './Welcome.module.css';

const STEPS = [
  { text: 'No Safari, toque em Compartilhar', icon: <Icon name="share" size={22} /> },
  { text: 'Escolha Adicionar à Tela de Início', icon: <Icon name="addSquare" size={22} /> },
  {
    text: 'Abra pelo ícone do papagaio',
    icon: <img className={styles.appIcon} src={`${import.meta.env.BASE_URL}brand/icone-180.png`} alt="" />,
  },
];

/**
 * Boas-vindas (tela 05): aparece ao abrir pelo Safari, fora do modo instalado.
 * Instalado na Tela de Início, o Safari não apaga os dados depois de 7 dias sem uso.
 */
export function Welcome({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // A barra do Safari acompanha o topo azul enquanto as boas-vindas estão abertas.
    const theme = document.querySelector('meta[name="theme-color"]');
    const previousTheme = theme?.getAttribute('content');
    theme?.setAttribute('content', '#1A4594');
    return () => {
      document.body.style.overflow = previous;
      if (previousTheme) theme?.setAttribute('content', previousTheme);
    };
  }, []);

  return (
    <div className={styles.welcome} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className={styles.top}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}brand/arao-logo-vertical-creme.svg`}
          alt="Arão · Doce lembrança"
        />
      </div>
      <div className={styles.panel}>
        <h1 id="welcome-title" className={styles.title}>
          Instale o Controle Arão
        </h1>
        <p className={styles.subtitle}>Assim ele abre como um app, pelo ícone, e funciona sem internet.</p>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.text} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.stepText}>{step.text}</span>
              <span className={styles.stepIcon} aria-hidden="true">
                {step.icon}
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.note}>Seus dados ficam só neste iPhone. Faça backup toda semana em Ajustes.</p>
        <button type="button" className={styles.continue} onClick={onContinue}>
          Continuar no Safari
        </button>
      </div>
    </div>
  );
}
