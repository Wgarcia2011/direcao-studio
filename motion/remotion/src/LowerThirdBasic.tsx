import React,{useEffect,useRef,useState} from 'react';
import {AbsoluteFill,Img,OffthreadVideo,staticFile,useCurrentFrame,interpolate,Easing,delayRender,continueRender,cancelRender} from 'remotion';
import example from '../templates/lower-third-basico.json';

export type Credit = {id:string;name:string;role:string;detail?:string;x:number;width:number;from:number;to:number;primary:boolean};
export type LowerThirdProps = {
 templateId:string;version:number;durationInFrames:number;
 backgroundMode:'synthetic'|'transparent'|'video';videoSrc:string;sourceStartFrame:number;
 logoSrc:string;rocketSrc:string;fontSrc:string;
 rocketMask:null|{viewBox:string;path:string};
 colors:{background:string;accent:string;text:string;role:string};credits:Credit[];
};
export const lowerThirdDemo=example as LowerThirdProps;
// Quadro fixo do template: 16:9, 1920x1080, 30 fps.
export const LT_WIDTH=1920,LT_HEIGHT=1080,LT_FPS=30;
// Entrada termina no frame 37 e a saida ocupa os 30 finais: abaixo disso as fases se sobrepoem.
export const LT_MIN_FRAMES=67;
const MIN_WIDTH=400,TEXT_LEFT=142,TEXT_RIGHT=20,MIN_SCALE=.75;
const ease=Easing.bezier(.2,.75,.2,1);
const tween=(f:number,a:number,b:number,x=0,y=1)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
export const creditFrames=(c:Credit)=>({start:Math.round(c.from*LT_FPS),end:Math.round(c.to*LT_FPS)});

export function validateLowerThird(p:LowerThirdProps){
 const fail=(m:string):never=>{throw Error('Lower third: '+m);};
 const str=(v:unknown):v is string=>typeof v==='string';
 if(!p||typeof p!=='object')fail('parametros ausentes');
 if(p.templateId!=='lower-third-basico'||p.version!==1)fail('templateId/version devem ser "lower-third-basico"/1');
 if(!Number.isInteger(p.durationInFrames)||p.durationInFrames<1)fail('durationInFrames deve ser inteiro positivo');
 if(!['synthetic','transparent','video'].includes(p.backgroundMode))fail('backgroundMode invalido');
 if(!Number.isInteger(p.sourceStartFrame)||p.sourceStartFrame<0)fail('sourceStartFrame deve ser inteiro >= 0');
 if(![p.videoSrc,p.logoSrc,p.rocketSrc,p.fontSrc].every(str))fail('videoSrc, logoSrc, rocketSrc e fontSrc devem ser textos ("" quando vazios)');
 if(p.backgroundMode==='video'&&!p.videoSrc)fail('informe videoSrc para o fundo de video');
 const k=p.colors;if(!k||![k.background,k.accent,k.text,k.role].every(v=>str(v)&&v.trim()))fail('colors precisa de background, accent, text e role');
 if(p.rocketMask!==null){
  const m=p.rocketMask,box=m&&str(m.viewBox)?m.viewBox.trim().split(/[\s,]+/).map(Number):[];
  if(!m||box.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0)fail('rocketMask.viewBox deve ter 4 numeros com largura e altura positivas');
  if(!str(m.path)||!/^[0-9MmLlHhVvCcSsQqTtAaZzEe.,+\-\s]+$/.test(m.path))fail('rocketMask.path deve conter apenas comandos de caminho SVG');
 }
 if(!Array.isArray(p.credits))fail('credits deve ser uma lista');
 const ids=new Set<string>(),spans:{id:string;x0:number;x1:number;s:number;e:number}[]=[];
 for(const c of p.credits){
  const id=c&&str(c.id)?c.id:'?';
  if(!/^[A-Za-z0-9_-]+$/.test(id)||ids.has(id))fail('cada identificacao precisa de id unico com letras, numeros, - ou _: '+id);ids.add(id);
  if(!str(c.name)||!c.name.trim()||!str(c.role)||!c.role.trim())fail('name e role sao obrigatorios: '+id);
  if(c.detail!==undefined&&!str(c.detail))fail('detail deve ser texto: '+id);
  if(typeof c.primary!=='boolean')fail('primary deve ser true ou false: '+id);
  if(c.detail&&!c.primary)fail('detail so cabe na identificacao principal (primary: true): '+id);
  if(![c.x,c.width,c.from,c.to].every(Number.isFinite))fail('x, width, from e to devem ser numeros: '+id);
  if(c.x<0||c.width<MIN_WIDTH||c.x+c.width>LT_WIDTH)fail(`faixa fora do quadro ou com width < ${MIN_WIDTH}: `+id);
  const {start,end}=creditFrames(c);
  if(start<0||end>p.durationInFrames)fail('from/to fora da composicao: '+id);
  if(end-start<LT_MIN_FRAMES)fail(`cada faixa precisa de ${LT_MIN_FRAMES} frames (~2,25 s): `+id);
  for(const o of spans)if(start<o.e&&o.s<end&&c.x<o.x1&&o.x0<c.x+c.width)fail(`faixas simultaneas se sobrepoem: ${o.id} e ${id}`);
  spans.push({id,x0:c.x,x1:c.x+c.width,s:start,e:end});
 }
}

let measureCtx:CanvasRenderingContext2D|null=null;
// Reduz a fonte ate MIN_SCALE para caber em uma linha; abaixo disso o texto e recusado.
const fitSize=(text:string,base:number,weight:number,family:string,max:number,what:string)=>{
 measureCtx??=document.createElement('canvas').getContext('2d');
 if(!measureCtx)return base;
 measureCtx.font=`${weight} ${base}px ${family}`;
 const w=measureCtx.measureText(text).width;
 if(w<=max)return base;
 const size=Math.floor(base*max/w*10)/10;
 if(size<base*MIN_SCALE)throw Error(`Lower third: texto longo demais (${what}); encurte o texto ou aumente width`);
 return size;
};

// A fonte precisa estar carregada antes da medicao do texto e da captura de qualquer frame.
const useFontReady=(fontSrc:string)=>{
 const [handle]=useState(()=>delayRender('Lower third: fonte'));
 const released=useRef(false);const [ready,setReady]=useState(false);
 useEffect(()=>{
  setReady(false);
  const job=fontSrc?new FontFace('LowerThirdFont',`url('${staticFile(fontSrc)}')`,{weight:'700'}).load().then(face=>{document.fonts.add(face);}):Promise.resolve();
  job.then(()=>{setReady(true);if(!released.current){released.current=true;continueRender(handle);}}).catch(cancelRender);
 },[fontSrc,handle]);
 return ready;
};

// Recorta o logo com <Img> (que o Remotion aguarda) e uma mascara SVG inline,
// reproduzindo o encaixe "meet" do viewBox na caixa 47x164.
const MaskedRocket:React.FC<{src:string;mask:{viewBox:string;path:string}}>=({src,mask})=>{
 const [minX,minY,w,h]=mask.viewBox.trim().split(/[\s,]+/).map(Number);
 const s=Math.min(47/w,164/h),ox=(47-w*s)/2,oy=(164-h*s)/2;
 const url=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="47" height="164" viewBox="${mask.viewBox}"><path d="${mask.path}"/></svg>`)}")`;
 return <div style={{position:'relative',width:47,height:164,overflow:'hidden',maskImage:url,WebkitMaskImage:url,maskSize:'100% 100%',WebkitMaskSize:'100% 100%',maskRepeat:'no-repeat',WebkitMaskRepeat:'no-repeat'}}>
  <Img src={staticFile(src)} style={{position:'absolute',left:ox-minX*s,top:oy-minY*s,width:1280*s,height:1280*s,maxWidth:'none'}}/>
 </div>;
};
const Rocket:React.FC<{p:LowerThirdProps}>=({p})=>{
 if(p.rocketSrc)return <Img src={staticFile(p.rocketSrc)} style={{width:47,height:164,objectFit:'contain'}}/>;
 if(p.logoSrc&&p.rocketMask)return <MaskedRocket src={p.logoSrc} mask={p.rocketMask}/>;
 return <svg width="47" height="164" viewBox="0 0 47 164"><path d="M23.5 2 Q6 36 10 100 L2 130 L14 120 L23.5 160 L33 120 L45 130 L37 100 Q41 36 23.5 2" fill={p.colors.accent}/><circle cx="23.5" cy="69" r="7" fill="#080d30"/></svg>;
};
const Card:React.FC<{p:LowerThirdProps;c:Credit;family:string}>=({p,c,family})=>{
 const {start,end:stop}=creditFrames(c);const f=useCurrentFrame()-start;const end=stop-start;
 const maxText=c.width-TEXT_LEFT-TEXT_RIGHT;
 const nameSize=fitSize(c.name,c.primary?49:40,700,family,maxText,c.id+'.name');
 const roleSize=fitSize(c.role,c.primary?29:25,700,family,maxText,c.id+'.role');
 const detailSize=c.detail?fitSize(c.detail,26,400,family,maxText,c.id+'.detail'):26;
 if(f<0||f>=end)return null;
 const tail=30,exiting=f>end-tail;
 const reveal=exiting?tween(f,end-28,end-8,1,0):tween(f,4,25);
 const ink=exiting?tween(f,end-28,end-12,1,0):tween(f,15,29);
 const logo=exiting?tween(f,end-30,end-22,1,0):tween(f,27,37);
 const rocketX=exiting?tween(f,end-30,end-5,c.x+70,c.x-120):tween(f,0,25,c.x-120,c.x+70);
 const rocketOpacity=exiting?tween(f,end-30,end-24)*tween(f,end-8,end,1,0):1-tween(f,25,35);
 const top=c.primary?681:709,height=c.primary?165:135;
 return <>
  <div style={{position:'absolute',left:c.x,top,width:c.width,height,clipPath:`inset(0 ${(1-reveal)*100}% 0 0)`,borderRadius:12,background:p.colors.background,borderLeft:`5px solid ${p.colors.accent}`,color:p.colors.text,boxShadow:'0 8px 28px #0005'}}>
   <div style={{position:'absolute',left:20,top:c.primary?25:18,width:100,height:100,opacity:logo,borderRadius:50,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
    {p.logoSrc?<Img src={staticFile(p.logoSrc)} style={{width:91,height:91,objectFit:'contain'}}/>:<span style={{color:'#080d30',fontSize:34,fontWeight:700}}>DS</span>}
   </div>
   <div style={{position:'absolute',left:TEXT_LEFT,right:TEXT_RIGHT,top:c.primary?17:20,opacity:ink,translate:`${(1-ink)*16}px 0`}}>
    <div style={{fontSize:nameSize,lineHeight:1.14,letterSpacing:-.5,fontWeight:700,whiteSpace:'nowrap'}}>{c.name}</div>
    <div style={{fontSize:roleSize,lineHeight:1.3,marginTop:c.primary?8:9,color:p.colors.role,fontWeight:700,whiteSpace:'nowrap'}}>{c.role}</div>
    {c.detail?<div style={{fontSize:detailSize,marginTop:5,lineHeight:1.1,whiteSpace:'nowrap'}}>{c.detail}</div>:null}
   </div>
   <div style={{position:'absolute',height:3,bottom:0,left:0,right:0,background:p.colors.accent,opacity:.5}}/>
  </div>
  <div style={{position:'absolute',display:'flex',left:rocketX-23,top:top+height/2-82,opacity:rocketOpacity,rotate:exiting?'-90deg':'90deg',filter:'drop-shadow(0 0 1px #fff)',transformOrigin:'center'}}><Rocket p={p}/></div>
 </>;
};

export const LowerThirdBasic:React.FC<LowerThirdProps>=(p)=>{
 validateLowerThird(p);
 const ready=useFontReady(p.fontSrc);
 const family=p.fontSrc?'LowerThirdFont, Arial, sans-serif':'Arial, sans-serif';
 return <AbsoluteFill style={{fontFamily:family,overflow:'hidden'}}>
  <style>{'*{box-sizing:border-box}'}</style>
  {p.backgroundMode==='video'?<OffthreadVideo src={staticFile(p.videoSrc)} trimBefore={p.sourceStartFrame} muted style={{width:'100%',height:'100%',objectFit:'contain'}}/>:null}
  {p.backgroundMode==='synthetic'?<AbsoluteFill style={{background:'linear-gradient(120deg,#263c53,#141c2b 60%,#24473e)',justifyContent:'center',alignItems:'center',color:'#ffffff99',fontSize:32}}>PREVIA SINTETICA · LOWER THIRD BASICO</AbsoluteFill>:null}
  {ready?p.credits.map(c=><Card key={c.id} p={p} c={c} family={family}/>):null}
 </AbsoluteFill>;
};
