import React from 'react';
import {Composition} from 'remotion';
import {EditorVideo,defaults} from './EditorVideo';
export const RemotionRoot:React.FC=()=> <><Composition id="DirecaoStudio" component={EditorVideo} defaultProps={defaults} durationInFrames={150} fps={30} width={1920} height={1080} calculateMetadata={({props})=>({durationInFrames:props.durationInFrames,width:props.width,height:props.height})}/></>;
