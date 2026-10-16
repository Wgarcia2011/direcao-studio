import React,{useMemo} from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,interpolate,Easing,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {marca} from './marca';
import type {FocoTotalProps} from './MotionFocoTotal';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease={...clamp,easing:Easing.bezier(.18,.8,.22,1)};
export const MotionEditorialArtistico:React.FC<FocoTotalProps>=(props)=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const scene=props.fullScreenInserts?.find(s=>t>=s.from&&t<s.to);
 const age=scene?t-scene.from:0;
 const shot=props.speakerShots?.find(s=>t>=s.from&&t<s.to);
 const hit=(props.punchTimes??[]).filter(x=>x<=t).at(-1)??0;
 const zoom=1+interpolate(t-hit,[0,3.5],[.018,.07],ease);
 const photo=scene?.kind==='photo';
 const light=!!scene&&!photo;
 const index=props.fullScreenInserts?.indexOf(scene!)??0;
 const entry=interpolate(age,[0,.4],[0,1],ease);
 const exit=scene?interpolate(t,[scene.to-.15,scene.to],[0,1],ease):0;
 const turn=interpolate(age,[0,.42,Math.max(.5,(scene?.to??1)-(scene?.from??0))],[-26,-9,16],ease)*(index%2?-1:1);
 const blocks=useMemo(()=>{
  const phrases=props.phrases??['reta final','mais questões','questões atualizadas','muitas aulas','todo dia','Paulo Helene','processo penal','mais aulas','curso de revisão'];
  const clean=(v:string)=>v.toLocaleLowerCase('pt-BR').replace(/[.,!?;:]/g,'');
  const units:{words:typeof props.words;strong:boolean}[]=[];
  for(let i=0;i<props.words.length;){let n=1;for(const phrase of phrases){const count=phrase.split(' ').length;if(props.words.slice(i,i+count).map(w=>clean(w.text)).join(' ')===clean(phrase)){n=count;break;}}const ws=props.words.slice(i,i+n);units.push({words:ws,strong:n>1||ws.some(w=>props.keywords.some(k=>w.text.toLocaleUpperCase('pt-BR').includes(k)))});i+=n;}
  const result:{words:typeof props.words;lines:{words:typeof props.words;strong:boolean}[]}[]=[];
  let words:typeof props.words=[],lines:{words:typeof props.words;strong:boolean}[]=[],pending:typeof props.words=[];
  const flushLine=()=>{if(pending.length){lines.push({words:pending,strong:false});pending=[];}};
  const flush=()=>{flushLine();if(words.length)result.push({words,lines});words=[];lines=[];};
  for(const u of units){const last=words.at(-1);if(words.length&&(words.length+u.words.length>11||u.words.at(-1)!.endMs-words[0].startMs>3600||(last&&/[.!?;]$/.test(last.text))||lines.length>=4)){flush();}words.push(...u.words);if(u.strong){flushLine();lines.push(u);}else{if(pending.length>=4||pending.map(w=>w.text).join(' ').length+u.words[0].text.length>25)flushLine();pending.push(...u.words);}}
  flush();return result;
 },[props]);
 const blockIndex=blocks.findIndex((g,i)=>t*1000>=g.words[0].startMs&&t*1000<(blocks[i+1]?.words[0].startMs??g.words.at(-1)!.endMs+150));
 const block=blocks[blockIndex];
 const lines=block?.lines??[];
 const captionPart=(subset:typeof lines,startIndex:number)=>subset.map((l,j)=>{
  const idx=j+startIndex;const strong=l.strong||(!lines.some(x=>x.strong)&&idx===1);
  const text=l.words.map(w=>w.text).join(' ');
  const start=l.words[0].startMs/1000;
  const p=interpolate(t-start,[0,.13],[0,1],ease);
  return <div key={start} style={{fontFamily:strong?'EditorialSans':'EditorialSerif',fontSize:strong?(text.includes(' ')?(light&&startIndex>0?100:115):Math.min(123,1510/Math.max(1,text.length))):(light&&startIndex>0?68:84),fontWeight:700,lineHeight:strong?.99:1.08,letterSpacing:strong?-3.4:-1.5,opacity:p,transform:`translateY(${(1-p)*14}px) scale(${.97+.03*p})`,filter:`blur(${(1-p)*3}px)`,marginBottom:strong?1:3}}>{text}</div>;
 });
 return <AbsoluteFill style={{background:'#111',overflow:'hidden'}}>
 <style>{`@font-face{font-family:EditorialSans;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:EditorialSerif;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}')}`}</style>
 {props.audioMix&&<Audio src={staticFile(props.audioMix)}/>}
 <OffthreadVideo src={staticFile(props.video)} muted={!!props.audioMix} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(shot?.x??.5)*100}% 50%`,transform:`scale(${zoom})`,transformOrigin:'50% 32%'}}/>
 {!scene&&<AbsoluteFill style={{background:'linear-gradient(transparent 44%,#0003 59%,#0005 88%)'}}/>}
 {scene&&<AbsoluteFill style={{background:light?'radial-gradient(ellipse at 50% 43%,#fff 12%,#e2e2e2 63%,#b8b8b8 100%)':'#111',opacity:interpolate(age,[0,.065],[0,1],clamp)}}>
 {photo?<><Img src={staticFile(scene.src)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1.05+age*.03}) rotate(${-.8+age*.4}deg)`}}/><AbsoluteFill style={{background:'linear-gradient(#0005,transparent 45%,#0008)'}}/></>:<>
 <svg width="1080" height="1920" style={{position:'absolute',inset:0,transform:`rotate(${-11+age*5}deg) scale(1.25)`,transformOrigin:'50% 50%'}}><path d="M-320 640 Q300 80 1400 40 L1410 115 Q360 150 -320 700Z M-150 1610 Q770 1460 1310 690 L1370 770 Q790 1550 -150 1637Z" fill="#8d8d8d" opacity=".58"/></svg>
 <div style={{position:'absolute',left:190,top:1160,width:700,height:80,background:'radial-gradient(ellipse,#0004,transparent 68%)',transform:`scale(${.8+.2*entry})`}}/>
 {scene.kind==='stack'&&[0,1].map(i=><Img key={i} src={staticFile(i===0?'motion-assets/impacto/livro.png':scene.src)} style={{position:'absolute',left:i?490:20,top:i?710:780,width:570,height:570,objectFit:'contain',filter:`${props.palette?.assetFilter??''} saturate(.8) drop-shadow(0 16px 16px #0003)`,transform:`perspective(1400px) rotateY(${i?turn:-turn}deg) rotate(${(i?1:-1)*(10+age*5)}deg) scale(${.7+.3*entry})`}}/>)}
 {scene.kind!=='stack'&&<Img src={staticFile(scene.src)} style={{position:'absolute',left:150,top:640,width:780,height:730,objectFit:'contain',filter:`${props.palette?.assetFilter??''} saturate(.8) drop-shadow(0 18px 15px #0003)`,transform:`perspective(1500px) translateY(${(1-entry)*90}px) rotateY(${turn*.65}deg) rotateZ(${turn}deg) scale(${.64+.38*entry+age*.026+exit*.15})`}}/>}
 {(scene.kind==='stack'||scene.title.toLowerCase().includes('atualiz'))&&<svg width="1080" height="1450" style={{position:'absolute',inset:0}}><path d="M178 1070 Q240 520 864 715 Q1010 930 705 1250" fill="none" stroke="#00998f" strokeWidth="8" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-interpolate(age,[.3,1],[0,1],clamp)}/></svg>}
 </>}
 </AbsoluteFill>}
 <div style={{position:'absolute',left:95,width:890,top:light?245:photo?300:1040,textAlign:'center',color:light?'#242424':'#fff',textShadow:light?'none':'0 2px 5px #0005',transform:`scale(${1+Math.min(age,3)*.008})`}}>{captionPart(light?lines.slice(0,2):lines,0)}</div>
 {light&&lines.length>2&&<div style={{position:'absolute',left:110,width:860,top:1390,textAlign:'center',color:'#242424'}}>{captionPart(lines.slice(2),2)}</div>}
 <Img src={marca(props.brand?.src)} style={{position:'absolute',right:60,top:66,width:75,height:75,opacity:.7}}/>
 </AbsoluteFill>;
};
