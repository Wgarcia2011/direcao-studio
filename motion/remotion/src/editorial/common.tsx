import React,{useEffect,useState} from 'react';
import {AbsoluteFill,OffthreadVideo,staticFile,useCurrentFrame,interpolate,Easing,delayRender,continueRender} from 'remotion';

// Template "short editorial 9:16": tipos do plano e pecas visuais comuns.
export type Word={t:string;s:number;e:number;k:boolean};
export type Cue={t:string;at:number;k?:boolean};
export type Shot={at:number;x:number};
export type SceneBase={id:string;kind:string;frames:number;tailFrames:number;shots:Shot[];words:Word[];label:string};
export type EditorialProps<S>={scene:S;video:string;sourceSize:[number,number];fonts:{serif:string;sans:string;label:string};brand:{logo:string;endText:string}};

export const C={paper:'#f3eee4',ink:'#141516',navy:'#0a1150',teal:'#00b3a0',grey:'#7a7469',line:'#d8d0c2',white:'#ffffff'};
export const F={serif:'EdSerif, Georgia, serif',sans:'EdSans, Arial, sans-serif',label:'EdLabel, Arial, sans-serif'};

const easeOut=Easing.bezier(.16,1,.3,1);
export const prog=(t:number,at:number,dur=.4,ease=easeOut)=>interpolate(t,[at,at+dur],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
// Reduz a fonte para o texto caber em `max` px numa linha; deterministico (nao mede a fonte carregada).
export const fit=(text:string,base:number,max:number,ratio=.58)=>Math.min(base,Math.floor(max/Math.max(1,text.length*ratio)));
export const useT=()=>useCurrentFrame()/30;
export const sceneDuration=(s:{frames:number;tailFrames:number})=>s.frames+(s.tailFrames||0);

// Fontes locais opcionais (ficam fora do Git); sem elas, Georgia/Arial.
export const useFonts=(fonts:EditorialProps<unknown>['fonts'])=>{
 const [h]=useState(()=>delayRender('fontes do template editorial'));
 useEffect(()=>{
  const faces:[string,string,FontFaceDescriptors][]=[['EdSerif',fonts.serif,{style:'italic',weight:'700'}],['EdSans',fonts.sans,{weight:'700'}],['EdLabel',fonts.label,{weight:'700'}]];
  Promise.all(faces.filter(([,src])=>src).map(([n,src,d])=>new FontFace(n,`url('${staticFile(src)}')`,d).load().then(f=>{document.fonts.add(f);}).catch(()=>undefined)))
   .finally(()=>continueRender(h));
 },[fonts.serif,fonts.sans,fonts.label,h]);
};

// Posicao horizontal do recorte (object-position, %) para centralizar a pessoa do plano atual.
export const focusAt=(shots:Shot[],t:number,[sw,sh]:[number,number],w:number,h:number)=>{
 const shot=[...shots].reverse().find(s=>t>=s.at)??shots[0]??{at:0,x:.5};
 const cropW=Math.min(sw,sh*w/h);
 if(sw-cropW<1)return 50;
 return Math.max(0,Math.min(100,(shot.x*sw-cropW/2)/(sw-cropW)*100));
};

export const Paper:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:C.paper}}>
  <AbsoluteFill style={{background:'radial-gradient(120% 80% at 50% 40%, transparent 55%, #00000022 100%)'}}/>
  <svg width={1080} height={1920} style={{position:'absolute',inset:0}}>
   <g transform={`rotate(${f*.35} 980 210)`}><circle cx={980} cy={210} r={260} fill="none" stroke={C.line} strokeWidth={3} strokeDasharray="10 16"/></g>
   <g transform={`rotate(${-f*.25} 90 1650)`}><circle cx={90} cy={1650} r={330} fill="none" stroke={C.line} strokeWidth={3} strokeDasharray="4 14"/></g>
   <g transform={`rotate(${f*.18} 90 1650)`}><circle cx={90} cy={1650} r={250} fill="none" stroke={C.teal} strokeOpacity={.35} strokeWidth={2} strokeDasharray="60 30"/></g>
  </svg>
 </AbsoluteFill>;
};

// Video recortado em uma forma; sem `src` mostra um cartao sintetico.
export const VideoCard:React.FC<{src:string;shots:Shot[];sourceSize:[number,number];x:number;y:number;w:number;h:number;r:number;zoom?:number;rot?:number;opacity?:number;scale?:number}>=
({src,shots,sourceSize,x,y,w,h,r,zoom=1,rot=0,opacity=1,scale=1})=>{
 const t=useT();
 return <div style={{position:'absolute',left:x,top:y,width:w,height:h,borderRadius:r,overflow:'hidden',opacity,transform:`rotate(${rot}deg) scale(${scale})`,boxShadow:'0 30px 70px #1415163a, 0 6px 16px #14151626',background:C.ink}}>
  {src?<OffthreadVideo src={staticFile(src)} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${focusAt(shots,t,sourceSize,w,h)}% 50%`,transform:`scale(${zoom})`}}/>
   :<AbsoluteFill style={{background:'linear-gradient(135deg,#263c53,#141c2b 60%,#24473e)',transform:`scale(${zoom})`,alignItems:'center',justifyContent:'center',color:'#ffffff88',font:`700 34px ${F.label}`}}>VÍDEO</AbsoluteFill>}
 </div>;
};

export const BlurWord:React.FC<{at:number;children:React.ReactNode;style?:React.CSSProperties}>=({at,children,style})=>{
 const p=prog(useT(),at-.04,.38);
 return <span style={{display:'inline-block',opacity:p,filter:`blur(${(1-p)*14}px)`,transform:`translateY(${(1-p)*34}px)`,...style}}>{children}</span>;
};

export const Pill:React.FC<{at:number;children:React.ReactNode;x:number;y:number;dark?:boolean;rot?:number}>=({at,children,x,y,dark,rot=0})=>{
 const p=prog(useT(),at,.45,Easing.bezier(.34,1.56,.64,1));
 return <div style={{position:'absolute',left:x,top:y,transform:`rotate(${rot}deg) scale(${p})`,transformOrigin:'left center',opacity:Math.min(1,p*2),padding:'18px 34px',borderRadius:999,background:dark?C.navy:C.white,color:dark?C.white:C.navy,font:`700 40px ${F.sans}`,boxShadow:'0 14px 30px #14151626',whiteSpace:'nowrap'}}>{children}</div>;
};

export const Label:React.FC<{children:React.ReactNode}>=({children})=>{
 const p=prog(useT(),.05,.45);
 return <div style={{position:'absolute',left:70,top:120,display:'flex',alignItems:'center',gap:16,opacity:p,transform:`translateX(${(1-p)*-40}px)`,font:`700 28px ${F.label}`,letterSpacing:4,color:C.navy}}>
  <span style={{width:16,height:16,borderRadius:8,background:C.teal}}/>{children}</div>;
};

// Legenda palavra a palavra em blocos curtos; palavras-chave em azul escuro.
export const Captions:React.FC<{words:Word[];y?:number}>=({words,y=1640})=>{
 const t=useT();
 const chunks:Word[][]=[];let cur:Word[]=[];
 for(const w of words){if(cur.length&&(cur.length>=3||cur.map(x=>x.t).join(' ').length+w.t.length>20)){chunks.push(cur);cur=[];}cur.push(w);}
 if(cur.length)chunks.push(cur);
 const i=chunks.findIndex((c,n)=>t>=c[0].s-.05&&(n===chunks.length-1||t<chunks[n+1][0].s-.05));
 if(i<0)return null;
 return <div style={{position:'absolute',left:60,right:60,top:y,textAlign:'center',font:`700 66px ${F.sans}`,letterSpacing:-1}}>
  {chunks[i].map((w,n)=>{const on=t>=w.s-.03;const act=on&&t<w.e+.05;const pop=prog(t,w.s-.03,.18);
   return <span key={n} style={{display:'inline-block',margin:'0 14px',opacity:on?1:.28,transform:`scale(${act?1+.08*pop:1})`,color:w.k?C.navy:C.grey}}>{w.t}</span>;})}
 </div>;
};
