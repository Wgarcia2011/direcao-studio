import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Sequence,cancelRender,continueRender,delayRender,staticFile} from 'remotion';
import {Brand,Duo,Outro,Section,Separator,Speaker} from './telejornal/Modules';
import type {TeleProps} from './telejornal/types';
export type {TeleProps} from './telejornal/types';
export {telejornalDefaults,telejornalMetadata} from './telejornal/metadata';
export const MotionDioramaTelejornalDark:React.FC<TeleProps>=(p)=>{
 const [handle]=useState(()=>delayRender('Fontes locais Telejornal DARK'));
 useEffect(()=>{
  const names={headline:'TeleHeadline',label:'TeleLabel',body:'TeleBody'};
  Promise.all((Object.keys(names) as (keyof typeof names)[]).map(k=>new FontFace(names[k],`url(${staticFile(p.design.fonts[k].src)})`,{weight:String(p.design.fonts[k].weight)}).load())).then(fonts=>{fonts.forEach(font=>document.fonts.add(font));continueRender(handle);}).catch(cancelRender);
 },[p.design.fonts,handle]);
 const scene=(s:TeleProps['timeline'][number])=> <><Section p={p} scene={s}/>{s.type==='speaker'?<Speaker p={p} scene={s}/>:s.type==='duo'||s.type==='context'?<Duo p={p} scene={s} context={s.type==='context'}/>:s.type==='headline'?<Separator p={p} scene={s}/>:<Outro p={p}/>}<Brand p={p}/></>;
 return <AbsoluteFill style={{background:p.design.palette.background,color:p.design.palette.text,overflow:'hidden'}}>
  <div style={{position:'absolute',left:64,right:160,top:1530,height:2,background:p.design.palette.line}}/>
  {p.cover?scene(p.timeline[0]):<>
   <Audio src={staticFile(p.audio.mix)}/>
   {p.timeline.map(s=><Sequence key={s.id} from={Math.round(s.from*p.canvas.fps)} durationInFrames={Math.round((s.to-s.from)*p.canvas.fps)} name={s.id}>{scene(s)}</Sequence>)}
   <Sequence from={Math.round(p.bodyDuration*p.canvas.fps)} durationInFrames={Math.round(p.outro.duration*p.canvas.fps)} name="Encerramento"><Outro p={p}/></Sequence>
  </>}
 </AbsoluteFill>;
};
