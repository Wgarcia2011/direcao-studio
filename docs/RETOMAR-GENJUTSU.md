# Retomada: skills de motion e demonstração Genjutsu

Atualizado em 22/10/2026. O usuário pediu adiar a demonstração por economia de tokens.

## Instalado e conferido

- GSAP: 8 skills; LottieFiles Motion Design: 1; Three.js: 13.
- As 22 skills estão em `C:/Users/wagne/.codex/skills`, em
  `D:/Wagner/Video/Video Editor/.agents/skills` e em `.agents/skills` do código ativo.
- Genjutsu está somente em
  `D:/Wagner/Video/Video Editor/Genjutsu/.agents/skills/genjutsu`.
  Suas cópias global, do workspace e do código ativo foram removidas após
  conferência de hashes. A pasta Genjutsu tem AGENTS.md mandando usar apenas ele.
- Bundle Genjutsu completo: router SKILL.md, cast/paint/bunshin e 17 módulos
  internos GUIDE.md. Empacotamento segue o bundle upstream.
- Origens: greensock/gsap-skills, lottiefiles/motion-design-skill,
  AThevon/genjutsu e CloudAI-X/threejs-skills, todos no GitHub.
- Licenças MIT e atribuições preservadas. São instruções para agentes;
  não foram instalados novos runtimes Three.js/Lottie nem plugins nativos Concat.
- Origem/commit em INSTALL-SOURCE.json por skill. Inventário e hashes completos:
  docs/SKILLS-MOTION-INSTALACAO.json. Avaliação: docs/SKILLS-MOTION.md.
- Verificados 67 destinos por hash: 66 cópias das 22 skills e 1 Genjutsu separado.
- Passaram 64 testes Python, auditoria de publicação, integridade de 887 arquivos
  upstream, TypeScript Remotion e lint/check HyperFrames. Sockets locais exigiram
  execução fora do sandbox após EACCES. Não são testes dos exemplos de cada skill.

## Pedido pendente, já autorizado

“Crie uma tela demonstrativa da Central na pasta separada usando somente o
Genjutsu, sem alterar nosso editor ainda, e me mostre como ficou.”

Nenhum HTML demonstrativo foi criado, nenhum servidor da demonstração foi
iniciado e nenhuma captura foi produzida. A tentativa parou na leitura das
instruções e referências; não chamar a demonstração de pronta.

## Como continuar

1. Trabalhar em `D:/Wagner/Video/Video Editor/Genjutsu`, lendo seu AGENTS.md
   e `.agents/skills/genjutsu/SKILL.md`. Usar somente Genjutsu e módulos internos;
   não aplicar Impeccable nem as outras skills instaladas. Evitar bunshin:
   não foi pedido e consome muitos tokens. Preferir uma tela pequena e independente.
2. Já foram lidos o fluxo cast e os módulos motion-principles, css-native,
   desktop-principles, mobile-principles, tells (com references/web.md) e design-audit.
   Reconsultar conforme necessário. No PowerShell, ler GUIDE.md por caminho;
   não executar os blocos Bash diretamente como PowerShell.
3. Referência existente, somente leitura: código ativo em
   `D:/Wagner/Video/Video Editor/exportacao-github/direcao-studio/central/`:
   index.html e catalog.json foram inspecionados. A Central contém pedidos prontos,
   materiais/direção, busca e categorias, pré-montagem, templates e painel Seu pedido.
4. Proposta anunciada, ainda não validada visualmente: navegação escura, área de
   trabalho clara, painel lateral que atualiza o pedido ao escolher ideias;
   interações curtas e redução de movimento. É uma hipótese para demonstração,
   não aprovação para redesenhar o produto. Respeitar os gates do Genjutsu.
5. Criar a demonstração apenas na pasta separada, preferindo HTML/CSS/JS sem novas
   dependências. Busca, seleção e composição de pedido podem funcionar apenas no
   navegador, com dados demonstrativos identificados. Não chamar API do Concat.
6. Mostrar no navegador, inspecionar visualmente e registrar captura se possível.
   Conferir responsividade, teclado, foco, contraste calculado e reduced-motion.
   Rodar a auditoria interna Genjutsu sobre a demonstração; não afirmar 60 fps
   sem medir. Apresentar resultado e limitações sem aplicar no editor.

## Restrições e Git

Concat continua o único editor de montagem e sua interface original está preservada.
A Central é planejamento. O usuário não autorizou aplicar o novo visual no editor.
Preservar originais, histórico e aprovação humana antes de exportações finais.
Nenhum vídeo real deve ser usado em testes; somente fixtures sintéticas.

O checkout já tinha numerosas mudanças anteriores (Blender, Central, templates,
briefing e outros). O commit desta instalação deve incluir somente as 22 skills
públicas, documentos desta instalação/retomada e o pequeno apontamento novo em
CLAUDE.md. Não incluir skills-locais privadas, mídias, tokens ou mudanças anteriores.
Genjutsu está fora do repositório ativo: não afirmar que seu bundle foi versionado
nele; sua localização, origem e hashes ficam documentados no manifesto.
