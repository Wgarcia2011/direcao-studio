> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Caderno Editorial — DARK v1

Versão escura do Caderno Editorial, 1080×1920, 30 fps. Composição `MotionCadernoEditorialDark`.
Template reutilizável. Primeira aplicação: exemplo A 18.00, em 09/10/2026.

Mantém a linguagem do Caderno Editorial: vídeo vivo vira foto colada, câmera percorre a mesma página, desenhos entram com lápis/tinta/cor e legendas acompanham a fala. O template claro continua disponível.

## Paleta

Página `#060b1f`, folhas `#111e3b`, tinta `#e4edff`, grafite `#7185a1`, azul da marca `#000068`, turquesa `#00d0b8`, texto `#f1f5ff`. O marca-texto usa texto azul-marinho sobre turquesa para manter contraste. Fotos preservam as cores originais.

## Recursos novos

- `marginRocket`: SVG do foguete da marca adaptado à página escura. `marginRocketScale: 1.2` aumenta em 20% o foguete de margem.
- `rocketTransitions`: tempos em segundos da fonte; foguete e rastro passam pela tela em 0,85 s. Use apenas em mudanças relevantes.
- `identity`: `{from,to,name,detail}` com identificação confirmada pelo usuário.
- `outro`: `{duration,src,title}` acrescenta encerramento com logo. A preparação calcula `from` no fim da fala.
- `art: pdfScreen`: tela de computador/PDF ilustrada. `personName` usa nome confirmado; eventos `search` e `highlight` sincronizam busca e descoberta. É uma representação, não uma reprodução do documento oficial.
- `art: rioMap`: costa municipal Rio–Niterói e travessia esquemática; evento `route` anima o percurso da barca.
- `art: emotion`: coração, pulsação e lágrimas; `calm` muda para conquista/“valeu a pena”.
- `art: postits`: notas de estudo; `store` guarda as fichas.
- `art: posse`: termo ilustrativo, data em `label`, assinatura `sign` e comemoração `celebrate`. Não inventar data, nome, cargo ou colocação.
- `type: photoCrop`: enquadra uma imagem fornecida, sem alterar o original, usando `crop:{x,y,w,h,imageW,imageH}`.

## Áudio

SFX locais Kenney Interface (CC0), normalmente 8–12 dB abaixo da voz local. `music` define `tempo`, `voiceGapDb` e `emphasisWindows` (tempos da saída). `scripts/mixar-caderno-dark.py SLUG` compõe trilha instrumental original com teclado/pads, aplica ducking e soma ao mix de voz/SFX. Salva trilha, stem de música e relatório de nível. Na primeira aplicação: 72 BPM e música cerca de 22 dB abaixo da voz, com crescendos suaves e resolução na logo.

## Preparação e conferência

1. Copiar o JSON para a pasta do vídeo; ajustar fonte, transcrição e tempos pela fala real.
2. Conferir rosto e trocas de câmera. Usar imagens fornecidas com enquadramento que preserve a pessoa.
3. `python scripts/biblioteca_motion.py preparar CAMINHO/template.json`
4. Agrupar legendas em até três linhas; o exemplo tem `qa/agrupar-legendas.py`.
5. `python scripts/mixar-caderno-dark.py SLUG`
6. Renderizar quadros e trecho representativo, conferir PDF, mapa, fotos, transições e texto. Exportar o vídeo solicitado.
7. Decodificar o MP4 inteiro, medir áudio/ducking, conferir início/fim e retranscrever a saída.

Exemplo completo: `PASTA-DA-EDICAO`.

## Mapa e materiais da primeira aplicação

Limites municipais: [Malhas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3), consultadas em 09/10/2026. O mapa é uma vista esquemática da Baía de Guanabara; a rota destaca a ligação de barcas [Praça Araribóia–Praça XV](https://geo.niteroi.rj.gov.br/arcgis/rest/services/dadosabertos/PlanoDiretor/FeatureServer/60). Não indica tempo de viagem nem itinerário de navegação.

Fotografias e identificação foram fornecidas pelo usuário: exemplo A Guimarães, 33º lugar para Analista Judiciário do TJRJ. As imagens do post “Dia um / Um dia” foram enquadradas para estudos e conquista. A data de 24 de agosto vem da fala; nenhum ano foi acrescentado.
