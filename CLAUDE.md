# Direção Studio — Concat

Responda em português. Leia README.md e docs/CLI.md antes de operar.
Concat é o único editor. Abra com INICIAR.ps1; pelo chat use
`python scripts/concat_rpc.py`. Não inicie o antigo app/server.py.

Central: ABRIR-CENTRAL.ps1. Para criação de motions use a escolha explícita
do usuário/plano: Remotion, HyperFrames ou ambos, por meio da skill
skills/direcao-studio/SKILL.md e docs/MOTION.md. A montagem principal continua
no Concat. A cópia comercial em skills-locais é privada e não acompanha o Git.

Preserve originais e contexto da fala. Nunca envie mídias ou tokens a serviços
externos. Nunca leia ou imprima o token em saídas; o cliente autentica internamente.
Não edite o mesmo projeto simultaneamente pela janela e API. Salve e feche a
sessão API antes de abrir o projeto na janela. Não repita mutações após timeout
sem conferir o estado: timeout não cancela a operação.

Gere uma amostra com --sample, apresente ao usuário e obtenha aprovação explícita
da versão atual antes de exportar pelo chat com --reviewed. Esses argumentos
registram a intenção do operador, não são uma aprovação automática ou uma
barreira do motor nativo. A cada alteração, revise novamente. Não afirme ter
assistido ou ouvido mídia sem inspecioná-la.

Os comandos e templates do editor antigo não existem nesta versão.
Antes de escolher comandos, leia editor/src/crates/concat-api/src/message.rs e
editor/src/crates/concat-project/src/commands/mod.rs. A distribuição instalada pode
diferir dos fontes: chame version e respeite erros/capacidades reais.

Use fixtures sintéticas nos testes. Rode a suíte Python em tests, a auditoria
de publicação e a verificação de integridade upstream. Mudanças no motor Rust
também exigem fmt/clippy/test conforme editor/CONTRIBUTING.md.
Não versione mídias, modelos, dependências, portable/settings.json, tokens ou
config.local.json. Preserve atribuições e licenças.

Templates de vídeo: docs/templates/README.md. Quando o usuário escrever
"Listar Templates", leia esse índice e motion/remotion/templates/biblioteca/indice.json
(ou rode `python scripts/biblioteca_motion.py listar`) e apresente todos, agrupados,
explicando cada um em uma ou duas frases (visual, quando usar, formato, se foi
testado). Termine perguntando qual template e em qual vídeo.
