---
name: meia-motion-shorts
description: Monte em código um corte curto (≈30 s) com motion Remotion sincronizado à fala real — ênfase em frases, cortes de aproximação, apresentador em moldura lateral ou inferior, cards e placeholders temáticos, preto e branco nos momentos negativos e cor nos positivos — em 16:9 ou 9:16. Use quando o usuário pedir um vídeo curto "com motions", "animado", "estilo reels" ou parecido com uma referência; não para a edição comum da timeline nem para os presets automáticos de `motion-preset`.
---

# Shorts com motion em código

Esta skill descreve o processo validado com o usuário em 08/10/2026 (testes de
entrevistas em 16:9 e 9:16). Ela não autoriza exportação final, serviços
pagos nem envio de mídia: siga CLAUDE.md e a skill `meia-briefing-de-edicao` para
escopo e aprovação. Para Remotion, leia `remotion-best-practices` e a referência
de markup.

## 1. Escolha a fala pela transcrição real

- Use `projetos/ID/edit/transcricao-original.json` (`words: [{w, s, e}]`). Se não
  existir, rode `run ID legendar --wait`.
- Escolha 3–5 trechos que formem uma história: expectativa → virada → conclusão.
  Some ≈30 s. Evite repetir trechos de uma amostra já rejeitada.
- Corte nas bordas das palavras com margem de 30–150 ms e fades de áudio de
  20–30 ms. Em autocorreção do falante, mantenha a versão corrigida e avise.
- Descarte palavras duplicadas de duração zero (alucinação do Whisper), palavras
  que vazam do trecho vizinho e confira dúvidas de transcrição na amostra.
- Gere com FFmpeg (filtro `trim/atrim` + `concat`) em
  `app/remotion-project/public/projects/NOME/cut.mp4`, mais `words.json` com os
  tempos remapeados para a saída e `props.json` `{video, words, durationInFrames}`.
  Essa pasta é ignorada pelo Git. Nunca altere `brutos/`.

## 2. Olhe os frames antes de posicionar qualquer coisa

Extraia uma grade (`select=eq(n\,N)+...,tile=3x3`) do corte e anote a posição dos
rostos (x/y em fração do quadro) de cada câmera. Todo texto, card ou ícone deve
ficar fora dos rostos — inclusive de quem só está ouvindo — e dentro da tela.

## 3. Enquadramento

Defina uma lista de "shots" por tempo de saída: `{t, modo, zoom, fx, fy}`.

- **Tela cheia**: aproximações em corte seco (zoom 1.15–1.3, sem interpolação)
  focadas no rosto de quem fala, nas palavras-chave.
- **16:9 lateral**: o vídeo inteiro encolhe para uma moldura à esquerda
  (≈1110×624) com cantos chanfrados, contorno duplo, sombra e leve perspectiva.
  Não recorte o quadro ("sem cortar a tela"); a direita fica para os cards.
- **9:16 dividido**: gráficos em cima (0–900 px) e vídeo embaixo numa moldura
  arredondada (≈980×940 em y≈930) com borda brilhante. Posicione o vídeo 16:9
  calculando `left/top` para centralizar o rosto de quem fala; o recorte é
  inevitável no 9:16 — avise o usuário e confira que nenhum rosto é cortado.
- Transição entre modos com `spring`; flash branco curto nas trocas de trecho.

## 4. Ênfase ligada às palavras

Mapeie cada efeito ao tempo exato da palavra (`s` em `words.json`):

- **Negativo** (negação, derrota, "nem chance", "fiquei nervosa"): tela inteira
  em preto e branco (`grayscale` no vídeo e no fundo), mais contraste, bordas
  escurecidas, tremor curto, anel de impacto e carimbo vermelho com glitch.
- **Positivo** (aprovação, nomeação, "valeu a pena"): cores normais, brilho no
  tom de destaque, raios suaves, confete determinístico (`random()` do Remotion).
- Títulos curtos que constroem a frase-chave, palavra riscada quando o falante
  nega, cards com barra que cai, comparação em linhas com ✕/✓, selo (+1 CHANCE).
- **Placeholders temáticos** desenhados em código: folha de respostas sendo
  marcada, lista de aprovados com a linha destacada, "DIÁRIO OFICIAL – NOMEAÇÃO"
  com carimbo, cadeado que fecha no negativo e abre na aprovação, ampulheta.
  Marque como ilustração; não use nomes reais, brasões nem dados inventados.
- **Faixa inferior** (16:9 sem legenda): um caminho da história que se desenha
  com a fala; os marcos acendem em vermelho, dourado ou verde.

## 5. Legendas e emojis — siga a preferência atual

- O usuário pediu as versões mais recentes **sem legenda** e **sem emojis**:
  só placeholders e animações. Se ele pedir legenda, use blocos de até 3–4
  palavras com a palavra-chave destacada e esconda-a quando um título repetir
  a fala.
- Se emojis forem pedidos, use no máximo 2–4 por vídeo, só em momentos-chave;
  ≈20 emojis foi considerado excessivo.

## 6. Implementação

- Crie `app/remotion-project/src/NOME.tsx` e registre a composição em
  `src/Root.tsx` sem alterar as existentes. Receba vídeo e palavras por props;
  não importe arquivos de `public/projects/` (ficam fora do Git e quebram o build).
- Todo movimento vem de `useCurrentFrame`, `spring` e `interpolate`. Não use
  animações CSS. Fontes: `public/fonts/sora-700.ttf` e `manrope-700.ttf`.
- Verifique com `npx eslint src/NOME.tsx src/Root.tsx` e `npx tsc --noEmit -p .`.

## 7. Conferência e entrega

1. Renderize stills de 6–9 momentos-chave (`npx remotion still ... --scale=0.3`),
   monte uma grade e confira rostos, sobreposições e textos cortados. Corrija e
   repita — na prática foram necessárias 1–3 rodadas por versão.
2. Renderize o MP4 em `Renders/TESTES-MOTION/NOME.mp4` (≈2 min para 30 s em CPU).
3. Extraia frames do próprio MP4 para provar o movimento; confira duração e áudio
   com `ffprobe`.
4. Entregue a tabela saída × original × fala, a lista de efeitos e o tempo de
   render. Não afirme ter assistido ou ouvido. Aguarde aprovação explícita antes
   de qualquer exportação final.

Composições de exemplo ficam só na pasta local (os tempos estão fixos na fala de
cada vídeo) e não são publicadas. O prompt reutilizável para outro agente está em
[referencias/prompt-modelo.md](referencias/prompt-modelo.md).

Os parâmetros exatos de cada efeito (springs, envelopes, fórmulas de
enquadramento, confete, placeholders) e o equivalente no After Effects estão em
[referencias/logica-dos-efeitos.md](referencias/logica-dos-efeitos.md).
