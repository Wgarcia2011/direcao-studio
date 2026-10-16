import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneView} from './contraste/Scene';
import {clamp, KineticBlock} from './contraste/Words';
import type {ContrasteProps} from './contraste/types';

export type {ContrasteProps};

// Fala real em 9:16 com legenda cinética; cenas de Motion cobrem a tela inteira nos intervalos definidos.
const Timeline: React.FC<ContrasteProps> = props => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), t = frame / fps;
  const {palette} = props;
  const scene = props.scenes.find(s => t >= s.from && t < s.to);
  const after = props.scenes.find(s => s.exit === 'iris' && t >= s.to && t < s.to + 0.32 && !scene);
  const punch = props.punches.reduce((acc, p) => {
    const d = t - p.at;
    return d < 0 || d > p.dur ? acc : acc * (1 + (p.scale - 1) * Math.sin(Math.PI * Math.min(1, d / p.dur)) ** 0.6);
  }, 1);
  const caption = props.captions.find(c => t >= c.s && t < c.e);
  return <AbsoluteFill style={{background: palette.night, overflow: 'hidden'}}>
    <style>{`@font-face{font-family:CcRegular;src:url('${staticFile(props.fonts.regular)}')}@font-face{font-family:CcBold;src:url('${staticFile(props.fonts.bold)}')}`}</style>
    <Audio src={staticFile(props.audio)}/>
    <AbsoluteFill style={{transform: `scale(${punch})`, transformOrigin: '50% 30%'}}>
      <Sequence durationInFrames={Math.round(props.videoEnd * fps)}>
        <OffthreadVideo src={staticFile(props.video)} muted style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${props.speakerX * 100}% 50%`, filter: 'saturate(0.82) contrast(1.06)'}}/>
      </Sequence>
    </AbsoluteFill>
    {!scene && <AbsoluteFill style={{background: 'linear-gradient(transparent 52%, #000000b0 100%)'}}/>}
    {!scene && caption && <AbsoluteFill style={{opacity: interpolate(t, [caption.e - 0.08, caption.e], [1, 0], clamp)}}>
      <KineticBlock lines={[{tokens: caption.tokens, size: 0.95}]} t={t} x={540} y={props.captionY} width={1000} night palette={palette}/>
    </AbsoluteFill>}
    {after && <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs><mask id="cc-open"><rect width="1080" height="1920" fill="#fff"/><circle cx="540" cy="760" r={interpolate(t - after.to, [0, 0.32], [0, 1300], {...clamp, easing: x => 1 - Math.pow(1 - x, 3)})} fill="#000"/></mask></defs>
      <rect width="1080" height="1920" fill={palette.night} mask="url(#cc-open)"/>
    </svg>}
    {scene && <SceneView scene={scene} t={t} palette={palette} brand={props.brand}/>}
  </AbsoluteFill>;
};

export const MotionContrasteCinetico: React.FC<ContrasteProps> = props => {
  const {fps} = useVideoConfig();
  return <Sequence from={-Math.round(props.previewFrom * fps)}><Timeline {...props}/></Sequence>;
};
