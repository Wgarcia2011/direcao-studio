import {useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Player,PlayerRef} from '@remotion/player';
import {EditorVideo,VideoProps} from './EditorVideo';
const App=()=>{
 const [props,setProps]=useState<VideoProps|null>(null);const [error,setError]=useState('');const ref=useRef<PlayerRef>(null);const motion=new URLSearchParams(location.search).get('motion')==='1';
 useEffect(()=>{const id=new URLSearchParams(location.search).get('project');if(!id||!/^[a-f0-9]{32}$/.test(id)){setError('Selecione um projeto no editor.');return;}fetch(motion?'/api/motion?project='+id:'/media/'+id+'/edit/remotion-props.json').then(r=>{if(!r.ok)throw new Error('Prepare a prévia no editor antes de abrir.');return r.json();}).then(d=>setProps(motion?d.props:d)).catch(e=>setError(e.message));},[motion]);
 useEffect(()=>{if(!motion)return;const listener=(e:MessageEvent)=>{if(e.origin!==location.origin||e.source!==parent)return;const d=e.data;if(d.type==='motion-props')setProps(d.props);if(d.type==='motion-seek')ref.current?.seekTo(d.frame);if(d.type==='motion-play'){if(ref.current?.isPlaying()){ref.current.pause();}else{ref.current?.play();}}if(d.type==='motion-pause')ref.current?.pause();};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[motion]);
 useEffect(()=>{const player=ref.current;if(!player||!motion)return;const change=(e:{detail:{frame:number}})=>parent.postMessage({type:'motion-time',frame:e.detail.frame,playing:player.isPlaying()},location.origin);const ready=()=>parent.postMessage({type:'motion-ready'},location.origin);player.addEventListener('frameupdate',change);ready();return()=>player.removeEventListener('frameupdate',change);},[props?.durationInFrames,motion]);
 return props?<Player ref={ref} component={EditorVideo} inputProps={props} durationInFrames={props.durationInFrames} compositionWidth={props.width} compositionHeight={props.height} fps={30} controls={!motion} style={{width:'100%',height:'100%',maxHeight:'100vh'}}/>:<p style={{color:'#f5f0ff',fontFamily:'sans-serif',padding:24}}>{error||'Preparando prévia…'}</p>;
};
createRoot(document.getElementById('root')!).render(<App/>);
