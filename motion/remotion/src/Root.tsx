import React from 'react';
import {Composition} from 'remotion';
import {Motion, demo} from './Motion';
import {LowerThirdBasic,lowerThirdDemo,validateLowerThird,LT_WIDTH,LT_HEIGHT,LT_FPS} from './LowerThirdBasic';
import {EditorialCompositions} from './editorial';

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
</>;
