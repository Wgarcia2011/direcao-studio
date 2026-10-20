# Comparação de projetos open source

Consulta: 2026-10-20. Funcionalidades abaixo foram conferidas em README, releases e documentação pública dos repositórios. Não foi feita instalação nem execução dos quatro projetos. Itens não comprovados ficam explicitamente como não confirmados.

Legenda: **já implementada** no Direção Studio; **reutilizável/adaptável** como ideia ou ferramenta externa; **desnecessária** ao escopo de editor único; **inviável** para cópia direta sem revisão. “—” significa que o recurso não existe no pipeline integrado atual.

| Capacidade | Direção Studio | OpenChatCut | AutoClip | Herk Edit Kit | StoryToolkitAI |
|---|---|---|---|---|---|
| Transcrição com timestamps | —; consome JSON existente | Word-level declarada | Whisper/FunASR/serviços; CLI/MCP | ferramentas de transcrição; Whisper local opcional | Whisper, incluindo Turbo em release |
| Diarização/falantes | — | speakers declarados | pessoa/enquadramento; diarização não confirmada | não confirmada no README | stories/speakers em beta |
| Cortes relevantes/semântica | — | edição textual/conversacional, contexto por agente; seleção de destaques não equivalente comprovada | analisa vídeo longo e cria cortes automáticos | storytelling, hook/payoff e cortes assistidos | busca semântica/transcrição e assistant |
| Detecção de cenas/silêncio | — | pausa/silêncio e geometria visual | recursos de cortes e enquadramento; algoritmo exato a verificar | corte de dead air; detecção de cenas não confirmada | não confirmada para seleção automática |
| Edição por texto/legendas | Concat edita visualmente; legenda via assets fornecidos | texto, cortes e captions sincronizados | subtítulos e editor | transcript-driven cuts, retiming e captions | edição de transcrição e exportações |
| Reenquadramento/exportação | Concat + motions, fluxo manual | timeline, MP4, captions, FCPXML, projeto | verticais/plataformas, capa e copy | HyperFrames, drafts e validações | integrações Resolve/EDL/XML/Fusion |
| Automação/integração | JSON-RPC local Concat | MCP/agent tools; Remotion | CLI e MCP; desktop/Tauri/FastAPI | skills e scripts Node/HyperFrames | app Python; LLMs locais/externos |
| Licença/encaixe | Concat upstream AGPL; preservar notice | AGPL-3.0-or-later; não copiar sem análise e compatibilidade | MIT; execução separada pode ser testada | licença/avisos e assets devem ser conferidos por arquivo antes de reutilizar; usar workflow como referência | GPL-3.0; cópia não recomendada |

## Repositórios e arquitetura

### OpenChatCut

O README atual descreve editor local-first conversacional, timeline multi-track, edição por transcrição palavra a palavra, pausa, falantes, captions vinculadas, integração MCP e exportação. Árvore inclui `server/`, `shared/`, `desktop/`, `cli/`, `remotion/` e `skills/openchatcut/`; README cita Remotion, MCP e Vercel AI SDK. Requisitos concretos de GPU/RAM e diarização por modelo não foram comprovados na documentação consultada. Muito sobreposto ao papel de Concat e licenciado AGPL: adaptar ideias de agente/manifesto apenas, sem importar editor ou código nesta fase.

### AutoClip

Aplicação desktop Tauri com frontend React, backend FastAPI/Python e CLI/MCP. README/release descrevem geração de cortes curtos de vídeo longo, legendas, capas e textos para plataformas; menciona Whisper e FunASR e serviços de modelo com cobrança por uso. Há correções recentes para fila de vídeo longo e retomada de tarefa. Releases oferecem CLI/MCP e dependência de FFmpeg; GPU/modelo/VRAM dependem da configuração e não foram estabelecidos de forma única. MIT favorece protótipo separado ou estudo de schemas; não se deve incorporar seu fluxo de exportação como editor, pois isso duplicaria Concat. O custo cloud conflita com requisito local-first e privacidade do projeto.

### Herk Edit Kit

Kit de skills e ferramentas para Codex/Claude, HyperFrames, scripts Node, FFmpeg/ffprobe e Chrome/Chromium. README lista transcrição, corte de silêncios, deteção/revisão de erros, EDL de revisão, retiming, captions e roteiro de shorts. Usa ElevenLabs por padrão em algumas ferramentas; Whisper local é alternativa possível; geração é opcional. Não requer necessariamente GPU no fluxo de edição, mas transcrição/modelos podem alterar requisitos. Repositório ativo com CI recente. A melhor referência de processo: plano/revisão de cortes, validações de timestamp e fixture sintética; copiar código/assets somente após validar `LICENSE`, `licenses/` e `THIRD_PARTY_NOTICES.md` por componente.

### StoryToolkitAI

Aplicação Python para transcrição, busca semântica, assistant com LLMs, projetos e exportação em formatos de edição; integração com DaVinci Resolve. Releases referem Whisper/Whisper Turbo, Ollama/LM Studio e stories/speakers em beta. Instalação documentada usa Python 3.11, FFmpeg, Rust e 8 GB RAM mínimo em release macOS; CUDA e requisito Windows/GPU precisam de checagem por máquina. Código GPL-3.0. Mais indicado como ferramenta externa de pesquisa/transcrição, com interoperabilidade por arquivos; dependências, licença e integração direta tornam copiar módulos uma decisão jurídica/técnica separada.

## Matriz de decisão

| Capacidade | Classificação no pipeline atual | Próximo passo |
|---|---|---|
| Transcrição, diarização, cenas e silêncio | adaptável | avaliar transcritor local e formatos de saída; não executar sobre mídia real sem fluxo aprovado |
| Seleção e nota de cortes | reutilizável como abordagem | pontuador determinístico adicionado; manter sugestões explicáveis e revisão humana |
| Edição textual/timeline | já implementada parcialmente | preservar Concat e usar seus comandos documentados |
| Legendas e reenquadramento | já implementada parcialmente | transcrição confiável e teste no Concat necessários |
| Fila durável e recuperação | desnecessária na Central; futura CLI pode precisar | iniciar sem daemon; adicionar checkpoint atômico antes de fila |
| Editor OpenChatCut/AutoClip como substituto | desnecessária | não introduzir segundo editor |
| Copiar código GPL/AGPL de terceiros | inviável sem revisão de licença | preferir formatos interoperáveis e implementação independente |

Referências primárias: [OpenChatCut](https://github.com/0xsline/OpenChatCut), [AutoClip](https://github.com/zhouxiaoka/autoclip), [Herk Edit Kit](https://github.com/nateherkai/herk-edit-kit), [StoryToolkitAI](https://github.com/octimot/StoryToolkitAI).
