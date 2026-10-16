import {staticFile} from 'remotion';
import type {TeleProps} from './types';
export const telejornalDefaults={configFile:'projects/telejornal-exemplo/props-A.json',timeline:[],variant:'A',canvas:{width:1080,height:1920,fps:30},durationInFrames:1041} as unknown as TeleProps;
export const telejornalMetadata=async({props}:{props:TeleProps})=>{
 let resolved=props;
 if(!props.timeline?.length){
  if(!props.configFile)throw new Error('Telejornal DARK: forneça props geradas pelo adaptador.');
  const response=await fetch(staticFile(props.configFile));
  if(!response.ok)throw new Error('Telejornal DARK: configuração preparada ausente; execute scripts/preparar-diorama-telejornal.py.');
  resolved=await response.json();
 }
 for(const field of ['design','broadcast','assets','timeline','outro','audio'] as const){if(!resolved[field])throw new Error('Telejornal DARK: falta '+field);}
 const types=['speaker','duo','headline','context','outro'];
 let end=0;
 for(const s of resolved.timeline){
  if(!types.includes(s.type))throw new Error('Telejornal DARK: tipo de cena não implementado '+s.type);
  if(Math.abs(s.from-end)>.005||s.to<=s.from)throw new Error('Telejornal DARK: timeline incompleta ou sobreposta.');
  if(s.type==='speaker'&&(!s.mediaRef||!s.identity||!resolved.assets.some(a=>a.id===s.mediaRef)))throw new Error('Telejornal DARK: speaker sem mídia/identificação.');
  if((s.type==='duo'||s.type==='context')&&(!s.panels||s.panels.length!==2||s.panels.some(panel=>!resolved.assets.some(a=>a.id===panel.assetRef))))throw new Error('Telejornal DARK: painéis sem assets equivalentes.');
  end=s.to;
 }
 if(Math.abs(end-resolved.bodyDuration)>.005)throw new Error('Telejornal DARK: cobertura da timeline incorreta.');
 const expected=Math.round((resolved.bodyDuration+resolved.outro.duration)*resolved.canvas.fps);
 if(expected!==resolved.durationInFrames)throw new Error('Telejornal DARK: duração inconsistente.');
 return {props:resolved,width:resolved.canvas.width,height:resolved.canvas.height,fps:resolved.canvas.fps,durationInFrames:expected};
};
