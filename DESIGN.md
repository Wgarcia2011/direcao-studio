---
name: Direção Studio — Central
description: Extensão local para planejar a edição no Concat em PC Windows.
colors:
  bg: "#0b0716"
  surface: "#151020"
  raised: "#1d152b"
  line: "#342442"
  text: "#f5f0ff"
  muted: "#b3a4c5"
  accent: "#d1b4ff"
  primary: "#a56bff"
  green: "#8edbc4"
  primary-ink: "#130a22"
  primary-hover: "#c2a6ff"
  quiet-hover: "#302240"
  selected: "#2a1c3b"
  selection: "#68429a"
typography:
  display:
    fontFamily: "Sora, Manrope, sans-serif"
    fontSize: "27px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.025em"
  title:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  metadata:
    fontFamily: 'Manrope, "Segoe UI", sans-serif'
    fontSize: "11px"
    fontWeight: 400
rounded:
  control: "7px"
  field: "6px"
  category: "5px"
spacing:
  tight: "7px"
  small: "10px"
  control: "14px"
  field-gap: "16px"
  group: "20px"
  panel: "24px"
  heading: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "10px"
  category-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
    rounded: "{rounded.category}"
    padding: "7px 10px"
---

# Design System: Direção Studio — Central

## Overview

**Creative North Star: "Modo Operate"**

A central estende a identidade existente do Direção Studio: roxo, superfícies escuras, Sora nos títulos e Manrope na leitura e nos controles. A estrutura organiza decisões locais antes da montagem. A documentação descreve o código atual de `central/style.css`, `central/index.html` e `central/app.js`; não registra uma nova aprovação visual nem substitui o DESIGN.md do sistema de origem.

O produto destina-se a PC Windows. Concat é o único editor de montagem. A central prepara materiais, pedidos, blocos e templates; Remotion, HyperFrames ou ambos produzem motions importáveis no Concat. O pedido compilado permanece acessível durante o planejamento, sem apresentar seleção ou cópia como edição executada.

**Key Characteristics:**

- Superfícies violetas escuras delimitadas por linhas finas.
- Ações roxas e seleção lavanda com texto explícito.
- Biblioteca em linhas, navegação estreita e pedido lateral no desktop amplo.
- Densidade funcional com formulários e disclosures.

## Colors

Os valores normativos são extraídos do CSS atual e estão no frontmatter. Os nomes abaixo preservam a relação com as propriedades locais.

### Primary

- **Violeta de ação — primary:** marca e ações principais. O texto usa primary-ink; o hover usa primary-hover.
- **Lavanda — accent:** links, metadados de motion, seleção e foco de teclado.

### Secondary

- **Verde água — green:** indicação local de edição e estado “Adicionado”. Não representa áudio nesta central.

### Neutral

- **Fundo profundo — bg:** canvas e campos.
- **Painel — surface:** cabeçalho, navegação e pedido.
- **Superfície elevada — raised:** botões secundários e edição das ideias selecionadas.
- **Divisória — line:** bordas, separação das linhas e scrollbar.
- **Texto — text / muted:** conteúdo principal e orientação auxiliar.
- **Seleção tonal — selected:** navegação e categoria ativas. Quiet-hover atende ao hover de botão; selection atende à seleção de texto.

**The Inherited Palette Rule.** Preserve a paleta roxa e escura herdada; a central não introduz outra identidade.

## Typography

**Display Font:** Sora, com fallback Manrope e sans-serif. **Body Font:** Manrope, com fallback Segoe UI e sans-serif. Os arquivos são locais em `central/fonts/`. Sora declara peso 700; Manrope não declara faixa de pesos no @font-face. Pesos fortes solicitados pelo CSS podem ser sintetizados pelo navegador.

Sora identifica o título principal curto; Manrope mantém a leitura contínua dos pedidos e formulários. A marca usa Manrope (19px), com complemento em peso 400. O título principal usa o token display; títulos de linhas usam title. Textos descritivos das linhas usam 13px; rótulos e edição de ideias usam label; contagens e metadados usam metadata. Parágrafos e textareas usam entrelinha 1.65; a nota final usa 1.8. A largura de descrições é limitada a 65ch. O h2 tem 16px, sem entrelinha própria declarada.

## Layout

O cabeçalho mede 76px, com padding horizontal de 28px. O shell centralizado tem largura máxima de 1920px e três colunas: navegação de 205px, conteúdo flexível e pedido de 350px. O conteúdo recebe 35px 32px; o pedido, 28px 24px. O pedido é sticky no topo, tem altura de 100vh e rolagem própria. Materiais usam duas colunas com gaps de 16px por 20px; formato e duração usam 90px mais coluna flexível.

A partir de 1500px, as laterais passam a 220px e 390px; o conteúdo ganha 48px de padding horizontal. Até 1150px, há duas colunas (175px e conteúdo flexível); “Seu pedido” aparece como aba dedicada que substitui o conteúdo central, preservando a navegação. Suas ideias selecionadas usam duas colunas. Ao ampliar acima de 1150px com a aba do pedido aberta, o JavaScript retorna à biblioteca e exibe novamente o pedido lateral.

Até 680px, as regras existentes empilham a janela, usam navegação horizontal e ocultam status local e rodapé lateral. Formulários e ideias passam para uma coluna; h1 reduz para 24px. Essas regras são tolerância a janela estreita no PC, não compromisso de suporte a outro dispositivo. A regra final de aba dedicada prevalece sobre a regra anterior que posicionava o pedido abaixo do conteúdo.

## Elevation & Depth

Profundidade vem de tons e divisórias, sem sombras nos painéis e linhas da biblioteca. Apenas o toast tem sombra (0 10px 30px #0006) e ocupa uma camada fixa inferior central. Botões transitam o fundo em .15s; toast transita opacidade e deslocamento em .18s. Movimento reduzido remove transições e rolagem suave. Não há animação de vídeo nem preview de render nesta superfície.

## Shapes

Botões, importação e toast usam cantos control; campos e scrollbar usam field; categorias usam category. Linhas de biblioteca, blocos e templates são seções separadas por bordas, sem caixas arredondadas elevadas. O status local usa ponto circular de 6px. Busca tem ícone SVG de 18px; o símbolo da marca mede 30px.

## Components

### Buttons

Ação principal usa violeta e peso 700; secundária usa raised com borda line. Hover clareia o fundo. Foco visível de botões, links, campos e summaries usa contorno accent de 2px e afastamento de 3px. Desabilitados têm opacidade .5 e cursor de espera; ocorre ao abrir o Concat e nas extremidades de reordenação dos blocos. Na janela mais estreita, botões têm altura mínima de 36px.

### Navigation and Categories

Biblioteca, Pré-montagem e Templates alternam regiões; a opção ativa tem fundo tonal e texto lavanda, com aria-current. Categorias usam o mesmo tratamento ativo, aria-pressed e quebra de linha. A aba “Seu pedido” aparece até 1150px. Contagens acompanham ideias, blocos, templates e resultados.

### Inputs and Materials

Campos têm fundo profundo, borda discreta, placeholder muted com opacidade .9 e caret lavanda. Materiais e direção começam expandidos e recolhem por summary. Incluem pastas locais, assunto, chamada e referência. Busca ignora acentos e combina texto com categoria. Formato, duração e notas integram o pedido; radios de motor atualizam a orientação sobre Remotion, HyperFrames ou ambos.

### Library and Request

Cada linha tem título, descrição, metadados e botão Adicionar. Selecionar muda para “Adicionado”; acioná-lo novamente remove a ideia. O pedido mostra vazio orientativo ou ideias com texto editável e ação Remover. O texto compilado fica em disclosure somente leitura. Copiar apresenta toast; se clipboard falhar, abre e seleciona o texto para Ctrl+C. Salvar template vazio apresenta orientação. O estado salvo fica no navegador; falha de armazenamento informa indisponibilidade.

### Pre-assembly and Templates

Blocos têm intervalo, ideia, fala, direção visual e motor próprio; podem subir, descer e ser removidos. O vazio orienta adicionar um bloco. Importação valida JSON e mostra resultado em toast; importação e uso de template preservam um rascunho anterior restaurável. Exportação baixa o plano. Templates mostram nome e contagens, com ações de uso e exclusão. Não há modal de confirmação implementado.

### Feedback

Toast tem role status, aria-live polite e duração de 3500ms. Biblioteca sem resultados, biblioteca indisponível e listas vazias usam texto contextual. Abrir Concat apresenta sucesso ou orientação para instalação em caso de falha. A central não contém player, timeline, indicador de progresso de render ou controle de aprovação de amostra.

## Do's and Don'ts

### Do:

- **Do** reutilizar a paleta herdada e a dupla Sora/Manrope.
- **Do** preservar foco visível, texto de estados e ordem de leitura nas janelas estreitas do PC.
- **Do** representar planos como intenções e manter Concat como editor de montagem.
- **Do** conferir o CSS da central ao estender esta superfície: os valores locais são os documentados aqui.

### Don't:

- **Don't** criar outra identidade visual para a central.
- **Don't** converter linhas e divisórias em uma coleção de cards com sombra.
- **Don't** apresentar o pedido copiado como edição ou exportação executada.
- **Don't** importar sem conferência tokens homônimos do sistema de origem: surface e foco têm papéis locais diferentes.
