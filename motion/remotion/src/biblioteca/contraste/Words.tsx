import React from 'react';
import {interpolate, interpolateColors, spring} from 'remotion';
import type {Line, Palette, Token} from './types';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const FPS = 30;
export const SMALL = 90;
export const KEY = 160;

const tokenSize = (tok: Token, line: Line) => tok.size ?? (tok.key ? (line.size ?? 1) * KEY : (line.size ?? 1) * SMALL);
export const lineHeight = (line: Line) => Math.max(...line.tokens.map(tok => tokenSize(tok, line))) * 1.0;
export const lineStart = (line: Line) => Math.min(...line.tokens.map(tok => tok.s));

// Palavra: entra desfocada, menor e clara; escurece até a cor final.
// Destaque: cor de acento, escala com overshoot e brilho no fundo escuro.
export const Word: React.FC<{tok: Token; line: Line; t: number; night: boolean; palette: Palette}> = ({tok, line, t, night, palette}) => {
  const d = t - tok.s;
  const size = tokenSize(tok, line);
  if (d < 0) return <span style={{fontSize: size, opacity: 0}}>{tok.w}</span>;
  const ink = night ? '#ffffff' : palette.ink;
  const muted = night ? '#5a5a5a' : palette.muted;
  if (tok.key) {
    const pop = spring({frame: d * FPS, fps: FPS, config: {damping: 10, mass: 0.55, stiffness: 190}});
    const paperKey = palette.navy;
    const color = interpolateColors(d, [0, 0.22], [palette.pink, night || !paperKey ? palette.accent : paperKey]);
    const shadow = interpolate(d, [0.08, 0.3], [0, 0.05], clamp);
    const glow = night ? `0 0 16px ${palette.accent}dd, 0 0 44px ${palette.accent}88`
      : paperKey ? `${shadow}em ${shadow}em 0 ${palette.accent}` : `0 6px 18px ${palette.accent}22`;
    return <span style={{
      display: 'inline-block', fontSize: size, fontFamily: 'CcBold', color, letterSpacing: '-0.055em',
      opacity: interpolate(d, [0, 0.08], [0, 1], clamp),
      filter: `blur(${interpolate(d, [0, 0.2], [14, 0], clamp)}px)`,
      transform: `translateY(${interpolate(d, [0, 0.18], [22, 0], clamp)}px) scale(${1.38 - 0.38 * pop})`,
      transformOrigin: '50% 70%', textShadow: glow,
    }}>{tok.w}</span>;
  }
  return <span style={{
    display: 'inline-block', fontSize: size, color: interpolateColors(d, [0, 0.28], [muted, ink]), letterSpacing: '-0.045em',
    opacity: interpolate(d, [0, 0.1], [0, 1], clamp),
    filter: `blur(${interpolate(d, [0, 0.15], [8, 0], clamp)}px)`,
    transform: `translate(${interpolate(d, [0, 0.18], [16, 0], clamp)}px, ${interpolate(d, [0, 0.18], [10, 0], clamp)}px)`,
    textShadow: night ? '0 0 14px #ffffff66' : 'none',
  }}>{tok.w}</span>;
};

// Bloco de linhas que se recentraliza verticalmente conforme cada linha surge.
export const KineticBlock: React.FC<{lines: Line[]; t: number; x: number; y: number; width?: number; night: boolean; palette: Palette}> = ({lines, t, x, y, width = 1040, night, palette}) => {
  const visible = lines.filter(line => line.until === undefined || t < line.until);
  const grow = visible.map(line => {
    const d = t - lineStart(line);
    return d < 0 ? 0 : spring({frame: d * FPS, fps: FPS, config: {damping: 18, stiffness: 140}});
  });
  const heights = visible.map(lineHeight);
  const total = heights.reduce((sum, h, i) => sum + h * grow[i], 0);
  let cursor = y - total / 2;
  return <>{visible.map((line, i) => {
    const top = cursor;
    cursor += heights[i] * grow[i];
    const justify = line.align === 'left' ? 'flex-start' : line.align === 'right' ? 'flex-end' : 'center';
    const leave = line.until === undefined ? 1 : interpolate(t, [line.until - 0.12, line.until], [1, 0], clamp);
    return <div key={i} style={{
      position: 'absolute', left: x - width / 2 + (line.dx ?? 0), top, width, height: heights[i],
      display: 'flex', justifyContent: justify, alignItems: 'baseline', gap: '0.24em', fontSize: SMALL,
      lineHeight: 1, fontFamily: 'CcRegular', whiteSpace: 'nowrap', opacity: leave,
    }}>{line.tokens.map((tok, j) => <Word key={j} tok={tok} line={line} t={t} night={night} palette={palette}/>)}</div>;
  })}</>;
};
