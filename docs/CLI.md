# Controle do Concat pelo chat

Abra `INICIAR.ps1`, habilite o servidor nas configurações do Concat e mantenha
o projeto fechado na janela enquanto a API o edita. A conexão é JSON-RPC 2.0
sobre TCP local autenticado, não HTTP. O cliente lê o token de
`portable/settings.json` ao lado do executável e nunca o imprime.
Para instalações não portáteis, passe `--settings CAMINHO_SETTINGS`.

```powershell
python scripts/concat_rpc.py version
python scripts/concat_rpc.py project.list
python scripts/concat_rpc.py project.create --params criar.json
```

`criar.json` (troque o usuário; escritas da API ficam dentro da pasta do usuário):

```json
{"location":"C:/Users/SEU_USUARIO/Videos/Concat","name":"Meu corte"}
```

Cada chamada recebe um arquivo JSON UTF-8 com os parâmetros. Use os campos
definidos em `editor/src/crates/concat-api/src/message.rs`. Exemplos:

| Método | Parâmetros |
| --- | --- |
| `project.open` | `{"path":"C:/Users/SEU_USUARIO/Videos/Concat/Meu corte"}` |
| `media.import` | `{"path":"…/Meu corte","file":"D:/Videos/original.mp4"}` |
| `project.get` / `project.document` | `{"path":"…/Meu corte"}` |
| `edit.apply` | `{"path":"…/Meu corte","command":{"op":"addTextClip","start":1.5}}` |
| `edit.undo` / `edit.redo` | `{"path":"…/Meu corte"}` |
| `project.save` | `{"path":"…/Meu corte"}` |
| `preview.frame` | `{"path":"…/Meu corte","time":1.5,"output":"C:/Users/SEU_USUARIO/Videos/Concat/frame.png"}` |
| `project.close` | `{"path":"…/Meu corte","save":true}` |

As reticências na tabela abreviam o caminho; substitua por caminhos completos.
Leia IDs e tempos reais em `project.document` antes de alterar clipes.
O vocabulário de edição está em `editor/src/crates/concat-project/src/commands/mod.rs`.
Não escreva diretamente em `concat.json` para contornar o histórico ou o lock.
O motor valida cada comando e registra undo/redo. Não há transação de lote no
cliente; confira o documento após cada alteração.

## Revisão e exportação

Monte uma timeline curta para a amostra e exporte para um caminho separado.
`--sample` **não corta a duração**: exporta a timeline ativa inteira. Para
preservar o projeto completo, prepare o trecho em outro projeto/timeline na
janela. Não encurte uma montagem aprovada sem pedido.

```powershell
python scripts/concat_rpc.py export.run --params amostra.json --sample --wait --timeout 300
# Apresente o arquivo e obtenha aprovacao humana da versao atual.
python scripts/concat_rpc.py export.run --params final.json --reviewed --wait --timeout 1800
python scripts/concat_rpc.py project.close --params fechar.json
```

Arquivos de exportação recebem `path` do projeto e `output` do MP4, por exemplo
`{"path":"C:/Users/SEU_USUARIO/Videos/Concat/Meu corte","output":"C:/Users/SEU_USUARIO/Videos/Concat/amostra.mp4"}`.
Não substitua originais nem sobrescreva uma entrega sem pedido. O cliente exige
`--sample` ou `--reviewed` para `export.run`; é uma verificação do operador e
não verifica hashes ou vincula a aprovação ao documento. Alterações exigem
nova revisão. A janela nativa mantém seu próprio fluxo manual de exportação.

Sem `--wait`, a API devolve o job imediatamente. Com `--wait`, o cliente aguarda
`export.done` ou `export.failed`, inclusive se o evento chegar antes da resposta.
Timeout e desconexão **não cancelam jobs nem desfazem comandos**. Consulte o
estado/log local antes de repetir; `export.cancel` recebe `{"job":"ID_REAL"}`.
Falhas retornam exit code 1, argumentos inválidos retornam 2. O cliente não
repete chamadas automaticamente.

Depois de `project.close` com `save:true`, abra a pasta na janela:
`INICIAR.ps1 -Projeto 'C:\Users\SEU_USUARIO\Videos\Concat\Meu corte'`.
Não há ponte automática entre a timeline antiga e esse documento nativo.
