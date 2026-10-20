# Auditoria do pipeline de vídeo assistido por IA

Data: 2026-10-20. Escopo observado: snapshot `3ba2826` do repositório ativo, arquivos de código e documentação; projetos e mídias locais foram preservados.

## Arquitetura real

```text
Planejamento textual (Central local, sem acesso aos vídeos)
  -> agente/preparação manual de projeto e motions
  -> importação de mídia na janela nativa Concat ou via JSON-RPC local
  -> montagem multipista, ajustes e legendas no Concat
  -> exportação do Concat; motions auxiliares Blender/Remotion/HyperFrames podem ser importados
  -> revisão humana de amostra -> exportação final
```

Não há ingestão automatizada, transcritor integrado ao Concat, analisador semântico, seleção automática de trechos, fila/worker de vídeo, banco de dados nem integração n8n localizada no código ativo. `scripts/central_server.py` serve uma lista estática de arquivos da Central e abre o executável Concat; não lê pastas de mídia informadas na Central. `scripts/concat_rpc.py` é cliente JSON-RPC sobre TCP local autenticado para operações do editor e exportação. O motor e formato do projeto são do Concat upstream, snapshot AGPL mantido em `editor/`; o executável instalado pode diferir desse snapshot.

`motion/remotion` e `motion/hyperframes` constroem clipes de motion independentes. `scripts/blender_motion.py` prepara cenas locais e chamadas a Blender. `scripts/short_editorial.py` prepara cenas com transcrição já fornecida e pode montar no Concat, mas não cria a transcrição nem seleciona semanticamente as falas. A biblioteca de legendas consome palavras/timestamps existentes. Não foi encontrada dependência n8n, Whisper runtime, API de LLM ou fila de tarefas no pipeline atual.

## O que funciona / lacunas

- Planejamento local, biblioteca de motions, montagem/edição visual e exportação via Concat: presente, com procedimentos documentados.
- Controle do Concat por JSON-RPC: presente, sujeito a versão/capacidades reais do executável e uso serial sem edição concorrente pela janela.
- Preparação de motions: presente em módulos opcionais; não é montagem substituta.
- Legendas temporizadas: ferramentas/componentes aceitam dados de transcrição existentes; não há aquisição e validação automática integrada.
- Vídeo longo, tópicos, diarização, cenas, silêncio, recomendação e nota de candidatos: ausentes como pipeline integrado.
- Recuperação de jobs: cliente RPC espera eventos e timeout não cancela tarefas; não há fila durável de análise no Direção Studio.

## Gargalos e riscos

O elo ausente é a camada de análise/manifesto entre mídia e montagem. Implementá-la dentro da Central confundiria o papel de planejamento e colocaria trabalho pesado no servidor HTTP simples. A análise deve ser um processo/CLI local isolado, com manifesto verificável, artefatos intermediários, retomada por etapa e sem transmitir mídia. Resultados devem ser aprovados e convertidos em comandos Concat através dos contratos documentados, sem escrever diretamente em `concat.json`.

Hardware local disponível não foi medido nesta auditoria; logo, não se afirma compatibilidade de GPU, RAM, CUDA, modelo ou throughput. A primeira melhoria adicionada não usa GPU: ranqueia timestamps de uma transcrição JSON já existente. A pontuação heurística precisa de avaliação editorial em conjunto rotulado antes de orientar decisões automáticas.
