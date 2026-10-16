import React from 'react';
import {AbsoluteFill,interpolate} from 'remotion';
import {clamp,ease,Serif,Star} from './common';
export const Puzzle:React.FC<{t:number}>=({t})=>{
 const phase=interpolate(t,[6.8,7.4],[0,1],ease);
 return <AbsoluteFill>
 <Star x={553} y={20} size={227} rot={-18+(t-6.5)*18}/>
 <Serif text="When you learn" at={6.7} t={t} x={91} y={214} size={72}/>
 <Serif text="Structured" at={7.24} t={t} x={91} y={274} size={72}/>
 {['Problem','Solving'].map((word,i)=><div key={word} style={{position:'absolute',left:88,top:347+i*162,fontFamily:'PinImpact',fontSize:184,lineHeight:1,letterSpacing:-4,color:'#030303',scale:'.81 1',transformOrigin:'0 0'}}>{word.split('').map((c,j)=><span key={j} style={{opacity:interpolate(t,[7.76+i*.55+j*.035,7.92+i*.55+j*.035],[0,1],clamp),filter:`blur(${interpolate(t,[7.76+i*.55+j*.035,8.04+i*.55+j*.035],[19,0],clamp)}px)`}}>{c}</span>)}</div>)}
 <Serif text="Methods" at={8.86} t={t} x={90} y={702} size={71}/>
 {t<7.45?<><div style={{position:'absolute',left:323,top:889,width:180,height:180,background:'#9b0ac1',borderRadius:`${50*(1-phase)+9*phase}%`,scale:String(interpolate(t,[6.7,7.2],[.05,1],ease)),rotate:`${phase*45}deg`}}/>{t>7.15&&<div style={{position:'absolute',left:interpolate(t,[7.15,7.45],[323,453],clamp),top:interpolate(t,[7.15,7.45],[830,1085],clamp),width:65,height:65,borderRadius:'50%',background:'#9b0ac1'}}/>}</>:<svg viewBox="0 0 250 250" style={{position:'absolute',left:295,top:828,width:280,height:280,rotate:`${interpolate(t,[7.45,9.54],[0,0],clamp)}deg`}}><path d="M49 77 C20 66 13 46 26 30 C44 10 62 17 76 38 C84 54 94 51 105 38 L124 19 Q139 6 151 19 L175 42 C134 51 131 80 149 96 C165 111 185 103 192 76 L220 99 Q237 116 224 133 L205 153 C185 127 157 135 151 157 C145 179 161 193 181 195 L157 220 Q141 235 125 220 L49 145 Q34 129 49 112 L68 92 Q81 79 49 77Z" fill="#9c0ac2"/></svg>}
 </AbsoluteFill>;
};
