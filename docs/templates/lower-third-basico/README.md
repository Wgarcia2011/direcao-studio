# Lower third básico · v1

Template padrão para identificação formal em vídeos de YouTube, entrevistas e podcasts.
16:9, 1920×1080, 30 fps. Nome principal com cargo e especialidade; convidados em
faixas independentes. Logo em disco branco e foguete discreto na entrada/saída.
Sem legendas corridas, som ou recorte da imagem. Montagem final no Concat.

## Arquivos

- Componente: `motion/remotion/src/LowerThirdBasic.tsx`.
- Parâmetros de exemplo: `motion/remotion/templates/lower-third-basico.json`.
- Composição Remotion: `LowerThirdBasico`.
- Central de ideias: pedido **Lower third básico**, categoria **Identificação**.

## Reutilizar

Copie o projeto Remotion para a pasta da edição, sem node_modules, e execute
`npm ci` nessa cópia. Preserve os fontes usados em cada revisão.
Copie o JSON de exemplo para `templates/episodio.local.json` e edite:

- `credits`: `id` único, `name`, `role`, `detail` opcional, `from`/`to` em segundos;
  `primary: true` destaca a identificação principal; `x` e `width` em pixels.
- `durationInFrames`: duração a 30 fps. Exemplo: 600 = 20 segundos. Cada faixa
  deve durar ao menos 2 segundos e terminar dentro da composição.
- `logoSrc`: arquivo relativo a public, por exemplo `local/logo.png`.
- `rocketSrc`: foguete vertical separado e transparente, relativo a public.
  Sem arquivo, o exemplo usa um foguete vetorial sintético.
- `fontSrc`: fonte local relativa a public; vazia usa Arial/sans-serif.
- `colors`: fundo, destaque, nome e cargo. Confira contraste após trocar as cores.

Coloque assets privados em `public/local/` e configurações pessoais em
`templates/*.local.json`; ambos ficam ignorados pelo Git. O exemplo publicado
contém apenas textos e gráficos sintéticos. Não envie nomes, imagens ou fontes
licenciadas da produção para o repositório.

O frame completo está em pixels de 1920×1080. Para nomes/cargos longos, ajuste
largura, texto ou tamanho no componente e confira as bordas na prévia. Não há
redução automática da fonte. Verifique posições quando houver mais pessoas;
o template não associa nomes a rostos nem detecta o apresentador.

### Foguete recortado do próprio logo

Quando autorizado, use `logoSrc` junto de `rocketMask`, mantendo `rocketSrc`
vazio. A máscara aceita `viewBox` e `path` SVG nas coordenadas de uma imagem
1280×1280. Ela recorta a exibição do bitmap sem modificar o original. Para outro
tamanho, ajuste o componente ou forneça `rocketSrc`. A máscara não é universal:
confira o contorno em cada marca. O exemplo básico não inclui uma marca real.

### Fundo e exportação

`backgroundMode` aceita:

- `synthetic`: demonstração com fundo geométrico, sem vídeo pessoal.
- `video`: `videoSrc` local e `sourceStartFrame` em quadros; vídeo inteiro,
  `object-fit: contain`, sem áudio. Exporte a peça e coloque-a na timeline no
  mesmo instante da fonte. A voz fica somente no clipe-base do Concat.
- `transparent`: só as identificações. MP4 H264 não preserva alfa; escolha um
  codec apropriado e confirme importação/composição no Concat antes de usar.
  Esta entrega não valida um caminho de alfa no Concat.

```powershell
npm run lint
node build-player.cjs
npx remotion studio --no-open
# Escolha LowerThirdBasico e carregue os parâmetros do episódio.
npx remotion render src/index.ts LowerThirdBasico --props=templates/episodio.local.json --output=lower-third-episodio.mp4 --codec=h264
```

O último comando serve para os modos opacos. Primeiro gere uma amostra e siga
a revisão humana prevista em CLAUDE.md. Não use material pessoal para testar
mudanças no código. Importe o resultado no Concat; um clipe renderizado não vira
camadas de texto nativas. A edição interna permanece no componente/JSON.

Para ver só o exemplo sintético: `npm run render:lower-third -- --output=demo.mp4`.
A composição técnica `DirecaoMotion` continua disponível separadamente.
