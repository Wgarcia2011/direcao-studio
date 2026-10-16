import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, ease, Serif, Star} from './pin129/common';
import {Target} from './pin129/Closing';

export type PinSpeechInsert = {from:number;to:number;title:string;emphasis:string;footer:string;asset?:string;negative?:boolean;kind?:'asset'|'target';steps?:{at:number;text:string}[]};
export type PinSpeechProps = {video:string;audio:string;duration:number;previewFrom:number;previewDuration:number;shots:{from:number;to:number;x:number}[];inserts:PinSpeechInsert[]};

const Card:React.FC<{item:PinSpeechInsert}>=({item})=>{
 const frame=useCurrentFrame(), {fps}=useVideoConfig(), t=frame/fps;
 const length=item.to-item.from;
 const emphasisSize=Math.min(116,580/(item.emphasis.length*.57));
 return <AbsoluteFill style={{background:'#dcdcdc',color:'#171717',overflow:'hidden',opacity:interpolate(t,[0,.12,length-.15,length],[0,1,1,0],clamp)}}>
  <AbsoluteFill style={{backgroundImage:'linear-gradient(#9c9c9c40 1px,transparent 1px),linear-gradient(90deg,#9c9c9c40 1px,transparent 1px)',backgroundSize:'42px 42px',backgroundPosition:'12px 12px',boxShadow:'inset 5px 0 9px #aaa4'}}/>
  {item.kind==='target'?<Target t={15.72+t*(2.165/length)} labels={['Questões','e revisão','RETA FINAL']}/>:<>
   <Star x={-40} y={100} size={190} rot={-18+t*20}/>
   <Star x={590} y={890} size={200} rot={35+t*20} green blur={4}/>
   <Serif text={item.title} at={.12} t={t} x={76} y={290} size={78} width={570}/>
   <div style={{position:'absolute',left:70,top:390,width:580,fontFamily:'PinImpact',fontSize:emphasisSize,lineHeight:1,letterSpacing:-2,color:'#79568a',scale:`${interpolate(t,[.35,.7],[.83,1],ease)} 1`,transformOrigin:'0 0'}}>{item.emphasis.split('').map((c,i)=><span key={i} style={{opacity:interpolate(t,[.35+i*.018,.45+i*.018],[0,1],clamp),filter:`blur(${interpolate(t,[.35+i*.018,.54+i*.018],[9,0],clamp)}px)`}}>{c}</span>)}</div>
   <svg width="720" height="1280" style={{position:'absolute',inset:0}}><ellipse cx="360" cy="760" rx="225" ry="205" fill="none" stroke="#8e8e8e" strokeWidth="2" strokeDasharray="3 9"/></svg>
   {item.asset&&<Img src={staticFile(item.asset)} style={{position:'absolute',left:item.steps?135:105,top:item.steps?510:540,width:item.steps?450:510,height:item.steps?410:490,objectFit:'contain',filter:item.negative?'grayscale(1) drop-shadow(0 12px 12px #0002)':'drop-shadow(0 12px 12px #0002)',scale:interpolate(t,[.4,.95],[.03,1],ease),translate:`0 ${interpolate(t,[.4,.95],[100,0],ease)}px`,rotate:`${interpolate(t,[.4,.95],[-12,0],ease)}deg`}}/>}
   {item.steps?.map((step,i)=><div key={step.text} style={{position:'absolute',left:190,top:925+i*82,width:340,border:'2px dashed #454545',padding:'8px 16px',textAlign:'center',fontFamily:'PinSerif',fontSize:54,background:'#dcdce0e8',opacity:interpolate(t,[step.at,step.at+.2],[0,1],clamp)}}>{step.text}</div>)}
   {!item.steps&&<Serif text={item.footer} at={.95} t={t} x={85} y={1060} size={62} width={550}/>}
  </>}
 </AbsoluteFill>;
};

const Timeline:React.FC<PinSpeechProps>=props=>{
 const frame=useCurrentFrame(), {fps,width,height}=useVideoConfig(), t=frame/fps;
 const shot=props.shots.find(s=>t>=s.from&&t<s.to);
 return <AbsoluteFill style={{background:'#171717',overflow:'hidden'}}>
  <style>{`@font-face{font-family:PinSans;src:url('${staticFile('motion-assets/pinterest-12947917676306751/arialbd.ttf')}')}@font-face{font-family:PinSerif;src:url('${staticFile('motion-assets/pinterest-12947917676306751/timesbi.ttf')}')}@font-face{font-family:PinImpact;src:url('${staticFile('motion-assets/pinterest-12947917676306751/impact.ttf')}')}`}</style>
  <Audio src={staticFile(props.audio)}/>
  <OffthreadVideo src={staticFile(props.video)} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(shot?.x??.4)*100}% 50%`}}/>
  {props.inserts.map((item,i)=><Sequence key={i} from={Math.round(item.from*fps)} durationInFrames={Math.round(item.to*fps)-Math.round(item.from*fps)} name={item.emphasis}>
   <div style={{position:'absolute',width:720,height:1280,scale:`${width/720} ${height/1280}`,transformOrigin:'0 0'}}><Card item={item}/></div>
  </Sequence>)}
 </AbsoluteFill>;
};
export const MotionPin129Fala:React.FC<PinSpeechProps>=props=>{
 const {fps}=useVideoConfig();
 return <Sequence from={-Math.round(props.previewFrom*fps)}><Timeline {...props}/></Sequence>;
};
