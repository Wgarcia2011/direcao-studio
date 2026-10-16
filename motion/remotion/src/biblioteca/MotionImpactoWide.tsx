import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, OffthreadVideo, continueRender, delayRender, cancelRender, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {HeroObject, type MotionTemplateProps} from './MotionTemplate';

const RED = '#e3262b';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Landscape adaptation of the existing impact theme. Video stays in a full 16:9 frame.
export const MotionImpactoWide: React.FC<MotionTemplateProps> = ({video, words, scenes, keywords, largeCaptions = false, selectiveMonochrome = false, enhancedMotion = false, audioMix}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const transitionAt = [10.633, 72.36, 95.68, 123.12].find(at => t >= at && t < at + .65);
  const turn = enhancedMotion && transitionAt !== undefined ? Math.pow(1 - (t-transitionAt)/.65, 3) : 0;
  const depth = enhancedMotion && ((t >= 19.94 && t < 26.38) || (t >= 77.88 && t < 88.42) || t >= 128.233) ? Math.sin(frame / 65) : 0;
  const [fontHandle] = useState(() => delayRender('Fontes do impacto horizontal'));
  useEffect(() => {
    const fonts = [new FontFace('WideSora', `url(${staticFile('fonts/sora-700.ttf')})`, {weight: '700'}), new FontFace('WideManrope', `url(${staticFile('fonts/manrope-700.ttf')})`, {weight: '700'})];
    Promise.all(fonts.map(f => f.load())).then(loaded => {loaded.forEach(f => document.fonts.add(f)); continueRender(fontHandle);}).catch(cancelRender);
  }, [fontHandle]);
  const si = Math.max(0, scenes.reduce((last, s, i) => t >= s.from ? i : last, 0));
  const s = scenes[si];
  const previous = scenes[Math.max(0, si - 1)];
  const dark = !!s?.dark;
  const ink = dark ? '#f5f5f5' : '#111111';
  const enter = spring({frame: frame - (s?.from ?? 0) * fps, fps, config: {damping: 18, stiffness: 140}});
  const comingLight = !dark && !!previous?.dark;
  const reveal = comingLight ? interpolate(t - s.from, [0, .55], [0, 1], clamp) : 1;
  const negative = s?.mood === 'neg' && t >= (s.moodAt ?? s.from);
  const hitAge = frame - (s?.moodAt ?? -9) * fps;
  const hit = negative && hitAge >= 0 && hitAge < 12 ? 1 - hitAge / 12 : 0;
  const punch = s?.punches?.find(p => t >= p.at && t < p.until)?.z ?? 1;
  const zoom = 1 + (punch - 1) * .3;
  const captions = useMemo(() => {
    const result: typeof words[] = []; let group: typeof words = [];
    for (const word of words) {
      const prev = group[group.length - 1];
      if (group.length >= (largeCaptions ? 3 : 4) || (largeCaptions && group.map(x => x.text).join(" ").length + word.text.length > 28) || (prev && (prev.segment !== word.segment || word.startMs - prev.endMs > 320 || /[,.!?;:]$/.test(prev.text)))) {result.push(group); group = [];}
      group.push(word);
    }
    if (group.length) result.push(group);
    return result;
  }, [words, largeCaptions]);
  const activeCaption = captions.find(g => t * 1000 >= g[0].startMs && t * 1000 < g[g.length - 1].endMs + 150);
  const allObjects = [...(s?.object ? [s.object] : []), ...(s?.objects ?? [])];
  const visibleObjects = allObjects.filter(o => t >= o.at && t < (o.until ?? s.to));
  const activePills = (s?.pills ?? []).filter(p => t >= p.at && t < (p.until ?? s.to));
  return <AbsoluteFill style={{overflow: 'hidden', background: dark ? 'radial-gradient(ellipse at 50% 40%,#242424,#070707)' : 'radial-gradient(ellipse at 50% 40%,#f4f4f4,#bcbcbc)', fontFamily: 'WideManrope'}}>
    {comingLight && <AbsoluteFill style={{background: '#111', clipPath: `circle(${(1-reveal)*150}% at 45% 55%)`}}/>}
    <AbsoluteFill style={{backgroundImage: `linear-gradient(${dark ? '#ffffff12' : '#00000010'} 1px,transparent 1px),linear-gradient(90deg,${dark ? '#ffffff12' : '#00000010'} 1px,transparent 1px)`, backgroundSize: '80px 80px', backgroundPosition: `${depth*-14}px ${frame*.35}px`}}/>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:.25}}><path d="M-50 100 C500 0 1300 300 1970 110" stroke={ink} fill="none" strokeWidth="2"/><path d="M-50 1010 C600 860 1200 1180 1970 930" stroke={RED} fill="none" strokeWidth="3"/></svg>
    <div style={{position:'absolute',left:60,top:185,width:1160,height:652.5,borderRadius:32,overflow:'hidden',border:'8px solid #f4f4f4',boxSizing:'border-box',boxShadow:`-5px 0 0 ${RED}99,5px 0 0 #00e5ff77,0 24px 50px #0008`,opacity:1-turn*.18,transform:`perspective(1800px) rotateY(${turn*-16}deg) translate(${Math.sin(frame*2.7)*8*hit+depth*7}px,${(1-enter)*35}px) rotate(${si%2 ? .65 : -.65}deg)`}}>
      <OffthreadVideo muted={!!audioMix} src={staticFile(video)} style={{width:'100%',height:'100%',objectFit:'contain',filter:`grayscale(${selectiveMonochrome?(negative?1:0):1}) contrast(${negative?1.35:selectiveMonochrome?1.06:1.2})`,transform:`scale(${zoom})`,transformOrigin:`${(s?.fx ?? .5)*100}% ${(s?.fy ?? .35)*100}%`}}/>
    </div>
    <div style={{position:'absolute',left:1260,top:145,width:600,textAlign:'center'}}>
      {(s?.titles ?? []).map((title,i) => {
        const start=title.smallAt ?? title.bigAt, end=title.until ?? s.to;
        if(t<start||t>=end)return null;
        const p=spring({frame:frame-title.bigAt*fps,fps,config:{damping:15,stiffness:190}});
        const mark=interpolate(t,[title.bigAt+.05,title.bigAt+.35],[0,1],clamp);
        const out=interpolate(t,[end-.17,end],[1,0],clamp);
        return <div key={i} style={{opacity:out}}>
          {title.small && <div style={{fontFamily:'"Segoe Script", "Brush Script MT", cursive',fontSize:36,color:ink,lineHeight:1.3,marginBottom:18}}>{title.small}</div>}
          {t>=title.bigAt && <div style={{position:'relative',display:'inline-block',maxWidth:'100%',transform:`translateY(${(1-p)*32}px) scale(${.9+.1*p})`,opacity:Math.min(1,p*1.5),filter:`blur(${Math.max(0,(1-p)*8)}px)`}}>
            {title.mark!==false&&<div style={{position:'absolute',inset:'12% -10px 0',background:RED,transformOrigin:'left',transform:`scaleX(${mark}) skewX(-6deg)`}}/>}
            <div style={{position:'relative',fontFamily:'WideSora',fontSize:Math.min(88,(title.size ?? 132)*.67),fontWeight:700,letterSpacing:-2,lineHeight:1.12,color:title.mark===false?ink:'#fff',overflowWrap:'break-word'}}>{title.big}</div>
            {title.strike!==undefined&&t>=title.strike&&<div style={{position:'absolute',left:'-3%',top:'48%',height:9,width:`${interpolate(t,[title.strike,title.strike+.25],[0,106],clamp)}%`,background:RED,transform:'rotate(-3deg)'}}/>}
          </div>}
        </div>;
      })}
    </div>
    {visibleObjects.map((o,i) => {
      const multi=visibleObjects.length>1;
      const size=multi?260:390;
      const left=multi?1280+i*270:1365;
      return <div key={`${o.src}-${o.at}`} style={{position:'absolute',left,top:420,opacity:interpolate(t,[(o.until??s.to)-.17,o.until??s.to],[1,0],clamp),transform:`translate(${depth*-12}px,${depth*5}px) rotate(${o.rot??0}deg)`}}><HeroObject kind={o.kind} src={o.src} at={o.at} openAt={o.openAt} theme="impacto" dark={dark} size={size}/></div>;
    })}
    {s?.chart&&t>=s.chart.at&&<svg width="550" height="310" style={{position:'absolute',left:1300,top:480}}><polyline points={s.chart.trend==='down'?'20,40 130,80 220,60 330,190 430,170 530,280':'20,270 130,190 220,210 330,100 430,120 530,20'} stroke={RED} fill="none" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${interpolate(t,[s.chart.at,s.chart.at+1.1],[0,1],clamp)} 1`}/></svg>}
    <div style={{position:'absolute',left:1260,top:835,width:600,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>{activePills.map((p,i) => <div key={i} style={{padding:'14px 24px',background:p.dark?RED:'#fff',color:p.dark?'#fff':'#111',fontSize:27,borderRadius:5,boxShadow:'4px 4px 0 #000',transform:`scale(${spring({frame:frame-p.at*fps,fps,config:{damping:15,stiffness:180}})})`}}>{p.text}</div>)}</div>
    {!s?.hideCaption&&activeCaption&&<div style={{position:'absolute',left:80,top:largeCaptions?880:900,width:1120,textAlign:'center',lineHeight:1.3}}>{activeCaption.map(w => {
      if(t*1000<w.startMs-40)return null;
      const key=keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k));
      const p=spring({frame:frame-w.startMs/1000*fps,fps,config:{damping:15,stiffness:180}});
      return <span key={w.startMs} style={{display:'inline-block',margin:'0 9px',fontSize:largeCaptions?(key?78:70):(key?49:41),fontFamily:key?'WideSora':'WideManrope',color:key?RED:largeCaptions?ink:dark?'#d0d0d0':'#505050',opacity:Math.min(1,p*1.5),transform:`translateY(${(1-p)*20}px)`}}>{w.text.toLocaleLowerCase('pt-BR')}</span>;
    })}</div>}
    {s?.confettiAt!==undefined&&t>=s.confettiAt&&t<s.confettiAt+1.6&&Array.from({length:32},(_,i)=>{const dt=t-s.confettiAt!,a=random(`wide-a-${i}`)*Math.PI*2,v=180+random(`wide-v-${i}`)*350;return <div key={i} style={{position:'absolute',left:1560+Math.cos(a)*v*dt,top:370+Math.sin(a)*v*dt+300*dt*dt,width:10,height:6,background:i%3===0?RED:i%2?'#fff':'#111',opacity:1-dt/1.6,transform:`rotate(${dt*400}deg)`}}/>;})}
    <AbsoluteFill style={{pointerEvents:'none',background:'radial-gradient(ellipse at 50% 45%,transparent 65%,#0005 120%)'}}/>
  </AbsoluteFill>;
};
