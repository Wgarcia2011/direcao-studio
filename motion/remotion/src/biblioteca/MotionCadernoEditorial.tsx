// Caderno Editorial: fala real em tela cheia alternada com blocos longos de motion numa página de caderno.
// Tipografia do Editorial Artístico (serifada itálica + sans forte); ilustrações com técnicas sketchbook
// portadas de cth9191/animate (MIT; ver src/sketch/sketchKit.tsx). Tempos em segundos da saída (props).
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {marca} from './marca';
import type {FocoTotalProps} from './MotionFocoTotal';
import {RNG, easeInOut, easeOut3, lerp, seg} from './sketch/sketchKit';
import {SketchArt, defaultSketchPalette, type ArtEvent, type ArtKind, type SketchPalette} from './sketch/sketchArt';
import {CadernoDarkArt, isDarkArt, type DarkArtKind} from './sketch/cadernoDarkArt';

type Card = {x: number; y: number; w: number; rot?: number};
export type CadernoItem = {type: 'png' | 'art' | 'photoCrop'; at: number; until?: number; x: number; y: number; size?: number; rot?: number; spin?: number; depth?: number; src?: string; filter?: string; tape?: boolean; art?: ArtKind | DarkArtKind; label?: string; rows?: number; bend?: number; events?: ArtEvent[]; personName?:string; crop?:{x:number;y:number;w:number;h:number;imageW:number;imageH:number}};
export type CadernoScene = {at: number; cam: {x: number; y: number; z?: number; rot?: number}};
export type CadernoBlock = {from: number; to: number; photoIn?: Card; photoOut?: Card; scenes: CadernoScene[]; items: CadernoItem[]; shake?: number[]};
export type CadernoProps = FocoTotalProps & {solidCaptionHighlight?: boolean; maxCaptionLines?: number; photoSrc?: string; hideBrand?: boolean; hideDoodles?: boolean; worldContent?: React.ReactNode; sketchBlocks?: CadernoBlock[]; sketchPalette?: Partial<SketchPalette>; captionTop?: {video: number; page: number}; faceY?: number; videoZoom?: number; marginRocket?: string; marginRocketScale?: number; darkMode?: boolean; rocketTransitions?: number[]; outro?: {from:number;src?:string;title?:string}; identity?:{from:number;to:number;name:string;detail:string}};
export const darkCadernoPalette:SketchPalette={paper:'#060b1f',ink:'#e4edff',graph:'#7185a1',accent:'#00d0b8',accentInk:'#00d0b8',red:'#e0483a',sheet:'#111e3b',text:'#f1f5ff'};
export const MotionCadernoEditorialDark:React.FC<CadernoProps>=(props)=><MotionCadernoEditorial {...props} darkMode sketchPalette={{...darkCadernoPalette,...props.sketchPalette}} marginRocket={props.marginRocket??''} marginRocketScale={props.marginRocketScale??1.2}/>;

const W = 1080, H = 1920, IN = 0.75, OUT = 0.75;
type Cam = {x: number; y: number; z: number; rot: number};
function camAt(b: CadernoBlock, t: number): Cam {
	const sc = b.scenes;
	let i = 0;
	for (let j = 0; j < sc.length; j++) if (t >= sc[j].at) i = j;
	const cur = sc[i], prev = sc[Math.max(0, i - 1)], k = i === 0 ? 1 : easeInOut((t - cur.at) / 0.95);
	const settle = 1 + 0.1 * (1 - easeOut3((t - b.from) / 1.3));
	const drift = 1 + Math.min(Math.max(0, t - cur.at), 7) * 0.011;
	let x = lerp(prev.cam.x, cur.cam.x, k), y = lerp(prev.cam.y, cur.cam.y, k);
	for (const s of b.shake ?? []) {const a = t - s; if (a > 0 && a < 0.35) {const R = RNG('shake', s, Math.floor(a * 30)); x += R.n(9) * (1 - a / 0.35); y += R.n(9) * (1 - a / 0.35);}}
	return {x, y, z: lerp(prev.cam.z ?? 1, cur.cam.z ?? 1, k) * settle * drift, rot: lerp(prev.cam.rot ?? 0, cur.cam.rot ?? 0, k) + Math.sin(t * 0.37) * 0.35};
}
const toScreen = (c: Cam, wx: number, wy: number) => {
	const r = (c.rot * Math.PI) / 180, dx = wx - c.x, dy = wy - c.y;
	return {x: W / 2 + c.z * (Math.cos(r) * dx - Math.sin(r) * dy), y: H / 2 + c.z * (Math.sin(r) * dx + Math.cos(r) * dy)};
};

export const MotionCadernoEditorial: React.FC<CadernoProps> = (props) => {
	const frame = useCurrentFrame(), {fps} = useVideoConfig(), t = frame / fps, B = Math.floor(frame / 2);
	const pal = {...defaultSketchPalette, ...props.sketchPalette};
	const block = props.sketchBlocks?.find((b) => t >= b.from && t < b.to);
	const shot = props.speakerShots?.find((s) => t >= s.from && t < s.to) ?? props.speakerShots?.find((s) => t < s.to);
	const cam = block ? camAt(block, t) : null;

	// vídeo: tela cheia ou cartão-foto colado na página (mesmo elemento, sem duplicar decodificação)
	let v = {x: W / 2, y: H / 2, s: 1, rot: 0}, card = 0, videoOn = true;
	if (block && cam) {
		const place = (c: Card) => {const p = toScreen(cam, c.x, c.y); return {x: p.x, y: p.y, s: (c.w * cam.z) / W, rot: (c.rot ?? 0) + cam.rot};};
		const mix = (a: typeof v, b: typeof v, k: number) => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k), rot: lerp(a.rot, b.rot, k)});
		const pin = block.photoIn ? place(block.photoIn) : {x: W / 2, y: -900, s: 0.3, rot: 0};
		const pout = block.photoOut ? place(block.photoOut) : pin;
		const kin = easeInOut((t - block.from) / IN), kout = easeInOut((t - (block.to - OUT)) / OUT);
		// sem photoOut o bloco termina na página (sem volta ao vídeo)
		if (block.photoOut && t >= block.to - OUT) {v = mix(pout, {x: W / 2, y: H / 2, s: 1, rot: 0}, kout); card = 1 - kout;}
		else if (t >= block.to - OUT - 1.1 && block.photoOut) {v = pout; card = 1; videoOn = true;}
		else {v = mix({x: W / 2, y: H / 2, s: 1, rot: 0}, pin, kin); card = kin; videoOn = kin < 1 || (pin.y > -800 && pin.y < H + 800 && pin.x > -500 && pin.x < W + 500);}
		if (t >= block.to - OUT - 1.1 && t < block.to - OUT && block.photoOut) card = 1;
	}
	// foto que sai do mesmo ponto onde entrou permanece colada (sem reaparecer)
	const samePlace = !!block?.photoOut && !!block.photoIn && block.photoOut.x === block.photoIn.x && block.photoOut.y === block.photoIn.y;
	const outAppear = block?.photoOut && !samePlace ? seg(t, block.to - OUT - 1.1, block.to - OUT - 0.75) : 1;
	const pageMode = !!block && card > 0.5;

	// zoom suave no rosto durante a fala em tela cheia; origem no rosto para preservá-lo
	const hit = (props.punchTimes ?? []).filter((x) => x <= t).at(-1) ?? 0;
	const idx = (props.punchTimes ?? []).filter((x) => x <= t).length;
	const zoom = Math.max(1, ((idx % 2 ? 1.1 : 1.02) + Math.min(t - hit, 6) * 0.007) * (props.videoZoom??1));
	const sway = Math.sin(t * 0.4) * 0.5 * (1 - card);

	const captions = useCaptions(props, t, fps, pageMode, pal);
	const worldItems = block ? block.items : [];
	const ending=props.outro&&t>=props.outro.from;
	if(ending)videoOn=false;
	const visible = (it: CadernoItem) => t >= it.at - 0.5 && (it.until === undefined || t < it.until + 0.6);
	const worldStyle: React.CSSProperties = cam ? {position: 'absolute', left: 0, top: 0, width: 1, height: 1, transformOrigin: '0 0', transform: `translate(${W / 2}px,${H / 2}px) rotate(${cam.rot}deg) scale(${cam.z}) translate(${-cam.x}px,${-cam.y}px)`} : {};
	const parallaxStyle: React.CSSProperties = cam ? {...worldStyle, transform: `translate(${W / 2}px,${H / 2}px) rotate(${cam.rot * 0.6}deg) scale(${cam.z * 0.92}) translate(${-cam.x * 0.62}px,${-cam.y * 0.62}px)`} : {};

	return <AbsoluteFill style={{background: props.darkMode?pal.paper:'#111', overflow: 'hidden'}}>
		<style>{`@font-face{font-family:EditorialSans;src:url('${staticFile('fonts/manrope-700.ttf')}')}@font-face{font-family:EditorialSerif;src:url('${staticFile('fonts/editorial-bold-italic.ttf')}')}`}</style>
		{props.audioMix ? <Audio src={staticFile(props.audioMix)} /> : null}
		{block && cam ? <AbsoluteFill style={{background: pal.paper}}>
			<div style={worldStyle}><PageTexture block={block} pal={pal} /></div>
			{!props.hideDoodles ? <div style={parallaxStyle}><MarginDoodles block={block} t={t} B={B} pal={pal} rocket={props.marginRocket} rocketScale={props.marginRocketScale} /></div> : null}
			<div style={worldStyle}>
				{worldItems.filter(visible).map((it, i) => <WorldItem key={i} it={it} i={i} t={t} B={B} fps={fps} pal={pal} block={block} cam={cam} />)}
				{props.worldContent}
			</div>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(96,72,40,.20) 100%)'}} />
		</AbsoluteFill> : null}
		{videoOn ? <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `translate(${v.x - W / 2}px,${v.y - H / 2}px) rotate(${v.rot + sway}deg) scale(${v.s})`, opacity: block?.photoOut && t >= block.to - OUT - 1.1 && t < block.to - OUT ? outAppear : 1,
			boxShadow: card > 0.01 ? `0 0 0 ${(26 * card) / Math.max(v.s, 0.05)}px ${pal.sheet}, 0 ${(30 * card) / Math.max(v.s, 0.05)}px ${(60 * card) / Math.max(v.s, 0.05)}px rgba(60,48,30,${0.4 * card})` : undefined}}>
			<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
				{props.photoSrc ? <Img src={staticFile(props.photoSrc)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${zoom})`,transformOrigin:`50% ${(props.faceY??.3)*100}%`}} /> : <OffthreadVideo src={staticFile(props.video)} muted={!!props.audioMix} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${(shot?.x ?? 0.5) * 100}% 50%`, transform: `scale(${zoom})`, transformOrigin: `50% ${(props.faceY ?? 0.3) * 100}%`}} />}
				{card < 0.5 ? <AbsoluteFill style={{background: 'linear-gradient(transparent 50%, rgba(0,0,30,.25) 65%, rgba(0,0,30,.55) 92%)', opacity: 1 - card * 2}} /> : null}
			</div>
			{card > 0.6 ? <div style={{position: 'absolute', left: W / 2 - 300, top: -70, width: 600, height: 140, background: 'rgba(239,226,180,.82)', transform: 'rotate(-3deg)', opacity: seg(card, 0.6, 1)}} /> : null}
		</div> : null}
		<div style={{position: 'absolute', left: 70, width: 940, top: pageMode ? props.captionTop?.page ?? 1350 : props.captionTop?.video ?? 1190, textAlign: 'center'}}>{captions}</div>
		{!props.hideBrand ? <Img src={marca(props.brand?.src )} style={{position: 'absolute', right: 56, top: 60, width: 78, height: 78, opacity: 0.85}} /> : null}
		{props.identity&&t>=props.identity.from&&t<props.identity.to?<div style={{position:'absolute',left:70,right:70,top:1620,borderLeft:`6px solid ${pal.accent}`,padding:'16px 24px',background:'#060b1fdd',opacity:Math.min(seg(t-props.identity.from,0,.4),seg(props.identity.to-t,0,.35))}}><div style={{fontFamily:'EditorialSans',fontSize:44,color:'#fff'}}>{props.identity.name}</div><div style={{fontFamily:'EditorialSans',fontSize:30,color:pal.accent,marginTop:8}}>{props.identity.detail}</div></div>:null}
		{(props.rocketTransitions??[]).map(at=>{const p=seg(t-at,0,.85);if(t<at||t>at+.85)return null;return <AbsoluteFill key={at} style={{pointerEvents:'none'}}><div style={{position:'absolute',left:-600+2300*p,top:1400-1900*p,width:360,height:1200,background:`linear-gradient(0deg,transparent,${pal.accent}88,transparent)`,transform:'rotate(42deg)',opacity:Math.sin(p*Math.PI)*.7}}/><Img src={staticFile(props.marginRocket??'')} style={{position:'absolute',left:-220+1600*p,top:1820-2240*p,width:120,height:334,transform:'rotate(40deg)',filter:`drop-shadow(0 0 15px ${pal.accent}55)`}}/></AbsoluteFill>;})}
		{ending&&props.outro?<AbsoluteFill style={{background:props.darkMode?`radial-gradient(ellipse at 50% 42%,#000068,${pal.paper} 75%)`:`radial-gradient(ellipse at 50% 42%,${pal.sheet},${pal.paper} 75%)`,alignItems:'center',justifyContent:'center'}}><div style={{position:'absolute',width:780,height:780,borderRadius:'50%',border:`1px solid ${pal.accent}44`,transform:`scale(${.8+.08*(t-props.outro.from)})`,opacity:seg(t-props.outro.from,.1,.7)}}/><Img src={marca(props.outro.src??props.brand?.src)} style={{width:440,height:440,objectFit:'contain',opacity:seg(t-props.outro.from,.15,.7),transform:`scale(${.85+.15*easeOut3((t-props.outro.from)/1.2)})`}}/><div style={{position:'absolute',top:1280,fontFamily:'EditorialSans',fontSize:52,color:props.darkMode?pal.accent:pal.ink,letterSpacing:6,opacity:seg(t-props.outro.from,.7,1.3)}}>{props.outro.title??''}</div></AbsoluteFill>:null}
	</AbsoluteFill>;
};

// página: papel, pontilhado, manchas de grafite, anel de café e bordas das folhas de baixo (adaptado de sketchPage)
const PageTexture: React.FC<{block: CadernoBlock; pal: SketchPalette}> = ({block, pal}) => {
	const xs = block.scenes.map((s) => s.cam.x), ys = block.scenes.map((s) => s.cam.y);
	const x0 = Math.min(...xs) - 1500, x1 = Math.max(...xs) + 1500, y0 = Math.min(...ys) - 1800, y1 = Math.max(...ys) + 1800;
	const R = RNG('page', block.from);
	const id = 'dots' + Math.round(block.from * 30);
	return <svg style={{position: 'absolute', left: x0, top: y0, overflow: 'visible'}} width={x1 - x0} height={y1 - y0} viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}>
		<defs>
			<pattern id={id} width={54} height={54} patternUnits="userSpaceOnUse"><rect x={26} y={26} width={2.8} height={2.8} fill={pal.ink} opacity={.16} /></pattern>
			<radialGradient id={id + 's'}><stop offset="0" stopColor="rgba(80,76,70,0.12)" /><stop offset="1" stopColor="rgba(80,76,70,0)" /></radialGradient>
		</defs>
		<rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={pal.paper} />
		<rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={`url(#${id})`} />
		{Array.from({length: 14}, (_, i) => <ellipse key={i} cx={R.r(x0, x1)} cy={R.r(y0, y1)} rx={R.r(90, 200)} ry={R.r(30, 70)} fill={`url(#${id}s)`} />)}
		{Array.from({length: 3}, (_, i) => {const cx = R.r(x0 + 400, x1 - 400), cy = R.r(y0 + 600, y1 - 600); return <ellipse key={'c' + i} cx={cx} cy={cy} rx={115} ry={108} fill="none" stroke="rgba(150,100,50,0.07)" strokeWidth={6} strokeDasharray="600 80" />;})}
		{[0, 1, 2, 3].map((i) => <line key={'e' + i} x1={x0 + 40 + i * 5} y1={y0} x2={x0 + 38 + i * 5} y2={y1} stroke={`rgba(120,100,80,${0.16 - i * 0.03})`} strokeWidth={1.6} />)}
	</svg>;
};
// vida de fundo em grafite, numa camada com paralaxe (estrelas e um avião de papel na margem)
const MarginDoodles: React.FC<{block: CadernoBlock; t: number; B: number; pal: SketchPalette; rocket?: string;rocketScale?:number}> = ({block, t, B, pal, rocket,rocketScale=1}) => {
	const R = RNG('doodles', block.from), xs = block.scenes.map((s) => s.cam.x * 0.62), ys = block.scenes.map((s) => s.cam.y * 0.62);
	const stars = Array.from({length: 9}, () => [R.r(Math.min(...xs) - 650, Math.max(...xs) + 650), R.r(Math.min(...ys) - 1000, Math.max(...ys) + 1000)] as const);
	return <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
		{stars.map(([x, y], i) => {const r = 20 + 7 * ((B + i) % 3 === 0 ? 1 : 0); const P = Array.from({length: 11}, (_, j) => {const a = (j / 10) * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? r * 0.42 : r; return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;}).join(' ');
			return <polyline key={i} points={P} fill="none" stroke={pal.graph} strokeWidth={3} opacity={0.45} strokeLinejoin="round" />;})}
		{(() => {const cx = Math.min(...xs) + 380, cy = Math.min(...ys) - 520, p = t / 4, x = cx + 140 * Math.sin(Math.PI * 2 * p), y = cy + 60 * Math.sin(Math.PI * 4 * p), x2 = cx + 140 * Math.sin(Math.PI * 2 * (p + 0.01)), y2 = cy + 60 * Math.sin(Math.PI * 4 * (p + 0.01)), a = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
			if (rocket) return <g transform={`translate(${x} ${y}) rotate(${a + 90}) scale(${rocketScale})`}><image href={staticFile(rocket)} x={-22} y={-65} width={44} height={130} /></g>;
			return <g transform={`translate(${x} ${y}) rotate(${a}) scale(1.3)`} opacity={0.7}><polygon points="48,0 -40,-30 -26,0" fill={pal.sheet} stroke={pal.ink} strokeWidth={3} /><polygon points="48,0 -26,0 -40,24" fill="#e9dcc3" stroke={pal.ink} strokeWidth={3} /></g>;})()}
	</svg>;
};

const WorldItem: React.FC<{it: CadernoItem; i: number; t: number; B: number; fps: number; pal: SketchPalette; block: CadernoBlock; cam: Cam}> = ({it, i, t, B, fps, pal, block, cam}) => {
	const age = t - it.at, size = it.size ?? 600;
	const out = it.until !== undefined ? easeInOut((t - it.until) / 0.5) : 0;
	const ref = camAt(block, Math.max(block.from, it.at));
	const depth = it.depth ?? 1, px = (cam.x - ref.x) * (1 - depth), py = (cam.y - ref.y) * (1 - depth);
	if(it.type==='photoCrop'&&it.crop){const c=it.crop,h=size*c.h/c.w,scale=size/c.w;return <div style={{position:'absolute',left:it.x-size/2,top:it.y-h/2,width:size,height:h,overflow:'hidden',border:`12px solid ${pal.sheet}`,boxSizing:'content-box',transform:`rotate(${it.rot??0}deg) scale(${.85+.15*easeOut3(seg(age,0,.7))})`,opacity:seg(age,0,.5)*(1-out),boxShadow:`0 10px 40px #0008`}}><Img src={staticFile(it.src??'')} style={{position:'absolute',maxWidth:'none',width:c.imageW*scale,height:c.imageH*scale,left:-c.x*scale,top:-c.y*scale}}/></div>;}
	if (it.type === 'art' && it.art) {
		return <svg style={{position: 'absolute', left: it.x + px - size / 2, top: it.y + py - size / 2, overflow: 'visible', opacity: 1 - out, transform: `rotate(${it.rot ?? 0}deg)`}} width={size} height={size} viewBox="-500 -500 1000 1000">
			{isDarkArt(it.art)?<CadernoDarkArt kind={it.art} age={age} t={t} events={it.events??[]} pal={pal} label={it.label} personName={it.personName}/>:<SketchArt kind={it.art} age={age} t={t} events={it.events ?? []} B={B} pal={pal} k={'a' + i} label={it.label} rows={it.rows} bend={it.bend} />}
		</svg>;
	}
	// PNG: laço de construção a lápis, depois entra com mola, gira devagar e aproxima; sombra é mancha, não sombra chapada
	const pop = spring({frame: age * fps, fps, config: {damping: 12, stiffness: 120}});
	const sketchPart = seg(age, -0.45, 0);
	const rot = (it.rot ?? 0) + (1 - pop) * -14 + Math.sin(age * 0.8 + i) * 2.2 + (it.spin ?? 0) * Math.max(0, age);
	const sc = (0.35 + 0.65 * pop) * (1 + Math.max(0, age) * 0.018) * (1 - out * 0.4);
	const r = size * 0.5;
	return <div style={{position: 'absolute', left: it.x + px - r, top: it.y + py - r, width: size, height: size}}>
		<svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: (1 - seg(age, 0.4, 1.2) * 0.75) * (1 - out)}} width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`}>
			<SketchArt kind="loop" age={sketchPart * 0.55} t={t} events={[]} B={B} pal={{...pal, accentInk: pal.graph}} k={'pl' + i} />
		</svg>
		<div style={{position: 'absolute', left: size * 0.15, top: size * 0.86, width: size * 0.7, height: size * 0.12, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(70,60,50,.28), transparent 70%)', opacity: pop * (1 - out)}} />
		<Img src={staticFile(it.src ?? '')} style={{position: 'absolute', inset: 0, width: size, height: size, objectFit: 'contain', opacity: interpolate(age, [0, 0.12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - out), transform: `perspective(1600px) rotateY(${Math.sin(age * 0.6 + i) * 9}deg) rotate(${rot}deg) scale(${sc})`, filter: `${it.filter ?? ''} drop-shadow(0 6px 4px rgba(40,32,20,.18))`}} />
		{it.tape ? <div style={{position: 'absolute', left: size * 0.36, top: size * 0.04, width: size * 0.28, height: size * 0.07, background: 'rgba(239,226,180,.85)', transform: `rotate(${-4 + (i % 3) * 3}deg)`, opacity: pop * (1 - out)}} /> : null}
	</div>;
};

// legendas: frases agrupadas por sentido; cada palavra aparece quando é dita; destaque com marca-texto turquesa
type Word = CadernoProps['words'][number];
function useCaptions(props: CadernoProps, t: number, fps: number, page: boolean, pal: SketchPalette) {
	const blocks = useMemo(() => {
		const phrases = props.phrases ?? [];
		const clean = (v: string) => v.toLocaleLowerCase('pt-BR').replace(/[.,!?;:…]/g, '');
		const units: {words: Word[]; strong: boolean}[] = [];
		for (let i = 0; i < props.words.length;) {
			let n = 1;
			for (const ph of phrases) {const c = ph.split(' ').length; if (props.words.slice(i, i + c).map((w) => clean(w.text)).join(' ') === clean(ph)) {n = c; break;}}
			const ws = props.words.slice(i, i + n);
			units.push({words: ws, strong: n > 1 || ws.some((w) => props.keywords.some((k) => clean(w.text).toLocaleUpperCase('pt-BR') === k))});
			i += n;
		}
		const result: {words: Word[]; lines: {words: Word[]; strong: boolean}[]}[] = [];
		let words: Word[] = [], lines: {words: Word[]; strong: boolean}[] = [], pending: Word[] = [];
		const flushLine = () => {if (pending.length) {lines.push({words: pending, strong: false}); pending = [];}};
		const flush = () => {flushLine(); if (words.length) result.push({words, lines}); words = []; lines = [];};
		for (const u of units) {
			const last = words.at(-1);
			const nLines = lines.length + (pending.length ? 1 : 0);
			const addsLine = u.strong || pending.length === 0 || pending.length >= 3 || pending.map((w) => w.text).join(' ').length + u.words[0].text.length > 20;
			if (props.maxCaptionLines && nLines >= props.maxCaptionLines && addsLine) flush();
			if (words.length && (words.length + u.words.length > 9 || u.words.at(-1)!.endMs - words[0].startMs > 3300 || (last && /[.!?…]$/.test(last.text)) || (last && u.words[0].segment !== last.segment) || (nLines >= 3 && (u.strong || pending.length >= 3)))) flush();
			words.push(...u.words);
			if (u.strong) {flushLine(); lines.push(u);} else {if (pending.length >= 3 || pending.map((w) => w.text).join(' ').length + u.words[0].text.length > 20) flushLine(); pending.push(...u.words);}
		}
		flush();
		return result;
	}, [props.words, props.phrases, props.keywords, props.maxCaptionLines]);
	const ms = t * 1000;
	const bi = blocks.findIndex((g, i) => ms >= g.words[0].startMs - 60 && ms < Math.min(blocks[i + 1]?.words[0].startMs - 60 || Infinity, g.words.at(-1)!.endMs + 700));
	const block = blocks[bi];
	if (!block) return null;
	const ink = page ? pal.text : '#ffffff';
	return block.lines.map((l) => {
		const text = l.words.map((w) => w.text).join(' ');
		const size = l.strong ? Math.min(118, 1800 / Math.max(8, text.length)) : 84;
		return <div key={l.words[0].startMs} style={{fontFamily: l.strong ? 'EditorialSans' : 'EditorialSerif', fontSize: size, fontWeight: 700, lineHeight: l.strong ? 1.04 : 1.12, letterSpacing: l.strong ? -2.5 : -1, color: ink, textShadow: page ? 'none' : '0 3px 14px rgba(0,0,20,.75), 0 1px 3px rgba(0,0,20,.8)', marginBottom: 4}}>
			{l.words.map((w, j) => {
				// a linha entra inteira (centralizada); palavras ainda não ditas ficam esmaecidas, a dita acende
				const enter = interpolate(ms - l.words[0].startMs, [-40, 140], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const said = l.strong ? 1 : interpolate(ms - w.startMs, [-40, 120], [page ? 0.32 : 0.42, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const p = enter * said;
				const fill = l.strong ? interpolate(ms - w.startMs, [0, 240], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
				const lp = spring({frame: ((ms - l.words[0].startMs) / 1000) * fps, fps, config: {damping: 18, stiffness: 220}});
				const bar = props.solidCaptionHighlight ? '#00d0b8' : page ? 'rgba(0,208,184,.62)' : '#00d0b8';
				return <span key={j} style={{display: 'inline-block', padding: l.strong ? '0 10px' : '0 6px', opacity: p, filter: `blur(${(1 - enter) * 4}px)`, transform: `translateY(${(1 - lp) * 16}px)`,
					color: l.strong && (!page||props.darkMode) && fill > (props.solidCaptionHighlight ? 99 : 45) ? '#000068' : ink, textShadow: l.strong && (!page||props.darkMode) && fill > 45 ? 'none' : undefined,
					backgroundImage: l.strong ? `linear-gradient(${bar}, ${bar})` : undefined, backgroundRepeat: 'no-repeat',
					backgroundSize: l.strong ? `${fill}% ${props.solidCaptionHighlight ? 100 : page ? 46 : 84}%` : undefined, backgroundPosition: props.solidCaptionHighlight ? '0 50%' : page ? '0 88%' : '0 60%'}}>{w.text}</span>;
			})}
		</div>;
	});
}
