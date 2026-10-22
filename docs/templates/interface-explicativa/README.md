# Interface Explicativa · fala + UI violeta em 3D (v2)

Fala em tela cheia com **legenda central** e uma palavra-chave em degradê violeta. A cada 2–4 s ela é interrompida por **inserts de interface** em fundo branco ou lavanda: perfil de canal, barra de busca, card de pergunta e checklist. Entre fala e insert há transições de **luz**, **whip**, **cartão**, **branco** e **zoom**. A estrutura vem do Pin 984106956076960638; veja a análise em `docs/templates/motion/pinterest-984106956076960638/ANALISE.md`, na pasta do workspace. O objetivo é **trocar só o tema**: os textos mudam, e a estrutura, o ritmo e a composição continuam os mesmos.

**Primeira aplicação:** reels de 60 s de um podcast (22/10/2026), com cortes no Concat, três planos de câmera, quatro B-rolls 3D e encerramento com chamada para o perfil. A amostra foi aprovada e a versão final, exportada pelo Concat com `--reviewed`. Os arquivos dessa aplicação ficam na pasta local do vídeo, fora do Git.

**Status:** v2 em 3D (22/10/2026): amostra sintética de 20 s e vitrine de elementos **aprovadas pelo usuário como direção do template** em 22/10/2026 (`APROVACAO.json`, com os hashes). Ainda não foi aplicada a nenhum vídeo real: cada aplicação exige amostra e revisão próprias. A v1 em 2D continua disponível com `"estilo": "2d"`.

| Item | Valor |
| --- | --- |
| Saída | 1080×1920, 30 fps, MP4 H.264 com o áudio da fala |
| Entrada | fala já cortada **no Concat**, em 9:16 ou 16:9 reenquadrado, mais legendas palavra a palavra |
| Motores | Concat (cortes) → **HyperFrames + Three.js 0.186** (composição) e **Remotion + Three.js** (elementos avulsos) → Concat (montagem e exportação) |
| Código | `motion/hyperframes/templates/interface-explicativa/` (`cena3d.js`, `elementos3d.js`, `cena.js` 2D), `motion/remotion/src/InterfaceElementos3D.tsx` e `scripts/interface_explicativa.py` |
| Fontes | Poppins Regular/Medium/Bold do usuário (sem elas, Segoe UI). Manuscrito em Segoe Script. Use `fontes` no JSON para trocar |

## Motores: quem faz o quê

- **Three.js:** cria os **elementos**, todos no módulo único `elementos3d.js`. Ele usa o Three.js 0.186 local, o mesmo do Caderno 3D, e nada é baixado. Os elementos são:
  - selos hexagonais e ícones extrudados (selo, caixa, pular, lupa, raio, alvo, livro, gráfico, relógio, estrela);
  - cards e pílulas com espessura e borda arredondada;
  - moeda-avatar e textos em textura (`*destaque*` em degradê);
  - luz de estúdio, mapa de ambiente e sombra.
- **HyperFrames:** é a **composição principal** (`cena3d.js`). Cuida da fala, da legenda em DOM (para ficar nítida), dos inserts e das sobreposições como cenas Three.js com câmera em perspectiva, além das transições. A fala viva entra na face do card do perfil e no **cartão 3D** por homografia, a mesma técnica da "foto viva" do Caderno 3D.
- **Remotion:** renderiza os **elementos avulsos** pela composição `InterfaceElementos3D`, que usa o **mesmo** `elementos3d.js`. São vitrines de 1 a 12 elementos em 9:16, 1:1 ou 16:9, com fundo opaco claro, escuro ou lavanda, para usar no Concat ou na biblioteca. O script copia o runtime para `motion/remotion/public/local/interface-explicativa/`, que fica fora do Git, e renderiza com `--gl=angle`.

## Fluxo

1. **Cortes no Concat.** Monte a fala e exporte a montagem intermediária.
2. **Legendas.** Corrija a transcrição contra o áudio e agrupe com `python scripts/interface_explicativa.py legendas transcricao.json --saida legendas.json`. É o mesmo agrupamento de 2–4 palavras do Caderno 3D, e `--plano` remapeia os cortes.
3. **Configuração.** Copie `motion/hyperframes/templates/interface-explicativa/exemplo-sintetico.json` para a pasta da edição e escreva os textos do tema novo. Depois rode `validar config.json` e `resumo config.json`.
4. **Amostra.** Rode `preparar config.json --pasta NOVA --amostra`, depois `verificar --pasta NOVA` e `render --pasta NOVA --saida amostra.mp4`. Importe o MP4 num projeto 1080×1920 do Concat, exporte com `--sample` e aguarde aprovação.
5. **Completo.** Somente após a aprovação: rode `preparar` sem `--amostra` numa pasta nova, faça o `render` e exporte no Concat com `--reviewed`.

Elementos avulsos pelo Remotion, por exemplo:

```powershell
python scripts/interface_explicativa.py elementos selo lupa grafico --fundo lavanda --formato 1x1 --duracao 4 --saida Renders/elementos.mp4
```

O preparador recusa pastas e saídas que já existem e grava um `manifesto.json` com hashes e `revisao: pendente`. Snapshots e renders rodam sem `GEMINI_API_KEY` e com a telemetria desligada. Nos snapshots manuais, use sempre `--describe false`.

## Configuração (`schemaVersion: 1`, `template: "interface-explicativa"`)

Os tempos são em segundos da montagem. As posições são em px do quadro 1080×1920.

- **Base**
  - `video`, `legendas`, `duracao`.
  - `fixture`: `true` só para dados sintéticos; liga a marca "AMOSTRA SINTÉTICA".
  - `fonteVideo` {largura, altura}.
  - `enquadramento` {cx, cy, zoom 1–2,5, rostoY}. O `rostoY` é a altura do rosto no quadro 9:16 e serve para o card do perfil.
  - `legendaY`, entre 600 e 1250 (padrão 860, sobre o peito).
  - `abertura`: transição do início.
  - `estilo`: `"3d"` (padrão: Three.js) ou `"2d"` (v1 em DOM/CSS).
- `paleta` (opcional): `acento`, `acento2`, `destaqueClaro`, `lavanda`, `claro`, `escuro`, `tinta`, `luz`, `faixa`. O padrão é a paleta da referência (`#6E29FF`, `#9764FD`, `#DECEFD`…). Trocar a paleta é opcional: o tema é o texto.
- `destaques`: palavras ou expressões da fala que vão para uma linha própria, maiores e em degradê. Aceita `{"texto": "pular", "icone": "pular"}` para colocar um ícone ao lado. Use uma por frase, no máximo.
- `sublinhados`: `{tipo: "slider" | "traco", at, ate}` sob a legenda.
- `cenas`: inserts que cobrem a fala, de 1 a 6 s cada, sem sobreposição. Campos comuns: `from`, `to`, `entrada`, `saida` e `retorno` (transição usada na volta à fala).

  | `tipo` | Visual | Campos |
  |---|---|---|
  | `perfil` | cabeçalho de canal (avatar com iniciais, nome, detalhe), a fala dentro de um card e a legenda embaixo | `nome` ≤26, `detalhe` ≤32, `legenda` ≤30 com `*destaque*`, `iniciais` |
  | `busca` | frase digitada com sublinhado em degradê | `texto` ≤32 com `*destaque*` |
  | `pergunta` | card lavanda com título, linhas pontilhadas e texto escrito palavra a palavra | `titulo` ≤22, `texto` ≤90, `linhas` 2–4 |
  | `checklist` | fundo escuro com grade e card branco com itens em cascata | `titulo` ≤14, `itens` [{texto ≤16, at, icone}] (1–5) |

- `sobreposicoes`: ficam sobre a fala e nunca cruzam uma cena. Campos `at`, `ate` e `y` (950–1600).

  | `tipo` | Visual | Campos |
  |---|---|---|
  | `lista` | itens com ícone sob a legenda | `itens` [{texto ≤20, at, icone}] (1–4) |
  | `caminho` | curva tracejada com ícone num disco branco | `icone`, `posicao` (0–1) |
  | `faixa` | letreiro gigante deslizando numa faixa azul | `texto` ≤28, `velocidade` |
  | `manuscrito` | painel azul inclinado com palavras manuscritas | `palavras` (1–3, ≤14) |

- **Transições:**
  - `luz`: lavagem violeta/branca.
  - `branco`: dissolução.
  - `whip`: deslize com borrão horizontal.
  - `zoom`: amplia e desfoca.
  - `cartao`: a fala vira um card arredondado e cresce. Só vale em `retorno`.
  - `corte`.
- **Ícones** (`icones`): selo, caixa, pular, lupa, raio, alvo, livro, grafico, relogio, estrela. São SVGs próprios.
- `planos` (só 3D): enquadramento 9:16 que muda com as trocas de câmera, `[{from, to, cx, cy, zoom 1–2,5}]`, cobrindo de 0 até `duracao` sem lacunas. Meça o rosto em quadros reais.
- **B-roll** (`cenas` com `tipo: "broll"`, só 3D, de 1 a 8 s): cobre a fala com uma cena 3D e mantém a legenda, que passa a ser escura e fica embaixo (`legendaY` 1300–1650, padrão 1470). Use-o nos pontos de corte para esconder os saltos. Opções:
  - `cena: "fichas"`: fichas pautadas em leque, com `linhas` (1–4, ≤22) escritas a lápis uma por vez;
  - `cena: "imagem"`: PNG local com alfa (`imagem`) num set 3D com sombra própria e flutuação.

  Campos opcionais: `rotulo` (≤30), `icones` (até 3, flutuando em parallax) e `fundo` (`claro`, `lavanda` ou `escuro`). Nada é baixado: o B-roll sai de código ou de PNGs que já existem.
- `encerramento` (só 3D): chamada para o perfil depois da fala.
  - Campos: `from` (fim da fala), `extra` (2–8 s, em silêncio), `logo` (PNG com alfa; o contorno vira volume, como no Caderno 3D), `perfil` (`@perfil`), `chamada` (padrão "Siga no Instagram"), `transforma` (momento em que o ícone do Instagram em 3D gira e vira o logo) e `entrada`.
  - A duração total passa a ser `duracao + extra`.
- `amostra` {inicio, fim}: trecho de revisão.

## Direção (para trocar o tema sem perder a identidade)

- **Ritmo:** cerca de 60% de fala e 40% de inserts. Haja um evento visual a cada 2–4 s; confira com `resumo`, cujo `maiorTrechoSemEvento` deve ficar ≤ 4 s.
- **Inserts:** cada um **ilustra a frase dita** naquele momento, nunca decora. Se a fala cita um problema, use `busca` ou `pergunta`. Para listar etapas, `checklist`. Se cita uma pessoa ou fonte, `perfil`.
- **Cor:** só um destaque violeta por bloco de legenda. O resto é branco sobre a fala e tinta escura sobre o branco.
- **Encadeamento:** cenas encadeadas trocam com `branco`. A volta para a fala depois de um `whip` fica melhor com `retorno: "cartao"`.
- **Respeito à fala:** não altere a voz nem a cor do vídeo. Música e efeitos sonoros só entram com pedido.

## Exemplo sintético

```powershell
python scripts/interface_explicativa.py fixture --pasta $env:TEMP\ie-teste\fixture
python scripts/interface_explicativa.py preparar $env:TEMP\ie-teste\fixture\exemplo-sintetico.json --pasta $env:TEMP\ie-teste\proj
python scripts/interface_explicativa.py verificar --pasta $env:TEMP\ie-teste\proj
python scripts/interface_explicativa.py render --pasta $env:TEMP\ie-teste\proj --saida $env:TEMP\ie-teste\amostra.mp4
```

O exemplo gera um vídeo 9:16 com uma silhueta sobre fundo azul, um tom de 220 Hz e legendas sintéticas. Ele cobre as 4 cenas, as 4 sobreposições, as 6 transições, o slider e um destaque com ícone. O tema de exemplo é "método de estudo"; os textos são ilustrativos. `tests/test_interface_explicativa.py` valida o esquema, a troca de tema, o preparo e a recusa de sobrescrita, sem renderizar.

O pacote do template, com análise, prompt para Codex/Claude, stills e amostra, fica fora do Git, em `docs/templates/motion/INTERFACE-EXPLICATIVA.md` na pasta do workspace.
