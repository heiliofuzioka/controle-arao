# CLAUDE.md — Controle Arão (controle de vendas, produção e custos)

Este arquivo dá o contexto do projeto para o Claude Code. Especificação completa: doc "Sistema Arão — Especificação v1" (Claude Docs). Em caso de conflito, **este arquivo vale** (ele tem as decisões de 08/11, mais novas que a especificação); atualize-o quando uma decisão mudar.

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
| Testes | Vitest para toda a lógica de domínio |
| Deploy | GitHub Actions → GitHub Pages (`vite.config.ts` com `base: '/controle-arao/'`) |

## Design

- **Referência oficial: canvas "Controle Arão — Telas"** — https://claude.ai/artifact/7hQreFk7T6yWuovxpzcHzT (atualizado em 08/11 com as decisões da v1).
  - 42 telas em 10 seções: 1 Fechar a semana · 2 Início · 3 Açougue · 4 Semana · 5 Fechamento do mês · 6 Ano · 7 Receitas · 8 Despesa, Gasto pessoal, Metas, Categorias e produtos, Ajustes · 9 Painel em pé · 10 Painel deitado. Cada tela com seus estados (vazio, com dados, erro).
  - O primeiro quadro, "Fundamentos e componentes", tem cores, tipografia e os componentes.
  - Os números das telas são de exemplo; as regras de cálculo estão neste arquivo.
- **Figma (versão anterior):** https://www.figma.com/design/DpZfYFXluBpkOgUJm4ZjBW. Serve para as **variáveis** (Cor, Espaço, Raio e Tipo, com o nome CSS no code syntax, ex.: `var(--cor-fundo-pagina)`) e os **componentes** com variantes. As telas de lá estão desatualizadas.
- **Componentes:** Botão grande, Atalho, Campo de valor, Contador, Passo (contador compacto do fechamento), Card do fechamento (um por produto), Seletor de produto, Card de total, Barra de meta, Linha de lançamento, Aviso, Barra de abas, Barra de status, Cabeçalho de folha.
- **Paleta (aprovada):** fundo `#F4F2ED`, cards `#FFFFFF`, ação `#244C9A` (texto creme `#FDEDCB` sobre ela), texto `#1B3270`, secundário `#4F5B80`, lucro/sucesso `#1E6B4E`. Cada produto tem uma cor na sigla: Gelinho azul, Brownie cacau, Recheado âmbar e Torta rosa.
- **Painel escuro:** fundo `#0E1C3D`, cards `#16295A`, trilho dos anéis `#24407E`; textos e destaques em branco `#FFFFFF`; secundário `#AFC0E6`; gráficos: faturamento `#7FA2F0`, lucro `#6FD0A4`, despesa `#F2B652`, Brownie `#D9A577`, Torta `#E8A0B8`, Gelinho `#9DB8F2`. A barra de abas continua branca. As outras telas (inclusive Fechamento do mês e Ano) continuam claras.
- **Tipografia:** Fredoka para títulos e números, Nunito para o resto. Texto corrido em 17px, campos com pelo menos 16px.
- **Forma:** cards sem sombra e sem borda, separados do fundo pelo tom. Botões em pílula com 56px de altura (botões de categoria e passos: 44px). Sombra só na barra de abas e nas folhas.
- **Avisos:** sucesso e erro com fundo sólido (verde `#1E6B4E`, vermelho `#B42318`) e texto branco. Informação (azul-claro) e atenção (âmbar-claro) ficam suaves.
- **Navegação:**
  - barra de abas embaixo com Início, Açougue, Semana, Painel e Ajustes;
  - Início: botões **Fechar a semana** (destaque), Açougue, Despesa e Gasto pessoal;
  - Painel: botões "Fechamento do mês" e "Ver o ano";
  - Ajustes → Receitas e preços, Categorias e produtos, Metas, Categorias de despesa, Contar estoque, Backup;
  - Fechar a semana, Despesa, Gasto pessoal, Entregar, Acerto, Novo produto e Fazer backup abrem como folha que sobe de baixo.
- **Fotos dos produtos:** fixas dentro do app, sem campo novo no banco. Enquanto não chegam, aparece a sigla na cor do produto.

## Estrutura de pastas

```
src/
  domain/        # tipos e funções puras (cálculos). Sem React, sem Dexie. 100% testado.
  db/            # schema Dexie, seed inicial, backup/import
  features/      # uma pasta por tela: home, week-close, butcher, expense, personal,
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

## Domínio

### Categorias e produtos (seed, editáveis)

O Arão lança a semana **por produto** (4 no início). Cada produto pertence a uma categoria e pode ter **vários sabores**, que são as receitas. Ele pode criar categorias e produtos novos depois (cookies, brigadeiros, bolos).

| Categoria | Produto | Sigla | Sabores (receitas) citados pelo Arão |
| --- | --- | --- | --- |
| Geladinhos gourmet | Gelinho | G | Nutella, maracujá, morango |
| Brownies tradicionais | Brownie | B | tradicional, leite Ninho |
| Brownies recheados | Brownie recheado | R | recheado (o Arão vai mudar o formato: sai do pote) |
| Tortas | Torta (de pote) | t | morango, amendoim, limão |

O preço é **único por produto**, igual em todos os pontos. Os preços atuais ainda não foram confirmados: seed com `priceCents: 0` e o Arão define em Ajustes.

### Pontos de venda (seed)

- **Venda direta** (Escola, rua, encomenda: tudo que ele vende na mão). `mode: 'direct'`. **Lançada no total da semana**, sem separar Escola de outros lugares (decisão de 08/11).
- **Açougue**. `mode: 'consignment'`. **Continua separado, com entrega e acerto** (decisão de 08/11).
  - O dono é o pai do Arão, que repassa 100% do valor (sem comissão).
  - O Açougue só paga depois de vender.
  - As vendas do Açougue nascem do acerto.

### Categorias de despesa (seed, editáveis)

Ingredientes · Embalagens · Funcionários (diária da avó) · Energia elétrica · Água · Gás · Transporte · Equipamentos · Manutenção · Marketing · Taxas · Outras despesas

"Ingredientes" é só o que vai nas receitas; compras da casa não entram. O Arão pode criar categorias novas.

### Tipos

```ts
type ID = string;          // crypto.randomUUID()
type Cents = number;       // inteiro, sempre centavos
type LocalDate = string;   // 'YYYY-MM-DD' no fuso do aparelho (nunca Date em UTC)

// Todo registro estende Base (pronto para sincronizar na v2)
interface Base { id: ID; createdAt: string; updatedAt: string; deletedAt?: string }

interface Category extends Base { name: string; order: number }
interface Product extends Base { categoryId: ID; name: string; code: string; priceCents: Cents; active: boolean }
interface SalesPoint extends Base { name: string; mode: 'direct' | 'consignment'; active: boolean }

// Fechamento da semana: uma linha por produto por semana (substitui Production e a venda avulsa)
interface WeekClose extends Base { weekStart: LocalDate /* segunda */; productId: ID; produced: number; loss: number;
                                   soldDirect: number; valueCents: Cents /* soldDirect × preço, editável */; note?: string }

interface Sale extends Base { date: LocalDate; pointId: ID; productId: ID; quantity: number; valueCents: Cents;
                              origin: 'week_close' | 'settlement' | 'import'; weekCloseId?: ID; settlementId?: ID }

interface Delivery extends Base { date: LocalDate; pointId: ID; productId: ID; quantity: number }
interface Settlement extends Base { date: LocalDate; pointId: ID; productId: ID; remaining: number; loss: number;
                                    soldQuantity: number; valueCents: Cents; paid: boolean; paidDate?: LocalDate }

interface StockAdjustment extends Base { date: LocalDate; productId: ID; location: 'home' | 'consignment'; pointId?: ID;
                                         delta: number; reason: 'initial_count' | 'correction'; note?: string }

interface ExpenseCategory extends Base { name: string; isProductCost: boolean /* true: Ingredientes, Embalagens */ }
interface Expense extends Base { date: LocalDate; valueCents: Cents; categoryId: ID; description?: string }
interface PersonalExpense extends Base { date: LocalDate; valueCents: Cents; description?: string }

interface MonthlyGoal extends Base { month: string /* 'YYYY-MM' */; revenueCents?: Cents; profitCents?: Cents }

type Unit = 'g' | 'ml' | 'un';
interface Ingredient extends Base { name: string; pricePaidCents: Cents; packageQty: number; unit: Unit }
interface Recipe extends Base { productId: ID; name: string /* sabor */; yield: number; packagingPerUnitCents: Cents;
                                laborPerBatchCents: Cents; otherCostsPerBatchCents: Cents; targetMargin: number /* 0–1 */;
                                preparation?: string; notes?: string; active: boolean }
interface RecipeItem extends Base { recipeId: ID; ingredientId: ID; quantity: number /* na unidade do ingrediente */ }
```

A UI aceita kg e L, mas grava em g e ml (`packageQty` e `quantity` ficam na unidade base).

### Fechamento da semana (substitui a venda por transação; decisão de 08/11)

- Uma folha "Fechar a semana" com um card por produto. Em cada card: **Produziu**, **Vendeu na mão** e **Perdeu** (opcional), em passos de − / +; o card mostra o faturamento da venda na mão (vendidos × preço, editável para desconto) e quanto ficou em casa (já descontando o que foi levado ao Açougue).
- No fim da folha: total da venda na mão da semana e o aviso de que as vendas do Açougue entram pelo acerto.
- **Erro:** vender mais do que tinha em casa (estoque do início da semana + produzido − perdido − entregue) bloqueia o salvar e marca o card em vermelho com a conta ("Tinha 2 em casa + 10 feitos = 12").
- A semana vai de segunda a domingo; o fechamento vem marcado com a semana atual, e dá para escolher outra.
- Salvar cria/atualiza o `WeekClose` de cada produto e uma `Sale` com `origin: 'week_close'` na data do **domingo** da semana, numa única transação Dexie. Fechar de novo a mesma semana edita, não duplica.
- Entregas e acertos do Açougue continuam separados, nas datas em que acontecem.

### Regras de cálculo (todas em `src/domain/`, todas com teste)

- **Semana:** de segunda a domingo (`startOfWeek(d, { weekStartsOn: 1 })`).
- **Mês:** mês do calendário pela `date` de cada lançamento (fechamentos contam na data do domingo da semana). Considera meses com semanas parciais e com 5 semanas.
- **Semanas do mês:** as semanas cujo domingo cai no mês (4 ou 5; a primeira pode começar no mês anterior).
- **Estoque em casa** (por produto) = produzido − perdas − vendidos na mão − entregas ao Açougue + ajustes `home`. Fechamentos importados do caderno **não entram** (o caderno só anota vendas, não a produção; confirmado em 08/11).
- **Estoque no Açougue** (por produto) = entregas − vendidos nos acertos − perdas nos acertos + ajustes `consignment`.
- **Sobrou na semana** (por produto) = estoque em casa no fim da semana.
- **Acerto:**
  - `soldQuantity` = estoque no Açougue antes do acerto − `remaining` − `loss`. Se der negativo, é erro: bloquear e mostrar a mensagem.
  - `valueCents` = `soldQuantity` × preço do produto.
  - Salvar o acerto cria uma `Sale` com `origin: 'settlement'` na data do acerto, numa única transação Dexie.
- **A receber** = soma de `valueCents` dos acertos com `paid: false`. O botão "Recebi" marca `paid` e grava `paidDate`.
- **Faturamento** = soma das `Sale.valueCents` do período.
- **Já recebido** = venda direta + vendas importadas + vendas de acertos já pagos (confirmado em 08/11). O resto do faturamento é o que falta receber.
- **Saldo** (resultado financeiro simplificado) = faturamento − despesas.
- **Custo de um produto por unidade** = média do custo por unidade das receitas ativas daquele produto (sem receita: não calcula, e as telas avisam "cadastre a receita").
- **Lucro estimado** = faturamento − (custo por unidade × unidades vendidas, por produto) − despesas de categorias com `isProductCost: false`. **Não descontar** Ingredientes e Embalagens de novo, porque já estão no custo dos produtos (evita contar duas vezes).
- **Sobra** = saldo − gastos pessoais.
- **Metas:** para o mês, meta de faturamento e de lucro estimado; mostrar alcançado, % atingido, quanto falta e uma barra de progresso.
- **Dinheiro:** só inteiros em centavos. Formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Nunca usar float para somar dinheiro.

### Painel (aba; versão do Augusto, aprovada em 07/11)

Ordem (em pé, rolando): cabeçalho → "Sobrou no período" → filtro → três cards → **metas do mês** → gráfico de ondas → gráfico de colunas → botões "Fechamento do mês" e "Ver o ano". Ao rolar, o filtro fica preso no topo.

- **Filtro de período:** Semana · Mês · 2 meses · 6 meses · Ano. Muda o número grande, os três cards e os dois gráficos. Intervalos: semana atual; mês atual; mês anterior + atual; últimos 6 meses (com o atual); ano do calendário (jan–dez). *(Escolha do código, a confirmar.)*
- **Número grande:** "Sobrou no período".
- **Três cards, nesta ordem:** Faturamento (anel: % já recebido), Despesas (anel: % do faturamento), Lucro estimado (anel: margem).
- **Metas do mês:** duas barras (faturamento e lucro estimado) com alcançado, % e quanto falta. Sem meta cadastrada: link "Definir meta".
- **Alertas** no topo quando houver: backup com mais de 7 dias, acerto a receber há mais de 14 dias, produto sem receita (lucro estimado incompleto), semana anterior sem fechamento.
- **Gráfico de ondas "Vendas por produto"**, um ponto por semana: fundo Brownie (tradicional + recheado), meio Torta, frente Gelinho. Toque: linha vertical e card branco com o valor de cada produto e o lucro da semana. A faixa do período escolhido fica destacada.
- **Gráfico de colunas "Faturamento e lucro":** coluna azul = faturamento; dentro, coluna verde mais estreita = lucro estimado; eixo de valores à esquerda a partir de R$ 0; data embaixo. Semana → últimas 8 semanas; Mês e 2 meses → uma coluna por semana; 6 meses e Ano → uma por mês. A coluna atual mostra o valor numa etiqueta branca.
- **Celular deitado** (`@media (orientation: landscape)`): coluna esquerda com "Sobrou" e os três cards; à direita, o filtro e um gráfico por vez. Sem barra de abas. `ResizeObserver` redesenha o gráfico; respeitar `env(safe-area-inset-left/right)`.
- Filtros cabem em 320px: botões com `flex: 1 1 0; min-width: 0`.

### Precificação (dentro de Receitas)

```
custo do item       = pricePaidCents / packageQty × quantity
custo do lote       = Σ itens + laborPerBatchCents + otherCostsPerBatchCents
custo por unidade   = custo do lote / yield + packagingPerUnitCents
preço sugerido      = custo por unidade / (1 − margem)
margem              = (preço − custo por unidade) / preço
markup              = (preço − custo por unidade) / custo por unidade
lucro por unidade   = preço − custo por unidade
```

- Margem e preço ligados nos dois sentidos: editar um recalcula o outro. Mostrar margem, markup e lucro por unidade lado a lado (margem é sobre o preço, não acréscimo sobre o custo).
- Arredondar só na exibição e no preço final.
- A mão de obra por lote é a diária da avó dividida pelos lotes feitos no dia; o Arão informa na receita.
- Quando o preço de um ingrediente muda, todas as receitas se recalculam. Avisar quais sabores ficaram abaixo de `targetMargin`. Sabor de produto ainda sem preço também entra no aviso (confirmado em 08/11).
- "Aplicar preço" atualiza o `Product.priceCents`, só depois de confirmação. Como o preço é por produto e há vários sabores, mostrar o preço sugerido de cada sabor e deixar o Arão escolher o preço do produto.

## Telas (v1)

1. **Início (mês atual):** faturamento, recebido e a receber, despesas, lucro estimado, gastos pessoais e sobra; meta do mês; estoque em casa e no Açougue; botões grandes: **Fechar a semana**, Açougue, Despesa e Gasto pessoal; avisos (backup, semana sem fechamento).
2. **Fechar a semana (folha):** veja a seção acima.
3. **Açougue:** saldo por produto, Entregar e Fazer acerto, acertos não pagos com "Recebi".
4. **Despesa / Gasto pessoal (folhas):** valor, data (hoje por padrão, toque para mudar), categoria em botões (12 + as criadas) e descrição curta.
5. **Semana:** faturamento da semana, divisão na mão × Açougue, e por produto: **produzido, vendido (na mão + Açougue), sobrou e faturamento**; tocar num produto abre os lançamentos dele (fechamento, entregas e acertos). Semana sem fechamento mostra o botão "Fechar a semana".
6. **Painel (aba, fundo escuro):** veja a seção "Painel".
7. **Fechamento do mês (pelo Painel):** vendas, despesas, saldo, lucro estimado e sobra; metas; produzido, vendido e faturamento por produto; **lista das despesas do mês com "Adicionar despesa"** e total por categoria; semanas do mês; comparação com o mês anterior.
8. **Ano (pelo Painel):** janeiro a dezembro em colunas (faturamento com lucro dentro) e lista mês a mês com crescimento ou queda; tocar num mês abre o Fechamento dele; trocar o ano e comparar com outro ano.
9. **Receitas (Ajustes):** livro por sabor, agrupado por produto (nome, ingredientes e quantidades, outros custos do lote, rendimento, modo de preparo, observações, custo por unidade); tela de preço e margem; ingredientes com preço pago; cadastrar, editar e excluir.
10. **Metas (Ajustes):** meta de faturamento e de lucro estimado por mês, com o progresso até agora.
11. **Categorias e produtos (Ajustes):** criar, editar e organizar categorias e produtos (nome, categoria, sigla, preço, ativo). Produto novo aparece no fechamento da semana, nos gráficos e nas receitas.
12. **Ajustes:** "Backup e seus dados" primeiro (Fazer backup, Restaurar, Exportar CSV); depois Produtos e receitas (Receitas e preços, Categorias e produtos, Metas); depois Despesas e estoque (Categorias de despesa, Contar estoque).

Todo lançamento pode ser editado ou apagado (exclusão marcada), e os totais se recalculam na hora (`useLiveQuery`).

## Fora da v1 (v2, decidido em 08/11)

- Estoque de ingredientes e embalagens com lista de compras (baixa automática na produção, estoque mínimo, alertas, compras que atualizam estoque e despesas).
- Perdas com motivo (queimou, erro, danificado, caiu, consumo interno, vencido) e custo das perdas.
- Ranking dos mais vendidos e dos mais lucrativos por semana, mês e ano (inclui sabores).
- Planejamento de produção e encomendas.
- Controle de validade por lote.
- Ver no computador e sincronizar entre aparelhos (Google Drive do Arão ou Supabase/Dexie Cloud, com login). No plano grátis do Supabase o projeto pausa após 7 dias sem uso; resolver com um acesso agendado ou usar o Drive/Firebase.

## Cuidados com o iPhone (iOS Safari)

- **Instalação obrigatória:** o Safari apaga os dados de sites sem uso há 7 dias, e apps instalados na tela de início ficam fora dessa regra.
  - Detectar `navigator.standalone` / `display-mode: standalone`.
  - Fora do modo instalado, mostrar a instrução "Compartilhar → Adicionar à Tela de Início".
- **`navigator.storage.persist()` é sempre negado no iOS.** A proteção vem da instalação e do backup.
- **Backup:**
  - Exportar JSON `{ app: 'controle-arao', schemaVersion, exportedAt, tables: {...} }` via `navigator.share` (cai em Arquivos, iCloud Drive ou WhatsApp), com fallback para download. Nome do arquivo: `controle-arao-DD-MM.json`.
  - O import valida o `schemaVersion` e substitui tudo, só depois de confirmação (botão de perigo "Substituir tudo").
  - Guardar a data do último backup.
- **Inputs:** `font-size` de pelo menos 16px; dinheiro com `inputMode="decimal"`; quantidades com `inputMode="numeric"`.
- **Layout:** respeitar `env(safe-area-inset-*)`. Usar `<meta name="apple-mobile-web-app-capable">`, `apple-touch-icon` 180×180 e `theme-color`.
- **Rotação:** não travar orientação no manifest.
- **Toques:** alvos de pelo menos 44×44px, uso com uma mão e ações principais embaixo.
- **Sem notificação local** em PWA. Lembretes ficam dentro do app.

## Dados históricos

Agosto a outubro do caderno entram como `WeekClose` + `Sale` com `origin: 'import'`: uma por semana e por produto, na data do domingo da semana; as vendas do Açougue entram como venda do ponto Açougue. Despesas entram uma a uma, já nas 12 categorias.

Critério de validação de agosto:
- vendas = **R$2.747**: Açougue R$2.130 + venda direta R$617 (o caderno diz R$2.750 por erro de soma);
- despesas = **R$1.811** (o caderno diz R$1.810).

## Ordem de implementação

1. Base do projeto + PWA + deploy de uma tela "olá" no GitHub Pages → **instalar no iPhone e testar offline** antes de qualquer regra.
2. Tipos (com `Base`), schema Dexie (com `version()` para migrações) e seed (categorias, produtos, pontos, categorias de despesa).
3. Funções de domínio + testes Vitest (fechamento da semana, estoque, semana/mês/ano, acerto, saldo, lucro estimado sem dupla contagem, metas, séries dos gráficos, precificação).
4. Fechar a semana, Despesa e Gasto pessoal.
5. Fluxo do Açougue (entrega, acerto, recebido).
6. Início, Semana, Painel, Fechamento do mês e Ano.
7. Receitas (livro + calculadora) e Categorias e produtos.
8. Metas, Ajustes, backup/import e CSV.
9. Importação de agosto a outubro e conferência dos totais.

## Como trabalhar neste repositório

- Rodar `npm run test` e `npm run build` antes de cada commit. Commits pequenos, com mensagem em português.
- Toda mudança de schema Dexie cria uma nova `db.version(n)` com migração; nunca editar uma versão antiga.
- Nunca apagar registros: marcar `deletedAt` e atualizar `updatedAt`.
- Textos da interface em pt-BR, curtos e sem jargão (o Arão não é técnico).
- Não adicionar dependências pesadas sem necessidade. O bundle precisa abrir rápido no iPhone.
- Antes de montar uma tela, abrir a tela correspondente no canvas e seguir os textos, a ordem e os estados de lá.
- Antes de inventar uma regra de negócio, checar este arquivo. Se não estiver aqui, perguntar ao Heilio.

## Pendências (não bloqueiam o início)

- **Colunas do Painel nos filtros "Mês" e "2 meses":** hoje por semana; confirmar com o Augusto.
- **Custo do produto com vários sabores:** hoje é a média das receitas ativas; confirmar se o Arão prefere escolher um sabor de referência.
- Preço atual de cada produto.
- Receitas dos sabores: ingredientes, quantidades, rendimento e preço pago em cada ingrediente.
- Valor da diária da avó e quantos lotes ela ajuda a fazer por dia.
- Frequência do acerto com o Açougue.
- Fotos dos 4 produtos (fundo liso, de cima).
