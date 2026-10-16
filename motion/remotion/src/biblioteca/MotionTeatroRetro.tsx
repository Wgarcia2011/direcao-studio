import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {marca} from './marca';
import type {MotionTemplateProps} from './MotionTemplate';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const paper='#e8dfc5', ink='#080f28', teal='#00b9ac';
const Cloud:React.FC<{x:number;y:number;scale:number;flip?:boolean}>=({x,y,scale,flip})=><svg width="600" height="230" viewBox="0 0 600 230" style={{position:'absolute',left:x,top:y,transform:`scale(${flip?-scale:scale},${scale})`,transformOrigin:'center',opacity:.83}}><defs><pattern id={`hatch${x}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><path d="M0 0V6" stroke={ink} strokeWidth="1" opacity=".28"/></pattern></defs><path d="M10 193 Q-10 153 51 139 Q40 76 104 81 Q125 10 191 51 Q231 7 278 64 Q341 35 359 111 Q404 77 439 135 Q493 116 510 165 Q577 145 590 193 Z" fill={paper} stroke="#807967" strokeWidth="3"/><path d="M10 193 Q-10 153 51 139 Q40 76 104 81 Q125 10 191 51 Q231 7 278 64 Q341 35 359 111 Q404 77 439 135 Q493 116 510 165 Q577 145 590 193 Z" fill={`url(#hatch${x})`}/><path d="M45 163 Q60 119 110 134 M110 113 Q137 73 180 102 M181 73 Q217 46 250 98 M270 97 Q316 69 339 130 M350 157 Q392 122 419 169 M135 167 Q180 121 234 165" fill="none" stroke="#746e5d" strokeWidth="2"/></svg>;
export const MotionTeatroRetro:React.FC<MotionTemplateProps>=(props)=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const scene=props.scenes.find(s=>t>=s.from&&t<s.to)??props.scenes[props.scenes.length-1];
 const moment=props.emphasisMoments?.find(m=>t>=m.from&&t<m.to);
 const title=scene?.titles?.filter(h=>t>=(h.smallAt??scene.from)).at(-1);
 const age=t-(moment?.from??scene?.from??0);
 const enter=spring({frame:age*fps,fps,config:{damping:22,stiffness:115}});
 const heading=moment?.headings.filter(h=>t>=h.at).at(-1);
 const text=moment?(heading?.text??''):(title&&t>=(title.bigAt??scene.from)?title.big:'');
 const eyebrow=moment?.eyebrow??title?.small??'';
 const hit=spring({frame:(t-(heading?.at??title?.bigAt??scene?.from??0))*fps,fps,config:{damping:19,stiffness:190}});
 const groups:typeof props.words[]=[];let group:typeof props.words=[];
 for(const w of props.words){const prev=group.at(-1);if(group.length>=3||group.map(x=>x.text).join(' ').length+w.text.length>24||(prev&&(prev.segment!==w.segment||w.startMs-prev.endMs>320||/[,.!?;:]$/.test(prev.text)))){groups.push(group);group=[];}group.push(w);}if(group.length)groups.push(group);
 const caption=groups.find(g=>t*1000>=g[0].startMs&&t*1000<g.at(-1)!.endMs+150);
 const cards=moment?.cards??(moment?.assetSrc?[{src:moment.assetSrc,label:moment.kind==='outro'?'RETA FINAL':'DIDÁTICA',at:moment.from}]:[]);
 const negative=scene?.mood==='neg';
 const cutTurn=interpolate(age,[0,.3,.8],[3,-.7,0],clamp);
 return <AbsoluteFill style={{background:ink,color:paper,overflow:'hidden',fontFamily:'RetroBody'}}>
 <style>{`@font-face{font-family:RetroBody;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:RetroDisplay;src:url('${staticFile('fonts/caption-impact.ttf')}')}`}</style>
 {props.audioMix&&<Audio src={staticFile(props.audioMix)}/>}
 <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 30%,#163b4a 0%,#0b1731 50%,#060b1b 100%)'}}/>
 <svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:.5}}>{Array.from({length:90},(_,i)=>{const x=random(`rx${i}`)*1080,y=(random(`ry${i}`)*2000+t*(i%2?2:-2)+2000)%2000;return <circle key={i} cx={x} cy={y} r={i%5===0?2.5:1} fill={paper}/>;})}</svg>
 <div style={{position:'absolute',left:760+Math.sin(t*.2)*12,top:155,width:210,height:210,borderRadius:'50%',border:`2px solid ${paper}55`,boxShadow:`inset -25px -10px 0 ${ink}77`,background:'repeating-radial-gradient(ellipse at 35% 30%,#9b977d 0 2px,#b5af9355 3px 7px)',opacity:.35}}/>
 {[{x:95,y:270,s:75},{x:944,y:440,s:57},{x:857,y:95,s:44}].map((v,i)=><svg key={i} width="140" height="650" style={{position:'absolute',left:v.x-70,top:-100,transformOrigin:'70px 0',transform:`rotate(${Math.sin(t*.8+i)*2}deg)`}}><path d={`M70 0V${v.y+100}`} stroke={paper} opacity=".4"/><path d="M0 -50 L12 -13 L48 -15 L19 8 L30 45 L0 23 L-30 45 L-19 8 L-48 -15 L-12 -13Z" transform={`translate(70 ${v.y+100}) scale(${v.s/100})`} fill={paper} stroke="#847f69" strokeWidth="2"/></svg>)}
 <Cloud x={-230+Math.sin(t*.24)*25} y={370} scale={.8}/><Cloud x={790+Math.sin(t*.3)*-30} y={650} scale={.85} flip/>
 <svg width="1080" height="420" style={{position:'absolute',top:0,left:0}}><defs><linearGradient id="curtain"><stop stopColor="#00514f"/><stop offset=".25" stopColor="#073033"/><stop offset=".5" stopColor="#087b73"/><stop offset=".8" stopColor="#052325"/><stop offset="1" stopColor="#00514f"/></linearGradient></defs>{[false,true].map((flip)=><g key={String(flip)} transform={flip?'translate(1080 0) scale(-1 1)':undefined}><path d="M0 0H420 Q280 112 120 135 Q110 240 0 390Z" fill="url(#curtain)" stroke="#b5ae7b" strokeWidth="3"/><path d="M0 18 Q170 111 400 2 M0 55 Q150 140 342 35 M16 155 Q66 239 0 350" fill="none" stroke="#a8a880" opacity=".35" strokeWidth="3"/></g>)}</svg>
 <Img src={marca(props.brand?.src)} style={{position:'absolute',left:480,top:52,width:120,height:120}}/>
 <div style={{position:'absolute',left:85,top:205,width:910,textAlign:'center',fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:49,transform:`translateY(${(1-enter)*30}px)`,opacity:enter}}>{eyebrow}</div>
 <div style={{position:'absolute',left:70,top:300,width:940,textAlign:'center',fontFamily:'RetroDisplay',fontWeight:900,fontSize:Math.min(132,1200/Math.max(1,text.length)),lineHeight:.98,textTransform:'uppercase',letterSpacing:-2,color:paper,textShadow:'3px 5px 0 #007f79,6px 9px 0 #0008',transform:`perspective(1000px) rotateX(${(1-hit)*-22}deg) scale(${.88+.12*hit})`,opacity:Math.max(0,hit)}}>{text}</div>
 {moment&&cards.map((card,i)=>{const on=spring({frame:(t-card.at)*fps,fps,config:{damping:20,stiffness:110}});const n=cards.length,w=n===3?270:n===2?350:365,x=540-(n*w+(n-1)*28)/2+i*(w+28);return <div key={card.src} style={{position:'absolute',left:x,top:590,width:w,height:430,background:paper,padding:14,boxSizing:'border-box',border:'2px solid #a09b83',boxShadow:'10px 15px 0 #0005',opacity:Math.min(1,on),transform:`perspective(1400px) translateY(${(1-on)*200+Math.sin(t*.7+i)*5}px) rotateY(${(1-on)*-65}deg) rotate(${(i-(n-1)/2)*5}deg)`}}><div style={{height:'100%',border:`2px solid ${ink}`,position:'relative',background:'repeating-linear-gradient(115deg,transparent 0 6px,#5e675410 7px 8px)'}}><div style={{position:'absolute',left:10,top:8,right:10,display:'flex',justifyContent:'space-between',color:ink,fontFamily:'Georgia',fontSize:25}}><span>✦</span><span>✦</span></div><Img src={staticFile(card.src)} style={{position:'absolute',left:'5%',top:40,width:'90%',height:280,objectFit:'contain',filter:'sepia(.6) saturate(.45) contrast(1.15)'}}/><div style={{position:'absolute',bottom:15,width:'100%',fontFamily:'RetroDisplay',fontSize:35,textAlign:'center',color:ink}}>{card.label}</div></div></div>;})}
 <div style={{position:'absolute',left:moment?165:60,top:moment?1120:610,width:moment?750:960,height:moment?422:810,border:`${moment?7:10}px solid ${paper}`,outline:'2px solid #928e75',boxShadow:'15px 20px 0 #0005',boxSizing:'border-box',overflow:'hidden',transform:`perspective(1600px) rotate(${cutTurn}deg)`}}><OffthreadVideo src={staticFile(props.video)} muted={!!props.audioMix} style={{width:'100%',height:'100%',objectFit:moment?'contain':'cover',objectPosition:`${(scene?.fx??.5)*100}% 50%`,filter:negative?'grayscale(1) contrast(1.1)':'contrast(1.04)',transform:`scale(${moment?1:1+Math.min(age,7)*.003})`}}/></div>
 {!moment&&<Cloud x={-310} y={1320} scale={.62}/>}<Cloud x={740} y={1790} scale={.9}/>
 <div style={{position:'absolute',left:60,top:1630,width:960,textAlign:'center',lineHeight:1.2}}>{caption?.map(w=>t*1000>=w.startMs-40?<span key={w.startMs} style={{display:'inline-block',margin:'0 9px',fontSize:props.keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k))?99:88,color:props.keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k))?teal:paper,textShadow:'0 3px 2px #000'}}>{w.text.toLocaleLowerCase('pt-BR')}</span>:null)}</div>
 <AbsoluteFill style={{pointerEvents:'none',opacity:.025,backgroundImage:'repeating-linear-gradient(0deg,#fff 0px,transparent 1px,transparent 4px),repeating-linear-gradient(90deg,#000 0px,transparent 1px,transparent 3px)',transform:`translateY(${frame%3}px) scale(1.01)`}}/>
 <AbsoluteFill style={{pointerEvents:'none',boxShadow:'inset 0 0 180px 40px #0008'}}/>
 </AbsoluteFill>;
};
