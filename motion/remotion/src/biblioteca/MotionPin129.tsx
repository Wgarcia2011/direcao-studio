import React from 'react';
import {AbsoluteFill,OffthreadVideo,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Intro,Research} from './pin129/Intro';
import {Brain} from './pin129/Brain';
import {Puzzle} from './pin129/Puzzle';
import {Chart} from './pin129/Chart';
import {Smart,Target} from './pin129/Closing';
export type Pin129Props={count:number;brainTexture:string;reference:string;mode:'reconstruction'|'reference';cuts:number[]};
export const pin129Defaults:Pin129Props={count:35000,brainTexture:'motion-assets/pinterest-12947917676306751/cerebro-textura.png',reference:'motion-assets/pinterest-12947917676306751/referencia.mp4',mode:'reconstruction',cuts:[1.635,2.5025,6.54,9.542867,13.6,15.72]};
export const MotionPin129:React.FC<Pin129Props>=props=>{
 const t=useCurrentFrame()/useVideoConfig().fps;
 const c=props.cuts;
 if(props.mode==='reference')return <AbsoluteFill><OffthreadVideo src={staticFile(props.reference)} style={{width:'100%',height:'100%'}}/></AbsoluteFill>;
 return <AbsoluteFill style={{background:t<c[1]?'#fff':'#dcdcdc',overflow:'hidden',color:'#171717'}}>
 <style>{`@font-face{font-family:PinSans;src:url('${staticFile('motion-assets/pinterest-12947917676306751/arialbd.ttf')}')}@font-face{font-family:PinSerif;src:url('${staticFile('motion-assets/pinterest-12947917676306751/timesbi.ttf')}')}@font-face{font-family:PinImpact;src:url('${staticFile('motion-assets/pinterest-12947917676306751/impact.ttf')}')}@font-face{font-family:PinCounter;src:url('${staticFile('fonts/manrope-700.ttf')}')}`}</style>
 <AbsoluteFill style={{backgroundImage:'linear-gradient(#9c9c9c40 1px,transparent 1px),linear-gradient(90deg,#9c9c9c40 1px,transparent 1px)',backgroundSize:t<c[1]?'84px 84px':'42px 42px',backgroundPosition:t<c[1]?'24px 52px':'12px 12px',maskImage:t<c[1]?'radial-gradient(ellipse,#000 22%,transparent 67%)':undefined}}/>
 <AbsoluteFill style={{boxShadow:'inset 5px 0 9px #aaa4'}}/>
 {t<c[0]?<Intro t={t}/>:t<c[1]?<Research t={t}/>:t<c[2]?<Brain t={t} count={props.count} texture={props.brainTexture}/>:t<c[3]?<Puzzle t={t}/>:t<c[4]?<Chart t={t}/>:t<c[5]?<Smart t={t}/>:<Target t={t}/>}
 </AbsoluteFill>;
};
