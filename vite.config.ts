/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/controle-arao/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Controle Arão',
        short_name: 'Controle Arão',
        description: 'Vendas, produção e custos do Arão',
        lang: 'pt-BR',
        start_url: '/controle-arao/',
        scope: '/controle-arao/',
        display: 'standalone',
        background_color: '#FDEBD7', // creme da imagem de abertura
        theme_color: '#F4F2ED',
        icons: [
          { src: 'brand/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'brand/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'brand/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // As imagens de abertura são lidas pelo iOS na instalação; não precisam ir para o pacote offline.
        globIgnores: ['brand/splash/**', 'brand/icone-1024.png', 'brand/icone-maskable.svg'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
