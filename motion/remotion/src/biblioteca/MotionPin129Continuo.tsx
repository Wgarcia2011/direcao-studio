import React from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {marca} from './marca';
import {ContinuousScene,ContinuousSceneView} from './pin129/ContinuousScene';
import {clamp,ease} from './pin129/common';
export type ContinuousProps={video:string;audio:string;duration:number;motionFrom:number;outro?:{returnFrom:number;logoFrom:number;logo:string;brandName?:string};shots:{from:number;to:number;x:number}[];scenes:ContinuousScene[]};
export const MotionPin129Continuo:React.FC<ContinuousProps>=props=>{
 const {fps,width,height}=useVideoConfig(), t=useCurrentFrame()/fps;
 const shot=props.shots.find(s=>t>=s.from&&t<s.to);
 const index=props.scenes.reduce((last,s,i)=>s.from<=t?i:last,0);
 const scene=props.scenes[index];
 let cameraX=scene.x,cameraY=scene.y;
 const next=props.scenes[index+1];
 if(next&&t>=next.from-.65){
  cameraX=interpolate(t,[next.from-.65,next.from+.12],[scene.x,next.x],ease);
  cameraY=interpolate(t,[next.from-.65,next.from+.12],[scene.y,next.y],ease);
 }else if(index>0&&t<scene.from+.12){
  const prev=props.scenes[index-1];
  cameraX=interpolate(t,[scene.from-.65,scene.from+.12],[prev.x,scene.x],ease);
  cameraY=interpolate(t,[scene.from-.65,scene.from+.12],[prev.y,scene.y],ease);
 }
 const zoom=interpolate(t,[scene.from+.3,Math.max(scene.from+.5,scene.to-.7)],[1,1.035],clamp);
 const reveal=interpolate(t,[props.motionFrom-.35,props.motionFrom+.15],[0,1],ease);
 const outro=props.outro;
 const returnFade=outro?interpolate(t,[outro.returnFrom,outro.returnFrom+.25],[1,0],ease):1;
 return <AbsoluteFill style={{background:'#171717',overflow:'hidden'}}>
  <style>{`@font-face{font-family:PinSans;src:url('${staticFile('motion-assets/pinterest-12947917676306751/arialbd.ttf')}')}@font-face{font-family:PinSerif;src:url('${staticFile('motion-assets/pinterest-12947917676306751/timesbi.ttf')}')}@font-face{font-family:PinImpact;src:url('${staticFile('motion-assets/pinterest-12947917676306751/impact.ttf')}')}`}</style>
  <Audio src={staticFile(props.audio)} endAt={Math.round((props.outro?.logoFrom??props.duration)*fps)}/>
  {(t<props.motionFrom+.2||(outro&&t>=outro.returnFrom&&t<outro.logoFrom))&&<OffthreadVideo src={staticFile(props.video)} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(shot?.x??.4)*100}% 50%`}}/>}
  {t>=props.motionFrom-.35&&(!outro||t<outro.returnFrom+.25)&&<div style={{position:'absolute',inset:0,opacity:reveal*returnFade}}>
   <div style={{position:'absolute',width:720,height:1280,scale:`${width/720} ${height/1280}`,transformOrigin:'0 0',background:'#dcdcdc',overflow:'hidden'}}>
    <div style={{position:'absolute',left:0,top:0,width:8000,height:7000,translate:`${360-(cameraX+360)*zoom}px ${640-(cameraY+640)*zoom}px`,scale:zoom,transformOrigin:'0 0',backgroundImage:'linear-gradient(#9c9c9c40 1px,transparent 1px),linear-gradient(90deg,#9c9c9c40 1px,transparent 1px)',backgroundSize:'42px 42px'}}>
     <svg width="8000" height="7000" style={{position:'absolute',inset:0,opacity:.16}}><path d="M170 880 C1600 1800 1800 140 3300 1000 S4400 3300 6300 4800" fill="none" stroke="#a6a6a6" strokeWidth="50"/></svg>
     {props.scenes.map((s,i)=>Math.abs(i-index)<=1?<ContinuousSceneView key={i} scene={s} t={t}/>:null)}
    </div>
   </div>
  </div>}
  {outro&&t>=outro.logoFrom&&<AbsoluteFill style={{background:'#dcdcdc',alignItems:'center',justifyContent:'center'}}>
   <AbsoluteFill style={{backgroundImage:'linear-gradient(#9c9c9c30 1px,transparent 1px),linear-gradient(90deg,#9c9c9c30 1px,transparent 1px)',backgroundSize:`${42*width/720}px ${42*width/720}px`}}/>
   <Img src={marca(outro.logo)} style={{width:width*.54,height:width*.54,objectFit:'contain',opacity:interpolate(t,[outro.logoFrom,outro.logoFrom+.3],[0,1],clamp),scale:interpolate(t,[outro.logoFrom,outro.logoFrom+.65],[.85,1],ease)}}/>
   <div style={{position:'absolute',top:height*.68,width:'100%',textAlign:'center',fontFamily:'PinSans',fontSize:width*.062,letterSpacing:width*.009,color:'#000068',opacity:interpolate(t,[outro.logoFrom+.35,outro.logoFrom+.7],[0,1],clamp)}}>{outro.brandName??''}</div>
  </AbsoluteFill>}
 </AbsoluteFill>;
};
