import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Metaphor} from './Metaphor';
import type {KineticProps, KineticScene} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = {...clamp, easing: Easing.bezier(.16, 1, .3, 1)};
export const KineticSceneView: React.FC<{scene: KineticScene; palette: KineticProps; closing?: boolean}> = ({scene, palette, closing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const colored = scene.mode === 'accent';
  const ink = colored ? palette.paper : palette.ink;
  const last = Math.round(scene.duration * fps);
  return <AbsoluteFill style={{backgroundColor: colored ? palette.accent : palette.paper, overflow: 'hidden', color: ink}}>
    <AbsoluteFill style={{backgroundImage: `linear-gradient(${ink}12 1px, transparent 1px),linear-gradient(90deg,${ink}12 1px,transparent 1px)`, backgroundSize: '64px 64px', opacity: colored ? .5 : 1, translate: `0px ${-frame * .12}px`, scale: '1.03'}}/>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 45% 40%,transparent 25%,#00000010 100%)'}}/>
    {colored && <svg viewBox="0 0 400 400" style={{position: 'absolute', right: -55, top: -90, width: 300, rotate: `${-12 + frame * .13}deg`, opacity: .8}}><path d="M200 0 L226 160 L380 75 L250 190 L400 200 L250 220 L355 350 L223 250 L200 400 L177 250 L40 360 L153 220 L0 200 L152 182 L45 45 L175 151Z" fill={palette.paper}/></svg>}
    <div style={{position: 'absolute', left: 96, top: 235, width: 888, textAlign: 'center'}}>
      <div style={{fontFamily: 'KineticSerif', fontSize: 98, lineHeight: 1.04, letterSpacing: -2}}>
        {scene.lead.split(' ').map((word, i) => <span key={i} style={{display: 'inline-block', marginRight: 20, opacity: interpolate(frame, [i * 3, i * 3 + 6], [0, 1], clamp), translate: `0px ${interpolate(frame, [i * 3, i * 3 + 12], [35, 0], ease)}px`}}>{word}</span>)}
      </div>
      <div style={{fontFamily: 'KineticSans', fontSize: scene.emphasis.length > 14 ? 110 : 138, fontWeight: 700, lineHeight: .98, letterSpacing: -5, marginTop: 24, overflowWrap: 'break-word', opacity: interpolate(frame, [10, 16], [0, 1], clamp), scale: String(.88 + .12 * spring({frame: frame - 10, fps, config: {damping: 15, stiffness: 160}}))}}>{scene.emphasis}</div>
    </div>
    <div style={{position: 'absolute', top: 690, left: 140, width: 800, height: 800, filter: 'drop-shadow(0px 24px 14px #00000016)', opacity: interpolate(frame, [10, 18], [0, 1], clamp), translate: `0px ${interpolate(frame, [10, 32], [90, 0], ease)}px`, scale: String(interpolate(frame, [10, 35, last], [.8, 1, 1.035], ease)), rotate: `${interpolate(frame, [10, 38], [-8, 0], ease)}deg`}}>
      {scene.asset ? <Img src={staticFile(scene.asset)} style={{width: '100%', height: '100%', objectFit: 'contain'}}/> : <Metaphor scene={scene} accent={palette.accent} secondary={palette.secondary} ink={palette.ink} paper={palette.paper}/>}
    </div>
    <div style={{position: 'absolute', left: 110, top: 1535, width: 860, textAlign: 'center', fontFamily: 'KineticSerif', fontSize: 76, lineHeight: 1.08, opacity: interpolate(frame, [32, 44], [0, 1], clamp), translate: `0px ${interpolate(frame, [32, 46], [24, 0], ease)}px`}}>{scene.caption}</div>
    {!closing && <AbsoluteFill style={{backgroundColor: scene.mode === 'paper' ? palette.accent : palette.paper, translate: `0px ${interpolate(frame, [last - 9, last - 1], [1920, 0], ease)}px`}}/>}
  </AbsoluteFill>;
};
