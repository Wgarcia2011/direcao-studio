# Verificação da migração — 16/10/2026

- 11 testes Python aprovados: cliente JSON-RPC autenticado, eventos de exportação,
  conexão encerrada sem retry, token protegido, revisão exigida pelo cliente,
  catálogo e limite de exposição do servidor da central.
- API local real consultada: Concat 0.2.7, contrato 0.2, JSON-RPC e eventos.
  A preferência enabled salva por outra janela não impede conexão autenticada
  com a instância que já está servindo.
- Executável existente, sem alteração, passou `--smoke` com exit code 0.
  O botão da central abriu a janela nativa original.
- Remotion: `npm run lint` (TypeScript) e reconstrução `node build-player.cjs`
  aprovados. Player usa a mesma composição que o renderizador.
- HyperFrames: lint sem erros/avisos; check sem problemas de execução, layout
  e movimento; nove amostras de layout e 10/10 verificações de contraste AA.
- Central conferida no navegador em janelas PC de 1440 e 927 pixels, sem
  overflow horizontal. Testados seleção dos motores, motor por bloco, montagem
  do pedido, gravação de template, recuperação do rascunho após reload e
  importação de um backup com restauração/combinação dos templates.
- Revisão independente da interface pediu proteção de rascunho e restauração
  dos templates; ambos corrigidos e reavaliados como resolvidos.
- Integridade dos 887 arquivos upstream preservada. Auditoria dos arquivos
  rastreados sem mídias, modelos, dependências, executáveis ou pacote privado.

O editor Rust completo não foi recompilado nesta máquina: não havia toolchain
Rust instalado. A migração preserva os fontes, usa o executável oficial já
existente e inclui CI para testes Rust de core/projeto. Nenhum vídeo pessoal
foi usado como teste, convertido ou exportado nesta migração. As bases motion
são exemplos sintéticos; não representam a conversão de todos os efeitos da
skill comercial ou dos projetos antigos.
