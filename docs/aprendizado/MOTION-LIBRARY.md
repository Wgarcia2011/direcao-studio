> Guia trazido do editor web anterior. Os templates e comandos atuais estão em [docs/templates](../templates/README.md).

# Motion no Direção Studio

Integração da biblioteca motiondivision/motion, separada do motor Motion já existente.
O pacote `motion` é instalado no projeto Remotion com versão exata no lockfile.

## Interface

`src/motionLibrary/editor-ui.ts` usa `motion/mini` para confirmar a troca das abas
de ajustes e a exibição dos avisos. Não altera o layout nem os eventos de edição.
Movimento reduzido usa apenas uma transição de opacidade de 80 ms. Mudanças
rápidas cancelam a animação anterior. O bundle é local, sem CDN ou serviços externos.
`npm run build:player` na pasta app recompila Player e interface.

## Vídeos

`src/motionLibrary/components.tsx` fornece MotionReveal (título/card), MotionWords
(entradas com tempos explícitos por palavra) e MotionLine (traço SVG).
Os componentes usam useCurrentFrame e a função spring de Motion amostrada em
milissegundos. Não usam motion.div, requestAnimationFrame, animate ou CSS animation.
O frame é local à Sequence, e o fps vem da composição. Tempos de palavras reais
devem ser convertidos de segundos para frames, relativos à Sequence correspondente.

```tsx
import {MotionReveal, MotionWords} from './motionLibrary/components';

<MotionReveal from={12} durationInFrames={90} energy="balanced">
  <h1>Seu título</h1>
</MotionReveal>
<MotionWords words={['Sua', 'ideia']} starts={[12, 24]} />
```

São componentes disponíveis para novas cenas; os presets e vídeos anteriores
não foram migrados. MotionWords anima entradas, não substitui o CaptionTrack
nem a lógica de destaque da palavra ativa. `durationInFrames` controla a saída
do Reveal; use Sequence para limitar a presença na timeline.

## Demonstração e validação

No Studio (`npm run dev` em motion/remotion), selecione MotionLibraryDemo.
É uma fixture sintética de cinco segundos, sem mídia ou projetos do usuário.
`node test-motion-library.cjs` verifica frames repetidos, seek reverso e fps.
`npm run lint` verifica TypeScript/ESLint. Testes Python continuam na raiz.

Biblioteca MIT: https://github.com/motiondivision/motion
Spring: https://motion.dev/docs/spring
Licença completa em app/third-party/Motion-LICENSE.txt.
Motion+ e seus recursos pagos não fazem parte desta integração.

Validação em 14/10/2026: 68 testes Python aprovados; lint/TypeScript e build-player aprovados; teste de frames aprovado; demonstração H.264 de 150 frames exportada; interface conferida em desktop e 390 px sem erros de console. Arquivos de código substituídos preservados em backups/motion-library-integration-20261014.
