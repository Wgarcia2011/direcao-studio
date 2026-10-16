import React from 'react';
import {AbsoluteFill,Img,OffthreadVideo,staticFile,useCurrentFrame,useVideoConfig,interpolate,Easing} from 'remotion';
import example from '../templates/lower-third-basico.json';

export type Credit = {id:string;name:string;role:string;detail?:string;x:number;width:number;from:number;to:number;primary:boolean};
export type LowerThirdProps = {
 templateId:string;version:number;durationInFrames:number;
 backgroundMode:'synthetic'|'transparent'|'video';videoSrc:string;sourceStartFrame:number;
 logoSrc:string;rocketSrc:string;fontSrc:string;
 rocketMask:null|{viewBox:string;path:string};
 colors:{background:string;accent:string;text:string;role:string};credits:Credit[];
};
export const lowerThirdDemo=example as LowerThirdProps;
const ease=Easing.bezier(.2,.75,.2,1);
const tween=(f:number,a:number,b:number,x=0,y=1)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});

export function validateLowerThird(p:LowerThirdProps){
 if(p.version!==1||!Number.isInteger(p.durationInFrames)||p.durationInFrames<1)throw Error('Template/duracao invalida');
 if(!['synthetic','transparent','video'].includes(p.backgroundMode))throw Error('Fundo invalido');
 if(!Number.isInteger(p.sourceStartFrame)||p.sourceStartFrame<0)throw Error('Inicio de midia invalido');
 if(p.backgroundMode==='video'&&!p.videoSrc)throw Error('Informe videoSrc para o fundo de video');
 const ids=new Set<string>();
 for(const c of p.credits){
  if(!c.id||ids.has(c.id))throw Error('Cada identificacao precisa de id unico');ids.add(c.id);
  if(!c.name.trim()||![c.x,c.width,c.from,c.to].every(Number.isFinite)||c.x<0||c.width<200||c.x+c.width>1920||c.from<0||c.to-c.from<2||c.to>p.durationInFrames/30)throw Error('Identificacao fora do quadro ou intervalo invalido: '+c.id);
 }
}

const Rocket:React.FC<{p:LowerThirdProps;id:string}>=({p,id})=>{
 if(p.rocketSrc)return <Img src={staticFile(p.rocketSrc)} style={{width:47,height:164,objectFit:'contain'}}/>;
 if(p.logoSrc&&p.rocketMask)return <svg width="47" height="164" viewBox={p.rocketMask.viewBox}><defs><clipPath id={id}><path d={p.rocketMask.path}/></clipPath></defs><image href={staticFile(p.logoSrc)} width="1280" height="1280" clipPath={`url(#${id})`}/></svg>;
 return <svg width="47" height="164" viewBox="0 0 47 164"><path d="M23.5 2 Q6 36 10 100 L2 130 L14 120 L23.5 160 L33 120 L45 130 L37 100 Q41 36 23.5 2" fill={p.colors.accent}/><circle cx="23.5" cy="69" r="7" fill="#080d30"/></svg>;
};
const Card:React.FC<{p:LowerThirdProps;c:Credit}>=({p,c})=>{
 const {fps}=useVideoConfig();const f=useCurrentFrame()-c.from*fps;const end=(c.to-c.from)*fps;
 if(f<0||f>=end)return null;
 const tail=30,exiting=f>end-tail;
 const reveal=exiting?tween(f,end-28,end-8,1,0):tween(f,4,25);
 const ink=exiting?tween(f,end-28,end-12,1,0):tween(f,15,29);
 const logo=exiting?tween(f,end-30,end-22,1,0):tween(f,27,37);
 const rocketX=exiting?tween(f,end-30,end-5,c.x+70,c.x-120):tween(f,0,25,c.x-120,c.x+70);
 const rocketOpacity=exiting?tween(f,end-30,end-24)*tween(f,end-8,end,1,0):1-tween(f,25,35);
 const top=c.primary?681:709,height=c.primary?165:135;
 return <>
  <div style={{position:'absolute',left:c.x,top,width:c.width,height,clipPath:`inset(0 ${(1-reveal)*100}% 0 0)`,borderRadius:12,background:p.colors.background,borderLeft:`5px solid ${p.colors.accent}`,color:p.colors.text,boxShadow:'0 8px 28px #0005'}}>
   <div style={{position:'absolute',left:20,top:c.primary?25:18,width:100,height:100,opacity:logo,borderRadius:50,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
    {p.logoSrc?<Img src={staticFile(p.logoSrc)} style={{width:91,height:91,objectFit:'contain'}}/>:<span style={{color:'#080d30',fontSize:34,fontWeight:700}}>DS</span>}
   </div>
   <div style={{position:'absolute',left:142,right:20,top:c.primary?17:20,opacity:ink,translate:`${(1-ink)*16}px 0`}}>
    <div style={{fontSize:c.primary?49:40,lineHeight:1.14,letterSpacing:-.5,fontWeight:700,whiteSpace:'nowrap'}}>{c.name}</div>
    <div style={{fontSize:c.primary?29:25,lineHeight:1.3,marginTop:c.primary?8:9,color:p.colors.role,fontWeight:700,whiteSpace:'nowrap'}}>{c.role}</div>
    {c.detail?<div style={{fontSize:26,marginTop:5,lineHeight:1.1}}>{c.detail}</div>:null}
   </div>
   <div style={{position:'absolute',height:3,bottom:0,left:0,right:0,background:p.colors.accent,opacity:.5}}/>
  </div>
  <div style={{position:'absolute',left:rocketX-23,top:top+height/2-82,opacity:rocketOpacity,rotate:exiting?'-90deg':'90deg',filter:'drop-shadow(0 0 1px #fff)',transformOrigin:'center'}}><Rocket p={p} id={'rocket-'+c.id}/></div>
 </>;
};

export const LowerThirdBasic:React.FC<LowerThirdProps>=(p)=>{
 validateLowerThird(p);
 return <AbsoluteFill style={{fontFamily:p.fontSrc?'LowerThirdFont':'Arial, sans-serif',overflow:'hidden'}}>
  {p.fontSrc?<style>{`@font-face{font-family:LowerThirdFont;src:url('${staticFile(p.fontSrc)}')}*{box-sizing:border-box}`}</style>:<style>{'*{box-sizing:border-box}'}</style>}
  {p.backgroundMode==='video'?<OffthreadVideo src={staticFile(p.videoSrc)} startFrom={p.sourceStartFrame} muted style={{width:'100%',height:'100%',objectFit:'contain'}}/>:null}
  {p.backgroundMode==='synthetic'?<AbsoluteFill style={{background:'linear-gradient(120deg,#263c53,#141c2b 60%,#24473e)',justifyContent:'center',alignItems:'center',color:'#ffffff99',fontSize:32}}>PREVIA SINTETICA · LOWER THIRD BASICO</AbsoluteFill>:null}
  {p.credits.map(c=><Card key={c.id} p={p} c={c}/>)}
 </AbsoluteFill>;
};
