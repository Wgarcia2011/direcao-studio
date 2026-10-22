# Caderno 3D · Three.js (v1)

Versão 3D da linguagem **Cards Fluidos + Caderno Dark**: vídeo de conversa
reenquadrado em 9:16, cards roxos com aro dourado e ícone 3D sobre a fala,
cenas num caderno azul-escuro com profundidade, luz e sombras reais, a fala
viva colada na página como foto, legendas Arial negrito com a palavra falada
em amarelo e, opcionalmente, encerramento com logo 3D e "Siga @perfil".

Aprovado numa aplicação real em 22/10/2026 (amostra de 30 s aprovada no chat;
entrega de 115 s). O roteiro dessa aplicação fica na pasta local do vídeo, fora do Git.
Cada nova aplicação exige amostra e revisão humana próprias.

| Item | Valor |
| --- | --- |
| Saída | 1080×1920, 30 fps, MP4 H.264 + AAC |
| Entrada | montagem 16:9 já cortada **no Concat** (voz original) + legendas palavra a palavra |
| Motores | Concat (cortes e exportação final) → HyperFrames + Three.js 0.186 (motion) → Concat |
| Código | `motion/hyperframes/templates/caderno-3d-threejs/` e `scripts/caderno_3d.py` |

## Fluxo

1. **Cortes no Concat.** Monte os trechos (API: `addClip`, `trimClip`, `moveClips`)
   e exporte a montagem 16:9 como amostra intermediária. Registre o plano de cortes.
2. **Legendas.** Corrija a transcrição contra o áudio e agrupe:
   `python scripts/caderno_3d.py legendas transcricao.json --plano plano-de-cortes.json --saida legendas.json`
   (aceita `{"words":[{w,s,e}]}` do editor ou `[{text,start,end}]`; `--plano` remapeia
   tempos da fonte para a montagem). Blocos de 2–4 palavras, quebrando em pontuação, pausas e troca de falante.
3. **Configuração.** Copie `motion/hyperframes/templates/caderno-3d-threejs/exemplo-sintetico.json`
   para a pasta da edição e adapte (abaixo). `python scripts/caderno_3d.py validar config.json`.
4. **Amostra.** `preparar config.json --pasta NOVA --amostra`, `verificar --pasta NOVA`,
   `render --pasta NOVA --saida amostra.mp4`. Leve o MP4 a um projeto 1080×1920 no Concat
   e exporte com `--sample`. Apresente e aguarde aprovação.
5. **Completo.** Após aprovação: `preparar` sem `--amostra` em outra pasta, `render`,
   exportação no Concat com `--reviewed`. Verifique duração, sincronia, pretos e decodificação.

O preparador recusa pastas e saídas existentes, copia Three.js 0.186 local
(`--three` para outro caminho), GSAP do `motion/hyperframes`, Arial negrito do Windows
(ou `fonte` no JSON) e grava `manifesto.json` com hashes. Snapshots e renders rodam
sem `GEMINI_API_KEY` e com telemetria desligada; use sempre `--describe false` em snapshots manuais.

## Configuração (`schemaVersion: 1`)

Tempos em segundos **da montagem**. Unidades do caderno: 1 = 100 px; x de −4,6 a 4,6;
título em y≈1,85, objetos de +1,2 a −4,5 (legenda fica abaixo).

- `video`, `legendas`, `duracao`, `fonteVideo` {largura, altura}, `fixture` (true só para dados sintéticos).
- `planos`: enquadramento vertical contínuo de 0 até `duracao`: `cx`, `cy` (centro do rosto na fonte),
  `zoom` 1–2,5. Troque de plano nas trocas de câmera; um punch-in disfarça corte no mesmo plano.
  Meça rostos (ex.: OpenCV) e confira cada troca.
- `cards`: `from`, `to` (≥1,2 s), `y` 950–1300 px, `frente` {`texto` 1–2 linhas de até 20
  caracteres, `icone`}; opcional `verso` + `vira` (o card gira 180°).
- `blocos` (cenas de caderno): `id`, `from`, `to` (≥2,5 s), `photo` {x, y, w, rot} da foto viva,
  `cams` [{at, x, y, dist, roll}], `corteSeco` (entra sem transição, p.ex. numa troca de câmera
  para a moldura com os dois participantes), `out` (duração da volta), `itens`.
- `itens`:
  `titulo` {texto, destaque, at, ate} · `rotulo` {texto, x, y, at, ate, tamanho, largura, cor} ·
  `icone` {icone, material, x, y, z, escala, at, dur, elevacao} · `disco` {x, y, at} ·
  `caminho` {pontos [[x,y]], at, dur, cor, raio} · `no` {x, y, at} (emaranhado vermelho) ·
  `brilho` {x, y, z, cor, intensidade, alcance, at} ·
  `balanca` {x, y, at, esquerda/direita {icone, at, rotulo, escala, altura}, iguala} ·
  `pilha` {x, y, camadas [{tipo:"bloco", texto, at} | {icone, rotulo, at, y, escala}], base {rotulo, at}}.
- Materiais: `dourado`, `turquesa`, `lilas`, `roxo`, `branco` ou `#hex`. Cores de rótulo/caminho:
  `turquesa`, `dourado`, `vermelho`, `lilas`, `texto` ou `#hex`.
- Ícones (`python scripts/caderno_3d.py icones`): setaBaixo, setaCima, predio, livro, edital,
  coracao, vaso, figura, pessoas, capelo, folha, martelo, maleta, casa, bandeira.
- `encerramento` (opcional): `from` (a foto vai ao caderno), `saidaFoto` (sobe para fora; termine
  antes do fim do vídeo), `logoAt`, `extra` (segundos após a fala, 1,5–8, sem som), `logo` (PNG
  com alfa: a arte vai intacta na face; o contorno do alfa vira a espessura), `chamada`, `perfil`.
  `transicao: "corte"` (+ `fade`, padrão 0,12 s) mantém a última frase inteira em tela cheia e dissolve
  direto no encerramento; nesse caso `saidaFoto` não é usado e `from` fica no fim da fala.
  Opcional `rede: "instagram"` + `transforma`: entra primeiro o ícone do Instagram em 3D (degradê da
  marca) com a chamada e o @; em `transforma` ele dá meia-volta e vira o logo, que fecha o vídeo.
- `inserts` (opcional): imagens editoriais opacas 1080×1920 em tela cheia, 2,5–6 s, sem sobrepor cards,
  cenas ou encerramento e com ≥ 1 s de rosto entre elas. `imagem`, `camera` {de/para: x, y (foco em px
  da imagem), escala 1–1,35}, `saida` `flash` (desfoca e estoura em branco) ou `push` (acelera para dentro),
  `acentos` [{tipo `brilho` x, y, r, at, cor, intensidade, manter} | {tipo `caminho` pontos, at, dur, cor, largura}
  | {tipo `pulso` pontos, at, r, cor}]. Entra em corte seco com a câmera já em movimento; segura 0,3 s antes da
  saída (0,43 s). É câmera 2D sobre imagem plana: não chame de 3D nem simule partes independentes sem recorte.
- `amostra` {inicio, fim}: trecho de revisão com entrada, permanência e saída de cards, uma cena
  de caderno, legendas e retorno à fala.

O validador recusa sobreposição entre cards, blocos e encerramento, ícones/itens desconhecidos,
coordenadas fora da tela e planos com lacunas.

## Direção (para adaptar sem perder a identidade)

Um evento visual a cada 8–10 s, com pausas de fala limpa; objetos explicam a frase
(não decoram). Cards abaixo dos rostos (y≈1150) e acima das legendas (base em y≈1684).
Cores fixas do template: página #0d1834, turquesa #00d0b8, cards #1c172b, dourado #FFE368.
Vídeo sem correção de cor nem alteração de feições. Sem música/SFX/voz extra sem pedido.

## Exemplo sintético

```powershell
python scripts/caderno_3d.py fixture --pasta $env:TEMP\caderno3d-teste\fixture
python scripts/caderno_3d.py preparar $env:TEMP\caderno3d-teste\fixture\exemplo-sintetico.json --pasta $env:TEMP\caderno3d-teste\proj
python scripts/caderno_3d.py verificar --pasta $env:TEMP\caderno3d-teste\proj
```

Gera vídeo com duas silhuetas, tom de 220 Hz, legendas e logo sintéticos; cobre card com giro,
caderno com todos os itens básicos, balança e encerramento. `tests/test_caderno_3d.py` valida
o esquema e o agrupamento das legendas sem renderizar.
