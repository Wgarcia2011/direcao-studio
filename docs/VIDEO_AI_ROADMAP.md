# Roadmap de vídeo assistido por IA

Estado atualizado em 20/10/2026: transcrição local, análise retomável, fila, detecção de silêncios/cenas, ranking, manifesto, montagem com legendas/presets e exportação de amostra implementados. Fluxo real validado com Whisper Small CPU e Concat 0.2.7 em fixture sintética. `docs/VIDEO_AI_PIPELINE.md` registra uso e evidências. Semântica Ollama e diarização pyannote são adaptadores opcionais ainda sem validação real por falta de runtime/modelos; segmentação semântica de vídeos longos e enquadramento guiado por falante continuam pendentes. Não considerar todas as linhas deste roadmap concluídas.

Este roadmap preserva Concat como editor único e a Central como planejamento. Custos são qualitativos até haver benchmark controlado em fixtures sintéticas na máquina-alvo.

| Prioridade | Funcionalidade/origem | Benefício | Complexidade / custo computacional | Dependências / riscos | Critério de aceite |
|---|---|---|---|---|---|
| P0 | Pontuação explicável por transcrição; abordagem de Herk | ordenar falas candidatas sem serviço externo | baixa / CPU mínima | timestamps palavra a palavra; heurística não é previsão | testes sintéticos de ordem, limites, scores 0–100 e JSON útil |
| P0 | Contrato de manifesto de análise independente | ligar análise e Concat sem acoplamento | média / baixo | formato versionado, caminhos locais, hash, offsets absolutos | roundtrip JSON, validação temporal e importação manual revisável |
| P1 | Transcrição local plugável; Whisper/StoryToolkitAI como referência | texto sincronizado e independência de cloud | média / CPU ou GPU variável | instalação/modelos/VRAM; idioma e licença dos modelos | benchmark em áudio sintético e fixtures licenciadas, word timestamps e retomada |
| P1 | Segmentação por tópico e candidatos com contexto | reduzir revisão de gravação longa | alta / LLM/embeddings variáveis | modelo local configurável, janelas sobrepostas, custo/privacidade | conjunto de referência editorial, justificativas e baixa perda de contexto |
| P1 | Exportar candidatos em plano revisável para Concat | diminuir trabalho repetitivo | média / CPU baixa | comandos API variam por executável; nunca gravar concat.json direto | projeto novo de teste, documento relido, amostra revista por humano |
| P2 | VAD/silêncio e detecção de cenas | aprimorar ritmo e contexto visual | média / CPU; visão pode usar GPU | falsos positivos, cortes de respiração/contexto | métricas em fixtures sintéticas e aprovação por amostra |
| P2 | Diarização e reframe por falante | preservar pessoa e alternância | alta / GPU opcional | privacidade/viés, cenas com múltiplos rostos | avaliação por clipes sintéticos e ajuste humano |
| P2 | fila durável/worker | retomar análise interrompida | média / CPU/armazenamento | complexidade operacional; Central não deve processar vídeo | matar/reiniciar job sintético e recuperar checkpoint sem duplicar resultado |

## Primeira entrega

P0 de manifesto implementado em `scripts/manifesto_analise.py`: contrato v1, hashes, proveniência, validação temporal, seleção explícita e plano de montagem manual revisável para Concat. Ver `docs/ANALYSIS_MANIFEST.md`. Testes sintéticos cobrem roundtrip, corrupção, remapeamento e CLI completa. Adaptador P1 implementado em `scripts/montar_manifesto.py` com testes de protocolo sintético; validação no aplicativo e amostra audiovisual real ainda pendentes.

`scripts/pontuar_cortes.py` lê JSON por palavra, agrupa sentenças dentro de faixa de duração, calcula nota 0–100 baseada em duração, completude, indício textual de gancho, densidade e pontuação. Emite critérios e justificativa. É determinístico, CPU-only, offline e não edita projeto nem vídeo. Não infere qualidade de áudio, emoção, relevância real ou viralização; não deve aprovar/cortar automaticamente.

## Sequência arquitetural proposta

1. Definir manifesto versionado para mídia original, SHA256, transcrição, candidatos, critérios, offsets e proveniência dos modelos.
2. CLI local de análise sem entrada na Central; artefatos em pasta de trabalho escolhida pelo usuário.
3. Adaptadores de transcrição implementados por subprocesso e saída normalizada; começar com transcrição já existente e fixture.
4. Análise semântica em janelas com sobreposição e ranking explicável; operador aprova candidatos.
5. Adaptador separado que transforma trechos aceitos em comandos da API Concat; sempre projeto de revisão/amostra.
6. Só após avaliação em fixtures e revisão humana, considerar automação adicional.
