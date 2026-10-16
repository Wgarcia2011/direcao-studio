> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Túnel Narrativo — 9:16

Composição `MotionTunelNarrativo` (`motion/remotion/src/biblioteca/MotionTunelNarrativo.tsx`), 1080×1920, 30 fps.
Primeiro uso aprovado: 10.02 exemplo C, v10 (09/10/2026). Template.

## Estrutura

Fala real → túnel → fala → túnel → fala → encerramento com a marca. Na v10 aprovada, o túnel ocupou cerca de 76% da fala,
com trechos curtos de fala real no início, no meio e no fim. Os tempos do modelo são ilustrativos: refaça tudo pela transcrição real.

- **Entrada do túnel:** 0,25 s antes, o vídeo é puxado com zoom e desfoque. Depois vira um cartão que recua para o fundo do túnel.
- **Dentro do túnel:**
  - Anéis na cor `accent` e em branco giram e avançam em direção à câmera.
  - Nas paredes passam os PNGs de `tunnelAssets`, formas desenhadas em código e partículas.
  - A câmera gira de leve. A velocidade base é 825 px/s (já reduzida em 25%) e há um avanço a cada troca de momento.
- **Falante recortado:** sobe da parte de baixo da tela, com contorno de adesivo e brilho que pulsa a cada palavra, e uma órbita de 6 assets ao redor.
- **Momentos (`beats`):** a arte da narração vem do fundo com efeito de mola, gira e, antes do momento seguinte, passa pela câmera.
- **Saída:** linhas de velocidade e o vídeo volta voando do centro do túnel até ocupar a tela inteira.
- **Legendas:** frases com itálico serifado e sans em negrito, como no Editorial Artístico. No túnel ficam no topo; na fala, na altura do peito.
- **Encerramento** (`outro`, depois do fim do corte): os anéis aceleram, `src` atravessa a câmera e o logo chega com clarão e confete. Em seguida aparecem `small`/`big` e o nome da marca (`brandName`).

## Campos do template

Todos os tempos são em segundos do arquivo de origem, convertidos pelo preparador. `"end"` é o fim do corte; `"end+0.6"`, 0,6 s depois dele.

| Campo | Uso |
|---|---|
| `tunnels[]` | `{from, to, beats[]}`. Fora de um túnel aparece a fala real. |
| `beats[]` | `{at, kind, ...}`, com `kind` igual a `png` (com `src`), `photo` (foto em cartão) ou `code` (com `code`). Opcionais: `fx` (`shake` para clarão e tremor; `speed` para túnel acelerado), `keepColor` (mantém a cor original do PNG, por exemplo o X vermelho) e `markAt` (segundo marco do momento; o ônibus cresce nele). |
| `code` | `question`, `clash` (balões brigando), `smile`, `laugh` (HA HA), `bus`, `blocks` (quatro quadras até PROVA), `clock`, `wires` (fios com faíscas), `suitcase`. Os desenhos estão em `CodeArt`. Para outro tema, adicione um desenho novo em vez de forçar um que não combine com a fala. |
| `tunnelAssets` | PNGs que passam pelas paredes. Os 6 primeiros também formam a órbita do falante. |
| `cutout` | `true` usa `projects/SLUG/falante-alpha.webm`. Gere o arquivo com `scripts/recortar-falante.py`. |
| `outro` | `{duration, small, big, brandName, brand, src}`. Acrescenta `duration` segundos ao fim. `brandName` é o texto abaixo do logo (padrão: "SUA MARCA"); `brand` é o logo e `src`, o PNG que atravessa a câmera. |
| `sfxCues` | `[tempo, som_kenney, distância_db]`. Se presente, `audioMix` passa a ser `projects/SLUG/mix.wav`. |
| `speakerShots`, `punchTimes`, `keywords`, `phrases`, `palette`, `brand` | Iguais aos do Editorial Artístico. `phrases` mantém expressões de várias palavras numa única linha de destaque. |

## Passo a passo

1. Copie o modelo para `PASTA_DO_VIDEO/MOTION/template-v1.json`. Ajuste `slug`, `source`, `transcript`, `output` e `segments`.
2. Revise a transcrição com o Whisper local e registre as dúvidas para conferir na amostra. Escolha `keywords`, `phrases` e os momentos ligados a palavras reais da fala.
3. Confira quadros para definir `speakerShots.x`. A posição em `objectPosition` é calculada como `(centro_do_rosto × 3413 − 540) / 2333` para um vídeo 1920×1080.
4. Rode os scripts, a partir da raiz do workspace:

```bash
python scripts/biblioteca_motion.py preparar "PASTA/MOTION/template-v1.json"
python scripts/recortar-falante.py SLUG --centro 0.5
python scripts/mixar-sfx.py SLUG
```

   - `--centro` é a posição horizontal do rosto no quadro de origem, de 0 a 1.
   - O recorte usa o rembg `u2net_human_seg`, local, e leva cerca de 0,4 s por quadro em CPU.
   - `--limite 60` testa o recorte em poucos quadros.

5. Gere quadros parados e uma prévia reduzida. Por exemplo: `npx remotion render src/index.ts MotionTunelNarrativo SAIDA.mp4 --props=public/projects/SLUG/props.json --scale=0.5`, dentro de `motion/remotion`.
6. Apresente a prévia e aguarde aprovação explícita. Só então renderize em escala 1, ou use `--render` no preparador quando o recorte e a mixagem já existirem.

## Limites conhecidos

- **Recorte:** gestos rápidos podem deixar mãos translúcidas. Se a câmera corta para outras pessoas dentro de um túnel, o recorte mostra essas pessoas.
- **Filtro de cor:** `assetFilter` muda a cor dos PNGs. Use `keepColor` quando a cor original fizer parte do sentido.
- **Texto do encerramento:** `small`/`big` devem vir do tema da fala, sem afirmar o que a fala não diz. Para outra marca, troque `brandName` e `brand`.
- **Exemplo completo:** veja `PASTA-DA-EDICAO`. Ele foi gerado por scripts próprios em `qa/`, anteriores a este fluxo genérico.
