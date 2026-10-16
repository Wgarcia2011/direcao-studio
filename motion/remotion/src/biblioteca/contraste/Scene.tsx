import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {ObjectView} from './Objects';
import {clamp, KineticBlock} from './Words';
import type {Palette, Scene} from './types';

const W = 1080, H = 1920;
const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

const Paper: React.FC<{scene: Scene; lt: number; palette: Palette; brand?: string}> = ({scene, lt, palette, brand}) => {
  const cx = scene.textX ?? 540, cy = scene.textY ?? 760;
  return <AbsoluteFill style={{background: palette.paper}}>
    {scene.grid !== false && <AbsoluteFill style={{
      backgroundImage: 'linear-gradient(#00000012 2px,transparent 2px),linear-gradient(90deg,#00000012 2px,transparent 2px)', backgroundSize: '66px 66px',
      maskImage: `radial-gradient(ellipse 420px 360px at ${cx}px ${cy}px, #000 0%, transparent 100%)`, WebkitMaskImage: `radial-gradient(ellipse 420px 360px at ${cx}px ${cy}px, #000 0%, transparent 100%)`,
    }}/>}
    {scene.arc && <svg width={W} height={H} style={{position: 'absolute', inset: 0, transform: `rotate(${lt * 1.4}deg)`, transformOrigin: '50% 50%'}}>
      <path d="M 120 -160 C 20 380, 560 640, 640 1000 S 260 1720, 110 2120" fill="none" stroke={palette.arc} strokeWidth="128" strokeDasharray="2700" strokeDashoffset={2700 * (1 - easeOut(interpolate(lt, [0, 0.55], [0, 1], clamp)))}/>
    </svg>}
    {scene.deco && <>
      <div style={{position: 'absolute', right: 92, top: 120, display: 'flex', gap: 3, height: 64}}>{Array.from({length: 26}, (_, i) => <div key={i} style={{width: i % 4 === 0 ? 7 : i % 3 ? 3 : 5, background: '#1b1b1b'}}/>)}</div>
      {brand && <div style={{position: 'absolute', left: 0, right: 0, bottom: 150, textAlign: 'center', fontFamily: 'CcBold', fontSize: 24, letterSpacing: '0.18em', color: '#00000055'}}>{brand}</div>}
    </>}
  </AbsoluteFill>;
};

const Night: React.FC<{scene: Scene; palette: Palette}> = ({scene, palette}) => {
  const cx = scene.textX ?? 540, cy = scene.textY ?? 900;
  return <AbsoluteFill style={{background: `radial-gradient(ellipse 760px 900px at ${cx}px ${cy}px, #1b1b1b 0%, ${palette.night} 72%)`}}>
    {scene.grid && <AbsoluteFill style={{
      backgroundImage: 'linear-gradient(#ffffff10 2px,transparent 2px),linear-gradient(90deg,#ffffff10 2px,transparent 2px)', backgroundSize: '66px 66px',
      maskImage: `radial-gradient(ellipse 380px 380px at ${cx}px ${cy + 180}px, #000 0%, transparent 100%)`, WebkitMaskImage: `radial-gradient(ellipse 380px 380px at ${cx}px ${cy + 180}px, #000 0%, transparent 100%)`,
    }}/>}
  </AbsoluteFill>;
};

// Saída da cena: íris preta, inclinação, mergulho em cinza, círculo rosa ou clarão.
const Exit: React.FC<{scene: Scene; lt: number; len: number; palette: Palette}> = ({scene, lt, len, palette}) => {
  const left = len - lt;
  if (scene.exit === 'iris') {
    const p = easeIn(interpolate(left, [0, 0.26], [1, 0], clamp));
    return p > 0 ? <svg width={W} height={H} style={{position: 'absolute', inset: 0}}><circle cx={540} cy={scene.textY ?? 900} r={p * 1250} fill={palette.night}/></svg> : null;
  }
  if (scene.exit === 'circle') {
    const p = easeOut(interpolate(left, [0, 0.4], [1, 0], clamp));
    return p > 0 ? <svg width={W} height={H} style={{position: 'absolute', inset: 0}}><circle cx={540} cy={scene.textY ?? 900} r={30 + p * 1250} fill={palette.pink} fillOpacity={0.75} stroke={palette.accent} strokeWidth={10} strokeOpacity={0.7}/></svg> : null;
  }
  if (scene.exit === 'dip') return <AbsoluteFill style={{background: '#2b2b2b', opacity: interpolate(left, [0, 0.22], [0.6, 0], clamp)}}/>;
  if (scene.exit === 'flash') return <AbsoluteFill style={{background: '#ffffff', opacity: interpolate(left, [0, 0.12], [1, 0], clamp)}}/>;
  return null;
};

export const SceneView: React.FC<{scene: Scene; t: number; palette: Palette; brand?: string}> = ({scene, t, palette, brand}) => {
  const lt = t - scene.from, len = scene.to - scene.from, left = len - lt;
  const night = scene.bg === 'night';
  const shake = (scene.shakeAt ?? []).reduce((acc, at) => {
    const d = t - at;
    return d >= 0 && d < 0.3 ? acc + Math.sin(d * 90) * 14 * (1 - d / 0.3) : acc;
  }, 0);
  // Soco de zoom curto em cada palavra de destaque da cena.
  const punch = scene.lines.flatMap(line => line.tokens.filter(tok => tok.key)).reduce((acc, tok) => {
    const d = t - tok.s;
    return d >= 0 && d < 0.35 ? acc + 0.04 * Math.sin(Math.PI * d / 0.35) : acc;
  }, 0);
  const tilt = scene.exit === 'tilt' ? easeIn(interpolate(left, [0, 0.3], [1, 0], clamp)) : 0;
  const reveal = scene.enter === 'reveal' ? easeOut(interpolate(lt, [0, 0.3], [0, 1], clamp)) : 1;
  const opacity = scene.enter === 'fade' ? interpolate(lt, [0, 0.2], [0, 1], clamp) : interpolate(lt, [0, 0.07], [0, 1], clamp);
  return <AbsoluteFill style={{
    overflow: 'hidden', opacity: opacity * (1 - tilt),
    clipPath: reveal < 1 ? `circle(${reveal * 1250}px at 540px ${scene.textY ?? 900}px)` : undefined,
    transform: `translate(${shake}px, ${-70 * tilt}px) rotate(${10 * tilt}deg) scale(${punch + 1.03 + 0.035 * Math.min(1, lt / len) - 0.03 * easeOut(Math.min(1, lt / 0.4))})`,
    filter: tilt > 0 ? `blur(${12 * tilt}px)` : undefined,
  }}>
    {night ? <Night scene={scene} palette={palette}/> : <Paper scene={scene} lt={lt} palette={palette} brand={brand}/>}
    {scene.objects.map((o, i) => <ObjectView key={i} t={t} o={o} palette={palette}/>)}
    <KineticBlock lines={scene.lines} t={Math.max(t, scene.from)} x={scene.textX ?? 540} y={scene.textY ?? 760} night={night} palette={palette}/>
    {scene.enter === 'white' && <AbsoluteFill style={{background: '#fff', opacity: interpolate(lt, [0, 0.28], [1, 0], clamp)}}/>}
    <Exit scene={scene} lt={lt} len={len} palette={palette}/>
  </AbsoluteFill>;
};
