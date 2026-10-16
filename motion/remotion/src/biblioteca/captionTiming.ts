import type {Word} from './MotionTypes';

export type CaptionStyle = {
  enabled:boolean; preset:string; accent:string; size:number; position:string; words:number;
  punctuation?:boolean; case?:'preset'|'original'|'upper'; break_on_punctuation?:boolean;
  highlights?:{start:number;end:number;preset:string;zoom:number}[];
};
export const captionDefaults:CaptionStyle={enabled:true,preset:'marcador',accent:'#4ee2c0',size:100,position:'lower',words:4};
export function groupWords(words:Word[], c:CaptionStyle):Word[][] {
  const groups:Word[][]=[];let current:Word[]=[];
  const count=Math.max(1,Math.min(6,c.words));
  for(const w of words){
    if(!Number.isFinite(w.s)||!Number.isFinite(w.e)||w.e<=w.s||!w.w.trim())continue;
    const last=current[current.length-1];
    if(last&&(current.length>=count||(c.break_on_punctuation!==false&&/[.!?:]["”')]*$/.test(last.w))||w.s-last.e>.45)){
      groups.push(current);current=[];
    }
    current.push(w);
  }
  if(current.length)groups.push(current);
  return groups;
}
export function activeCaption(words:Word[], t:number, c:CaptionStyle) {
  const highlight=c.highlights?.find(h=>t>=h.start&&t<h.end);
  const preset=highlight?.preset||c.preset;
  const groups=groupWords(words,{...c,words:preset==='palavra'?1:c.words});
  const active=groups.find(g=>t>=g[0].s&&t<g[g.length-1].e);
  return {preset,active};
}
export function captionZoom(c:CaptionStyle|undefined,t:number):number {
  if(!c?.enabled)return 1;
  const h=c.highlights?.find(h=>t>=h.start&&t<h.end);
  if(!h)return 1;
  const ramp=Math.min(.22,(h.end-h.start)/3);
  const phase=Math.min(1,(t-h.start)/ramp,(h.end-t)/ramp);
  return 1+(h.zoom-1)*phase*phase*(3-2*phase);
}
export function displayedWord(text:string,c:CaptionStyle):string {
  // Preserve decimal separators and apostrophes/hyphens inside words.
  return c.punctuation===false?text.replace(/^[\p{P}]+|[\p{P}]+$/gu,''):text;
}

export function editorialFocus(words:Word[]):number {
  const quiet=new Set(['muito','muita','muitos','muitas','então','assim','aqui','isso','essa','esse','para','como','todos','todas','minha','tenho','gente','outros','outras','porque','estar','mesmo']);
  let best=-1;
  words.forEach((w,i)=>{const text=w.w.replace(/[^\p{L}]/gu,'').toLocaleLowerCase('pt-BR');
    if(text.length>=5&&!quiet.has(text)&&(best<0||text.length>words[best].w.replace(/[^\p{L}]/gu,'').length))best=i;
  });
  return best;
}
