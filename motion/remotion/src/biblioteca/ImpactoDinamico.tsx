import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {marca} from './marca';
import {ImpactoVertical} from './ImpactoMarca';
import type {MotionTemplateProps} from './MotionTemplate';


const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;


export const ImpactoPinterest:React.FC<MotionTemplateProps>=(props)=>{
 const RED=props.palette?.accent ?? '#e3262b';
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const moment=(props.emphasisMoments ?? []).find(m=>t>=m.from&&t<m.to);
 if(!moment)return <ImpactoVertical {...props}/>;
 const age=t-moment.from;
 const enter=spring({frame:age*fps,fps,config:{damping:21,stiffness:150}});
 const exit=moment.kind==='outro'?1:interpolate(t,[moment.to-.18,moment.to],[1,0],clamp);
 const groups:typeof props.words[]=[];let group:typeof props.words=[];
 for(const w of props.words){const prev=group[group.length-1];if(group.length>=3||group.map(x=>x.text).join(' ').length+w.text.length>24||(prev&&(prev.segment!==w.segment||w.startMs-prev.endMs>320||/[,.!?;:]$/.test(prev.text)))){groups.push(group);group=[];}group.push(w);}if(group.length)groups.push(group);
 const caption=groups.find(g=>t*1000>=g[0].startMs&&t*1000<g[g.length-1].endMs+150);
 const heading=moment.headings.filter(h=>t>=h.at).at(-1);
 const hitAt=heading?.at ?? moment.from;
 const hit=spring({frame:frame-hitAt*fps,fps,config:{damping:17,stiffness:180}});
 const big=heading?.text ?? '';
 const showBig=!!heading;
 return <><ImpactoVertical {...props}/><AbsoluteFill style={{opacity:Math.min(1,enter*1.4)*exit,overflow:'hidden',background:props.palette?'radial-gradient(ellipse at 70% 35%,#102465,#050820 65%)':'radial-gradient(ellipse at 70% 35%,#283139,#101316 65%)',fontFamily:'TplManrope'}}>
  <AbsoluteFill style={{opacity:.15,backgroundImage:'linear-gradient(#ffffff25 1px,transparent 1px),linear-gradient(90deg,#ffffff25 1px,transparent 1px)',backgroundSize:'80px 80px',transform:`translate(${Math.sin(age*.8)*-14}px,${age*-7}px) scale(1.04)`}}/>
  <div style={{position:'absolute',left:720-Math.sin(age*.7)*40,top:430,width:500,height:500,borderRadius:'50%',background:`radial-gradient(circle,${RED}22,transparent 65%)`}}/>
  <Img src={marca(props.brand?.src )} style={{position:'absolute',left:60,top:50,width:120,height:120}}/>
  <div style={{position:'absolute',left:65,top:205,width:950,textAlign:'center',color:'#eee',fontSize:48,letterSpacing:3,transform:`translateY(${(1-enter)*35}px)`}}>{moment.eyebrow}</div>
  {showBig&&<div style={{position:'absolute',left:45,top:310,width:990,textAlign:'center',color:props.palette?.ink ?? '#fff',fontFamily:'TplSora',fontWeight:700,fontSize:moment.kind==='cards'?110:moment.kind==='type'?139:128,letterSpacing:-5,lineHeight:1.08,transform:`perspective(1200px) rotateY(${(1-hit)*-24}deg) translateY(${(1-hit)*45}px) scale(${.86+.14*hit})`}}><span style={{position:'relative',display:'inline-block',padding:'10px 15px',background:RED,boxShadow:`0 12px 50px ${RED}33`}}>{big}</span></div>}
  {moment.kind==='cards'?(moment.cards ?? []).map((card,i)=>{
    const p=spring({frame:frame-card.at*fps,fps,config:{damping:17,stiffness:165}});
    return <div key={card.src} style={{position:'absolute',left:100+i*300,top:635,opacity:Math.min(1,p),width:280,height:355,border:'2px solid #ffffff66',borderRadius:20,background:'linear-gradient(145deg,#ffffff18,#ffffff04)',boxShadow:'0 25px 40px #0005',transform:`perspective(950px) translateY(${(1-p)*180-Math.sin(age+i)*8}px) rotateX(${(1-p)*25}deg) rotateZ(${(i-1)*3}deg)`}}><Img src={staticFile(card.src)} style={{width:260,height:260,margin:10,objectFit:'contain',filter:props.palette?.assetFilter}}/><div style={{color:'#fff',fontSize:32,textAlign:'center',fontWeight:700}}>{card.label}</div></div>;
  }):<>
    <Img src={staticFile(moment.assetSrc ?? 'motion-assets/impacto/linha-chegada.png')} style={{position:'absolute',left:310,top:moment.kind==='type'?570:640,width:460,height:400,objectFit:'contain',filter:props.palette?.assetFilter,transform:`translate(${Math.sin(age*.8)*18}px,${Math.cos(age*.9)*-12}px) rotate(${Math.sin(age)*3}deg) scale(${.9+.1*enter})`}}/>
    <svg width="1080" height="1050" style={{position:'absolute',inset:0,pointerEvents:'none'}}><path d="M90 920 C160 480 760 1060 995 540" fill="none" stroke="#ffffff44" strokeWidth="2" pathLength={1} strokeDasharray={`${interpolate(age,[.1,1.4],[0,1],clamp)} 1`}/><path d="M840 510 L885 540 L852 550 Z" fill="#fff" opacity=".7" transform={`translate(${Math.sin(age)*12},${Math.cos(age)*8})`}/></svg>
  </>}
  <div style={{position:'absolute',left:170,top:1110,width:740,height:416.25,overflow:'hidden',borderRadius:24,border:'4px solid #f5f5f5',boxShadow:'0 20px 60px #0008',transform:`perspective(1600px) rotateY(${(1-enter)*16}deg) translateY(${(1-enter)*40}px)`}}><OffthreadVideo src={staticFile(props.video)} muted style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
  <div style={{position:'absolute',left:65,top:1620,width:950,textAlign:'center',lineHeight:1.22}}>{caption?.map(w=>{if(t*1000<w.startMs-40)return null;const key=props.keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k));return <span key={w.startMs} style={{display:'inline-block',margin:'0 9px',fontFamily:key?'TplSora':'TplManrope',fontWeight:700,fontSize:key?100:88,color:key?RED:'#f5f5f5'}}>{w.text.toLocaleLowerCase('pt-BR')}</span>;})}</div>
 </AbsoluteFill></>;
};

export const MotionImpactoDinamico = ImpactoPinterest;
