# Semântica e diarização locais

O fluxo mantém Concat como único editor e preserva a aprovação humana da amostra atual. Análises são anotações para revisão; não aprovam, exportam nem identificam pessoas.

## Instalação isolada — Windows x64, CPU

```powershell
python scripts/preparar_ia_local.py --pasta .models/local-ai
uv venv .models/local-ai/.venv --python 3.11
uv pip install --python .models/local-ai/.venv/Scripts/python.exe -r requirements-local-ai.txt
powershell -ExecutionPolicy Bypass -File scripts/ia_local.ps1 -Acao iniciar
powershell -ExecutionPolicy Bypass -File scripts/ia_local.ps1 -Acao status
```

`uv` foi usado nesta máquina. Alternativamente crie o venv com Python 3.11 e instale o mesmo requirements com seu pip. A instalação não muda o Python global e não instala serviço. Modelos, bibliotecas, configuração e logs ficam em `.models`, ignorado pelo Git. Downloads não contêm mídia do usuário. Inferência usa arquivos locais; serviço semântico escuta somente `127.0.0.1:11435`, sem proxies ou redirecionamentos. PyTorch e CUDA não são necessários.

Artefatos usados: llama.cpp Windows CPU b11756 (MIT, 24MB), Qwen3-4B Q4_K_M (Apache-2.0, 2,497GB), segmentador pyannote 3.0 exportado pelo sherpa-onnx (MIT, modelo 5,7MB), Wespeaker ResNet34-LM (Apache-2.0, 26,5MB). Licenças ficam no diretório local. O preparador confere hashes publicados do runtime e GGUF e registra SHA256 dos demais artefatos; os hashes destes últimos são registro de integridade local, não assinatura do publicador. `requirements-local-ai.txt` fixa os pacotes testados. GPU não foi usada. RAM livre observada antes da configuração: aproximadamente 26GB, suficiente para o modelo de 4B em CPU; o processo mantém o modelo em memória enquanto estiver aberto.

Para desligar apenas o servidor registrado pelo launcher:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ia_local.ps1 -Acao parar
```

O launcher verifica PID, executável e instante de início antes de encerrar; não substitui processos que estejam ocupando a porta.

## Executar sobre um manifesto

```powershell
# Semântica: pode usar o Python global, sem novas dependências Python.
python scripts/analise_opcional.py semantica Renders/analise/manifesto.json --config .models/local-ai/config.json --saida Renders/semantica.json
# Diarização: usar o Python do ambiente isolado.
.models/local-ai/.venv/Scripts/python.exe scripts/analise_opcional.py diarizacao Renders/analise/manifesto.json --config .models/local-ai/config.json --saida Renders/diarizacao.json
# Montagem continua via Concat; anotações ficam também no plano de revisão.
python scripts/montar_manifesto.py Renders/analise/manifesto.json --cortes cut-0001 --nome Revisao-IA-01 --evidencias Renders/revisao-ia-01 --preset shorts --legendas --semantica Renders/semantica.json --diarizacao Renders/diarizacao.json
```

Use novos nomes de saída. Hash do manifesto/fonte impede misturar análises de arquivos diferentes. Os arquivos auxiliares não alteram ranking, seleção, texto ou aprovação. Depois use `exportar_amostra.py` conforme o guia do pipeline e aguarde aprovação humana antes do fluxo separado de exportação final.

## Contratos e método

Semântica usa JSON Schema, temperatura zero e validação dos campos. Só aceita conclusão normal do modelo. Tópico, independência contextual, gancho, clareza e justificativa são sugestões, não previsão de desempenho. Registra modelo configurado e seu SHA256. Contexto vem do candidato escolhido, não do vídeo inteiro: não consegue provar fidelidade de uma frase ao contexto global.

Diarização usa sherpa-onnx como segmentador de regiões de fala; extrai embeddings Wespeaker por região e faz agrupamento average-linkage por distância cosseno. `num_speakers: -1` infere quantidade pelo limiar `max_distance: 0.35`; um número positivo força quantidade conhecida. Parâmetros são explícitos na saída. Não há inferência de identidade. Detecção de mudança de pessoa dentro de fala contínua e vozes sobrepostas continuam exigindo revisão: esta implementação é voltada a turnos com pausas e não é um diarizador de sobreposição validado.

Palavras recebem rótulo por maior sobreposição temporal. Menos de 50% de cobertura ou concorrência relevante de outro falante produz `speaker: null`. O contrato original da transcrição permanece intacto; o alinhamento é uma anotação separada com hash do manifesto.

Os tempos de `speaker_review.words` continuam em segundos da fonte (`timebase: source_seconds`); os tempos de `clips[].words` no plano Concat são os da timeline montada. Não confundir as duas referências ao revisar os cortes.

## Fixture e métricas reproduzíveis

`python scripts/fixture_ia_local.py --pasta Renders/fixture-falantes` cria quatro turnos PT-BR alternando Daniel/Maria, usando tokens de vozes OneCore existentes sem alterar o registro. Exige essas duas vozes instaladas no Windows. Não baixa voz nem usa gravação de pessoa. Salva WAV/MP4 sintéticos e referência de tempos. Não versionar os arquivos gerados.

```powershell
python scripts/validar_ia_local.py diarizacao --referencia Renders/fixture-falantes/reference.json --resultado Renders/diarizacao.json --saida Renders/metricas-diarizacao.json
```

A métrica mede acerto/cobertura com amostras de 20ms nos intervalos anotados, excluindo 300ms das bordas; considera permutação de rótulos. Referência sintética inclui pausas internas, portanto não é DER padronizado. Aceite da fixture: quantidade correta, cobertura ≥80% e acerto ≥80%. Isso não demonstra precisão em entrevistas reais, música, sobreposição ou gravações longas.

## Evidência e limitações

A primeira configuração Qwen2.5 1,5B errou a distinção de independência contextual; não foi aceita. CampPlus com agrupamento interno também confundiu as vozes; uma análise direta de embeddings encontrou separação muito mais consistente com Wespeaker. Com Wespeaker e agrupamento explícito, a quantidade foi inferida como dois falantes: cobertura/acerto de 89,06% nos intervalos de referência e nenhuma troca de rótulo nos intervalos cobertos. Alinhamento da fixture: 82 de 85 palavras receberam rótulo; as demais ficaram incertas. Resultados anteriores e modelos permanecem locais para auditoria.

Qwen3-4B acertou 3/4 casos inicialmente. A rubrica confundia conhecimento técnico com necessidade de contexto anterior; foi explicitado que termos técnicos e instruções genéricas completas podem ser independentes, sem exigir tutorial detalhado. Com a rubrica final: **4/4 casos de desenvolvimento e 2/2 exemplos novos de outro domínio**, sem alterar a rubrica após os exemplos novos. Todos tiveram JSON válido e notas dentro dos limites; isso não constitui calibração dos scores nem prova de precisão editorial em material real. As saídas e as falhas intermediárias estão preservadas em `Renders/validacao-ia-local`.

Em mais dois cortes transcritos da conversa sintética, houve um acerto e um falso negativo: a definição de análise semântica foi marcada como dependente. Total observado nessa amostra pequena: 7/8 concordâncias editoriais, sendo os quatro casos de desenvolvimento influenciados pela elaboração da rubrica. O falso negativo foi preservado, não convertido silenciosamente em acerto. Usar exclusivamente como apoio à revisão, sem descarte/seleção automáticos por esse booleano.

Na máquina configurada, servidor disponível via `.models/local-ai/config.json` e venv em `.models/local-ai/.venv`. O modelo semântico usa CPU, contexto de 4096 tokens e quatro threads. O serviço de inferência pode consumir alguns GB de RAM enquanto estiver carregado; a análise por candidato pode levar dezenas de segundos. Não foi feito benchmark de vídeo longo nesta continuação.

Integração real Concat 0.2.7: montados dois cortes da fala sintética PT-BR, com as anotações anexadas ao plano e legendas nativas. Amostra exportada: H.264/AAC, 1080×1920, 30fps, 19,6s; decodificação integral FFmpeg sem erros e quadro com legenda conferido visualmente. O arquivo continua com revisão pendente. Uma diferença inofensiva de roundtrip f64 no documento foi diagnosticada antes da exportação e coberta por teste: comparação aceita ruído numérico até 1e-9, sem ignorar texto, chaves, tipos booleanos ou ordem. Não houve exportação final.

Referências primárias: [llama.cpp](https://github.com/ggml-org/llama.cpp), [Qwen3-4B GGUF](https://huggingface.co/Qwen/Qwen3-4B-GGUF), [sherpa-onnx diarização](https://k2-fsa.github.io/sherpa/onnx/speaker-diarization/index.html), [Wespeaker](https://github.com/wenet-e2e/wespeaker).
