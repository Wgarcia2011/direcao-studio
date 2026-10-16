# Direção Studio · editor Concat

O **Concat é o único editor ativo** deste projeto: aplicativo nativo, timeline
multipista, edição na tela, prévia e exportação pelo mesmo motor Rust/Slint.
O editor web Python/Remotion anterior foi retirado desta versão. Seu código
continua no histórico Git até o commit `4d1f292`.

A [central de ideias](docs/CENTRAL.md) abre com **Abrir-Central.cmd**:
45 pedidos, busca, pré-montagem por blocos e templates salvos. Escolha
**Remotion, HyperFrames ou ambos** para criar os motions; os clipes resultantes
entram na montagem do Concat. Instalação opcional: `PREPARAR-MOTION.ps1 -Engine Ambos`.
Template padrão: [Lower third básico](docs/templates/lower-third-basico/README.md).
Leia [docs/MOTION.md](docs/MOTION.md) e a [skill adaptada](skills/direcao-studio/SKILL.md).

## Abrir no Windows

Em um clone novo:

```powershell
git clone https://github.com/Wgarcia2011/direcao-studio.git
cd direcao-studio
powershell -ExecutionPolicy Bypass -File .\INSTALAR.ps1
powershell -ExecutionPolicy Bypass -File .\INICIAR.ps1
```

O instalador baixa o MSI oficial **Concat 0.2.7 Windows x86_64**, verifica SHA256
e extrai em `vendor/concat`, sem instalar serviços nem exigir o antigo servidor.
Para usar uma distribuição já existente, mantendo suas configurações:

```powershell
.\INSTALAR.ps1 -ExecutavelLocal 'D:\Wagner\Capcut-concat\vendor\concat\PFiles64\Concat\concat.exe'
.\INICIAR.ps1
```

Também pode abrir `Iniciar-Direcao-Studio.cmd`. A janela do Concat é o editor;
nenhum servidor web em `localhost:8765` é necessário. O caminho instalado fica
em `config.local.json`, ignorado pelo Git. Modelos opcionais são instalados
pelas configurações do Concat. Python 3.11+ só é necessário para controle por
chat e verificações; Node/Remotion não são dependências deste editor.

## Editar na tela e pelo chat

Importe suas mídias na janela, organize os clipes na timeline e ajuste textos,
efeitos e keyframes no monitor. Projetos nativos usam uma pasta com `concat.json`.
Salve projetos e exportações da API dentro da pasta do usuário, por exemplo
`C:\Users\SEU_USUARIO\Videos\Concat`; a API restringe caminhos de escrita.
Arquivos de mídia podem ser lidos de outras unidades.

Para o chat, habilite a API local nas configurações do Concat. Mantenha a janela
na tela inicial e feche nela o projeto antes de abrir uma sessão pela API.
Depois use `python scripts/concat_rpc.py version`. Leia [docs/CLI.md](docs/CLI.md)
para importar, editar, salvar, revisar e entregar de volta à janela.
Não existe sincronização simultânea do mesmo projeto entre API e janela.

Gere uma amostra e revise antes da exportação final pelo chat. A aprovação
continua humana; o aplicativo nativo também oferece exportação manual.

## Código e verificações

`editor/` contém 887 arquivos de código, recursos e documentação do Concat,
copiados do commit `afe8383cef9ec0ce17b4c8f438292d848fbfaf21`, com hashes em
`editor/UPSTREAM.json`. O código foi preservado, normalizando finais de linha
de texto para LF; o manifesto registra hashes originais e publicados. O executável oficial 0.2.7
é uma distribuição independente e **não foi compilado a partir desse snapshot**.

```powershell
python -m unittest discover -s tests -p 'test_*.py'
python scripts/auditar-publicacao.py
python scripts/verificar-upstream.py
```

Para compilar o editor: Rust 1.93+, CMake, compilador C++ e bibliotecas de
desenvolvimento FFmpeg 7+. Execute `python scripts/preparar-modelo.py` primeiro
para obter o pequeno modelo embutido sem versioná-lo. Consulte
[editor/src/README.md](editor/src/README.md). Em `editor/src`, execute
`cargo fmt --check`, `cargo clippy --all-targets -- -D warnings` e `cargo test`.
A CI verifica o cliente, os fontes importados e os testes Rust de core/projeto.

## Migração e licença

As mídias e projetos locais antigos não são enviados ao GitHub nem convertidos
automaticamente. Estilos de legenda, motions e arquivos `projeto.json` do editor
anterior precisam ser recriados no Concat. Detalhes em
[docs/MIGRACAO-CONCAT.md](docs/MIGRACAO-CONCAT.md).

Código do Concat: **AGPL-3.0-or-later**, copyright Jareer e contribuidores.
Veja [LICENSE](LICENSE), [avisos de terceiros](editor/THIRD_PARTY_NOTICES.md) e
[política de marca](editor/TRADEMARK.md). Direção Studio é a integração local
com a distribuição oficial do Concat; não é o CapCut nem uma distribuição
oficial própria do Concat.
