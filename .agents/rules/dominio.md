---
trigger: model_decision
description: "Regras de negócio e dados: tipos, schema Dexie, seed, fechamento da semana, estoque, Açougue (entrega e acerto), faturamento, lucro estimado, metas, Painel (dados dos gráficos), precificação de receitas e importação do caderno. Ler antes de mexer em src/domain, src/db ou em qualquer cálculo."
---

# Domínio do Controle Arão

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

- Uma folha "Fechar a semana" com um card por produto. Em cada card: **Produziu**, **Vendeu** e **Perdeu** (opcional), em passos de − / +; o card mostra o faturamento da venda na mão (vendidos × preço, editável para desconto) e quanto sobrou em casa, já descontando o que foi levado ao Açougue ("Sobrou 4" ou "Levou 30 ao Açougue · sobrou 0"; textos trocados a pedido do Heilio em 22/11).
- No fim da folha: total da venda na mão da semana e o aviso de que as vendas do Açougue entram pelo acerto.
- **Erro:** vender mais do que tinha em casa (estoque do início da semana + produzido − perdido − entregue) bloqueia o salvar e marca o card em vermelho com a conta ("Tinha 2 em casa + 10 feitos = 12") e o aviso "Vendeu mais do que tinha (12). Confira os números.".
- A semana vai de segunda a domingo; o fechamento vem marcado com a semana atual, e dá para escolher outra (só a atual e as anteriores; semanas futuras ficam bloqueadas).
- **Desconto:** tocar no valor "Venda na mão" do card abre o campo para digitar outro valor (decidido em 15/11). Mudar a quantidade vendida volta o valor para vendidos × preço; sem preço cadastrado, o valor digitado fica.
- Salvar cria/atualiza o `WeekClose` de cada produto e uma `Sale` com `origin: 'week_close'` na data do **domingo** da semana, numa única transação Dexie. Fechar de novo a mesma semana edita, não duplica.
- **Apagar semana** (22/11): a folha de uma semana já fechada tem o botão "Apagar semana" (com confirmação), que marca como apagados os fechamentos e as vendas na mão daquela semana.
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
  - **Sem preço** (decidido em 22/11): o card azul mostra "Sem preço · toque no valor para digitar" e o Arão digita o valor que o Açougue vendeu. Com preço cadastrado, vale vendidos × preço.
  - **Nada a receber** (decidido em 22/11): acerto com valor 0 (o Açougue não vendeu nada, só sobrou ou estragou) é salvo já como recebido; guarda a contagem para o estoque e não aparece em "Esperando pagamento".
  - Editar um acerto antigo usa o estoque de logo antes dele (entregas até a data dele e só os acertos anteriores).
  - Mudar ou apagar uma entrega que deixaria o Açougue com estoque negativo é bloqueado: "O Açougue já vendeu parte dessa entrega. Corrija o acerto antes."
  - "Recebi" mostra o aviso verde "R$ 64,00 recebido" com **Desfazer**.
  - **Data da entrega** (pedido de 22/11): a folha Entregar tem a data embaixo da quantidade, hoje por padrão, com "toque para mudar a data" (não aceita data futura).
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

## Dados históricos

Agosto a outubro do caderno entram como `WeekClose` + `Sale` com `origin: 'import'`: uma por semana e por produto, na data do domingo da semana; as vendas do Açougue entram como venda do ponto Açougue. Despesas entram uma a uma, já nas 12 categorias.

Critério de validação de agosto:
- vendas = **R$2.747**: Açougue R$2.130 + venda direta R$617 (o caderno diz R$2.750 por erro de soma);
- despesas = **R$1.811** (o caderno diz R$1.810).
