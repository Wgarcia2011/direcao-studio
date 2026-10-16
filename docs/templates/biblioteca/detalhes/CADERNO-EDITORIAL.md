> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Caderno Editorial — 9:16

Composição `MotionCadernoEditorial` (`motion/remotion/src/biblioteca/MotionCadernoEditorial.tsx`), 1080×1920, 30 fps.
Template. Primeiro uso: exemplo A 17.01 (09/10/2026). Teste de 60 s aprovado pelo usuário para gerar a versão completa (142,4 s, 9:16).

Fala real em tela cheia alternada com blocos longos de motion desenhados numa página de caderno. A tipografia vem do
Editorial Artístico; as ilustrações usam técnicas do estilo *sketchbook* do Animate, portadas para SVG/React.

## Estrutura

- **Abertura**: quem fala em tela cheia, com zoom lento a partir do rosto (`faceY`, `punchTimes`) e rotação mínima.
- **Entrada de bloco** (`photoIn`): o próprio vídeo encolhe em 0,75 s e vira uma foto com borda de papel e fita, colada na
  página. A câmera passa a percorrer a página e a foto sai de cena com ela. É o elemento que conecta vídeo e motion.
- **Dentro do bloco**: a câmera (`scenes[].cam`: x, y, zoom, rotação) desliza entre desenhos da mesma página em 0,95 s,
  com deriva de zoom lenta. Os desenhos anteriores continuam no papel; um recuo (`z` ≈ 0,55) mostra o percurso inteiro.
  Estrelas e um avião de papel ficam numa camada de paralaxe (0,62 da câmera). PNGs com `depth` < 1 também fazem paralaxe.
- **Saída de bloco** (`photoOut`): a foto reaparece colada noutro ponto da página e cresce até a tela cheia. Sem `photoOut`,
  o bloco termina na página (útil no fim do vídeo).
- **Legendas**: grupos de sentido de até 9 palavras/3,3 s, no máximo 3 linhas. Serifada itálica (EditorialSerif) nos apoios;
  Manrope 700 nas `phrases`/`keywords`, com marca-texto turquesa que corre conforme cada palavra é dita. A linha entra inteira
  e centralizada; palavras ainda não ditas ficam esmaecidas. Na página o texto é azul-marinho; no vídeo, branco com sombra e
  destaque marinho sobre turquesa. Posição: `captionTop.video` / `captionTop.page`.

## Desenhos em código (`art`)

Coordenadas locais −500..500, escaladas por `size`. Cada desenho entra a lápis (grafite), recebe tinta e depois cor.

| art | Uso | Eventos |
|---|---|---|
| `path` | subida até um ponto alto (cume local 330,−330) | `loop` circula o cume |
| `tangle` | nervosismo: emaranhado de grafite, batimento, suor | `calm` acalma a linha; `cross` risca |
| `answerCard` | cartão-resposta com bolinhas A–E (`rows`, `label`) | `mark`, `wrong` (laço vermelho), `erase` (borracha, rasura, farelos) |
| `clock` | relógio desenhado | `hands` {h}, `label` {text}, `calm` (anéis de respiração) |
| `door` | porta com rótulo (`label`) | `arrow` entra pela porta |
| `phone` | celular com tela | `cards` empilha resumos; `scroll` rola |
| `checklist` | caixas e linhas (`rows`) | `check` {row} |
| `arrow` | seta a lápis entre cenas (`bend`, `rot`) | — |
| `loop` | laço de anotação turquesa | — |
| `essay` | folha pautada com título (`label`), `rows` linhas | `write` escreve as linhas com o lápis |
| `note` | anotação à mão com sublinhado (`label`, texto da fala) | — |

PNG (`type: "png"`): laço de construção a lápis antes de entrar, mola, rotação lenta, aproximação e mancha de grafite como
sombra. Campos: `src`, `size`, `rot`, `spin`, `depth`, `filter`, `tape`, `until`.
Ligue cada desenho a uma palavra real; não escreva rótulos, números ou resultados que a fala não diz.

## Técnicas vindas do Animate

Fonte: https://github.com/cth9191/animate, commit `7e5eb56` (05/10/2026), estilo `styles/sketchbook` (STYLE.md, kit.js e
demo lidos). Portado em `motion/remotion/src/biblioteca/sketch/sketchKit.tsx`, com o aviso de copyright e a licença MIT no arquivo:

- RNG com semente (`mulberry32`/`hash`), `resample`, `subPath`/`writeOn`, suavização `trace`.
- **Boil em 2s**: tremor ao longo da normal (`gwob`) com fases reamostradas a cada 2 quadros; a estrutura fica fixa pela chave.
- **Duas canetas**: `gline` (tinta com segunda passada) e `gpencil` (grafite em duas passadas); ordem lápis → tinta → cor.
- `loopPts` (laço que passa do início), `sketchBox`, `gfill` (cor fora do registro), `scribbleFill` (cor em rabisco),
  `ghatch` (hachura), emaranhado de grafite, lápis e borracha que acompanham o traço, letreiro à mão por letra.
- Página: papel, pontilhado, manchas, anel de café e bordas das folhas (adaptação simplificada de `sketchPage`); câmera que
  percorre a página em vez de cortar.

Adaptações nossas (não vêm do Animate): paleta da marca no lugar de terracota/amarelo, legendas tipográficas do Editorial
Artístico, PNGs fotográficos do projeto, foto do vídeo colada na página, eventos ligados à fala. O motor `morph.js` não foi
portado; a continuidade entre cenas é feita pela câmera, setas e pela foto. Mudança no kit: `sketchBox` fecha a borda superior.

## Paleta (`sketchPalette`)

Papel `#f5f0e6`; tinta `#0d1660`; grafite `#6f6a63`; turquesa da marca `#00d0b8` (preenchimento e marca-texto); turquesa
escuro `#00897b` (traços sobre papel); vermelho `#e0483a` apenas para um erro por cena. Texto da legenda `#000068`.

## Passo a passo

1. Copie o modelo para `PASTA_DO_VIDEO/MOTION/template-caderno-v1.json`; ajuste `slug`, `source`, `transcript`, `output`.
2. Escolha os trechos pela transcrição com tempos; corte em vales de silêncio (meça a energia) e confira as bordas com uma
   segunda transcrição local. Palavras de duração zero ou desalinhadas devem ser corrigidas numa transcrição revisada do vídeo.
3. Meça o rosto em quadros reais: `x = (centro_x × 3413 − 540) / 2333` para fonte 1920×1080; `faceY` = altura do rosto.
4. Monte `sketchBlocks` com os desenhos ligados às palavras. Mantenha desenhos acima de y≈1300 na tela (legendas abaixo).
5. Rode, na raiz:

```bash
python scripts/biblioteca_motion.py preparar "PASTA/MOTION/template-caderno-v1.json"
python scripts/mixar-sfx.py SLUG
```

6. Gere quadros parados, depois a prévia com áudio. Exemplo de script de render (temporários no D:):
   `PASTA-DA-EDICAO`.
7. Verifique formato, decodificação, nível dos efeitos (8–12 dB abaixo da voz local), re-transcrição da saída e quadros.
   Exemplo: `.../MOTION/qa/verificar-v1.py`. Aguarde aprovação explícita antes de versões maiores.

## Limites conhecidos

- O "boil" é por quadro; em quadros parados o tremor não aparece. Confira o movimento no MP4.
- Palavras ainda não ditas ficam esmaecidas na linha; confira se o efeito agrada em celular.
- Os PNGs do projeto são fotográficos; misturá-los ao traço desenhado é intencional, mas convém revisar o contraste.
- A foto colada mostra o vídeo vivo; posicione `photoIn/photoOut` longe de desenhos e legendas. `photoOut` igual a `photoIn`
  mantém a foto colada durante blocos curtos.
- Em vídeos com troca de câmera (ex.: pergunta do entrevistador), use vários `speakerShots` por trecho; meça cada câmera.
- Em panorâmicas longas, PNGs com `depth` baixo podem cruzar a área da legenda; prefira `depth` ≥ 0,9 perto da borda inferior.
- A medição dos efeitos depende do caminho de codificação do áudio; meça no MP4 final e recalibre os ganhos, se preciso.
- Proporção 70/30 entre motion e pessoa pertence ao briefing da exemplo A 17.01, não é regra do modelo.
