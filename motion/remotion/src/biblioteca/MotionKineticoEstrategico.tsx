import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {KineticSceneView} from './kinetico/Scene';
import type {KineticProps} from './kinetico/types';
export {kineticDefaults, kineticSchema} from './kinetico/types';

export const MotionKineticoEstrategico: React.FC<KineticProps> = (props) => {
  let start = 0;
  return <AbsoluteFill>
    <style>{`@font-face{font-family:KineticSans;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:KineticSerif;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}')}`}</style>
    {props.audio && <Audio src={staticFile(props.audio)}/>}
    {props.scenes.map((scene, i) => {
      const from = start;
      const duration = Math.round(scene.duration * 30);
      start += duration;
      return <Sequence key={i} from={from} durationInFrames={duration} name={`${i + 1} · ${scene.emphasis}`}><KineticSceneView scene={scene} palette={props} closing={i === props.scenes.length - 1}/></Sequence>;
    })}
  </AbsoluteFill>;
};
