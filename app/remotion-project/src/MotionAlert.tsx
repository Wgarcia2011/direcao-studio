import type {MotionScene} from './MotionTypes';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export function MotionAlert({scene}:{scene:MotionScene}){
 const frame=useCurrentFrame();const {fps,width}=useVideoConfig();
 const entrance=spring({frame,fps,config:{damping:18,stiffness:210,mass:.6}});
 const fade=interpolate(frame,[0,3,scene.durationInFrames-7,scene.durationInFrames],[0,1,1,0],clamp);
 const shock=interpolate(frame,[0,12],[1,0],clamp);
 const pulse=.5+.5*Math.sin(frame/fps*Math.PI*2);
 const drift=frame*5;
 return <AbsoluteFill style={{opacity:fade,overflow:'hidden',background:'#0c0b0b',color:'#fff',fontFamily:'Manrope',justifyContent:'center',alignItems:'center'}}>
 <AbsoluteFill style={{background:'radial-gradient(ellipse at center,#14433c 0%,#0c2020 55%,#070d10 90%)',opacity:.65+.12*pulse}}/>
 <AbsoluteFill style={{background:'linear-gradient(#4ee2c015 1px,transparent 1px),linear-gradient(90deg,#4ee2c015 1px,transparent 1px)',backgroundSize:'60px 60px',backgroundPosition:`${frame*.6}px ${frame*.3}px`}}/>
 {[0,1].map(i=><div key={i} style={{position:'absolute',left:-100,right:-100,top:i?undefined:0,bottom:i?0:undefined,height:72,background:'repeating-linear-gradient(120deg,#ff823a 0px,#ff823a 42px,#161310 42px,#161310 84px)',backgroundPosition:`${i?-drift:drift}px 0`,rotate:i?'-2deg':'2deg'}}/>)}
 <div style={{position:'absolute',left:'6%',right:'6%',top:'13%',display:'flex',justifyContent:'space-between',fontSize:30,fontWeight:800,letterSpacing:8,color:'#ffdb31'}}><span>▲ ATENÇÃO</span><span>FALA EM DESTAQUE</span></div>
 <div style={{position:'absolute',width:'84%',height:'50%',border:'3px solid #4ee2c0',borderRadius:30,background:'#080d1299',boxShadow:'0 0 65px #4ee2c044',transform:`perspective(1400px) rotateY(${12*(1-entrance)}deg) rotateZ(${-3*(1-entrance)}deg)`,scale:1+.13*shock,rotate:`${Math.sin(frame*1.7)*shock*2}deg`}}/>
 <div style={{fontSize:Math.min(width*.13,width*.9/Math.max(scene.text.length,1)*1.7),fontWeight:900,textTransform:'uppercase',textAlign:'center',lineHeight:.95,maxWidth:'90%',scale:.65+.35*entrance,translate:`${Math.sin(frame*2.5)*shock*18}px ${Math.cos(frame*1.8)*shock*10}px`,textShadow:'9px 9px 0 #080809,0 0 45px #ff823a55',WebkitTextStroke:'2px #ffdb31',paintOrder:'stroke fill'}}>{scene.text}</div>
 <div style={{position:'absolute',bottom:'20%',width:280,height:7,background:'#ffdb31',scale:`${entrance} 1`}}/>
 </AbsoluteFill>;
}
