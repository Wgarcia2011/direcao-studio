import React, {useEffect, useState} from 'react';
import type {Caption} from '@remotion/captions';
import {AbsoluteFill, Easing, Img, OffthreadVideo, continueRender, delayRender, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

/*
 Template 9:16 guiado por dados. Cada vídeo só precisa de um template.json
 (scripts/preparar-motion-template.py converte os tempos da fala para a saída).
 Temas:
  - editorial: fundo claro, itálico serifado + negrito, cartões e pílulas brancas.
  - estudio:   cinza de estúdio, objeto 3D preto brilhante, vídeo em círculo.
  - impacto:   P&B granulado, quadriculado, vermelho com marca-texto, aberração cromática.
*/
type Word = Caption & {segment: number; sourceStart: number; sourceEnd: number};
type Shape = 'card' | 'circle' | 'wide' | 'tall';
type TitleSpec = {small?: string; smallAt?: number; big: string; bigAt: number; until?: number; size?: number; mark?: boolean; strike?: number};
type PillSpec = {at: number; text: string; dark?: boolean; icon?: string; until?: number};
type ObjectKind = 'check' | 'x' | 'lock' | 'trophy' | 'flag' | 'arrow' | 'question' | 'hourglass' | 'goal' | 'book' | 'heart';
// Objeto da cena: desenhado em código (kind) ou PNG externo (src). Sem x/y, usa a posição do tema.
export type ObjectSpec = {kind?: ObjectKind; src?: string; at: number; until?: number; openAt?: number; x?: number; y?: number; size?: number; rot?: number; color?: boolean};
export type Scene = {
  from: number; to: number; shape?: Shape; fx?: number; fy?: number; dark?: boolean;
  mood?: 'neg' | 'pos'; moodAt?: number; titles?: TitleSpec[]; pills?: PillSpec[];
  object?: ObjectSpec; objects?: ObjectSpec[]; punches?: {at: number; until: number; z: number}[];
  confettiAt?: number; chart?: {at: number; trend: 'down' | 'up' | 'downup'}; hideCaption?: boolean;
};
export type EmphasisMoment = {from:number; to:number; kind:'cards'|'type'|'outro'; eyebrow:string; headings:{at:number; text:string}[]; cards?:{src:string; label:string; at:number}[]; assetSrc?:string};
export type MotionTemplateProps = {video: string; words: Word[]; durationInFrames: number; cuts: number[]; theme: 'editorial' | 'estudio' | 'impacto'; keywords: string[]; scenes: Scene[]; palette?: {accent:string; ink:string; assetFilter?:string}; brand?: {src:string; windows:number[][]}; motionAccents?: {turns:number[]; parallax:{from:number; to:number}[]}; emphasisMoments?: EmphasisMoment[]; audioMix?: string; enhancedMotion?: boolean; selectiveMonochrome?: boolean; largeCaptions?: boolean};
export const motionTemplateDefaults: MotionTemplateProps = {video: '', words: [], durationInFrames: 900, cuts: [], theme: 'editorial', keywords: [], scenes: []};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const serif = 'Georgia, "Times New Roman", serif';
const RED = '#e3262b', GREEN = '#1fae6b';
const THEMES = {
  editorial: {light: 'radial-gradient(ellipse at 50% 40%,#ffffff 0%,#ececec 55%,#c9c9c9 100%)', dark: 'radial-gradient(ellipse at 50% 40%,#2a2a2a 0%,#141414 60%,#050505 100%)', smallFont: serif, accent: GREEN},
  estudio: {light: 'radial-gradient(ellipse at 50% 30%,#f2f2f2 0%,#cfcfcf 50%,#8f8f8f 100%)', dark: 'radial-gradient(ellipse at 50% 12%,#3a3a3a 0%,#121212 45%,#000 100%)', smallFont: serif, accent: '#ffffff'},
  impacto: {light: 'radial-gradient(ellipse at 50% 45%,#f0f0f0 0%,#d2d2d2 55%,#8a8a8a 100%)', dark: 'radial-gradient(ellipse at 50% 40%,#232323 0%,#0b0b0b 60%,#000 100%)', smallFont: '"Segoe Script", "Brush Script MT", cursive', accent: RED},
} as const;

const sp = (frame: number, at: number, fps: number, damping = 14, stiffness = 160) => spring({frame: frame - at * fps, fps, config: {damping, stiffness}});

const ICONS: Record<ObjectKind, string> = {
  check: 'M22 52 L42 72 L80 30',
  x: 'M28 28 L72 72 M72 28 L28 72',
  lock: 'M22 46 H78 V88 H22 Z',
  trophy: 'M32 16 H68 V38 A18 18 0 0 1 32 38 Z M32 22 H20 A12 12 0 0 0 32 42 M68 22 H80 A12 12 0 0 1 68 42 M50 56 V72 M34 84 H66',
  flag: 'M30 90 V10 M30 14 C46 4 60 24 80 14 V50 C60 60 46 40 30 50',
  arrow: 'M50 88 V16 M26 40 L50 16 L74 40',
  question: 'M34 34 A16 16 0 1 1 56 48 C50 52 50 56 50 64 M50 80 V82',
  hourglass: 'M28 12 H72 M28 88 H72 M32 12 C32 40 68 50 68 88 M68 12 C68 40 32 50 32 88',
  goal: 'M14 88 V22 H86 V88 M14 22 L30 40 H70 L86 22 M30 40 V88 M70 40 V88',
  book: 'M50 26 C40 18 24 18 14 22 V82 C24 78 40 78 50 86 C60 78 76 78 86 82 V22 C76 18 60 18 50 26 Z M50 26 V86',
  heart: 'M50 84 C20 62 12 46 18 32 C24 18 44 18 50 34 C56 18 76 18 82 32 C88 46 80 62 50 84 Z',
};

// Objeto do tema: 3D preto brilhante (estúdio), traço desenhado (impacto) ou ícone simples (editorial).
export const HeroObject: React.FC<{kind?: ObjectKind; at: number; openAt?: number; src?: string; color?: boolean; theme: MotionTemplateProps['theme']; dark: boolean; size?: number; accentColor?:string; assetFilter?:string}> = ({kind, at, openAt, src, theme, dark, size = 420, accentColor, assetFilter}) => {
  const RED = accentColor ?? '#e3262b';
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = sp(f, at, fps, 12, 120);
  if (f < at * fps) return null;
  // Asset externo (PNG com fundo transparente em public/motion-assets/): mesma entrada e movimento do tema.
  if (src) {
    const sway = theme === 'estudio' ? `perspective(1400px) rotateY(${Math.sin(f / 38) * 18 * p + (1 - p) * 70}deg)` : `rotate(${(1 - p) * -12 + Math.sin(f / 45) * 2}deg)`;
    const look = theme === 'impacto' ? `contrast(1.15) drop-shadow(-4px 0 0 ${RED}aa) drop-shadow(4px 0 0 #00e5ffaa) drop-shadow(0 18px 30px #0008)` : 'drop-shadow(0 40px 40px #00000066)';
    return <Img src={staticFile(src)} style={{width: size, height: size, objectFit: 'contain', opacity: Math.min(1, p * 2), filter: `${assetFilter ?? ''} ${look}`, transform: `translateY(${(1 - p) * 260 + Math.sin(f / 30) * 10}px) ${sway} scale(${.6 + .4 * p})`}}/>;
  }
  const open = openAt !== undefined ? sp(f, openAt, fps, 9, 160) : 0;
  const shackle = kind === 'lock' ? <path d="M30 46 V32 A20 20 0 0 1 70 32 V46" transform={`translate(${14 * open} ${-14 * open}) rotate(${-16 * open} 70 46)`}/> : null;
  const d = ICONS[kind ?? 'check'];
  if (theme === 'estudio') {
    const spin = Math.sin(f / 38) * 22 * p + (1 - p) * 90;
    const depth = Array.from({length: 14}, (_, i) => 14 - i);
    return <div style={{width: size, height: size * 1.12, position: 'relative', transform: `translateY(${(1 - p) * 300 + Math.sin(f / 30) * 10}px) perspective(1400px) rotateY(${spin}deg) rotateX(8deg) scale(${.6 + .4 * p})`, opacity: Math.min(1, p * 2)}}>
      <div style={{position: 'absolute', left: '15%', right: '15%', bottom: 0, height: 40, borderRadius: '50%', background: 'radial-gradient(ellipse,#000a,transparent 70%)', filter: 'blur(6px)'}}/>
      <svg viewBox="-6 -6 120 120" width={size} height={size} style={{overflow: 'visible'}}>
        <defs>
          <linearGradient id={`g-${kind}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a5a5a"/><stop offset=".35" stopColor="#141414"/><stop offset=".7" stopColor="#050505"/><stop offset="1" stopColor="#2b2b2b"/></linearGradient>
          <linearGradient id={`h-${kind}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".95"/><stop offset=".45" stopColor="#ffffff" stopOpacity="0"/></linearGradient>
        </defs>
        <g fill={kind === 'lock' || kind === 'heart' ? '#0a0a0a' : 'none'} stroke="#0a0a0a" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
          {depth.map(i => <g key={i} transform={`translate(${i * .55} ${i * .7})`} opacity={.9}><path d={d}/>{shackle}</g>)}
        </g>
        <g fill={kind === 'lock' || kind === 'heart' ? `url(#g-${kind})` : 'none'} stroke={`url(#g-${kind})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"><path d={d}/>{shackle}</g>
        <g fill="none" stroke={`url(#h-${kind})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(-2.5 -3)"><path d={d}/>{shackle}</g>
      </svg>
    </div>;
  }
  const ink = theme === 'impacto' ? RED : dark ? '#f2f2f2' : '#111';
  const draw = interpolate(f, [at * fps, at * fps + 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return <svg viewBox="0 0 100 100" width={size * .7} height={size * .7} style={{overflow: 'visible', transform: `scale(${.7 + .3 * p}) rotate(${(1 - p) * -12}deg)`, filter: theme === 'impacto' ? `drop-shadow(-3px 0 0 ${RED}aa) drop-shadow(3px 0 0 #00e5ffaa)` : undefined}}>
    <g fill="none" stroke={ink} strokeWidth={theme === 'impacto' ? 9 : 7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} pathLength={1} strokeDasharray={`${draw} 1`}/>{shackle}
    </g>
  </svg>;
};

const Reveal: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = sp(f, at, fps, 15, 190);
  if (f < at * fps) return null;
  return <span style={{display: 'inline-block', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 10}px)`, ...style}}>{children}</span>;
};

const Confetti: React.FC<{at: number; x: number; y: number; palette: string[]}> = ({at, x, y, palette}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f / fps - at;
  if (t < 0 || t > 1.6) return null;
  return <>{Array.from({length: 46}, (_, i) => {
    const a = random(`a${at}${i}`) * Math.PI * 2, v = 380 + random(`v${at}${i}`) * 650;
    return <div key={i} style={{position: 'absolute', left: x + Math.cos(a) * v * t, top: y + Math.sin(a) * v * t + 900 * t * t, width: 16, height: 9, background: palette[i % palette.length], boxShadow: '0 2px 4px #0003', opacity: 1 - t / 1.6, transform: `rotate(${t * 720 * (random(`r${at}${i}`) - .5)}deg)`}}/>;
  })}</>;
};

const groupsOf = (words: Word[], large = false) => {
  const groups: Word[][] = []; let block: Word[] = [];
  for (const w of words) {
    const prev = block[block.length - 1];
    if (block.length >= (large ? 3 : 4) || (large && block.map(x => x.text).join(" ").length + w.text.length > 24) || (prev && (prev.segment !== w.segment || w.startMs - prev.endMs > 320 || /[,.!?;:]$/.test(prev.text)))) {groups.push(block); block = [];}
    block.push(w);
  }
  if (block.length) groups.push(block);
  return groups;
};
const SHAPES: Record<Shape, {w: number; h: number; r: number}> = {card: {w: 980, h: 760, r: 48}, circle: {w: 760, h: 760, r: 380}, wide: {w: 1000, h: 940, r: 48}, tall: {w: 900, h: 1060, r: 44}};

export const MotionTemplate: React.FC<MotionTemplateProps> = ({video, words, durationInFrames, theme, keywords, scenes, largeCaptions = false, selectiveMonochrome = false, enhancedMotion = false, audioMix, palette, motionAccents}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = frame / fps; const end = durationInFrames / fps;
  const [fontHandle] = useState(() => delayRender('Fontes locais'));
  useEffect(() => {
    const a = new FontFace('TplSora', `url(${staticFile('fonts/sora-700.ttf')})`, {weight: '700'});
    const b = new FontFace('TplManrope', `url(${staticFile('fonts/manrope-700.ttf')})`, {weight: '700'});
    Promise.all([a.load(), b.load()]).then(l => {l.forEach(x => document.fonts.add(x)); continueRender(fontHandle);}).catch(e => {console.error(e); continueRender(fontHandle);});
  }, [fontHandle]);
  const RED = palette?.accent ?? '#e3262b';
  const T = THEMES[theme];
  const transitionAt = (motionAccents?.turns ?? [10.633, 72.36, 95.68, 123.12]).find(at => t >= at && t < at + .65);
  const turn = enhancedMotion && transitionAt !== undefined ? interpolate(t - transitionAt, [0, .65], [1, 0], {...clamp, easing: Easing.out(Easing.cubic)}) : 0;
  const depth = enhancedMotion && (motionAccents?.parallax ?? [{from:19.94,to:26.38},{from:77.88,to:88.42},{from:128.233,to:1e9}]).some(p=>t>=p.from&&t<p.to) ? Math.sin(frame / 65) : 0;
  const keyRe = keywords.length ? new RegExp(keywords.map(k => k.toLocaleUpperCase('pt-BR')).join('|')) : null;
  const si = Math.max(0, scenes.reduce((last, s, i) => t >= s.from ? i : last, 0));
  const S: Scene = scenes[si] ?? {from: 0, to: end};
  const P: Scene = scenes[Math.max(0, si - 1)] ?? S;

  // Fundo: escuro/claro por cena; do escuro para o claro abre em círculo.
  const darkNow = !!S.dark, darkPrev = !!P.dark && si > 0;
  const since = t - S.from;
  const darkOpacity = darkNow ? (darkPrev ? 1 : interpolate(since, [0, .3], [0, 1], clamp)) : (darkPrev ? 1 : 0);
  const reveal = !darkNow && darkPrev ? interpolate(since, [0, .55], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 0;
  const night = darkNow ? since > .15 || darkPrev : darkPrev && reveal < .5;
  const ink = night ? '#f4f4f4' : (palette?.ink ?? '#111111');
  const sub = night ? '#a8a8a8' : '#8a8a8a';

  // Humor.
  const moodOn = S.mood && t >= (S.moodAt ?? S.from);
  const neg = moodOn && S.mood === 'neg' ? 1 : 0;
  const pos = moodOn && S.mood === 'pos' ? 1 : 0;
  const hitAt = S.mood === 'neg' ? (S.moodAt ?? S.from) : -9;
  const hd = frame - hitAt * fps; const hit = hd >= 0 && hd < 12 ? 1 - hd / 12 : 0;

  // Vídeo: forma por cena com mola.
  const heroOf = (s: Scene) => (s.object ? [s.object] : []).concat(s.objects ?? []).some(o => o.x === undefined);
  const shapeOf = (s: Scene) => theme === 'estudio' && heroOf(s) ? {w: 520, h: 520, r: 260, top: 1120, fx: s.fx ?? .5, fy: s.fy ?? .3} : ({...SHAPES[s.shape ?? 'card'], top: s.shape === 'circle' ? 660 : s.shape === 'tall' ? 520 : s.shape === 'wide' ? 560 : 620, fx: s.fx ?? .5, fy: s.fy ?? .3});
  const A = shapeOf(P), B = shapeOf(S);
  const k = si === 0 ? 1 : spring({frame: frame - S.from * fps, fps, config: {damping: 17, stiffness: 120}});
  const mix = (a: number, b: number) => a + (b - a) * k;
  const vw = mix(A.w, B.w), vh = mix(A.h, B.h), vr = mix(A.r, B.r), vtop = mix(A.top, B.top);
  const zoom = (S.punches ?? []).find(p => t >= p.at && t < p.until)?.z ?? 1;
  const vidH = vh * zoom * Math.min(1.1, 1 + .05 * since / 6); const vidW = vidH * 16 / 9;
  const left = Math.min(0, Math.max(vw - vidW, vw / 2 - B.fx * vidW));
  const topV = Math.min(0, Math.max(vh - vidH, vh * .42 - B.fy * vidH));
  const enter = si === 0 ? sp(frame, 0, fps, 16, 120) : k;
  const tilt = si % 2 ? 1.5 : -1.5;
  const objectScene = heroOf(S);
  const sceneObjects = (S.object ? [S.object] : []).concat(S.objects ?? []).filter(o => t < (o.until ?? S.to));
  const videoShift = 0;
  const vfilter = theme === 'impacto'
    ? `grayscale(${selectiveMonochrome ? neg : 1}) contrast(${selectiveMonochrome && !neg ? 1.06 : 1.25 + .15 * neg}) brightness(${1 - .08 * neg})`
    : `grayscale(${neg ? 1 : .12 - .12 * pos}) contrast(${1 + .2 * neg}) saturate(${1 + .2 * pos})`;
  const vidShadow = theme === 'impacto'
    ? `-8px 0 0 ${RED}88, 8px 0 0 #00e5ff66, 0 40px 80px #000a`
    : night ? '0 40px 90px #000, 0 0 0 2px #ffffff22' : '0 40px 80px #00000055, 0 8px 18px #00000025';

  const block = groupsOf(words, largeCaptions).find(g => t * 1000 >= g[0].startMs && t * 1000 < g[g.length - 1].endMs + 150);
  const chroma = theme === 'impacto' ? `-3px 0 0 ${RED}cc, 3px 0 0 #00e5ffaa` : undefined;

  return <AbsoluteFill style={{background: T.light, overflow: 'hidden', fontFamily: 'TplManrope'}}>
    <AbsoluteFill style={{background: T.dark, opacity: darkOpacity, clipPath: reveal > 0 ? `circle(${(1 - reveal) * 150}% at 50% 55%)` : undefined}}/>

    {/* Decoração do tema */}
    {theme !== 'impacto' && <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: theme === 'estudio' ? .7 : .55}}>
      <circle cx="1180" cy="420" r="900" fill="none" stroke={ink} strokeOpacity=".28" strokeWidth={theme === 'estudio' ? 7 : 5} strokeDasharray="38 26" transform={`rotate(${frame * .25} 1180 420)`}/>
      <circle cx="-200" cy="1650" r="760" fill="none" stroke={ink} strokeOpacity=".2" strokeWidth="4" strokeDasharray="30 22" transform={`rotate(${-frame * .2} -200 1650)`}/>
    </svg>}
    {theme === 'estudio' && <div style={{position: 'absolute', left: -300, top: 1180, width: 1680, height: 900, borderRadius: '50%', background: night ? 'radial-gradient(ellipse,#ffffff10,transparent 60%)' : 'radial-gradient(ellipse,#00000018,transparent 60%)'}}/>}
    {theme === 'impacto' && <>
      <AbsoluteFill style={{backgroundImage: `linear-gradient(${night ? '#ffffff12' : '#00000014'} 2px,transparent 2px),linear-gradient(90deg,${night ? '#ffffff12' : '#00000014'} 2px,transparent 2px)`, backgroundSize: '90px 90px', backgroundPosition: `${depth * -14}px ${frame * .6}px`, opacity: .9}}/>
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
        <path d="M-40 260 C300 120 700 420 1120 180" fill="none" stroke={ink} strokeOpacity=".22" strokeWidth="3"/>
        <path d={`M-40 ${1500 + Math.sin(frame / 40) * 20} C320 1380 760 1660 1120 1460`} fill="none" stroke={RED} strokeOpacity=".45" strokeWidth="3"/>
      </svg>
    </>}

    <AbsoluteFill style={{transform: `translate(${Math.sin(frame * 2.7) * 14 * hit}px, ${(1 - enter) * 160 + Math.sin(frame / 90) * 8 + Math.cos(frame * 3.3) * 9 * hit}px) rotate(${(1 - enter) * -3}deg)`}}>
      {/* Vídeo */}
      <div style={{position: 'absolute', left: (1080 - vw) / 2, top: vtop + videoShift, width: vw, height: vh, borderRadius: vr, overflow: 'hidden', opacity: 1 - turn * .18, transform: `perspective(1500px) translateX(${depth * 7}px) rotateY(${turn * -18}deg) rotate(${tilt * (theme === 'impacto' ? 1 : .6) * k}deg)`, boxShadow: vidShadow, border: theme === 'impacto' ? '10px solid #f4f4f4' : theme === 'estudio' && (S.shape === 'circle' || objectScene) ? `14px solid ${night ? '#1d1d1d' : '#101010'}` : undefined}}>
        <OffthreadVideo muted={!!audioMix} src={staticFile(video)} style={{position: 'absolute', left, top: topV, width: vidW, height: vidH, maxWidth: 'none', filter: vfilter}}/>
        {neg > 0 && <AbsoluteFill style={{background: 'radial-gradient(circle,transparent 50%,#000000aa 110%)'}}/>}
      </div>

      {/* Objeto principal da cena */}
      {sceneObjects.map((o, i) => {
        const size = o.size ?? (theme === 'estudio' ? 440 : 520);
        const free = o.x !== undefined;
        const out = interpolate(t, [(o.until ?? S.to) - .17, o.until ?? S.to], [1, 0], clamp);
        return <div key={i} style={free
          ? {position: 'absolute', left: o.x! - size / 2, top: (o.y ?? 960) - size / 2, transform: `translate(${depth * -12}px,${depth * 5}px) rotate(${o.rot ?? 0}deg)`, opacity: out}
          : {position: 'absolute', left: 0, right: 0, top: theme === 'estudio' ? 520 : 1040, display: 'flex', justifyContent: theme === 'estudio' ? 'center' : 'flex-end', paddingRight: theme === 'estudio' ? 0 : 40, opacity: out}}>
          <HeroObject kind={o.kind} at={o.at} openAt={o.openAt} src={o.src} color={o.color} accentColor={palette?.accent} assetFilter={palette?.assetFilter} theme={theme} dark={night} size={size}/>
        </div>;
      })}

      {/* Gráfico (impacto) */}
      {S.chart && t >= S.chart.at && (() => {
        const pts = S.chart.trend === 'up' ? [[80, 520], [260, 430], [380, 470], [560, 300], [700, 340], [960, 90]] : S.chart.trend === 'down' ? [[80, 90], [260, 200], [380, 150], [560, 330], [700, 290], [960, 520]] : [[80, 120], [300, 420], [420, 380], [560, 520], [720, 300], [960, 80]];
        const prog = interpolate(t, [S.chart.at, S.chart.at + 1.1], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
        return <svg width="1080" height="620" style={{position: 'absolute', left: 0, top: 1080, overflow: 'visible'}}>
          <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={S.chart.trend === 'down' ? RED : ink} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${prog} 1`} style={{filter: `drop-shadow(0 0 12px ${S.chart.trend === 'down' ? RED : '#0000'})`}}/>
        </svg>;
      })()}

      {/* Títulos */}
      {(S.titles ?? []).map((ti, i) => {
        const until = ti.until ?? S.to;
        const start = ti.smallAt ?? ti.bigAt;
        if (t < start || t >= until) return null;
        const out = interpolate(t, [until - .17, until], [1, 0], clamp);
        const markP = interpolate(t, [ti.bigAt + .05, ti.bigAt + .35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        const big = ti.size ?? 132;
        const red = theme === 'impacto' && ti.mark !== false;
        return <div key={i} style={{position: 'absolute', left: 50, right: 50, top: theme === 'estudio' ? 200 : 210, textAlign: 'center', opacity: out}}>
          {ti.small && <div style={{fontFamily: T.smallFont, fontStyle: theme === 'impacto' ? 'normal' : 'italic', fontSize: theme === 'impacto' ? 50 : 58, color: ink, opacity: .9, textShadow: chroma}}>{ti.small.split(' ').map((w, j) => <Reveal key={j} at={(ti.smallAt ?? ti.bigAt) + j * .07} style={{marginRight: 14}}>{w}</Reveal>)}</div>}
          <div style={{position: 'relative', display: 'inline-block', marginTop: 8}}>
            {red && t >= ti.bigAt && <div style={{position: 'absolute', left: -14, right: -14, top: '22%', bottom: '8%', background: RED, transformOrigin: 'left', transform: `scaleX(${markP}) skewX(-8deg)`, opacity: .92}}/>}
            {ti.strike !== undefined && t >= ti.strike && <div style={{position: 'absolute', left: -20, top: '50%', height: 16, width: `${interpolate(t, [ti.strike, ti.strike + .25], [0, 112], {...clamp, easing: Easing.out(Easing.cubic)})}%`, background: RED, transform: 'rotate(-4deg)', zIndex: 2, boxShadow: `0 0 18px ${RED}`}}/>}
            <div style={{position: 'relative', fontFamily: 'TplSora', fontWeight: 700, fontSize: big, letterSpacing: -5, lineHeight: 1.02, color: red ? (palette?.ink ?? '#ffffff') : ink, textShadow: red ? `0 0 30px ${RED}aa, ${chroma}` : chroma}}><Reveal at={ti.bigAt}>{ti.big}</Reveal></div>
          </div>
        </div>;
      })}

      {/* Pílulas */}
      <div style={{position: 'absolute', left: 0, right: 0, top: objectScene && theme === 'estudio' ? 1480 : 1330}}>
        {(S.pills ?? []).map((pl, i) => {
          const until = pl.until ?? S.to;
          if (t < pl.at || t >= until) return null;
          const p = sp(frame, pl.at, fps, 13, 170);
          const out = interpolate(t, [until - .17, until], [1, 0], clamp);
          const darkPill = pl.dark;
          return <div key={i} style={{width: 'fit-content', minWidth: 300, maxWidth: 860, boxSizing: 'border-box', margin: '0 auto 18px', padding: '22px 34px', borderRadius: theme === 'impacto' ? 6 : 26, background: darkPill ? (theme === 'impacto' ? RED : '#111') : '#ffffff', color: darkPill ? '#fff' : '#111', boxShadow: theme === 'impacto' ? '6px 6px 0 #000' : '0 18px 40px #0000002a, 0 2px 6px #00000014', fontFamily: 'TplManrope', fontWeight: 700, fontSize: 36, display: 'flex', alignItems: 'center', gap: 16, opacity: Math.min(1, p * 1.5) * out, transform: `translateY(${(1 - p) * 70}px) scale(${.85 + .15 * p}) rotate(${theme === 'impacto' ? (i % 2 ? 1.5 : -1.5) : 0}deg)`}}>
            {pl.icon && <span style={{color: darkPill ? '#fff' : T.accent === '#ffffff' ? '#111' : T.accent}}>{pl.icon}</span>}{pl.text}
          </div>;
        })}
      </div>
    </AbsoluteFill>

    {/* Legenda palavra a palavra */}
    {!S.hideCaption && block && <div style={{position: 'absolute', left: 70, right: 70, top: largeCaptions ? 1590 : 1690, textAlign: 'center', lineHeight: 1.25}}>
      {block.map(wd => {
        if (t * 1000 < wd.startMs - 40) return null;
        const key = keyRe?.test(wd.text.toLocaleUpperCase('pt-BR')) ?? false;
        const p = sp(frame, wd.startMs / 1000 - .04, fps, 15, 220);
        const keyColor = theme === 'impacto' ? (palette && !night ? palette.ink : RED) : ink;
        return <span key={`${wd.segment}-${wd.startMs}`} style={{display: 'inline-block', margin: '0 9px', fontFamily: key ? 'TplSora' : 'TplManrope', fontWeight: 700, fontSize: largeCaptions ? (key ? 100 : 88) : (key ? 62 : 46), letterSpacing: key ? -1.5 : 0, color: key ? keyColor : largeCaptions ? ink : sub, textShadow: key && theme === 'impacto' ? `0 0 18px ${RED}88` : undefined, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 26}px)`}}>{wd.text.toLocaleLowerCase('pt-BR')}</span>;
      })}
    </div>}

    {S.confettiAt !== undefined && <Confetti at={S.confettiAt} x={540} y={420} palette={theme === 'impacto' ? ['#111', '#fff', RED] : ['#111', '#fff', '#9a9a9a', T.accent === '#ffffff' ? '#cfcfcf' : T.accent]}/>}

    {/* Granulação e vinheta (impacto) */}
    {theme === 'impacto' && <>
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: .16, mixBlendMode: 'multiply'}}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed={frame % 9}/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="1080" height="1920" filter="url(#grain)"/>
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%,transparent 55%,#000000aa 120%)'}}/>
    </>}
  </AbsoluteFill>;
};
