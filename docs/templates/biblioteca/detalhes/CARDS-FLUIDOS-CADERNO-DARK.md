> Documento trazido do editor web anterior e adaptado ao repositório. Comandos atuais: [biblioteca de templates](../README.md).

# Cards Fluidos + Caderno Dark — v1

Template aprovado em 16/10/2026, salvo a partir da edição da exemplo A: cards com perspectiva e ícones desenhados, caminhos animados e cenas do Caderno Editorial Dark, com foto viva colada e desenhos ligados à fala.

- Parâmetros reutilizáveis.
- Pacote com código, instruções e renderizador.
- Composição: `ConcatCardsCadernoDark`.
- Renderizador: `cards-fluidos-caderno-dark-v1/render.cjs`.

Uma fonte nas legendas: Arial em negrito, 2–4 palavras por bloco, destaque amarelo e zoom suave na palavra falada. Voz original contínua. Azul-escuro e turquesa no caderno; roxo e dourado nos cards. Usar pausas visuais entre os blocos.

Copie os parâmetros para uma nova aplicação, troque a mídia e adapte todos os tempos à transcrição da montagem. Não passar este JSON para `preparar-motion-template.py`: este pacote usa o renderizador próprio indicado acima. Gere quadros e uma amostra antes de aplicar uma direção nova a um vídeo completo.

A referência audiovisual aprovada é `PASTA-LOCAL A-30s-Motion-Caderno-Dark-v2.mp4`. A aplicação específica, quadros e proveniência ficam na pasta `references/` do pacote, ignorada pelo Git. O MP4 entra no Concat como clipe renderizado; o motion continua editável no Remotion.
