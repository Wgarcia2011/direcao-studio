import React from 'react';
import {AbsoluteFill,interpolate} from 'remotion';
import {clamp,ease,Serif,Star} from './common';
export const Intro:React.FC<{t:number}>=({t})=>{
 const height=interpolate(t,[0,.45],[5,325],ease);
 const exit=interpolate(t,[1.18,1.64],[0,1],ease);
 return <AbsoluteFill>
 <div style={{position:'absolute',left:87,top:664-height-exit*640,width:524,height,borderRadius:interpolate(t,[.28,.55],[0,68],ease),background:'#2d0ca5',scale:String(1+exit*.45),overflow:'hidden'}}>
 {['Did You','Know?'].map((line,i)=><div key={line} style={{position:'absolute',left:59,top:44+i*108,fontFamily:'PinSans',fontSize:128,lineHeight:1,letterSpacing:-9,color:'white',opacity:interpolate(t,[.12+i*.14,.3+i*.14],[0,1],clamp),translate:`0px ${interpolate(t,[.1+i*.13,.35+i*.13],[25,0],ease)}px`}}>{line}</div>)}
 </div>
 <div style={{position:'absolute',left:466,top:interpolate(t,[0,.5],[200,260],ease)-exit*710,width:112,height:112,borderRadius:'50%',background:'radial-gradient(circle at 35% 25%,#d4ff83,#a6cd4c 40%,#506322 75%,#283520 100%)',scale:String(interpolate(t,[0,.45],[.1,1],ease))}}/>
 </AbsoluteFill>;
};
export const Research:React.FC<{t:number}>=({t})=><AbsoluteFill>
 <svg width="720" height="1280" style={{position:'absolute',inset:0}}><path d="M-180 1030 Q575 785 563 309" fill="none" stroke="#e6e6e6" strokeWidth="62"/><path d="M-240 1180 Q500 1010 820 771" fill="none" stroke="#ececec" strokeWidth="25"/></svg>
 <Star x={-35} y={-80} size={180} rot={-18+(t-1.64)*10} green/>
 <Star x={560} y={1120} size={230} rot={13+(t-1.64)*10} green/>
 <div style={{position:'absolute',left:76,top:600,fontFamily:'PinSans',fontSize:104,letterSpacing:-5,color:'#2d0ca5',opacity:interpolate(t,[1.59,1.77],[0,1],clamp),filter:`blur(${interpolate(t,[1.59,1.83],[15,0],ease)}px)`}}>research</div>
 <Serif text="shows" at={1.72} t={t} x={83} y={710} size={102}/>
 <Serif text="that" at={2.13} t={t} x={444} y={831} size={100}/>
 </AbsoluteFill>;
