import React from 'react';
import {Composition} from 'remotion';
import {Motion, demo} from './Motion';
import {LowerThirdBasic,lowerThirdDemo,validateLowerThird,LT_WIDTH,LT_HEIGHT,LT_FPS} from './LowerThirdBasic';
import {EditorialCompositions} from './editorial';
import {BibliotecaCompositions} from './biblioteca';
import {InterfaceElementos3D,interfaceElementos3DDemo,validateInterfaceElementos3D} from './InterfaceElementos3D';

export const Root: React.FC = () => <>
  <Composition id="DirecaoMotion" component={Motion} width={1080} height={1920}
    fps={30} durationInFrames={120} defaultProps={demo}/>
  <Composition id="LowerThirdBasico" component={LowerThirdBasic}
    width={LT_WIDTH} height={LT_HEIGHT} fps={LT_FPS} durationInFrames={600}
    defaultProps={lowerThirdDemo} calculateMetadata={({props})=>{
      validateLowerThird(props);
      return {durationInFrames:props.durationInFrames};
    }}/>
  <EditorialCompositions/>
  <Composition id="InterfaceElementos3D" component={InterfaceElementos3D} width={1080} height={1920}
    fps={30} durationInFrames={180} defaultProps={interfaceElementos3DDemo}
    calculateMetadata={({props})=>{validateInterfaceElementos3D(props);return {width:props.width,height:props.height,durationInFrames:Math.round(props.duration*30)};}}/>
  <BibliotecaCompositions/>
</>;
