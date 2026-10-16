> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Percurso Editorial

Template de motion aprovado pelo usuário em 09/10/2026. A câmera percorre um cenário de grid cinza, conectando objetos e tipografia à fala. Palavras grandes, serifadas em cascata, PNGs temáticos e detalhes lilás/verde claro completam as cenas. Base visual: primeira referência Pinterest 12947917676306751.

## Sequência

1. Abrir com a pergunta completa, mantendo a pessoa que pergunta.
2. Mostrar o início da resposta com a entrevistada na tela.
3. Entrar em animação contínua: textos e objetos no mesmo cenário amplo; câmera transita entre coordenadas, em vez de alternar cards com o podcast.
4. Voltar à entrevistada na conclusão da fala.
5. Fechar com o logotipo oficial do sua marca, preservando geometria e cores.

Preservar a ordem, cortes e velocidade do arquivo aprovado. A fala segue contínua. Logo entra após a conclusão, com uma breve permanência; não cortar uma palavra para antecipar a marca. Não adicionar música nem efeitos sonoros sem pedido.

## Layout aprovado

Tela de exemplo: 720×1280, 30 fps, 9:16. Grid de 42 px sobre #dcdcdc. Times New Roman Bold Italic para fala; Impact para destaques. Legendas em 66 px, largura 565 px, esquerda 78 px e topo **270 px**, 85 px abaixo da V2. Destaque principal no topo 460 px. Esse espaço afasta as palavras das estrelas superiores; conferir grupos longos para evitar encostar no destaque inferior.

Palavras aparecem pelos tempos reais w/s/e, com desfoque curto e deslocamento suave. Destaques são sínteses editoriais e devem corresponder à ideia dita. A câmera usa deslocamentos de aproximadamente 0,77 s com easing e um avanço leve durante a permanência. Manter componentes vizinhos visíveis durante a passagem. As decorações não devem cobrir texto, rosto ou gestos.

## Uso

Configuração central: percurso-editorial.template.json. Exemplo: vídeo com áudio, props usados e capa. A pasta do exemplo retém PNGs e snapshots do motor usado.

Motor ativo: `motion/remotion/src/biblioteca/MotionPin129Continuo.tsx` e `src/pin129/ContinuousScene.tsx`. Entry `src/pin129-continuo-index.tsx`; renderer `pin129-continuo-render.cjs`. `motionFrom` define a entrada na animação. Cada cena recebe intervalo, coordenadas x/y, asset, palavras, destaque e `captionTop`. `shots` define recortes por câmera. `outro.returnFrom` marca a volta à pessoa; `outro.logoFrom` marca o fim da fala e início da assinatura; `outro.logo` aponta para a marca real.

Renderizar com public isolado, contendo apenas vídeo, áudio, fontes, PNGs e marca necessários. Temporários no disco do projeto. Guardar props e versões anteriores. Não confundir os tempos do exemplo com os de um novo vídeo.

## Exemplo guardado

exemplo A 14.01, trecho 0–66,2 s e assinatura de 2,2 s, total 68,4 s. Pergunta 0–17,84 s; início da resposta 17,84–22,18 s; motion 22,18–62,9 s; retorno da exemplo A 62,9–66,2 s; logo 66,2–68,4 s. É um exemplo representativo do template, não o vídeo completo de 130,83 s. Assets de estudo têm 1254×1254 px nativos RGBA; marca original 1280×1280 RGBA.
