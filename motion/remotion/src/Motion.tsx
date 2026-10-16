import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export type MotionProps = {title: string; subtitle: string; accent: string};
export const demo: MotionProps = {title: 'Uma ideia de cada vez.', subtitle: 'Exemplo sintético · adapte à fala real', accent: '#d1b4ff'};

export const Motion: React.FC<MotionProps> = ({title, subtitle, accent}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  return <AbsoluteFill style={{backgroundColor: '#0b0716', color: '#f5f0ff', justifyContent: 'center', padding: width * 0.12, fontFamily: 'sans-serif'}}>
    <div style={{opacity: interpolate(frame, [0, fps * 0.4], [0, 1], {extrapolateRight: 'clamp'}), translate: `0 ${interpolate(frame, [0, fps * 0.5], [35, 0], {extrapolateRight: 'clamp'})}px`}}>
      <h1 style={{fontSize: width * 0.075, lineHeight: 1.15, margin: 0, maxWidth: '15ch', color: accent}}>{title}</h1>
      <p style={{fontSize: width * 0.025, lineHeight: 1.5, marginTop: 35}}>{subtitle}</p>
    </div>
  </AbsoluteFill>;
};
