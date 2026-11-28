import { useEffect, useState } from 'react';
import styles from './Splash.module.css';
import { SplashLogo } from './SplashLogo';

/** Duração da animação (1,45 s) e da versão com movimento reduzido (troca suave de 250 ms). */
const ANIMATION_MS = 1450;
const REDUCED_MS = 250;
const FADE_OUT_MS = 200;

/** Crista ondulada no alto de cada onda (desliza para os lados enquanto sobe). */
function Crest({ color, d }: { color: string; d: string }) {
  return (
    <div className={styles.crest}>
      <svg viewBox="0 0 786 60" preserveAspectRatio="none" aria-hidden="true">
        <path fill={color} d={d} />
      </svg>
    </div>
  );
}

/**
 * Abertura animada (passo 8). Começa no mesmo quadro da imagem parada do iPhone
 * (creme com o mascote azul no centro) e termina na logo creme sobre azul.
 * Fica no quadro final até o banco abrir (`ready`); depois some em 200 ms.
 * Só monta na abertura a frio: voltar do segundo plano não recria o App.
 */
export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [animated, setAnimated] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setAnimated(true), reduced ? REDUCED_MS : ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!animated || !ready) return;
    setLeaving(true);
    const timer = window.setTimeout(onDone, FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [animated, ready, onDone]);

  return (
    <div className={`${styles.splash} ${leaving ? styles.leaving : ''}`} aria-hidden={leaving ? true : undefined}>
      <div className={styles.stage}>
        <div className={`${styles.wave} ${styles.waveBack}`}>
          <Crest
            color="#3E64B4"
            d="M0 30 Q59 16 98 30 T196 30 Q256 16 295 30 T393 30 Q452 16 491 30 T590 30 Q649 16 688 30 T786 30 V60 H0 Z"
          />
        </div>
        <div className={`${styles.wave} ${styles.waveFront}`}>
          <Crest
            color="#1A4594"
            d="M0 30 Q49 16 98 30 T196 30 Q246 16 295 30 T393 30 Q442 16 491 30 T590 30 Q639 16 688 30 T786 30 V60 H0 Z"
          />
        </div>
        <SplashLogo />
      </div>
    </div>
  );
}
