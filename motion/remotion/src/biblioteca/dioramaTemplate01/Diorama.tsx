import React from 'react';
import {AbsoluteFill,Audio,Img,staticFile,useCurrentFrame} from 'remotion';
import {motionProgress} from '../motionLibrary/frame';

const navy='#071B36',white='#FFFFFF',yellow='#FFC400';
export type DioramaCue={start:number;end:number;headline:string;context:string[];attribution:string;icon:'debate'|'mic'|'dialog'};
export type DioramaProps={video:string;frames:string;staticFrame:number;sourceCrop:{top:number;bottom:number};cues:DioramaCue[]};
export const dioramaDefaults:DioramaProps={video:'projects/diorama-exemplo/source.mp4',frames:'projects/diorama-exemplo/frames',staticFrame:0,sourceCrop:{top:270,bottom:1810},cues:[
 {start:30,end:150,headline:'TEMA EM DESTAQUE',context:['TEMA','EM DESTAQUE'],attribution:'TEMA CITADO NA FALA',icon:'debate'},
 {start:160,end:300,headline:'POSIÇÃO DECLARADA',context:['POSIÇÃO','DECLARADA'],attribution:'POSIÇÃO DO PARTICIPANTE',icon:'mic'},
]};
const asset='projects/diorama-exemplo';
function TopicIcon({kind,p}:{kind:DioramaCue['icon'];p:number}){return <svg width="144" height="124" viewBox="0 0 200 180" fill="none" stroke={yellow} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{opacity:p,translate:`${(1-p)*-12}px 0`}}>{kind==='mic'?<><rect x="77" y="20" width="46" height="82" rx="23"/><path d="M58 76 V82 A42 42 0 0 0 142 82 V76 M100 124 V158 M75 158 H125"/></>:kind==='dialog'?<><path d="M20 25 H142 V105 H70 L35 135 V105 H20 Z"/><path d="M66 125 H132 L165 153 V125 H180 V58 H160 M47 53 H115 M47 77 H96"/></>:<><path d="M20 150 H180 M35 148 L28 78 H80 L73 148 M127 148 L120 78 H172 L165 148 M53 78 V54 L68 40 M146 78 V54 L131 40"/><circle cx="73" cy="35" r="7"/><circle cx="126" cy="35" r="7"/></>}</svg>}
function TornPaper(){
 const edge=(bottom:boolean,inset:number)=>Array.from({length:121},(_,i)=>{const x=i*9;const jitter=Math.sin(i*17.31+(bottom?9:0))*3+Math.sin(i*4.7)*2;const y=(bottom?276:22)+Math.sin(i*.055)*10+Math.sin(i*.23)*3+jitter+(bottom?-inset:inset);return String(x)+','+String(y);});
 const polygon=(inset:number)=>[...edge(false,inset),...edge(true,inset).reverse()].join(' ');
 return <svg viewBox="0 0 1080 310" width="1080" height="220" preserveAspectRatio="none" style={{position:'absolute',inset:0}}><polygon fill={white} points={polygon(0)}/><polygon fill={yellow} points={polygon(13)}/></svg>;
}
export const DioramaTemplate01:React.FC<DioramaProps>=({video,frames,staticFrame,sourceCrop,cues})=>{
 const f=useCurrentFrame();const cue=cues.find(c=>f>=c.start&&f<c.end);
 const start=cue?.start??0;const p=cue?motionProgress(f,start,17)*(1-motionProgress(f,cue.end-10,10)):1;
 const fit=motionProgress(f,88,28)*(1-motionProgress(f,426,24))+motionProgress(f,480,27)*(1-motionProgress(f,891,24));
 const height=1080-fit*40;const scale=height/(sourceCrop.bottom-sourceCrop.top);const width=1080*scale;
 const context=cue?.context??['TEMA','EM DESTAQUE'];
 return <AbsoluteFill style={{background:navy,color:white,fontFamily:'Anton',overflow:'hidden'}}>
 <style>{`@font-face{font-family:Anton;src:url('${staticFile(`${asset}/Anton-Regular.ttf`)}');font-weight:400}`}</style>
 <Audio src={staticFile(video)}/>
 <div style={{position:'absolute',inset:0,scale:'.8',transformOrigin:'540px 0',translate:'0 20px'}}>
 <div style={{position:'absolute',left:80,top:88,display:'flex',alignItems:'center',gap:22}}><Img src={staticFile(`${asset}/marca-dagua.png`)} style={{width:76,height:76,objectFit:'contain'}}/><div style={{fontSize:54,letterSpacing:1}}>DIORAMA POLÍTICA</div></div>
 <div style={{position:'absolute',left:80,right:80,top:186,height:3,background:white}}/>
 <div style={{position:'absolute',left:580,top:216,width:420,height:434,overflow:'hidden'}}><Img src={staticFile(`${frames}/frame_${String(staticFrame).padStart(5,'0')}.jpg`)} style={{width:340,height:340*16/9,position:'absolute',top:-157,left:40}}/></div>
 <div style={{position:'absolute',left:80,top:226,width:475,opacity:p,translate:`0 ${(1-p)*18}px`}}><div style={{fontSize:80,lineHeight:1.14,letterSpacing:.3}}>{context.map(t=><div key={t}>{t}</div>)}</div><div style={{fontSize:39,lineHeight:1.25,marginTop:23,color:yellow,maxWidth:440}}>{cue?.attribution??'DECLARAÇÃO NO VÍDEO'}</div><div style={{marginTop:12}}><TopicIcon kind={cue?.icon??'dialog'} p={p}/></div></div>
 </div>
 <div style={{position:'absolute',left:0,top:550,width:1080,height:220}}><TornPaper/><div style={{position:'absolute',left:70,right:70,top:35,height:150,display:'flex',alignItems:'center',justifyContent:'center',fontSize:(cue?.headline??'').length>16?84:104,lineHeight:1.05,textAlign:'center',WebkitTextStroke:`${(cue?.headline??'').length>16?8:10}px ${navy}`,paintOrder:'stroke fill',opacity:p,translate:`${(1-p)*20}px 0`}}>{cue?.headline??'TEMA EM DESTAQUE'}</div></div>
 <div style={{position:'absolute',left:(1080-width)/2,top:790,width,height,overflow:'hidden',border:`3px solid ${white}`,boxSizing:'content-box'}}><Img src={staticFile(`${frames}/frame_${String(f).padStart(5,'0')}.jpg`)} style={{position:'absolute',width,height:1920*scale,top:-sourceCrop.top*scale,left:0}}/></div>
 <div style={{position:'absolute',left:80,top:810,width:4,height:128,background:yellow,scale:`1 ${.65+.35*fit}`,transformOrigin:'top'}}/>
 <div style={{position:'absolute',right:80,top:810,width:4,height:128,background:yellow,scale:`1 ${.65+.35*fit}`,transformOrigin:'top'}}/>
 </AbsoluteFill>;
};
