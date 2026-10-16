import React,{useMemo} from 'react';
import {AbsoluteFill,Audio,Img,OffthreadVideo,interpolate,spring,Easing,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {marca} from './marca';
import type {FocoTotalProps} from './MotionFocoTotal';

// Túnel narrativo: fala real → túnel com o falante recortado e artes trocando conforme a narração
// (PNG da biblioteca e desenhos em código) → fala → túnel → fala → encerramento com a marca.
export type TunelBeat={at:number;kind:'png'|'photo'|'code';src?:string;code?:CodeName;fx?:'shake'|'speed';keepColor?:boolean;markAt?:number};
export type TunelTrecho={from:number;to:number;beats:TunelBeat[]};
export type TunelNarrativoProps=Omit<FocoTotalProps,'fullScreenInserts'>&{
 tunnels:TunelTrecho[];tunnelAssets?:string[];cutout?:string;videoEnd:number;
 outro?:{from:number;small:string;big:string;brand:string;src?:string;brandName?:string};
};
type CodeName='question'|'clash'|'smile'|'laugh'|'bus'|'blocks'|'clock'|'wires'|'suitcase';
type Words=TunelNarrativoProps['words'];
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease={...clamp,easing:Easing.bezier(.16,1,.3,1)};
const easeIn={...clamp,easing:Easing.bezier(.7,0,.84,0)};
const back={...clamp,easing:Easing.bezier(.34,1.56,.64,1)};
const CX=540,CY=860,DEPTH=4800,SPEED=825,INK='#000068';
const mod=(a:number,n:number)=>((a%n)+n)%n;
const rnd=(n:number)=>mod(Math.sin(n*12.9898)*43758.5453,1);
const pop=(a:number,d=0,len=.38)=>interpolate(a-d,[0,len],[0,1],back);

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

// Desenhos em código, 740×740, animados pela idade do momento (a) e pela marca opcional (m).
const CodeArt:React.FC<{name:CodeName;a:number;m:number;accent:string}>=({name,a,m,accent})=>{
 const draw=(d=0,len=.6)=>1-interpolate(a-d,[0,len],[0,1],ease);
 const svg=(children:React.ReactNode)=><svg width="740" height="740" viewBox="0 0 740 740" style={{overflow:'visible'}}>{children}</svg>;
 const font={fontFamily:'EditorialSans',fontWeight:700} as const;
 if(name==='question')return svg(<>
  <circle cx="370" cy="370" r="300" fill="#0b1660" stroke={accent} strokeWidth="14" pathLength={1} strokeDasharray="1" strokeDashoffset={draw()}/>
  {[0,1,2].map(k=>{const ang=a*2.2+k*2.09;return <circle key={k} cx={370+Math.cos(ang)*330} cy={370+Math.sin(ang)*330} r="16" fill={k?'#fff':accent}/>;})}
  <text x="370" y="525" textAnchor="middle" fontSize="430" fill="#fff" style={{...font,transformOrigin:'370px 370px',transform:`scale(${pop(a,.1)}) rotate(${Math.sin(a*3)*9}deg)`}}>?</text></>);
 if(name==='clash'){const burst=pop(a,.25)*(1+.08*Math.sin(a*22));return svg(<>
  <g transform={`translate(${interpolate(a,[0,.35],[-280,0],back)},0) rotate(${Math.sin(a*9)*3} 200 300)`}><path d="M60 200 h300 a50 50 0 0 1 50 50 v120 a50 50 0 0 1 -50 50 h-160 l-70 70 v-70 h-70 a50 50 0 0 1 -50 -50 v-120 a50 50 0 0 1 50 -50z" fill={accent} stroke="#fff" strokeWidth="8"/><text x="210" y="365" textAnchor="middle" fontSize="150" fill={INK} style={font}>!</text></g>
  <g transform={`translate(${interpolate(a,[0,.35],[280,0],back)},0) rotate(${-Math.sin(a*9)*3} 540 420)`}><path d="M390 320 h290 a50 50 0 0 1 50 50 v120 a50 50 0 0 1 -50 50 h-70 v70 l-70 -70 h-150 a50 50 0 0 1 -50 -50 v-120 a50 50 0 0 1 50 -50z" fill="#fff" stroke={accent} strokeWidth="8"/><text x="535" y="485" textAnchor="middle" fontSize="140" fill={INK} style={font}>?!</text></g>
  <polygon points={Array.from({length:24},(_,i)=>{const r=i%2?55:120,ang=i*Math.PI/12;return `${370+Math.cos(ang)*r},${360+Math.sin(ang)*r}`;}).join(' ')} fill="#ff4d4d" stroke="#fff" strokeWidth="6" style={{transformOrigin:'370px 360px',transform:`scale(${burst}) rotate(${a*90}deg)`}}/></>);}
 if(name==='smile'){const blink=mod(a,1.7)<.12?4:34;return svg(<g transform={`translate(0 ${-Math.abs(Math.sin(a*5))*34})`}>
  <circle cx="370" cy="380" r="270" fill="#ffd23f" stroke={INK} strokeWidth="14" style={{transformOrigin:'370px 380px',transform:`scale(${pop(a)})`}}/>
  <ellipse cx="280" cy="310" rx="30" ry={blink} fill={INK}/><ellipse cx="460" cy="310" rx="30" ry={blink} fill={INK}/>
  <circle cx="220" cy="420" r="34" fill="#ff8a8a" opacity=".7"/><circle cx="520" cy="420" r="34" fill="#ff8a8a" opacity=".7"/>
  <path d="M220 430 Q370 600 520 430" fill="none" stroke={INK} strokeWidth="22" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={draw(.15,.5)}/></g>);}
 if(name==='laugh')return svg(<>{[[190,230,'#fff',-10],[480,330,accent,8],[300,540,'#ffd23f',-4]].map(([x,y,c,r],k)=>{const p=pop(a,k*.28);return <g key={k} style={{transformOrigin:`${x}px ${y}px`,transform:`scale(${p}) rotate(${(r as number)+Math.sin(a*8+k)*6}deg)`}}><rect x={(x as number)-150} y={(y as number)-80} width="300" height="160" rx="80" fill={c as string} stroke={INK} strokeWidth="8"/><text x={x as number} y={(y as number)+42} textAnchor="middle" fontSize="120" fill={INK} style={font}>HA</text></g>;})}</>);
 if(name==='bus'||name==='wires'){
  const big=name==='bus'&&m>=0?interpolate(m,[0,.5],[0,1],back):0;
  const s=(name==='bus'?.8+.24*big:.86)*pop(a,0,.45);
  const bus=<g style={{transformOrigin:'370px 560px',transform:`translateY(${Math.sin(a*14)*3}px) scale(${s})`}}>
   {name==='bus'&&[0,1,2,3].map(k=><line key={k} x1={20+rnd(k)*30} x2={70+rnd(k)*30} y1={300+k*50} y2={300+k*50} stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity={.3+.6*mod(a*3+k*.3,1)}/>)}
   <rect x="100" y="250" width="540" height="250" rx="46" fill="#fff" stroke={INK} strokeWidth="10"/>
   <rect x="100" y="420" width="540" height="30" fill={accent}/>
   {[0,1,2,3].map(k=><rect key={k} x={130+k*100} y="285" width="80" height="95" rx="12" fill="#9fdcff" stroke={INK} strokeWidth="6"/>)}
   <rect x="545" y="285" width="70" height="190" rx="10" fill="#9fdcff" stroke={INK} strokeWidth="6"/>
   <circle cx="630" cy="472" r="13" fill="#ffd23f"/>
   {name==='wires'&&<><line x1="300" y1="250" x2="360" y2="150" stroke={INK} strokeWidth="8"/><line x1="440" y1="250" x2="380" y2="150" stroke={INK} strokeWidth="8"/></>}
   {[220,520].map(x=><g key={x} transform={`rotate(${a*720} ${x} 505)`}><circle cx={x} cy="505" r="54" fill={INK}/><circle cx={x} cy="505" r="22" fill="#ccd"/><line x1={x-40} y1="505" x2={x+40} y2="505" stroke="#ccd" strokeWidth="6"/></g>)}
  </g>;
  if(name==='bus')return svg(<><line x1="0" y1="590" x2="740" y2="590" stroke="#fff" strokeWidth="10" strokeDasharray="60 40" strokeDashoffset={a*500} opacity=".8"/>{bus}</>);
  const sparkOn=a>.35;
  return svg(<>
   {[60,654].map(x=><g key={x}><rect x={x} y="60" width="26" height="620" fill="#7a5532"/><rect x={x-50} y="90" width="126" height="18" fill="#7a5532"/></g>)}
   {[0,1,2].map(k=><path key={k} d={`M${45+k*40} 99 Q370 ${180+k*14+Math.sin(a*7+k)*(sparkOn?18:6)} ${700-k*40} 99`} fill="none" stroke="#cfd6ff" strokeWidth="5"/>)}
   <g transform="translate(0 30)">{bus}</g>
   {sparkOn&&<>{Array.from({length:16},(_,k)=>{const ang=k*Math.PI/8+rnd(k),d=mod(a*2.6+k*.13,1)*190;return <circle key={k} cx={370+Math.cos(ang)*d} cy={185+Math.sin(ang)*d} r={9*(1-d/190)+2} fill={k%3?'#ffd23f':'#fff'}/>;})}
    <polygon points="400,110 340,200 385,200 330,300 440,180 392,180 440,110" fill="#ffd23f" stroke="#fff" strokeWidth="5" opacity={Math.sin(a*26)>.1?1:.15}/></>}
  </>);
 }
 if(name==='blocks'){const busX=interpolate(a,[0,2.3],[40,560],ease);return svg(<>
  <rect x="20" y="330" width="700" height="90" rx="20" fill="#1b2a8a"/><line x1="40" y1="375" x2="700" y2="375" stroke="#fff" strokeWidth="6" strokeDasharray="40 30"/>
  {[0,1,2,3].map(i=>{const lit=busX>80+i*140;const p=pop(a,.1+i*.12);return <g key={i} style={{transformOrigin:`${100+i*140}px 250px`,transform:`scale(${p})`}}><rect x={45+i*140} y="190" width="115" height="120" rx="14" fill={lit?accent:'#0b1660'} stroke={accent} strokeWidth="6"/><text x={102+i*140} y="275" textAnchor="middle" fontSize="70" fill={lit?INK:'#fff'} style={font}>{4-i}</text><rect x={45+i*140} y="440" width="115" height="110" rx="14" fill="#0b1660" stroke="#2c3fb0" strokeWidth="4"/></g>;})}
  <g transform={`translate(${busX} 345)`}><rect width="100" height="56" rx="14" fill="#fff" stroke={INK} strokeWidth="6"/><rect x="10" y="10" width="60" height="20" rx="4" fill="#9fdcff"/></g>
  <g style={{transformOrigin:'690px 330px',transform:`scale(${pop(a,.3)}) translateY(${-Math.abs(Math.sin(a*4))*14}px)`}}><path d="M690 330 C640 270 640 200 690 190 C740 200 740 270 690 330z" fill="#ff4d4d" stroke="#fff" strokeWidth="6"/><circle cx="690" cy="235" r="18" fill="#fff"/></g>
  <text x="640" y="640" textAnchor="middle" fontSize="64" fill="#fff" style={{...font,opacity:pop(a,.5)}}>PROVA</text></>);}
 if(name==='clock'){const min=interpolate(a,[0,1.3],[-1080,0],ease),alarm=a>1.3?Math.sin(a*45)*3:0;return svg(<g style={{transformOrigin:'370px 380px',transform:`scale(${pop(a)}) rotate(${alarm}deg)`}}>
  <circle cx="370" cy="380" r="300" fill="none" stroke="#ff4d4d" strokeWidth="18" pathLength={1} strokeDasharray="1" strokeDashoffset={1-interpolate(a,[0,2.2],[0,1],clamp)} transform="rotate(-90 370 380)"/>
  <circle cx="370" cy="380" r="270" fill="#fff" stroke={INK} strokeWidth="14"/>
  {Array.from({length:12},(_,k)=><line key={k} x1="370" y1="135" x2="370" y2={k%3?160:180} stroke={INK} strokeWidth={k%3?6:12} transform={`rotate(${k*30} 370 380)`}/>)}
  <line x1="370" y1="380" x2="370" y2="260" stroke={INK} strokeWidth="18" strokeLinecap="round" transform={`rotate(${min/12+300} 370 380)`}/>
  <line x1="370" y1="380" x2="370" y2="170" stroke={accent} strokeWidth="12" strokeLinecap="round" transform={`rotate(${min} 370 380)`}/>
  <circle cx="370" cy="380" r="20" fill={INK}/>
  {a>1.3&&[0,1].map(k=><path key={k} d={k?'M640 150 q40 -10 60 -50':'M100 150 q-40 -10 -60 -50'} fill="none" stroke="#ffd23f" strokeWidth="12" strokeLinecap="round" opacity={mod(a*4,1)>.4?1:.2}/>)}</g>);}
 // suitcase
 return svg(<>{[0,1].map(k=>{const y=-Math.abs(Math.sin(a*7+k*1.6))*55;const x=k?400:110;return <g key={k} style={{transformOrigin:`${x+115}px 520px`,transform:`translateY(${y}px) rotate(${Math.sin(a*7+k)*7}deg) scale(${pop(a,k*.15)})`}}>
  <path d={`M${x+75} 300 v-50 a20 20 0 0 1 20 -20 h40 a20 20 0 0 1 20 20 v50`} fill="none" stroke={INK} strokeWidth="16"/>
  <rect x={x} y="300" width="230" height="260" rx="30" fill={k?accent:'#ff8a3d'} stroke={INK} strokeWidth="10"/>
  <rect x={x+60} y="300" width="18" height="260" fill={INK} opacity=".35"/><rect x={x+152} y="300" width="18" height="260" fill={INK} opacity=".35"/></g>;})}
  {[0,1,2].map(k=><line key={k} x1={20} x2={90} y1={380+k*60} y2={380+k*60} stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity={.25+.6*mod(a*3+k*.33,1)}/>)}
  {[0,1,2].map(k=><circle key={'d'+k} cx={150+k*230+mod(a*120,60)} cy={650} r={18+mod(a*2+k*.4,1)*30} fill="#fff" opacity={.35*(1-mod(a*2+k*.4,1))}/>)}</>);
};

const Glyph:React.FC<{k:number;color:string}>=({k,color})=>{
 const s=['M50 10 L90 90 L10 90Z','M40 10h20v30h30v20h-30v30h-20v-30h-30v-20h30z','M55 5 L25 55 h22 L35 95 L78 40 h-23 L68 5z'][k%3];
 return k%4===3?<svg width="100" height="100"><circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="10"/></svg>:<svg width="100" height="100"><path d={s} fill={color}/></svg>;
};

export const MotionTunelNarrativo:React.FC<TunelNarrativoProps>=(props)=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=frame/fps;
 const accent=props.palette?.accent??'#00d0b8';
 const tunnel=props.tunnels.find(s=>t>=s.from&&t<s.to);
 const outro=props.outro&&t>=props.outro.from?props.outro:undefined;
 const shot=props.speakerShots?.find(s=>t>=s.from&&t<s.to);
 const hit=(props.punchTimes??[]).filter(x=>x<=t).at(-1)??0;
 const zoom=1+interpolate(t-hit,[0,3.5],[.018,.07],ease);
 const starts=[...props.tunnels.map(s=>s.from),...(props.outro?[props.outro.from]:[])];
 const next=starts.find(x=>x>t&&x-t<.25);
 const suck=next!==undefined?interpolate(t,[next-.25,next],[0,1],easeIn):0;
 const blocks=useCaptionBlocks(props.words,props.keywords,props.phrases??[]);
 const blockIndex=blocks.findIndex((g,i)=>t*1000>=g.words[0].startMs&&t*1000<(blocks[i+1]?.words[0].startMs??g.words.at(-1)!.endMs+150));
 const lines=blocks[blockIndex]?.lines??[];
 const library=props.tunnelAssets??[];
 const video=(style:React.CSSProperties)=>t<props.videoEnd?<OffthreadVideo src={staticFile(props.video)} muted={!!props.audioMix} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(shot?.x??.5)*100}% 50%`,...style}}/>:null;

 // ---- túnel ----
 const tAge=tunnel?t-tunnel.from:0;
 const beats=tunnel?.beats??[];
 const bi=Math.max(0,beats.reduce((acc,b,i)=>b.at<=t?i:acc,-1));
 const beat=beats[bi];
 const bAge=beat?Math.max(0,t-beat.at):0;
 const nextAt=beats[bi+1]?.at??tunnel?.to??0;
 const exitP=tunnel?interpolate(t,[tunnel.to-.4,tunnel.to],[0,1],easeIn):0;
 const beatOut=bi===beats.length-1?exitP:interpolate(t,[nextAt-.3,nextAt],[0,1],easeIn);
 const recede=tunnel?interpolate(tAge,[0,.45],[0,1],ease):0;
 const arrive=beat?spring({frame:Math.max(0,bAge-(bi===0?.18:0))*fps,fps,config:{damping:11,stiffness:110,mass:.8}}):0;
 const surge=beats.slice(1).reduce((acc,b)=>acc+450*interpolate(t,[b.at-.3,b.at+.3],[0,1],ease),0);
 const travel=tAge*SPEED+surge+(beat?.fx==='speed'?bAge*700:0)+exitP*exitP*1350-(1-recede)*450;
 const pulse=tunnel?Math.max(0,...props.words.filter(w=>w.startMs/1000<=t&&w.startMs/1000>=tunnel.from-.05).map(w=>Math.exp(-(t-w.startMs/1000)*7))):0;
 const shake=beat?.fx==='shake'?26*Math.exp(-bAge*5):0;
 const roll=Math.sin(tAge*.55)*5;
 const turn=interpolate(bAge,[0,.5,2.5],[-28,-8,12],ease)*(bi%2?-1:1);
 const heroZ=-3000*(1-arrive)+beatOut*beatOut*1400;
 const heroO=interpolate(arrive,[0,.15],[0,1],clamp)*interpolate(beatOut,[.5,.95],[1,0],clamp);
 const speaker=tunnel?interpolate(tAge,[.25,.85],[0,1],back)*(1-interpolate(exitP,[0,.6],[0,1],clamp)):0;

 const rings=(trav:number,o0=1)=>Array.from({length:16},(_,i)=>{
  const z=-mod(i*300-trav,DEPTH);const o=interpolate(z,[-DEPTH,-3600,-260,40],[0,1,1,0],clamp);const strong=i%3===0;
  return <div key={'r'+i} style={{position:'absolute',left:CX-520,top:CY-520,width:1040,height:1040,borderRadius:i%2?'50%':120,border:`${strong?9:4}px solid ${strong?accent:'#ffffff'}`,opacity:o0*o*(strong?.95:.32)*(.75+pulse*.25),boxShadow:strong?`0 0 ${30+pulse*60}px ${accent}, inset 0 0 ${20+pulse*40}px ${accent}66`:'none',transform:`translate3d(0,0,${z}px) rotateZ(${i*11+t*21*(bi%2?-1:1)}deg) scale(${1+pulse*.035})`}}/>;
 });
 const walls=(trav:number)=><>
  {Array.from({length:18},(_,j)=>{const src=library[j%Math.max(1,library.length)];if(!src)return null;
   const z=-mod(j*270-trav*1.15,DEPTH+60);const ang=(j*137.5+t*10)*Math.PI/180,r=420+(j%3)*90,size=260+(j%4)*45;
   const o=interpolate(z,[-DEPTH,-3500,-420,-120],[0,.95,.95,0],clamp);
   return <Img key={'w'+j} src={staticFile(src)} style={{position:'absolute',left:CX+Math.cos(ang)*r-size/2,top:CY+Math.sin(ang)*r*1.45-size/2,width:size,height:size,objectFit:'contain',opacity:o,filter:`${props.palette?.assetFilter??''} saturate(.8) brightness(1.1) drop-shadow(0 0 18px ${accent}66)`,transform:`translate3d(0,0,${z}px) rotateZ(${(j%2?1:-1)*(t*45+j*30)}deg) rotateY(${Math.sin(t*1.5+j)*35}deg)`}}/>;})}
  {Array.from({length:14},(_,j)=>{const z=-mod(j*345+130-trav*1.3,DEPTH);const ang=(j*97+t*16)*Math.PI/180,r=330+(j%4)*120;
   const o=interpolate(z,[-DEPTH,-3600,-300,-60],[0,.9,.9,0],clamp);
   return <div key={'g'+j} style={{position:'absolute',left:CX+Math.cos(ang)*r-50,top:CY+Math.sin(ang)*r*1.5-50,opacity:o,transform:`translate3d(0,0,${z}px) rotateZ(${t*90*(j%2?1:-1)}deg) scale(${1.2+(j%3)*.4})`}}><Glyph k={j} color={j%2?accent:'#fff'}/></div>;})}
  {Array.from({length:60},(_,j)=>{const z=-mod(j*80-trav*1.6,DEPTH);const x=(rnd(j)-.5)*1700,y=(rnd(j+99)-.5)*2600;
   return <div key={'s'+j} style={{position:'absolute',left:CX+x,top:CY+y,width:8,height:8,borderRadius:4,background:j%5?'#fff':accent,opacity:interpolate(z,[-DEPTH,-3000,-100,0],[0,.8,.8,0],clamp),transform:`translate3d(0,0,${z}px)`}}/>;})}
 </>;
 const caption=(subset:typeof lines,startIndex:number,inTunnel:boolean)=>subset.map((l,j)=>{
  const idx=j+startIndex;const strong=l.strong||(!lines.some(x=>x.strong)&&idx===1);
  const text=l.words.map(w=>w.text).join(' ');const start=l.words[0].startMs/1000;
  const p=interpolate(t-start,[0,.16],[0,1],ease);
  const size=strong?(text.includes(' ')?(inTunnel?96:115):Math.min(inTunnel?108:123,1510/Math.max(1,text.length))):(inTunnel?64:84);
  return <div key={start} style={{fontFamily:strong?'EditorialSans':'EditorialSerif',fontSize:size,fontWeight:700,lineHeight:strong?.99:1.08,letterSpacing:strong?-3:-1.5,opacity:p,color:strong&&inTunnel?'#fff':undefined,transform:`translateY(${(1-p)*26}px) scale(${.9+.1*p})`,filter:`blur(${(1-p)*5}px)`,textShadow:inTunnel&&strong?`0 0 ${18+pulse*20}px ${accent}88`:'0 2px 5px #0005',marginBottom:strong?1:3}}>{text}</div>;
 });
 const orbit=(front:boolean)=>library.slice(0,6).map((src,k)=>{const ang=t*1.1+k*Math.PI/3;const depth=Math.sin(ang);if((depth>0)!==front)return null;
  const size=150+depth*40;return <Img key={'o'+k} src={staticFile(src)} style={{position:'absolute',left:CX+Math.cos(ang)*470-size/2,top:1420+depth*70-size/2,width:size,height:size,objectFit:'contain',opacity:speaker*(.55+.45*(depth+1)/2),filter:`${props.palette?.assetFilter??''} drop-shadow(0 0 14px ${accent}88)`,transform:`rotate(${t*40+k*60}deg)`}}/>;});

 return <AbsoluteFill style={{background:'#01020f',overflow:'hidden'}}>
 <style>{`@font-face{font-family:EditorialSans;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:EditorialSerif;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}')}`}</style>
 {props.audioMix&&<Audio src={staticFile(props.audioMix)}/>}
 {!tunnel&&!outro&&<>
  {video({transform:`scale(${zoom*(1+suck*.55)}) rotate(${suck*-4}deg)`,transformOrigin:'50% 46%',filter:`blur(${suck*9}px) brightness(${1+suck*.4})`})}
  <AbsoluteFill style={{background:'linear-gradient(transparent 44%,#0003 59%,#0005 88%)'}}/>
  {suck>0&&<AbsoluteFill style={{background:`radial-gradient(circle at 50% 46%,transparent ${60-suck*40}%,${accent}55 ${80-suck*30}%,#01020f 100%)`,opacity:suck}}/>}
  <div style={{position:'absolute',left:95,width:890,top:1040,textAlign:'center',color:'#fff',textShadow:'0 2px 5px #0005'}}>{caption(lines,0,false)}</div>
 </>}
 {tunnel&&beat&&<AbsoluteFill style={{translate:`${shake*Math.sin(frame*1.9)}px ${shake*Math.cos(frame*2.3)}px`}}>
  <AbsoluteFill style={{background:'radial-gradient(circle at 50% 45%,#16288f 0%,#070d4a 32%,#02041a 70%,#01020f 100%)'}}/>
  <AbsoluteFill style={{background:`radial-gradient(circle at 50% 45%,${accent}${Math.round(40+pulse*90).toString(16).padStart(2,'0')} 0%,transparent 26%)`}}/>
  <AbsoluteFill style={{perspective:900,perspectiveOrigin:`${CX+Math.sin(tAge*.4)*60}px ${CY}px`}}>
   <AbsoluteFill style={{transformStyle:'preserve-3d',rotate:`${roll}deg`}}>
    {rings(travel)}{walls(travel)}
   </AbsoluteFill>
  </AbsoluteFill>
  {beat.fx==='speed'||exitP>0||beatOut>0?<svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:Math.max(beat.fx==='speed'?.9:0,exitP,beatOut*.7)}}>{Array.from({length:44},(_,k)=>{const ang=k*8.18*Math.PI/180+k,ph=mod(tAge*2+k*.137,1),r1=120+ph*1500,r2=r1+90+ph*380;return <line key={k} x1={CX+Math.cos(ang)*r1} y1={CY+Math.sin(ang)*r1} x2={CX+Math.cos(ang)*r2} y2={CY+Math.sin(ang)*r2} stroke={k%4?'#ffffff':accent} strokeWidth={2+ph*5} strokeLinecap="round" opacity={ph*.8}/>;})}</svg>:null}
  {/* falante recortado, com contorno de adesivo e órbita de assets */}
  {props.cutout&&<>
   {orbit(false)}
   <svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:speaker}}><ellipse cx={CX} cy="1420" rx="470" ry="70" fill="none" stroke={accent} strokeWidth="6" strokeDasharray="30 22" strokeDashoffset={-t*80} opacity=".7"/></svg>
   <div style={{position:'absolute',left:0,top:960,width:1080,height:1012,opacity:interpolate(speaker,[0,.3],[0,1],clamp),transform:`translateY(${(1-speaker)*420}px) scale(${1+pulse*.012})`,transformOrigin:'50% 100%',maskImage:'linear-gradient(#000 70%,transparent 94%)',WebkitMaskImage:'linear-gradient(#000 70%,transparent 94%)'}}>
    <div style={{width:'100%',height:'100%',filter:`drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 0 ${28+pulse*30}px ${accent})`}}>
     {t<props.videoEnd&&<OffthreadVideo src={staticFile(props.cutout)} transparent muted style={{width:'100%',height:'100%'}}/>}
    </div>
   </div>
   {orbit(true)}
  </>}
  {/* arte da narração no centro do túnel */}
  <AbsoluteFill style={{perspective:900,perspectiveOrigin:`${CX}px 740px`}}>
   <div style={{position:'absolute',left:CX-260,top:740-260,width:520,height:520,opacity:heroO,transform:`translate3d(0,0,${heroZ}px) rotateY(${turn*.6+Math.sin(bAge*3)*8}deg) rotateZ(${turn*(beat.kind==='code'?.3:1)}deg) scale(${1+pulse*.05+bAge*.015})`}}>
    {beat.kind==='code'&&beat.code?<div style={{width:740,height:740,transform:'scale(.7027)',transformOrigin:'0 0',filter:`drop-shadow(0 0 ${24+pulse*30}px ${accent}99) drop-shadow(0 20px 18px #0008)`}}><CodeArt name={beat.code} a={bAge} m={beat.markAt!==undefined?t-beat.markAt:-1} accent={accent}/></div>
     :beat.kind==='photo'?<Img src={staticFile(beat.src!)} style={{width:520,height:520,objectFit:'cover',borderRadius:36,border:`6px solid ${accent}`,boxShadow:`0 0 60px ${accent}88`}}/>
     :<Img src={staticFile(beat.src!)} style={{width:520,height:520,objectFit:'contain',filter:`${beat.keepColor?'':props.palette?.assetFilter??''} saturate(.9) drop-shadow(0 0 ${30+pulse*40}px ${accent}aa) drop-shadow(0 24px 22px #0008)`}}/>}
   </div>
   {(recede<1||exitP>0)&&<div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:interpolate(Math.max(1-recede,exitP),[0,1],[90,0]),border:`6px solid ${accent}`,boxShadow:`0 0 50px ${accent}`,opacity:exitP>0?interpolate(exitP,[0,.25],[0,1],clamp):interpolate(recede,[.7,1],[1,0],clamp),transform:`translate3d(0,0,${exitP>0?-2600*(1-exitP):-2600*recede}px) rotateZ(${exitP>0?(1-exitP)*14:recede*-14}deg)`}}>{video({})}</div>}
  </AbsoluteFill>
  <div style={{position:'absolute',left:80,width:920,top:150,textAlign:'center',color:'#cfd6ff',opacity:1-exitP}}>{caption(lines,0,true)}</div>
  <AbsoluteFill style={{background:'#fff',opacity:interpolate(bAge,[0,.04,.16],[0,beat.fx==='shake'?.9:.18,0],clamp),mixBlendMode:'screen'}}/>
 </AbsoluteFill>}
 {outro&&(()=>{const o=t-outro.from;const land=spring({frame:Math.max(0,o-.35)*fps,fps,config:{damping:12,stiffness:120}});
  return <AbsoluteFill>
   <AbsoluteFill style={{background:'radial-gradient(circle at 50% 45%,#16288f 0%,#070d4a 35%,#01020f 100%)'}}/>
   <AbsoluteFill style={{background:`conic-gradient(from ${o*40}deg at 50% 45%,${accent}22 0deg,transparent 15deg,${accent}22 30deg,transparent 45deg,${accent}22 60deg,transparent 75deg,${accent}22 90deg,transparent 105deg,${accent}22 120deg,transparent 135deg,${accent}22 150deg,transparent 165deg,${accent}22 180deg,transparent 195deg,${accent}22 210deg,transparent 225deg,${accent}22 240deg,transparent 255deg,${accent}22 270deg,transparent 285deg,${accent}22 300deg,transparent 315deg,${accent}22 330deg,transparent 345deg)`,opacity:land}}/>
   <AbsoluteFill style={{perspective:900,perspectiveOrigin:`${CX}px ${CY}px`}}><AbsoluteFill style={{transformStyle:'preserve-3d'}}>
    {rings(o*2600+o*o*900,interpolate(o,[.9,1.6],[1,.25],clamp))}{walls(o*2200)}
    {outro.src&&<Img src={staticFile(outro.src)} style={{position:'absolute',left:CX-300,top:CY-300,width:600,height:600,objectFit:'contain',filter:props.palette?.assetFilter,opacity:interpolate(o,[0,.1,.6,.75],[0,1,1,0],clamp),transform:`translate3d(0,0,${interpolate(o,[0,.75],[-2600,900],easeIn)}px) rotateZ(${o*120}deg)`}}/>}
   </AbsoluteFill></AbsoluteFill>
   {Array.from({length:36},(_,k)=>{const age=o-.55;if(age<0)return null;const ang=rnd(k)*Math.PI*2,v=500+rnd(k+7)*900;return <div key={k} style={{position:'absolute',left:CX+Math.cos(ang)*v*age,top:CY+Math.sin(ang)*v*age+300*age*age,width:18,height:10,background:k%3?accent:k%2?'#fff':'#ffd23f',opacity:interpolate(age,[0,1.6],[1,0],clamp),rotate:`${age*600+k*40}deg`}}/>;})}
   <Img src={staticFile(outro.brand)} style={{position:'absolute',left:CX-280,top:CY-280,width:560,height:560,objectFit:'contain',opacity:interpolate(land,[0,.2],[0,1],clamp),transform:`perspective(900px) translateZ(${-2800*(1-land)}px) translateY(${Math.sin(o*2.2)*10}px) rotateY(${(1-land)*60}deg)`,filter:`drop-shadow(0 0 ${40+30*Math.exp(-Math.max(0,o-.6)*4)}px ${accent})`}}/>
   <AbsoluteFill style={{background:'#fff',opacity:interpolate(o,[.55,.62,.85],[0,.55,0],clamp),mixBlendMode:'screen'}}/>
   <div style={{position:'absolute',top:260,width:'100%',textAlign:'center',color:'#fff'}}>
    <div style={{fontFamily:'EditorialSerif',fontSize:84,fontWeight:700,color:'#cfd6ff',opacity:pop(o,.75),transform:`translateY(${(1-pop(o,.75))*30}px)`}}>{outro.small}</div>
    <div style={{fontFamily:'EditorialSans',fontSize:150,fontWeight:700,letterSpacing:-5,lineHeight:.95,opacity:interpolate(o,[1,1.2],[0,1],clamp),transform:`scale(${pop(o,1)})`,textShadow:`0 0 30px ${accent}aa`}}>{outro.big}</div>
   </div>
   <div style={{position:'absolute',top:1260,width:'100%',textAlign:'center',fontFamily:'EditorialSans',fontWeight:700,fontSize:58,letterSpacing:interpolate(o,[1.3,2],[40,12],ease),color:'#fff',opacity:interpolate(o,[1.3,1.6],[0,1],clamp)}}>{outro.brandName??''}</div>
   <div style={{position:'absolute',top:1350,left:CX-interpolate(o,[1.4,2],[0,260],ease),width:interpolate(o,[1.4,2],[0,520],ease),height:8,borderRadius:4,background:accent,boxShadow:`0 0 20px ${accent}`}}/>
  </AbsoluteFill>;})()}
 {!outro&&<Img src={marca(props.brand?.src)} style={{position:'absolute',right:60,top:66,width:75,height:75,opacity:.75}}/>}
 </AbsoluteFill>;
};
