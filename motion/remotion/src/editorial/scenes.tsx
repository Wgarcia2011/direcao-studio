import React from 'react';
import {AbsoluteFill,Easing,Img,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {BlurWord,C,Captions,Cue,EditorialProps,F,Label,Paper,Pill,SceneBase,VideoCard,fit,prog,useFonts,useT} from './common';

// Pergunta: cartao com o entrevistador, "?" gigante e a palavra-chave marcada.
export type PerguntaScene=SceneBase&{lead:Cue[];title:Cue;marked:Cue;pill:Cue|null};
export const Pergunta:React.FC<EditorialProps<PerguntaScene>>=({scene:s,video,sourceSize,fonts})=>{
 useFonts(fonts);
 const t=useT(),dur=s.frames/30;
 const inn=prog(t,0,.6,Easing.bezier(.34,1.4,.64,1));
 const q=prog(t,.55,.6,Easing.bezier(.34,1.56,.64,1));
 const mark=prog(t,s.marked.at,.45);
 return <AbsoluteFill>
  <Paper/>
  <Label>{s.label}</Label>
  <div style={{position:'absolute',right:40,top:150,font:`italic 700 560px/1 ${F.serif}`,color:C.teal,opacity:.9*q,transform:`rotate(${12-8*q+Math.sin(t*2)*3}deg) scale(${.4+.6*q})`,zIndex:2,WebkitTextStroke:`4px ${C.navy}`}}>?</div>
  <VideoCard src={video} shots={s.shots} sourceSize={sourceSize} x={90} y={250} w={900} h={820} r={56} zoom={interpolate(t,[0,dur],[1.12,1.0])} rot={-4*(1-inn)} scale={.82+.18*inn} opacity={Math.min(1,inn*1.6)}/>
  <div style={{position:'absolute',left:90,right:60,top:1130,color:C.ink,zIndex:3}}>
   <div style={{font:`italic 700 70px/1.1 ${F.serif}`,color:C.grey}}>{s.lead.map((w,i)=><React.Fragment key={i}><BlurWord at={w.at}>{w.t}</BlurWord> </React.Fragment>)}</div>
   <div style={{font:`700 ${fit(s.title.t,104,920)}px/1.08 ${F.sans}`,letterSpacing:-3}}><BlurWord at={s.title.at}>{s.title.t}</BlurWord></div>
   <div style={{position:'relative',display:'inline-block',font:`700 ${fit(s.marked.t,128,900)}px/1.1 ${F.sans}`,letterSpacing:-4,color:C.navy}}>
    <span style={{position:'absolute',left:-12,right:-12,bottom:14,height:44,background:C.teal,opacity:.55,transform:`scaleX(${mark})`,transformOrigin:'left',borderRadius:8}}/>
    <BlurWord at={s.marked.at} style={{position:'relative'}}>{s.marked.t}</BlurWord>
   </div>
  </div>
  {s.pill?<Pill at={s.pill.at} x={560} y={980} dark rot={-5}>{s.pill.t}</Pill>:null}
  <Captions words={s.words}/>
 </AbsoluteFill>;
};

// Meta: video em circulo, barra ate a bandeira, busca digitando e metas concluidas.
export type MetaScene=SceneBase&{lead:Cue;big:Cue[];race:[number,number];search:{t:string;from:number;to:number}|null;checks:Cue[]};
const Check:React.FC<{at:number;label:string;y:number}>=({at,label,y})=>{
 const t=useT();const p=prog(t,at-.25,.4,Easing.bezier(.34,1.56,.64,1));const draw=prog(t,at,.35);
 return <div style={{position:'absolute',left:110,top:y,display:'flex',alignItems:'center',gap:28,opacity:Math.min(1,p*2),transform:`translateX(${(1-p)*-60}px) scale(${.9+.1*p})`,transformOrigin:'left center'}}>
  <svg width={84} height={84}><rect x={4} y={4} width={76} height={76} rx={22} fill={draw>0?C.teal:C.white} stroke={C.navy} strokeWidth={4}/>
   <path d="M22 44 L37 58 L63 28" fill="none" stroke={C.white} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={64} strokeDashoffset={64*(1-draw)}/></svg>
  <span style={{font:`700 64px ${F.sans}`,color:C.navy,letterSpacing:-1}}>{label}</span>
 </div>;
};
export const Meta:React.FC<EditorialProps<MetaScene>>=({scene:s,video,sourceSize,fonts})=>{
 useFonts(fonts);
 const t=useT(),f=useCurrentFrame(),dur=s.frames/30;
 const circle=prog(t,0,.55);
 const run=interpolate(t,s.race,[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.7,0,.2,1)});
 const flag=prog(t,s.race[1]-.05,.4,Easing.bezier(.34,1.56,.64,1));
 const typed=s.search?Math.floor(s.search.t.length*interpolate(t,[s.search.from,s.search.to],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})):0;
 const bar=s.search?prog(t,s.search.from-.15,.4):0;
 return <AbsoluteFill>
  <Paper/>
  <Label>{s.label}</Label>
  <svg width={1080} height={1920} style={{position:'absolute',inset:0}}>
   <g transform={`rotate(${f*1.2} 540 560)`}><circle cx={540} cy={560} r={372*circle} fill="none" stroke={C.teal} strokeWidth={6} strokeDasharray="22 18"/></g>
  </svg>
  <div style={{position:'absolute',left:200,top:220,width:680,height:680,borderRadius:'50%',overflow:'hidden',clipPath:`circle(${circle*50}% at 50% 50%)`}}>
   <VideoCard src={video} shots={s.shots} sourceSize={sourceSize} x={0} y={0} w={680} h={680} r={340} zoom={interpolate(t,[0,dur],[1.0,1.12])}/>
  </div>
  <div style={{position:'absolute',left:90,top:960}}>
   <span style={{font:`italic 700 76px ${F.serif}`,color:C.grey,marginRight:18}}><BlurWord at={s.lead.at}>{s.lead.t}</BlurWord></span>
   <span style={{font:`700 ${fit(s.big.map(w=>w.t).join(' '),150,900-s.lead.t.length*40)}px/1 ${F.sans}`,letterSpacing:-6,color:C.navy}}>{s.big.map((w,i)=><React.Fragment key={i}><BlurWord at={w.at}>{w.t}</BlurWord> </React.Fragment>)}</span>
  </div>
  <div style={{position:'absolute',left:100,top:1150,width:860,height:14,borderRadius:7,background:C.line}}>
   <div style={{width:`${run*100}%`,height:'100%',borderRadius:7,background:C.navy}}/>
   <div style={{position:'absolute',left:`calc(${run*100}% - 22px)`,top:-15,width:44,height:44,borderRadius:22,background:C.teal,border:`6px solid ${C.white}`,boxShadow:'0 6px 14px #0003'}}/>
   <svg width={70} height={90} style={{position:'absolute',right:-30,top:-84,transform:`scale(${flag}) rotate(${(1-flag)*-30}deg)`,transformOrigin:'bottom left'}}>
    <rect x={4} y={0} width={6} height={90} fill={C.ink}/>
    {[0,1,2,3].map(i=>[0,1,2].map(j=><rect key={i+'-'+j} x={10+i*14} y={4+j*14} width={14} height={14} fill={(i+j)%2?C.white:C.ink}/>))}
   </svg>
  </div>
  {s.search?<div style={{position:'absolute',left:100,top:1240,width:860,height:96,borderRadius:48,background:C.white,boxShadow:'0 12px 30px #14151620',display:'flex',alignItems:'center',gap:22,padding:'0 34px',opacity:bar,transform:`scaleX(${.6+.4*bar})`,transformOrigin:'left'}}>
   <svg width={44} height={44}><circle cx={18} cy={18} r={13} fill="none" stroke={C.navy} strokeWidth={5}/><path d="M28 28 L40 40" stroke={C.navy} strokeWidth={6} strokeLinecap="round"/></svg>
   <span style={{font:`700 46px ${F.sans}`,color:C.ink,whiteSpace:'nowrap'}}>{s.search.t.slice(0,typed)}<span style={{opacity:f%16<8?1:0,color:C.teal}}>|</span></span>
  </div>:null}
  {s.checks.slice(0,2).map((c,i)=><Check key={i} at={c.at} label={c.t} y={1370+i*100}/>)}
  <Captions words={s.words}/>
 </AbsoluteFill>;
};

// Fechamento: palavra grande sublinhada a mao, frase final e cartao de encerramento.
export type FechamentoScene=SceneBase&{lead:Cue;big:Cue;words2:Cue[]};
export const Fechamento:React.FC<EditorialProps<FechamentoScene>>=({scene:s,video,sourceSize,fonts,brand})=>{
 useFonts(fonts);
 const t=useT(),dur=s.frames/30;
 const under=prog(t,s.big.at+.15,.5,Easing.bezier(.65,0,.35,1));
 const end=s.tailFrames?prog(t,dur,.38,Easing.bezier(.7,0,.2,1)):0;
 const logo=s.tailFrames?prog(t,dur+.16,.36,Easing.bezier(.34,1.56,.64,1)):0;
 return <AbsoluteFill>
  <Paper/>
  <Label>{s.label}</Label>
  <VideoCard src={video} shots={s.shots} sourceSize={sourceSize} x={110} y={230} w={860} h={760} r={60} zoom={interpolate(t,[0,dur],[1.0,1.14])} scale={1-.06*end} opacity={1-end}/>
  <div style={{position:'absolute',left:90,right:60,top:1050,opacity:1-end}}>
   <div style={{font:`italic 700 60px ${F.serif}`,color:C.grey}}><BlurWord at={s.lead.at}>{s.lead.t}</BlurWord></div>
   <div style={{position:'relative',display:'inline-block',font:`italic 700 ${fit(s.big.t,190,900,.5)}px/1.05 ${F.serif}`,color:C.navy,letterSpacing:-4}}>
    <BlurWord at={s.big.at}>{s.big.t}</BlurWord>
    <svg width="100%" height={60} viewBox="0 0 820 60" preserveAspectRatio="none" style={{position:'absolute',left:0,bottom:-30}}>
     <path d="M8 38 C 200 10, 420 54, 812 22" fill="none" stroke={C.teal} strokeWidth={14} strokeLinecap="round" strokeDasharray={830} strokeDashoffset={830*(1-under)}/></svg>
   </div>
   <div style={{marginTop:60,display:'flex',gap:18,flexWrap:'wrap'}}>
    {s.words2.map((w,i)=><BlurWord key={i} at={w.at} style={{font:`700 68px ${F.sans}`,letterSpacing:-2,color:w.k?C.navy:C.grey}}>{w.t}</BlurWord>)}
   </div>
  </div>
  {t<dur?<Captions words={s.words}/>:null}
  {s.tailFrames?<AbsoluteFill style={{background:C.navy,clipPath:`inset(${(1-end)*100}% 0 0 0)`,justifyContent:'center',alignItems:'center',flexDirection:'column',gap:44}}>
   {brand.logo?<div style={{width:300,height:300,borderRadius:150,background:C.white,display:'flex',alignItems:'center',justifyContent:'center',transform:`scale(${logo})`,boxShadow:`0 0 0 ${14*logo}px ${C.teal}55`}}>
    <Img src={staticFile(brand.logo)} style={{width:260,height:260,objectFit:'contain'}}/></div>:null}
   <div style={{font:`italic 700 76px ${F.serif}`,color:C.white,opacity:logo}}>{brand.endText}</div>
  </AbsoluteFill>:null}
 </AbsoluteFill>;
};
