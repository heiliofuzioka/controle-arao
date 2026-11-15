# AGENTS.md — Controle Arão

Regras do projeto para o agente (Antigravity, Claude Code ou outro). Este arquivo fica sempre carregado. O resto está dividido por assunto e deve ser lido quando o trabalho tocar nele:

- `.agents/rules/design.md` — telas, componentes, cores, logo, abertura animada, boas-vindas.
- `.agents/rules/dominio.md` — tipos, banco, cálculos, fechamento da semana, Açougue, Painel, precificação.
- `.agents/rules/iphone.md` — PWA, iPhone/Safari, ícones, backup.
- `docs/telas/` — imagem e HTML de cada tela. **Antes de montar uma tela, abra a imagem dela.**
- `docs/especificacao.md` — tudo isso num arquivo só (cópia de referência).

Se uma regra não estiver nestes arquivos, **pergunte ao Heilio antes de inventar**.

## O que é

O Arão faz geladinhos e assados (brownie tradicional, brownie recheado e tortas de pote) e hoje controla tudo num caderno. O app substitui o caderno: registra **por semana** o que ele produziu e vendeu, a consignação no Açougue, despesas e gastos pessoais; calcula estoque, valores a receber, os resultados da semana, do mês e do ano; e guarda o livro de receitas com a calculadora de custo e preço.

- **Usuário único:** o Arão, no iPhone dele, muitas vezes fora de casa e sem internet.
- **Objetivo da v1:** ele parar de usar o caderno.
- **Fontes:** áudios do Arão (08/11) e o documento "Projeto do Aplicativo — Sistema de Gestão para Confeitaria", do Augusto (08/11). O que ficou para a v2 está em "Fora da v1".

## Decisões fixas

- **Nome do app:** Controle Arão.
  - Repositório e slug: `controle-arao`.
  - Manifest: `name: 'Controle Arão'`, `short_name: 'Controle Arão'`. Se o rótulo cortar embaixo do ícone no iPhone, troque o `short_name` para `'Arão'`.
  - Banco Dexie: `controle-arao`.
- **PWA instalada na tela de início do iPhone.** Sem App Store, sem backend, sem login.
- **Só celular na v1** (decisão de 08/11). O Arão prefere o celular; ver no computador fica para depois.
- **Dados só no aparelho** (IndexedDB). Não existe servidor. Não adicionar API, banco remoto nem analytics. Consequência: os dados não aparecem em outro aparelho nem em outro navegador (a sincronização do Chrome não leva dados de sites). O backup é o único jeito de levar os dados para outro lugar na v1.
- **Banco pronto para sincronizar no futuro:** todo registro tem `id` (UUID), `createdAt`, `updatedAt` e `deletedAt?` (exclusão marcada; a UI esconde o que tem `deletedAt`). Nunca apagar registros de verdade. Isso permite plugar Google Drive (pasta do app) ou Supabase/Dexie Cloud na v2 sem migração grande.
- **Hospedagem só dos arquivos estáticos** no GitHub Pages (HTTPS é obrigatório para o iPhone instalar a PWA e para o service worker).
- **Offline-first:** o app inteiro funciona sem rede depois da primeira instalação.
- **Interface em português (pt-BR); código em inglês** (veja o glossário).
- **Apenas iPhone (Safari)** na v1. Testar sempre no iPhone, instalado na tela de início.

## Stack

| Camada | Escolha |
| --- | --- |
| Build | Vite + React + TypeScript (strict) |
| Dados | Dexie.js (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) |
| PWA | `vite-plugin-pwa` (manifest + service worker, `registerType: 'autoUpdate'`) |
| Rotas | `react-router-dom` com `HashRouter` (evita 404 no GitHub Pages) |
| Datas | `date-fns` com locale `ptBR` |
| Estilo | CSS Modules + variáveis CSS (tokens do design system em `src/styles/tokens.css`) |
| Gráficos | SVG próprio em React com `d3-shape` (curvas `curveMonotoneX`) e `d3-scale`. Não usar Recharts, Chart.js nem o pacote `d3` inteiro (peso no iPhone) |
| Animação | CSS (`@keyframes`, só `transform` e `opacity`) + SVG inline. Sem Lottie nem biblioteca de animação na v1 |
| Testes | Vitest para toda a lógica de domínio |
| Deploy | GitHub Actions → GitHub Pages (`vite.config.ts` com `base: '/controle-arao/'`) |

## Estrutura de pastas

```
public/
  brand/         # logo, mascote e ícones (SVG e PNG)
src/
  domain/        # tipos e funções puras (cálculos). Sem React, sem Dexie. 100% testado.
  db/            # schema Dexie, seed inicial, backup/import
  features/      # uma pasta por tela: splash, welcome, home, week-close, butcher, expense, personal,
                 # week, dashboard, month, year, goals, recipes, catalog, settings
  components/    # componentes de UI reutilizáveis (seguem o design system)
  styles/        # tokens.css, reset, globais
  lib/           # formatação (moeda, datas), helpers
```

Regra: **cálculo nunca mora em componente.** As telas leem do Dexie e chamam funções de `src/domain/`.

## Glossário (UI → código)

| UI (pt-BR) | Código |
| --- | --- |
| Categoria (Geladinhos, Brownies tradicionais…) | `Category` |
| Produto (o que é contado e vendido; um por categoria no início) | `Product` |
| Ponto de venda | `SalesPoint` |
| Fechamento da semana | `WeekClose` |
| Venda | `Sale` |
| Entrega (consignação) | `Delivery` |
| Acerto (consignação) | `Settlement` |
| Ajuste de estoque | `StockAdjustment` |
| Despesa | `Expense` |
| Categoria de despesa | `ExpenseCategory` |
| Gasto pessoal | `PersonalExpense` |
| Ingrediente | `Ingredient` |
| Receita (um sabor) | `Recipe` |
| Item da receita | `RecipeItem` |
| Meta do mês | `MonthlyGoal` |
| Painel | `Dashboard` |
| Abertura | `Splash` |
| Boas-vindas (instalar) | `Welcome` |

## Fora da v1 (v2, decidido em 08/11)

- Estoque de ingredientes e embalagens com lista de compras (baixa automática na produção, estoque mínimo, alertas, compras que atualizam estoque e despesas).
- Perdas com motivo (queimou, erro, danificado, caiu, consumo interno, vencido) e custo das perdas.
- Ranking dos mais vendidos e dos mais lucrativos por semana, mês e ano (inclui sabores).
- Planejamento de produção e encomendas.
- Controle de validade por lote.
- Ver no computador e sincronizar entre aparelhos (Google Drive do Arão ou Supabase/Dexie Cloud, com login). No plano grátis do Supabase o projeto pausa após 7 dias sem uso; resolver com um acesso agendado ou usar o Drive/Firebase.

## Ordem de implementação

1. Base do projeto + PWA (com ícones, `apple-touch-icon` e imagens paradas de abertura) + deploy de uma tela "olá" no GitHub Pages → **instalar no iPhone e testar offline** antes de qualquer regra.
2. Tipos (com `Base`), schema Dexie (com `version()` para migrações) e seed (categorias, produtos, pontos, categorias de despesa).
3. Funções de domínio + testes Vitest (fechamento da semana, estoque, semana/mês/ano, acerto, saldo, lucro estimado sem dupla contagem, metas, séries dos gráficos, precificação).
4. Fechar a semana, Despesa e Gasto pessoal.
5. Fluxo do Açougue (entrega, acerto, recebido).
6. Início, Semana, Painel, Fechamento do mês e Ano.
7. Receitas (livro + calculadora) e Categorias e produtos.
8. Metas, Ajustes, backup/import, CSV, abertura animada e boas-vindas.
9. Importação de agosto a outubro e conferência dos totais.

## Como trabalhar neste repositório

- Rodar `npm run test` e `npm run build` antes de cada commit. Commits pequenos, com mensagem em português.
- Toda mudança de schema Dexie cria uma nova `db.version(n)` com migração; nunca editar uma versão antiga.
- Nunca apagar registros: marcar `deletedAt` e atualizar `updatedAt`.
- Textos da interface em pt-BR, curtos e sem jargão (o Arão não é técnico).
- Não adicionar dependências pesadas sem necessidade. O bundle precisa abrir rápido no iPhone.
- Antes de montar uma tela, abrir a imagem dela em `docs/telas/png/` (e o HTML em `docs/telas/html/` para medidas) e seguir os textos, a ordem e os estados de lá.
- Antes de inventar uma regra de negócio, checar este arquivo. Se não estiver aqui, perguntar ao Heilio.
- Trabalhar um passo da ordem de implementação por vez. Ao terminar um passo: testes passando, build passando, e um resumo do que mudou para o Heilio testar no iPhone.

## Pendências (não bloqueiam o início)

- **Colunas do Painel nos filtros "Mês" e "2 meses":** hoje por semana; confirmar com o Augusto.
- **Custo do produto com vários sabores:** hoje é a média das receitas ativas; confirmar se o Arão prefere escolher um sabor de referência.
- **Logo:** o SVG atual foi vetorizado de uma imagem de 1600px. Se o designer tiver o arquivo vetorial original (AI, SVG ou PDF), trocar os arquivos de `public/brand/` mantendo os nomes e as partes separadas (letras, til, slogan, mascote).
- **Preço atual de cada produto** (decidido em 15/11: seguir sem preço por enquanto). Até lá, o fechamento da semana mostra "Sem preço" e o Arão digita o valor da venda na mão tocando no valor do card.
- Receitas dos sabores: ingredientes, quantidades, rendimento e preço pago em cada ingrediente.
- Valor da diária da avó e quantos lotes ela ajuda a fazer por dia.
- Frequência do acerto com o Açougue.
- Fotos dos 4 produtos (fundo liso, de cima).
