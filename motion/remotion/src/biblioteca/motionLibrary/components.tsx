import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {motionProgress, motionSpringAtFrame, type MotionEnergy} from './frame';

type RevealProps = {
  children: React.ReactNode;
  from?: number;
  durationInFrames?: number;
  energy?: MotionEnergy;
  distance?: number;
  style?: React.CSSProperties;
};

/** Frame offsets are local to the enclosing Remotion Sequence. */
export function MotionReveal({children, from = 0, durationInFrames, energy = 'balanced', distance = 32, style}: RevealProps) {
  const frame = useCurrentFrame() - from;
  const {fps} = useVideoConfig();
  const entry = motionSpringAtFrame(frame, fps, energy);
  const exit = durationInFrames === undefined ? 1 : 1 - motionProgress(frame, Math.max(0, durationInFrames - 8), 8);
  return <div style={{...style, opacity: Math.min(1, Math.max(0, entry)) * exit, translate: `0 ${(1 - entry) * distance}px`, scale: 0.96 + entry * 0.04}}>{children}</div>;
}

export function MotionWords({words, starts, from = 0, energy = 'balanced', style}: {
  words: string[]; starts: number[]; from?: number; energy?: MotionEnergy; style?: React.CSSProperties;
}) {
  if (words.length !== starts.length || starts.some((value, i) => !Number.isFinite(value) || value < 0 || (i > 0 && value < starts[i - 1]))) {
    throw new Error('Informe um frame de início crescente por palavra.');
  }
  return <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.25em', ...style}}>{words.map((word, i) => <MotionReveal key={i} from={from + starts[i]} energy={energy} distance={18}>{word}</MotionReveal>)}</div>;
}

export function MotionLine({d, from = 0, drawFrames = 24, stroke = 'currentColor', strokeWidth = 4}: {
  d: string; from?: number; drawFrames?: number; stroke?: string; strokeWidth?: number;
}) {
  const frame = useCurrentFrame();
  const progress = motionProgress(frame, from, drawFrames);
  return <path d={d} pathLength={1} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - progress}/>;
}
