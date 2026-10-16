> Guia trazido do editor web anterior. Os templates e comandos atuais estão em [docs/templates](../templates/README.md).

# Catálogo de tipografia para legendas

Referência principal para agentes de edição do Direção Studio. Direção aprovada por o professor: combinar fontes e tamanhos e usar **10 ou mais combinações distintas por vídeo completo**, com unidade visual. Catálogo com 30 propostas reutilizáveis.

## Escopo e uso pelo agente

Consulte este arquivo ao planejar ou revisar legendas. A instrução específica do usuário e a direção já aprovada do projeto prevalecem. Aplicar este catálogo não autoriza mudar cortes, tracking, cor, áudio ou conteúdo.

### Quantidade por vídeo

Planejar pelo menos 10 combinações distintas em cada vídeo completo. Como ponto de partida, selecionar 12 IDs do catálogo. A amostra curta não precisa mostrar todas as combinações.

### Identidade visual

Usar uma paleta principal e até três famílias no mesmo vídeo. A diversidade deve vir também de composição, peso, tamanho, caixa e movimento; dez combinações não exigem dez famílias de fonte.

### Escolha pela fala

Trocar a combinação em uma mudança de ideia ou unidade de sentido. Não sortear estilos palavra por palavra. Repetir as combinações que ajudam a leitura e intercalar momentos de descanso.

### Sincronização e sentido

Preservar a ordem e os tempos reais por palavra. Não separar negações de modo que a frase pareça afirmar o contrário. Exemplos deste catálogo ilustram o desenho; só entram no vídeo quando existirem na fala.

### Escala para 1080 por 1920

Os tamanhos em pixels são pontos de partida, não limites fixos. Apoio entre 58 e 78 px; destaque entre 96 e 142 px. Ajustar pela largura da palavra e testar no celular; evitar reduzir tudo para caber.

### Área segura

Começar entre 68% e 80% da altura e com 8% de margem lateral. Deslocar o bloco conforme rosto, gestos e interface de destino. Usar até três linhas apenas quando a hierarquia justificar e couber com folga.

### Movimento

Em 30 fps, começar com entradas de 5 a 8 frames. Usar um movimento principal por bloco e saídas discretas. Não forçar uma troca rápida só para alcançar a quantidade de combinações.

### Execução e revisão

Os IDs TIPO são propostas de direção, não nomes de comandos da CLI. Verificar quais recursos existem, adaptar ou implementar com testes sintéticos quando necessário e registrar os IDs realmente usados. Gerar amostra antes da exportação.

Se o vídeo tiver poucas unidades de fala para comportar dez combinações legíveis, sinalize o conflito em vez de acelerar as trocas artificialmente. Para vídeos longos, distribua as combinações pelo vídeo inteiro e permita recorrência.

### Base visual aprovada

Manrope Bold com Georgia Bold Italic, em branco e creme, é a base aprovada da revisão 9. Manrope Regular e Sora Bold ampliam o repertório mantendo três famílias. Arquivos locais: `manrope-400.ttf`, `manrope-700.ttf`, `sora-700.ttf` e `editorial-bold-italic.ttf`, em `motion/remotion/public/fonts/`. O arquivo editorial contém Georgia Bold Italic.

Paleta inicial: branco `#FFFFFF`, creme `#FFF0CF` e sombra escura. Marcadores podem usar o creme sobre fundo escuro; evitar acrescentar uma cor nova a cada bloco.

O preset `editorial-misto` é a base já implementada. As outras propostas não devem ser anunciadas como 30 presets prontos sem verificação. Tamanhos abaixo são em pixels da composição 1080×1920. Os exemplos visuais são estáticos; o movimento está descrito em texto.

## Catálogo das 30 combinações

### TIPO-01 Palavra em itálico

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 64 / 132 px, na ordem das hierarquias descritas.
- **Composição:** Apoio pequeno acima e abaixo; uma palavra central grande em itálico.
- **Movimento:** Entrada vertical de 6 frames; realce discreto na palavra falada.
- **Quando usar:** Recomendação ou afirmação pessoal.
- **Exemplo de composição:** “eu aconselho muito”.

### TIPO-02 Inversão editorial

- **Fontes:** Georgia Bold Italic + Sora Bold.
- **Tamanhos iniciais:** 62 / 112 px, na ordem das hierarquias descritas.
- **Composição:** A introdução fica em itálico; a conclusão maior, reta e em caixa alta.
- **Movimento:** A conclusão aparece no início da sua palavra, sem mover a introdução.
- **Quando usar:** Conclusão curta depois de uma preparação.
- **Exemplo de composição:** “uma ideia FORTE”.

### TIPO-03 Dois pesos retos

- **Fontes:** Manrope Regular + Manrope Bold.
- **Tamanhos iniciais:** 62 / 104 px, na ordem das hierarquias descritas.
- **Composição:** Uma linha leve precede a linha principal em negrito; sem itálico.
- **Movimento:** Revelação por linha, com cor sincronizada por palavra.
- **Quando usar:** Explicação objetiva entre destaques mais expressivos.
- **Exemplo de composição:** “entenda o básico”.

### TIPO-04 Geometria e gesto

- **Fontes:** Sora Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 70 / 124 px, na ordem das hierarquias descritas.
- **Composição:** Texto reto em duas palavras compactas e final itálico maior.
- **Movimento:** O final cresce de 96% a 100% em 5 frames.
- **Quando usar:** Mudança de ideia ou palavra com carga emocional.
- **Exemplo de composição:** “faz a diferença”.

### TIPO-05 Termo isolado

- **Fontes:** Manrope Regular + Georgia Bold Italic.
- **Tamanhos iniciais:** 58 / 142 px, na ordem das hierarquias descritas.
- **Composição:** Uma palavra dominante ocupa a segunda linha; conectivos menores.
- **Movimento:** O termo entra por opacidade; o bloco mantém a mesma posição.
- **Quando usar:** Um conceito que merece pausa visual.
- **Exemplo de composição:** “com qualidade”.

### TIPO-06 Coluna à esquerda

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 66 / 118 px, na ordem das hierarquias descritas.
- **Composição:** Duas linhas alinhadas pela esquerda; final em itálico, com recuo zero.
- **Movimento:** Deslocamento horizontal de até 12 px, durante 6 frames.
- **Quando usar:** Trecho com espaço livre lateral abaixo do rosto.
- **Exemplo de composição:** “professores de qualidade”.

### TIPO-07 Coluna à direita

- **Fontes:** Sora Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 66 / 118 px, na ordem das hierarquias descritas.
- **Composição:** Apoio reto e palavra grande alinhados à direita.
- **Movimento:** Revelação de baixo para cima, sem saltos entre palavras.
- **Quando usar:** Contraponto a uma composição anterior alinhada à esquerda.
- **Exemplo de composição:** “em boas mãos”.

### TIPO-08 Escada de tamanhos

- **Fontes:** Manrope Bold + Sora Bold.
- **Tamanhos iniciais:** 58 / 82 / 112 px, na ordem das hierarquias descritas.
- **Composição:** Três linhas crescem de tamanho; a linha final recebe maior peso.
- **Movimento:** Cada linha entra na sua fala; não exibir a conclusão antes do tempo.
- **Quando usar:** Progressão verbal com até três unidades de sentido.
- **Exemplo de composição:** “aprender praticar evoluir”.

### TIPO-09 Escada descendente

- **Fontes:** Sora Bold + Manrope Regular.
- **Tamanhos iniciais:** 112 / 78 / 58 px, na ordem das hierarquias descritas.
- **Composição:** A palavra de abertura é grande; a explicação desce em tamanho.
- **Movimento:** Abertura firme e explicação por opacidade, sem novo zoom.
- **Quando usar:** Um termo forte seguido de esclarecimento.
- **Exemplo de composição:** “FOCO no essencial”.

### TIPO-10 Duas colunas curtas

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 70 / 106 px, na ordem das hierarquias descritas.
- **Composição:** Primeira unidade à esquerda; complemento itálico à direita, mesma base.
- **Movimento:** A segunda coluna surge quando seu trecho começa.
- **Quando usar:** Duas unidades curtas que cabem sem reduzir demais a fonte.
- **Exemplo de composição:** “teoria e prática”.

### TIPO-11 Linha compartilhada

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 66 / 110 px, na ordem das hierarquias descritas.
- **Composição:** Texto menor e palavra itálica grande compartilham a linha de base.
- **Movimento:** Apenas a palavra ativa muda suavemente de opacidade.
- **Quando usar:** Frase de duas ou três palavras, sem quebra forçada.
- **Exemplo de composição:** “muito confiável”.

### TIPO-12 Serifada entre linhas

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 60 / 126 / 60 px, na ordem das hierarquias descritas.
- **Composição:** A palavra principal fica entre duas linhas menores, com entrelinha curta.
- **Movimento:** Bloco estável; o destaque é revelado no seu início real.
- **Quando usar:** Uma palavra central cercada de conectivos.
- **Exemplo de composição:** “eu indico também”.

### TIPO-13 Faixa só no apoio

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 62 / 122 px, na ordem das hierarquias descritas.
- **Composição:** A linha pequena recebe faixa escura; a palavra grande fica livre.
- **Movimento:** Faixa abre em 6 frames; itálico entra por opacidade.
- **Quando usar:** Fundo claro ou movimentado atrás do apoio.
- **Exemplo de composição:** “com bons professores”.

### TIPO-14 Marcador localizado

- **Fontes:** Manrope Bold + Sora Bold.
- **Tamanhos iniciais:** 68 / 100 px, na ordem das hierarquias descritas.
- **Composição:** Uma palavra em caixa alta recebe marcador creme; o resto permanece livre.
- **Movimento:** Marcador acompanha a palavra ativa; sem troca de posição do bloco.
- **Quando usar:** Orientação prática ou informação que precisa ser retida.
- **Exemplo de composição:** “olhe com ATENÇÃO”.

### TIPO-15 Sublinhado de conclusão

- **Fontes:** Manrope Regular + Georgia Bold Italic.
- **Tamanhos iniciais:** 62 / 118 px, na ordem das hierarquias descritas.
- **Composição:** A conclusão itálica recebe sublinhado fino, distante das letras.
- **Movimento:** O sublinhado se desenha durante a palavra e permanece até o bloco sair.
- **Quando usar:** Fechamento de uma frase importante.
- **Exemplo de composição:** “vale a pena”.

### TIPO-16 Contorno e preenchimento

- **Fontes:** Sora Bold + Manrope Bold.
- **Tamanhos iniciais:** 106 / 62 px, na ordem das hierarquias descritas.
- **Composição:** Termo principal em contorno; apoio menor sólido.
- **Movimento:** O contorno recebe preenchimento na palavra falada, sem piscar.
- **Quando usar:** Ênfase pontual em fundo escuro e limpo.
- **Exemplo de composição:** “UMA escolha”.

### TIPO-17 Dupla sobre faixas

- **Fontes:** Sora Bold + Manrope Regular.
- **Tamanhos iniciais:** 96 / 62 px, na ordem das hierarquias descritas.
- **Composição:** Título reto em faixa clara; complemento leve em faixa escura separada.
- **Movimento:** Faixas entram em sequência com diferença guiada pela fala.
- **Quando usar:** Frase de orientação com duas partes bem definidas.
- **Exemplo de composição:** “comece pelo básico”.

### TIPO-18 Assinatura itálica

- **Fontes:** Sora Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 96 / 72 px, na ordem das hierarquias descritas.
- **Composição:** Uma afirmação reta grande recebe um complemento itálico menor no canto.
- **Movimento:** Primeiro a afirmação; depois o complemento, sem animação elástica.
- **Quando usar:** Comentário pessoal, ressalva curta ou encerramento.
- **Exemplo de composição:** “INDICO de verdade”.

### TIPO-19 Caixa alta e minúsculas

- **Fontes:** Sora Bold + Manrope Regular.
- **Tamanhos iniciais:** 102 / 62 px, na ordem das hierarquias descritas.
- **Composição:** Palavra principal em caixa alta; conectivos e complemento em minúsculas.
- **Movimento:** Realce de cor apenas na palavra atual; sem movimento do bloco.
- **Quando usar:** Trechos explicativos que precisam de contraste sem ornamentação.
- **Exemplo de composição:** “QUALIDADE no ensino”.

### TIPO-20 Destaque recuado

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 66 / 120 px, na ordem das hierarquias descritas.
- **Composição:** A linha maior começa ligeiramente depois da linha de apoio.
- **Movimento:** Recuo fixo de 40 a 70 px; entrada por opacidade.
- **Quando usar:** Quebra da simetria sem trocar as fontes do vídeo.
- **Exemplo de composição:** “o próximo passo”.

### TIPO-21 Peso crescente

- **Fontes:** Manrope Regular + Manrope Bold + Sora Bold.
- **Tamanhos iniciais:** 66 / 78 / 98 px, na ordem das hierarquias descritas.
- **Composição:** Três unidades ganham peso e tamanho progressivamente, na ordem falada.
- **Movimento:** Cada unidade entra uma vez; a última sustenta o encerramento.
- **Quando usar:** Enumeração curta existente na fala.
- **Exemplo de composição:** “ver entender aplicar”.

### TIPO-22 Nome em destaque

- **Fontes:** Manrope Regular + Sora Bold.
- **Tamanhos iniciais:** 60 / 112 px, na ordem das hierarquias descritas.
- **Composição:** O contexto fica pequeno; o nome de pessoa ou marca ganha tamanho.
- **Movimento:** Entrada limpa; nenhuma deformação nas letras do nome.
- **Quando usar:** Nome confirmado na transcrição, com grafia revisada.
- **Exemplo de composição:** “professor exemplo C”.

### TIPO-23 Pergunta em duas vozes

- **Fontes:** Manrope Regular + Georgia Bold Italic.
- **Tamanhos iniciais:** 66 / 126 px, na ordem das hierarquias descritas.
- **Composição:** A abertura da pergunta é reta; a palavra decisiva fica grande em itálico.
- **Movimento:** A pergunta se revela por unidades; manter o ponto de interrogação.
- **Quando usar:** Pergunta efetivamente feita pelo falante.
- **Exemplo de composição:** “por onde começo?”.

### TIPO-24 Ressalva com peso

- **Fontes:** Sora Bold + Manrope Regular.
- **Tamanhos iniciais:** 108 / 64 px, na ordem das hierarquias descritas.
- **Composição:** A negação ou condição aparece forte; a explicação fica menor.
- **Movimento:** Negação e complemento entram juntos quando separar mudaria o sentido.
- **Quando usar:** Ressalva, limite ou condição importante.
- **Exemplo de composição:** “SEM promessa pronta”.

### TIPO-25 Dois polos

- **Fontes:** Manrope Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 92 / 100 px, na ordem das hierarquias descritas.
- **Composição:** Primeiro termo reto e segundo itálico, separados por uma linha pequena.
- **Movimento:** Cada polo é revelado no seu tempo; o primeiro permanece como contexto.
- **Quando usar:** Contraste ou alternativa sustentados pela fala.
- **Exemplo de composição:** “iniciante ou avançado”.

### TIPO-26 Citação discreta

- **Fontes:** Georgia Bold Italic + Manrope Regular.
- **Tamanhos iniciais:** 110 / 60 px, na ordem das hierarquias descritas.
- **Composição:** Trecho citado em itálico; atribuição menor apenas se realmente mencionada.
- **Movimento:** Entrada suave do trecho; atribuição sem animação adicional.
- **Quando usar:** Citação literal curta ou reprodução de uma pergunta.
- **Exemplo de composição:** “qual curso você fez?”.

### TIPO-27 Centro com detalhe lateral

- **Fontes:** Sora Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 106 / 66 px, na ordem das hierarquias descritas.
- **Composição:** Palavra central reta grande e complemento itálico menor ao lado inferior.
- **Movimento:** Detalhe entra após a palavra central, respeitando sua ordem de leitura.
- **Quando usar:** Conclusão de duas unidades curtas.
- **Exemplo de composição:** “MATERIAL gratuito”.

### TIPO-28 Crescimento sem troca de fonte

- **Fontes:** Manrope Bold + Manrope Regular.
- **Tamanhos iniciais:** 110 / 62 px, na ordem das hierarquias descritas.
- **Composição:** Verbo maior em negrito; objeto menor em peso regular, ambos retos.
- **Movimento:** Escala de 97% a 100% no verbo; objeto entra por opacidade.
- **Quando usar:** Instrução ou ação concreta, para descansar a serifada.
- **Exemplo de composição:** “procure a equipe”.

### TIPO-29 Final amplo

- **Fontes:** Sora Bold + Georgia Bold Italic.
- **Tamanhos iniciais:** 70 / 128 px, na ordem das hierarquias descritas.
- **Composição:** Apoio reto compacto; última palavra itálica ocupa a largura disponível.
- **Movimento:** A última palavra expande o espaçamento até o valor final, de forma sutil.
- **Quando usar:** Conclusão curta no fim de um raciocínio.
- **Exemplo de composição:** “fez diferença”.

### TIPO-30 Respiro editorial

- **Fontes:** Manrope Regular + Georgia Bold Italic.
- **Tamanhos iniciais:** 66 / 86 px, na ordem das hierarquias descritas.
- **Composição:** Apoio leve e uma palavra itálica moderada; composição pequena e arejada.
- **Movimento:** Sem deslocamento; somente entrada e saída por opacidade.
- **Quando usar:** Trecho de transição entre dois momentos fortes.
- **Exemplo de composição:** “na minha caminhada”.

## Seleção de 12 combinações para o depoimento atual

Plano de aplicação para a edição de exemplo B sobre o sua marca. Os trechos abaixo são âncoras de localização; conferir a transcrição e o áudio no momento de aplicar. Não são novos textos para substituir a fala. Esta seleção não altera a timeline por si só.

| Combinação | Âncora da fala | Intenção |
|---|---|---|
| TIPO-01 | eu aconselho muito o sua marca | Abertura pessoal com a mistura já aprovada. |
| TIPO-02 | eu sou professor | Inverter a hierarquia e dar força à qualificação. |
| TIPO-05 | ser mentorado | Isolar o conceito principal. |
| TIPO-06 | professores de qualidade | Deslocar a composição para a esquerda. |
| TIPO-30 | minha vida inteira | Criar descanso visual depois da ênfase. |
| TIPO-22 | professor exemplo C | Valorizar o nome confirmado sem inventar sobrenome na fala. |
| TIPO-25 | concurseiro avançado e concurseiro iniciante | Marcar o contraste entre os públicos, conforme a fala revisada. |
| TIPO-15 | vale muito a pena | Sublinhar a conclusão sem novo efeito de câmera. |
| TIPO-24 | não prometer | Manter a ressalva legível junto de seu complemento. |
| TIPO-11 | muito confiável | Usar duas escalas na mesma linha. |
| TIPO-23 | por onde eu começo | Mudar a composição quando entrar a pergunta reproduzida. |
| TIPO-27 | material gratuito | Combinar uma palavra reta grande com o complemento itálico. |

## Procedimento de aplicação em cada vídeo

1. Ler a transcrição inteira e marcar frases, ressalvas, perguntas, nomes e conclusões.
2. Selecionar no mínimo 10 IDs distintos, preferencialmente 12, e registrar a escolha com os intervalos reais da saída editada.
3. Distribuir os IDs entre abertura, explicação e fechamento. Intercalar desenhos expressivos com TIPO-03, TIPO-19, TIPO-28 ou TIPO-30.
4. Conferir recursos na CLI e no código. Não inventar parâmetros. Se for preciso implementar algo, usar fixtures sintéticas e executar os testes exigidos pelo projeto.
5. Aplicar pela timeline versionada, preservando tempos por palavra e o restante da edição aprovada.
6. Gerar uma amostra com pelo menos três combinações representativas e uma transição entre elas. Preservar os renders anteriores.
7. Inspecionar o MP4: rosto livre, palavras inteiras, ordem correta, contraste e sincronização. Contar IDs distintos na edição completa; alternar cores ou repetir o mesmo desenho não conta como uma nova combinação.
8. Apresentar a amostra atual e aguardar aprovação explícita antes de exportar o vídeo completo.

## Registro sugerido

Para cada aplicação, registrar: `ID da combinação | início e fim na saída | palavras exatas | fontes | tamanhos | posição | movimento | status da revisão`. Os intervalos só podem ser preenchidos a partir da transcrição e da montagem reais.

## Referência visual

O PDF complementar fica em `output/pdf/30-combinacoes-de-legendas.pdf`. Este Markdown é a referência operacional; o PDF apresenta os mesmos 30 IDs com miniaturas e uma seleção de 12 combinações.
