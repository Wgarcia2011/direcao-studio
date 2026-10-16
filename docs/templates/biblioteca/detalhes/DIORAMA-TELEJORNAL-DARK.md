> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Diorama Telejornal — DARK v1

Template de direção e configuração para edições políticas do **DIORAMA POLÍTICA**, derivado do Caderno Editorial DARK. Arquivo associado: diorama-telejornal-DARK.template.json. Criado em 10/10/2026 a pedido do usuário.

## Intenção visual

Linguagem de telejornal de rede, com a clareza de manchetes, tarjas e painéis informativos vista em canais como a CNN. A identidade é do Diorama: logo D branco/play amarelo, azul-marinho, branco, vermelho editorial e amarelo de destaque. Não usar logo, vinheta, assinatura sonora ou reprodução exata do pacote gráfico da CNN. Referência de categoria, não simulação de afiliação.

O vídeo real continua sendo o protagonista. Do Caderno DARK, preservar a passagem da fala para uma imagem ou painel contextual, a sincronização com a voz e a câmera que revela informações. Substituir a estética de papel colado por superfícies retas, grid de redação, linhas finas e movimentos precisos. Remover foguete, confete, coração, post-its e elementos da marca sua marca.

**Resultado desejado:** uma edição sóbria, forte no celular, em que cada animação identifica uma pessoa, situa uma data, explica um ponto ou conduz para a próxima informação. Não preencher a tela de efeitos apenas para parecer dinâmica.

## Estado de implementação — ler antes de renderizar

Implementado no projeto em 10/10/2026: `motion/remotion/src/biblioteca/MotionDioramaTelejornalDark.tsx`, módulos em `src/telejornal/` e adaptador próprio `scripts/preparar_diorama_telejornal.py`. A composição `MotionDioramaTelejornalDark` está registrada no Root principal e na entrada isolada `src/telejornal/index.tsx`. A configuração reutilizável abaixo continua contendo placeholders: preencher antes de preparar.

Tipos implementados: `speaker`, `duo`, `headline`, `context` com dois painéis e `outro`. Os demais tipos da tabela são contratos de expansão; o adaptador rejeita cenas não implementadas com erro explícito. Cada speaker precisa de `segmentIndex`; `segmentCrops` declara os recortes. O campo `audio.mix` aponta para o mix já preparado, e o compositor silencia a faixa do vídeo para não duplicar voz. `design`, `broadcast`, `assets` e `timeline` são encaminhados explicitamente às props.

Primeira aplicação: `PASTA-DA-EDICAO`. Configurações preenchidas A/B, origem das falas, amostra e relatório ficam nessa pasta. Preparar com `python scripts/preparar_diorama_telejornal.py CAMINHO/config-A.json`; renderizar pela entrada isolada com `--props=CAMINHO/props-A.json`. Fontes locais Manrope 400 substituíram 500 nesta aplicação, com registro explícito. As falas históricas permaneceram a 1×; a revisão auditiva humana ficou pendente.

O preparador existente `scripts/biblioteca_motion.py preparar` foi inspecionado: ele aceita `source`, `transcript`, `segments`, `brand`, `outro` e outros campos do Caderno, mas não encaminha os novos campos `broadcast`, `design`, `assets` ou `timeline`. Não basta executar o JSON neste preparador; isso descartaria a direção nova. Não reutilizar o ID do Caderno afirmando que o novo estilo já foi aplicado.

O Codex que executar este template deverá:

1. Ler as instruções do projeto e localizar a composição Caderno DARK e seu preparador.
2. Criar composição e adaptador próprios, reutilizando utilitários de cortes, legendas e áudio que forem compatíveis. Preservar o comportamento do template original.
3. Validar os campos deste JSON, resolver os caminhos e transferir explicitamente os novos blocos para as props. Falhar com mensagem clara para campos, assets e cenas obrigatórios ausentes; não ignorá-los silenciosamente.
4. Registrar `MotionDioramaTelejornalDark`, derivando dimensões, fps e duração das props. Só declarar renderizável após listar a composição e renderizar uma amostra.
5. Copiar este JSON para a pasta da edição, preencher a pauta, assets, fontes, recortes e tempos reais. O JSON distribuído contém placeholders e não pode ser publicado/renderizado como versão final.

## Formato e grade

Principal: **1080×1920, 30 fps**, vertical. Os retângulos do JSON usam pixels desse canvas, origem no canto superior esquerdo. Conteúdo essencial dentro de `x=64..920`, `y=160..1620`; margens são ponto de partida conservador, não garantia para toda interface. Conferir overlay de Shorts na prévia. Não apertar textos para caber: reorganizar os módulos.

Topo: editoria e identificação do arquivo. Meio: vídeo real grande ou painel. Rodapé editorial: nome/função, fonte/data, manchete e legendas em áreas distintas. Bug da marca discreto no canto inferior direito da área segura. No máximo uma manchete, uma identificação e uma legenda simultâneas. Desabilitar módulos redundantes antes de diminuir a fonte.

Uma adaptação horizontal deve reorganizar a grade em 1920×1080; não esticar ou apenas cortar o canvas vertical. Só produzir 16:9 quando solicitado.

## Identidade e tipografia

Fundo `#071426`, painel `#10243D`, linhas `#29415F`, branco `#F5F7FA`, texto secundário `#B9C7D8`, vermelho `#F50026`, amarelo `#FFC400`. Vermelho indica hierarquia editorial, não culpado ou partido. Amarelo destaca palavra ou traço de leitura, não vencedor.

Anton para chamadas curtas; Manrope 700 para nomes e manchetes de leitura; Manrope 500 para legendas e fontes. Carregar fontes locais licenciadas e verificar existência. Se faltar peso, usar substituição explicitamente registrada, sem afirmar que a fonte foi carregada. Não usar texto pequeno como textura.

Chamadas de até quatro palavras. Manchetes mais longas só em painel explicativo, até duas linhas após teste de quebra. Legendas fiéis em até duas linhas, sem transformar toda a frase em caixa alta. Testar capas a 160 px e legendas no tamanho real de um celular.

## Componentes a implementar

| Tipo | Função | Regra editorial |
| --- | --- | --- |
| `speaker` | Vídeo de uma pessoa, identificação e legenda | Preservar rosto, gesto e velocidade; reenquadrar por plano |
| `duo` | Duas fontes em painéis equivalentes | Usar apenas quando a comparação fizer sentido; não fabricar conversa simultânea |
| `headline` | Chamada de pauta sobre fundo gráfico | Texto factual, sem chamar toda pauta de urgente |
| `quote` | Frase destacada e atribuição | Citação literal conferida; não usar aspas em paráfrase |
| `document` | Documento real, zoom e destaque | URL/página/data; mostrar contexto; ilustração identificada como ilustração |
| `timeline` | Sequência de acontecimentos | Datas verificadas; omitir o módulo se não houver cronologia confirmada |
| `data` | Número ou gráfico contextualizado | Fonte, período, unidade, escala e metodologia relevante; sem valores inventados |
| `context` | PNG/SVG, frame ou diagrama explicativo | Separar fatos de hipóteses; não apresentar ilustração como evidência |
| `outro` | Marca e convite final | Um CTA, fundo limpo e pelo menos três segundos de leitura |

Cada cena declara `from`, `to`, `type`, asset e os módulos necessários. Componentes de documento/dados só podem aparecer se os respectivos campos de evidência estiverem preenchidos. Um recurso ilustrativo nunca substitui um documento real sem rótulo.

## PNGs, SVGs e animação por código

O Codex pode montar PNGs transparentes, diagramas e elementos gráficos por código, e animá-los em Remotion/SVG/Canvas. Exemplos: calendário, microfone, urna esquemática, silhueta arquitetônica, linhas de conexão e molduras. Usar camadas separadas (fundo, objeto, linhas, rótulos) para animar com controle; evitar rasterizar manchetes e legendas.

Preferir SVG ou componentes para texto, números e gráficos. PNG para fotografia, recorte real ou textura discreta; gerar no mínimo na resolução de exibição prevista, com margem para zoom. Manifestar origem, método de produção e licença. Não assumir que PNG transparente implica material livre.

IA pode gerar fundo abstrato ou objeto ilustrativo se necessário. **Nunca gerar/reconstruir rosto de pessoa real**, inventar documento, produzir falsa foto de evento ou clonar voz. Pessoas devem vir de frames/fotos reais, com máscara e ajuste determinísticos preservando expressão. Identificar imagem estática quando a montagem puder sugerir reação em tempo real.

Animações por frame e fps, sem `Math.random()` não semeado, relógio de parede ou CSS dependente de tempo real. Repetir o render deve produzir a mesma sequência. Entrada de tarja em 8 frames, transição de painel em 10, câmera de contexto em 18. Easing suave sem bounce. Zoom ilustrativo entre 1 e 1,06; ajustar se isso cortar informação. No máximo um movimento dominante por vez. Nunca animar escala de gráfico de forma que altere a leitura dos dados.

## Tempo, cortes e legendas

`segments` contém segundos absolutos da fonte única. O adaptador concatena apenas os trechos selecionados e gera a tabela de correspondência entre fonte e saída. A transcrição de entrada segue o formato do preparador: `words: [{w, s, e}]`, com tempos da fonte.

**`timeline` e todos os seus eventos usam segundos da SAÍDA**, sem incluir o encerramento. Não passar esse bloco pelo resolvedor genérico de tempos de fonte do Caderno. Validar limites, ordem, cobertura da duração e sobreposição somente quando intencional. `outro.duration` é acrescentado após a montagem. A duração de demonstração é 30 s + 3,2 s de encerramento; adaptar pela fala real.

Para várias fontes, implementar suporte explícito a um manifesto de trechos ou montar um intermediário com tabela de origem e transcrição remapeada. Não preencher `source` com várias URLs esperando que o preparador antigo suporte isso.

As cenas numéricas do JSON são exemplos de estrutura. Não autorizam encurtar uma oração, trocar a ordem de pergunta/resposta ou estender imagem labial sobre outra fala. Se a fala precisar de mais tempo, alterar a cena.

## Equilíbrio editorial

Identificar corretamente quem fala e distinguir fala do participante da afirmação do canal. Em uma comparação político A/político B, dar tratamento equivalente de enquadramento, som, cores e legibilidade, selecionando falas substantivas sobre o mesmo assunto. Durações podem variar para preservar contexto; não usar uma fala articulada de um contra um tropeço do outro. Não atribuir culpa, verdade ou vitória com efeitos visuais.

Material de 2022 deve mostrar “ARQUIVO • 2022”. Nunca escrever “AO VIVO”, “AGORA”, “EXCLUSIVO” ou “URGENTE” por estética. Usar apenas quando a condição tiver sido confirmada e for pertinente. Não criar ticker com notícias não verificadas; ticker fica desligado por padrão.

## Áudio

Voz real em primeiro plano, sem mudança de velocidade ou tom. Trilha instrumental discreta, licenciada ou original, cerca de 22 dB abaixo da voz como ponto inicial, com ducking ajustado por escuta. SFX curtos só em transições relevantes; sem aplausos/risadas/alarme adicionados. Medir clipping e loudness, mas não confundir medição com revisão auditiva. Se as ferramentas não permitirem ouvir, declarar a pendência.

## Fluxo de uso e entrega

1. Validar assets, fontes, identificação, datas e direitos; placeholders impedem versão final.
2. Selecionar falas completas e revisar legendas. Construir a timeline a partir delas.
3. Implementar/validar a composição se ainda ausente. Gerar PNGs ou SVGs necessários e registrar fontes.
4. Renderizar stills de cada tipo de cena utilizado e uma amostra com transição, legenda e áudio.
5. Conferir rostos, tarjas, fontes, contraste, áreas seguras e logo. Renderizar e revisar o MP4 integral.
6. Exportar MP4 H.264/AAC, SRT, projeto editável, capa vertical, teste a 160 px, manifesto de fontes/recortes e relatório de revisão.

Salvar cada aplicação em nova pasta. Preservar os templates originais, versões anteriores e vídeos publicados. Este template não autoriza publicação nem campanha; estilo neutro não determina elegibilidade de conteúdo político para mídia paga.

## Prompt curto de aplicação

“Use DIORAMA-TELEJORNAL-DARK.md e diorama-telejornal-DARK.template.json. Leia a seção de implementação; crie a composição e o adaptador se ainda ausentes. Aplique à pauta e aos materiais fornecidos, criando PNGs/SVGs e animações por código quando ajudarem a explicar a fala. Preserve fatos, contexto e pessoas reais. Entregue os renders e projeto editável em pasta nova, sem publicar.”
