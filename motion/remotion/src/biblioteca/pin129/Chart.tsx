import React from 'react';
import {AbsoluteFill,interpolate} from 'remotion';
import {clamp,ease,Serif} from './common';
export const Chart:React.FC<{t:number}>=({t})=><AbsoluteFill style={{translate:`0px ${interpolate(t,[13.4,13.66],[0,-1200],ease)}px`}}>
 <Serif text="Your" at={9.67} t={t} x={80} y={187} size={78}/>
 <Serif text="decisions become" at={9.85} t={t} x={80} y={254} size={74}/>
 <svg width="720" height="1280" style={{position:'absolute',inset:0}}>
 <defs>{[['#63c6c7','#357f96'],['#8172cc','#463699'],['#e47b9f','#a63774'],['#efb241','#e64a31']].map((c,i)=><linearGradient key={i} id={`pin-bar-${i}`} x2="0" y2="1"><stop stopColor={c[0]}/><stop offset="1" stopColor={c[1]}/></linearGradient>)}</defs>
 {[130,240,173,302].map((height,i)=><rect key={i} x={[180,277,374,468][i]} y={760-height*interpolate(t,[9.75+i*.09,10.5+i*.09],[0,1],ease)} width="69" height={height*interpolate(t,[9.75+i*.09,10.5+i*.09],[0,1],ease)} fill={`url(#pin-bar-${i})`}/>)}
 <path d="M211 620 L270 466 L316 508 L371 481 L401 578 L464 438" stroke="#272727" strokeWidth="2" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1-interpolate(t,[9.96,11.55],[0,1],clamp)}/>
 <path d="M455 436 L468 428 L470 443Z" fill="#8b8a64" opacity={interpolate(t,[11.45,11.6],[0,1],clamp)}/>
 </svg>
 {['Faster','Sharper','Effective'].map((text,i)=><div key={text} style={{position:'absolute',left:228,top:805+i*109,width:250,height:70,border:'2px dashed #333',textAlign:'center',fontFamily:'PinSerif',fontSize:64,lineHeight:1,opacity:interpolate(t,[[10.62,11.43,12.31][i],[10.82,11.65,12.56][i]],[0,1],clamp),scale:String(interpolate(t,[[10.62,11.43,12.31][i],[10.88,11.7,12.61][i]],[.85,1],ease))}}>{text}{[0,1,2,3].map(j=><div key={j} style={{position:'absolute',left:j%2?243:-8,top:j<2?-8:62,width:14,height:14,borderRadius:'50%',background:'#303030'}}/>)}</div>)}
 </AbsoluteFill>;
