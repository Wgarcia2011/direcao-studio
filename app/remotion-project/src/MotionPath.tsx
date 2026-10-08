import type {MotionScene} from './MotionTypes';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export function MotionPath({scene}:{scene:MotionScene}){
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 const labels=scene.items||[];const times=scene.item_times||labels.map((_:string,i:number)=>i*.7);
 const reveal=(i:number)=>interpolate(frame,[times[i]*fps,times[i]*fps+12],[0,1],clamp);
 const icons=[<path key="book" d="M-32 -25Q-16 -34 0 -23Q16 -34 32 -25V29Q16 20 0 31Q-16 20 -32 29ZM0 -23V31"/>,<g key="repeat"><path d="M-29 -5A30 30 0 0 1 26 -18M15 -34L28 -18L10 -15M29 5A30 30 0 0 1 -26 18M-15 34L-28 18L-10 15"/></g>,<path key="flag" d="M-23 35V-34M-23 -31Q-6 -42 10 -29Q25 -19 34 -28V9Q20 18 6 7Q-10 -4 -23 6"/>];
 return <svg viewBox="0 0 720 340" width="100%" aria-label={labels.join(' → ')}>
 {labels.slice(1).map((_:string,i:number)=>{const x=170+i*240;const progress=reveal(i+1);return <g key={i}><path d={`M${x} 145H${x+90}`} fill="none" stroke="#4ee2c0" strokeWidth="5" pathLength="1" strokeDasharray=".1 .06" strokeDashoffset={1-progress} opacity={progress}/><path d={`M${x+75} 133L${x+90} 145L${x+75} 157`} fill="none" stroke="#4ee2c0" strokeWidth="5" opacity={progress}/></g>;})}
 {labels.map((label:string,i:number)=>{const x=120+i*240;const progress=reveal(i);return <g key={i} opacity={progress} transform={`translate(0 ${20*(1-progress)})`}>
 <rect x={x-69} y="80" width="138" height="138" rx="28" fill="#251832" stroke={i===labels.length-1?'#4ee2c0':'#b798ff'} strokeWidth="4"/>
 <g transform={`translate(${x} 148)`} fill="none" stroke={i===labels.length-1?'#4ee2c0':'#f5f0ff'} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">{icons[i%3]}</g>
 <text x={x} y="279" textAnchor="middle" fill="#f5f0ff" fontSize="35" fontWeight="700">{label}</text>
 </g>;})}
 </svg>;
}
