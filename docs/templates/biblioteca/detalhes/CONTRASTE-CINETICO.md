> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Contraste Cinético — 9:16

Referência: Pin 15551561209923797. A composição é `MotionContrasteCinetico`, em 1080×1920 a 30 fps, sobre um corte com fala. O primeiro uso foi no vídeo 16, corte 05 do exemplo C. A **v2 completa** (10/10/2026) aguarda revisão; ainda não é uma direção aprovada.

## Estrutura pedida na v2

O apresentador fica em tela cheia só nos primeiros cerca de 5 s, com legenda cinética. Daí em diante há sempre animação na tela. Ele volta apenas em picture-in-picture (objeto `pip`) dentro de cenas específicas e nunca aparece sozinho. O vídeo termina com o logotipo do sua marca (objeto `logo`), em uma cena de cerca de 2 s depois do fim da fala. Na v2, 93% do tempo é Motion, com 17 cenas encadeadas sem intervalo. As cenas que vêm depois de uma íris usam `enter: reveal`.

## Revisão v3 (pedido do usuário)

- **PIP quase contínuo:** o usuário gostou do exemplo C em PIP e pediu que ele ficasse quase sempre na tela. Na v3, 16 das 17 cenas têm `pip`; a única sem PIP é o encerramento com o logotipo. O padrão é um círculo de cerca de 400–470 px no terço inferior, alternando direita e esquerda. Sobre a figura em meio-tom vai um círculo de 300 px no canto superior direito. Objetos e cards sobem para abrir espaço.
- **Paleta do logotipo sua marca:** turquesa `#00d4bc` (`accent`), azul-marinho `#0b1270` (`ink`/`navy`) e branco.
  - Noite: fundo `#03051a`, texto branco e destaque turquesa com brilho.
  - Papel: texto marinho e destaque marinho com sombra turquesa deslocada, como as letras do logo.
  - Com `navy` ausente, volta o destaque de cor única da referência (vermelho `#e3172d`).

## Linguagem

- **Fala real em 9:16:** recorte fixo pelo rosto (`speakerX`), leve dessaturação e legenda cinética grande no peito (`captionY`). Os destaques da legenda saem em vermelho.
- **Cena papel:** fundo creme, grade só ao redor do texto, arco cinza opcional (`arc`) e decoração com código de barras e marca (`deco`).
- **Cena noite:** fundo preto com vinheta, texto branco com brilho e destaque vermelho com glow.
- **Palavras:** entram no tempo real da fala. O bloco se recentraliza a cada linha. `*palavra*` vira destaque.
- **Transições:**
  - Entrada (`enter`): `white` (sai de um clarão branco), `fade`, `reveal` (íris abrindo) ou corte.
  - Saída (`exit`): `iris` (círculo preto e depois reabertura sobre a fala), `tilt` (inclina, desfoca e revela a fala), `dip` (escurece para cinza), `circle` (círculo rosa), `flash` ou corte.
  - `shakeAt` adiciona tremores curtos nos impactos.

## Objetos (`objects`)

Todos os objetos têm `at`/`until`, posição `x`/`y` (centro, no quadro 1080×1920), `size` e `rot`.

| `kind` | Uso | Campos |
|---|---|---|
| `gabarito` | cartão-resposta que preenche, rasga e se recompõe | `fillAt` (999 = vazio), `tearAt`, `tearAmount` (0–1), `mendAt` |
| `pin` | card com alfinete que cai e balança | `title`, `tone` (`gray`/`paper`), `items[{at,text,mark:check\|x\|dot}]` |
| `persona` | figura de terno em meio-tom com cabeça-balão | `head` (linhas com a mesma sintaxe, `size` ≈ 1–2) |
| `rank` | número com louros e glow | `text` (padrão `9º`) |
| `crowd` | multidão simbólica com um ponto vermelho | `highlightAt`. Não representa contagem real |
| `stamp` | carimbo com textura de tinta | `text` |
| `png` | asset transparente | `src` (relativo a `public/`), `negative`, `write` (balança como se estivesse escrevendo; usado na caneta) |
| `pip` | apresentador em moldura arredondada ou círculo, recortado no rosto | `h`, `shape` (`round`/`circle`), `zoom` (1,6 arredondado / 1,9 círculo), `fx`/`fy` (rosto no quadro de origem). O preparador preenche `src` com o vídeo |
| `logo` | logotipo com mola, anéis de brilho e pulsação | `src` (ex.: `motion-assets/marca/logo.png`) |

SVGs estáticos dos objetos estão em `assets/contraste-cinetico/`. PNGs gerados ficam em `motion/remotion/public/motion-assets/contraste-cinetico/`, com as opções descartadas em `variacoes/`.

## Sintaxe das linhas

`{"text": "saiu *derrotado*", "after": 7.4, "until": 9.0, "align": "left", "dx": 40, "size": 1.0}`

- O tempo de cada palavra vem da transcrição por palavra (`palavras-corte.json`). A busca começa em `after`, ou logo depois da linha anterior.
- `palavra@12.3` força o tempo de uma palavra.
- `until` retira a linha e permite trocar o texto dentro da mesma cena.
- `corrections` corrige erros do Whisper na exibição (ex.: `arrasgar` → `rasgar`).
- `hideCaptions` esconde trechos ininteligíveis.
- Cada palavra de destaque dá um soco de zoom curto (+4%) na cena inteira, o que deixa o ritmo mais dinâmico.
- Uma cena que termina depois do fim do vídeo, como a do logotipo, aumenta a duração. O vídeo de base para no fim real (`videoEnd`).

Com a fonte padrão (90/160 px), mantenha cada linha com até cerca de 1000 px. Um destaque de 9 letras mais 2 palavras curtas já chega perto do limite. Divida a linha em vez de reduzir demais o texto.

## Passo a passo

1. Copie contraste-cinetico.template.json para `PASTA_DO_VIDEO/MOTION/CONTRASTE-CINETICO/template-v1.json`. Gere `palavras-corte.json` com a transcrição por palavra em tempos do corte.
2. Monte as cenas com intervalos baseados na fala real. Uma proporção de 55 a 65% de Motion funcionou neste corte.
3. Prepare: `python scripts/biblioteca_motion.py contraste "…/template-v1.json"`. O script cria `render-public/` (vídeo, áudio, fontes Arial do Windows e PNGs) e `props-…-previa.json`, e avisa quando alguma palavra não foi encontrada.
4. Para gerar stills, rode em `motion/remotion`: `node contraste-render.cjs PASTA props-….json qa.mp4 --stills=1.6,7.0 --only-stills`.
5. Para a prévia com áudio: `… --render`. Para o vídeo completo, somente após aprovação explícita: `… --render --full`.
