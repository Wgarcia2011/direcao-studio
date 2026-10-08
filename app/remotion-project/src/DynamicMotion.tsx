import React from 'react';
import {Easing, Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {MotionAsset, MotionScene} from './MotionTypes';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(.16, 1, .3, 1);

export const DynamicMotion: React.FC<{scene: MotionScene; assets: Record<string, MotionAsset>}> = ({scene: s, assets}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const end = Math.max(2, s.durationInFrames - 1);
  const edge = Math.max(1, Math.min(Math.floor(end / 3), s.intensity === 'energetic' ? 7 : s.intensity === 'balanced' ? 11 : 15));
  const exit = interpolate(frame, [end - edge, end], [0, 1], {...clamp, easing: ease});
  const opacity = interpolate(frame, [0, edge], [0, 1], clamp) * (1 - exit);
  const accent = s.accent || '#4ee2c0';
  const purple = s.accent2 || '#b798ff';
  const panel = '#171222';
  const contentWidth = Math.min(width * (s.box_width || 86) / 100, 1200);
  const font = Math.min(s.size, contentWidth / 7);
  const bounce = (delay = 0) => spring({frame: frame - delay, fps,
    config: {damping: s.intensity === 'energetic' ? 14 : 22, stiffness: 210, mass: .7}});
  const items = s.items || [];
  const at = (i: number) => s.item_times?.length ? s.item_times[i] * fps : i * Math.min(fps * .35, end / Math.max(3, items.length + 1));
  const pill: React.CSSProperties = {display: 'inline-block', color: accent, fontSize: font * .35, fontWeight: 800,
    letterSpacing: 4, padding: '13px 22px', border: `2px solid ${accent}66`, borderRadius: 999, background: '#0b1719'};
  const textWords = s.text.split(/\s+/).filter(Boolean);
  const wordFont = Math.min(font * (s.preset === 'impact-word' ? 1.9 : 1.28), contentWidth / Math.max(4, ...textWords.map(w => w.length * .66)));
  let body: React.ReactNode;

  if (s.preset === 'dynamic-title') {
    body = <div style={{textAlign: 'left'}}>
      {s.eyebrow ? <div style={{...pill, opacity: bounce(), marginBottom: 30}}>{s.eyebrow}</div> : null}
      <div style={{fontSize: wordFont, fontWeight: 800, lineHeight: 1.08, letterSpacing: -3}}>
        {textWords.map((word, i) => <React.Fragment key={i}><span style={{display: 'inline-block', whiteSpace: 'nowrap',
          opacity: interpolate(frame, [i * 3, i * 3 + edge], [0, 1], clamp),
          translate: `0 ${48 * (1 - bounce(i * 3))}px`, rotate: `${-5 * (1 - bounce(i * 3))}deg`,
          color: i === textWords.length - 1 ? accent : '#fff'}}>{word}</span>{' '}</React.Fragment>)}
      </div>
      <div style={{height: 8, background: `linear-gradient(90deg,${accent},${purple})`, marginTop: 32,
        width: `${interpolate(frame, [4, 24], [0, 100], {...clamp, easing: ease})}%`, borderRadius: 10}}/>
    </div>;
  } else if (s.preset === 'impact-word') {
    const kick = 1 + .12 * (1 - bounce());
    body = <div style={{textAlign: 'center', position: 'relative'}}>
      <div style={{position: 'absolute', inset: '-40% -2%', border: `3px solid ${accent}55`, borderRadius: '50%',
        scale: .6 + bounce() * .7, opacity: (1 - interpolate(frame, [0, fps * .8], [0, 1], clamp)) * .8}}/>
      <div style={{fontSize: wordFont, lineHeight: 1.02, fontWeight: 900, letterSpacing: -4, color: accent,
        scale: kick, rotate: `${-7 * (1 - bounce())}deg`, textShadow: `0 0 55px ${accent}55`, overflowWrap: 'anywhere'}}>{s.text}</div>
      {s.eyebrow ? <div style={{...pill, marginTop: 24, borderColor: `${purple}77`, color: purple}}>{s.eyebrow}</div> : null}
    </div>;
  } else if (s.preset === 'image-card') {
    const asset = assets[s.asset];
    body = <div style={{background: panel, borderRadius: 32, padding: 20, border: `2px solid ${purple}88`,
      boxShadow: `0 32px 100px #0009,0 0 60px ${purple}22`,
      transform: `perspective(1600px) rotateY(${12 * (1 - bounce())}deg) rotateZ(${-4 * (1 - bounce())}deg)`}}>
      <div style={{height: contentWidth * .62, overflow: 'hidden', borderRadius: 22, background: '#0c0914'}}>
        {asset ? asset.kind === 'video' ? <OffthreadVideo src={asset.url} muted style={{width: '100%', height: '100%', objectFit: s.fit}}/>
          : <Img src={asset.url} style={{width: '100%', height: '100%', objectFit: s.fit,
            scale: interpolate(frame, [0, end], [1.08, 1], clamp)}}/> : <div style={{padding: 45, fontSize: font * .6}}>Importe a imagem do card</div>}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '26px 10px 12px', fontSize: font * .72, fontWeight: 800}}>
        <span style={{width: 12, height: 48, borderRadius: 8, background: accent, flexShrink: 0}}/>{s.text}
      </div>
    </div>;
  } else if (s.preset === 'checklist') {
    body = <div style={{display: 'grid', gap: 22}}>{items.map((item, i) => {
      const reveal = bounce(at(i));
      return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24, padding: '28px 32px', borderRadius: 24,
        background: panel, border: `2px solid ${i % 2 ? purple : accent}66`, fontSize: font * .74, fontWeight: 800,
        opacity: interpolate(frame, [at(i), at(i) + edge], [0, 1], clamp), translate: `${65 * (1 - reveal)}px 0`,
        scale: .94 + .06 * reveal}}>
        <span style={{width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: accent, color: '#061714', scale: reveal, fontSize: 43}}>✓</span><span>{item}</span>
      </div>;
    })}</div>;
  } else if (s.preset === 'comparison') {
    body = <><div style={{fontSize: font * .6, fontWeight: 800, textAlign: 'center', marginBottom: 32}}>{s.text}</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}>{items.map((item, i) => {
        const reveal = bounce(at(i));
        const ink = i ? accent : purple;
        return <div key={i} style={{padding: '42px 26px', background: panel, borderRadius: 28, border: `3px solid ${ink}`,
          textAlign: 'center', opacity: interpolate(frame, [at(i), at(i) + edge], [0, 1], clamp),
          translate: `${(i ? 70 : -70) * (1 - reveal)}px 0`, rotate: `${(i ? 5 : -5) * (1 - reveal)}deg`}}>
          <div style={{fontSize: font * .35, color: ink, letterSpacing: 3, fontWeight: 800, marginBottom: 22}}>{s.labels?.[i] || (i ? 'DEPOIS' : 'ANTES')}</div>
          <div style={{fontSize: font * .74, fontWeight: 800, overflowWrap: 'anywhere'}}>{item}</div>
        </div>;
      })}</div></>;
  } else {
    // One to four nodes fit the SVG; labels wrap in HTML instead of overflowing SVG text.
    body = <div style={{display: 'grid', gap: 12}}>{items.map((item, i) => {
      const reveal = bounce(at(i));
      const progress = interpolate(frame, [at(i), at(i) + 14], [0, 1], {...clamp, easing: ease});
      return <React.Fragment key={i}>
        {i > 0 ? <svg viewBox="0 0 80 64" width="64" height="52" style={{justifySelf: 'center', opacity: progress}}>
          <path d="M40 0V48M24 33L40 50L56 33" stroke={accent} strokeWidth="5" fill="none" pathLength="1"
            strokeDasharray="1" strokeDashoffset={1 - progress}/></svg> : null}
        <div style={{display: 'flex', alignItems: 'center', gap: 26, padding: '24px 30px', background: panel,
          borderRadius: 22, border: `2px solid ${i === items.length - 1 ? accent : purple}`,
          opacity: progress, scale: .9 + .1 * reveal, translate: `0 ${25 * (1 - reveal)}px`}}>
          <span style={{...pill, minWidth: 74, padding: '14px', textAlign: 'center'}}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{fontSize: font * .7, fontWeight: 800}}>{item}</span>
        </div>
      </React.Fragment>;
    })}</div>;
  }
  return <div style={{position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: contentWidth,
    maxWidth: '90%', translate: `-50% calc(-50% + ${32 * exit}px)`, scale: 1 - .035 * exit,
    opacity, color: '#fff', fontFamily: 'Manrope', willChange: 'transform'}}>{body}</div>;
};
