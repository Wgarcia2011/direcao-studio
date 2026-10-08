import type {MotionAsset, MotionScene, MotionCaptions, Word} from './MotionTypes';
import React from 'react';
import {MotionPath} from './MotionPath';
import {MotionFloatingCard} from './MotionFloatingCard';
import {MotionAlert} from './MotionAlert';
import {DynamicMotion} from './DynamicMotion';
import {AbsoluteFill,Audio,Img,OffthreadVideo,Sequence,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {VideoProps,Object3D,Explain} from './EditorVideo';
import {ThreeCanvas} from '@remotion/three';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
function Media({asset,fit}:{asset:MotionAsset | undefined;fit:React.CSSProperties['objectFit']}){return !asset?<div style={{height:'100%',display:'grid',placeItems:'center',border:'3px dashed #b798ff',color:'#d1b4ff',fontSize:36}}>Apoio visual</div>:asset.kind==='video'?<OffthreadVideo src={asset.url} muted style={{width:'100%',height:'100%',objectFit:fit}}/>:<Img src={asset.url} style={{width:'100%',height:'100%',objectFit:fit}}/>;}
function Element({s,assets}:{s:MotionScene;assets:Record<string,MotionAsset>}){
 const frame=useCurrentFrame();const dur=s.durationInFrames;const ramp=s.intensity==='energetic'?6:s.intensity==='balanced'?10:15;
 const opacity=interpolate(frame,[0,Math.min(ramp,dur/3),Math.max(dur*2/3,dur-ramp),dur],[0,1,1,0],clamp);const rise=interpolate(frame,[0,ramp],[24,0],clamp);
 if(s.preset)return <DynamicMotion scene={s} assets={assets}/>;
 if(s.effect==='floating')return <MotionFloatingCard scene={s}/>;
 if(s.effect==='alert')return <MotionAlert scene={s}/>;
 const items=s.items?.length?s.items:[s.text];const support=Boolean(s.asset);const lines=s.effect==='comparison'?'row':'column';
 return <div style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,translate:`-50% calc(-50% + ${rise}px)`,width:s.effect==='keyword'?'80%':support?'34%':'38%',maxHeight:'65%',opacity,fontFamily:'Manrope',fontWeight:700,textAlign:'center',color:'#fff',fontSize:s.size,lineHeight:1.18}}>
 {support?<div style={{height:330}}><Media asset={assets[s.asset]} fit={s.fit}/></div>:s.effect==='title'||s.effect==='keyword'?<div style={{textShadow:'0 3px 12px #000',color:s.effect==='keyword'?'#4ee2c0':'#fff'}}>{s.text}</div>:s.effect==='3d'?<ThreeCanvas width={300} height={300} camera={{position:[0,0,6],fov:35}}><Object3D model="cube" color="#b798ff"/></ThreeCanvas>:s.effect==='flow'?<MotionPath scene={s}/>:['calendar','chart','funnel','cards'].includes(s.effect)?<Explain o={{...s,kind:'motion',font_size:s.size,model:'cube',motion:s.effect,color:'#b798ff'}}/>:<div style={{display:'flex',flexDirection:lines,gap:16}}>{items.map((item:string,i:number)=><div key={i} style={{flex:1,padding:20,borderRadius:12,background:'#251832',border:'2px solid #b798ff',opacity:interpolate(frame,[i*12,i*12+8],[0,1],clamp),fontSize:s.size*.65}}>{s.effect==='steps'?`${i+1}. `:s.effect==='checklist'?'✓ ':''}{item}</div>)}</div>}
 </div>;
}
function Captions({words,t,c,policy,horizontal}:{words:Word[];t:number;c:MotionCaptions;policy:string;horizontal:boolean}){
 if(!c.enabled||policy==='hide')return null;
 const chunks:Word[][]=[];let group:Word[]=[];
 words.forEach(w=>{if(group.length&&(group.length>=c.words||group[group.length-1].w.match(/[.!?:]$/)||w.s-group[group.length-1].e>.45)){chunks.push(group);group=[];}group.push(w);});if(group.length)chunks.push(group);
 const active=chunks.find(row=>t>=row[0].s&&t<row[row.length-1].e);if(!active)return null;
 const id=c.preset;const shown=id==='palavra'?active.filter(w=>t>=w.s&&t<w.e):active;const uppercase=['impacto','impacto-turquesa','palavra'].includes(id);const pill=['marcador','impacto-turquesa','roxo'].includes(id);const ink=id==='impacto-turquesa'?'#050705':'#10121a';
 const top=policy==='move'?18:c.position==='upper'?18:c.position==='middle'?48:81;
 const size=(horizontal?72:58)*c.size/100;const outline=id==='impacto-turquesa'||id==='impacto'?'6px #050705':'0px';
 return <div style={{position:'absolute',top:`${top}%`,left:'7%',right:'7%',translate:'0 -50%',textAlign:'center',fontSize:size,fontFamily:id==='cinema'?'Georgia':id==='impacto-turquesa'?'CaptionImpact':'Manrope',fontWeight:id==='cinema'?400:800,fontStyle:id==='cinema'?'italic':'normal',lineHeight:1.35,textTransform:uppercase?'uppercase':'none',color:'#fff',letterSpacing:'-.02em',textShadow:'0 3px 8px #000',WebkitTextStroke:outline,paintOrder:'stroke fill'}}>
 <span style={{background:id==='faixa'?'#10121a':id==='editorial'?'#fff':undefined,color:id==='editorial'?'#15101d':undefined,padding:id==='faixa'||id==='editorial'?'.06em .2em':undefined}}>{shown.map((w,i)=>{const current=t>=w.s&&t<w.e;const future=t<w.s;return <React.Fragment key={i}><span style={{display:'inline-block',margin:'0 .05em',padding:current&&pill?'0 .13em':undefined,borderRadius:'.17em',background:current&&pill?(id==='roxo'?'#382252':c.accent):undefined,color:current?(pill?ink:c.accent):undefined,WebkitTextStroke:current&&pill?'0px':undefined,textShadow:current&&pill?'none':undefined,visibility:id==='ritmo'&&future?'hidden':undefined,opacity:id==='karaoke'&&future?.65:1,scale:current&&id==='impacto'?1.035:1,textDecoration:current&&(id==='editorial'||id==='faixa')?'underline':undefined,textDecorationColor:c.accent}}>{w.w}</span>{' '}</React.Fragment>})}</span></div>;
}
export const MotionVideo:React.FC<{p:VideoProps}>=({p})=>{
 const local=useCurrentFrame();const {width,height,fps}=useVideoConfig();const frame=local+(p.offsetFrames||0),t=frame/fps;const horizontal=width>height;const m=p.motion!;const scene=m.scenes.find((s:MotionScene)=>s.kind==='layout'&&t>=s.start&&t<s.start+s.duration);const layout=scene?.layout||'full';const assets=m.assets||{};
 const progress=scene?interpolate(frame,[scene.startFrame,scene.startFrame+Math.min(24,scene.durationInFrames/3)],[0,1],clamp):0;const exit=scene?.hold_layout?1:scene?interpolate(frame,[scene.startFrame+Math.max(scene.durationInFrames*2/3,scene.durationInFrames-24),scene.startFrame+scene.durationInFrames],[1,0],clamp):1;const phase=Math.min(progress,exit);const smooth=phase*phase*(3-2*phase);
 let presenter:React.CSSProperties={position:'absolute',inset:0,overflow:'hidden'};let support:React.CSSProperties={position:'absolute',left:'54%',top:'10%',width:'42%',height:'70%',overflow:'hidden',borderRadius:16};
 if(layout==='panel'||layout==='split')presenter=horizontal?{position:'absolute',left:'3%',top:'8%',width:`${scene?.presenter_width??(layout==='split'?46:48)}%`,height:'70%',overflow:'hidden',borderRadius:16}:{position:'absolute',left:'5%',top:'6%',width:'90%',height:'44%',overflow:'hidden',borderRadius:16};
 if(layout==='stage')presenter={position:'absolute',left:'4%',top:'12%',width:'59%',height:'72%',overflow:'hidden',borderRadius:24};
 if(layout==='pip')presenter={position:'absolute',left:'5%',top:'8%',width:'32%',height:'38%',overflow:'hidden',borderRadius:16,zIndex:2};
 if(layout==='pip'||layout==='support')support={position:'absolute',inset:0,overflow:'hidden'};
 if(!horizontal&&(layout==='panel'||layout==='split'))support={position:'absolute',left:'5%',top:'52%',width:'90%',height:'25%',overflow:'hidden',borderRadius:16};
 if(scene&&['panel','split','pip','stage'].includes(layout)){const target=presenter;presenter={...target,left:`${interpolate(smooth,[0,1],[0,parseFloat(String(target.left))])}%`,top:`${interpolate(smooth,[0,1],[0,parseFloat(String(target.top))])}%`,width:`${interpolate(smooth,[0,1],[100,parseFloat(String(target.width))])}%`,height:`${interpolate(smooth,[0,1],[100,parseFloat(String(target.height))])}%`};}
 if(layout==='stage')presenter={...presenter,transform:`perspective(1800px) rotateY(${8*smooth}deg) rotateZ(${-2*smooth}deg)`,border:`${3*smooth}px solid #4ee2c0`,boxShadow:`0 0 ${35*smooth}px #4ee2c030`};
 const needsAsset=['panel','split','pip','support'].includes(layout)&&Boolean(scene?.asset||scene?.required);const focus=`${scene?.focusX??50}% ${scene?.focusY??50}%`;
 const zoom=layout==='zoom'&&scene?1+(scene.scale-1)*smooth:1;const policy=m.scenes.some((s:MotionScene)=>t>=s.start&&t<s.start+s.duration&&s.caption==='hide')?'hide':m.scenes.some((s:MotionScene)=>t>=s.start&&t<s.start+s.duration&&s.caption==='move')?'move':'keep';
 return <AbsoluteFill style={{background:'#151020',overflow:'hidden'}}><style>{`@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-700.ttf')}');font-weight:700 900}@font-face{font-family:CaptionImpact;src:url('${staticFile('fonts/caption-impact.ttf')}');font-weight:900}`}</style>
 {layout==='stage'?<AbsoluteFill style={{opacity:smooth,background:'#071014',backgroundImage:'linear-gradient(#4ee2c015 1px,transparent 1px),linear-gradient(90deg,#4ee2c015 1px,transparent 1px)',backgroundSize:'55px 55px',backgroundPosition:`${local*.2}px ${local*.1}px`}}/>:null}
 {needsAsset&&scene?<div style={{...support,opacity:smooth}}><Sequence from={scene.startFrame-(p.offsetFrames||0)} durationInFrames={scene.durationInFrames} layout="none"><Media asset={assets[scene.asset]} fit={scene.fit}/></Sequence></div>:null}
 {layout!=='support'&&p.source?<div style={presenter}><OffthreadVideo src={p.source} startFrom={p.offsetFrames||0} muted style={{width:'100%',height:'100%',objectFit:layout==='full'||layout==='zoom'?'contain':(scene?.fit||'contain'),objectPosition:focus,scale:zoom,transformOrigin:focus}}/></div>:null}
 {m.scenes.filter((s:MotionScene)=>s.kind==='element').map((s:MotionScene)=><Sequence key={s.id} from={s.startFrame-(p.offsetFrames||0)} durationInFrames={s.durationInFrames} layout="none"><Element s={s} assets={assets}/></Sequence>)}
 <Captions words={m.words||[]} t={t} c={m.captions} policy={policy} horizontal={horizontal}/>
 {p.audio&&p.source?<Audio src={p.source} startFrom={p.offsetFrames||0}/>:null}
 </AbsoluteFill>;
};
