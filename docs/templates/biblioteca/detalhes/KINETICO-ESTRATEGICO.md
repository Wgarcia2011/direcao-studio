> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Cinético Estratégico — template v1

Combina [Kinetic Typography & Motion Design Reel](https://br.pinterest.com/pin/12947917676306751/) com [Web Rank Studio](https://br.pinterest.com/pin/924363892282992611/). Composição Remotion: `MotionKineticoEstrategico`, 1080×1920, 30 fps.

## Direção combinada

- Base clara com grade fina, gráfico que cresce e caminhos desenhados progressivamente, inspirados na primeira referência.
- Alternância clara/roxa, serifada itálica, palavras de impacto e objeto central como metáfora, inspirados na segunda.
- Duas famílias locais: Editorial Bold Italic e Manrope Bold. Texto de apoio grande, adequado à leitura no celular.
- Entrada em cascata de palavras, ênfase com overshoot contido, objeto com escala e deslocamento, permanência de leitura e saída por varredura vertical.
- Alvo, cartões, gráfico, TV e órbitas são SVGs editáveis. O repertório é próprio: não copia ilustrações, vídeos ou a marca dos autores.

Análise por amostragem no navegador, sem revisão integral com áudio. Primeira referência: contador/cérebro em torno de 3,7–3,9 s e gráfico em torno de 11,3 s. A mudança do contador foi observada em reprodução; a captura do gráfico comprova composição, não sua curva de entrada. Segunda: cena roxa em torno de 3,3 s; TV em 6,9–7,2 s, com imagem surgindo na tela em reprodução; gráfico em mídia em torno de 12,8 s; saída e assinatura em torno de 17,8–19 s. Os timings implementados são uma adaptação, não medições quadro a quadro dos originais.

## Arquivos e uso

`kinetico-estrategico.template.json` contém props prontas da demonstração: cinco cenas de quatro segundos. A amostra usa textos autorais ilustrativos, sem voz ou música. Não representa a fala de um entrevistado nem estatísticas reais; as barras não têm valores quantitativos.

Abra `MotionKineticoEstrategico` no Studio e edite os props, ou copie o JSON para a pasta MOTION do vídeo escolhido. Cada cena contém:

| Campo | Uso |
|---|---|
| `duration` | Duração em segundos, de 2 a 30; a sequência é cumulativa |
| `mode` | `paper` ou `accent` |
| `lead` | Frase serifada, até 52 caracteres |
| `emphasis` | Destaque sans, até 28 caracteres |
| `caption` | Complemento editorial, até 72 caracteres |
| `art` | `target`, `cards`, `graph`, `tv` ou `orbit` |
| `asset` | PNG/JPEG/WebP relativo a `public/`; vazio usa o SVG |
| `labels` | Até três rótulos dos cartões, com até 16 caracteres |

No topo: `paper`, `ink`, `accent`, `secondary` controlam a paleta; `audio` recebe caminho relativo a `public/`, ou vazio para silêncio. Ao alterar cores, conferir contraste. Limites de caracteres não substituem inspeção visual: quebrar frases longas em cenas e evitar destaque com uma única palavra muito longa.

Este template é uma composição de motion em tela cheia. Para aplicação a vídeo com fala, substitua textos e durações pela transcrição real e mantenha o áudio aprovado. A sincronização é manual; não há mapeamento automático de palavras. Não use o script `preparar-motion-template.py`: este modelo recebe props diretamente e tem esquema próprio. Alternar com planos do falante requer montagem no projeto do vídeo.

### Aplicação com fala e PNGs — exemplo A 21

Versão genérica salva em kinetico-estrategico-fala-png.template.json. Os três PNGs e seus prompts estão em `assets/kinetico-estrategico/`, nesta pasta central; as cópias utilizadas pelo Remotion estão em `public/motion-assets/kinetico-estrategico/`. Substitua os caminhos de vídeo/áudio, duração, recortes e todos os textos/intervalos ilustrativos pela fala real. `previewFrom` e `previewDuration` selecionam a amostra; ambos em zero usam o vídeo inteiro. Os tempos de `shots` e `inserts` são segundos do vídeo preparado, e não da amostra. Este modelo recebe props diretamente pelo script `kinetico-fala-render.cjs`.

O componente `MotionKineticoFala.tsx` alterna o vídeo original com as mesmas cenas do template, mantém áudio contínuo e permite intervalos `from`/`to`, recortes por câmera e prévia de um trecho. Entrada: `src/kinetico-fala-index.tsx`; render: `kinetico-fala-render.cjs props.json NOVA-SAIDA.mp4`. Props, plano, briefing e PNGs da primeira aplicação estão em `PASTA-DA-EDICAO`. A prévia usa três PNGs transparentes gerados nativamente em 1254×1254. O vídeo completo de 125,667 s está preparado nos props e aguarda revisão da prévia; não é uma aplicação já aprovada.

## Prévia e render

Na pasta `motion/remotion`:

```powershell
node node_modules/@remotion/cli/remotion-cli.js studio src/kinetico-preview.tsx --no-open
node kinetico-preview.cjs
```

O segundo comando gera cinco stills e uma amostra de 20 segundos a 540×960 nesta pasta. Para outro JSON, passe seu caminho como argumento; o script grava novamente os arquivos de amostra v1. Preserve versões aprovadas antes de rodar novamente.

Para exportação final em 1080×1920, após revisar a prévia do vídeo escolhido:

```powershell
node node_modules/@remotion/cli/remotion-cli.js render src/kinetico-preview.tsx MotionKineticoEstrategico "CAMINHO/NOVA-SAIDA-v1.mp4" --props="CAMINHO/props.json"
```

O script de amostra usa o bundler via API. O render neste ambiente precisou de permissão para conectar ao Chromium em localhost; a restrição inicial ocorreu tanto no CLI quanto na API. A duração final é calculada pela soma das cenas. Confira texto, entrada, permanência, saída e áudio da aplicação antes do render completo, conforme preferência já registrada no catálogo.
