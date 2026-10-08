# Direção Studio — operação pelo chat

Responda em português. Este projeto edita vídeos locais pela interface e pela
CLI Python. Use os mesmos motores e validações; DeepSeek é opcional. Você pode
montar o JSON de ações diretamente, sem conectar outra IA.

## Instalação e início

Leia README.md. No Windows, execute `./INSTALAR.ps1 -BaixarWhisper` uma vez.
Execute `./INICIAR.ps1` em um terminal persistente. Use o Python de
`.venv/Scripts/python.exe` para a CLI e os testes. As instruções pressupõem
Windows, Python 3.11+, Node 22+ e FFmpeg/FFprobe no PATH.

## Operação

`python app/cli.py --help` lista os comandos. A saída padrão é JSON; progresso
vai para stderr; falhas retornam código 1. O servidor escuta apenas loopback.
Para outra porta: `INICIAR.ps1 -Port 8876` e `cli.py --port 8876 ...`.

1. Confira `health`, importe com `import CAMINHO` e anote o ID retornado.
2. Consulte `show ID`. `run ID legendar --wait` transcreve o original.
   `run ID cortar --wait` limpa pausas; `run ID editar --wait` ativa a timeline.
   Depois de ativar a timeline, use ações para os ajustes manuais.
3. Leia `docs/CLI.md`. Grave ações em arquivo JSON, com a revisão atual,
   e aplique `actions ID ARQUIVO`. Use intervalos baseados na transcrição real.
   Revise `show ID` após cada operação. A revisão evita sobrescrita concorrente.
4. Gere `run ID amostra --wait`. Apresente o arquivo local
   `projetos/ID/amostras/preview.mp4`. Corrija segundo a revisão do usuário.
5. Somente após aprovação explícita da amostra atual, execute
   `approve ID --reviewed`, depois `run ID exportar --wait`.
   Entregue `projetos/ID/final/video.mp4`.

Não altere `brutos/`. Não aprovar automaticamente nem afirmar que assistiu
ou ouviu um vídeo sem inspecioná-lo. Preserve sentido, ressalvas e contexto da
fala; dúvidas de nomes e transcrição devem ser conferidas na amostra.
Não retire pausas de uma montagem aprovada sem o pedido correspondente.
Não envie vídeos nem chaves a serviços externos. Não registre chaves no código.

## Skills complementares

As quatro skills estão em `.agents/skills/`, com os arquivos de apoio completos.
Entradas em `.claude/skills/` apontam para elas para uso no Claude Code. Leia a
skill completa e suas referências relevantes, não apenas a entrada curta.

- Briefing: `.agents/skills/meia-briefing-de-edicao/SKILL.md`.
- Legendas/enquadramento: `.agents/skills/meia-legendas-e-enquadramento/SKILL.md`.
- Revisão/retrabalho: `.agents/skills/meia-revisao-economia/SKILL.md`.
- Remotion: `.agents/skills/remotion-best-practices/SKILL.md`; seu roteador indica
  as referências para composição, Player, renderização, legendas e outros temas.

Selecione conforme o pedido. Estas orientações não instalam serviços ou modelos
automaticamente e não autorizam chamadas pagas, mudanças de escopo ou exportação
sem a aprovação já exigida pelo fluxo do editor.

## Código e verificações

`app/server.py`: API, jobs e validação; `editing_actions.py`: timeline e histórico;
`assembly_flow.py`: tempos e fades; `remotion_engine.py` e `remotion-project/`:
composição por frames; `motion_studio.py`: cenas; `kit/.../transcribe.py`: Whisper.

`python -m unittest discover -s app/tests -p 'test_*.py'`
e `npm run lint` em `app/remotion-project` verificam alterações.
`python scripts/auditar-publicacao.py` verifica os arquivos rastreados no Git.
Nenhum vídeo, render, modelo, backup, mídia do usuário ou material do curso
pode entrar no repositório. Modelos e dependências são instalados localmente.
