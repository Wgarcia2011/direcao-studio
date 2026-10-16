import React from 'react';
import {AbsoluteFill,interpolate} from 'remotion';
import {clamp,ease,Serif,Star} from './common';
export const Smart:React.FC<{t:number}>=({t})=><AbsoluteFill>
 <svg width="720" height="1280" style={{position:'absolute',inset:0}}><path d="M70 170 Q100 756 780 920 M-80 1010 Q560 794 846 325" fill="none" stroke="#bdbdbd" strokeWidth="26" opacity=".42"/></svg>
 <Star x={30} y={100} size={184} rot={-18+(t-13.6)*23}/>
 <Star x={595} y={895} size={236} rot={30+(t-13.6)*27} blur={8}/>
 <Serif text="Smart decisions" at={13.7} t={t} x={177} y={598} size={66}/>
 <Serif text="aren’t Luck" at={14.56} t={t} x={177} y={662} size={66}/>
 </AbsoluteFill>;
export const Target:React.FC<{t:number;labels?:[string,string,string]}>=({t,labels=['they’re','Trained','SKILLS']})=>{
 const size=interpolate(t,[15.75,16.12,16.5,16.62],[.01,.18,.96,1],ease);
 const arrow=interpolate(t,[16.86,17.02],[360,0],clamp);
 const impact=interpolate(t,[17.02,17.06,17.12,17.2,17.3],[0,2.1,-1.3,.5,0],clamp);
 const vibration=interpolate(t,[17.02,17.06,17.1,17.15,17.22],[0,.8,-.5,.2,0],clamp);
 return <AbsoluteFill>
 <Serif text={labels[0]} at={15.72} t={t} x={239} y={332} size={80}/>
 <Serif text={labels[1]} at={16.03} t={t} x={239} y={404} size={78}/>
 <div style={{position:'absolute',left:239,top:486,fontFamily:'PinSans',fontSize:68,letterSpacing:-2,color:'#2c6074',opacity:interpolate(t,[16.38,16.6],[0,1],clamp)}}>{labels[2]}</div>
 <svg width="720" height="1280" style={{position:'absolute',inset:0}}>
 <g transform={`translate(375 772) rotate(${-18+impact})`} style={{scale:String(size),transformOrigin:'0px 0px',filter:'drop-shadow(-12px 18px 8px #0005)'}}>
 {[['#fff',114,180],['#a2222b',88,147],['#fff',66,112],['#a2222b',42,75]].map((v,i)=><ellipse key={i} cx="0" cy="0" rx={v[1]} ry={v[2]} fill={v[0] as string}/>)}
 </g>
 <g style={{translate:`${arrow}px 0px`,opacity:t<16.86?0:1,rotate:`${vibration}deg`,transformOrigin:'375px 772px',filter:'drop-shadow(0px 7px 4px #0003)'}}>
 <path d="M377 772 L625 760" stroke="#c7a784" strokeWidth="3"/><path d="M375 772 L389 767 L389 776Z" fill="#2e2421"/>
 <path d="M575 759 L591 754 L618 754 L602 761 L618 765 L594 766 L575 763Z" fill="#3d322c"/><path d="M578 764 L600 757 M590 766 L613 758" stroke="#a59887"/>
 </g>
 </svg>
 </AbsoluteFill>;
};
