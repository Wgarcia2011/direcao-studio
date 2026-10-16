> Guia trazido do editor web anterior. Os templates e comandos atuais estão em [docs/templates](../templates/README.md).

# Templates de Motion 9:16 (Remotion)

Composição `MotionTemplate` (`motion/remotion/src/biblioteca/MotionTemplate.tsx`), guiada por
um `template.json` por vídeo. O mesmo motor tem três temas:

| Tema | Visual | Referência |
|---|---|---|
| `editorial` | Fundo claro com arcos tracejados, itálico serifado + palavra em negrito, vídeo em cartão/círculo, pílulas brancas | estilo aprovado em 09/10/2026 (exemplo B 19 v3, exemplo A 18) |
| `estudio` | Cinza de estúdio, objeto 3D preto brilhante girando como herói da cena, vídeo em círculo com aro escuro | pin 1140395936913435621 |
| `impacto` | P&B granulado, papel quadriculado, palavra em vermelho com marca-texto e brilho, aberração cromática, gráfico desenhado, risco vermelho | pin 1147643917677607792 |

Todos usam legenda palavra a palavra embaixo (palavras de `keywords` em destaque), fundo
escuro nas cenas `dark` (volta ao claro com abertura em círculo) e P&B no humor `neg`.

## Fluxo

1. Ler `analise/transcricao-original.json` e escolher trechos (≈30 s, expectativa →
   virada → fechamento), cortando nas bordas das palavras.
2. Criar `MOTION/template.json` na pasta do vídeo (modelo abaixo). Tempos das cenas são
   **segundos da fala original**; `"sN"` = início do trecho N, `"end"` = fim do corte.
3. `python scripts/biblioteca_motion.py preparar CAMINHO/template.json` gera corte, palavras
   e props em `motion/remotion/public/projects/SLUG/` (fora do Git) e
   `SLUG-selecao.json` (saída × original × fala).
4. Conferir stills: `npx remotion still src/index.ts MotionTemplate qa.png --props=public/projects/SLUG/props.json --frame=N --scale=0.25`.
5. `... template.json --render` grava o MP4 em `MOTION/` (caminho `output`).
6. Apresentar a amostra; nada é aprovado ou exportado sem pedido explícito.

## Esquema

```json
{
  "slug": "nome-unico", "theme": "editorial | estudio | impacto",
  "source": "../VIDEO.mp4", "transcript": "../analise/transcricao-original.json",
  "output": "NOME.mp4", "tail": 0.9,
  "segments": [[3.60, 7.95], [8.28, 11.30]],
  "fix": {"travi,": "trave,", "da@46.78": "dar"},
  "keywords": ["TRAVE", "FRACASSO"],
  "scenes": [{
    "from": "s0", "to": "s1",
    "shape": "card | circle | wide | tall", "fx": 0.33, "fy": 0.36,
    "dark": false, "mood": "neg | pos", "moodAt": 9.26,
    "titles": [{"small": "batendo na", "smallAt": 18.14, "big": "trave", "bigAt": 18.78,
                "until": 22.54, "size": 132, "mark": true, "strike": 19.0}],
    "pills": [{"at": 198.98, "text": "ou você passa", "icon": "✓", "dark": true, "until": 200}],
    "object": {"kind": "check | x | lock | trophy | flag | arrow | question | hourglass | goal | book | heart", "at": 18.14, "openAt": 20},
    "objects": [{"src": "motion-assets/estudio/trofeu.png", "kind": "trophy", "at": 202.7},
                {"kind": "check", "at": 202.9, "x": 860, "y": 1240, "size": 220, "rot": 8, "until": 204}],
    "punches": [{"at": 110.06, "until": 111.34, "z": 1.2}],
    "chart": {"at": 6.76, "trend": "down | up | downup"},
    "confettiAt": 202.9, "hideCaption": false
  }]
}
```

- `fx`/`fy`: centro do rosto de quem fala, em fração do quadro 16:9 (confira numa grade de frames).
- `mark` (impacto): marca-texto vermelho na palavra grande; `strike`: risco vermelho no tempo dado.
- Objetos: `object` (um) ou `objects` (vários) podem misturar código (`kind`) e PNG (`src`) na mesma cena ou alternar entre cenas. Sem `x`/`y`, o objeto vai para a posição de destaque do tema; com `x`/`y` (px no quadro 1080×1920), fica livre, com `size`, `rot` e `until` próprios. Se o PNG ainda não existir, o script avisa e usa o `kind` em código.
- `src`: PNG transparente em `motion/remotion/public/motion-assets/<tema>/` (fora do Git) substitui o objeto desenhado em código; briefing dos assets em `PASTA-DA-EDICAO`.
- No tema `estudio`, cena com `object` põe o objeto 3D no centro e reduz o vídeo a um círculo abaixo.
- Emojis: no máximo 2–4 por vídeo; legenda preferida pelo usuário.

Aprendizado consolidado (receita, geração de PNGs, lições): `docs/MOTION-APRENDIZADO-TEMPLATES-ASSETS.md`.

## Modelos de partida salvos

Copie e adapte um dos modelos em templates/motion:
estudio,
impacto ou
editorial. São JSONs válidos com tempos
e textos ilustrativos; substitua-os pela fala real antes de preparar o corte.
O README registra geometria, vários objetos, fallback, estados de PNG e uso do manifesto.
