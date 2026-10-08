# Direção Studio

Editor de vídeo local para Windows, com interface no navegador e comandos para
Claude Code. FFmpeg corta e monta; Faster Whisper transcreve em CPU; Remotion
e HyperFrames compõem prévias e MP4. Originais ficam preservados e a timeline
tem histórico. DeepSeek é opcional na interface; a CLI funciona sem sua chave.

## Instalação em outro PC

Instale Git, Python 3.11 ou superior (recomendado 3.11), Node 22 ou superior e
FFmpeg com FFprobe no PATH. Reabra o PowerShell e confira `python --version`,
`node --version`, `ffmpeg -version` e `ffprobe -version`.

```powershell
git clone https://github.com/Wgarcia2011/direcao-studio.git
cd direcao-studio
powershell -ExecutionPolicy Bypass -File .\INSTALAR.ps1 -BaixarWhisper
powershell -ExecutionPolicy Bypass -File .\INICIAR.ps1
```

Abra http://127.0.0.1:8765/editor. Ctrl+C encerra. O instalador cria `.venv`,
instala dependências Python e dos dois projetos Node, prepara fontes e o Player.
É necessária internet para instalar dependências e baixar modelos/navegador.
Whisper é baixado explicitamente com `-BaixarWhisper`; os vídeos ficam locais.

Se já tiver o modelo Whisper, dispense o download e configure
`VIDEO_EDITOR_WHISPER_MODEL` com a pasta que contém `model.bin`, `config.json`
e `tokenizer.json`. Também é procurado o cache local de faster-whisper-small.
Para baixar depois: `.venv/Scripts/python.exe scripts/baixar-whisper.py`.

Remoção de fundo usa MODNet e pode exigir um download na primeira execução.
Para baixar antes: `node app/remotion-project/download-model.mjs` ou a opção
`-BaixarMODNet` do instalador. CPU é o caminho padrão disponível; GPU é opcional.
O navegador do renderer pode ser baixado na primeira renderização.

## Uso pela interface e Claude Code

Importe um vídeo, transcreva, faça os cortes, revise as legendas, gere uma amostra,
aprove e exporte. Limite atual: 2 GB e 10 minutos por vídeo. A API é local.

Abra esta pasta no Claude Code e peça a edição. `CLAUDE.md` orienta o agente;
`docs/CLI.md` descreve os comandos. Inicie o servidor num terminal separado.
O agente usa `.venv/Scripts/python.exe app/cli.py` e ações validadas localmente.
As skills de briefing, legendas/enquadramento, revisão e Remotion acompanham o
repositório em `.agents/skills/`, com entradas para Claude Code em `.claude/skills/`.
Leia a skill completa e os arquivos de apoio indicados antes de aplicá-la.
Para outra porta: `INICIAR.ps1 -Port 8876`; na CLI: `--port 8876` antes do comando.

## Arquivos locais

`projetos/ID/brutos`: original; `edit`: transcrição e montagem; `amostras`:
prévia; `final`: exportação. `templates-salvos`: estilos; `.models`: Whisper.
Nenhum vídeo, render, backup, modelo ou dependência instalada acompanha o Git.
O catálogo público inicia sem mídias ou materiais do curso; importe seus assets.
Clonar o aplicativo não transfere os projetos feitos em outro computador.

## Verificações

```powershell
.venv/Scripts/python.exe -m unittest discover -s app/tests -p 'test_*.py'
cd app/remotion-project
npm run lint
```

Antes de publicar: `python scripts/auditar-publicacao.py` na raiz do repositório.
As dependências Node estão fixadas nos lockfiles; dependências Python diretas
estão declaradas em requirements.txt; a instalação usa requirements-lock.txt, com as versões diretas e transitivas validadas. Use `npm ci` para restaurar cada projeto Node.

## Limitações e atribuições

A transcrição pode errar nomes e os planos precisam de revisão. Não há garantia
de seleção narrativa automática sem conferência. O adaptador DeepSeek possui
testes simulados; a conta, disponibilidade do modelo e chamadas reais precisam
de configuração própria. Esta distribuição foi preparada para Windows.

Veja `app/THIRD_PARTY_NOTICES.txt` e licenças junto às fontes. Dependências mantêm
suas próprias licenças; o pacote Remotion está marcado como UNLICENSED.
