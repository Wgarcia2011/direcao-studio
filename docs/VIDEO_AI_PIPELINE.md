# Pipeline local de análise e montagem

Semântica e diarização agora têm configuração CPU isolada: consulte [LOCAL_AI.md](LOCAL_AI.md) para instalação, contratos, testes de qualidade e limites. O backend validado usa llama.cpp/Qwen e sherpa-onnx/Wespeaker; Ollama e Pyannote/PyTorch permanecem alternativas opcionais.

Fluxo implementado: vídeo → probe → transcrição local ou JSON existente → silêncios/cenas → tópicos lexicais → ranking explicável → manifesto → seleção de IDs → montagem no Concat → amostra → revisão humana. A Central continua sendo planejamento. Não há upload de mídia ou uso de APIs pagas.

## 1. Analisar e retomar

Python 3.11+, FFmpeg/ffprobe no PATH. Transcrição automática usa `faster-whisper` opcional, já instalado na máquina validada; modelo CTranslate2 precisa existir em uma pasta local. O código não baixa modelos. CPU int8 é padrão; CUDA é opção explícita e exige suas bibliotecas compatíveis.

```powershell
python scripts/pipeline_video.py C:/Videos/original.mp4 --pasta Renders/analise-01 --modelo C:/Modelos/whisper-small --idioma pt
# Alternativa sem transcritor/modelo:
python scripts/pipeline_video.py C:/Videos/original.mp4 --pasta Renders/analise-02 --transcricao C:/Videos/palavras.json
```

JSON existente: `words: [{w,s,e}]` em segundos absolutos da fonte. Os tempos devem ser ordenados, sem sobreposição. Proveniência opcional em `provenance.provider`. Duração vem do ffprobe. `--min-seg`/`--max-seg` controlam os candidatos; notas são heurísticas e não previsão de alcance.

Repita exatamente o comando para retomar etapas concluídas; hashes dos checkpoints e configuração impedem reaproveitar arquivos alterados. Cada etapa grava JSON de forma atômica com flush/fsync. `job.json` registra etapa e erro; arquivos de trabalho ficam em `Renders`, ignorado pelo Git. Use pasta nova quando mudar fonte, transcrição, modelo ou parâmetros. Somente uma execução por pasta. Se um processo for encerrado à força, o lock pode permanecer: confirme que o processo acabou e confira o estado antes de remover somente aquele arquivo `running.lock`. Não há retry de mutações Concat.

Etapas: `probe.json`, `transcricao.json`, `deteccao.json`, `topicos.json`, `ranking.json`, `manifesto.json`. Silêncios: FFmpeg -35dB por 0,4s; cenas: limiar 0,25 em vídeo reduzido a 2fps/160px. São indicadores sujeitos a falsos positivos. Tópicos são palavras frequentes em janelas de 90s, explicitamente sem compreensão semântica por LLM. O ranker pode produzir candidatos sobrepostos; selecionar trechos é revisão editorial.

## 2. Montar os candidatos escolhidos

```powershell
python scripts/montar_manifesto.py Renders/analise-01/manifesto.json --cortes cut-0002 cut-0001 --nome Revisao-01 --evidencias Renders/revisao-01 --preset shorts --legendas --remover-silencios
```

Presets: `horizontal` (1920×1080), `shorts`, `reels`, `tiktok` (1080×1920), todos 30fps. Fonte horizontal fica contida por padrão; não afirmar preenchimento vertical com preservação de rosto sem dados válidos de enquadramento.

Legendas nativas em grupos de até cinco palavras, com tempos remapeados, quebra de linha limitada a 90% da largura e contorno. São editáveis no Concat. Não há destaque automático palavra a palavra nesta versão. Remoção de silêncio é opt-in: só remove silêncio detectado no interior de um intervalo entre palavras, mantendo margem de 150ms de cada lado e removendo ao menos 400ms; nunca usa silence detection sozinha para decidir palavras descartadas. Pontos e legendas são remapeados para a timeline resultante.

O adaptador cria projeto novo na pasta do usuário e registra toda operação. Confira `docs/ANALYSIS_MANIFEST.md` e `docs/CLI.md`. Se houver timeout/erro, confira projeto, jobs e diário antes de repetir. Não reabrir o mesmo projeto simultaneamente na janela e na API.

## 3. Amostra e aprovação

```powershell
python scripts/exportar_amostra.py Renders/revisao-01 --settings C:/Caminho/portable/settings.json
```

Esse comando exporta exclusivamente a amostra da timeline inteira para um MP4 novo no projeto, aguarda o evento e registra hash. Compara o documento com o snapshot da montagem antes de exportar. Arquivo/registro pending existente impede repetição após incerteza. Alterações na janela exigem nova preparação de revisão. A ferramenta não tem modo de exportação final nem marca aprovação. Apresente a amostra e obtenha aprovação humana explícita; a exportação final usa o cliente e o fluxo `--reviewed` em `docs/CLI.md`.

## 4. Fila persistente

```powershell
python scripts/fila_video.py adicionar --fila Renders/fila --fonte C:/Videos/original.mp4 --pasta Renders/job-01 --modelo C:/Modelos/whisper-small
python scripts/fila_video.py processar --fila Renders/fila
python scripts/fila_video.py processar --fila Renders/fila --retomar-falhas
```

Worker serial explícito, sem daemon, sem n8n e sem servidor pesado na Central. Cada job fica em JSON com estados queued/running/failed/ready_for_review. Job falho só é tentado novamente com `--retomar-falhas`; etapas válidas de análise são reaproveitadas. Não enfileira montagem/exportação, pois estas têm mutações que não devem ser repetidas automaticamente.

## 5. Adaptadores opcionais e seus limites

```powershell
python scripts/analise_opcional.py rostos Renders/analise-01/manifesto.json --saida Renders/rostos-01.json
python scripts/montar_manifesto.py Renders/analise-01/manifesto.json --cortes cut-0001 --nome Revisao-02 --evidencias Renders/revisao-02 --preset shorts --enquadramentos Renders/rostos-01.json --legendas
python scripts/analise_opcional.py semantica Renders/analise-01/manifesto.json --config .models/local-ai/config.json --saida Renders/semantica-01.json
.models/local-ai/.venv/Scripts/python.exe scripts/analise_opcional.py diarizacao Renders/analise-01/manifesto.json --config .models/local-ai/config.json --saida Renders/falantes-01.json
```

- **Rostos:** OpenCV Haar em cinco instantes por candidato. Só sugere centro quando há exatamente um rosto em todas as amostras; caso contrário mantém enquadramento manual. Montagem opcional aplica recorte horizontal relativo ao preset. Isso não identifica quem fala nem rastreia todos os frames; revisar movimentos e presença de outras pessoas. Teste real realizado apenas para ausência de faces na fixture; recorte validado em teste de contrato.
- **Semântica:** Qwen local por llama.cpp em loopback, JSON Schema e validação. Anota tópico, independência contextual, gancho, clareza e justificativa; mantém ranking/timestamps e revisão. Configuração e resultados de inferência real estão em `LOCAL_AI.md`. Ollama continua compatível como backend alternativo.
- **Diarização:** backend CPU sherpa-onnx com modelos ONNX locais e agrupamento auditável; rótulos ligados às palavras como anotação separada. Validado em conversa sintética de duas vozes com pausas; limites e métricas em `LOCAL_AI.md`. O adaptador legado Pyannote/PyTorch permanece opcional e não foi validado.

## Validação desta execução — 20/10/2026

Concat real 0.2.7/API 0.2 respondeu e montou projetos sintéticos novos. Transcrição faster-whisper Small, CPU int8, de fala inglesa gerada pela voz Microsoft Zira: texto reconhecido coincidiu com o roteiro sintético completo. É um teste de funcionamento, sem generalizar precisão em português, entrevistas ou áudios reais. A primeira fixture portuguesa com voz inglesa teve erros, evidenciando necessidade de revisão.

Amostra vertical: H.264/AAC, 1080×1920, 30fps, 8,966667s; decodificação completa com FFmpeg sem erros. Quadro em fala conferido com legenda dentro da largura; outro quadro em pausa não contém legenda. Contenção horizontal com barras é intencional para fixture sem rosto. Fala e vídeo não foram avaliados como peça criativa nem aprovados para entrega final. Projetos, vídeos e evidências permaneceram locais e ignorados pelo Git.

GPU detectada: RTX 5060, 8151MiB totais, 2624MiB ocupados no instante da consulta; estado variável. Teste de transcrição foi em CPU e não valida CUDA nem capacidade para diarização/LLMs simultâneos. Modelos/documentos privados não entram no commit.

Referências: [faster-whisper](https://github.com/SYSTRAN/faster-whisper), [filtros FFmpeg](https://ffmpeg.org/ffmpeg-filters.html). Não foi copiado código dos quatro editores externos.
