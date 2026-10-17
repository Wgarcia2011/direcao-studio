# Direção editorial de película no Direção Studio

Adaptação de uso local do pacote identificado como `editorial-film-edit`,
analisado em 17/10/2026. Este guia registra a integração ao projeto; não
reproduz o pacote nem oferece seus módulos como parte da distribuição.

Atualização: há uma [adaptação executável](../../../docs/templates/editorial-film/README.md)
em `scripts/editorial_film.py`. Ela aplica as correções abaixo em cópias locais,
sem modificar o pacote original. As limitações desta análise descrevem o ZIP;
o README do template registra os recursos efetivamente implementados.

## Quando aplicar

Use quando o briefing pedir linguagem editorial de arquivo: imagem com textura
de película, destaques tipográficos na fala, legendas progressivas ou divisão
entre apresentador e material de apoio. Escolha os recursos que servem à mensagem;
o estilo não determina o assunto, o ritmo ou a montagem de todo vídeo.

Sem pedido de cortes, preserve fala, ordem, pausas, duração, proporção e som.
Em uma revisão visual, mantenha o áudio aprovado e trabalhe em uma nova versão.
Confira palavras, números e citações no material atual. Referências históricas
e imagens ilustrativas precisam de procedência e termos de uso registrados.

## Recursos locais e limites

A cópia preservada fica em `skills-locais/editorial-film-edit/`, relativa à
raiz do repositório ativo, ignorada pelo Git. O arquivo
`importacao.local.json` registra origem e SHA256 do ZIP e de cada arquivo.
Não execute ou publique o pacote como parte da instalação do projeto.

| Arquivo em `implementation/browser-reference/` | Utilidade observada | Dependência ou limite |
| --- | --- | --- |
| `engine.js` | Interpolação, câmera, recorte e tempo discretizado para texto | Funções auxiliares; não monta nem exporta um vídeo |
| `typeLayers.js` | Destaques, entradas, saídas e movimento contínuo por camada | DOM, CSS e dados de texto/tempos do projeto |
| `captions.js` | Revelação por palavra e medição das legendas | DOM/canvas, fontes carregadas e transcrição sincronizada |
| `split-layout.js` | Geometria de painel e entrada lateral | Precisa de compositor e recorte do apresentador |
| `picture.js` | Pós-processamento com grão, bloom e tratamentos de cor | Canvas/WebGL; não fornece montagem das cenas nem máscaras do sujeito |
| `fonts.js` | Papéis sans, serif e mono | Apenas nomes/fallbacks; nenhum arquivo de fonte incluído |
| `reel.css` | Aparência das camadas DOM | Palco fixo e seletores do projeto original exigem adaptação |

O ZIP traz oito arquivos úteis: o SKILL.md e os sete módulos acima. Os guias
`style-guide.md`, `reference-map.md`, `revision-checklist.md` e
`implementation-guide.md`, o manifesto de mídia, as fotos, os vídeos e os
quadros citados não foram incluídos. Não afirme ter visto essas referências
nem tente abri-las como se existissem. Os comentários sobre versões anteriores
descrevem outro trabalho; suas métricas e revisões não validam este projeto.

Não há licença de redistribuição no ZIP. Preserve os arquivos de origem em
uso local privado. Se a cópia não estiver disponível, este guia continua útil
para planejamento, mas não representa uma instalação dos módulos.

## Aplicação na arquitetura atual

1. Registre o tratamento desejado no plano da central, com intervalos reais,
   zonas livres para rosto/legenda e o motor escolhido pelo usuário.
2. Faça cortes, organização, histórico e montagem final exclusivamente no
   Concat. Não importe uma timeline ou interface de navegador alternativa.
3. Para motions, siga `docs/MOTION.md` e a rota Remotion/HyperFrames da skill
   principal. Os módulos DOM/canvas podem orientar uma peça HyperFrames local,
   mas precisam de integração ao relógio e contrato de mídia do framework.
   No Remotion, adapte a lógica para frames/componentes; não assuma que importar
   as classes DOM torna a peça compatível. Respeite a escolha do motor.
4. Guarde fontes da peça, parâmetros visuais, mídias e mapa de tempos separados.
   Importe o asset resultante no Concat sem duplicar voz ou legendas.

O estilo não altera os esquemas dos planos, comandos RPC ou templates existentes.
Não acrescente campos desconhecidos aos JSONs usados pelos scripts. Detalhes
editoriais podem ficar em notas locais anexas ao plano.

## Cuidados ao adaptar os módulos

- Use fps e dimensões do projeto atual. Há defaults distintos no pacote:
  `picture.js` assume 25 fps, `typeLayers.js` assume 1080×1920 e o CSS define
  palco 1920×1440. Esses valores não definem o formato do novo vídeo.
- Resolva fontes disponíveis e licenciadas antes de medir texto. As famílias
  citadas incluem fontes comuns no macOS; a aparência no Windows pode mudar.
  Mantenha os mesmos tokens no DOM e canvas e confira quebras e margens.
- Use tempos absolutos medidos na fala. Texto que atravessa um corte deve
  continuar seu movimento; só a animação tipográfica recebe tempo discretizado,
  quando desejado. Não reduza o fps do vídeo para obter esse efeito.
- Separe o tratamento do material de apoio do apresentador. O retângulo de
  grão de `picture.js` não é uma máscara de pessoa. Recorte/segmentação exige
  recursos e validação próprios; não prometa remoção de fundo pronta.
- Confirme WebGL no renderer antes de usar o pós-processamento. O código acessa
  o contexto sem fallback e a saída do shader é opaca; isso não entrega alfa
  pronto para sobrepor no Concat. Teste codec e importação se precisar de alfa.
- Ao adaptar, verifique busca fora de ordem: `captions.js` guarda posição em
  `c._y`, enquanto `typeLayers.js` mantém estilos e wrappers. Esses estados
  exigem revisão para que render e prévia coincidam ao voltar no tempo.

## Verificação antes de usar em um vídeo

Primeiro valide qualquer implementação nova com fixtures sintéticas: fundos
claros/escuros, texto, grão, painel e máscara se houver. Confira também o mesmo
instante após avançar e retroceder, fontes carregadas e ausência de distorção.
Os módulos foram inspecionados como referência; não foram certificados por um
render visual nesta integração.

Para uma edição real, examine movimento, som, bordas, transições, sincronismo,
legibilidade e metadados da amostra atual. Não substitua assistir/ouvir por
contact sheets ou métricas. A exportação final pelo chat continua dependente
da aprovação humana explícita dessa amostra, conforme `docs/CLI.md`.
