import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {marca} from './marca';
import {MotionTemplate, type MotionTemplateProps} from './MotionTemplate';
import {MotionImpactoWide} from './MotionImpactoWide';

// Brand appearances sit in the free header area; speech and video stay continuous.
const Brand: React.FC<{brand?:MotionTemplateProps['brand']}> = ({brand}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const t = frame / fps;
  const windows = brand?.windows ?? [[0, 4.1], [10.63, 14.4], [114.78, 120.2], [129.1, 132.57]];
  const window = windows.find(([start, end]) => t >= start && t < end);
  if (!window) return null;
  const age = frame - window[0] * fps;
  const enter = spring({frame: age, fps, config: {damping: 19, stiffness: 170}});
  const opacity = interpolate(t, [window[0], window[0] + .2, window[1] - .25, window[1]], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wide = width > 1080;
  const size = wide ? 112 : 126;
  return <AbsoluteFill style={{pointerEvents: 'none'}}><div style={{position: 'absolute', left: wide ? 65 : 58, top: wide ? 38 : 58, width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,.95)', boxShadow: '0 5px 20px #0003', opacity, transform: `translateY(${(1-enter)*-35}px) scale(${.8+.2*enter})`}}><Img src={marca(brand?.src )} style={{width: '100%', height: '100%', objectFit: 'contain'}} /></div></AbsoluteFill>;
};
export const ImpactoVertical: React.FC<MotionTemplateProps> = (props) => <><MotionTemplate {...props}/><Brand brand={props.brand}/>{props.audioMix && <Audio src={staticFile(props.audioMix)}/>}</>;
export const ImpactoWide: React.FC<MotionTemplateProps> = (props) => <><MotionImpactoWide {...props}/><Brand brand={props.brand}/>{props.audioMix && <Audio src={staticFile(props.audioMix)}/>}</>;
