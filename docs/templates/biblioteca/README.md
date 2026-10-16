# Biblioteca de templates de motion

Templates criados no editor web anterior e portados para o Remotion atual
(`motion/remotion/src/biblioteca/`). Todos geram um MP4 com a fala e o motion,
importado como clipe no Concat, onde entram cortes extras, trilha e transições.
A lista completa, com resumo de cada um, está em
`motion/remotion/templates/biblioteca/indice.json` e no comando
`python scripts/biblioteca_motion.py listar`.

| Template | Formato | Composição | Como usar | Testado |
| --- | --- | --- | --- | --- |
| Editorial · Estúdio · Impacto | 9:16 | `MotionTemplate` (temas) | preparar | sim |
| Impacto Dinâmico | 9:16 | `MotionImpactoDinamico` | preparar | sim |
| Teatro Retrô | 9:16 | `MotionTeatroRetro` | preparar | sim |
| Foco Total | 9:16 | `MotionFocoTotal` | preparar | sim |
| Editorial Artístico | 9:16 | `MotionEditorialArtistico` | preparar | sim |
| Túnel Narrativo | 9:16 | `MotionTunelNarrativo` | preparar | sim |
| Caderno Editorial (claro/dark) | 9:16 | `MotionCadernoEditorial[Dark]` | preparar | sim |
| Cards Fluidos + Caderno Dark | 9:16 | `ConcatCardsCadernoDark` | aplicar | sim |
| Contraste Cinético | 9:16 | `MotionContrasteCinetico` | contraste | sim |
| Cinético Estratégico / com fala | 9:16 | `MotionKineticoEstrategico` / `MotionKineticoFala` | aplicar | sim |
| Percurso Editorial | 9:16 | `MotionPin129Continuo` | aplicar | sim |
| Pin 129 com fala | 720×1280 | `MotionPin129Fala` | aplicar | sim |
| Pin 129 reconstrução | 720×1280 | `MotionPin129` | aplicar | não (precisa da referência local) |
| Diorama Telejornal Dark | 9:16 | `MotionDioramaTelejornalDark` | telejornal | não (configuração completa) |
| Diorama 01 | 9:16 | `DioramaTemplate01` | aplicar | não (quadros extraídos) |
| Impacto Wide / com marca | 16:9 · 9:16 | `MotionImpactoWide`, `MotionImpactoMarca*` | preparar | não |

"Testado" = renderizado com fonte e transcrição sintéticas nesta versão. Os
detalhes de direção de cada template estão em [detalhes/](detalhes/).

## Preparar a máquina (uma vez)

As ilustrações (PNG/SVG gerados para estes templates), fontes e marca não vão
para o Git. Copie-as da sua biblioteca local para `motion/remotion/public/`:

```powershell
python scripts/biblioteca_motion.py assets --de 'PASTA\public'
```

Sem um asset, o objeto desenhado em código assume o lugar (ou some); sem logo,
nada é desenhado; sem fonte, vale a fonte padrão do navegador.

## Usar

- **preparar** (template com `segments`): copie o `.template.json` para a pasta
  da edição, preencha `source`, `transcript` (JSON `{"words":[{"w","s","e"}]}`),
  `segments` (segundos do original) e as cenas; os tempos das cenas usam segundos
  do original e aceitam `"sN"`/`"end"`.
  `python scripts/biblioteca_motion.py preparar T.json` e depois
  `renderizar T.json --quadros 90,300` (prévia) ou `renderizar T.json --saida X.mp4`.
- **contraste**: `python scripts/biblioteca_motion.py contraste T.json` alinha as
  linhas de cada cena com a transcrição (`*palavra*` = destaque, `palavra@12.4` =
  tempo fixo) e renderiza a prévia definida em `preview`; `--completo` renderiza tudo.
- **aplicar** (props prontas): `python scripts/biblioteca_motion.py aplicar PROPS.json
  --composicao ID --slug NOME [--quadros ...]`. Arquivos locais citados nas props
  são copiados para `public/projects/NOME/`.
- **telejornal**: `python scripts/preparar_diorama_telejornal.py CONFIG.json`
  valida e prepara; depois `aplicar` com as props geradas.

`--sintetico` troca vídeo e transcrição por material neutro, para testar um
template sem usar mídia pessoal. Efeitos sonoros e trilha, que o editor anterior
mixava por script, agora entram na timeline do Concat.

## Privacidade

Exemplos e textos foram neutralizados (sem nomes de alunos, marca ou temas
políticos). Planos, transcrições, assets, fontes e projetos de cada edição ficam
em pastas locais ignoradas pelo Git.
