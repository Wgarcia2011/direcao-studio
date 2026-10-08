import type {MotionDocument} from './MotionTypes';
import React from 'react';
import {MotionVideo} from './MotionVideo';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

import {ThreeCanvas} from '@remotion/three';

export type Element = {id:string;kind:string;start:number;duration:number;x:number;y:number;color:string;scale:number;font_size:number;text:string;model:string;asset?:string;motion?:string;items?:string[];item_times?:number[];layer?:string};
export type VideoProps = {motion?:MotionDocument;width:number;height:number;durationInFrames:number;source?:string;foreground?:string|null;offsetFrames?:number;totalDurationInFrames?:number;audio:boolean;title:string;captions:boolean;layout:string;theme:string;backgroundMode:string;elements:Element[];blocks:{s:number;e:number;text:string;key?:number;source_key?:string;timing?:string;words:{s:number;e:number;w:string}[]}[];assets:Record<string,string>;brand?:string;cta?:string};
export const defaults:VideoProps={width:1080,height:1920,durationInFrames:150,audio:false,title:'Meu primeiro projeto',captions:true,layout:'moldura',theme:'roxo',backgroundMode:'original',elements:[],blocks:[],assets:{}};
const themes:Record<string,{bg:string;ink:string;accent:string;panel:string}>={roxo:{bg:'#151020',ink:'#f5f0ff',accent:'#a56bff',panel:'#241934'},nutricao:{bg:'#f6edf1',ink:'#341a2b',accent:'#b62564',panel:'#fff8fc'},ingles:{bg:'#f5f1e8',ink:'#163955',accent:'#2d65a2',panel:'#fffdf7'},arquitetura:{bg:'#181a1e',ink:'#faf5ee',accent:'#d88763',panel:'#28282c'},marketing:{bg:'#0a2036',ink:'#f6f4ed',accent:'#fa9a3c',panel:'#142f49'},quadro:{bg:'#f5f5f0',ink:'#162b40',accent:'#385f95',panel:'#ffffff'}};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

export function Object3D({model,color}:{model:string;color:string}){
 const f=useCurrentFrame();
 const box=(position:[number,number,number],size:[number,number,number],tint=color)=><mesh position={position}><boxGeometry args={size}/><meshStandardMaterial color={tint} roughness={.35} metalness={.25}/></mesh>;
 return <><ambientLight intensity={1.8}/><directionalLight position={[-3,5,7]} intensity={3}/><group rotation={[.2,f*.017,.08]}>
 {model==='sphere'?<mesh><sphereGeometry args={[1,32,24]}/><meshStandardMaterial color={color}/></mesh>:model==='torus'?<mesh><torusGeometry args={[.85,.28,20,48]}/><meshStandardMaterial color={color}/></mesh>:model==='building'?<>{box([0,0,0],[1.6,2.3,.8])}{[-.5,0,.5].flatMap(x=>[-.65,0,.65].map(y=>box([x,y,.42],[.22,.3,.05],'#d9f0ff')))}</>:model==='laptop'?<>{box([0,.35,0],[2,1.3,.12])}{box([0,.35,.08],[1.75,1.05,.02],'#1b2940')}{box([0,-.35,.45],[2,.12,1.1])}</>:model==='growth'?<>{[.5,1,1.7].map((h,i)=>box([i*.65-.65,h/2-.8,0],[.4,h,.5]))}</>:model==='clock'?<><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[1,1,.18,48]}/><meshStandardMaterial color={color}/></mesh>{box([0,.35,.12],[.07,.75,.05],'#ffffff')}{box([.3,0,.12],[.65,.07,.05],'#ffffff')}</>:model==='shield'?<mesh scale={[.8,1.2,.25]}><octahedronGeometry args={[1.2,0]}/><meshStandardMaterial color={color}/></mesh>:box([0,0,0],[1.6,1.6,1.6])}
 </group></>;
}

export function Explain({o}:{o:Element}){
 const f=useCurrentFrame();const labels=o.items?.length?o.items:[o.text||'Sua ideia'];const ink=o.color;const n=labels.length;
 const start=(i:number)=>Math.round((o.item_times?.[i]??i*.3)*30);const reveal=(i:number)=>interpolate(f,[start(i),start(i)+10],[0,1],clamp);
 if(o.motion==='calendar')return <svg viewBox="0 0 640 430" width="100%"><rect x="35" y="25" width="570" height="360" rx="18" fill="#ffffff" stroke={ink} strokeWidth="8"/><path d="M35 105H605" stroke={ink} strokeWidth="8"/>{Array.from({length:21},(_,i)=><rect key={i} x={75+(i%7)*71} y={135+Math.floor(i/7)*70} width="44" height="44" rx="8" fill={i<f/3?ink:'#d7dbe2'}/>)}<text x="320" y="420" fill={ink} textAnchor="middle" fontSize="30">{labels[0]}</text></svg>;
 if(o.motion==='plate')return <svg viewBox="0 0 640 430" width="100%"><circle cx="320" cy="200" r="165" fill="#ffffff" stroke={ink} strokeWidth="8"/><circle cx="320" cy="200" r="126" fill="#ece9df"/>{['#60956e','#d9a55d','#c9705f'].map((c,i)=><circle key={i} cx={250+i*65} cy={190+(i%2)*30} r={43*reveal(i)} fill={c}/>)}<text x="320" y="415" fill={ink} textAnchor="middle" fontSize="30">{labels[0]}</text></svg>;
 if(o.motion==='chart')return <svg viewBox="0 0 640 430" width="100%"><path d="M70 30V350H600" fill="none" stroke={ink} strokeWidth="4"/><path d="M80 310L185 250L285 270L390 140L495 175L580 75" fill="none" stroke={ink} strokeWidth="10" strokeDasharray="780" strokeDashoffset={780*(1-interpolate(f,[0,50],[0,1],clamp))}/><text x="320" y="410" fill={ink} textAnchor="middle" fontSize="27">{labels[0]}</text></svg>;
 if(o.motion==='funnel')return <svg viewBox="0 0 640 440" width="100%">{labels.map((label,i)=><g key={i} opacity={reveal(i)}><path d={`M${60+i*45} ${i*110+15}H${580-i*45}L${540-i*45} ${i*110+100}H${100+i*45}Z`} fill={ink}/><text x="320" y={i*110+68} textAnchor="middle" fontSize="29" fill="#ffffff">{label}</text></g>)}</svg>;
 return <div style={{display:'flex',flexDirection:o.motion==='flow'?'row':'column',gap:24,alignItems:'stretch'}}>{labels.map((label,i)=><React.Fragment key={i}><div style={{opacity:reveal(i),translate:`0 ${interpolate(f,[start(i),start(i)+10],[20,0],clamp)}px`,padding:'24px 28px',background:'#ffffff',color:'#162b40',border:`3px solid ${ink}`,borderRadius:14,fontSize:38,fontWeight:700,flex:1,textAlign:'center'}}>{o.motion==='checklist'?<span style={{color:ink,marginRight:16}}>✓</span>:null}{label}</div>{o.motion==='flow'&&i<n-1?<svg viewBox="0 0 50 50" width="42" style={{alignSelf:'center',flexShrink:0,opacity:reveal(i+1)}}><path d="M4 25H40M28 12L41 25L28 38" fill="none" stroke={ink} strokeWidth="5"/></svg>:null}</React.Fragment>)}</div>;
}

function Visual({o,assets}:{o:Element;assets:Record<string,string>}){
 const frame=useCurrentFrame();const {fps,width,height}=useVideoConfig();
 const entry=interpolate(frame,[0,12],[.98,1],clamp);
 const fade=interpolate(frame,[0,6,Math.max(7,Math.round(o.duration*fps)-7),Math.round(o.duration*fps)],[0,1,1,0],clamp);
 const common:React.CSSProperties={position:'absolute',left:`${o.x}%`,top:`${o.y}%`,translate:'-50% -50%',opacity:fade,scale:entry,fontFamily:'Manrope',textAlign:'center'};
 if(o.kind==='image'){const caption=o.text&&o.text!=='Seu texto'?o.text:null;return <div style={{...common,width:320*o.scale,translate:'-50% -50%',padding:caption?24:0,background:caption?'#241934':undefined,border:caption?'1px solid #d1b4ff66':undefined,borderRadius:caption?22:0,boxShadow:caption?'0 14px 32px #0006':undefined}}><Img src={assets[o.asset||'']} style={{width:'100%',height:'auto',maxHeight:height*.57,objectFit:'contain',borderRadius:caption?12:0}}/>{caption?<div style={{fontFamily:'Sora',fontSize:36,lineHeight:1.18,color:'#f5f0ff',marginTop:18,textAlign:'center'}}>{caption}</div>:null}</div>;}
 if(o.kind==='3d')return <div style={{...common,width:320*o.scale,height:320*o.scale}}><ThreeCanvas width={Math.round(320*o.scale)} height={Math.round(320*o.scale)} camera={{position:[0,0,6],fov:35}}><Object3D model={o.model} color={o.color}/></ThreeCanvas></div>;
 if(o.kind==='motion')return <div style={{...common,width:Math.min(width*.8,720)*o.scale,maxHeight:height*.6}}><Explain o={o}/></div>;
 return <div style={{...common,width:'82%',fontSize:o.font_size,color:o.color,fontWeight:700,textShadow:'0 4px 12px #0007'}}>{o.text}</div>;
}

const LegacyEditorVideo:React.FC<VideoProps>=(p)=>{
 const frame=useCurrentFrame()+(p.offsetFrames||0);const {width,height,fps}=useVideoConfig();const t=frame/fps;const colors=themes[p.theme]||themes.roxo;const horizontal=width>height;
 // Group nearby elements so the presenter does not zoom back and forth in short gaps.
 const windows=p.elements.filter(o=>(o.kind==='motion'||o.kind==='image')&&o.x>=60).map(o=>({start:o.start,end:o.start+o.duration})).sort((a,b)=>a.start-b.start).reduce<{start:number;end:number}[]>((out,w)=>{const last=out[out.length-1];if(last&&w.start-last.end<2.5)last.end=Math.max(last.end,w.end);else out.push({...w});return out;},[]);
 const rawMove=windows.reduce((m,w)=>Math.max(m,interpolate(t,[w.start-.8,w.start,w.end,w.end+.8],[0,1,1,0],clamp)),0);
 const contextMove=rawMove*rawMove*(3-2*rawMove);
 const move=p.layout==='contexto'?contextMove:p.layout==='moldura'?interpolate(frame,[60,86],[0,1],clamp):p.layout==='cheia'?0:1;
 const final=p.layout==='contexto'&&horizontal?{left:4,top:28,width:44,height:44}:p.layout==='quadro'?{left:4,top:15,width:36,height:70}:horizontal?{left:5,top:14,width:40,height:76}:{left:8,top:48,width:84,height:41};
 const presenter:React.CSSProperties={position:'absolute',left:`${interpolate(move,[0,1],[0,final.left])}%`,top:`${interpolate(move,[0,1],[0,final.top])}%`,width:`${interpolate(move,[0,1],[100,final.width])}%`,height:`${interpolate(move,[0,1],[100,final.height])}%`,borderRadius:move*24,overflow:'hidden',border:move?`3px solid ${colors.accent}`:undefined,boxSizing:'border-box'};
 const source=(foreground=false)=>p.source?<div style={presenter}><OffthreadVideo transparent={foreground} src={foreground?p.foreground!:p.source} muted style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>:null;
 const elements=(layer:string)=>p.elements.filter(o=>(o.layer||'front')===layer).map(o=><Sequence key={o.id} from={Math.round(o.start*fps)-(p.offsetFrames||0)} durationInFrames={Math.max(1,Math.round(o.duration*fps))} layout="none"><Visual o={o} assets={p.assets}/></Sequence>);
 const active=p.blocks.find(b=>t>=b.s&&t<b.e);
 return <AbsoluteFill style={{backgroundColor:colors.bg,color:colors.ink,fontFamily:'Manrope',overflow:'hidden'}}>
 <style>{`@font-face{font-family:Sora;src:url('${staticFile('fonts/sora-700.ttf')}');font-weight:700}@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-400.ttf')}');font-weight:400}@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-700.ttf')}');font-weight:700}`}</style>
 {p.backgroundMode!=='replace'&&source()}
 {elements('behind')}
 {p.foreground&&p.backgroundMode!=='original'&&source(true)}
 {elements('front')}
 {p.title&&t<3?<div style={{position:'absolute',left:'7%',right:'7%',top:'7%',fontFamily:'Sora',fontSize:horizontal?76:76,lineHeight:1.1,fontWeight:700,textAlign:'center',opacity:interpolate(frame,[0,8,80,90],[0,1,1,0],clamp),translate:`0 ${interpolate(frame,[0,15],[20,0],clamp)}px`,textShadow:'0 3px 10px #0006'}}>{p.title}</div>:null}
 {p.captions&&active?<div style={{position:'absolute',left:'8%',right:'8%',bottom:'9%',fontSize:horizontal?48:64,fontWeight:700,textAlign:'center',lineHeight:1.22,textShadow:'0 3px 8px #000b',color:'#ffffff'}}>{active.words?.length?active.words.map((w,i)=><span key={i} style={{color:t>=w.s&&t<w.e?colors.accent:'#ffffff'}}> {w.w}</span>):active.text}</div>:null}
 {p.cta&&t>(p.totalDurationInFrames||p.durationInFrames)/fps-3?<div style={{position:'absolute',left:'10%',right:'10%',top:'30%',padding:32,fontSize:54,fontFamily:'Sora',background:colors.panel,textAlign:'center'}}>{p.brand?<div style={{fontSize:28,color:colors.accent,marginBottom:20}}>{p.brand}</div>:null}{p.cta}</div>:null}
 {p.audio&&p.source?<Audio src={p.source}/>:null}
 </AbsoluteFill>;
};

export const EditorVideo:React.FC<VideoProps>=(p)=>p.motion?<MotionVideo p={p}/>:<LegacyEditorVideo {...p}/>;
