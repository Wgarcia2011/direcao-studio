# Editorial misto — 12 combinações

Template local do Direção Studio, aprovado por o professor em 11/10/2026 a partir da amostra da revisão 10 do depoimento de exemplo B. Reutiliza a tipografia aprovada em vídeos verticais com fala. Versão 1.

## Arquivos

- `caption-style-base.json`: configuração válida para a CLI, sem tempos de outro vídeo.
- `template.json`: manifesto de direção com os 12 presets, funções e parâmetros visuais. Não enviar este manifesto para `caption-style`.
- `reference/preview-12-combinacoes.jpg`: referência visual das 12 combinações aplicadas.
- `reference/exemplo-b-r10-caption-style.json`: configuração exata da referência aprovada, incluindo seus tempos particulares.
- `reference/exemplo-b-r10-mapa.json`: mapa de palavras, intervalos e combinações daquela edição.

## Direção visual

Formato 1080×1920, branco e creme `#FFF0CF`, sombra escura. Misturar Manrope, Georgia Bold Italic e Sora com hierarquias de tamanho. Base em três palavras por bloco, preservando agrupamentos naturais. Usar 10 ou mais combinações distintas no vídeo completo; planejar 12 quando a fala comportar. Alternar composições expressivas com respiros, mantendo as mudanças nos limites dos blocos.

Fontes locais em `motion/remotion/public/fonts/`: `manrope-400.ttf`, `manrope-700.ttf`, `editorial-bold-italic.ttf` (Georgia Bold Italic) e `sora-700.ttf`. Os presets precisam existir no motor do destino; o manifesto não instala código ou fontes.

## Aplicação pelo agente

1. Leia `AGENTS.md`, `CLAUDE.md`, `docs/CLI.md` e `docs/CATALOGO-TIPOGRAFIA-LEGENDAS.md` na raiz do projeto.
2. Consulte `caption-presets` e `show ID`. Identifique a revisão atual e a transcrição remapeada para a saída editada.
3. Copie `caption-style-base.json` para a pasta de revisão do vídeo de destino. Planeje as 12 combinações de `template.json` conforme a fala real. A base sozinha aplica apenas `editorial-misto`.
4. Preencha `highlights` nessa cópia com `start`, `end`, `preset` e `zoom: 1`. Os tempos devem ser os da saída atual. Use intervalos sem sobreposição, começando e terminando nas divisões dos blocos; preserve os tempos por palavra. Registre quais IDs foram usados e em quais frases.
5. Aplique `python app/cli.py caption-style ID CAMINHO_DO_ESTILO --revision REVISAO_ATUAL`, substituindo os campos pelos valores reais. Confira o novo estado e seu histórico.
6. Gere a amostra pelo fluxo existente, preserve renders anteriores e inspecione o MP4. Confira leitura, rosto, contraste, animação e sincronização. Apresente a amostra atual antes da exportação completa.

Nunca reutilize automaticamente os tempos, nomes, frases, tracking, ROI ou cortes de exemplo B. O template é de legendas; não muda áudio, cor, enquadramento ou edição aprovados. A aprovação desta referência não substitui a aprovação da amostra de cada nova edição.

## Referência aprovada

Projeto `542c955c20ae495883caec9f3204f6be`, revisão 10. Amostra preservada em `projetos/542c955c20ae495883caec9f3204f6be/amostras/preview-revisao-10-combinacoes.mp4`, relativa à raiz do editor. O vídeo não foi duplicado no diretório de templates.

!As 12 combinações
