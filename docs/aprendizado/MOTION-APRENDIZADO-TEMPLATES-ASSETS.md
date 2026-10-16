> Guia trazido do editor web anterior. Os templates e comandos atuais estão em [docs/templates](../templates/README.md).

# Aprendizado — templates de Motion 9:16 com assets PNG gerados por IA

Registro do processo validado em 09/10/2026 (vídeos 08, 18, 19 e 23 do lote podcast).
Serve para replicar o resultado em qualquer vídeo novo, com Claude, Codex ou outro agente.
Regras de `CLAUDE.md` continuam valendo: nada de alterar originais, nada de enviar mídia
para fora, nada de aprovar ou exportar sem pedido explícito.

## 1. O que o usuário aprovou

- **Formato e narrativa:** 9:16, ≈30 s, em subida: pergunta → vale (negativo) → virada → fechamento.
- **Dinâmica:** título em duas linhas (frase curta pequena + palavra grande que entra com desfoque no tempo exato da fala); vídeo em cartão ou círculo que muda de forma a cada trecho; pílulas empilhadas; legenda palavra a palavra embaixo, com palavras-chave em destaque.
- **Contraste de humor:** fundo escuro e vídeo em preto e branco no vale; volta ao claro com abertura em círculo na virada.
- **Emojis:** no máximo 2–4 por vídeo. A legenda substitui o "caminho" que antes ficava na faixa inferior (o usuário pediu para tirar).
- **Onde salvar:** os editados vão para a subpasta `MOTION/` da pasta de cada vídeo.
- **Assets:** a dinâmica foi aprovada, mas os objetos desenhados em código ficaram "muito ruins". Por isso passaram a ser PNGs gerados por IA (Codex, `image_gen`), podendo intercalar com objetos em código.

## 2. Peças do sistema

| Peça | Caminho |
|---|---|
| Motor dos templates (temas `editorial`, `estudio`, `impacto`) | `motion/remotion/src/biblioteca/MotionTemplate.tsx` |
| Esquema do `template.json` | `docs/MOTION-TEMPLATES.md` |
| Preparo do corte + render | `scripts/biblioteca_motion.py preparar CAMINHO/template.json [--render]` |
| Conferência dos PNGs | `scripts/conferir-motion-assets.py PASTA` |
| Briefing para outras IAs | `PASTA-DA-EDICAO` |
| Assets finais, variações, prompts exatos | `motion/remotion/public/motion-assets/` (fora do Git): `<tema>/*.png`, `<tema>/variacoes/`, `manifesto-assets.json`, `LEIA-ME.md` |
| Exemplos prontos | `PASTA-DA-EDICAO` (estúdio) e `23 …/MOTION/template.json` (impacto) |

## 3. Receita para um vídeo novo

1. **Fala:** ler `analise/transcricao-original.json` e escolher 5–9 trechos que formem a subida.
   Fim do trecho = fim (`e`) da última palavra + margem, e **antes** do início da próxima palavra.
   O Whisper costuma esticar o `e` até a próxima palavra; se o trecho cortar antes, a palavra some da legenda.
2. **Rostos:** extrair uma grade de frames do corte e anotar `fx`/`fy` de quem fala por câmera
   (no podcast: exemplo B ≈ 0,33/0,36; exemplo A ≈ 0,66/0,33; apresentador ≈ 0,52/0,24).
3. **`template.json`:** cenas com tempos da fala original (`"sN"` = início do trecho N; `"end"`).
   Ligar cada título, pílula, objeto, zoom e humor à palavra que o dispara.
   Corrigir grafias da transcrição em `fix` (aceita `"palavra@tempo"` para uma ocorrência só).
4. **Objetos:** cada objeto com `kind` (código) **e** `src` (PNG). Se o PNG ainda não existir, o script avisa e usa o código, então dá para renderizar antes dos assets ficarem prontos.
5. **Preparar e conferir:** rodar o script, gerar 5–14 stills e olhar rosto, legenda e sobreposições. Em geral foram 1–2 rodadas de ajuste.
6. **Render:** `--render`. Usar um nome de saída novo para cada amostra (`-assets-amostra`, `-v2`…), sem sobrescrever versões que o usuário já viu.
7. **Entrega:** tabela saída × original × fala, lista de efeitos, pontos a conferir. Não afirmar que assistiu ou ouviu.

## 4. Geração dos PNGs (o que funcionou)

**Especificação:**
- PNG RGBA de 1024×1024, alfa real, objeto inteiro centralizado com ≈10% de margem uniforme e luz vinda de cima à esquerda.
- Sem chão, sem sombra projetada, sem texto, marca ou rosto.
- Exatamente **um objeto por imagem**, nunca uma folha com vários.

**Estrutura de prompt usada pelo Codex** (os prompts completos estão em `manifesto-assets.json`):

```
Use case: stylized-concept. Asset type: isolated PNG object for a narrated motion video.
Subject: <objeto descrito com forma e ângulo>. Style: <estilo do tema>.
Lighting from above-left, subtle self-shading only. Composition: square 1024x1024 pixels,
centered entire object, uniform approximately 10 percent transparent margins, simple bold
silhouette legible at 300 pixels. Genuine transparent alpha background. No floor, no ground
shadow, no backdrop, no text, lettering, numbers, brand, logo, crest, watermark, person or
real face. Produce exactly ONE object asset, not a sheet. Variant <A|B>, <diferença>.
```

**Estilo por tema:**
- **estudio:** glossy black ceramic 3D object with chrome-like specular highlights, minimal premium studio product render, three-quarter view.
- **impacto:** black and white photocopy collage cutout, high contrast, halftone grain, thick white sticker outline; vermelho #E3262B só nos símbolos (✓, ✕).
- **editorial:** clean minimal 3D object, matte white and light grey with one dark accent, soft shadows, Apple-like product style.

**Processo:**
1. Gerar 2 variações por item, a e b, em `<tema>/variacoes/<nome>-a.png`.
2. Normalizar tamanho e margem localmente (o Codex usou Sharp), preservando o alfa.
3. Conferir com `scripts/conferir-motion-assets.py <tema>/variacoes`, que gera tabela e prancha sobre cinza e preto.
4. Escolher 1 por item e copiar com o nome final para `<tema>/<nome>.png`.
5. Registrar a escolha em `manifesto-assets.json`.

**Lições:**
- **Objetos extras vazam para a imagem:** o documento veio com um post-it colado (variações a e b). Foram precisas mais duas gerações, c e d, com "sem post-it, sem objetos extras" explícito. Para itens que se parecem entre si, diga o que **não** deve aparecer.
- **A margem do PNG reduz o tamanho visual:** livro e trave pareceram pequenos com o tamanho padrão. Use `size` no objeto (livro 680, trave e bandeira 520 no estúdio) e confira o still.
- **Objeto preto sobre fundo escuro perde força:** foi o caso da trave na cena do vale. Funciona pelo reflexo, mas fica mais fraco; prefira objeto preto em cena clara ou acrescente brilho atrás.
- **No tema impacto, o PNG não pode receber preto e branco:** o filtro foi tirado, senão o vermelho do ✓ e do ✕ se perde. Os recortes em preto e branco já vêm sem cor da geração.
- **O "halo claro" acusado pelo verificador é esperado no impacto:** é o contorno branco de adesivo. Nos outros temas, halo claro indica fundo mal removido.
- **Escolha final:** o usuário pediu para aplicar as sugestões de Claude. Os arquivos finais seguem `selecaoFinalUsuario` no manifesto, que difere em alguns itens da escolha inicial do Codex.
- **Ideias em vez de cópia:** as referências do Pinterest foram usadas como direção de estilo (layout, tipografia, ritmo), sem copiar marca, texto ou imagem.

## 5. Dinâmica — parâmetros que valeram a pena

- **Títulos:** palavra grande entra com mola (damping 15, rigidez 190), subindo 40 px e com desfoque de 10 px até 0. A linha pequena entra palavra por palavra, a cada 0,07 s.
- **Troca de cena:** a cena sobe 160 px e gira de leve, −3°. O vídeo muda de forma com mola 17/120. Há uma aproximação contínua de até 5% dentro da cena e zooms bruscos (1,15–1,32) nas palavras-chave.
- **Vale → virada:** fundo escuro em 0,3 s; volta ao claro com `clip-path: circle()` em 0,55 s.
- **Negativo:** vídeo em preto e branco, contraste +20%, vinheta e tremor de 12 frames no gatilho.
- **Positivo:** saturação +20% e confete determinístico (`random()` do Remotion).
- **Impacto:**
  - marca-texto vermelho atrás da palavra grande e franja vermelho/ciano de ±3 px;
  - papel quadriculado deslizando e granulação animada (`feTurbulence` com `seed = frame % 9`);
  - risco vermelho na palavra negada ("~~fracasso~~");
  - gráfico em linha que se desenha em 1,1 s.
- **Estúdio:** objeto como destaque no centro, balançando em `rotateY` ±22°, e vídeo reduzido a círculo de 520 px abaixo.
- **Legenda:** blocos de até 4 palavras. A palavra-chave fica maior (62 px contra 46 px) e em negrito; no impacto, fica vermelha com brilho.

## 6. Pendências conhecidas

- Os vídeos 18 e 19 ainda usam composições próprias (`exemplo-aAprovacaoEditorial.tsx`, `exemplo-bAprovacaoEditorial.tsx`), com objetos em código. Os PNGs do editorial estão prontos para eles.
- `impacto/linha-chegada.png` está pronto, mas a frase "cruzar a linha de chegada" ficou fora do corte do 23.

## 7. Templates reutilizáveis e descoberta pelos próximos agentes

Os três modelos de partida estão em `docs/templates/motion/`: `estudio.template.json`, `impacto.template.json` e `editorial.template.json`. Leia o `README.md` dessa pasta antes de copiar. São esqueletos de dados, com trechos e frases ilustrativos; precisam de seleção, palavras e enquadramento da entrevista real.

Eles usam a composição `MotionTemplate` existente, preservam `kind` junto de `src` e permitem vários objetos por cena. Os assets permanecem em `public/motion-assets/`, fora do Git; os modelos e esta receita podem acompanhar o código, sem vídeo, áudio, dados reais ou mídia.

## 8. Cuidados confirmados nesta geração e integração

- Foram geradas duas variantes de cada um dos 16 arquivos (o par de cadeados conta como dois arquivos). O documento recebeu duas correções adicionais; a variante C foi a escolha inicial. O estado atual da escolha do usuário no manifesto deve prevalecer sobre essa história.
- O gerador retornou dimensões diferentes de 1024 em alguns casos. Não confie só no prompt: confira o PNG real. A entrega foi normalizada localmente com Sharp para 1024×1024, mantendo alpha e centralizando a arte em uma caixa de até 820×820, com cerca de 10% de margem.
- A primeira integração usou objetos do impacto com `x=880`, `y=1490`, `size=260–300`; foram conferidos fora do rosto e da legenda em 7 stills do vídeo 23. O vídeo 08 teve 9 stills. Ambos também tiveram frames extraídos do MP4 e duração/áudio verificados por ffprobe. Isso documenta os pontos conferidos, não aprovação final nem uma revisão de ajustes posteriores.
- Aumentar o livro para 680 com o mesmo centro pode ultrapassar a borda direita. Reposicione e confira a caixa e a silhueta, inclusive durante a entrada e a rotação. Não transforme os tamanhos ajustados para um vídeo em regras universais.
- Com `src`, o PNG preserva entrada e balanço, mas não ganha os estados geométricos do desenho em código. `openAt` não abre uma imagem estática; alterne PNGs fechado/aberto por cena ou por intervalos.
- Não reutilize tempos, transcrição, rosto ou aprovação de um vídeo em outro. Reutilize o motor, o esquema e a linguagem visual; derive cada gatilho da fala atual.
- Evite repetir geração ao retomar: confira manifesto e arquivos existentes, preserve os selecionados e gere apenas itens ausentes ou correções solicitadas. Não sobrescreva escolhas posteriores com os scripts locais de seleção desta rodada.
- O Chromium do Remotion usa loopback para renderizar. Se o ambiente bloquear com `EACCES 127.0.0.1`, a correção é permitir essa execução local pelo fluxo de permissões; não enviar mídia a outro serviço. Os renders desta rodada continuaram locais.

## 9. Prompt de retomada

```text
Responda em português. Leia CLAUDE.md, docs/MOTION-APRENDIZADO-TEMPLATES-ASSETS.md,
docs/MOTION-TEMPLATES.md e docs/templates/motion/README.md.
Adapte docs/templates/motion/[TEMA].template.json para [VÍDEO], usando a transcrição
real e salvando na pasta MOTION do vídeo. Reutilize os PNGs existentes em
motion/remotion/public/motion-assets/, respeitando a seleção atual do manifesto.
Sincronize cada efeito à palavra original, ajuste o enquadramento por frames e
misture PNG e código com kind+src e objetos independentes quando fizer sentido.
Preserve o vermelho dos assets de impacto e confira contraste dos pretos no escuro.
Confirme dimensões/alpha dos PNGs, confira rosto e legenda em stills e renderize
uma amostra com nome novo. Verifique frames, duração e áudio do próprio MP4.
Não altere originais nem envie mídia a serviços externos. Não aprove ou exporte
final sem aprovação explícita da amostra atual.
```

## 10. Corte longo da exemplo A e logo (09/10/2026)

- Quando o corte pronto já atende à duração solicitada, reutilizar o arquivo inteiro e comparar SHA-256 da cópia, evitando recortar novamente. O vídeo 12 usa 132,57s contínuos com 29 cenas visuais.
- Para os dois formatos, compartilhar transcrição e tempos, mas adaptar o layout: vídeo inteiro à esquerda em 16:9; foco por câmera no cartão vertical em 9:16. `MotionImpactoWide.tsx` reutiliza `HeroObject`.
- Seis objetos adicionais do tema impacto estão em `motion-assets/impacto/exemplo-a-revisao/`, com manifesto e variantes. Conferir antes de gerar novamente.
- Logo fornecida e autorizada pelo usuário: `motion-assets/marca/logo.png`. Preservar cores e geometria; usar entradas breves em área livre. Exemplo reutilizável em `exemplo-aRevisaoBrand.tsx`, com quatro intervalos explícitos, sem pausa na fala. Não copiar esses tempos para outro vídeo sem conferir o conteúdo.
- O nome Paulo Helene foi confirmado pelo usuário; preservar o apelido Paulinho na fala seguinte.

## Próximo render: comparar GPU e CPU

Preferência explícita do usuário em 09/10/2026: manter o render atual da exemplo A pela CPU e, no próximo trabalho, testar código com GPU. Antes do render completo, comparar o mesmo trecho curto nas duas configurações, registrando tempo e qualidade. Distinguir aceleração do Chromium na criação dos frames da codificação NVENC. Remotion instalado 4.0.533 suporta NVENC no Windows; verificar placa e driver disponíveis. O perfil atual usa CRF 18; hardwareAcceleration não aceita CRF nessa versão, portanto definir e validar um perfil próprio de bitrate para o teste GPU. Não trocar silenciosamente o render atual.

## Preferência de legibilidade — próximos vídeos

Em 09/10/2026 o usuário pediu: “nos próximos pode aumentar bem o tamanho das fontes que ficam na parte inferior”. Aplicar aos próximos vídeos: aumentar bastante o tamanho das legendas e demais textos inferiores, conferir em prévia com tamanho de celular, respeitar margens e evitar sobreposição com rostos/objetos. Não limitar a mudança às palavras destacadas: o texto normal também precisa ficar legível. Ajustar quantidade de palavras por grupo quando necessário. Pedido explicitamente futuro; não alterar por esse motivo o render atual da exemplo A.


## Direção atualizada — dinamismo, cor e som

O usuário pediu aplicar agora as legendas maiores, áudio de pacotes com efeitos cerca de 8 dB abaixo da voz e dinamismo com zooms, fades, perspectiva e parallax. Manter a entrevista colorida na maior parte; P&B só em ênfases pontuais, não como regra do vídeo inteiro. Fazer movimentos ligados ao sentido da fala, sem som a cada palavra. exemplo A v3 usa props opcionais `largeCaptions`, `selectiveMonochrome`, `enhancedMotion`, `audioMix`; preservam compatibilidade das versões antigas quando ausentes. Conferir layout em ambos os formatos. Pacote Kenney Interface Sounds CC0 está salvo localmente com licença; reutilizar antes de baixar outros. Medir relação de nível dos efeitos contra a fala local, não simplesmente aplicar -8 dB ao arquivo do efeito. Medição V3 ficou em 8–12 dB abaixo, preservando ganho da voz. Teste curto RTX 5060 mostrou 15,912s contra 27,302s no perfil CPU; repetir quando composição/perfil mudar. O usuário buscará novas referências para trabalhos futuros.

## Ritmo por seções e referências — 09/10/2026

Pedido do usuário: pensar a montagem como música (verso, pré-refrão, refrão, ponte, outro), variando energia e respiro. Para exemplo A v3: intro 0–10,633; verso 10,633–32; preparação 32–50,84; refrão 50,84–88,42; ponte 88,42–110,14; encerramento 110,14–132,567s. Nomes são direção interna, não textos na tela. Fala permanece contínua.

Referências fornecidas: https://br.pinterest.com/pin/902127369124431028/ e https://br.pinterest.com/pin/933230354045109691/ . Abri ambos no navegador; títulos e algumas imagens visíveis, mas modal de login encobriu a reprodução. Não considerar análise completa de movimento nem incorporar mídia desses Pins sem revisar acesso/licença. Na primeira apareceu tipografia verde sobre preto; na segunda, tipografia sobre ambiente escuro. A estrutura por seções vem da orientação expressa do usuário e da fala da exemplo A, não de uma alegação de ter assistido integralmente às referências.

Temporários do render V3: `.render-tmp/exemplo-a-v3/` no D, variável TEMP/TMP só no processo. C estava com cerca de 100 MB livres e houve ENOSPC. O bundle agora copia apenas mídia/assets/fontes usados, em vez de toda a pasta public com projetos antigos. Não apagar vídeos do usuário. O usuário informou que cuidaria dos antigos.

Atualização: após o usuário fazer login, foi possível comparar trechos em reprodução dos dois Pins. Análise e tempos realmente amostrados em `PASTA-DA-EDICAO`. Supera a limitação inicial de login descrita acima. Recursos observados: cards sequenciais/rolagem vertical na primeira; alternância entre composição gráfica intensa e pessoa em tela na segunda. Não tratar amostragem como revisão integral nem copiar dados/contadores das referências para depoimentos reais.


## 09/10/2026 — Impacto Dinâmico

Novo template separado: docs/templates/motion/IMPACTO-DINAMICO.md. Somente 9:16 nesta entrega, paleta azul-marinho/turquesa do logo, legendas inferiores grandes, cor predominante e ênfases seletivas com cards/perspectiva/parallax. Corrigir texto tanto no título quanto nas palavras inferiores: confiarem. Voz original mais efeitos medidos 8–12 dB abaixo da voz local. Referência Pinterest 1086986060093001748 reservada para outro template após concluir esta edição; análise ainda pendente.


## 09/10/2026 — Teatro Retrô, referência 1086986060093001748

Após gostar da V4, usuário pediu a mesma edição no estilo da nova referência. Criado template separado MotionTeatroRetro, com paleta derivada da marca e papel creme, cortinas, estrelas suspensas, nuvens e cartas em perspectiva. Manter entrevista colorida, legendas grandes e áudio autorizado. Conferir largura dos títulos em caixa alta; dimensionamento adaptativo evitou cortar confiarem. A referência é vocabulário visual, não fonte de personagens ou mídia. Não substituir o Impacto Dinâmico aprovado.


## 09/10/2026 — Foco Total V6

Nova direção: quem fala em tela cheia, sem moldura, alternando repetidamente com imagem + descrição e voltando ao rosto. Tipografia é crucial: palavras grandes, sincronizadas, destaque seletivo, boa quebra e contraste sem cobrir rosto. Não restringir esta linguagem a um ou dois intervalos. V6 abre com entrevista, alterna 14 inserções, usa máscaras/slide/cortes e SVGs animados em código após referência Prompt Motion. Template separado FOCO-TOTAL.md; preservar V4/V5. Asset novo em public/motion-assets/tela-cheia/estudo-noturno.png.


## Revisão após rejeição da V6

Usuário rejeitou máscaras/painéis e tipografia genérica da V6 por pouca fidelidade à referência. Nesta edição, priorizar frase composta com serif bold italic + sans forte, objetos com rotação visível e zoom coordenado. Reutilizar assets relacionados à fala. Não inventar imagens sem vínculo, métricas ou cenas apenas para preencher. Documentação detalhada em docs/templates/motion/EDITORIAL-ARTISTICO.md. A V7 é amostra para análise, não aprovação automática.

## Fluxo de aprovação solicitado em 09/10/2026

Nas próximas versões/edições, preparar uma prévia curta representativa ou uma visualização reproduzível para o usuário assistir e aguardar aprovação explícita antes de iniciar o render completo. Mostrar entrada, permanência, saída, tipografia e retorno à fala. Não tratar aprovação da direção geral como aprovação da prévia específica. A V7 já estava renderizando quando essa preferência foi definida; concluir a V7 atual.
