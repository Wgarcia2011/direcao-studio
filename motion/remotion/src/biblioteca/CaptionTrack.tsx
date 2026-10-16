import React from 'react';
import {EditorialVariation} from './EditorialVariation';
import {interpolate,staticFile,useVideoConfig} from 'remotion';
import type {Word} from './MotionTypes';
import {activeCaption,displayedWord,editorialFocus,type CaptionStyle} from './captionTiming';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export const CaptionTrack:React.FC<{words:Word[];t:number;c:CaptionStyle;policy?:string}>=({words,t,c,policy='keep'})=>{
  const {width,height,fps}=useVideoConfig();
  if(!c.enabled||policy==='hide')return null;
  const {active,preset:id}=activeCaption(words,t,c);
  if(!active)return null;
  if(id.startsWith('tipo-'))return <EditorialVariation active={active} id={id} t={t} c={c} policy={policy}/>;
  if(id==='editorial-misto'){
    const focus=editorialFocus(active),unit=Math.min(width,height)/1080*c.size/100;
    const enter=interpolate((t-active[0].s)*fps,[0,6],[10,0],clamp);
    const word=(i:number,hero=false)=>{
      const w=active[i],text=displayedWord(w.w,c),current=t>=w.s&&t<w.e;
      const fontSize=hero?Math.min(132*unit,width*.8/Math.max(1,text.length*.59)):64*unit;
      return <span key={i} style={{display:'inline-block',fontFamily:hero?'CaptionEditorial':'Manrope',fontStyle:hero?'italic':'normal',fontWeight:700,fontSize,lineHeight:hero?1.01:1.08,letterSpacing:hero?'-.055em':'-.045em',color:hero?c.accent:'#fff',opacity:t<w.s?.68:1,translate:current?`0 ${interpolate((t-w.s)*fps,[0,5],[4,0],clamp)}px`:undefined,margin:hero?'0 .05em':'0 .09em'}}>{text}</span>;
    };
    const before=focus>=0?active.slice(0,focus):active,after=focus>=0?active.slice(focus+1):[];
    return <div data-caption-preset={id} style={{position:'absolute',top:`${policy==='move'?20:c.position==='upper'?20:c.position==='middle'?50:75}%`,left:'8%',right:'8%',translate:`0 calc(-50% + ${enter}px)`,textAlign:'center',color:'#fff',textShadow:'0 2px 3px #000b, 0 5px 18px #0009',pointerEvents:'none'}}>
      <style>{`@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-700.ttf')}');font-weight:700}@font-face{font-family:CaptionEditorial;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}');font-weight:700;font-style:italic}`}</style>
      {before.length>0?<div style={{lineHeight:1.08}}>{before.map((_,i)=>word(i))}</div>:null}
      {focus>=0?<div style={{marginTop:before.length?-3*unit:0,lineHeight:1.01}}>{word(focus,true)}</div>:null}
      {after.length>0?<div style={{lineHeight:1.08,marginTop:2*unit}}>{after.map((_,i)=>word(focus+1+i))}</div>:null}
    </div>;
  }
  const horizontal=width>height;
  const maxWidth=width*.84;
  const estimated=active.reduce((n,w)=>n+displayedWord(w.w,c).length+1,0);
  const longest=Math.max(...active.map(w=>displayedWord(w.w,c).length));
  const desired=(horizontal?72:58)*(Math.min(width,height)/1080)*c.size/100;
  const size=Math.min(desired,maxWidth/(Math.max(longest,estimated/2)*.69));
  const elapsed=(t-active[0].s)*fps;
  const entry=interpolate(elapsed,[0,5,9],[.9,1.035,1],clamp);
  const upper=c.case==='upper'||(c.case!=='original'&&['impacto','impacto-turquesa','palavra','contorno','cartaz','tarja'].includes(id));
  const pill=['marcador','impacto-turquesa','roxo','tarja'].includes(id);
  const band=['faixa','editorial','cartaz'].includes(id);
  const stroke=['impacto','impacto-turquesa','contorno'].includes(id);
  const luminance=parseInt(c.accent.slice(1,3),16)*.299+parseInt(c.accent.slice(3,5),16)*.587+parseInt(c.accent.slice(5,7),16)*.114;
  const ink=luminance>150?'#10121a':'#ffffff';
  const top=policy==='move'?18:c.position==='upper'?18:c.position==='middle'?48:81;
  return <div data-caption-preset={id} style={{position:'absolute',top:`${top}%`,left:'8%',right:'8%',translate:'0 -50%',textAlign:'center',fontSize:size,fontFamily:id==='cinema'?'Georgia':id==='impacto-turquesa'?'CaptionImpact':'Manrope',fontWeight:id==='cinema'?400:800,fontStyle:id==='cinema'?'italic':'normal',lineHeight:1.3,textTransform:upper?'uppercase':'none',color:'#fff',letterSpacing:'-.02em',textShadow:'0 3px 8px #000',WebkitTextStroke:stroke?`${size*.065}px #050705`:'0px',paintOrder:'stroke fill',overflowWrap:'anywhere'}}>
    <style>{`@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-700.ttf')}');font-weight:700 900}@font-face{font-family:CaptionImpact;src:url('${staticFile('fonts/caption-impact.ttf')}');font-weight:900}`}</style>
    <span style={{display:'inline-block',maxWidth:'100%',background:id==='faixa'?'#10121a':id==='editorial'?'#fff':id==='cartaz'?c.accent:undefined,color:id==='editorial'?'#15101d':id==='cartaz'?ink:undefined,padding:band?'.09em .22em':undefined,rotate:id==='cartaz'?'-2deg':undefined,scale:['pop','cartaz'].includes(id)?entry:1}}>
      {active.map((w,i)=>{
        const current=t>=w.s&&t<w.e,future=t<w.s;
        const wordFrame=(t-w.s)*fps;
        const bounce=interpolate(wordFrame,[0,3,7],[.86,1.12,1],clamp);
        const text=displayedWord(w.w,c);
        return <React.Fragment key={i}><span style={{display:'inline-block',maxWidth:'100%',margin:'0 .04em',padding:pill?'0 .12em':undefined,borderRadius:'.14em',background:current&&pill?(id==='roxo'?'#382252':c.accent):undefined,color:id==='contorno'&&!current?'transparent':id==='duotone'?(current?c.accent:'#fff'):current?(pill?(id==='roxo'?'#fff':ink):id==='cartaz'?ink:c.accent):undefined,WebkitTextStroke:current&&pill?'0px':id==='contorno'&&!current?`${size*.026}px #ffffff`:undefined,textShadow:current&&pill?'none':current&&id==='neon'?`0 2px 12px ${c.accent},0 3px 20px #000`:undefined,visibility:['ritmo','escada'].includes(id)&&future?'hidden':undefined,opacity:future&&['karaoke','minimal'].includes(id)?.55:1,scale:current&&id==='pop'?bounce:current&&id==='impacto'?1.035:1,translate:id==='escada'?`0 ${interpolate(wordFrame,[0,7],[size*.25,0],clamp)}px`:id==='limpo'?`0 ${interpolate(elapsed,[0,8],[size*.1,0],clamp)}px`:undefined,textDecoration:current&&['editorial','faixa','minimal'].includes(id)?'underline':undefined,textDecorationColor:c.accent,textUnderlineOffset:'.12em'}}>{text}</span>{' '}</React.Fragment>;
      })}
    </span>
  </div>;
};
