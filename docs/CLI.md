# Edição pelo terminal

Inicie o servidor com INICIAR.ps1 antes dos comandos. Nos exemplos, substitua
`python` por `.venv/Scripts/python.exe` e `ID` pelo identificador retornado.

```powershell
python app/cli.py health
python app/cli.py import 'C:/Videos/meu-video.mp4'
python app/cli.py projects
python app/cli.py show ID
python app/cli.py run ID legendar --wait
python app/cli.py run ID cortar --wait
python app/cli.py run ID editar --wait
```

O comando `show` retorna configurações, legendas e, quando ativa, `edit_state`.
Leia `edit_state.revision` e os IDs dos clipes antes de editar. Os tempos de
seleção são os segundos da base da timeline; use as legendas dessa base para
escolher falas. Não confunda esses tempos com a posição de saída após cortes.

Grave `acoes.json` (exemplo; substitua a revisão e intervalos pelos reais):

```json
{"revision":0,"actions":[
  {"type":"timeline.select_ranges","params":{"ranges":[{"start":0,"end":5},{"start":8,"end":12}]}},
  {"type":"overlay.add","params":{"kind":"text","text":"Meu título","start":0,"duration":3}}
]}
```

```powershell
python app/cli.py actions ID acoes.json
python app/cli.py show ID
python app/cli.py history ID 1 undo
```

Outras ações e parâmetros são validados em `app/editing_actions.py`.
Consulte a implementação antes de gerar um tipo de ação diferente. Todas as
ações de um lote precisam ser válidas; um lote rejeitado não publica alterações.

Para configurar um projeto antes de ativar a timeline, copie `settings` de
`show` para `config.json`, ajuste e execute `settings ID config.json`.
Para projeto com timeline, use a ação `settings.set` com os parâmetros
definidos em editing_actions.py, mantendo o histórico.
`run` preserva a configuração atual; `--settings config.json` permite informar
uma configuração específica. Remotion: `engine: "remotion"`; CPU:
`acceleration: "cpu"`. HyperFrames: `engine: "hyperframes"`.

```powershell
python app/cli.py run ID amostra --wait
# Apresente o MP4 e aguarde a aprovação do usuário.
python app/cli.py approve ID --reviewed
python app/cli.py run ID exportar --wait
```

Alterações invalidam a aprovação anterior. `--reviewed` registra a ação do
operador; não substitui a revisão humana. O servidor verifica o hash da amostra.
Sem `--wait`, `run` retorna o ID do job; consulte `job ID_DO_JOB` depois.
Tempo esgotado da CLI não cancela o job. Falhas retornam código 1 e JSON em stderr.

`captions ID arquivo.json` recebe `index`, `text` e `revision` se houver timeline.
`motion ID arquivo.json` recebe `revision`, `scenes` e `captions`; leia
`motion_studio.normalize` para os campos e limites. A CLI não chama DeepSeek.

Para limpar apenas respirações ou escolher perfis de ritmo, use a interface ou
`run ID automatico --automatic etapas.json --wait` após consultar o esquema em
`automatic_edit.validate`. Não invente parâmetros ou opções ausentes.
