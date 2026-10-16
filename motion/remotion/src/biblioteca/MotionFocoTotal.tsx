import React from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,interpolate,spring,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {marca} from './marca';
import type {MotionTemplateProps} from './MotionTemplate';
export type FocoTotalProps=MotionTemplateProps&{
 fullScreenInserts?:{from:number;to:number;kind:string;eyebrow:string;title:string;src:string;transition?:'circle'|'slide'|'cut';graphic?:'flow'|'calendar'|'check'}[];
 speakerShots?:{from:number;to:number;x:number}[];
 punchTimes?:number[];
 phrases?:string[];
};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export const MotionFocoTotal:React.FC<FocoTotalProps>=(props)=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const insert=props.fullScreenInserts?.find(s=>t>=s.from&&t<s.to);
 const shot=props.speakerShots?.find(s=>t>=s.from&&t<s.to);
 const hit=(props.punchTimes??[]).filter(x=>x<=t).at(-1)??0;
 const cutIndex=(props.punchTimes??[]).filter(x=>x<=t).length;
 const z=(cutIndex%3===1?1.065:cutIndex%3===2?1.025:1)+Math.min(t-hit,5)*.0025;
 const age=insert?t-insert.from:0;
 const reveal=spring({frame:age*fps,fps,config:{damping:23,stiffness:170}});
 const entry=interpolate(age,[0,.3],[0,1],clamp);
 const leave=insert?interpolate(t,[insert.to-.26,insert.to],[0,1],clamp):0;
 const visible=Math.min(entry,1-leave);
 const light=!!insert&&insert.kind!=='photo'&&insert.kind!=='type'&&(insert.transition==='cut'||visible>.65);
 const panelLight=!!insert&&insert.kind!=='photo'&&insert.kind!=='type';
 const ink=light?'#080f35':'#fff',accent=light?'#008c84':'#00ddc3';
 const groups:typeof props.words[]=[];let group:typeof props.words=[];
 for(const w of props.words){const prev=group.at(-1);if((group.length>=2&&/^(eu|mas|porque|então)$/i.test(w.text))||group.length>=3||group.map(x=>x.text).join(' ').length+w.text.length>24||(prev&&(prev.segment!==w.segment||w.startMs-prev.endMs>300||/[,.!?;:]$/.test(prev.text)))){groups.push(group);group=[];}group.push(w);}if(group.length)groups.push(group);
 const caption=groups.find(g=>t*1000>=g[0].startMs&&t*1000<g.at(-1)!.endMs+120);
 const keys=caption?.filter(w=>props.keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k)))??[];
 const neg=props.scenes.some(s=>s.mood==='neg'&&t>=s.from&&t<s.to);
 return <AbsoluteFill style={{background:'#060b22',overflow:'hidden'}}>
 <style>{`@font-face{font-family:FocoText;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:FocoBold;src:url('${staticFile('fonts/caption-impact.ttf')}')}`}</style>
 {props.audioMix&&<Audio src={staticFile(props.audioMix)}/>}
 <OffthreadVideo src={staticFile(props.video)} muted={!!props.audioMix} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(shot?.x??.5)*100}% 50%`,transformOrigin:'50% 35%',transform:`scale(${z})`,filter:neg?'grayscale(1) contrast(1.07)':'contrast(1.035)'}}/>
 {!insert&&<AbsoluteFill style={{background:'linear-gradient(180deg,#0003,transparent 20%,transparent 53%,#0008 77%,#000b 100%)'}}/>}
 {insert&&<AbsoluteFill style={{clipPath:insert.transition==='circle'?`circle(${visible*155}% at 50% 48%)`:undefined,transform:insert.transition==='slide'?`translateX(${(1-entry)*1080-leave*1080}px)`:undefined,background:panelLight?'radial-gradient(ellipse at 50% 40%,#fff,#ecefed 70%,#dce3e2)':'#080e2b'}}>
  {insert.kind==='photo'?<><Img src={staticFile(insert.src)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1.02+age*.022}) translateY(${age*-5}px)`}}/><AbsoluteFill style={{background:'linear-gradient(180deg,#0009,transparent 43%,#0009 85%,#000c)'}}/><div style={{position:'absolute',left:66,top:82,color:'#ffffffaa',fontSize:25,fontFamily:'FocoText',letterSpacing:2}}>IMAGEM ILUSTRATIVA</div></>:<>
   <svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:.16}}><path d={`M-160 ${400-age*15} Q650 -100 1240 200 M-220 1580 Q300 2050 1260 1470`} fill="none" stroke={light?'#94aaa7':'#00b9ac'} strokeWidth="90"/></svg>
   {insert.kind!=='type'&&!insert.graphic&&<><div style={{position:'absolute',left:210,top:1130,width:660,height:85,borderRadius:'50%',background:'radial-gradient(ellipse,#062c3538,transparent 70%)'}}/>{insert.kind==='stack'&&<Img src={staticFile('motion-assets/impacto/livro.png')} style={{position:'absolute',left:45,top:710,width:570,height:570,objectFit:'contain',transform:`translateX(${(1-reveal)*-180}px) rotate(-13deg)`,filter:props.palette?.assetFilter}}/>}<Img src={staticFile(insert.src)} style={{position:'absolute',left:insert.kind==='stack'?400:170,top:580,width:insert.kind==='stack'?590:740,height:720,objectFit:'contain',transform:`translateY(${(1-reveal)*110}px) rotate(${(1-reveal)*-8}deg) scale(${.86+.14*reveal+age*.008})`,filter:props.palette?.assetFilter}}/></>}
  </>}
  {insert.graphic&&<svg width="1080" height="780" viewBox="0 0 1080 780" style={{position:'absolute',left:0,top:570}}>
   {insert.graphic==='flow'&&<>{[0,1,2].map(i=>{const p=interpolate(age,[i*.42,i*.42+.35],[0,1],clamp);return <g key={i} opacity={p} transform={`translate(0 ${(1-p)*70})`}><rect x={100+i*310} y={180} width="270" height="330" rx="22" fill={i===1?'#00b9ac':'#fff'} stroke="#071135" strokeWidth="4"/>{i===0?<g fill="none" stroke="#071135" strokeWidth="7"><path d="M142 247Q184 229 232 251V371Q184 350 142 371ZM232 251Q280 229 326 247V371Q280 350 232 371Z"/><path d="M232 255V372"/></g>:i===1?<g fill="none" stroke="#071135" strokeWidth="6">{[0,1,2].map(j=><g key={j}><rect x="450" y={245+j*45} width="22" height="22"/><path d={`M490 ${257+j*45}h120`}/></g>)}</g>:<path d="M765 310l40 40 76-90" fill="none" stroke="#008d82" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round"/>}<text x={235+i*310} y="464" textAnchor="middle" fontFamily="FocoBold" fontSize="32" fill="#071135">{['AULAS','QUESTÕES','REVISÃO'][i]}</text></g>;})}{[0,1].map(i=><path key={i} d={`M${375+i*310} 350h28l-12-12m12 12-12 12`} fill="none" stroke="#008d82" strokeWidth="5" opacity={interpolate(age,[.3+i*.4,.65+i*.4],[0,1],clamp)}/>)}</>}
   {insert.graphic==='calendar'&&<g transform={`translate(0 ${(1-reveal)*80})`}><rect x="210" y="90" width="660" height="540" rx="28" fill="#fff" stroke="#0b1235" strokeWidth="6"/><path d="M210 210h660" stroke="#0b1235" strokeWidth="6"/>{[310,770].map(x=><path key={x} d={`M${x} 57v82`} stroke="#00a99a" strokeWidth="25" strokeLinecap="round"/>)}{Array.from({length:12},(_,i)=>{const x=285+(i%4)*155,y=280+Math.floor(i/4)*120;const p=interpolate(age,[.08+i*.075,.3+i*.075],[0,1],clamp);return <g key={i}><rect x={x-35} y={y-30} width="90" height="85" rx="14" fill="#e7edeb"/><path d={`M${x-16} ${y+8}l17 18 31-38`} fill="none" stroke="#009e92" strokeWidth="9" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/></g>;})}</g>}
   {insert.graphic==='check'&&<g><circle cx="540" cy="350" r={180+Math.sin(age*3)*7} fill="#00b9ac"/><circle cx="540" cy="350" r={220+age*20} fill="none" stroke="#00b9ac" opacity={.4/(age+1)} strokeWidth="3"/><path d="M430 350l80 85 160-170" fill="none" stroke="#071135" strokeWidth="27" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-interpolate(age,[.1,.7],[0,1],clamp)}/></g>}
  </svg>}
  <div style={{position:'absolute',left:65,top:insert.kind==='type'?600:260,width:950,textAlign:'center',color:panelLight?'#080f35':'#fff',transform:`translateY(${(1-reveal)*45}px)`,opacity:Math.min(1,reveal)}}><div style={{fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:60,lineHeight:1.1,marginBottom:22}}>{insert.eyebrow}</div><div style={{fontFamily:'FocoBold',fontWeight:900,fontSize:Math.min(148,1180/Math.max(1,insert.title.length)),lineHeight:1.02,letterSpacing:-3,textTransform:'uppercase',color:insert.kind==='type'?accent:panelLight?'#080f35':'#fff'}}>{insert.title}</div><div style={{width:interpolate(age,[.15,.65],[0,210],clamp),height:7,background:accent,margin:'30px auto 0'}}/></div>
 </AbsoluteFill>}
 <div style={{position:'absolute',right:66,top:75,width:88,height:88,opacity:.8}}><Img src={marca(props.brand?.src)} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
 <div style={{position:'absolute',left:65,top:insert?1425:1280,width:950,textAlign:'center',fontFamily:'FocoText',fontWeight:700,lineHeight:1.08,letterSpacing:-1.6,color:ink,textShadow:light?'none':'0 4px 16px #000,0 2px 3px #000',WebkitTextStroke:light?undefined:'1px #0003'}}>{caption?.map(w=>{
  const key=keys.includes(w),active=t*1000>=w.startMs&&t*1000<w.endMs;
  const p=spring({frame:(t-w.startMs/1000)*fps,fps,config:{damping:22,stiffness:260}});
  if(t*1000<w.startMs-25)return null;
  return <span key={w.startMs} style={{display:key&&keys.length===1?'block':'inline-block',margin:'5px 10px',fontFamily:key?'FocoBold':'FocoText',fontSize:key?Math.min(136,1180/w.text.length):102,color:key?accent:ink,textTransform:key?'uppercase':'none',transform:`translateY(${(1-p)*15}px) scale(${active&&key?1.035:1})`,opacity:Math.min(1,p*2)}}>{w.text.toLocaleLowerCase('pt-BR')}</span>;
 })}</div>
 </AbsoluteFill>;
};
