# Motion narrativo por fala

O processo completo está na skill `.agents/skills/meia-motion-shorts/SKILL.md`;
o prompt reutilizável para outro agente está em
`.agents/skills/meia-motion-shorts/referencias/prompt-modelo.md`. Cada vídeo ganha
uma composição própria em `src/NOME.tsx`, registrada separadamente em `Root.tsx`,
sem substituir `DirecaoStudio`.

Os elementos vetoriais são gerados em código: selo com desenho progressivo,
ícones de pessoas, barra de expectativa, carimbo, risco de negação e comparação.
As fontes são locais. Não use API externa nem imagens de marcas inventadas.

Para cada fala, selecione o original e remapeie a transcrição real. Adapte os
conceitos e pontos de sincronização ao conteúdo; não reutilize tempos de outro
vídeo. Inspecione os rostos antes de escolher o foco. No modo lateral 16:9, o
vídeo completo deve caber na moldura: não recorte o apresentador.

Gere os dados locais em `public/projects/[nome]/`: `cut.mp4`, `words.json` e
`props.json`, e passe-os por `--props`; não importe esses arquivos no código.
Não publique vídeos, dados de projetos, renders ou chaves no Git.

Faça a conferência de stills antes do MP4 de teste. O render de teste não
representa aprovação. Preserve a amostra e o relatório de conferência locais;
só gere o final após aprovação explícita da amostra atual.
