import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {clamp,ease,Star} from './common';
export type TimedWord={w:string;s:number;e:number};
export type ContinuousScene={from:number;to:number;x:number;y:number;asset:string;negative?:boolean;emphasis:string;emphasisAt:number;captionTop?:number;layout?:'left'|'right'|'bottom';groups:TimedWord[][]};

export const ContinuousSceneView:React.FC<{scene:ContinuousScene;t:number}>=({scene,t})=>{
 const enter=interpolate(t,[scene.from-.5,scene.from+.35],[0,1],ease);
 const groupIndex=scene.groups.reduce((last,g,i)=>g[0].s<=t?i:last,0);
 const group=scene.groups[groupIndex]||[];
 const isRight=scene.layout==='right';
 return <div style={{position:'absolute',left:scene.x,top:scene.y,width:720,height:1280,color:'#171717'}}>
  <Star x={isRight?560:-55} y={80} size={185} rot={-18+(t-scene.from)*12}/>
  <Star x={isRight?-70:615} y={1025} size={210} rot={25+(t-scene.from)*14} green blur={3}/>
  <svg width="720" height="1280" style={{position:'absolute',inset:0,opacity:.45}}><path d={isRight?'M810 1060 Q150 1060 70 690':'M-130 1070 Q590 1000 650 710'} fill="none" stroke="#b9b9b9" strokeWidth="27"/></svg>
  <div style={{position:'absolute',left:78,top:scene.captionTop??270,width:565,minHeight:210,fontFamily:'PinSerif',fontSize:66,lineHeight:1.04,letterSpacing:-1.6}}>
   {group.map((word,i)=><span key={`${groupIndex}-${i}`} style={{display:'inline-block',marginRight:14,opacity:interpolate(t,[word.s,word.s+.09],[0,1],clamp),filter:`blur(${interpolate(t,[word.s,word.s+.15],[9,0],clamp)}px)`,translate:`0 ${interpolate(t,[word.s,word.s+.18],[15,0],ease)}px`,color:t>=word.s&&t<word.e?'#7139a0':'#171717'}}>{word.w}</span>)}
  </div>
  <div style={{position:'absolute',left:78,top:460,width:565,fontFamily:'PinImpact',fontSize:Math.min(130,570/(scene.emphasis.length*.52)),lineHeight:1,color:scene.negative?'#252128':'#803ba5',letterSpacing:-2,opacity:interpolate(t,[scene.emphasisAt,scene.emphasisAt+.18],[0,1],clamp),filter:`blur(${interpolate(t,[scene.emphasisAt,scene.emphasisAt+.25],[12,0],ease)}px)`,scale:`${interpolate(t,[scene.emphasisAt,scene.emphasisAt+.28],[.85,1],ease)} 1`,transformOrigin:'0 0'}}>{scene.emphasis}</div>
  <svg width="720" height="1280" style={{position:'absolute',inset:0}}><ellipse cx={isRight?385:330} cy="835" rx="227" ry="230" stroke="#777" strokeWidth="2" strokeDasharray="3 9" fill="none" opacity={enter}/></svg>
  <Img src={staticFile(scene.asset)} style={{position:'absolute',left:isRight?155:55,top:610,width:510,height:490,objectFit:'contain',scale:interpolate(t,[scene.from-.25,scene.from+.65],[.15,1],ease),rotate:`${interpolate(t,[scene.from-.25,scene.from+.65],[isRight?18:-18,0],ease)}deg`,translate:`${interpolate(t,[scene.from-.3,scene.from+.65],[isRight?100:-100,0],ease)}px ${interpolate(t,[scene.from-.3,scene.from+.65],[70,0],ease)}px`,filter:scene.negative?'grayscale(1) drop-shadow(0px 18px 12px #0003)':'drop-shadow(0px 18px 12px #0003)',opacity:enter}}/>
 </div>;
};
