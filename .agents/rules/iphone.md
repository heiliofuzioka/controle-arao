---
trigger: model_decision
description: "Cuidados com iPhone/Safari e PWA: instalação na Tela de Início, manifest, ícones, imagens de abertura, service worker, backup e import, inputs, safe areas e rotação. Ler antes de mexer em PWA, vite.config, index.html, backup ou layout."
---

# iPhone e PWA

## Cuidados com o iPhone (iOS Safari)

- **Instalação obrigatória:** o Safari apaga os dados de sites sem uso há 7 dias, e apps instalados na tela de início ficam fora dessa regra.
  - Detectar `navigator.standalone` / `display-mode: standalone`.
  - Fora do modo instalado, mostrar a tela de boas-vindas com a instrução "Compartilhar → Adicionar à Tela de Início".
- **`navigator.storage.persist()` é sempre negado no iOS.** A proteção vem da instalação e do backup.
- **Backup:**
  - Exportar JSON `{ app: 'controle-arao', schemaVersion, exportedAt, tables: {...} }` via `navigator.share` (cai em Arquivos, iCloud Drive ou WhatsApp), com fallback para download. Nome do arquivo: `controle-arao-DD-MM.json`.
  - O import valida o `schemaVersion` e substitui tudo, só depois de confirmação (botão de perigo "Substituir tudo").
  - Guardar a data do último backup.
- **Inputs:** `font-size` de pelo menos 16px; dinheiro com `inputMode="decimal"`; quantidades com `inputMode="numeric"`.
- **Layout:** respeitar `env(safe-area-inset-*)`. Usar `<meta name="apple-mobile-web-app-capable">`, `apple-touch-icon` (`public/brand/icone-180.png`), `apple-touch-startup-image` por tamanho de tela e orientação (em pé e deitado; prontas em `public/brand/splash/`) e `theme-color`.
- **A abertura do iOS é uma imagem parada:** a animação acontece dentro do app, depois dela, começando do mesmo quadro.
- **Rotação:** não travar orientação no manifest.
- **Toques:** alvos de pelo menos 44×44px, uso com uma mão e ações principais embaixo.
- **Sem notificação local** em PWA. Lembretes ficam dentro do app.
