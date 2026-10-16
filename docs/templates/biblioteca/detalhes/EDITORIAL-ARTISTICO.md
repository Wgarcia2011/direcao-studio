> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Editorial Artístico — revisão V7

Status: versão para análise do usuário. Composição MotionEditorialArtistico, 1080×1920, 30 fps. Preserva os modelos anteriores. A V6 foi rejeitada quanto às transições, imagens e tipografia neste projeto.

## Referências e limites da análise

Principal: https://br.pinterest.com/pin/1092545190885201921/ . Capturas enviadas pelo usuário mostram frase em branco sobre quem fala (serif bold italic nos conectores e sans forte nas ideias), objeto central sobre vinheta cinza, arcos diagonais e texto dividido acima/abaixo do objeto. Amostragem anterior em reprodução mostrou revelação com desfoque em palavras e mudanças de imagem. Não houve acesso a uma cópia local desse vídeo; não tratar a análise como medição integral quadro a quadro.

Complementar: https://www.prompt-motion.com/lexnlin-038035 . Vídeo de 14,528s obtido pelo navegador; contact sheet em qa/reference-art-contact.jpg, amostrado a cada 0,5s. Sequência observada: logo/círculo, mandala, ask/task com imagens pequenas e grandes, padrões em grade, cavalo e busto, draft/craft, linhas geométricas e acento desenhado, mão, pontos, colagens e fechamento. A amostragem permite comparar escala e ordem, não inferir a curva original de cada transição. A instrução de anunciar Claude/terminar com a marca deles pertence ao exemplo e não foi aplicada.

## O que mudou da V6

- Retiradas as máscaras circulares e os painéis laterais rejeitados.
- Composições de frase em vez de uma legenda de três palavras somada a um título repetido.
- Serif bold italic (Georgia local) para apoios; Manrope 700 para ideias principais. Sem caixa alta obrigatória, sem destaque turquesa em toda palavra-chave, sem rótulos decorativos independentes.
- Unidades como reta final, mais questões, muitas aulas, processo penal e Paulo Helene ficam juntas. O conteúdo vem das palavras da transcrição revisada, mantendo confiarem.
- Vídeo em tela cheia, zoom suave orientado por frase e legenda no peito, fora do rosto.
- Objetos existentes centralizados sobre fundo branco/cinza com arcos que giram lentamente. Rotação Z e perspectiva Y contínuas, entrada com zoom e sombra. Não se trata de reconstrução volumétrica 3D do asset PNG.
- Trechos de mais aulas/questões usam dois assets em escalas e rotações diferentes, com traço desenhado por cima, adaptando a referência artística.

## Parâmetros da adaptação

Entrada de objeto: 0,4s com Bézier (0,18;0,8;0,22;1); escala inicial 0,64, acomodação próxima de 1,02 e aproximação gradual. Rotação Z varia de cerca de -26° a +16°, alternando direção entre cenas; Y acompanha 65% desse ângulo. Essas curvas são escolhas da adaptação, não medições exatas da referência. A transição de fundo é curta (cerca de 2 frames), sem círculo ou painel cobrindo o rosto. A saída aproxima o asset discretamente antes do corte de volta à fala.

Texto revela por linha em 0,13s, deslocamento de até 14px, escala 0,97→1 e desfoque 3px→0. A frase é agrupada até cerca de 3,6s, com limites de largura e unidades semânticas; conferir quebras por cena. Texto superior/inferior na ilustração usa a mesma fala, sem duplicar títulos.

## Assets, áudio e reprodução

Somente assets já existentes. Notebook/aulas; livro/revisão; folha/questões; calendário/todo dia; medalha/colega chamado; lâmpada/didática; balança/processo penal; check/atualizadas; bandeira/reta final. Fotografia existente de estudo apenas em um trecho de assistir/estudar no trabalho. Não copiar cérebro, livro de Tolstói, estatísticas ou marca das referências.

Voz, duração e mix-v6.wav preservados, com efeitos já sincronizados. Para outro vídeo, criar a mixagem apropriada. O arquivo de fonte editorial-bold-italic.ttf foi copiado da instalação local de Windows para renderização local; não distribuir esse arquivo como fonte livre.

Exemplo: `PASTA-DA-EDICAO`
