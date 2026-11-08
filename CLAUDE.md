# CLAUDE.md — Controle Arão (controle de vendas, produção e custos)

Este arquivo dá o contexto do projeto para o Claude Code. Especificação completa: doc "Sistema Arão — Especificação v1" (Claude Docs). Em caso de conflito, a especificação vale; atualize este arquivo quando uma decisão mudar.

## O que é

O Arão vende geladinhos e assados (brownie, brownie recheado e torta) em dois pontos e hoje controla tudo num caderno. O app substitui o caderno: registra produção, vendas, consignação no Açougue, despesas e gastos pessoais, calcula estoque, valores a receber e o fechamento da semana e do mês, e faz a precificação das receitas.

- **Usuário único:** o Arão, no iPhone dele, muitas vezes fora de casa e sem internet.
- **Objetivo da v1:** ele parar de usar o caderno.

## Decisões fixas

- **Nome do app:** Controle Arão.
  - Repositório e slug: `controle-arao`.
  - Manifest: `name: 'Controle Arão'`, `short_name: 'Controle Arão'`. Se o rótulo cortar embaixo do ícone no iPhone, troque o `short_name` para `'Arão'`.
  - Banco Dexie: `controle-arao`.
- **PWA instalada na tela de início do iPhone.** Sem App Store, sem backend, sem login.
- **Dados só no aparelho** (IndexedDB). Não existe servidor. Não adicionar API, banco remoto nem analytics.
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
| Testes | Vitest para toda a lógica de domínio |
| Deploy | GitHub Actions → GitHub Pages (`vite.config.ts` com `base: '/controle-arao/'`) |

## Estrutura de pastas

```
src/
  domain/        # tipos e funções puras (cálculos). Sem React, sem Dexie. 100% testado.
  db/            # schema Dexie, seed inicial, backup/import
  features/      # uma pasta por tela: home, sale, production, butcher, expense,
                 # week, month, pricing, settings
  components/    # componentes de UI reutilizáveis (seguem o design system)
  styles/        # tokens.css, reset, globais
  lib/           # formatação (moeda, datas), helpers
```

Regra: **cálculo nunca mora em componente.** As telas leem do Dexie e chamam funções de `src/domain/`.

## Glossário (UI → código)

| UI (pt-BR) | Código |
| --- | --- |
| Produto | `Product` |
| Ponto de venda | `SalesPoint` |
| Produção | `Production` |
| Venda | `Sale` |
| Entrega (consignação) | `Delivery` |
| Acerto (consignação) | `Settlement` |
| Ajuste de estoque | `StockAdjustment` |
| Despesa | `Expense` |
| Categoria de despesa | `ExpenseCategory` |
| Gasto pessoal | `PersonalExpense` |
| Ingrediente | `Ingredient` |
| Receita | `Recipe` |
| Item da receita | `RecipeItem` |

## Domínio

### Produtos (seed)

| Nome | Tipo | Sigla |
| --- | --- | --- |
| Gelinho | `ice_pop` | G |
| Brownie | `baked` | B |
| Brownie recheado | `baked` | R |
| Torta | `baked` | t |

O preço é **único**, igual nos dois pontos. Os preços atuais ainda não foram confirmados: seed com `priceCents: 0` e o Arão define em Ajustes.

### Pontos de venda (seed)

- **Escola Piratininga** (no caderno: "por fora"). `mode: 'direct'`. A venda é lançada na hora.
- **Açougue**. `mode: 'consignment'`.
  - O dono é o pai do Arão, que repassa 100% do valor (sem comissão).
  - O Açougue só paga depois de vender.
  - As vendas do Açougue **não são lançadas na hora**: elas nascem do acerto.

### Categorias de despesa (seed)

Ingredientes (mercado) · Mão de obra (diária da avó) · Embalagem · Gás · Investimento

"Mercado" é só ingrediente; compras da casa não entram.

### Tipos

```ts
type ID = string;          // crypto.randomUUID()
type Cents = number;       // inteiro, sempre centavos
type LocalDate = string;   // 'YYYY-MM-DD' no fuso do aparelho (nunca Date em UTC)

interface Product { id: ID; name: string; kind: 'ice_pop' | 'baked'; code: string; priceCents: Cents; active: boolean }
interface SalesPoint { id: ID; name: string; mode: 'direct' | 'consignment'; active: boolean }

interface Production { id: ID; date: LocalDate; productId: ID; quantity: number; loss: number; note?: string; createdAt: string }
interface Sale { id: ID; date: LocalDate; time?: string; pointId: ID; productId: ID; quantity: number; valueCents: Cents;
                 origin: 'direct' | 'settlement' | 'import'; settlementId?: ID; note?: string; createdAt: string }

interface Delivery { id: ID; date: LocalDate; pointId: ID; productId: ID; quantity: number; createdAt: string }
interface Settlement { id: ID; date: LocalDate; pointId: ID; productId: ID; remaining: number; loss: number;
                       soldQuantity: number; valueCents: Cents; paid: boolean; paidDate?: LocalDate; createdAt: string }

interface StockAdjustment { id: ID; date: LocalDate; productId: ID; location: 'home' | 'consignment'; pointId?: ID;
                            delta: number; reason: 'initial_count' | 'correction'; note?: string }

interface ExpenseCategory { id: ID; name: string }
interface Expense { id: ID; date: LocalDate; valueCents: Cents; categoryId: ID; description?: string; createdAt: string }
interface PersonalExpense { id: ID; date: LocalDate; valueCents: Cents; description?: string; createdAt: string }

type Unit = 'g' | 'ml' | 'un';
interface Ingredient { id: ID; name: string; pricePaidCents: Cents; packageQty: number; unit: Unit; updatedAt: string }
interface Recipe { id: ID; productId: ID; yield: number; packagingPerUnitCents: Cents; laborPerBatchCents: Cents;
                   otherCostsPerBatchCents: Cents; targetMargin: number /* 0–1 */ }
interface RecipeItem { id: ID; recipeId: ID; ingredientId: ID; quantity: number /* na unidade do ingrediente */ }
```

A UI aceita kg e L, mas grava em g e ml (`packageQty` e `quantity` ficam na unidade base).

### Regras de cálculo (todas em `src/domain/`, todas com teste)

- **Semana:** de segunda a domingo (`startOfWeek(d, { weekStartsOn: 1 })`). A semana é só uma visão.
- **Mês:** mês do calendário pela `date` de cada lançamento. Uma semana que cruza a virada do mês aparece inteira na tela Semana, mas cada dia soma no próprio mês.
- **Estoque em casa** (por produto) = produção − perdas da produção − vendas diretas − entregas + ajustes `home`.
- **Estoque no Açougue** (por produto) = entregas − vendidos nos acertos − perdas nos acertos + ajustes `consignment`.
- **Acerto:**
  - `soldQuantity` = estoque no Açougue antes do acerto − `remaining` − `loss`. Se der negativo, é erro: bloquear e mostrar a mensagem.
  - `valueCents` = `soldQuantity` × preço do produto.
  - Salvar o acerto cria uma `Sale` com `origin: 'settlement'` na data do acerto, numa única transação Dexie.
- **A receber** = soma de `valueCents` dos acertos com `paid: false`. O botão "Recebi" marca `paid` e grava `paidDate`.
- **Faturamento** = soma das `Sale.valueCents` do período (as vendas do Açougue contam na data do acerto). A tela Início mostra separado o que já foi recebido e o que falta receber.
- **Lucro bruto** = faturamento − despesas.
- **Sobra** = lucro bruto − gastos pessoais.
- **Dinheiro:** só inteiros em centavos. Formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Nunca usar float para somar dinheiro.

### Precificação

```
custo do item       = pricePaidCents / packageQty × quantity
custo do lote       = Σ itens + laborPerBatchCents + otherCostsPerBatchCents
custo por unidade   = custo do lote / yield + packagingPerUnitCents
preço               = custo por unidade / (1 − margem)
margem              = (preço − custo por unidade) / preço
markup              = (preço − custo por unidade) / custo por unidade
```

- Os campos de margem e preço ficam ligados nos dois sentidos: editar um recalcula o outro.
- Mostrar **margem e markup** lado a lado (margem não é markup: custo R$4 com 50% de margem dá preço R$8).
- Arredondar só na exibição e no preço final (para centavos). Os cálculos intermediários usam números sem arredondar.
- A mão de obra por lote é a diária da avó dividida pelos lotes feitos no dia. O Arão informa esse valor na receita.
- Quando o preço de um ingrediente muda, todas as receitas se recalculam. Avisar quais produtos ficaram abaixo de `targetMargin`.
- "Aplicar preço" atualiza o `Product.priceCents`, mas só depois de confirmação.

## Telas

1. **Início (mês atual):**
   - faturamento, já recebido, a receber do Açougue, despesas, lucro bruto, gastos pessoais e sobra;
   - estoque em casa e no Açougue;
   - botões grandes: Venda, Produção, Açougue, Despesa e Gasto pessoal;
   - aviso de backup com mais de 7 dias.
2. **Venda (Escola):** produto e quantidade; o valor vem de quantidade × preço e pode ser editado (desconto); data e hora automáticas. Meta: 3 toques.
3. **Produção:** produto, quantidade e perda (opcional).
4. **Açougue:** saldo por produto, botões Entregar e Fazer acerto, lista de acertos não pagos com o botão "Recebi".
5. **Despesa / Gasto pessoal:** valor, categoria em botões e descrição curta. Gasto pessoal é um fluxo separado.
6. **Semana:** quantidade e faturamento por produto, total da semana, separados por Açougue e Escola, mais o total geral. Tocar numa célula abre os lançamentos dela.
7. **Mês:** faturamento por produto e por ponto, produção por produto, despesas por categoria, lucro, gastos pessoais e sobra, com comparação com o mês anterior.
8. **Precificação:** ingredientes, receitas, custo por unidade, margem ↔ preço.
9. **Ajustes:**
   - produtos e preços, pontos, categorias;
   - contagem inicial de estoque;
   - backup (exportar e importar JSON) e exportação CSV.

Todo lançamento pode ser editado ou apagado num histórico, e os totais se recalculam na hora (`useLiveQuery`).

## Cuidados com o iPhone (iOS Safari)

- **Instalação obrigatória:** o Safari apaga os dados de sites sem uso há 7 dias, e apps instalados na tela de início ficam fora dessa regra.
  - Detectar `navigator.standalone` / `display-mode: standalone`.
  - Fora do modo instalado, mostrar a instrução "Compartilhar → Adicionar à Tela de Início".
- **`navigator.storage.persist()` é sempre negado no iOS.** A proteção vem da instalação e do backup.
- **Backup:**
  - Exportar JSON `{ app: 'controle-arao', schemaVersion, exportedAt, tables: {...} }` via `navigator.share` (cai em Arquivos, iCloud Drive ou WhatsApp), com fallback para download.
  - O import valida o `schemaVersion` e substitui tudo, só depois de confirmação.
  - Guardar a data do último backup.
- **Inputs:**
  - `font-size` de pelo menos 16px (abaixo disso o iOS dá zoom no campo).
  - Dinheiro com `inputMode="decimal"`; quantidades com `inputMode="numeric"`.
- **Layout:** respeitar `env(safe-area-inset-*)` (notch e home indicator). Usar `<meta name="apple-mobile-web-app-capable">`, `apple-touch-icon` 180×180 e `theme-color`.
- **Toques:** alvos de pelo menos 44×44px, uso com uma mão e ações principais embaixo.
- **Sem notificação local** em PWA. Lembretes ficam dentro do app.

## Dados históricos

Agosto a outubro do caderno entram como `Sale` com `origin: 'import'`: uma por semana, por produto e por ponto, na data do domingo da semana. Despesas entram uma a uma.

Critério de validação de agosto:
- vendas = **R$2.747**: Açougue R$2.130 + Escola R$617 (o caderno diz R$2.750 por erro de soma);
- despesas = **R$1.811** (o caderno diz R$1.810).

## Ordem de implementação

1. Base do projeto + PWA + deploy de uma tela "olá" no GitHub Pages → **instalar no iPhone e testar offline** antes de qualquer regra.
2. Tipos, schema Dexie (com `version()` para migrações) e seed.
3. Funções de domínio + testes Vitest (estoque, semana/mês, acerto, totais, precificação).
4. Lançamentos: Venda, Produção, Despesa e Gasto pessoal.
5. Fluxo do Açougue (entrega, acerto, recebido).
6. Início, Semana e Mês.
7. Precificação.
8. Ajustes, backup/import e CSV.
9. Importação de agosto a outubro e conferência dos totais.

## Como trabalhar neste repositório

- Rodar `npm run test` e `npm run build` antes de cada commit. Commits pequenos, com mensagem em português.
- Toda mudança de schema Dexie cria uma nova `db.version(n)` com migração; nunca editar uma versão antiga.
- Textos da interface em pt-BR, curtos e sem jargão (o Arão não é técnico).
- Não adicionar dependências pesadas sem necessidade. O bundle precisa abrir rápido no iPhone.
- Antes de inventar uma regra de negócio, checar a especificação. Se não estiver lá, perguntar ao Heilio.

## Pendências (não bloqueiam o início)

- Preço atual de cada produto.
- Receitas dos quatro produtos: quantidades, rendimento e preço pago em cada ingrediente.
- Valor da diária da avó e quantos lotes ela ajuda a fazer por dia.
- Se "por fora" é só a Escola Piratininga ou se inclui encomendas avulsas (se incluir, vira um terceiro ponto de venda).
- Frequência do acerto com o Açougue.
- Tokens do design system (enquanto não chegam, usar `src/styles/tokens.css` provisório).

Toda mudança de regra, tela ou schema atualiza este arquivo e o CHANGELOG no mesmo commit. Decisão nova vai para docs/decisoes.md.