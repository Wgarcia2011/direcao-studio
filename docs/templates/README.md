# Templates de vídeo

Templates prontos para reutilizar em novas edições. Cada um tem código no
repositório, exemplo sintético e um caminho para usar pela central ou pelo chat.

## Templates principais

| Template | Formato | Para quê | Motores | Pedido na central |
| --- | --- | --- | --- | --- |
| [Lower third básico](lower-third-basico/README.md) | 16:9 | identificar nomes e cargos em vídeos formais | Remotion | Identificação → Lower third básico |
| [Short editorial 9:16](short-editorial-9x16/README.md) | 9:16 | short de 20–40 s de entrevista com muito motion e transições do Concat | Remotion + HyperFrames | Animação → Short editorial 9:16 |
| [Caderno 3D · Three.js](caderno-3d-threejs/README.md) | 9:16 | conversa de ~2 min com cards 3D, cenas de caderno com profundidade e luz, foto viva, legendas e logo final; aprovado numa aplicação real | Concat + HyperFrames/Three.js | Animação → Caderno 3D · Three.js |
| [Interface Explicativa](interface-explicativa/README.md) | 9:16 | fala com legenda central e destaque violeta alternada a cada 2–4 s com inserts de interface em 3D (perfil, busca, pergunta, checklist), ícones extrudados e cartão 3D com a fala viva; troca-se só o tema; direção 3D aprovada em 22/10/2026 com amostra sintética (ainda sem vídeo real) | Concat + HyperFrames/Three.js + Remotion (elementos) | Animação → Interface Explicativa |
| [Editorial Film](editorial-film/README.md) | 9:16 | película, tipografia, legendas e painel com fotos; amostra sintética de 12 s | HyperFrames; requer pacote privado local | Animação → Editorial Film |

## Biblioteca de motion

[Kit editorial · identidade v1](editorial-kit/README.md): três templates
HyperFrames — **Título editorial**, **Card de dados** e **Encerramento** —
com identidade compartilhada entre motores, exemplos sintéticos e preparação
local. Peças opacas 9:16 ou 16:9, para montagem no Concat. A identidade é uma
proposta para revisão; os três pedidos estão na categoria Animação da central.

[Vinte templates do editor anterior](biblioteca/README.md), portados para o
Remotion atual: Editorial, Estúdio, Impacto, Impacto Dinâmico, Teatro Retrô,
Foco Total, Editorial Artístico, Túnel Narrativo, Caderno Editorial (claro e
dark), Cards Fluidos, Contraste Cinético, Cinético Estratégico (com e sem fala),
Percurso Editorial, Pin 129, Diorama Telejornal, Diorama 01 e variações do Impacto.
Pedido na central: Animação → Biblioteca de templates de motion.

## Legendas

[Editorial misto · 12 combinações](legendas/editorial-misto-12-combinacoes/README.md):
estilos de legenda (composições `CaptionTrack`/`CaptionCatalog` da biblioteca).
Referência de tipografia: [catálogo de legendas](../aprendizado/CATALOGO-TIPOGRAFIA-LEGENDAS.md).

## Listar Templates

Quando o usuário escrever **"Listar Templates"**, o agente lê este arquivo e
`motion/remotion/templates/biblioteca/indice.json` (ou roda
`python scripts/biblioteca_motion.py listar`) e responde com todos os templates,
agrupados como acima, explicando cada um em uma ou duas frases: o visual, quando
usar, o formato e se já foi testado nesta versão. Termina perguntando qual usar
e em qual vídeo.

## Como escolher

1. **Na central** (`ABRIR-CENTRAL.ps1`): busque "template" em Pedidos prontos,
   adicione o pedido, preencha a pasta do vídeo e copie o pedido para o chat.
2. **No chat**: "Listar Templates" ou "use o template X neste vídeo". O agente
   monta o plano, gera a amostra e pede revisão antes de qualquer entrega.
3. **Pelo arquivo**: copie o exemplo do template e rode o script indicado no README dele.

A aba Templates da central guarda combinações de pedidos no navegador; não é
a mesma coisa que estes templates de vídeo.

Para criar um template novo: componente(s) em `motion/`, exemplo sintético,
README nesta pasta, pedido em `central/catalog.json` e uma linha neste índice.
Guias de aprendizado do editor anterior: [docs/aprendizado](../aprendizado/).
