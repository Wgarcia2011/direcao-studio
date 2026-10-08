# Ideias e decisões de motion para vídeos curtos

Registro das direções testadas em 08/10/2026. O processo completo está na skill
`.agents/skills/meia-motion-shorts/SKILL.md`.

## O que funcionou

- **Montar em código**, numa composição Remotion própria por vídeo, em vez dos
  presets genéricos: cada efeito fica preso ao tempo exato da palavra.
- **História em 30 s**: 3–5 trechos com expectativa, virada e conclusão.
- **Apresentador sem recorte no 16:9**: o vídeo inteiro encolhe para uma moldura
  chanfrada à esquerda; os cards ocupam a direita.
- **9:16 no estilo de referência**: fundo verde-escuro com grade, destaque
  verde-água, etiqueta em pílula por cena, ícones e títulos em cima, vídeo em
  moldura arredondada embaixo, alternando com tela cheia.
- **Contraste emocional**: preto e branco, tremor e vermelho nos momentos
  negativos; cores normais, brilho e confete nos positivos.
- **Placeholders temáticos de concurso**: folha de respostas sendo marcada,
  lista de aprovados, Diário Oficial – Nomeação com carimbo, cadeado que fecha e
  depois abre, ampulheta, caminho da história na faixa inferior.
- **Cortes secos de aproximação** no rosto nas palavras-chave e flash curto nas
  trocas de trecho.

## O que evitar

- Aparência de apresentação: textos repetindo a fala inteira, cards parados por
  muito tempo, apresentador pequeno (amostra rejeitada anterior).
- Excesso de emojis: ≈20 num vídeo de 30 s ficou demais. Preferência atual:
  nenhum emoji e nenhuma legenda, só placeholders e animações.
- Texto ou ícone sobre qualquer rosto, inclusive de quem só escuta.
- Importar dados de `public/projects/` no código: ficam fora do Git e quebram o
  build num clone limpo. Passe tudo por `--props`.

## Ideias ainda não testadas

- Variar a cor de destaque por tema do vídeo (aprovação, imprevisto, rotina).
- Transformar os placeholders mais usados em componentes reutilizáveis
  (`AnswerSheet`, `Gazette`, `Lock`, `Journey`) com props de tempo.
- Gerar a lista de shots e efeitos a partir de um JSON (tempo, palavra, tipo de
  ênfase) para que outro agente só escolha os momentos.
- Detectar rostos automaticamente para posicionar textos e enquadrar o 9:16.

## Teste com modelo menor

O Claude Haiku recebeu só o prompt da skill e entregou sozinho uma versão 9:16
de outra entrevista: escolheu os trechos, escreveu a composição do zero, conferiu 10 stills,
corrigiu uma sobreposição e renderizou (≈14 min de trabalho). Pontos de atenção:
posicionou rostos por estimativa visual, importou o `props.json` local (corrigido
depois) e não marcou como negativa a frase "eu não acreditei".
