# Editorial Film · película editorial

Template local HyperFrames, vertical 9:16, com tipografia serifada, legendas
por palavra, entrada de painel, grão e bloom. Três cenas configuráveis:
`title`, `split` e `closing`. A amostra sintética tem 12 segundos a 24 fps,
1080×1920, sem áudio. Os tempos das palavras são demonstrativos.

## Usar

Na raiz do repositório ativo:

```powershell
python scripts/editorial_film.py validar motion/hyperframes/templates/editorial-film/demo.json
python scripts/editorial_film.py preparar motion/hyperframes/templates/editorial-film/demo.json --pasta projetos/meu-editorial-v1
python scripts/editorial_film.py verificar --pasta projetos/meu-editorial-v1
python scripts/editorial_film.py renderizar --pasta projetos/meu-editorial-v1 --saida projetos/meu-editorial-v1/amostra.mp4
```

Cada preparação exige uma pasta nova; uma saída existente não é sobrescrita.
Para ajustar, copie `demo.json` para um plano local, altere e prepare outra
versão. A pasta gerada contém HTML, módulos adaptados, fontes, assets e o
plano de origem. A prévia HyperFrames serve à peça de motion; a montagem do
vídeo principal continua no Concat.

## Configuração

| Campo | Uso |
| --- | --- |
| `width`, `height` | 540×960, 720×1280 ou 1080×1920 |
| `fps` | 24, 25, 30 ou 60; use o fps do projeto de destino |
| `paper`, `ink`, `accent` | Cores hexadecimais; confira contraste após trocar |
| `grain`, `bloom` | Intensidade; 0 desativa o efeito |
| `label`, `footer` | Identificação curta, até 42 caracteres |
| `scenes` | Lista ordenada de cenas; duração entre 2 e 60 s por cena |
| `title` | 1–3 linhas de até 13 caracteres; verificar encaixe com a fonte escolhida |
| `eyebrow` | Rubrica curta da cena |
| `caption` | Até 7 palavras `{ "w": "Texto", "at": 0.8 }`; segundos relativos à cena |
| `image` | Foto local JPG/PNG/WebP para substituir a escultura sintética |
| `presenter` | Foto local no painel da cena `split` |
| `grade` | `clean`, `film`, `bw` ou `doc`; afeta a imagem, preservando o texto DOM |
| `fontFiles` | Caminhos locais `sans`, `serif`, `italic`, `mono`; relativos ao plano ou absolutos |

Os caminhos de imagem são relativos ao plano ou absolutos. Arquivos são
copiados para a nova pasta, preservando os originais. Fotos são recortadas
proporcionalmente; não há remoção automática de fundo. Vídeos e áudio ficam
na montagem do Concat: esta versão aceita imagens estáticas nas duas áreas.
Para legendas de fala real, substitua os tempos sintéticos por tempos medidos.

## Instalação local e privacidade

Requer `PREPARAR-MOTION.ps1 -Engine HyperFrames`, Python, Node e navegador
Chromium com WebGL. Usa o esbuild já instalado com HyperFrames. Na máquina
Windows, as fontes padrão são Arial, Georgia, Georgia Italic e Consolas;
em outro ambiente, configure `fontFiles` com fontes licenciadas disponíveis.

O pacote privado `skills-locais/editorial-film-edit/` precisa existir com
`importacao.local.json`. Ele não acompanha o Git. O preparador verifica seus
hashes e adapta cópias, corrigindo posição cacheada das legendas, tracking
tipográfico residual, seleção da região do painel e inicialização WebGL.
Nenhum arquivo original é alterado. Os módulos e fontes copiados continuam
locais; a pasta de trabalho não deve ser publicada ou redistribuída.

O repositório contém o preparador, o layout e o exemplo sintético, não uma
licença de distribuição do pacote privado. Um clone sem esse pacote pode
ler a documentação, mas não preparar o template.

## Concat e revisão

O resultado é um MP4 opaco, pronto para importar na biblioteca do Concat e
posicionar na timeline. Não é overlay com alfa nem camadas nativas editáveis.
Preserve a pasta de motion para futuras mudanças. Faça a montagem e revise
a amostra atual antes da exportação final pelo chat, conforme `docs/CLI.md`.

Validação da implementação: suíte sintética, check do HyperFrames, inspeção
de quadros e comparação de buscas repetidas no mesmo instante. A revisão
humana da amostra entregue permanece pendente.
