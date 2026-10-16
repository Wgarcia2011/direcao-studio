> Guia trazido do editor web anterior. Os templates e comandos atuais estão em [docs/templates](../templates/README.md).

# Legendas e funções por chat — 11/10/2026

Incremento aplicado ao motor existente. Catálogo: 11 presets preservados e 8 novos
(neon, tarja, contorno, duotone, escada, pop, cartaz, minimal). 1–6 palavras por
bloco, tamanho, posição, caixa, pontuação opcional, estilos por intervalo e zoom
de até 15% nos destaques. Configuração e exemplos: CLI.md.

Prévia real e render usam CaptionTrack; a biblioteca da aba Legendar é uma
demonstração ilustrativa. Os templates são próprios, inspirados nos recursos
descritos na referência, sem importar templates comerciais.

Referências consultadas:
- https://www.youtube.com/watch?v=Q3XPr0SvtBo — transcrição automática completa
  de 16min53s; inspeção visual por amostragem perto de 00:04 e 11:49–12:00.
- https://www.diorgysantos.com/novo — catálogo público de funções.

Já existiam: transcrição local, cortes de pausas, fades, transcrição remapeada,
timeline com histórico, Motion, CLI e integração opcional DeepSeek.

Fora desta entrega: comando de voz/wake word, J-cut com trilhas independentes,
correção de cor por visão, novo tracking facial, biblioteca de 100+ templates
e inclusão automática de b-roll/SFX. Não há alegação de paridade com o plugin.

Codex e Claude operam pela CLI. DeepSeek propõe caption_style em settings.set;
testes usam respostas simuladas, sem chamadas pagas. Para Motion, use seu próprio
documento/revisão. Destaques têm tempos de saída e precisam ser revistos após
remontagens. Palavra sem tempo não recebe sincronização inventada.

Verificações reproduzíveis:
```
python -B -m unittest discover -s app/tests -p 'test_*.py'
node app/tests/test_caption_timing.cjs
cd motion/remotion
npm run lint
node build-player.cjs
node render-captions-demo.cjs
```

A demonstração contém texto sintético, não fala real. MP4 H.264, 720×1280,
57 segundos, sem áudio, em `PASTA-DA-EDICAO`
de estilo em um vídeo do usuário. Arquivos anteriores à integração foram
preservados em backups/legendas-chat-20261011-133635.
