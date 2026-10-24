# Podcast Impacto — legendas + câmera (FilmCraft)

Template local do Direção Studio, aprovado pelo usuário em 24/10/2026 numa amostra de 30 s
de um corte de podcast vertical. Versão 1.

## Visual

- **Legendas comuns:** Bebas Neue caixa alta, branca, ~150 px, centrada em Y 1470 (1080×1920).
  Frases que não cabem quebram em linhas empilhadas.
- **Ênfases:** a palavra principal do trecho em Anton amarelo-claro (`#ffe27a`), com o resto em
  Manrope Bold — **sempre em linha própria, acima ou abaixo, nunca ao lado**. No máximo uma a cada 2,5 s.
- **Combinações editoriais** (TIPO-xx do [catálogo](../../../aprendizado/CATALOGO-TIPOGRAFIA-LEGENDAS.md)):
  Manrope + Georgia Bold Italic creme + Sora, nos momentos fortes, definidas por vídeo.
- **Entrada das legendas:** fade de 5 quadros e zoom 70→106→100 % (ênfases 40→116→100 %).
- **Câmera:** abre em zoom-out (125→100 %), zoom de transição em cada corte de câmera (até 128 %),
  push-in lento (até 112 %) nas combinações, punch-in rápido (122 %) em frases escolhidas e saída em
  zoom-in com fade para preto.
- **Trechos negativos em preto e branco** (Tint), com as legendas mantidas coloridas.
- **Zoom seguindo o rosto (opcional):** o centro de todos os zooms acompanha o ponto entre os olhos
  do falante, rastreado no vídeo inteiro. Aprovado também numa versão sem legendas.
- **Sem efeitos de áudio** (eco foi testado e recusado).

Parâmetros completos em [`template.json`](template.json).

## Arquivos

- `scripts/transcrever.py` — transcrição local com faster-whisper (GPU se houver CUDA), palavras com tempo.
- `scripts/planejar.py` — gera o plano (legendas + efeitos) de `palavras.json` + `config.json`.
- `scripts/filmcraft_aplicar.py` — aplica o plano ao vivo no FilmCraft; não exporta.
  Opções: `--sem-legendas`, `--sem-efeitos`, `--rosto=rosto.json` (zoom centrado no rosto).
- `scripts/rastrear_rosto.py` — rastreia o ponto entre os olhos do falante (OpenCV YuNet).
- `exemplo/` — fala **sintética** com `palavras.json` e `config.json` de referência.

## Configuração por vídeo (`config.json`)

| Campo | O que é |
| --- | --- |
| `corrections` | pares `[errado, certo]` para erros da transcrição automática |
| `highlights` | combinações TIPO-xx: `anchor` (palavras exatas da fala), `after` (s), `rows` de `[n_palavras, estilo, px, extra?]`; estilos `m4` `m7` `g` `s`; extra `u` = sublinhado, `r` = detalhe à direita; `"LINE"` = linha divisória |
| `main_words` | palavras candidatas a ênfase em Anton |
| `negative` | trechos em P&B: `[primeiras palavras, últimas palavras, a partir de (s)]` |
| `punch` | frases com punch-in, mesmo formato |
| `cuts` | cortes de câmera (s); detectar com `ffmpeg -i video.mp4 -vf "select='gt(scene,0.3)',showinfo" -an -f null NUL` |

As configurações de vídeos reais ficam fora do Git (ex.: `C:\Users\<usuario>\Videos\FilmCraft\_configs`).

## Aplicação pelo agente

1. Transcreva: `python scripts/transcrever.py VIDEO.mp4 palavras.json`. Revise a fala; não invente frases.
2. Monte `config.json` pelos critérios acima, lendo a transcrição inteira (ideias negativas, perguntas,
   conclusões). Rode `python scripts/planejar.py palavras.json config.json plano.json` e confira o resumo.
3. Abra o FilmCraft com `filmcraft.exe --control 9878`, importe o vídeo (`file.import`), crie a
   sequência 1080×1920 a 30 fps com 8 faixas de vídeo (`file.newSequence`) e coloque o vídeo em V1
   (`timeline.place`). Anote os ids do clipe de vídeo e de áudio.
4. `python scripts/filmcraft_aplicar.py plano.json ID_VIDEO ID_AUDIO`. O usuário acompanha na tela.
5. Exporte uma amostra (`file.exportMedia` com `range: custom`, 0–30 s), confira formato, áudio e
   quadros, e **obtenha aprovação** antes do vídeo completo. A exportação longa ultrapassa o limite
   de 60 s do canal de controle: acompanhe pelo arquivo, sem repetir o comando.

## Zoom seguindo o rosto

1. Baixe uma vez o modelo `face_detection_yunet_2023mar.onnx` do repositório oficial
   [opencv/opencv_zoo](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet)
   para uma pasta fora do Git (ex.: `C:\Users\<usuario>\Apps\modelos`). Requer `opencv-python` 4.8+.
2. `python scripts/rastrear_rosto.py VIDEO.mp4 MODELO.onnx rosto.json --cortes 17.6,96.5`
   (os mesmos cortes do `config.json`). Confira a taxa de detecção impressa e desenhe o ponto em
   alguns quadros antes de aplicar: o rastreador recomeça em cada corte e segue o rosto mais próximo.
3. `python scripts/filmcraft_aplicar.py plano.json ID_VIDEO ID_AUDIO --rosto=rosto.json`
   (acrescente `--sem-legendas` para a versão só com câmera). Âncora e posição do clipe recebem
   keyframes a cada 0,3 s com o ponto rastreado; em 100 % o quadro não se move, e nos zooms o rosto
   fica no lugar.

O modelo clássico do EffectCraft não encontrou rostos de perfil com barba e óculos; o YuNet
detectou 100 % das amostras no vídeo de referência.

Limitações conhecidas (FilmCraft 0.12): o canal de controle não lista a timeline; guarde os ids
retornados. `graphics.set` com `time` não cria keyframe — anime por `effects.setParam` com
`keyframe: true` e tempo absoluto da sequência. Ajuste `motion/anchor` junto com a posição para que
o zoom não desloque o texto.
