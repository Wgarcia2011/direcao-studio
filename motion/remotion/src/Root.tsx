import React from 'react';
import {Composition} from 'remotion';
import {Motion, demo} from './Motion';
import {LowerThirdBasic,lowerThirdDemo,validateLowerThird} from './LowerThirdBasic';

export const Root: React.FC = () => <>
  <Composition id="DirecaoMotion" component={Motion} width={1080} height={1920}
    fps={30} durationInFrames={120} defaultProps={demo}/>
  <Composition id="LowerThirdBasico" component={LowerThirdBasic}
    width={1920} height={1080} fps={30} durationInFrames={600}
    defaultProps={lowerThirdDemo} calculateMetadata={({props})=>{
      validateLowerThird(props);
      return {durationInFrames:props.durationInFrames};
    }}/>
</>;
