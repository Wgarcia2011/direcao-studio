---
name: direcao-studio
description: Planeje e edite vídeos no Direção Studio com Concat como editor visual e motions em Remotion, HyperFrames ou ambos. Use para pedidos, pré-montagem, edição por chat, templates e adaptação local do EDIT IA PRO.
---

# Direção Studio

Leia CLAUDE.md e docs/CLI.md na raiz do projeto. A central abre com
ABRIR-CENTRAL.ps1. Os dados de pré-montagem não são um documento Concat:
são instruções editoriais a conferir contra os arquivos reais.

## Escolha de criação

O plano exportado pela central contém `engine`: `remotion`, `hyperframes` ou
`both`. Cada bloco também pode ter `engine`: `auto`, `remotion`, `hyperframes`
ou `concat`. Respeite a escolha explícita mais recente do usuário; só use o
motor indicado. Em `both`, divida as cenas entre os dois motores e registre
qual produz cada asset. Não duplique renders sem uma finalidade de comparação.
Se um bloco contrariar a escolha global, explique a combinação antes de gerar.

Concat é o único editor de montagem na tela. Use seu documento, comandos,
histórico e exportação para a edição principal. Remotion e HyperFrames criam
peças visuais importáveis; não substitua a montagem por outro editor.

- Remotion: leia remotion-best-practices e as referências de criação/markup/render.
  Animações determinísticas por frames, dimensões/fps iguais ao projeto de destino.
- HyperFrames: leia hyperframes, hyperframes-core, hyperframes-cli e a skill
  de domínio pertinente. Preserve o contrato de timeline pausada e mídias locais.
- Ambos: leia as duas rotas e mantenha tempos absolutos do mesmo plano; cada
  asset tem intervalo, duração, motor, parâmetros, caminho e status de revisão.

Use os pontos de partida em motion/. Leia docs/MOTION.md para instalar e
verificar. Troque os textos/tempos sintéticos pela fala real antes de usar.
MP4 opaco serve a cenas de tela cheia. Não prometa sobreposição transparente
sem verificar codec/alfa tanto no arquivo quanto na importação do Concat.
Não duplique a voz nem legendas ao importar assets. Preserve editabilidade
guardando os fontes da peça; um MP4 importado não vira camadas nativas.

## Material privado EDIT IA PRO

Quando existir, a cópia privada fica em
`skills-locais/edit-ia-pro/editor-video/`. Leia o SKILL.md e as referências
somente da etapa necessária. Use como repertório editorial: seleção de tomadas,
plano por blocos, rosto livre, elementos na palavra certa e revisão de som.
Se o pacote não existir neste computador, use o fluxo documentado no projeto.
Não execute seu instalar.py/install.py: eles alteram skills globais e dependem
do motor antigo. Não copie o pacote comercial para o GitHub.

As regras de motor único, seleção de criador de motion e aprovação humana deste
projeto prevalecem sobre as sugestões do pacote original. Seu “modo automático”
não autoriza exportação final sem a aprovação exigida pelo projeto. Respiros e
tomadas são decisões a conferir na fala, não remoções automáticas universais.

## Entrega

Apresente plano e amostra. Após aprovação explícita da amostra atual, conclua a
montagem no Concat, confira a entrega e exporte. Use fixtures sintéticas para
testes de código. Nunca versione vídeos, modelos, tokens ou materiais privados.
