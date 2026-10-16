# Concat + Remotion + HyperFrames

Concat é o editor de montagem. Remotion e HyperFrames são criadores opcionais
de cenas, títulos e animações importáveis. A central salva `engine` no pedido,
nos planos e nos templates: `remotion`, `hyperframes` ou `both`. Em ambos,
o plano decide qual motor gera cada cena. Um bloco pode ficar só no Concat.

Execute `PREPARAR-MOTION.ps1 -Engine Ambos` para instalar e verificar os dois;
também aceita Remotion ou HyperFrames. Precisa de Node 22+ e acesso à internet
na instalação. Navegador do renderer pode exigir um download adicional.

Pontos de partida sintéticos em `motion/remotion` e `motion/hyperframes` não
são vídeos aprovados nem substituem a adaptação editorial. Copie o ponto de
partida para a pasta local do projeto antes de adaptá-lo. Use tempos medidos,
dimensões e fps iguais aos do projeto Concat e preserve seus arquivos fonte.

Remotion, dentro da cópia do projeto:

```powershell
npm ci
npm run lint
node build-player.cjs
npm run render -- --output 'C:/Users/SEU_USUARIO/Videos/Concat/cena-remotion.mp4'
```

Se mover a cópia, ajuste o destino do build-player.cjs para a pasta local de
prévia; o arquivo fornecido reconstrói a prévia técnica da central do repositório.
Depois de preparar o Remotion, `/motion-preview.html` na central mostra apenas
o exemplo sintético em um Player de leitura. Não é outro editor de montagem.

HyperFrames, dentro da cópia do projeto:

```powershell
npm ci
npm run lint
npm run check
npm run render -- --output 'C:/Users/SEU_USUARIO/Videos/Concat/cena-hyperframes.mp4'
```

Renderize uma amostra primeiro. A entrega completa requer aprovação humana
da versão atual. Os scripts npm são ferramentas de baixo nível; não aplicam
o portão do cliente Concat. Não execute renders de vídeos pessoais para testes.

Importe os MP4s na biblioteca do Concat, pela janela ou `media.import`, e
posicione-os na timeline nos intervalos planejados. Importe não significa
posicionar automaticamente. A edição dos elementos internos continua nos
fontes do motor escolhido: um MP4 é um clipe, não camadas de texto nativas.

As bases usam fundo opaco para compatibilidade em cenas de tela cheia. Para
compor sobre um apresentador, valide codec com alfa e suporte de importação;
não trate preto como transparência. Evite repetir voz, trilha ou legenda ao
combinar cenas de motores diferentes. Recursos e licenças dos frameworks
continuam sujeitos aos termos dos seus distribuidores.
