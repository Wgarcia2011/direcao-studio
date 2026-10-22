# Kit editorial · identidade v1

Três motions de tela cheia para importação no Concat. Fontes próprias em
HTML/CSS/GSAP com HyperFrames, sem instalar o aplicativo/daemon do OpenDesign.
A identidade e as três amostras demonstrativas foram aprovadas pelo usuário
em 19/10/2026 (`APROVACAO.json`). Novas adaptações exigem revisão própria.

| Template | Visual | Quando usar |
| --- | --- | --- |
| `titulo-editorial` | Papel, título serifado, três sinais vermelhos | Abertura e mudança de assunto |
| `card-dados` | Percentual animado e duas barras | Comparar dois percentuais de 0 a 100 com fonte identificada |
| `encerramento` | Fundo verde, assinatura e chamada curta | Fechar uma ideia ou convidar à próxima ação |

Formatos: 1080×1920 ou 1920×1080; amostras menores 540×960 ou 960×540.
24, 30 ou 60 fps; duração de 4 a 15 s, em frames inteiros. Os exemplos usam
6 s/30 fps. Arquivos opacos e silenciosos; não são overlays transparentes.
Texto: até duas linhas de 28 caracteres no título, 75 no subtítulo, 24 na
marca. Limites são guardas iniciais; confira sempre o layout renderizado.

## Preparar, verificar e gerar amostra

Na raiz do código ativo, após preparar o motor HyperFrames:

```powershell
python scripts/editorial_kit.py listar
python scripts/editorial_kit.py validar motion/hyperframes/templates/editorial-kit/titulo-editorial.json
python scripts/editorial_kit.py preparar motion/hyperframes/templates/editorial-kit/titulo-editorial.json --pasta Renders/editorial-kit-v1/titulo
python scripts/editorial_kit.py verificar --pasta Renders/editorial-kit-v1/titulo
python scripts/editorial_kit.py amostra --pasta Renders/editorial-kit-v1/titulo --saida Renders/editorial-kit-v1/titulo-amostra.mp4
```

Repita com os outros dois JSONs e pastas novas. O preparador recusa pasta
existente e o render recusa saída existente. `amostra` roda `check` antes do
render, lê fps do plano e nunca registra aprovação humana. Os fontes,
plano, tokens e manifesto com hashes ficam juntos. Não há exportação final
nem importação/posicionamento automático na timeline.

Os planos usam `fixture: true`: não remova a marca de demonstração enquanto
os textos/dados forem sintéticos. Para material real, copie o JSON para a
pasta local do projeto, use `fixture: false` e forneça a fonte dos dados em
`footer` começando por `FONTE:`. A revisão continua pendente em ambos os casos.

## Identidade e fontes

`motion/identity/editorial-v1/tokens.json` define paleta, tipografia e tempos.
Leia o DESIGN.md ao lado antes de adaptar. `--identidade caminho/tokens.json`
permite outra cópia do contrato. Reprepare em nova pasta para aplicar alterações;
a cópia de tokens e fontes congela a aparência daquela versão.

O preparador copia Georgia, Arial e Consolas da instalação local do Windows,
sem baixar ou versionar fontes. Em outro sistema, indique `fontFiles` no plano
com chaves `display`, `sans`, `mono`, apontando para arquivos TTF/OTF/WOFF locais,
relativos ao plano. Use somente fontes para as quais tenha licença.

`motion/remotion/src/identity.ts` expõe os mesmos tokens e estilos base aos
componentes Remotion. Não carrega fontes sozinho nem muda visuais antigos.
As três peças deste recorte são HyperFrames; não são três versões Remotion.

## Montagem e revisão

Importe o MP4 no Concat pela janela ou `media.import` documentado em
`docs/CLI.md`, e posicione o clipe no intervalo correto. Preserve voz/trilha
da montagem e os fontes do motion. Um MP4 não vira texto editável do Concat.
Revise a amostra atual antes da exportação completa. Para testes, só fixtures
sintéticas. `Renders/`, fontes copiadas e vídeos não acompanham o Git.

## Origem

Conceito inspirado na separação entre design system, template e artefato do
[OpenDesign](https://github.com/nexu-io/open-design), consultado em 19/10/2026.
Implementação própria deste recorte: nenhum código, asset ou pacote de skills
do OpenDesign foi incorporado. Não depende de seu MCP, daemon, telemetria ou
serviços de modelos. Dependências HyperFrames/GSAP seguem seus próprios termos.
