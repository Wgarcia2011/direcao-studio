> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Foco Total — fala, imagem e tipografia

Composição MotionFocoTotal, 1080×1920 a 30 fps. Novo template inspirado no pin https://br.pinterest.com/pin/1092545190885201921/ e na direção explícita do usuário: quem fala em tela cheia, imagem com descrição, retorno à fala, repetindo essa alternância.

## Uso

Copiar foco-total.template.json e substituir fonte, transcrição, trechos, textos e tempos. Preparar com scripts/biblioteca_motion.py preparar. Os tempos da fonte são remapeados para o corte. speakerShots configura from/to/x, sendo x a posição horizontal CSS object-position entre 0 e 1; conferir o rosto na imagem real, não copiar o enquadramento da exemplo A. punchTimes define cortes leves de aproximação. fullScreenInserts define from/to/kind/eyebrow/title/src. Tipos usados: object, stack, type, photo. stack inclui também o livro da biblioteca local.

Fora das inserções, a pessoa ocupa todo o quadro, sem moldura decorativa. Alternar planos e imagens de 1–3 segundos, com retornos mais longos à fala, conforme a frase. Não tornar o ritmo uma regra mecânica por segundo.

## Legendas como parte da edição

Blocos de até três palavras, com quebra antes de alguns conectores/pronomes. Sans pesada para palavras-chave maiores e coloridas; sans clara para palavras de ligação. Animação por palavra, contraste e gradiente sobre vídeo, área inferior média fora do rosto. Nas inserções, serif itálica no apoio e sans forte na ideia principal. Conferir largura, quebras, rostos, gestos e área segura. A palavra confiarem foi preservada na legenda corrigida.

## Assets e áudio

Reutiliza PNGs da biblioteca impacto e adiciona motion-assets/tela-cheia/estudo-noturno.png, imagem gerada de mãos estudando, sem identificação de pessoa real. O label imagem ilustrativa contextualiza essa cena. Não copiar imagens ou áudio do Pinterest.

A edição exemplo A usa mix-v6.wav com voz contínua e 17 efeitos Kenney CC0 reposicionados nas entradas; níveis calculados em relação à voz local. Para outro vídeo, criar sua própria mixagem; audioMix deve conter voz+efeitos, pois o som do vídeo é silenciado para evitar duplicação. Sem audioMix, usa o som do vídeo. Receita: qa/mixar-v6.py no projeto exemplo A.

Exemplo completo: `PASTA-DA-EDICAO`

## Transições e gráficos por código

Cada fullScreenInserts aceita transition: circle (máscara que revela e fecha), slide (painel lateral com saída) ou cut. graphic opcional: calendar, flow ou check. São SVGs animados por frames; transições revelam o vídeo contínuo por baixo. Aplicar apenas em frases pertinentes. Referências adicionais: prompt-motion.com/sab8a-364a5a e prompt-motion.com/shneural-2abdfa. Implementação própria; não exige instalar skills ou código remoto.
