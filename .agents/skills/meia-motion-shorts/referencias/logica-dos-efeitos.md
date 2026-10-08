# Lógica dos efeitos — Remotion e equivalente no After Effects

Especificação dos efeitos usados nos shorts de 08/10/2026, com os parâmetros reais
do código. Serve para reproduzir o mesmo resultado em outro vídeo, em Remotion ou
pelo After Effects (manualmente ou por um MCP do After Effects).

Convenções: 30 fps; `t` = segundos da saída; `f` = frame; `at` = início do efeito
em segundos = `s` da palavra-gatilho em `words.json`. "Spring d/k" significa
`spring({damping: d, stiffness: k})` do Remotion, sempre com massa 1.

> Os equivalentes em After Effects usam efeitos nativos e expressões padrão
> (JavaScript engine). Eles não foram testados num MCP do After Effects nesta
> sessão: confira os nomes de efeitos e propriedades na versão instalada, que
> também podem variar com o idioma da interface.

---

## 0. Modelo de dados (o que o agente monta antes de animar)

Tudo nasce da fala. Monte este JSON antes de escrever qualquer animação:

```json
{
  "fps": 30, "width": 1080, "height": 1920,
  "cuts": [3.70, 8.43, 23.25, 25.30],
  "faces": {"camA": {"fx": 0.30, "fy": 0.25}, "camB": {"fx": 0.50, "fy": 0.25}},
  "shots": [
    {"t": 0.00, "mode": "full",  "zoom": 1.00, "fx": 0.30, "fy": 0.25},
    {"t": 1.00, "mode": "full",  "zoom": 1.28, "fx": 0.30, "fy": 0.24, "word": "técnico"},
    {"t": 3.70, "mode": "frame", "zoom": 1.00, "fx": 0.30, "fy": 0.25}
  ],
  "mood": {
    "neg": [[6.57, 8.30, "nem chance"], [19.35, 20.25, "não estaria aqui"]],
    "pos": [[16.53, 17.40, "+1 chance"], [24.79, 25.30, "nomeado"]]
  },
  "effects": [
    {"type": "title",   "at": 15.33, "until": 17.45, "lines": ["CADA PROVA", "É UMA PROVA"]},
    {"type": "stamp",   "at": 6.57,  "text": "NEM CHANCE", "tone": "neg"},
    {"type": "strike",  "at": 10.73, "target": "MAIS FÁCIL?"},
    {"type": "gazette", "at": 24.79}
  ]
}
```

Regras:
- `cuts` = fronteiras entre trechos na saída (soma das durações anteriores).
- `faces` vem da grade de frames; um registro por câmera.
- Cada `shot`, `mood` e `effect` cita a palavra que o dispara. Sem palavra, não entra.
- Negativo = negação, perda, medo ("nem chance", "não deu", "fiquei nervosa").
  Positivo = conquista, alívio ("nomeado", "valeu a pena", "+1 chance").

---

## 1. Enquadramento

### 1.1 Corte seco de aproximação ("cortes de imagem")
- **Lógica:** em cada `shot` de modo `full`, a escala do vídeo **pula** para `zoom`
  no frame exato, sem interpolação, como uma troca de câmera. A origem da escala é o
  rosto: `transformOrigin = (fx·100%, fy·100%)`.
- **Valores:** 1.15–1.32 nas palavras-chave; volta a 1.0 no próximo shot.
- **After Effects:** keyframes de Scale com interpolação **Hold** (Ctrl+Alt+H);
  Anchor Point no rosto, com Position compensada para o quadro não "pular" de lugar.

### 1.2 Moldura lateral 16:9 sem recorte
- **Lógica:** fator `s` de 0 (tela cheia) a 1 (moldura), dado por spring 18/120
  disparado no `t` do shot. Os retângulos são interpolados linearmente por `s`:
  - x: 0→70 · y: 0→150 · largura: 1920→1110 · altura: 1080→624 (mantém 16:9);
  - perspectiva: `rotateY(4°·s)`, origem na borda esquerda, `perspective 2200px`;
  - chanfro: `clip-path` octogonal com cantos de `34·s` px;
  - contorno duplo: polígono dourado de 3 px mais um externo branco a 25%, 12 px fora, com opacidade `s`;
  - sombra: `drop-shadow(0 30px 50px rgba(0,0,0,0.7·s))`.
- O vídeo inteiro fica dentro da moldura; nada é recortado.
- **After Effects:** pré-composição do vídeo; Scale e Position com keyframes e
  easing de mola (expressão 9.1); máscara com cantos chanfrados (Pen) no
  pré-comp; layer 3D com Y Rotation 4° e câmera de 50 mm; Stroke duplicado com
  Offset Paths para o contorno; Drop Shadow com Distance 30 e Softness 50.

### 1.3 Moldura 9:16 dividida
- **Lógica:** mesmo `s`. Retângulo de (0,0,1080,1920) para (50,930,980,940),
  com raio `44·s` e borda `0 0 0 4s px` verde-água mais brilho `0 0 60s px`.
- **Centralizar o rosto num vídeo 16:9 dentro de qualquer caixa (w, h):**
  ```
  vh = h · zoom ;  vw = vh · 16/9
  left = clamp( w/2 − fx·vw , w − vw , 0 )
  top  = clamp( h·0.42 − fy·vh , h − vh , 0 )
  ```
  O 0.42 coloca os olhos um pouco acima do centro. O `clamp` impede borda preta.
- **After Effects:** o vídeo dentro de um pré-comp do tamanho da caixa, com
  Position calculada pela mesma fórmula numa expressão que lê `fx` e `fy` de Sliders.

### 1.4 Flash de corte
- **Lógica:** em cada `cuts[i]`, uma camada branca sobre o vídeo com opacidade de
  0.55 até 0 em 7 frames, linear (0.6 em 6 frames no 9:16).
- **After Effects:** Solid branco, Opacity 55→0 % em 7 frames, logo acima do vídeo.

---

## 2. Humor: negativo × positivo

### 2.1 Envelope de intensidade
Para cada janela `[a, b]`:
```
env(t) = 0                       se t < a
       = (t − a) / 0.12          se a ≤ t < a+0.12     (ataque de 4 frames)
       = 1                       se a+0.12 ≤ t < b−0.2
       = max(0, (b − t) / 0.2)   se t ≥ b−0.2          (saída de 6 frames)
neg(t) = max das janelas negativas ;  pos(t) = max das positivas
```
**After Effects:** um Slider "neg" e um "pos" num layer de controle, com
keyframes lineares em a, a+0.12, b−0.2 e b (0 → 100 → 100 → 0). Os efeitos abaixo
leem esses Sliders.

### 2.2 Negativo: preto e branco
- **Lógica:** no vídeo e no fundo, `grayscale(neg)` e `contrast(1 + 0.25·neg)`.
  Vinheta preta: gradiente radial transparente até 45%, chegando a `#000000dd` em
  120%, com opacidade `neg`. Só o vermelho dos carimbos fica colorido, porque eles
  ficam fora do filtro.
- **After Effects:** Adjustment Layer abaixo dos gráficos vermelhos com
  `Black & White` (ou Hue/Saturation com Master Saturation −100) e Opacity
  ligada ao Slider: `effect("neg")("Slider")`. Curves para o contraste. Vinheta
  com Solid preto, máscara elíptica invertida e Feather alto.

### 2.3 Negativo: tremor
- **Lógica:** em cada início negativo `a`, durante 14 frames, `hit = 1 − d/14`
  (d = frames desde `a`):
  `x = sin(f·2.7)·16·hit ;  y = cos(f·3.3)·10·hit`, aplicado à cena inteira.
  No 9:16: 14 e 9 px.
- **After Effects (Position de um Null pai de tudo):**
  ```js
  a = thisComp.layer("CTRL").effect("negStart")("Slider"); // segundos
  d = (time - a) * 30;
  hit = (d >= 0 && d < 14) ? 1 - d/14 : 0;
  f = time * 30;
  value + [Math.sin(f*2.7)*16*hit, Math.cos(f*3.3)*10*hit];
  ```
  Para vários inícios, use um marcador por gatilho e pegue o mais recente.

### 2.4 Negativo: anel de impacto
- **Lógica:** dois anéis, o segundo 0.12 s depois. Para cada um, com `k = t − at − atraso`:
  escala `1 + 70k` (de 10 px de diâmetro), borda `max(1, 10 − 14k)` px vermelha,
  opacidade `1 − 1.6k`. O efeito some em 1.6 s.
- **After Effects:** Ellipse com Stroke vermelho, Scale de 0→7000 % em ≈1 s
  (ease-out), Stroke Width 10→1 e Opacity 100→0; duplicar com 4 frames de atraso.

### 2.5 Negativo: carimbo com glitch
- **Lógica:** spring 9/260; `scale = 2.2 − 1.2p`, `rotate −7°`, opacidade
  `min(1, 2p)`, borda de 6 px. Nos primeiros 12 frames, deslocamento
  `g = ((f mod 3) − 1)·9` px e duas cópias, ciano `#00e5ff` e magenta `#ff00aa`, a
  ±10 px com opacidade 0.6 (separação RGB). Use `white-space: nowrap` para as cópias
  quebrarem igual.
- **After Effects:** texto com Scale 220→100 % e easing de mola (9.1);
  efeito `Shift Channels` ou duas cópias tingidas com `Tint` e Blending Screen,
  com Position `wiggle(30, 10)` só nos primeiros 12 frames (Opacity em Hold).

### 2.6 Positivo: cor e brilho
- **Lógica:** `saturate(1 + 0.15·pos)`, `brightness(1 + 0.06·pos)`, e zoom do
  vídeo multiplicado por `1 + 0.05·pos`. Em 16:9, gradientes radiais dourado e
  verde em modo `screen` com opacidade `pos`. Em 9:16, o brilho é verde-água.
- **After Effects:** Adjustment Layer com `Vibrance`/`Hue/Saturation` e `Exposure`
  ligados ao Slider "pos"; Solid com Gradient Ramp radial em Screen.

### 2.7 Positivo: raios
- **Lógica:** `repeating-conic-gradient` com 6° coloridos e 14° vazios, girando
  `1.2°/frame`, centrado em (78%, 40%), com máscara radial e opacidade `0.5·pos`.
- **After Effects:** efeito `CC Light Rays` ou Shape com Repeater (18 cópias,
  Rotation 20°) girando `time*36` graus, com Blending Screen e máscara feather.

### 2.8 Positivo: confete
- **Lógica:** 46–50 partículas de 14×8 px, cores do tema. Para a partícula i:
  ```
  a = random("a"+at+i)·2π ;  v = 380 + random("v"+at+i)·650   (px/s)
  x = x0 + cos(a)·v·t ;  y = y0 + sin(a)·v·t + 900·t²          (gravidade)
  rot = t·720·(random("r"+at+i) − 0.5) ;  opacidade = 1 − t/1.6 ;  vida 1.6 s
  ```
  A semente fixa deixa o resultado igual em todo render.
- **After Effects:** `CC Particle Systems II` (Birth Rate alto por 2 frames,
  Velocity ≈1.5, Gravity ≈0.9, Longevity 1.6, Particle Type Square) ou
  `CC Particle World`. Em Particular, use Emitter Explode com Physics Gravity.

---

## 3. Texto e cards

### 3.1 Entrada padrão (Pop)
- **Lógica:** spring 14/170 a partir de `at`. Opacidade `min(1, 1.6p)`. A direção é:
  - `up`: translateY `(1−p)·60` px;
  - `right`: translateX `(1−p)·140` px;
  - `scale`: `0.4 + 0.6p`.
  Saída: opacidade 1→0 nos 6 frames antes de `until`.
- **Títulos 9:16:** spring 11/220, escala `0.6 + 0.4p` por linha. Cada linha pode
  ter o próprio `at`, ligado à palavra que a pessoa diz.
- **After Effects:** preset de Position/Scale com a expressão de mola 9.1
  (freq 2.5, decay 6 equivale a ~14/170); Opacity com dois keyframes.

### 3.2 Risco de negação
- **Lógica:** barra de 12–14 px vermelha, `rotate −4°/−5°`, largura de 0→104% do
  texto em 7–8 frames, com ease `cubic-bezier(.2,.8,.2,1)`. Gatilho: a palavra que
  nega ("ou", "não").
- **After Effects:** Shape Line com `Trim Paths` End 0→100 % em 8 frames, com
  Easy Ease Out forte.

### 3.3 Barra que cai
- **Lógica:** cresce de 0→72% em 18 frames (ease acima), muda de dourado para
  vermelho no gatilho negativo e cai até 4% em 14 frames.
- **After Effects:** retângulo com Scale X por keyframes; Fill trocando em Hold no gatilho.

### 3.4 Comparação ✕ / ✓
- **Lógica:** a linha entra da direita (Pop `right`). O resultado começa apagado,
  com opacidade 0.25 e escala 0.9. No gatilho, spring 10/220: escala `0.6 + 0.4p`,
  borda e fundo ganham a cor (vermelho no ✕, verde no ✓, fundo a 12%).
- **After Effects:** dois estados com Opacity e Scale em keyframes; Fill e Stroke
  da caixa em Hold no gatilho.

### 3.5 Selo (+1 CHANCE)
- **Lógica:** spring 8/260 em `scale`, em pílula sólida verde.
- **After Effects:** Scale 0→100 % com a mola 9.1 (overshoot maior).

---

## 4. Placeholders temáticos (desenhados em código)

| Elemento | Lógica | After Effects |
|---|---|---|
| **Cadeado** | SVG. No negativo: corpo fica vermelho e treme `sin(f·2.5)·14·(1−d/14)` por 14 frames. Ao abrir (positivo): spring 9/160, a alça sobe `(40·p, −36·p)` e gira `−18°·p`, e o corpo fica verde. | Shapes; alça com Position/Rotation e mola; cor do corpo em Hold. |
| **Pessoas** | 3 bonecos (círculo + meia-elipse) com entrada escalonada nas palavras; spring 10/200; `translateY (1−p)·80`, `scale 0.5+0.5p`. | 3 shapes com offset de keyframes (Sequence Layers). |
| **Folha de respostas** | Cartão entra com spring 14/160: `translateY (1−p)·200`, `rotate −4° + (1−p)·10°`. Seis linhas de A–E. Uma bolinha é marcada por linha a cada 0.28 s, com spring 8/300. No gatilho negativo, as linhas ímpares ficam vermelhas. | Cartão em shape; bolinhas com Opacity e Scale em sequência; Fill em Hold vermelho. |
| **Lista de aprovados** | Linhas cinza; a linha da pessoa acende em destaque com ✓ na palavra "aprovados". Nomes genéricos ("NOME 01"). | Linhas shape; Fill e Scale na linha alvo. |
| **Diário Oficial – Nomeação** | Página entra da direita com spring 12/200 (`translateX (1−p)·400`, `rotate 6°`). Carimbo ✓ 0.25 s depois, com spring 8/300 e `scale 2 − p`. Rotulado como ilustração, sem brasão nem nomes. | Pré-comp da página; carimbo com Scale 200→100 % e mola. |
| **Ampulheta** | Gira de −180°→0° nos primeiros 15% do tempo com `Easing.out(back(1.6))`. A areia de cima diminui e a de baixo cresce em 2.2 s, linear, com um filete visível no meio. | Rotation com overshoot; máscaras das areias com Path keyframes. |
| **Caminho da história (16:9)** | Curva `y = 985 + sin(x·4π)·26`, x de 80 a 1840 px. Fundo pontilhado. O traço dourado é desenhado até `prog(t)`, interpolado nos tempos dos marcos com `Easing.inOut(cubic)`. O ponto móvel fica vermelho em `neg`, verde em `pos` e dourado no resto. Cada marco acende com spring 10/200 e emite um anel que se repete a cada 30 frames. | Path com `Trim Paths` End seguindo os marcos; o ponto acompanha via `Auto-Orient`/expressão `pointOnPath`; anéis com expressão `loopOut()`. |

---

## 5. Fundo e moldura do 9:16
- **Grade:** linhas de 1 px no tom de destaque a 7% de opacidade, com passo de 54–60
  px, deslizando 0.4–0.5 px por frame.
- **Brilho:** gradiente radial que orbita, `x = 1500 + sin(f/70)·160`,
  `y = 380 + cos(f/90)·120` (16:9) ou `y = 380 + sin(f/50)·60` (9:16).
- **Pílula da cena:** troca o texto a cada bloco narrativo (A EXPECTATIVA, A
  VIRADA, A LIÇÃO). Cada cena entra com spring 16/150 e sobe 40 px.
- **After Effects:** `Grid` com Position animada por `time*15`; Gradient Ramp
  radial com Position em expressão `[1500 + Math.sin(time*30/70)*160, ...]`.

---

## 6. Regras de posição e colisão
1. Nenhum texto, ícone ou card sobre rosto, inclusive de quem só escuta. Confira a grade de frames.
2. Em tela cheia, os textos ficam na metade inferior, sobre o corpo ou a mesa, e
   acima da faixa reservada (≈y > 820 em 1080p; ≈1180–1600 em 9:16).
3. Nada encosta nas bordas: margem mínima de 40 px, e `nowrap` só se couber.
4. Um título grande por vez. Sem legenda e sem emojis por padrão (preferência atual).
5. Saída de cada elemento em 6 frames, antes do próximo corte.

---

## 7. Mola usada no After Effects
Equivalente aproximado do `spring` do Remotion, aplicado a Scale ou Position
entre dois keyframes:

```js
// Mola amortecida após o último keyframe ("overshoot")
freq = 2.5;   // ~ stiffness: 2.0 (120) · 2.5 (170) · 3.0 (220–260)
decay = 6.0;  // ~ damping:   4 (8–9, mais elástica) · 6 (13–14) · 8 (18, sem quique)
n = 0;
if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }
if (n == 0) { value; } else {
  t = time - key(n).time;
  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);
  value + v * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t) / (freq * 2 * Math.PI);
}
```
A correspondência com damping e stiffness é aproximada. Confira com um render de
teste lado a lado.

---

## 8. Prompt para o Codex

```text
Responda em português. Projeto "Direção Studio" ([PASTA]). Leia CLAUDE.md e a skill
.agents/skills/meia-motion-shorts (SKILL.md e referencias/logica-dos-efeitos.md).

Vídeo: [projetos/ID/brutos/original.mp4]; transcrição por palavra:
[projetos/ID/edit/transcricao-original.json]. Não altere brutos/.

1. Escolha 3–5 trechos (~30 s) com expectativa → virada → conclusão. Gere cut.mp4,
   words.json e props.json em app/remotion-project/public/projects/[nome]/.
2. Extraia uma grade de frames e preencha "faces". Monte o JSON da seção 0
   (cuts, shots, mood neg/pos, effects), com a palavra-gatilho de cada item. Mostre
   a tabela saída × original × fala e a lista de gatilhos antes de animar.
3. Implemente em src/[Nome].tsx [9:16 | 16:9], usando exatamente as lógicas e os
   valores das seções 1–5 (springs, envelopes, fórmulas de enquadramento, P&B,
   tremor, anel, carimbo com glitch, confete, risco, barra, ✕/✓, placeholders).
   SEM legenda e SEM emojis. Animações só por useCurrentFrame/spring/interpolate;
   aleatoriedade só com random(seed). Props por --props; não importe public/projects.
4. Registre em Root.tsx sem mexer nas outras composições. eslint e tsc sem erros.
5. Stills de 6–9 gatilhos com grade; corrija colisões (seção 6). Render em
   Renders/TESTES-MOTION/[nome].mp4, frames extraídos do MP4 e ffprobe.
[Se for After Effects via MCP: reproduza a mesma estrutura com o layer CTRL
 (Sliders neg/pos), as expressões das seções 2.3 e 7 e os efeitos indicados;
 renderize um teste e confira os mesmos frames.]
Não afirme ter assistido ou ouvido. Não aprove nem exporte sem a minha aprovação.
```
