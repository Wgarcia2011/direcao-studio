# Prompt modelo para outro agente (Codex, Haiku etc.)

Troque o que está entre colchetes. Testado com o Claude Haiku em 08/10/2026: ele
escolheu os trechos, escreveu a composição do zero, conferiu 10 stills, corrigiu
uma sobreposição e renderizou o MP4 sem ajuda (≈14 min no total).

```text
Responda em português. Trabalhe no projeto "Direção Studio" ([PASTA DO PROJETO]).
Leia CLAUDE.md, docs/CLI.md e as skills em .agents/skills/, em especial
meia-motion-shorts, meia-briefing-de-edicao, meia-legendas-e-enquadramento,
meia-revisao-economia e remotion-best-practices (referências de markup).

Vídeo: [projetos/ID/brutos/original.mp4]. Transcrição com tempo por palavra:
[projetos/ID/edit/transcricao-original.json]. Não altere brutos/.

Faça um corte de ~30 s e uma composição Remotion [VERTICAL 1080x1920 | HORIZONTAL
1920x1080], 30 fps, voz original, sem mudar a velocidade, seguindo a skill
meia-motion-shorts:
- 3 a 5 trechos com começo, virada e conclusão; tabela saída × original × fala.
- Grade de frames para localizar rostos antes de posicionar qualquer elemento.
- Cortes secos de aproximação, moldura do apresentador, flash nas trocas.
- Preto e branco com tremor nos momentos negativos; cores normais, brilho e
  confete nos positivos, ligados ao tempo exato das palavras.
- Placeholders temáticos em código (folha de respostas, lista de aprovados,
  Diário Oficial – Nomeação), marcados como ilustração.
- [SEM LEGENDA E SEM EMOJIS | legenda de até 3 palavras com palavra-chave em caixa;
  no máximo 3 emojis].
- Crie src/[Nome].tsx e registre em src/Root.tsx sem mexer nas outras
  composições. Props por public/projects/[nome]/props.json; não importe esse
  arquivo no código. Animações só por useCurrentFrame/spring/interpolate.
- eslint e tsc --noEmit sem erros.
- Stills de conferência, correções, render em Renders/TESTES-MOTION/[nome].mp4,
  frames extraídos do MP4 e ffprobe.
Não afirme ter assistido ou ouvido. Não aprove nem exporte o final sem a minha
aprovação explícita. Relate dúvidas de transcrição.
```
