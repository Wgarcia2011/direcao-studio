import React from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame} from 'remotion';
import {CaptionTrack} from './CaptionTrack';
import {captionDefaults} from './captionTiming';

const presets=[
  ['limpo','Limpo vivo','#ffffff'],['cinema','Cinema','#f5dfbb'],
  ['faixa','Faixa podcast','#f5c568'],['marcador','Marcador','#4ee2c0'],
  ['karaoke','Karaokê','#ffe066'],['impacto','Impacto','#ffe066'],
  ['roxo','Roxo em foco','#b798ff'],['palavra','Uma palavra','#4ee2c0'],
  ['editorial','Editorial','#8250cf'],['ritmo','Ritmo','#ffb389'],
  ['impacto-turquesa','Impacto turquesa','#20cbb6'],['neon','Neon noturno','#7ef9d5'],
  ['tarja','Tarja em movimento','#ffe066'],['contorno','Contorno ativo','#ffffff'],
  ['duotone','Duotone','#ffb389'],['escada','Escada de palavras','#4ee2c0'],
  ['pop','Pop elástico','#ffcf56'],['cartaz','Cartaz editorial','#ff654f'],
  ['minimal','Minimal','#f5dfbb'],
];
export const CaptionCatalog:React.FC=()=>{
  const frame=useCurrentFrame();const index=Math.floor(frame/90)%presets.length;
  const [preset,name,accent]=presets[index];const t=(frame%90)/30;
  const words=['Cada','palavra','encontra','seu','ritmo.'].map((w,i)=>({w,s:.2+i*.45,e:.2+i*.45+.4}));
  return <AbsoluteFill style={{background:'#100d18',color:'#f5f0ff',fontFamily:'Manrope',padding:48}}>
    <div style={{fontSize:20,color:'#d1b4ff',marginTop:70}}>Direção Studio · {index+1}/19</div>
    <h1 style={{fontSize:42,lineHeight:1.12,marginTop:24}}>{name}</h1>
    <p style={{fontSize:19,color:'#d1b4ff',lineHeight:1.5}}>Template próprio de legenda</p>
    <CaptionTrack words={words} t={t} c={{...captionDefaults,preset,accent,words:3,position:'middle',size:115}}/>
    <div style={{position:'absolute',bottom:80,left:48,right:48,fontSize:18,color:'#d1b4ff',lineHeight:1.5}}>Demonstração sem áudio.<br/>Texto e tempos ilustrativos.</div>
  </AbsoluteFill>;
};
registerRoot(()=> <Composition id="CaptionCatalog" component={CaptionCatalog} durationInFrames={1710} fps={30} width={720} height={1280}/>);
