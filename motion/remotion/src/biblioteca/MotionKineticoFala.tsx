import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {KineticSceneView} from './kinetico/Scene';
import type {KineticProps, KineticScene} from './kinetico/types';

export type KineticSpeechProps = {
  video: string; audio: string; duration: number;
  previewFrom: number; previewDuration: number;
  palette: KineticProps;
  shots: {from: number; to: number; x: number}[];
  inserts: {from: number; to: number; scene: KineticScene}[];
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SpeechTimeline: React.FC<KineticSpeechProps> = props => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), time = frame / fps;
  const shot = props.shots.find(s => time >= s.from && time < s.to);
  const insert = props.inserts.find(s => time >= s.from && time < s.to);
  return <AbsoluteFill style={{background: '#15111b', overflow: 'hidden'}}>
    <style>{`@font-face{font-family:KineticSans;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:KineticSerif;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}')}`}</style>
    <Audio src={staticFile(props.audio)}/>
    <OffthreadVideo src={staticFile(props.video)} muted style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${(shot?.x ?? .5) * 100}% 50%`}}/>
    {!insert && <AbsoluteFill style={{background: 'linear-gradient(transparent 65%,#0008 100%)'}}/>}
    {props.inserts.map((item, i) => <Sequence key={i} from={Math.round(item.from * fps)} durationInFrames={Math.round(item.to * fps) - Math.round(item.from * fps)} name={item.scene.emphasis}>
      <InsertView scene={{...item.scene, duration: item.to - item.from}} palette={props.palette}/>
    </Sequence>)}
  </AbsoluteFill>;
};
const InsertView: React.FC<{scene: KineticScene; palette: KineticProps}> = ({scene, palette}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const end = Math.round(scene.duration * fps);
  return <AbsoluteFill style={{opacity: interpolate(frame, [0, 5, end - 6, end - 1], [0, 1, 1, 0], clamp)}}><KineticSceneView scene={scene} palette={palette} closing/></AbsoluteFill>;
};
export const MotionKineticoFala: React.FC<KineticSpeechProps> = props => <Sequence from={-Math.round(props.previewFrom * 30)}><SpeechTimeline {...props}/></Sequence>;
