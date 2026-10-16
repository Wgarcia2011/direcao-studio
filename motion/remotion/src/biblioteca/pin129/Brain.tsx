import React from 'react';
import {AbsoluteFill,interpolate,staticFile} from 'remotion';
import {clamp,ease,Serif} from './common';
export const Brain:React.FC<{t:number;count:number;texture:string}>=({t,count,texture})=>{
 const rise=interpolate(t,[3.65,4.18],[150,0],ease);
 const scale=interpolate(t,[2.5,2.9],[.05,1],ease);
 const number=Math.round(interpolate(t,[3.48,3.625,3.875,4.125,4.375,4.625],[0,2337,22671,31215,34561,count],clamp));
 const slide=interpolate(t,[6.37,6.6],[0,-820],ease);
 return <AbsoluteFill style={{translate:`${slide}px 0px`}}>
 <div style={{opacity:interpolate(t,[3.92,4.16],[1,0],clamp)}}>
 <div style={{position:'absolute',left:211,top:217,fontFamily:'PinSans',fontSize:66,letterSpacing:-5,opacity:interpolate(t,[2.55,2.73],[0,1],clamp)}}>Your Brain</div>
 <Serif text="Makes over" at={2.95} t={t} x={211} y={285} size={70}/>
 </div>
 <svg width="720" height="1280" style={{position:'absolute',inset:0,translate:`0px ${rise}px`,scale:String(scale),transformOrigin:'360px 470px'}}>
 <defs><clipPath id="pin-brain-clip"><path d="M221 507 Q217 467 232 433 Q245 395 283 382 Q302 357 349 355 Q389 349 428 365 Q472 365 491 398 Q508 414 513 441 Q521 474 488 488 L459 491 Q462 510 440 522 Q419 539 374 536 L374 566 Q374 595 359 599 Q347 595 345 569 L341 555 Q317 584 291 582 Q257 578 251 555 L245 532Z"/></clipPath></defs>
 <g style={{filter:'drop-shadow(7px 8px 7px #0003)'}}><image href={staticFile(texture)} width="720" height="1280" clipPath="url(#pin-brain-clip)"/></g>
 <circle cx="360" cy="470" r="185" fill="none" stroke="#444" strokeWidth="3" strokeDasharray="7 7" opacity={interpolate(t,[2.55,2.9],[0,1],clamp)} style={{rotate:`${(t-2.5)*15}deg`,transformOrigin:'360px 470px'}}/>
 </svg>
 <div style={{position:'absolute',left:195,top:719,width:420,fontFamily:'PinCounter',fontSize:112,letterSpacing:-3.5,color:'#eea229',textShadow:'0 0 45px #ffc879',WebkitTextStroke:'1px #ffe3a1',opacity:interpolate(t,[3.48,3.65],[0,1],clamp)}}>{number.toLocaleString('en-US')}</div>
 <Serif text="decisions" at={4.55} t={t} x={154} y={896} size={88}/>
 <Serif text="every single day" at={5.06} t={t} x={174} y={977} size={71}/>
 </AbsoluteFill>;
};
