import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {MotionFloatingCard} from './cardsFluidos/MotionFloatingCard';
import {MotionPath} from './cardsFluidos/MotionPath';
import {MotionCadernoEditorialDark, type CadernoBlock} from './MotionCadernoEditorial';

type Word={start:number;end:number;text:string};
type CaptionGroup={start:number;end:number;words:Word[]};
type Card={from:number;to:number;text:string;x?:number;y?:number};
type PathPanel={from:number;to:number;items:string[];item_times:number[];top?:number};
type Heading={from:number;to:number;at:number;text:string;x:number;y:number;accentWord?:string};
export type TemplateProps={duration:number;fps:number;video:string;audioMix?:string;captionGroups:CaptionGroup[];cards:Card[];paths:PathPanel[];notebookBlocks:CadernoBlock[];pageHeadings:Heading[];captionStyle?:{fontSize?:number;color?:string;activeColor?:string;zoom?:number;videoTop?:number;pageTop?:number}};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const Captions=({props}:{props:TemplateProps})=>{
 const {fps}=useVideoConfig(),t=useCurrentFrame()/fps;
 const g=props.captionGroups.find(g=>t>=g.start&&t<g.end);
 if(!g)return null;
 const s=props.captionStyle??{},page=props.notebookBlocks.some(b=>t>b.from+.4&&t<b.to-.35);
 return <div style={{position:'absolute',top:page?(s.pageTop??1450):(s.videoTop??1400),left:90,width:900,display:'flex',justifyContent:'center',alignItems:'baseline',gap:'18px 26px',flexWrap:'wrap',fontFamily:'Arial',fontSize:s.fontSize??86,fontWeight:700,lineHeight:1.18,textShadow:'0 3px 8px #000,-2px -2px 1px #111,2px 2px 1px #111'}}>
 {g.words.map((w,i)=>{const off=i+1<g.words.length?g.words[i+1].start:g.end,active=t>=w.start&&t<off;
 const scale=active&&off>w.start?interpolate(t,[w.start,w.start+Math.min(.07,(off-w.start)*.3),off],[1,s.zoom??1.12,1],clamp):1;
 return <span key={i} style={{display:'inline-block',padding:'0 8px',whiteSpace:'nowrap',color:active?(s.activeColor??'#FFE368'):(s.color??'#FFFFFF'),transform:`scale(${scale})`}}>{w.text}</span>;})}
 </div>;
};
const Path=({scene}:{scene:PathPanel})=>{
 const {fps}=useVideoConfig(),f=useCurrentFrame(),n=Math.round((scene.to-scene.from)*fps);
 const fade=Math.min(10,Math.floor(n/4)),p=interpolate(f,[0,fade,n-fade,n],[0,1,1,0],clamp);
 return <div style={{position:'absolute',left:65,top:scene.top??900,width:950,height:430,opacity:p,transform:`translateY(${(1-p)*65}px)`,borderRadius:30,background:'#171323ef',border:'2px solid #BB99E866',boxShadow:'0 18px 55px #0007',fontFamily:'Arial'}}><MotionPath scene={{items:scene.items,item_times:scene.item_times}}/></div>;
};
const Headings=({items}:{items:Heading[]})=>{
 const {fps}=useVideoConfig(),t=useCurrentFrame()/fps;
 return <>{items.filter(h=>t>=h.from&&t<h.to).map((h,i)=><div key={i} style={{position:'absolute',left:h.x,top:h.y,width:710,textAlign:'center',fontFamily:'Arial',fontWeight:700,fontSize:66,lineHeight:1.14,color:'#F1F5FF',opacity:interpolate(t,[h.at,h.at+.5],[0,1],clamp)}}>
 {h.text.split(/(\s+)/).map((word,j)=><span key={j} style={{color:word===h.accentWord?'#00d0b8':undefined}}>{word}</span>)}
 </div>)}</>;
};
// Cards Fluidos + Caderno Dark: cards com perspectiva, caminhos de icones e paginas do caderno.
export const CardsFluidosCadernoDark=(props:TemplateProps)=>{
 const {fps}=useVideoConfig();
 return <AbsoluteFill>
 <MotionCadernoEditorialDark {...({video:props.video,audioMix:props.audioMix,words:[],keywords:[],phrases:[],sketchBlocks:props.notebookBlocks,hideBrand:true,hideDoodles:true,solidCaptionHighlight:true,worldContent:<Headings items={props.pageHeadings}/>,punchTimes:[],videoZoom:.98} as any)}/>
 {props.cards.map((c,i)=><Sequence key={'c'+i} from={Math.round(c.from*fps)} durationInFrames={Math.round((c.to-c.from)*fps)}><MotionFloatingCard scene={{text:c.text,x:c.x??50,y:c.y??58,durationInFrames:Math.round((c.to-c.from)*fps)}}/></Sequence>)}
 {props.paths.map((p,i)=><Sequence key={'p'+i} from={Math.round(p.from*fps)} durationInFrames={Math.round((p.to-p.from)*fps)}><Path scene={p}/></Sequence>)}
 <Captions props={props}/>
 </AbsoluteFill>;
};
export const cardsFluidosDefaults:TemplateProps={duration:30,fps:30,video:'INPUT_VIDEO.mp4',captionGroups:[],cards:[],paths:[],notebookBlocks:[],pageHeadings:[]};
