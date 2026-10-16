import React from 'react';
import {Composition} from 'remotion';
import {MotionTemplate,motionTemplateDefaults,type MotionTemplateProps} from './MotionTemplate';
import {MotionImpactoWide} from './MotionImpactoWide';
import {ImpactoVertical,ImpactoWide} from './ImpactoMarca';
import {ImpactoPinterest,MotionImpactoDinamico} from './ImpactoDinamico';
import {MotionTeatroRetro} from './MotionTeatroRetro';
import {MotionFocoTotal} from './MotionFocoTotal';
import {MotionEditorialArtistico} from './MotionEditorialArtistico';
import {MotionTunelAssets,type TunelProps} from './MotionTunelAssets';
import {MotionTunelNarrativo,type TunelNarrativoProps} from './MotionTunelNarrativo';
import {MotionCadernoEditorial,MotionCadernoEditorialDark,type CadernoProps} from './MotionCadernoEditorial';
import {MotionKineticoEstrategico,kineticDefaults,kineticSchema} from './MotionKineticoEstrategico';
import {MotionKineticoFala,type KineticSpeechProps} from './MotionKineticoFala';
import {MotionDioramaTelejornalDark,telejornalDefaults,telejornalMetadata} from './MotionDioramaTelejornalDark';
import {DioramaTemplate01,dioramaDefaults} from './dioramaTemplate01/Diorama';
import {MotionContrasteCinetico,type ContrasteProps} from './MotionContrasteCinetico';
import {MotionPin129,pin129Defaults} from './MotionPin129';
import {MotionPin129Continuo,type ContinuousProps} from './MotionPin129Continuo';
import {MotionPin129Fala,type PinSpeechProps} from './MotionPin129Fala';
import {MotionLibraryDemo} from './motionLibrary/Demo';
import {CardsFluidosCadernoDark,cardsFluidosDefaults} from './CardsFluidosCadernoDark';

// Biblioteca de templates trazida do editor web arquivado (docs/templates/biblioteca/).
// Cada composicao recebe as props geradas pelo preparador do template; os padroes
// aqui sao vazios/sinteticos e assets ficam em public local (fora do Git).
const byProps=({props}:{props:{durationInFrames:number}})=>({durationInFrames:props.durationInFrames});
const V={fps:30,width:1080,height:1920} as const;
const contrasteDefaults:ContrasteProps={video:'video.mp4',audio:'audio.wav',duration:1,videoEnd:1,previewFrom:0,previewDuration:0,speakerX:.5,
 palette:{paper:'#f7f3ec',ink:'#141414',accent:'#e3172d',muted:'#bdb7ae',night:'#050505',arc:'#cbc7c0',pink:'#f4a6b0'},
 fonts:{regular:'fonts/arial.ttf',bold:'fonts/arialbd.ttf'},scenes:[],captions:[],captionY:1430,punches:[]};
const continuoDefaults:ContinuousProps={video:'video.mp4',audio:'audio.wav',duration:53.4,motionFrom:22.18,shots:[],scenes:[{from:22.18,to:53.4,x:0,y:0,asset:'',emphasis:'',emphasisAt:22.18,groups:[]}]};
const pinFalaDefaults:PinSpeechProps={video:'video.mp4',audio:'audio.wav',duration:1,previewFrom:0,previewDuration:1,shots:[],inserts:[]};
const kineticFalaDefaults:KineticSpeechProps={video:'',audio:'',duration:1,previewFrom:0,previewDuration:0,palette:{paper:'#eeede7',ink:'#242126',accent:'#7b20ad',secondary:'#ffba42',audio:'',scenes:[]},shots:[],inserts:[]};

export const BibliotecaCompositions:React.FC=()=><>
 <Composition id="MotionTemplate" component={MotionTemplate} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionImpactoWide" component={MotionImpactoWide} defaultProps={{...motionTemplateDefaults,theme:'impacto'} as MotionTemplateProps} durationInFrames={900} fps={30} width={1920} height={1080} calculateMetadata={byProps}/>
 <Composition id="MotionImpactoMarcaVertical" component={ImpactoVertical} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionImpactoMarcaWide" component={ImpactoWide} defaultProps={motionTemplateDefaults} durationInFrames={900} fps={30} width={1920} height={1080} calculateMetadata={byProps}/>
 <Composition id="MotionImpactoPinterest" component={ImpactoPinterest} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionImpactoDinamico" component={MotionImpactoDinamico} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionTeatroRetro" component={MotionTeatroRetro} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionFocoTotal" component={MotionFocoTotal} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionEditorialArtistico" component={MotionEditorialArtistico} defaultProps={motionTemplateDefaults} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionTunelAssets" component={MotionTunelAssets} defaultProps={motionTemplateDefaults as TunelProps} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionTunelNarrativo" component={MotionTunelNarrativo} defaultProps={{...motionTemplateDefaults,tunnels:[],videoEnd:30} as TunelNarrativoProps} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionCadernoEditorial" component={MotionCadernoEditorial} defaultProps={{...motionTemplateDefaults,sketchBlocks:[]} as CadernoProps} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionCadernoEditorialDark" component={MotionCadernoEditorialDark} defaultProps={{...motionTemplateDefaults,sketchBlocks:[]} as CadernoProps} durationInFrames={900} {...V} calculateMetadata={byProps}/>
 <Composition id="MotionKineticoEstrategico" component={MotionKineticoEstrategico} schema={kineticSchema} defaultProps={kineticDefaults} durationInFrames={600} {...V}
  calculateMetadata={({props})=>({durationInFrames:kineticSchema.parse(props).scenes.reduce((sum,scene)=>sum+Math.round(scene.duration*30),0)})}/>
 <Composition id="MotionKineticoFala" component={MotionKineticoFala} defaultProps={kineticFalaDefaults} durationInFrames={30} {...V}
  calculateMetadata={({props})=>({durationInFrames:Math.round((props.previewDuration||props.duration)*30)})}/>
 <Composition id="MotionDioramaTelejornalDark" component={MotionDioramaTelejornalDark} defaultProps={telejornalDefaults} calculateMetadata={telejornalMetadata} durationInFrames={1041} {...V}/>
 <Composition id="DioramaTemplate01" component={DioramaTemplate01} defaultProps={dioramaDefaults} durationInFrames={924} {...V}/>
 <Composition id="MotionContrasteCinetico" component={MotionContrasteCinetico} defaultProps={contrasteDefaults} durationInFrames={30} {...V}
  calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.round((props.previewDuration||props.duration-props.previewFrom)*30))})}/>
 <Composition id="MotionPin129" component={MotionPin129} defaultProps={pin129Defaults} width={720} height={1280} fps={30000/1001} durationInFrames={536}/>
 <Composition id="MotionPin129Continuo" component={MotionPin129Continuo} defaultProps={continuoDefaults} width={720} height={1280} fps={30} durationInFrames={1602}
  calculateMetadata={({props})=>({durationInFrames:Math.round(props.duration*30)})}/>
 <Composition id="MotionPin129Fala" component={MotionPin129Fala} defaultProps={pinFalaDefaults} width={720} height={1280} fps={30} durationInFrames={30}
  calculateMetadata={({props})=>({durationInFrames:Math.round((props.previewDuration||props.duration)*30)})}/>
 <Composition id="ConcatCardsCadernoDark" component={CardsFluidosCadernoDark} defaultProps={cardsFluidosDefaults} durationInFrames={900} {...V}
  calculateMetadata={({props})=>({fps:props.fps,durationInFrames:Math.round(props.duration*props.fps)})}/>
 <Composition id="MotionLibraryDemo" component={MotionLibraryDemo} durationInFrames={150} fps={30} width={1280} height={720}/>
</>;
