# Prompts para o agente (um passo por vez)

Use o modo **Planning**: o agente mostra o plano antes de mexer no código. Leia o plano, corrija o que estiver errado e só então aprove. Ao fim de cada passo, teste no iPhone antes de pedir o próximo.

## Passo 1 — Base, PWA e "olá" no iPhone

```
Leia o AGENTS.md e as regras em .agents/rules/iphone.md e .agents/rules/design.md.
Faça só o passo 1 da "Ordem de implementação":
- projeto Vite + React + TypeScript strict, com Vitest, nesta pasta (sem apagar AGENTS.md, CLAUDE.md, .agents/, docs/ e public/brand/);
- vite-plugin-pwa com o manifest do AGENTS.md, usando os ícones de public/brand/ (180 como apple-touch-icon, 192, 512 e o maskable);
- HashRouter, tokens.css com as cores e fontes do design, base '/controle-arao/';
- uma tela "Olá, Arão" com o mascote (public/brand/arao-mascote-azul.svg);
- GitHub Actions publicando no GitHub Pages.
Não crie nenhuma regra de negócio ainda. No fim, me diga como instalar no iPhone e testar offline.
```

## Passo 2 — Tipos, banco e seed

```
Faça o passo 2 da ordem de implementação. Siga .agents/rules/dominio.md à risca (tipos com Base, Dexie com version(), seed de categorias, produtos, pontos de venda e categorias de despesa com priceCents 0). Escreva testes do seed.
```

## Passo 3 — Cálculos com testes

```
Faça o passo 3: todas as funções de src/domain/ listadas em .agents/rules/dominio.md, com testes Vitest. Inclua o teste do lucro estimado sem contar Ingredientes e Embalagens duas vezes e o erro de vender mais do que tinha. Nada de tela neste passo.
```

## Passos 4 a 9

```
Faça o passo N da ordem de implementação. Antes de cada tela, abra a imagem dela em docs/telas/png/ (a lista está em docs/telas/README.md) e use o HTML em docs/telas/html/ para as medidas. Siga os textos, a ordem e os estados (vazio, com dados, erro) da imagem.
```

Na abertura animada (passo 8), use `docs/referencias/abertura-animada.html` como referência de código e a seção "Logo, ícone e abertura" de `.agents/rules/design.md`.
