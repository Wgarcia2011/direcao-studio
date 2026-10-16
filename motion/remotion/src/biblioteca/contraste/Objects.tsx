import React from 'react';
import {Img, OffthreadVideo, interpolate, spring, staticFile} from 'remotion';
import {clamp, FPS, KineticBlock} from './Words';
import type {Palette, SceneObject} from './types';

const ease = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], {...clamp, easing: x => 1 - Math.pow(1 - x, 3)});

// Cartão-resposta: bolhas preenchidas em sequência, rasgo em zigue-zague e reconstituição.
const ROWS = 12;
const answer = (i: number) => (i * 7 + 3) % 5;
const zig = Array.from({length: 14}, (_, i) => `${200 + (i % 2 ? 16 : -16)},${i * 40}`).join(' ');
const Sheet: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const filled = o.fillAt === undefined ? ROWS : Math.floor(Math.max(0, t - o.fillAt) / 0.07);
  return <g>
    <rect x="0" y="0" width="400" height="520" rx="10" fill="#fdfcf9"/>
    <rect x="0" y="0" width="400" height="74" rx="10" fill="#1d1d1f"/>
    <rect x="0" y="54" width="400" height="20" fill="#1d1d1f"/>
    <text x="26" y="47" fill="#fff" fontFamily="CcBold" fontSize="30" letterSpacing="-1">GABARITO</text>
    <text x="232" y="45" fill="#bdbdbd" fontFamily="CcRegular" fontSize="15">CARTÃO-RESPOSTA</text>
    {Array.from({length: 22}, (_, i) => <rect key={i} x={262 + i * 5.4} y="90" width={i % 3 ? 2 : 3.6} height="26" fill="#2a2a2a"/>)}
    <text x="26" y="112" fill="#8a8a8a" fontFamily="CcRegular" fontSize="15">ASSINATURA ______________</text>
    {Array.from({length: ROWS}, (_, r) => <g key={r} transform={`translate(26 ${150 + r * 30})`}>
      <text x="0" y="8" fill="#6a6a6a" fontFamily="CcBold" fontSize="15">{String(r + 1).padStart(2, '0')}</text>
      {['A', 'B', 'C', 'D', 'E'].map((letter, c) => {
        const on = r < filled && c === answer(r);
        return <g key={letter} transform={`translate(${62 + c * 62} 3)`}>
          <circle r="11" fill={on ? '#1d1d1f' : 'none'} stroke={on ? '#1d1d1f' : '#9a9a9a'} strokeWidth="2"/>
          {!on && <text x="0" y="5" textAnchor="middle" fill="#9a9a9a" fontFamily="CcRegular" fontSize="12">{letter}</text>}
        </g>;
      })}
    </g>)}
    <rect x="1" y="1" width="398" height="518" rx="10" fill="none" stroke={palette.ink} strokeOpacity="0.12" strokeWidth="2"/>
  </g>;
};
const Gabarito: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  let tear = o.tearAt === undefined ? 0 : ease(t, o.tearAt, o.tearAt + 0.32) * (o.tearAmount ?? 1);
  if (o.mendAt !== undefined) tear *= 1 - ease(t, o.mendAt, o.mendAt + 0.38);
  const half = (side: -1 | 1) => <g clipPath={`url(#cc-half-${side})`} transform={`translate(${side * 46 * tear} ${18 * tear}) rotate(${side * 9 * tear} ${side < 0 ? 0 : 400} 520)`}><Sheet t={t} o={o} palette={palette}/></g>;
  return <svg viewBox="-60 -40 520 600" width="100%" height="100%" style={{overflow: 'visible', filter: 'drop-shadow(0 26px 30px #0000003a)'}}>
    <defs>
      <clipPath id="cc-half--1"><polygon points={`0,0 ${zig} 0,560`}/></clipPath>
      <clipPath id="cc-half-1"><polygon points={`400,0 ${zig} 400,560`}/></clipPath>
    </defs>
    {tear > 0.002 ? <>{half(-1)}{half(1)}</> : <Sheet t={t} o={o} palette={palette}/>}
  </svg>;
};

// Card cinza com alfinete vermelho (cai do alto e balança até parar).
const Pin: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const d = Math.max(0, t - o.at);
  const swing = 9 * Math.exp(-3.2 * d) * Math.cos(d * 9);
  const paper = o.tone === 'paper';
  const fg = paper ? palette.ink : '#ffffff';
  return <div style={{width: '100%', height: '100%', transform: `rotate(${swing}deg)`, transformOrigin: '50% 0%'}}>
    <div style={{position: 'absolute', inset: '6% 0 0 0', background: paper ? '#fffdf8' : '#8f8f8f', boxShadow: '18px 26px 34px #0000003d, inset 0 0 0 2px #00000010', padding: '12% 9% 0'}}>
      <div style={{fontFamily: 'CcBold', fontSize: o.size * 0.13, color: fg, letterSpacing: '-0.05em', lineHeight: 1, whiteSpace: 'nowrap'}}>{o.title}</div>
      <div style={{height: 4, background: fg, opacity: 0.8, margin: '5% 0 7%'}}/>
      {(o.items ?? []).map((item, i) => {
        const e = t - item.at;
        return <div key={i} style={{display: 'flex', alignItems: 'center', gap: '0.35em', fontFamily: 'CcRegular', fontSize: o.size * 0.085, color: fg, marginBottom: '0.45em', letterSpacing: '-0.03em', opacity: interpolate(e, [0, 0.12], [0, 1], clamp), filter: `blur(${interpolate(e, [0, 0.16], [8, 0], clamp)}px)`, transform: `translateX(${interpolate(e, [0, 0.2], [18, 0], clamp)}px)`}}>
          <span style={{fontFamily: 'CcBold', color: item.mark === 'x' ? palette.accent : item.mark === 'check' ? (paper ? '#1f8a4c' : '#d9ffe6') : fg}}>{item.mark === 'x' ? '✕' : item.mark === 'check' ? '✓' : '•'}</span>{item.text}
        </div>;
      })}
    </div>
    <svg viewBox="0 0 60 60" style={{position: 'absolute', left: '50%', top: 0, width: o.size * 0.12, marginLeft: -o.size * 0.06, overflow: 'visible'}}>
      <ellipse cx="34" cy="50" rx="10" ry="4" fill="#0000004d"/>
      <path d="M30 30 L34 50" stroke="#555" strokeWidth="3"/>
      <circle cx="30" cy="24" r="16" fill={palette.accent}/>
      <circle cx="25" cy="18" r="5" fill="#ffffff88"/>
    </svg>
  </div>;
};

// Figura de terno em meio-tom com cabeça de balão (texto dentro do círculo).
const Persona: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const d = Math.max(0, t - o.at);
  const head = 0.72 + 0.28 * spring({frame: d * FPS, fps: FPS, config: {damping: 14}});
  const s = o.size;
  return <div style={{width: '100%', height: '100%'}}>
    <svg viewBox="0 0 400 420" width="130%" height="100%" style={{position: 'absolute', left: '-15%', top: '27%', overflow: 'visible'}}>
      <defs>
        <pattern id="cc-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="2.6" fill="#e9e9e9"/></pattern>
        <linearGradient id="cc-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stopColor="#fff"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
        <mask id="cc-fade-mask"><rect x="-50" y="0" width="500" height="420" fill="url(#cc-fade)"/></mask>
      </defs>
      <g mask="url(#cc-fade-mask)">
        <path d="M40 420 C40 250 80 150 200 140 C320 150 360 250 360 420 Z" fill="url(#cc-dots)"/>
        <path d="M160 140 L200 330 L240 140 Z" fill="#f4f4f4"/>
        <path d="M190 150 L210 150 L216 290 L200 320 L184 290 Z" fill="url(#cc-dots)" stroke="#f4f4f4" strokeWidth="2"/>
        <path d="M110 300 C150 270 250 270 290 300 L280 330 C240 305 160 305 120 330 Z" fill="#f4f4f4" opacity="0.9"/>
        <path d="M90 315 l40 -10 l8 22 l-42 12 Z M310 315 l-40 -10 l-8 22 l42 12 Z" fill="url(#cc-dots)"/>
      </g>
    </svg>
    <div style={{position: 'absolute', left: '50%', top: '17%', width: s * 0.5, height: s * 0.5, marginLeft: -s * 0.25, marginTop: -s * 0.25, borderRadius: '50%', background: '#fdfdfd', boxShadow: '0 0 60px #ffffff77, 0 0 140px #ffffff33', transform: `scale(${head})`}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 900, height: 900, transform: `scale(${s * 0.5 / 900})`, transformOrigin: '0 0'}}>
        <KineticBlock lines={o.head ?? []} t={t} x={450} y={450} width={820} night={false} palette={palette}/>
      </div>
    </div>
  </div>;
};

// 9º com ramos de louro desenhados.
const Rank: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const d = Math.max(0, t - o.at);
  const draw = ease(t, o.at + 0.1, o.at + 0.9);
  const leaves = (side: -1 | 1) => <g transform={`translate(200 210) scale(${side} 1)`}>
    <path d="M-150 -10 C-170 80 -120 160 -20 190" fill="none" stroke="#f2f2f2" strokeWidth="5" strokeDasharray="420" strokeDashoffset={420 * (1 - draw)} strokeLinecap="round"/>
    {Array.from({length: 7}, (_, i) => {
      const p = i / 6;
      const show = interpolate(draw, [p * 0.8, p * 0.8 + 0.2], [0, 1], clamp);
      const x = -150 - 12 * Math.sin(p * 3) + p * 120, y = -10 + p * 190;
      return <ellipse key={i} cx={x - 16} cy={y} rx="22" ry="9" fill="#f2f2f2" opacity={show} transform={`rotate(${-50 + p * 40} ${x - 16} ${y})`}/>;
    })}
  </g>;
  return <div style={{width: '100%', height: '100%'}}>
    <svg viewBox="0 0 400 420" width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible', filter: 'drop-shadow(0 0 14px #ffffff55)'}}>{leaves(-1)}{leaves(1)}</svg>
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'CcBold', fontSize: o.size * 0.58, letterSpacing: '-0.07em', color: palette.accent, textShadow: `0 0 26px ${palette.accent}, 0 0 80px ${palette.accent}99`, transform: `scale(${1.7 - 0.7 * spring({frame: d * FPS, fps: FPS, config: {damping: 12, stiffness: 160}})})`, filter: `blur(${interpolate(d, [0, 0.22], [18, 0], clamp)}px)`}}>{o.text ?? '9º'}</div>
  </div>;
};

// Multidão simbólica (não representa contagem real); um ponto vermelho destacado.
const Crowd: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const cols = 9, rows = 10, hi = {c: 4, r: 5};
  const h = o.highlightAt === undefined ? 0 : ease(t, o.highlightAt, o.highlightAt + 0.3);
  return <svg viewBox="0 0 520 600" width="100%" height="100%" style={{overflow: 'visible'}}>
    {Array.from({length: cols * rows}, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const dist = Math.hypot(c - hi.c, r - hi.r) / 7;
      const show = ease(t, o.at + dist * 0.5, o.at + dist * 0.5 + 0.2);
      const me = c === hi.c && r === hi.r;
      const fill = me ? palette.accent : '#e8e8e8';
      return <g key={i} transform={`translate(${40 + c * 55} ${40 + r * 58}) scale(1.6) scale(${show * (me ? 1 + 0.5 * h : 1)})`} opacity={me ? 1 : show * (1 - 0.55 * h)}>
        <circle cx="0" cy="-6" r="6" fill={fill}/>
        <path d="M-10 14 C-10 2 10 2 10 14 Z" fill={fill}/>
        {me && h > 0 && <circle cx="0" cy="2" r={18 + 10 * h} fill="none" stroke={palette.accent} strokeWidth="3" opacity={h}/>}
      </g>;
    })}
  </svg>;
};

// Carimbo com textura de tinta.
const Stamp: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const d = Math.max(0, t - o.at);
  const hit = interpolate(d, [0, 0.14], [2.4, 1], {...clamp, easing: x => x * x});
  return <svg viewBox="0 0 520 220" width="100%" height="100%" style={{overflow: 'visible', transform: `scale(${hit}) rotate(-10deg)`, opacity: interpolate(d, [0, 0.06], [0, 1], clamp), filter: `drop-shadow(0 0 22px ${palette.accent}88)`}}>
    <defs><filter id="cc-ink"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.4"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
    <g filter="url(#cc-ink)">
      <rect x="10" y="10" width="500" height="200" rx="26" fill="none" stroke={palette.accent} strokeWidth="14"/>
      <rect x="34" y="34" width="452" height="152" rx="14" fill="none" stroke={palette.accent} strokeWidth="5"/>
      <text x="260" y="140" textAnchor="middle" fill={palette.accent} fontFamily="CcBold" fontSize="92" letterSpacing="-3">{o.text ?? 'APROVADO'}</text>
    </g>
  </svg>;
};

// Picture-in-picture do apresentador: moldura branca, recorte centrado no rosto.
const Pip: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({o, palette}) => {
  const w = o.size, h = o.shape === 'circle' ? o.size : o.h ?? o.size;
  const vh = h * (o.zoom ?? 1.5), vw = vh * 16 / 9;
  const left = Math.min(0, Math.max(w - vw, w / 2 - (o.fx ?? 0.51) * vw));
  const top = Math.min(0, Math.max(h - vh, h * 0.4 - (o.fy ?? 0.25) * vh));
  return <div style={{position: 'absolute', inset: 0, borderRadius: o.shape === 'circle' ? '50%' : 34, overflow: 'hidden', border: '9px solid #ffffff', boxShadow: `0 30px 60px #00000055, 0 0 0 3px ${palette.accent}55`, background: '#111'}}>
    {o.src && <OffthreadVideo src={staticFile(o.src)} muted style={{position: 'absolute', left, top, width: vw, height: vh, filter: 'saturate(0.85) contrast(1.06)'}}/>}
  </div>;
};

// Logotipo: entra com mola, anel de brilho e pulsação leve.
const Logo: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o}) => {
  const d = Math.max(0, t - o.at);
  const pop = spring({frame: d * FPS, fps: FPS, config: {damping: 9, mass: 0.7, stiffness: 140}});
  const ring = interpolate(d, [0.05, 0.7], [0, 1], clamp);
  return <div style={{width: '100%', height: '100%'}}>
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <circle cx="50" cy="50" r={20 + 48 * ring} fill="none" stroke="#ffffff" strokeWidth={3 * (1 - ring)} opacity={1 - ring}/>
      <circle cx="50" cy="50" r={14 + 60 * ring} fill="none" stroke="#2fe0c6" strokeWidth={2 * (1 - ring)} opacity={1 - ring}/>
    </svg>
    {o.src && <Img src={staticFile(o.src)} style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${pop * (1 + 0.025 * Math.sin(d * 5))}) rotate(${(1 - pop) * -25}deg)`, filter: 'drop-shadow(0 0 40px #2fe0c666)'}}/>}
  </div>;
};

const ObjectBody: React.FC<{t: number; o: SceneObject; palette: Palette}> = props => {
  const {o} = props;
  if (o.kind === 'gabarito') return <Gabarito {...props}/>;
  if (o.kind === 'pin') return <Pin {...props}/>;
  if (o.kind === 'persona') return <Persona {...props}/>;
  if (o.kind === 'rank') return <Rank {...props}/>;
  if (o.kind === 'crowd') return <Crowd {...props}/>;
  if (o.kind === 'stamp') return <Stamp {...props}/>;
  if (o.kind === 'pip') return <Pip {...props}/>;
  if (o.kind === 'logo') return <Logo {...props}/>;
  const write = o.write ? `translate(${Math.sin(props.t * 13) * 16}px, ${Math.abs(Math.sin(props.t * 6.5)) * -10}px)` : undefined;
  return o.src ? <Img src={staticFile(o.src)} style={{width: '100%', height: '100%', objectFit: 'contain', transform: write, filter: `${o.negative ? 'grayscale(1) ' : ''}drop-shadow(0 24px 26px #0004)`}}/> : null;
};

// Entrada com mola (escala, giro e subida), flutuação leve e saída curta.
export const ObjectView: React.FC<{t: number; o: SceneObject; palette: Palette}> = ({t, o, palette}) => {
  const d = t - o.at;
  if (d < 0 || (o.until !== undefined && t > o.until)) return null;
  const sp = spring({frame: d * FPS, fps: FPS, config: {damping: 13, mass: 0.7, stiffness: 120}});
  const own = o.kind === 'pin' || o.kind === 'stamp' || o.kind === 'rank' || o.kind === 'logo';
  const boxH = o.kind === 'pip' && o.shape !== 'circle' ? o.h ?? o.size : o.size;
  const leave = o.until === undefined ? 1 : interpolate(t, [o.until - 0.16, o.until], [1, 0], clamp);
  const float = Math.sin(t * 1.6 + o.x) * 6;
  const y = own ? (o.kind === 'pin' ? interpolate(sp, [0, 1], [-260, 0]) : 0) : interpolate(sp, [0, 1], [110, 0]);
  return <div style={{
    position: 'absolute', left: o.x - o.size / 2, top: o.y - boxH / 2, width: o.size, height: boxH,
    opacity: Math.min(interpolate(d, [0, 0.12], [0, 1], clamp), leave),
    transform: `translateY(${y + float}px) rotate(${(o.rot ?? 0) + (own ? 0 : (1 - sp) * -14)}deg) scale(${own ? 1 : 0.55 + 0.45 * sp})`,
    filter: own ? undefined : `blur(${interpolate(d, [0, 0.2], [10, 0], clamp)}px)`,
  }}><ObjectBody t={t} o={o} palette={palette}/></div>;
};
