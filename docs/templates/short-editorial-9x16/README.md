# Short editorial 9:16 · v1

Vídeo vertical curto (20–40 s) a partir de uma entrevista ou depoimento:
cinco cenas com motion, legenda palavra a palavra, voz original e transições
nativas do Concat. Estilo editorial claro: papel com arcos tracejados girando,
itálico serifado + negrito, vídeo em cartão/círculo, pílulas e selos.
1080×1920, 30 fps. Montagem final no Concat.

## Tipos de cena

Cada cena do plano tem um `kind`, feito sempre pelo mesmo motor:

| kind | motor | o que faz | campos próprios |
| --- | --- | --- | --- |
| `pergunta` | Remotion | gancho: cartão, "?" gigante, palavra marcada | `lead[]`, `title`, `marked`, `pill` |
| `mosaico` | HyperFrames | o cartão vira a aula central de um mosaico | `lead[]`, `big[]`, `shrinkAt`, `badge`, `counter` |
| `meta` | Remotion | círculo, barra até a bandeira, busca digitando, metas concluídas | `lead`, `big[]`, `race`, `search`, `checks[]` (até 2) |
| `contraste` | HyperFrames | claro com selo → negativo escuro P&B → volta ao claro | `labels[3]`, `lead[]`, `big`, `seal`, `pill`, `darkAt`, `outline`, `sub[]`, `strikeAt`, `lightAt`, `stamp`, `final` |
| `fechamento` | Remotion | palavra sublinhada à mão e cartão final com logo | `lead`, `big`, `words2[]` |

Campos comuns: `id`, `kind`, `engine`, `sourceStartFrame` e `frames` (quadros
do original, 30 fps), `tailFrames` (só a última cena: encerramento sem voz),
`transition` (`{"id": "concat.whip-pan", "duration": 0.4}` ou `null`),
`shots` (planos de câmera: `{"at": s, "x": 0..1}` = posição horizontal da pessoa
no original, para centralizar o recorte), `label` e `words` (legenda).
Textos com tempo usam `{"t": "texto", "at": segundos}` contados do início da cena.
Palavras grandes encolhem sozinhas para caber; mesmo assim prefira 1–2 palavras.
Ordem e quantidade de cenas são livres; o exemplo usa as cinco.

Exemplo completo e sintético: `motion/remotion/templates/short-editorial-9x16.json`.

## Fluxo

```powershell
python scripts/short_editorial.py validar PLANO.json
python scripts/short_editorial.py preparar PLANO.json --pasta 'D:\...\MOTION\meu-short'
python scripts/short_editorial.py renderizar PLANO.json --pasta 'D:\...\MOTION\meu-short'
python scripts/short_editorial.py montar PLANO.json --pasta 'D:\...\MOTION\meu-short' --nome 'Meu short'
python scripts/short_editorial.py amostra PLANO.json --pasta 'D:\...\MOTION\meu-short' --saida 'D:\...\MOTION'
```

- `preparar` copia os fontes do template para a pasta de trabalho (node_modules
  por junção, sem novo download), extrai cada trecho com quadros exatos e gera
  props/HTML das cenas. Com `"transcript"` (JSON `{"words":[{"w","s","e"}]}`),
  cenas sem `words` recebem a legenda do trecho; `replace` corrige termos e
  `keywords` destaca palavras. `"source": "sintetico"` gera barras e tom para testes.
- `renderizar` gera um MP4 por cena e confere a contagem de quadros. A telemetria
  do HyperFrames fica desligada. Não use `hyperframes snapshot` com material
  pessoal: ele descreve quadros por um serviço externo.
- `montar` cria o projeto no Concat pela API local (Configurações → Remoto
  ligado): cenas na faixa T2 com as transições do plano (antes de cada corte;
  `splitTransition` no corte seco do `contraste`) e a voz original na T1, oculta,
  alinhada quadro a quadro.
- `amostra` exporta para revisão e copia o arquivo para `--saida`.

## Onde os arquivos ficam

A API do Concat só grava dentro da pasta do usuário (`C:\Users\<você>`): o projeto
fica em `--concat-dir` (padrão `Videos\Concat`) e a exportação passa por lá antes
de ser copiada para `--saida`, que pode ser qualquer pasta. O original é só lido.

Plano, trechos, fontes e logo ficam na pasta de trabalho, fora do Git. Fontes
(`fonts.serif/sans/label`) e logo (`brand.logo`) são caminhos locais opcionais;
sem eles o template usa Georgia/Arial e o cartão final só com texto. Não versione
planos de episódios (`*.local.json`), mídias ou fontes licenciadas.

## Limites

- Original em 30 fps; 1080×1920 fixo. Sem música; voz única do original.
- Cada `kind` existe em um único motor; trocar exige portar a cena.
- O recorte segue `shots`: confira os cortes de câmera de cada trecho.
- Primeiro gere a amostra e faça a revisão humana prevista em CLAUDE.md.
