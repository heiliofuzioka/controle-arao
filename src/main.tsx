import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles/fonts';
import './styles/global.css';

registerSW({ immediate: true });

// O index.html começa com o creme da imagem de abertura; com o app pronto, a barra
// de cima passa para a cor da página. (No passo 8 isso vai para o componente Splash.)
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F4F2ED');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
