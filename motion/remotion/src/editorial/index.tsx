import React from 'react';
import {Composition} from 'remotion';
import plan from '../../templates/short-editorial-9x16.json';
import {EditorialProps,SceneBase,sceneDuration} from './common';
import {Fechamento,FechamentoScene,Meta,MetaScene,Pergunta,PerguntaScene} from './scenes';

// Composicoes do template "short editorial 9:16". Cada render recebe uma cena do plano
// por --props (ver scripts/short_editorial.py); o padrao usa o exemplo sintetico.
const base=(id:string)=>({scene:plan.scenes.find(s=>s.id===id),video:'',sourceSize:plan.sourceSize,fonts:plan.fonts,brand:plan.brand});
const meta=({props}:{props:EditorialProps<SceneBase>})=>({durationInFrames:sceneDuration(props.scene)});

export const EditorialCompositions:React.FC=()=><>
 <Composition id="EditorialPergunta" component={Pergunta} width={1080} height={1920} fps={30} durationInFrames={90}
  defaultProps={base('A') as unknown as EditorialProps<PerguntaScene>} calculateMetadata={meta}/>
 <Composition id="EditorialMeta" component={Meta} width={1080} height={1920} fps={30} durationInFrames={135}
  defaultProps={base('C') as unknown as EditorialProps<MetaScene>} calculateMetadata={meta}/>
 <Composition id="EditorialFechamento" component={Fechamento} width={1080} height={1920} fps={30} durationInFrames={138}
  defaultProps={base('E') as unknown as EditorialProps<FechamentoScene>} calculateMetadata={meta}/>
</>;
