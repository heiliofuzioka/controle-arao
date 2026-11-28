---
trigger: model_decision
description: "Visual do app: telas, componentes, cores, tipografia, navegação, logo, ícone, abertura animada e boas-vindas. Ler antes de criar ou mudar qualquer tela ou componente."
---

# Design do Controle Arão

## Design

- **Referência das telas: pasta `docs/telas/`** (exportada do canvas "Controle Arão — Telas", que é privado e o agente não consegue abrir).
  - `docs/telas/png/` — imagem de cada tela, em 2x, numerada na ordem do canvas. `docs/telas/README.md` lista todas.
  - `docs/telas/html/` — o HTML de cada tela, com os valores exatos de cor, espaçamento, raio e tipo nos `style`. Use para medir; não copie a estrutura (é desenho, não componente React).
  - 50 telas em 11 seções: 0 Abertura, logo, ícone e instalação · 1 Fechar a semana · 2 Início · 3 Açougue · 4 Semana · 5 Fechamento do mês · 6 Ano · 7 Receitas · 8 Despesa, Gasto pessoal, Metas, Categorias e produtos, Ajustes · 9 Painel em pé · 10 Painel deitado. `01-Main.png` tem cores, tipografia e componentes.
  - Os números das telas são de exemplo; as regras de cálculo estão em `.agents/rules/dominio.md`.
- **Figma (versão anterior):** https://www.figma.com/design/DpZfYFXluBpkOgUJm4ZjBW. Serve para as **variáveis** (Cor, Espaço, Raio e Tipo, com o nome CSS no code syntax, ex.: `var(--cor-fundo-pagina)`) e os **componentes** com variantes. As telas de lá estão desatualizadas.
- **Componentes:** Botão grande, Atalho, Campo de valor, Contador, Passo (contador compacto do fechamento), Card do fechamento (um por produto), Seletor de produto, Card de total, Barra de meta, Linha de lançamento, Aviso, Barra de abas, Barra de status, Cabeçalho de folha.
- **Paleta (aprovada):** fundo `#F4F2ED`, cards `#FFFFFF`, ação `#244C9A` (texto creme `#FDEDCB` sobre ela), texto `#1B3270`, secundário `#4F5B80`, lucro/sucesso `#1E6B4E`. Cada produto tem uma cor na sigla: Gelinho azul, Brownie cacau, Recheado âmbar e Torta rosa.
- **Painel escuro:** fundo `#0E1C3D`, cards `#16295A`, trilho dos anéis `#24407E`; textos e destaques em branco `#FFFFFF`; secundário `#AFC0E6`; gráficos: faturamento `#7FA2F0`, lucro `#6FD0A4`, despesa `#F2B652`, Brownie `#D9A577`, Torta `#E8A0B8`, Gelinho `#9DB8F2`. A barra de abas continua branca. As outras telas (inclusive Fechamento do mês e Ano) continuam claras.
- **Tipografia:** Fredoka para títulos e números, Nunito para o resto. Texto corrido em 17px, campos com pelo menos 16px.
- **Forma:** cards sem sombra e sem borda, separados do fundo pelo tom. Botões em pílula com 56px de altura (botões de categoria e passos: 44px). Sombra só na barra de abas e nas folhas.
- **Avisos:** sucesso e erro com fundo sólido (verde `#1E6B4E`, vermelho `#B42318`) e texto branco. Informação (azul-claro) e atenção (âmbar-claro) ficam suaves.
- **Navegação:**
  - barra de abas embaixo com Início, Açougue, Semana, Painel e Ajustes (decidido em 22/11: cada aba entra quando a tela dela fica pronta; em 28/11 já existem Início, Açougue, Semana e Painel; Ajustes entra no passo 8);
  - Início: botões **Fechar a semana** (destaque), Açougue, Despesa e Gasto pessoal;
  - Painel: botões "Fechamento do mês" e "Ver o ano";
  - Ajustes → Receitas e preços, Categorias e produtos, Metas, Categorias de despesa, Contar estoque, Backup;
  - Fechar a semana, Despesa, Gasto pessoal, Entregar, Acerto, Novo produto e Fazer backup abrem como folha que sobe de baixo.
- **Fotos dos produtos:** fixas dentro do app, sem campo novo no banco. Enquanto não chegam, aparece a sigla na cor do produto.

### Logo, ícone e abertura (decisão de 14/11)

- **Arquivos** em `public/brand/` (SVG vetorizado da arte do Arão; cores da logo: azul `#1A4594`, creme `#FDEBD7`):
  - `arao-logo-vertical-creme.svg` (abertura e boas-vindas, sobre azul) e `arao-logo-vertical-azul.svg`;
  - `arao-logo-horizontal-azul.svg` (fundos claros) e `arao-logo-horizontal-creme.svg`;
  - `arao-mascote-azul.svg` (fundos claros) e `arao-mascote-creme.svg` (fundo azul ou o Painel escuro);
  - ícone: `icone.svg`, `icone-180.png` (`apple-touch-icon`), `icone-192.png` e `icone-512.png` (manifest), `icone-maskable-512.png` (`purpose: 'maskable'`). Quadrado cheio, sem cantos: o iPhone arredonda sozinho.
- **Onde a logo aparece:** abertura; boas-vindas (antes de instalar); mascote no topo do Início (48px, azul) e ao lado do título do Painel (34px, creme); mascote no Painel vazio; rodapé de Ajustes "Controle Arão · versão 1.0". Não colocar a logo em mais lugares sem combinar.
- **Abertura animada** (componente `Splash`, referência de código: `docs/referencias/abertura-animada.html`):
  - Quadro inicial = imagem parada do iOS (`apple-touch-startup-image`): fundo creme `#FDEBD7` com o mascote azul no centro, 131px de largura (logo vertical com 240px). As imagens já estão prontas em `public/brand/splash/`: 22 PNGs (11 tamanhos de iPhone, cada um em pé e deitado), com o mascote no mesmo pixel em que a animação começa. As tags `<link rel="apple-touch-startup-image">` com o `media` de cada aparelho e orientação estão em `docs/referencias/startup-links.html`: colar no `<head>` do `index.html`. Sem a imagem deitada, o iPhone mostra tela branca ao abrir o app com o celular na horizontal. `html { background: #FDEBD7 }` e `theme-color` creme durante a abertura.
  - Sequência (1,45 s, toca uma vez): duas ondas azuis sobem de baixo e cobrem a tela (0–780 ms; ao passar, aparece o contorno creme do mascote) → o mascote sobe para o lugar (520–920 ms) → as letras A, R, Ã, O entram uma a uma subindo com leve quique (700–1280 ms, 60 ms entre elas) → o til cai por último (1060–1380 ms) → "Doce lembrança" aparece (1120–1450 ms).
  - Fica no quadro final (logo vertical creme sobre azul) até o app ter carregado o banco; depois some com fade de 200 ms para o Início. Se o app já estiver pronto, não espera além da animação.
  - Só na abertura a frio (não toca ao voltar do segundo plano).
  - `prefers-reduced-motion: reduce`: sem ondas nem movimento; troca suave de 250 ms do creme para o quadro final.
  - Só `transform` e `opacity`; letras, til, mascote e slogan são paths separados no SVG para animar.
  - **Deitado:** a mesma animação, com a logo centralizada na tela inteira (cabe: 273px de altura). O `Splash` ocupa a tela toda (`position: fixed; inset: 0`, sem descontar as safe areas) para bater com a imagem parada nas duas orientações. Se o celular girar durante a abertura, só recentraliza.
- **Boas-vindas (fora do modo instalado):** topo azul com a logo vertical; título "Instale o Controle Arão"; 3 passos (Compartilhar → Adicionar à Tela de Início → abrir pelo ícone do papagaio); aviso de que os dados ficam só no iPhone; botão "Continuar no Safari".

## Telas (v1)

0. **Abertura e boas-vindas:** veja "Logo, ícone e abertura".
1. **Início (mês atual):** faturamento, recebido e a receber, despesas, lucro estimado, gastos pessoais e sobra; meta do mês; estoque em casa e no Açougue; botões grandes: **Fechar a semana**, Açougue, Despesa e Gasto pessoal; avisos (backup, semana sem fechamento).
   - **Contar estoque** (decidido em 22/11, adiantado do passo 8, sem desenho próprio): folha com um card por produto e os passos "Em casa" e "No Açougue", começando no que o app calcula. Grava só a diferença como ajuste (`initial_count` na primeira vez, `correction` depois); contar zero na primeira vez também fica registrado. Abre pelo "Contar" do aviso e ao lado de "Estoque". Produto sem nenhum registro (contagem, fechamento ou entrega) aparece como "Ainda não contado" e "—".
   - **Metas** (decidido em 22/11, adiantado do passo 8): a tela 37 abre pelo "Definir meta"/"Mudar meta" do card "Meta do mês", com botão de voltar. O card do Início mostra as barras das metas que existirem (faturamento e lucro estimado).
   - **Aviso de backup** fica escondido até o backup existir (passo 8).
   - **Aviso da semana passada** só aparece depois que o Arão já fechou alguma semana no app (no primeiro uso, só o "Comece contando").
   - Lucro estimado sem receita cadastrada mostra "Falta o custo das receitas" embaixo do valor.
   - Em telas baixas (celular deitado, iPhone pequeno), os atalhos rolam junto com a tela em vez de ficarem presos embaixo.
   - A lista provisória "Últimos lançamentos" saiu do Início em 28/11 (passo 6c): despesas e gastos pessoais se editam no Fechamento do mês; fechamentos, entregas e acertos, na aba Semana (e os acertos a receber, no Açougue).
2. **Fechar a semana (folha):** veja a seção acima.
3. **Açougue:** saldo por produto, Entregar e Fazer acerto, acertos não pagos com "Recebi".
4. **Despesa / Gasto pessoal (folhas):** valor, data (hoje por padrão, toque para mudar), categoria em botões (12 + as criadas) e descrição curta.
5. **Semana:** faturamento da semana, divisão na mão × Açougue, e por produto: **produzido, vendido (na mão + Açougue), em estoque e faturamento** ("em estoque" no lugar de "sobrou", pedido de 22/11); tocar num produto abre os lançamentos dele (fechamento, entregas e acertos). Semana sem fechamento mostra o botão "Fechar a semana".
6. **Painel (aba, fundo escuro):** veja a seção "Painel".
7. **Fechamento do mês (pelo Painel):** vendas, despesas, saldo, lucro estimado e sobra; metas; produzido, vendido e faturamento por produto; **lista das despesas do mês com "Adicionar despesa"** e total por categoria; semanas do mês; comparação com o mês anterior.
   - Também lista os **gastos pessoais** do mês, com "Adicionar gasto pessoal" (28/11: é onde se edita e apaga um gasto pessoal; não estava no desenho). Lançamento novo num mês passado começa no último dia dele. Tocar numa semana abre a aba Semana nela.
8. **Ano (pelo Painel):** janeiro a dezembro em colunas (faturamento com lucro dentro) e lista mês a mês com crescimento ou queda; tocar num mês abre o Fechamento dele; trocar o ano e comparar com outro ano.
   - Comparar (28/11): botões "Comparar com <ano>" para cada ano anterior com vendas; a comparação usa os meses em que o ano escolhido vendeu. "Mês a mês" lista só os meses com vendas, do mais novo para o mais antigo.
9. **Receitas (Ajustes):** livro por sabor, agrupado por produto (nome, ingredientes e quantidades, outros custos do lote, rendimento, modo de preparo, observações, custo por unidade); tela de preço e margem; ingredientes com preço pago; cadastrar, editar e excluir.
10. **Metas (Ajustes):** meta de faturamento e de lucro estimado por mês, com o progresso até agora.
11. **Categorias e produtos (Ajustes):** criar, editar e organizar categorias e produtos (nome, categoria, sigla, preço, ativo). Produto novo aparece no fechamento da semana, nos gráficos e nas receitas.
12. **Ajustes:** "Backup e seus dados" primeiro (Fazer backup, Restaurar, Exportar CSV); depois Produtos e receitas (Receitas e preços, Categorias e produtos, Metas); depois Despesas e estoque (Categorias de despesa, Contar estoque); no fim, mascote + "Controle Arão · versão 1.0".

Todo lançamento pode ser editado ou apagado (exclusão marcada), e os totais se recalculam na hora (`useLiveQuery`).
