import React from 'react';
import {rioNiteroiPaths} from './rioNiteroiMap';
import {seg, easeOut3, RNG} from './sketchKit';
import type {ArtEvent, SketchPalette} from './sketchArt';
export type DarkArtKind='pdfScreen'|'rioMap'|'emotion'|'posse'|'postits';
export const isDarkArt=(k:string):k is DarkArtKind=>['pdfScreen','rioMap','emotion','posse','postits'].includes(k);
export const CadernoDarkArt:React.FC<{kind:DarkArtKind;age:number;t:number;events:ArtEvent[];pal:SketchPalette;label?:string;personName?:string}> = ({kind,age,t,events,pal,label,personName})=>{
 const event=(k:string)=>events.find(e=>e.kind===k&&e.at<=t);
 const elapsed=(k:string)=>event(k)?t-event(k)!.at:-1;
 const reveal=seg(age,0,.8),turq=pal.accent,white=pal.ink;
 const text=(s:string,x:number,y:number,size=42,color=white)=> <text x={x} y={y} textAnchor="middle" fill={color} fontFamily="EditorialSans" fontSize={size}>{s}</text>;
 if(kind==='pdfScreen'){
  const search=elapsed('search'),highlight=elapsed('highlight'),p=seg(search,0,.8),h=seg(highlight,0,.5);
  return <g opacity={reveal} transform={`translate(0,${(1-easeOut3(reveal))*45})`}>
   <rect x={-465} y={-360} width={930} height={650} rx={24} fill="#080e2c" stroke={white} strokeWidth={5}/>
   <rect x={-450} y={-345} width={900} height={52} rx={10} fill="#172250"/>
   {[0,1,2].map(i=><circle key={i} cx={-420+i*27} cy={-320} r={7} fill={i===0?turq:'#647292'}/>)}
   {text('convocação.pdf',40,-307,25)}
   <rect x={-215} y={-260} width={480} height={490} fill="#edf3fa" rx={4}/>
   {text(label??'CONVOCAÇÃO',25,-205,27,'#000068')}
   {Array.from({length:9},(_,i)=><g key={i}><rect x={-175} y={-170+i*40} width={350-(i%3)*35} height={8} rx={4} fill="#a4b0c5"/><rect x={-175} y={-155+i*40} width={225} height={5} rx={2} fill="#c8d0df"/></g>)}
   <rect x={-190} y={-20} width={425} height={42} rx={5} fill={turq} opacity={h*.85}/>
   <g opacity={p}><rect x={15} y={-277} width={410} height={69} rx={12} fill="#24366c" stroke={turq} strokeWidth={3}/>{text('Buscar: '+(personName?.split(' ')[0]??'meu nome'),220,-234,27)}</g>
   <g opacity={h}>{text(personName??'MEU NOME',25,8,24,'#000068')}<circle cx={390} cy={150} r={43} fill={turq}/><path d="M365 150 l17 18 34-39" fill="none" stroke="#000068" strokeWidth={9}/></g>
   <path d="M-65 292 v60 h130 v-60 M-190 360 h380" fill="none" stroke={white} strokeWidth={9} strokeLinecap="round"/>
  </g>;
 }
 if(kind==='rioMap'){
  const p=seg(elapsed('route'),0,2.6),x=(1-p)*(1-p)*194+2*(1-p)*p*80-p*p*46,y=(1-p)*(1-p)*(-12)+2*(1-p)*p*(-70)+p*p*44;
  return <g opacity={reveal}>
   <defs><clipPath id="guanabara-clip"><rect x={-450} y={-450} width={900} height={900} rx={24}/></clipPath></defs>
   <g clipPath="url(#guanabara-clip)"><rect x={-450} y={-450} width={900} height={900} fill="#000068"/>
    {rioNiteroiPaths.map((d,i)=><path key={i} d={d} fill="#192748" stroke="#6b8cab" strokeWidth={3}/>)}
    <path d="M194 -12 Q80 -70 -46 44" fill="none" stroke={turq} strokeWidth={8} pathLength={1} strokeDasharray={1} strokeDashoffset={1-p}/>
    <g opacity={p>0?1:0} transform={`translate(${x},${y-40})`}><path d="M-28 0 h56 l-9 19 h-38 Z M-18 -4 v-18 h36 v18" fill={turq}/><rect x={-11} y={-18} width={8} height={7} fill="#000068"/><rect x={5} y={-18} width={8} height={7} fill="#000068"/></g>
    {[[-46,44],[194,-12]].map(([a,b],i)=><g key={i}><circle cx={a} cy={b} r={22+Math.sin(t*2)*3} fill={turq} opacity={.15}/><circle cx={a} cy={b} r={10} fill={turq}/></g>)}
   </g>
   {text('Rio de Janeiro',-220,180,37)}{text('Niterói',285,110,42)}{text('Baía de Guanabara',35,-260,30,'#819ab8')}
   {text('Barcas',80,315,35,turq)}{text('Malhas: IBGE • travessia esquemática',0,430,18,'#819ab8')}
  </g>;
 }
 if(kind==='emotion'){
  const pulse=1+.04*Math.sin(age*4),happy=!!event('calm');
  return <g opacity={reveal}><g transform={`scale(${pulse})`}><path d="M0 245 C-490 -45 -300 -350 0 -130 C300 -350 490 -45 0 245Z" fill="#000068" stroke={turq} strokeWidth={10}/>
   <path d="M-280 15 h115 l45 -90 60 185 52-120 h278" fill="none" stroke={white} strokeWidth={7} pathLength={1} strokeDasharray={1} strokeDashoffset={1-seg(age,.3,1.8)}/></g>
   {!happy?[0,1].map(i=><path key={i} d="M0 -20 Q-30 20 0 32 Q30 20 0 -20" fill={turq} opacity={.55} transform={`translate(${i?340:-340},${-30+40*Math.sin(age*1.3+i)})`}/>):null}
   {text(happy?'valeu a pena':label??'eu não acreditei',0,365,44)}
  </g>;
 }
 if(kind==='postits'){
  const store=seg(elapsed('store'),0,1.4);
  return <g opacity={reveal}>{Array.from({length:6},(_,i)=><g key={i} transform={`translate(${(-240+(i%3)*240)*(1-store)},${(-230+Math.floor(i/3)*260)*(1-store)+store*200}) rotate(${(i%2?5:-5)*(1-store)})`} opacity={1-store*.7}>
   <rect x={-90} y={-90} width={180} height={180} rx={3} fill={i%2?'#000068':turq} stroke={white} strokeWidth={2}/>
   {[0,1,2].map(j=><line key={j} x1={-60} y1={-35+j*35} x2={55-j*10} y2={-35+j*35} stroke={i%2?turq:'#000068'} strokeWidth={6}/>)}</g>)}
   <g opacity={store}><rect x={-290} y={135} width={580} height={215} rx={12} fill="#1c2d55" stroke={turq} strokeWidth={5}/>{text('fichas',0,267,46)}</g>
  </g>;
 }
 const sign=seg(elapsed('sign'),0,1.1),celebrate=seg(elapsed('celebrate'),0,.6),R=RNG('posse');
 return <g opacity={reveal}>
  <rect x={-305} y={-430} width={610} height={800} rx={13} fill="#101d3a" stroke={white} strokeWidth={5}/>
  {text('POSSE',0,-300,74,turq)}{text(label??'a conquista',0,-200,48)}
  {[0,1,2].map(i=><line key={i} x1={-215} x2={215-i*40} y1={-105+i*48} y2={-105+i*48} stroke="#667b97" strokeWidth={8}/>)}
  <path d="M-200 140 q40-70 60-20 t55 0 q40-95 60-10 t100-15" fill="none" stroke={turq} strokeWidth={7} pathLength={1} strokeDasharray={1} strokeDashoffset={1-sign}/>
  <g opacity={sign} transform={`translate(190,245) scale(${.6+.4*sign})`}><circle r={78} fill={turq}/><circle r={65} fill="none" stroke="#000068" strokeWidth={4}/><path d="M-35 0 l25 25 48-58" fill="none" stroke="#000068" strokeWidth={12}/></g>
  {Array.from({length:32},(_,i)=>{const angle=R.f()*Math.PI*2,dist=240+R.f()*220;return <rect key={i} x={Math.cos(angle)*dist*celebrate} y={Math.sin(angle)*dist*celebrate} width={7+R.f()*8} height={18} fill={i%3?turq:white} opacity={celebrate*.85} transform={`rotate(${i*23})`}/>;})}
 </g>;
};
