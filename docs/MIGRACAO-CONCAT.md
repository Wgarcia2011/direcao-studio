# Substituição do editor — 16/10/2026

## Decisão e implementação

Concat passa a ser o único editor e motor ativo, na tela e pelo chat.
`INICIAR.ps1` abre o executável nativo. A instalação deixa de criar o servidor
Python e os dois projetos Node. O cliente novo usa a API do próprio Concat,
com comandos, histórico e formato de projeto compartilhados com a janela.
Os antigos app/, kit/, skills de operação Remotion e scripts de publicação
foram retirados da árvore publicada. O commit `4d1f292` preserva a versão
anterior sem reescrever histórico.

Os 887 arquivos em editor/ vieram da pasta fornecida, commit upstream
`afe8383cef9ec0ce17b4c8f438292d848fbfaf21`. Os workflows upstream de release,
configurações de agentes, arquivos de design .af e o modelo binário foram
omitidos. A versão executável oficial 0.2.7 pode diferir desse snapshot.
Hashes individuais registram os blobs originais e os arquivos publicados,
com finais de linha de texto normalizados para LF. Não houve alteração de
lógica nem da interface nativa.

O modelo embutido `selfie-segmentation.onnx` pode ser recuperado pelo script
de preparação antes de compilar, com SHA256 verificado. Não é enviado ao Git.
Licenças, cabeçalhos, fontes e recursos usados pelo código foram preservados.

## Dados antigos e equivalência

Não houve conversão automática nem edição de projetos pessoais. As pastas
`projetos`, `Renders`, originais, assets e backups do workspace permanecem
locais. A aplicação web local anterior é arquivada em `versoes-do-editor`,
separada da inicialização ativa. Projetos nativos novos devem ficar na pasta
do usuário quando controlados pela API.

| Antes | Agora |
| --- | --- |
| Página web e player Remotion | Janela nativa Slint do Concat |
| API HTTP Python e app/cli.py | API JSON-RPC TCP e scripts/concat_rpc.py |
| projeto.json / edit/timeline.json | Pasta nativa com concat.json |
| Ações timeline/settings/overlay | Comandos edit.apply nativos, com undo/redo |
| Presets TIPO e highlights personalizados | Textos/legendas nativos; estilos precisam ser recriados |
| Motion React/HyperFrames | Keyframes/efeitos/títulos nativos; sem importador implementado |
| Aprovação vinculada ao hash da amostra | Revisão humana e flag do operador no cliente; sem hash no motor |

## Desenvolvimento

O Rust não foi alterado durante a migração. Não se afirma que os presets ou
capacidades anunciados pelo upstream tenham sido testados em vídeos pessoais.
A CI testa core/projeto sem FFmpeg; compilar/testar o aplicativo completo exige
o toolchain nativo descrito no README upstream. Publicação não inclui vídeos,
executáveis, tokens, dependências instaladas ou modelos.
