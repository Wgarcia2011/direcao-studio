> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Teatro Retrô — 9:16

Composição `MotionTeatroRetro`, 1080×1920 a 30 fps. Referência solicitada: https://br.pinterest.com/pin/1086986060093001748/ . Template separado do Impacto Dinâmico.

Cortinas turquesa, céu azul-marinho, estrelas suspensas e nuvens hachuradas; cartas de papel com borda ornamental, títulos creme em relevo e textura discreta. A entrevista permanece em cores, com P&B apenas nos intervalos negativos da configuração. Estética de colagem teatral adaptada, sem reutilizar personagens ou mídia da referência.

Copie `teatro-retro.template.json` e adapte fonte, transcrição, seleção e cenas. Use o preparo `scripts/biblioteca_motion.py preparar`. `emphasisMoments` configura cartas e títulos em trechos específicos; seus tempos são os da fonte. `cards` recebe src, label e at; cenas type/outro usam assetSrc. Fora desses momentos, a entrevista recebe moldura maior. Legendas até três palavras, grandes e sincronizadas.

Exemplo completo: `PASTA-DA-EDICAO` e `props-v5.json`. Fonte React: `motion/remotion/src/biblioteca/MotionTeatroRetro.tsx`. Cores de papel, tinta e acento são constantes no componente; paleta retrô própria derivada da marca.

Áudio: usa a mixagem aprovada da V4 com voz original contínua e efeitos pontuais 8–12 dB abaixo da voz local. Para outro vídeo, gerar sua própria mixagem e configurar audioMix; sem esse campo, usa a voz do vídeo. Não reutilizar a voz da exemplo A em outro projeto. Receita em `MOTION/qa/mixar-v4.py`, efeitos Kenney CC0.

Reprodução desta edição: `node "`PASTA-DA-EDICAO`. GPU NVENC, temporários no D. O script é específico da edição exemplo A. Para conferir antes, executar sem --full gera frames e amostra 19–27s.
