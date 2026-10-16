import React,{useMemo} from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,interpolate,spring,Easing,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {marca} from './marca';
import type {FocoTotalProps} from './MotionFocoTotal';

// Túnel de assets: a fala recua para dentro de um túnel 3D, o asset da narração vem do fundo,
// atravessa a câmera na saída e o vídeo volta voando do centro do túnel.
export type TunelInsert={from:number;to:number;kind:string;eyebrow:string;title:string;src:string;fx?:'shake'|'speed'|'pulse';keepColor?:boolean};
export type TunelProps=Omit<FocoTotalProps,'fullScreenInserts'>&{tunnelAssets?:string[];fullScreenInserts?:TunelInsert[]};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease={...clamp,easing:Easing.bezier(.16,1,.3,1)};
const easeIn={...clamp,easing:Easing.bezier(.7,0,.84,0)};
const CX=540,CY=880,DEPTH=4800,PERSPECTIVE=900;
const mod=(a:number,n:number)=>((a%n)+n)%n;
type Words=TunelProps['words'];

const useCaptionBlocks=(words:Words,keywords:string[],phrases:string[])=>useMemo(()=>{
 const clean=(v:string)=>v.toLocaleLowerCase('pt-BR').replace(/[.,!?;:]/g,'');
 const units:{words:Words;strong:boolean}[]=[];
 for(let i=0;i<words.length;){let n=1;for(const phrase of phrases){const count=phrase.split(' ').length;if(words.slice(i,i+count).map(w=>clean(w.text)).join(' ')===clean(phrase)){n=count;break;}}const ws=words.slice(i,i+n);units.push({words:ws,strong:n>1||ws.some(w=>keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k)))});i+=n;}
 const result:{words:Words;lines:{words:Words;strong:boolean}[]}[]=[];
 let acc:Words=[],lines:{words:Words;strong:boolean}[]=[],pending:Words=[];
 const flushLine=()=>{if(pending.length){lines.push({words:pending,strong:false});pending=[];}};
 const flush=()=>{flushLine();if(acc.length)result.push({words:acc,lines});acc=[];lines=[];};
 for(const u of units){const last=acc.at(-1);if(acc.length&&(acc.length+u.words.length>11||u.words.at(-1)!.endMs-acc[0].startMs>3600||(last&&/[.!?;]$/.test(last.text))||lines.length>=4))flush();acc.push(...u.words);if(u.strong){flushLine();lines.push(u);}else{if(pending.length>=4||pending.map(w=>w.text).join(' ').length+u.words[0].text.length>25)flushLine();pending.push(...u.words);}}
 flush();return result;
},[words,keywords,phrases]);

export const MotionTunelAssets:React.FC<TunelProps>=(props)=>{
 const frame=useCurrentFrame(),{fps,durationInFrames}=useVideoConfig(),t=frame/fps,end=durationInFrames/fps;
 const accent=props.palette?.accent??'#00d0b8';
 const inserts=props.fullScreenInserts??[];
 const scene=inserts.find(s=>t>=s.from&&t<s.to);
 const index=scene?inserts.indexOf(scene):0;
 const age=scene?t-scene.from:0;
 const final=!!scene&&scene.to>=end-.05;
 const exitP=scene&&!final?interpolate(t,[scene.to-.38,scene.to],[0,1],easeIn):0;
 const recede=scene?interpolate(age,[0,.42],[0,1],ease):0;
 const arrive=scene?spring({frame:Math.max(0,age-.12)*fps,fps,config:{damping:11,stiffness:110,mass:.8}}):0;
 const speed=scene?.fx==='speed'?2600:1100;
 const travel=age*speed+exitP*exitP*2400+(1-recede)*-600;
 const shot=props.speakerShots?.find(s=>t>=s.from&&t<s.to);
 const hit=(props.punchTimes??[]).filter(x=>x<=t).at(-1)??0;
 const zoom=1+interpolate(t-hit,[0,3.5],[.018,.07],ease);
 // Puxão para dentro do túnel nos 0,25 s antes da arte.
 const next=inserts.find(s=>s.from>t&&s.from-t<.25);
 const suck=next?interpolate(t,[next.from-.25,next.from],[0,1],easeIn):0;
 const pulse=scene?Math.max(0,...props.words.filter(w=>w.startMs/1000<=t&&w.startMs/1000>=scene.from-.05).map(w=>Math.exp(-(t-w.startMs/1000)*7))):0;
 const shake=scene?.fx==='shake'?26*Math.exp(-age*5):0;
 const shakeX=shake*Math.sin(frame*1.9),shakeY=shake*Math.cos(frame*2.3);
 const blocks=useCaptionBlocks(props.words,props.keywords,props.phrases??[]);
 const blockIndex=blocks.findIndex((g,i)=>t*1000>=g.words[0].startMs&&t*1000<(blocks[i+1]?.words[0].startMs??g.words.at(-1)!.endMs+150));
 const lines=blocks[blockIndex]?.lines??[];
 const library=props.tunnelAssets??inserts.map(s=>s.src);
 const filter=(src:string)=>scene?.keepColor&&src===scene.src?'':props.palette?.assetFilter??'';
 const video=(style:React.CSSProperties)=><OffthreadVideo src={staticFile(props.video)} muted={!!props.audioMix} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(shot?.x??.5)*100}% 50%`,...style}}/>;
 const caption=(subset:typeof lines,startIndex:number,dark:boolean)=>subset.map((l,j)=>{
  const idx=j+startIndex;const strong=l.strong||(!lines.some(x=>x.strong)&&idx===1);
  const text=l.words.map(w=>w.text).join(' ');const start=l.words[0].startMs/1000;
  const p=interpolate(t-start,[0,.16],[0,1],ease);
  return <div key={start} style={{fontFamily:strong?'EditorialSans':'EditorialSerif',fontSize:strong?(text.includes(' ')?(dark&&startIndex>0?100:115):Math.min(123,1510/Math.max(1,text.length))):(dark&&startIndex>0?68:84),fontWeight:700,lineHeight:strong?.99:1.08,letterSpacing:strong?-3.4:-1.5,opacity:p,color:strong&&dark?'#fff':undefined,transform:`translateY(${(1-p)*26}px) scale(${.9+.1*p})`,filter:`blur(${(1-p)*5}px)`,textShadow:dark&&strong?`0 0 ${18+pulse*20}px ${accent}88`:'0 2px 5px #0005',marginBottom:strong?1:3}}>{text}</div>;
 });
 const rings=Array.from({length:16},(_,i)=>{
  const z=-mod(i*300-travel,DEPTH);
  const o=interpolate(z,[-DEPTH,-3600,-260,40],[0,1,1,0],clamp);
  const strong=i%3===0;
  return <div key={'r'+i} style={{position:'absolute',left:CX-520,top:CY-520,width:1040,height:1040,borderRadius:i%2?'50%':120,border:`${strong?9:4}px solid ${strong?accent:'#ffffff'}`,opacity:o*(strong?.95:.35)*(.75+pulse*.25),boxShadow:strong?`0 0 ${30+pulse*60}px ${accent}, inset 0 0 ${20+pulse*40}px ${accent}66`:'none',transform:`translate3d(0,0,${z}px) rotateZ(${i*11+t*28*(index%2?-1:1)}deg) scale(${1+pulse*.035})`}}/>;
 });
 const wall=Array.from({length:18},(_,j)=>{
  const src=library[j%library.length];if(!src)return null;
  const z=-mod(j*270-travel*1.15,DEPTH+60);
  const a=(j*137.5+t*14)*Math.PI/180,r=400+(j%3)*90,size=280+(j%4)*45;
  const o=interpolate(z,[-DEPTH,-3500,-420,-120],[0,.95,.95,0],clamp);
  return <Img key={'w'+j} src={staticFile(src)} style={{position:'absolute',left:CX+Math.cos(a)*r-size/2,top:CY+Math.sin(a)*r*1.45-size/2,width:size,height:size,objectFit:'contain',opacity:o,filter:`${props.palette?.assetFilter??''} saturate(.8) brightness(1.1) drop-shadow(0 0 18px ${accent}66)`,transform:`translate3d(0,0,${z}px) rotateZ(${(j%2?1:-1)*(t*60+j*30)}deg) rotateY(${Math.sin(t*2+j)*35}deg)`}}/>;
 });
 const turn=interpolate(age,[0,.5,Math.max(.6,(scene?.to??1)-(scene?.from??0))],[-30,-8,14],ease)*(index%2?-1:1);
 const heroZ=-3200*(1-arrive)+exitP*exitP*1300;
 const heroO=interpolate(arrive,[0,.15],[0,1],clamp)*interpolate(exitP,[.55,.95],[1,0],clamp);
 const lines3d=scene?.fx==='speed'||exitP>0;
 return <AbsoluteFill style={{background:'#01020f',overflow:'hidden'}}>
 <style>{`@font-face{font-family:EditorialSans;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:EditorialSerif;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}')}`}</style>
 {props.audioMix&&<Audio src={staticFile(props.audioMix)}/>}
 {!scene&&<>
  {video({transform:`scale(${zoom*(1+suck*.55)}) rotate(${suck*-4}deg)`,transformOrigin:'50% 46%',filter:`blur(${suck*9}px) brightness(${1+suck*.4})`})}
  <AbsoluteFill style={{background:'linear-gradient(transparent 44%,#0003 59%,#0005 88%)'}}/>
  {suck>0&&<AbsoluteFill style={{background:`radial-gradient(circle at 50% 46%,transparent ${60-suck*40}%,${accent}55 ${80-suck*30}%,#01020f 100%)`,opacity:suck}}/>}
 </>}
 {scene&&<AbsoluteFill style={{translate:`${shakeX}px ${shakeY}px`}}>
  <AbsoluteFill style={{background:`radial-gradient(circle at 50% 46%,#16288f 0%,#070d4a 32%,#02041a 70%,#01020f 100%)`}}/>
  <AbsoluteFill style={{background:`radial-gradient(circle at 50% 46%,${accent}${Math.round(40+pulse*90).toString(16).padStart(2,'0')} 0%,transparent 26%)`}}/>
  <AbsoluteFill style={{perspective:PERSPECTIVE,perspectiveOrigin:`${CX}px ${CY}px`}}>
   <AbsoluteFill style={{transformStyle:'preserve-3d'}}>
    {rings}{wall}
    {scene.kind==='photo'
     ?<Img src={staticFile(scene.src)} style={{position:'absolute',left:CX-380,top:CY-470,width:760,height:940,objectFit:'cover',borderRadius:40,border:`6px solid ${accent}`,boxShadow:`0 0 60px ${accent}88`,opacity:heroO,transform:`translate3d(0,0,${heroZ}px) rotateY(${turn*.5}deg) rotateZ(${turn*.25}deg)`}}/>
     :<Img src={staticFile(scene.src)} style={{position:'absolute',left:CX-370,top:CY-370,width:740,height:740,objectFit:'contain',opacity:heroO,filter:`${filter(scene.src)} saturate(.9) drop-shadow(0 0 ${30+pulse*40}px ${accent}aa) drop-shadow(0 24px 22px #0008)`,transform:`translate3d(0,0,${heroZ}px) rotateY(${turn*.7+Math.sin(age*3)*10}deg) rotateZ(${turn}deg) scale(${1+pulse*.05+age*.02})`}}/>}
    {/* O vídeo recua para dentro do túnel na entrada e volta voando na saída. */}
    {(recede<1||exitP>0)&&<div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:interpolate(Math.max(1-recede,exitP),[0,1],[90,0]),border:`6px solid ${accent}`,boxShadow:`0 0 50px ${accent}`,opacity:exitP>0?interpolate(exitP,[0,.25],[0,1],clamp):interpolate(recede,[.7,1],[1,0],clamp),transform:`translate3d(0,0,${exitP>0?-2600*(1-exitP):-2600*recede}px) rotateZ(${exitP>0?(1-exitP)*14:recede*-14}deg)`}}>{video({})}</div>}
   </AbsoluteFill>
  </AbsoluteFill>
  {lines3d&&<svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:scene.fx==='speed'?.9:exitP}}>{Array.from({length:44},(_,k)=>{const a=k*8.18*Math.PI/180+k,ph=mod(age*(scene.fx==='speed'?2.6:1.8)+k*.137,1),r1=120+ph*1500,r2=r1+90+ph*380;return <line key={k} x1={CX+Math.cos(a)*r1} y1={CY+Math.sin(a)*r1} x2={CX+Math.cos(a)*r2} y2={CY+Math.sin(a)*r2} stroke={k%4?'#ffffff':accent} strokeWidth={2+ph*5} strokeLinecap="round" opacity={ph*.8}/>;})}</svg>}
  <div style={{position:'absolute',left:95,width:890,top:200,textAlign:'center',color:'#cfd6ff',opacity:1-exitP}}>{caption(lines.slice(0,2),0,true)}</div>
  {lines.length>2&&<div style={{position:'absolute',left:110,width:860,top:1430,textAlign:'center',color:'#cfd6ff',opacity:1-exitP}}>{caption(lines.slice(2),2,true)}</div>}
  <AbsoluteFill style={{background:'#fff',opacity:interpolate(age,[0,.04,.16],[0,scene.fx==='shake'?.9:.35,0],clamp),mixBlendMode:'screen'}}/>
 </AbsoluteFill>}
 {!scene&&<div style={{position:'absolute',left:95,width:890,top:1040,textAlign:'center',color:'#fff',textShadow:'0 2px 5px #0005'}}>{caption(lines,0,false)}</div>}
 <Img src={marca(props.brand?.src)} style={{position:'absolute',right:60,top:66,width:75,height:75,opacity:.75}}/>
 </AbsoluteFill>;
};
