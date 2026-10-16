import React from 'react';
import {interpolate,staticFile,useVideoConfig} from 'remotion';
import type {Word} from './MotionTypes';
import {displayedWord,editorialFocus,type CaptionStyle} from './captionTiming';
// Palavra da marca que a variacao 22 destaca; por padrao nenhuma (ajuste para a sua marca).
const MARCA=/(?!)/;

// Catalog IDs deliberately remain stable across timeline revisions.
export const EditorialVariation:React.FC<{active:Word[];id:string;t:number;c:CaptionStyle;policy:string}>=({active,id,t,c,policy})=>{
  const {width,height,fps}=useVideoConfig();
  const kind=Number(id.slice(-2)),u=Math.min(width,height)/1080*c.size/100;
  const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
  const elapsed=(t-active[0].s)*fps;
  const progress=interpolate(elapsed,[0,6],[0,1],clamp);
  const firstHero=[24,27].includes(kind);
  const name=active.findIndex(w=>MARCA.test(w.w));
  const semantic=editorialFocus(active);
  const negative=active.findIndex(w=>/^(não|sem)$/i.test(w.w));
  const focus=kind===22&&name>=0?name:kind===24&&negative>=0?negative:firstHero?0:semantic>=0?semantic:active.length-1;
  const inline=kind===11;
  const left=kind===6;
  const heroSize=({2:112,5:142,6:118,11:110,15:118,22:112,23:126,24:108,25:100,27:106,30:86} as Record<number,number>)[kind]||118;
  const supportSize=kind===30?66:kind===5?58:64;
  const straightHero=[2,22,24,27].includes(kind);
  const font=(hero:boolean)=>hero?(straightHero?'CaptionSora':'CaptionEditorial'):kind===2?'CaptionEditorial':'Manrope';
  const italic=(hero:boolean)=>hero?!straightHero:kind===2;
  const draw=(i:number)=>{
    const w=active[i],hero=i===focus,current=t>=w.s&&t<w.e;
    const raw=displayedWord(w.w,c),value=(c.case==='upper'||(hero&&[2,22,24].includes(kind)))?raw.toLocaleUpperCase('pt-BR'):raw;
    const desired=(hero?heroSize:supportSize)*u;
    const inlineWidth=active.reduce((sum,v,j)=>sum+(j===focus?heroSize:supportSize)*(displayedWord(v.w,c).length*.63+.14),0)*u;
    const size=inline?desired*Math.min(1,width*.80/inlineWidth):Math.min(desired,width*.79/Math.max(1,value.length*.63));
    const reveal=[2,5,23,25,27].includes(kind)&&t<w.s;
    return <span key={i} data-word={i} style={{display:'inline-block',fontFamily:font(hero),fontStyle:italic(hero)?'italic':'normal',fontWeight:hero||[6,11,25].includes(kind)?700:400,fontSize:size,lineHeight:1.12,letterSpacing:'-.035em',margin:'0 .07em',color:current?c.accent:hero?c.accent:'#fff',opacity:reveal?0:current?1:t<w.s?.72:.94,textDecoration:hero&&kind===15&&t>=w.s?'underline':undefined,textDecorationThickness:3*u,textUnderlineOffset:'.14em'}}>{value}</span>;
  };
  const before=active.map((_,i)=>i).filter(i=>i<focus),after=active.map((_,i)=>i).filter(i=>i>focus);
  return <div data-caption-preset={id} style={{position:'absolute',top:`${policy==='move'?20:c.position==='upper'?20:c.position==='middle'?50:75}%`,left:'8%',right:'8%',translate:`${left?(1-progress)*-12:0}px calc(-50% + ${kind===30?0:(1-progress)*6}px)`,textAlign:left?'left':'center',textShadow:'0 2px 3px #000c,0 5px 18px #000a',pointerEvents:'none'}}>
    <style>{`@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-400.ttf')}');font-weight:400}@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-700.ttf')}');font-weight:700}@font-face{font-family:CaptionSora;src:url('${staticFile('fonts/sora-700.ttf')}');font-weight:700}@font-face{font-family:CaptionEditorial;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}');font-weight:400 700;font-style:italic}`}</style>
    {inline?<div style={{whiteSpace:'nowrap'}}>{active.map((_,i)=>draw(i))}</div>:<>
      {before.length>0?<div>{before.map(draw)}</div>:null}
      {kind===25&&before.length>0?<div style={{width:72*u,height:2*u,background:c.accent,margin:'8px auto'}}/>:null}
      <div>{draw(focus)}</div>
      {after.length>0?<div style={{textAlign:kind===27?'right':undefined}}>{after.map(draw)}</div>:null}
    </>}
  </div>;
};
