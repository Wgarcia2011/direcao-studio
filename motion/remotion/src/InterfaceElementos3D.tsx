import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AbsoluteFill,cancelRender,continueRender,delayRender,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';

// Elementos 3D da Interface Explicativa (Three.js 0.186) renderizados pelo Remotion.
// Usa o MESMO módulo elementos3d.js da composição HyperFrames, copiado com o Three.js
// local para public/local/interface-explicativa por scripts/interface_explicativa.py.
export const NOMES_ELEMENTOS_3D=['selo','caixa','pular','lupa','raio','alvo','livro','grafico','relogio','estrela'] as const;
export type InterfaceElementos3DProps={elementos:string[];fundo:'claro'|'escuro'|'lavanda';titulo?:string;paleta?:Record<string,string>;duration:number;width:number;height:number;runtime:string};
export const interfaceElementos3DDemo:InterfaceElementos3DProps={elementos:[...NOMES_ELEMENTOS_3D],fundo:'claro',titulo:'Elementos 3D · Interface Explicativa',duration:6,width:1080,height:1920,runtime:'local/interface-explicativa'};

export function validateInterfaceElementos3D(p:InterfaceElementos3DProps){
  if(!p.runtime.startsWith('local/')||p.runtime.includes('..')||p.runtime.includes('://'))throw Error('runtime: use a cópia local em public/local/');
  if(!Array.isArray(p.elementos)||p.elementos.length<1||p.elementos.length>12||p.elementos.some((e)=>!(NOMES_ELEMENTOS_3D as readonly string[]).includes(e)))throw Error('elementos: 1–12 nomes conhecidos');
  if(!['claro','escuro','lavanda'].includes(p.fundo))throw Error('fundo: claro, escuro ou lavanda');
  if(p.titulo!==undefined&&(typeof p.titulo!=='string'||p.titulo.length>48))throw Error('titulo: até 48 caracteres');
  if(Object.entries(p.paleta??{}).some(([,v])=>!/^#[0-9a-fA-F]{6}$/.test(v)))throw Error('paleta: cores #RRGGBB');
  if(!Number.isFinite(p.duration)||p.duration<2||p.duration>20||!Number.isInteger(p.duration*30))throw Error('duration: 2–20 s em quadros inteiros');
  if(![[1080,1920],[1080,1080],[1920,1080]].some(([w,h])=>w===p.width&&h===p.height))throw Error('Formato: 1080×1920, 1080×1080 ou 1920×1080');
}

type Vitrine={renderAt:(t:number)=>void};

/** Vitrine animada: cada elemento entra com mola, gira e flutua; fundo opaco para o Concat. */
export const InterfaceElementos3D:React.FC<InterfaceElementos3DProps>=(p)=>{
  validateInterfaceElementos3D(p);
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();
  const ref=useRef<HTMLCanvasElement>(null);
  const [vitrine,setVitrine]=useState<Vitrine|null>(null);
  const [handle]=useState(()=>delayRender('Carregando Three.js e fontes locais'));
  useEffect(()=>{
    let vivo=true;
    (async()=>{
      for(const [arquivo,peso] of [['regular.ttf','400'],['medio.ttf','500'],['negrito.ttf','700']]){
        const f=new FontFace('IEText',`url(${staticFile(`${p.runtime}/${arquivo}`)})`,{weight:peso});
        document.fonts.add(await f.load());
      }
      const mod=await import(/* webpackIgnore: true */ staticFile(`${p.runtime}/elementos3d.js`));
      const v:Vitrine=mod.criarVitrine({canvas:ref.current,W:width,H:height,elementos:p.elementos,fundo:p.fundo,paleta:p.paleta,titulo:p.titulo});
      if(vivo){setVitrine(v);continueRender(handle);}
    })().catch((e)=>cancelRender(e));
    return ()=>{vivo=false;};
  },[]);
  // Desenha antes da captura do quadro: tudo é função do tempo.
  useLayoutEffect(()=>{vitrine?.renderAt(frame/fps);},[vitrine,frame,fps]);
  return <AbsoluteFill style={{backgroundColor:p.fundo==='escuro'?'#171717':'#ffffff'}}>
    <canvas ref={ref} width={width} height={height} style={{width,height}}/>
  </AbsoluteFill>;
};
