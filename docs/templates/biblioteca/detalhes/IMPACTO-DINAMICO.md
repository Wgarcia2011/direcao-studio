> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Impacto Dinâmico — 9:16

Composição `MotionImpactoDinamico`, 1080×1920, 30 fps. Novo template; os modelos anteriores permanecem disponíveis.

Use `impacto-dinamico.template.json` como início e substitua fonte, transcrição, trechos, textos e tempos pela fala do novo vídeo. Execute `python scripts/biblioteca_motion.py preparar CAMINHO/template.json`. Tempos no template referem-se à fonte; o preparo remapeia cenas, marca e ênfases para o corte.

## Direção aprovada

- Azul-marinho #000068 e turquesa #00D0B8 da marca, com branco para leitura.
- Legendas inferiores grandes; conferir também correções na legenda, não apenas no título.
- Cor predominante; preto e branco só em trechos negativos pontuais.
- Cards em sequência, tipografia em perspectiva e parallax apenas nas frases importantes. Alternar intensidade com trechos de fala mais simples.
- `motionAccents.turns` e `parallax` controlam os movimentos. `emphasisMoments` aceita `cards`, `type` e `outro`, com títulos/objetos e tempos próprios. A entrevista continua em moldura durante essas ênfases.
- Não copiar automaticamente a duração ou a estrutura narrativa da exemplo A para outra entrevista.

## Áudio

A voz permanece contínua. `audioMix` aponta para um WAV dentro de `public` contendo voz + efeitos; a composição silencia o áudio do vídeo para evitar duplicação. Sem `audioMix`, usa a voz do próprio vídeo. Nunca reutilizar o WAV da exemplo A em outra entrevista.

Receita de referência: `PASTA-DA-EDICAO`. Adaptar projeto e lista de cues para cada fala. Efeitos Kenney Interface Sounds, licença CC0, em `public/motion-assets/audio/kenney-interface/source/Audio`. Normalizar efeitos em relação ao RMS local da voz, entre 8 e 12 dB abaixo, controlar picos e conferir a mixagem. O relatório `mix-v4.json` documenta os níveis medidos.

## Exemplo completo e reprodução

`PASTA-DA-EDICAO` é o exemplo com três trechos de ênfase e a marca. `props-v4.json` guarda os parâmetros exatos da edição. O script `MOTION/qa/render-v4.cjs --full` reproduz a versão da exemplo A usando GPU ANGLE/NVENC e temporários no D. Ele é específico desse projeto. O preparo genérico usa seu render padrão.

Para um novo vídeo, fornecer assets referenciados e gerar sua própria mixagem antes de configurar `audioMix`. Conferir frames de entrada/saída, rostos e legendas antes do render completo.
