# Registro de implementação

## Semântica e diarização locais — configuração e validação

Configurado ambiente isolado `.models/local-ai/.venv` com sherpa-onnx 1.13.8 e NumPy 2.4.6, sem alterar o Python global. Instalação local portátil llama.cpp b11756, Qwen3-4B Q4_K_M (checksum oficial conferido), segmentação pyannote-3.0 ONNX e Wespeaker ResNet34-LM; modelos/licenças/artefatos ficam ignorados pelo Git. Código inclui preparador reproduzível e launcher CPU/loopback com parada restrita por PID, executável e início registrado.

Semântica tem provider llama.cpp com JSON Schema, limite de resposta, redirecionamentos/proxies recusados, proveniência/hash do modelo e filtragem dos campos de saída. Mantém backend Ollama. Qwen2.5 1,5B não atingiu o critério; Qwen3 4B inicial acertou 3/4, rubrica final acertou 4/4 e mais 2/2 casos novos. Não se afirma precisão geral, calibração de score ou compreensão de vídeo inteiro.

Diarização CPU usa segmentação de fala, embeddings Wespeaker e average-linkage cosseno, com quantidade inferida por limiar ou fornecida explicitamente. Retorna hashes, parâmetros, turnos e alinhamento separado por palavra, com ambiguidades nulas. CampPlus/agrupamento inicial falharam; Wespeaker + agrupamento explícito inferiu duas vozes, preservando alternância Daniel/Maria em quatro turnos. Métrica de fixture: 89,06% de cobertura/acerto e zero confusão nos trechos cobertos; 82/85 palavras rotuladas. Não é DER padronizado nem valida sobreposição/entrevistas reais. A fixture foi gerada localmente por SAPI/OneCore sem modificar o registro.

Análises adicionais podem ser passadas ao adaptador Concat por `--semantica`/`--diarizacao`; exigem hashes correspondentes e ficam no plano de revisão sem trocar seleção ou aprovação. Guia completo em `docs/LOCAL_AI.md`.

Na validação adicional sobre dois cortes transcritos, a semântica apresentou um falso negativo de independência (7/8 concordâncias no total pequeno, incluindo os quatro casos de desenvolvimento). Isso limita seu uso a apoio editorial; não é filtro automático confiável. A montagem dos dois cortes com as duas anotações foi concluída no Concat real. A primeira tentativa de amostra foi recusada antes de iniciar exportação devido a diferença de roundtrip f64 de ~2e-15 na duração; diagnóstico de documento confirmou ausência de alteração material. Comparação passou a tolerar apenas números finitos dentro de 1e-9, preservando chaves, tipos booleanos, textos e ordem. Adicionado teste de regressão para garantir que mudanças reais continuam recusadas.

Após a correção, amostra PT-BR com duas vozes exportada pelo Concat: H.264/AAC, 1080×1920, 30fps, 19,6s. Decodificação completa sem erros e quadro com legenda conferido. Nenhuma aprovação humana ou exportação final registrada. Suíte isolada da branch: 49 testes passaram, incluindo novos contratos e regressão de roundtrip. Artefatos/modelos/runtimes permanecem locais e ignorados; somente código/documentação/testes entram no Git.

## Continuação — fluxo completo local e validação real

Adicionados pipeline_video.py (probe, transcrição CPU local, silêncio/cenas, tópicos lexicais, ranking e manifesto com checkpoints atômicos), fila_video.py (worker serial persistente), analise_opcional.py (rostos e adaptadores locais experimentais), exportar_amostra.py (somente amostra vinculada ao documento) e extensões da montagem para presets, legendas, remoção conservadora de silêncio e recorte opcional. Guia em docs/VIDEO_AI_PIPELINE.md.

Faster-whisper instalado e modelo Small local existente utilizados sem downloads. Na primeira execução os timestamps do transcritor usavam tipos numéricos externos recusados pelo contrato; corrigida normalização para float nativo e repetida análise em pasta nova com sucesso. Retomada de checkpoints também funcionou. Modelos, mídias e tokens não foram versionados.

Concat 0.2.7/API 0.2 validado ao vivo com fonte sintética: criação, importação, seleção, trim, move, legendas, preset horizontal e vertical, save/close, reabertura e exportação de amostra com evento concluído. Amostra vertical H.264/AAC 1080×1920/30fps, 8,966667s, decodificada completamente sem erros. Quadro com legenda conferido visualmente. Não houve aprovação humana nem exportação final. A fala inglesa sintética foi reconhecida com o mesmo texto do roteiro; a fixture portuguesa usando voz inglesa apresentou erros e foi preservada como evidência de limitação.

Suíte atual: 42 testes passaram com fixtures sintéticas e permissão para sockets localhost. Ollama indisponível e pyannote/torch/modelos ausentes: adaptadores opcionais permanecem sem validação real. Haar testado em fixture sem rosto: corretamente exige ajuste manual. Não se afirma diarização operacional, reconhecimento de falante principal, precisão em gravações reais ou qualidade semântica de vídeos longos. GPU observada RTX 5060/8151MiB, transcrição testada só em CPU.

Data: 2026-10-20. Branch isolada: `codex/ai-pipeline-audit`, criada a partir de `3ba2826`; checkout original tinha modificações preexistentes e foi preservado.

## Implementado

- `scripts/pontuar_cortes.py`: valida timestamps em lista de palavras e gera candidatos a partir de fronteiras de pontuação. Nota explicável de 0 a 100 e JSON local; sem mídia, modelo, rede ou alteração ao Concat.
- `tests/test_pontuar_cortes.py`: fixtures sintéticas em memória para ordenação, critérios e entradas inválidas.
- Documentos de auditoria, comparação e roadmap.

## Validação

- `python -m unittest tests.test_pontuar_cortes`: 2 testes passaram.
- `python scripts/auditar-publicacao.py`: 1066 arquivos, 0 problemas.
- `python scripts/verificar-upstream.py`: 887 arquivos upstream, 0 divergências.
- `python -m unittest discover -s tests -p 'test_*.py'`: 23 testes, 18 passaram e 5 falharam ao abrir sockets locais (WinError 10013 de permissão), nos testes do cliente RPC. A falha é do sandbox/rede local e não exercita o pontuador.

## Limitações

O score é heurístico e lexical, não mede semântica, qualidade do áudio, gancho verdadeiro ou adequação contextual; não prevê viralização. Sem benchmark editorial e hardware medido. Nenhum modelo foi baixado; nenhum vídeo pessoal foi processado.

## P0 seguinte — manifesto de análise

Implementado `scripts/manifesto_analise.py` e documentado em `docs/ANALYSIS_MANIFEST.md`. O contrato v1 incorpora transcrição com proveniência e hash canônico, SHA256/caminho/duração da fonte, candidatos identificados e revisão obrigatoriamente pendente. Valida valores finitos, limites, alinhamento às palavras, texto, score e critérios. O plano manual para Concat confere novamente o hash da mídia, seleciona IDs explicitamente e remapeia palavras e intervalos na ordem pedida. Saídas existentes são recusadas. Sem dependências externas, RPC, render ou alterações de timeline.

Validação: quatro testes novos com fonte textual e transcrição sintéticas; percurso CLI real pontuador → manifesto → validação → plano, roundtrip JSON, remapeamento, fonte alterada, IDs inválidos e recusa de sobrescrita. A fixture textual testa bytes/hash e não valida decodificação audiovisual.

Suíte completa após a alteração: **27 testes passaram**, executada com permissão ampliada para os sockets localhost das fixtures RPC. A tentativa no sandbox reproduziu WinError 10013; fora dessa restrição a suíte passou. Auditoria de publicação: 1066 arquivos versionados, 0 problemas; integridade upstream: 887 arquivos, 0 divergências. A auditoria usa inventário Git e não inclui os novos arquivos ainda não adicionados ao índice. Não foi testada montagem real no Concat nem exportação, pois este P0 entrega contrato e handoff manual; o adaptador executor permanece P1. Revisão humana da amostra atual segue necessária antes da exportação final.

## P1 — adaptador de montagem pelo manifesto

Adicionados `scripts/montar_manifesto.py` e cinco testes em `tests/test_montar_manifesto.py`. A CLI seleciona candidatos por ID, monta em projeto novo via `concat_rpc.invoke`, descobre IDs de mídia/faixa/clipes e relê o documento após cada mutação. Verifica todos os trechos concluídos e salva/fecha em sucesso. Fonte com hash alterado, projeto/evidências existentes, duração divergente ou documento inconsistente interrompem a montagem. Diário exclusivo com flush/fsync antes de cada RPC preserva a última operação incerta; erros não são repetidos nem disparam fechamento ou exportação. Nenhum token é registrado.

Testes: montagem de dois trechos sintéticos em ordem invertida, offsets/durações, conferência após mutações, falha por timeout sem retry/close, recusa de fonte alterada e destino existente, documento divergente antes de salvar e integração pelo transporte TCP autenticado contra servidor sintético. Suíte completa: **32 testes passaram**, com execução ampliada para permitir sockets localhost das fixtures. Não houve alterações no motor Rust. Não foi usado aplicativo Concat real, decodificador ou render; a evidência comprova contrato/protocolo sintético, sem afirmar qualidade audiovisual ou compatibilidade com o binário instalado. A amostra e sua aprovação humana continuam etapas separadas obrigatórias antes da entrega final.
