import type {MotionScene} from './MotionTypes';
import {evolvePath} from '@remotion/paths';
import {interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export function MotionFloatingCard({scene}:{scene:MotionScene}){
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 const entry=spring({frame,fps,config:{damping:19,stiffness:160,mass:.7}});
 const exit=interpolate(frame,[scene.durationInFrames-12,scene.durationInFrames],[1,0],clamp);
 const draw=interpolate(frame,[4,28],[0,1],clamp);
 const word=scene.text.toLowerCase();
 const icon=word.includes('revis')?'M-25 -4A26 26 0 0 1 24 -15M14 -30L25 -15L9 -13M25 4A26 26 0 0 1 -24 15M-14 30L-25 15L-9 13':word.includes('persist')?'M-20 30V-29M-20 -27Q-4 -37 10 -25Q23 -16 31 -24V8Q18 16 5 6Q-8 -3 -20 5':word.includes('cansa')?'M-30 -17H25V19H-30ZM25 -7H33V9H25M-23 -10V12H-10V-10Z':word.includes('tempo')?'M-10 -25V25M12 -25V25':'M-27 -22Q-13 -30 0 -20Q13 -30 27 -22V25Q13 17 0 27Q-13 17 -27 25ZM0 -20V27';
 return <div style={{position:'absolute',left:`${scene.x}%`,top:`${scene.y}%`,width:'27%',translate:`calc(-50% + ${(1-entry)*170-(1-exit)*90}px) calc(-50% + ${Math.sin(frame/fps*2)*5}px)`,opacity:entry*exit,fontFamily:'Manrope',transform:`perspective(1200px) rotateY(${-12*entry}deg) rotateZ(${(scene.y<45?-3:3)*entry}deg) scale(${.8+.2*entry})`,borderRadius:28,border:'3px solid #4ee2c0',background:'#0b191ef2',boxShadow:'10px 14px 0 #0008,0 0 34px #4ee2c030',padding:'28px 30px',display:'flex',alignItems:'center',gap:24,color:'#f5f0ff'}}>
 <svg viewBox="-40 -40 80 80" width="84" height="84" style={{flexShrink:0}}><rect x="-39" y="-39" width="78" height="78" rx="18" fill="#18352f"/><path d={icon} {...evolvePath(draw,icon)} fill="none" stroke="#4ee2c0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
 <div style={{fontSize:48,fontWeight:700,lineHeight:1.12,textShadow:'0 2px 8px #000'}}>{scene.text}</div>
 </div>;
}
