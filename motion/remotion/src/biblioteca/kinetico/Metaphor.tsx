import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {KineticScene} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const Metaphor: React.FC<{scene: KineticScene; accent: string; secondary: string; ink: string; paper: string}> = ({scene, accent, secondary, ink, paper}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame, [12, 52], [0, 1], clamp);
  const colors = [accent, secondary, '#53b5af', '#df719a'];
  return <svg viewBox="0 0 800 800" width="800" height="800" aria-label={scene.art}>
    {scene.art === 'target' && <>
      {[280, 210, 140, 70].map((r, i) => <circle key={r} cx="400" cy="400" r={r} fill={i % 2 ? paper : accent} stroke={ink} strokeWidth="3"/>)}
      <g style={{translate: `${interpolate(frame, [24, 43], [180, 0], clamp)}px ${interpolate(frame, [24, 43], [-180, 0], clamp)}px`, opacity: interpolate(frame, [24, 28], [0, 1], clamp)}}>
        <path d="M402 398 L655 145" stroke={ink} strokeWidth="15" strokeLinecap="round"/>
        <path d="M654 147 L655 84 L710 86 L709 141Z" fill={secondary} stroke={ink} strokeWidth="4"/>
        <path d="M401 398 L413 350 L447 384Z" fill={secondary}/>
      </g>
      <circle cx="400" cy="400" r={310 + 30 * p} fill="none" stroke={ink} strokeWidth="2" strokeDasharray="8 12" opacity={.4}/>
    </>}
    {scene.art === 'graph' && <>
      <path d="M100 660 H730 M100 660 V145" fill="none" stroke={ink} strokeWidth="3" opacity=".5"/>
      {[190, 330, 270, 480].map((h, i) => <rect key={i} x={150 + i * 140} y={650 - h * interpolate(frame, [14 + i * 6, 44 + i * 6], [0, 1], clamp)} width="96" height={h * interpolate(frame, [14 + i * 6, 44 + i * 6], [0, 1], clamp)} rx="3" fill={colors[i]}/>)}
      <path d="M170 420 L330 250 L475 340 L655 110" fill="none" stroke={ink} strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p}/>
      <path d="M632 111 L659 105 L658 133" fill="none" stroke={ink} strokeWidth="5" opacity={p}/>
    </>}
    {scene.art === 'cards' && [0, 1, 2].map(i => {
      const enter = spring({frame: frame - 10 - i * 9, fps, config: {damping: 17, stiffness: 140}});
      return <g key={i} style={{translate: `${(1 - enter) * 300}px ${(1 - enter) * 100}px`, opacity: Math.min(1, enter), rotate: `${(i - 1) * 9}deg`, transformOrigin: '400px 400px'}}>
        <rect x={115 + i * 38} y={180 + i * 124} width="510" height="156" rx="24" fill={i === 1 ? secondary : paper} stroke={ink} strokeWidth="3"/>
        <circle cx={178 + i * 38} cy={258 + i * 124} r="30" fill={accent}/>
        <text x={178 + i * 38} y={269 + i * 124} textAnchor="middle" fontSize="34" fontFamily="KineticSans" fill="white">{i + 1}</text>
        <text x={240 + i * 38} y={276 + i * 124} fontSize="46" fontFamily="KineticSans" fill={ink}>{scene.labels[i] ?? ['Organize', 'Escolha', 'Avance'][i]}</text>
      </g>;
    })}
    {scene.art === 'tv' && <>
      <path d="M230 631 L197 747 M570 631 L603 747 M350 180 L291 104 M350 180 L433 84" fill="none" stroke={ink} strokeWidth="14" strokeLinecap="round"/>
      <rect x="104" y="176" width="590" height="455" rx="52" fill={secondary} stroke={ink} strokeWidth="7"/>
      <rect x="133" y="210" width="451" height="367" rx="58" fill={ink}/>
      <rect x="157" y="234" width="403" height="319" rx="44" fill={paper}/>
      {[286, 374].map(y => <circle key={y} cx="638" cy={y} r="30" fill={paper} stroke={ink} strokeWidth="5"/>)}
      {[0, 1, 2, 3].map(i => <path key={i} d={`M610 ${464 + i * 18} H666`} stroke={ink} strokeWidth="5"/>)}
      <g style={{scale: String(.8 + .2 * p), transformOrigin: '360px 395px', rotate: `${Math.sin(frame / 22) * 5}deg`}}>
        <path d="M286 335 L436 395 L286 455Z" fill={accent}/>
      </g>
    </>}
    {scene.art === 'orbit' && <>
      <ellipse cx="400" cy="400" rx="320" ry="165" fill="none" stroke={ink} strokeWidth="3" style={{rotate: `${frame * .35 - 25}deg`, transformOrigin: '400px 400px'}}/>
      <ellipse cx="400" cy="400" rx="320" ry="165" fill="none" stroke={accent} strokeWidth="3" style={{rotate: `${-frame * .3 + 35}deg`, transformOrigin: '400px 400px'}}/>
      <circle cx="400" cy="400" r="160" fill={accent}/>
      <path d="M400 272 L425 374 L528 400 L425 426 L400 528 L374 426 L272 400 L374 374Z" fill={paper}/>
      <circle cx={400 + Math.cos(frame / 45) * 320} cy={400 + Math.sin(frame / 45) * 165} r="26" fill={secondary} stroke={ink} strokeWidth="3"/>
    </>}
  </svg>;
};
