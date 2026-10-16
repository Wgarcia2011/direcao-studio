// Desenhos procedurais do Caderno Editorial. Coordenadas locais -500..500; o tempo é a idade do item em segundos.
// Usa o porte do kit sketchbook (sketchKit.tsx, MIT, cth9191/animate); composição e desenhos são deste projeto.
import React from 'react';
import {EraserTool, GFill, GLine, GPencil, Hatch, PencilTool, ScribbleFill, TAU, clamp01, easeInOut, easeOut3, loopPts, RNG, resample, seg, sketchBox, tanglePts, writeEnd, type Pt} from './sketchKit';

export type SketchPalette = {paper: string; ink: string; graph: string; accent: string; accentInk: string; red: string; sheet: string; text: string};
export const defaultSketchPalette: SketchPalette = {paper: '#f5f0e6', ink: '#0d1660', graph: '#6f6a63', accent: '#00d0b8', accentInk: '#00897b', red: '#e0483a', sheet: '#fffdf6', text: '#000068'};
export type ArtEvent = {at: number; kind: string; row?: number; col?: number; h?: number; text?: string};
export type ArtKind = 'path' | 'tangle' | 'answerCard' | 'clock' | 'door' | 'phone' | 'checklist' | 'arrow' | 'loop' | 'essay' | 'note';
type ArtProps = {kind: ArtKind; age: number; t: number; events: ArtEvent[]; B: number; pal: SketchPalette; k: string; label?: string; rows?: number; bend?: number};

const HAND = '"Ink Free", "Segoe Print", "Bradley Hand", cursive';
// letreiro à mão: cada letra entra em sequência, com tremor no boil (adaptado de handLetter)
export const HandText: React.FC<{text: string; x: number; y: number; size: number; reveal?: number; col: string; k: string; B: number; anchor?: 'middle' | 'start'}> = ({text, x, y, size, reveal = 1, col, k, B, anchor = 'middle'}) => {
	const R = RNG('hl', k, B), n = text.length, shown = clamp01(reveal) * n;
	let prev = 0;
	const dys: number[] = [], rots: number[] = [];
	for (let i = 0; i < n; i++) {const j = R.n(1.6); dys.push(j - prev); prev = j; rots.push(R.n(2.4));}
	return <text x={x} y={y} fontFamily={HAND} fontSize={size} fill={col} stroke={col} strokeWidth={size * 0.024} textAnchor={anchor} rotate={rots.join(' ')}>
		{text.split('').map((c, i) => <tspan key={i} dy={dys[i]} opacity={clamp01(shown - i) * 0.85 + (shown > i ? 0.15 : 0)}>{c}</tspan>)}
	</text>;
};
const evs = (events: ArtEvent[], kind: string, t: number) => events.filter((e) => e.kind === kind && e.at <= t + 1e-6);
const ageOf = (e: ArtEvent, t: number) => t - e.at;

export const SketchArt: React.FC<ArtProps> = (p) => {
	const {kind} = p;
	if (kind === 'path') return <PathArt {...p} />;
	if (kind === 'tangle') return <TangleArt {...p} />;
	if (kind === 'answerCard') return <AnswerCard {...p} />;
	if (kind === 'clock') return <ClockArt {...p} />;
	if (kind === 'door') return <DoorArt {...p} />;
	if (kind === 'phone') return <PhoneArt {...p} />;
	if (kind === 'checklist') return <ChecklistArt {...p} />;
	if (kind === 'arrow') return <ArrowArt {...p} />;
	if (kind === 'essay') return <EssayArt {...p} />;
	if (kind === 'note') return <NoteArt {...p} />;
	return <LoopArt {...p} />;
};

// caminho de subida até um ponto alto (cume em 330,-330): lápis, depois tinta, trilha tracejada
const PathArt: React.FC<ArtProps> = ({age, B, pal, k, t, events}) => {
	const hill: Pt[] = [[-500, 380], [-260, 260], [-60, 130], [110, -40], [250, -230], [330, -330], [420, -240], [500, -110]];
	const trail: Pt[] = [[-400, 350], [-150, 300], [-260, 200], [20, 120], [-60, 40], [170, -60], [110, -150], [280, -250], [330, -320]];
	const shade: Pt[] = [[330, -330], [420, -240], [500, -110], [500, 380], [330, 380]];
	return <g>
		<GPencil P={[[-500, 392], [0, 386], [500, 395]]} k={k + 'g'} B={B} part={seg(age, 0, 0.6)} col={pal.graph} />
		{age > 1.2 ? <Hatch P={shade} k={k + 'h'} B={B} col={pal.graph} a={0.38 * seg(age, 1.2, 1.8)} /> : null}
		<GPencil P={hill} k={k + 'hp'} B={B} part={seg(age, 0, 0.9)} col={pal.graph} w={3} />
		<GLine P={hill} k={k + 'hi'} B={B} part={seg(age, 0.5, 1.4)} col={pal.ink} w={8} />
		<GLine P={trail} k={k + 'tr'} B={B} part={seg(age, 0.9, 2.3)} col={pal.accentInk} w={7} dash="22 18" second={false} />
		{evs(events, 'loop', t).map((e) => <GLine key={e.at} P={loopPts(330, -420, 150, 130, 0.1)} k={k + 'lp'} B={B} part={seg(ageOf(e, t), 0, 0.55)} col={pal.accentInk} w={9} />)}
	</g>;
};

// nervosismo: emaranhado de grafite, batimento em tinta e gotas de suor; "calm" acalma a linha, "cross" risca
const TangleArt: React.FC<ArtProps> = ({age, B, pal, k, t, events}) => {
	const calm = evs(events, 'calm', t).at(-1), cross = evs(events, 'cross', t).at(-1);
	const c = calm ? easeInOut(ageOf(calm, t) / 1.2) : 0;
	const grow = seg(age, 0, 1.3);
	const beat: Pt[] = [];
	const R = RNG('beat', k, B);
	for (let i = 0; i <= 36; i++) {
		const x = -460 + i * (920 / 36), spike = i % 6 === 3 ? -220 : i % 6 === 4 ? 160 : 0;
		const amp = (1 - c) * Math.min(1, age / 1.4) * (1 + 0.15 * R.n(1));
		beat.push([x, 260 + spike * amp + c * 26 * Math.sin(i * 0.55) + (1 - c) * R.n(10)]);
	}
	return <g>
		<GPencil P={tanglePts(0, -110, 640, 430, k + 'a', 46)} k={k + 'ta'} B={B} part={grow} a={0.95 * (1 - 0.7 * c)} w={6.5} col={pal.graph} />
		<GPencil P={tanglePts(60, -60, 420, 300, k + 'b', 30)} k={k + 'tb'} B={B} part={seg(age, 0.3, 1.4)} a={0.85 * (1 - 0.7 * c)} w={5} col={pal.ink} />
		<GLine P={beat} k={k + 'bt'} B={B} part={seg(age, 0.2, 1.1)} col={c > 0.5 ? pal.accentInk : pal.ink} w={8} step={10} />
		{[0, 1].map((i) => {const f = ((age * 1.1 + i * 0.5) % 1), x = 330 + i * 70, y = -330 + i * 40 + f * 120;
			return age > 0.6 && c < 0.6 ? <g key={i} opacity={1 - f}><GLine P={[[x, y - 34], [x - 18, y + 4], [x, y + 20], [x + 18, y + 4], [x, y - 34]]} k={k + 'sw' + i} B={B} w={4.5} col={pal.ink} second={false} amp={0.6} /></g> : null;})}
		{cross ? <><GLine P={[[-360, -360], [360, 180]]} k={k + 'x1'} B={B} part={seg(ageOf(cross, t), 0, 0.3)} col={pal.ink} w={10} /><GLine P={[[360, -360], [-360, 180]]} k={k + 'x2'} B={B} part={seg(ageOf(cross, t), 0.2, 0.5)} col={pal.ink} w={10} /></> : null}
	</g>;
};

// cartão-resposta: linhas de bolinhas A–E; eventos mark / wrong / erase
const AnswerCard: React.FC<ArtProps> = ({age, B, pal, k, t, events, label, rows = 5}) => {
	const card = sketchBox(-370, -470, 740, 940, 26);
	const bx = (j: number) => -170 + j * 112, by = (i: number) => -250 + i * (640 / Math.max(1, rows - 1)) * 0.92;
	const marks = evs(events, 'mark', t).concat(evs(events, 'wrong', t));
	const erases = evs(events, 'erase', t);
	const active = [...marks, ...erases].sort((a, b) => a.at - b.at).at(-1);
	let tool: React.ReactNode = null;
	if (active && active.kind !== 'erase' && ageOf(active, t) < 0.9) {
		const P = loopPts(bx(active.col ?? 0), by(active.row ?? 0), 30, 30, 0.1);
		const tip = writeEnd(P, seg(ageOf(active, t), 0, 0.35));
		const off = ageOf(active, t) > 0.45 ? easeInOut((ageOf(active, t) - 0.45) / 0.45) * 160 : 0;
		tool = <PencilTool x={tip[0] + off} y={tip[1] - off * 0.6} ang={-0.75 + 0.08 * Math.sin(B * 1.7)} s={1.15} B={B} />;
	}
	if (active && active.kind === 'erase' && ageOf(active, t) < 1.25) {
		const a = ageOf(active, t), x = bx(active.col ?? 0), y = by(active.row ?? 0);
		const pass = a < 1 ? 46 * Math.sin(a * 17) : 0;
		tool = <g opacity={1 - seg(a, 1.0, 1.25)}><EraserTool x={x + 70 + pass} y={y - 40} ang={-0.5} s={0.9} B={B} />
			{Array.from({length: 7}, (_, i) => {const R = RNG('crumb', k, active.at, i), f = clamp01(a * 1.3 - i * 0.07);
				return f > 0 ? <ellipse key={i} cx={x + R.n(70)} cy={y + 30 + f * (60 + R.f() * 90)} rx={6} ry={4} fill="#ef9aa6" opacity={0.85 * (1 - seg(a, 0.9, 1.25))} /> : null;})}
		</g>;
	}
	return <g>
		<GFill P={card} col={pal.sheet} k={k + 'f'} B={B} a={seg(age, 0.1, 0.5)} />
		<GPencil P={card} k={k + 'cp'} B={B} part={seg(age, 0, 0.6)} col={pal.graph} />
		<GLine P={card} k={k + 'ci'} B={B} part={seg(age, 0.4, 1.1)} col={pal.ink} w={7} />
		<GLine P={[[-370, -360], [370, -360]]} k={k + 'hd'} B={B} part={seg(age, 0.8, 1.1)} col={pal.ink} w={4} second={false} />
		{label ? <HandText text={label} x={0} y={-395} size={50} reveal={seg(age, 0.8, 1.5)} col={pal.ink} k={k + 'lb'} B={B} /> : null}
		{Array.from({length: rows}, (_, i) => <g key={i}>
			<HandText text={String(i + 1).padStart(2, '0')} x={-300} y={by(i) + 16} size={44} reveal={seg(age, 1.0 + i * 0.08, 1.3 + i * 0.08)} col={pal.graph} k={k + 'n' + i} B={B} />
			{Array.from({length: 5}, (_, j) => {
				const P = loopPts(bx(j), by(i), 34, 34, 0.08);
				const m = marks.find((e) => e.row === i && e.col === j), er = erases.find((e) => e.row === i && e.col === j);
				const fill = m ? seg(ageOf(m, t), 0, 0.35) : 0, rub = er ? seg(ageOf(er, t), 0.1, 1.0) : 0;
				return <g key={j}>
					<GPencil P={P} k={`${k}b${i}${j}`} B={B} part={seg(age, 0.9 + i * 0.08 + j * 0.03, 1.3 + i * 0.08 + j * 0.03)} col={pal.graph} w={2.4} amp={1.2} />
					<text x={bx(j)} y={by(i) + 10} fontFamily={HAND} fontSize={28} fill={pal.graph} textAnchor="middle" opacity={seg(age, 1.3 + i * 0.08, 1.6 + i * 0.08) * (1 - fill)}>{'ABCDE'[j]}</text>
					{fill > 0 ? <g opacity={1 - rub * 0.8}><ScribbleFill P={P} col={pal.ink} k={`${k}m${i}${j}`} B={B} part={fill} gap={9} w={5} base={0.25} /></g> : null}
					{rub > 0 ? <ellipse cx={bx(j)} cy={by(i)} rx={44 * rub} ry={30 * rub} fill={pal.graph} opacity={0.32 * rub} /> : null}
					{m && m.kind === 'wrong' ? <GLine P={loopPts(bx(j), by(i), 56, 50, 0.12)} k={`${k}w${i}${j}`} B={B} part={seg(ageOf(m, t), 0.35, 0.75)} col={pal.red} w={6} second={false} /> : null}
				</g>;
			})}
		</g>)}
		{tool}
	</g>;
};

// relógio: mostrador desenhado, ponteiros por eventos {kind:'hands', h}, rótulo {kind:'label'}, respiração {kind:'calm'}
const ClockArt: React.FC<ArtProps> = ({age, B, pal, k, t, events}) => {
	const hs = evs(events, 'hands', t);
	const cur = hs.at(-1), prev = hs.at(-2);
	const h0 = prev?.h ?? cur?.h ?? 9, h1 = cur?.h ?? 9, kk = cur ? easeInOut(ageOf(cur, t) / 1.1) : 1;
	const hour = h0 + (((h1 - h0 + 12) % 12) || 0) * kk;
	const ha = (hour / 12) * TAU - Math.PI / 2, ma = ((hour % 1) * TAU) - Math.PI / 2;
	const face = loopPts(0, 0, 330, 330, 0.06);
	const calm = evs(events, 'calm', t).at(-1);
	const label = evs(events, 'label', t).at(-1);
	return <g>
		{calm ? [0, 1, 2].map((i) => {const ca = ageOf(calm, t), r = 390 + i * 46 + 26 * Math.sin((ca / 2.6) * TAU - i * 0.6);
			return <GLine key={i} P={loopPts(0, 0, r, r * 0.97, 0.05, -1.4 + i)} k={k + 'c' + i} B={B} part={seg(ca, i * 0.15, 0.8 + i * 0.15)} col={pal.accentInk} w={6 - i * 1.5} a={0.75 - i * 0.18} second={false} />;}) : null}
		<GFill P={face} col={pal.sheet} k={k + 'f'} B={B} a={seg(age, 0.1, 0.5)} />
		<ScribbleFill P={face} col={pal.accent} k={k + 'sf'} B={B} part={seg(age, 1.0, 1.8)} base={0.18} a={0.35} gap={16} />
		<GPencil P={face} k={k + 'p'} B={B} part={seg(age, 0, 0.6)} col={pal.graph} w={3} />
		<GLine P={face} k={k + 'i'} B={B} part={seg(age, 0.4, 1.1)} col={pal.ink} w={10} />
		{Array.from({length: 12}, (_, i) => {const a = (i / 12) * TAU, r0 = i % 3 ? 280 : 255; return <GLine key={i} P={[[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * 305, Math.sin(a) * 305]]} k={k + 't' + i} B={B} part={seg(age, 0.8 + i * 0.03, 1.0 + i * 0.03)} col={pal.ink} w={i % 3 ? 4 : 8} second={false} amp={0.5} />;})}
		<GLine P={[[0, 0], [Math.cos(ma) * 235, Math.sin(ma) * 235]]} k={k + 'mh'} B={B} part={seg(age, 1.0, 1.3)} col={pal.ink} w={9} second={false} amp={0.6} />
		<GLine P={[[0, 0], [Math.cos(ha) * 160, Math.sin(ha) * 160]]} k={k + 'hh'} B={B} part={seg(age, 1.0, 1.3)} col={pal.ink} w={16} second={false} amp={0.6} />
		<circle r={16} fill={pal.ink} opacity={seg(age, 1.0, 1.2)} />
		{label?.text ? <HandText key={label.at} text={label.text} x={0} y={470} size={78} reveal={seg(ageOf(label, t), 0, 0.6)} col={pal.ink} k={k + 'l' + label.at} B={B} /> : null}
	</g>;
};

// porta: batente desenhado, folha entreaberta e seta que entra
const DoorArt: React.FC<ArtProps> = ({age, B, pal, k, t, events, label}) => {
	const frame = sketchBox(-210, -400, 420, 800, 6);
	const leaf: Pt[] = [[-190, -380], [70, -330], [70, 360], [-190, 390]];
	const arrow = evs(events, 'arrow', t).at(-1);
	const ap: Pt[] = [[-500, 330], [-360, 200], [-220, 160], [-60, 150]];
	const part = arrow ? seg(ageOf(arrow, t), 0, 0.7) : 0;
	const end = resample(ap, 6), e = end[end.length - 1], q = end[Math.max(0, end.length - 5)], an = Math.atan2(e[1] - q[1], e[0] - q[0]);
	return <g>
		<GFill P={leaf} col={pal.sheet} k={k + 'lf'} B={B} a={seg(age, 0.3, 0.7)} />
		<Hatch P={leaf} k={k + 'h'} B={B} col={pal.graph} a={0.3 * seg(age, 0.9, 1.3)} />
		<GPencil P={frame} k={k + 'fp'} B={B} part={seg(age, 0, 0.6)} col={pal.graph} />
		<GLine P={frame} k={k + 'fi'} B={B} part={seg(age, 0.4, 1.1)} col={pal.ink} w={9} />
		<GLine P={[...leaf, leaf[0]]} k={k + 'li'} B={B} part={seg(age, 0.6, 1.2)} col={pal.ink} w={6} />
		<circle cx={40} cy={20} r={12} fill={pal.ink} opacity={seg(age, 1.1, 1.3)} />
		{label ? <HandText text={label} x={0} y={-440} size={70} reveal={seg(age, 0.9, 1.6)} col={pal.ink} k={k + 'lb'} B={B} /> : null}
		{part > 0 ? <GLine P={ap} k={k + 'ar'} B={B} part={part} col={pal.accentInk} w={10} second={false} /> : null}
		{part > 0.9 ? [-1, 1].map((s) => <GLine key={s} P={[e, [e[0] - Math.cos(an + s * 0.5) * 60, e[1] - Math.sin(an + s * 0.5) * 60]]} k={k + 'ah' + s} B={B} col={pal.accentInk} w={10} second={false} amp={0.5} />) : null}
	</g>;
};

// celular: corpo em tinta, tela clara; {kind:'cards'} empilha resumos, {kind:'scroll'} rola a tela
const PhoneArt: React.FC<ArtProps> = ({age, B, pal, k, t, events}) => {
	const body = sketchBox(-240, -470, 480, 940, 64), screen = sketchBox(-205, -400, 410, 790, 26);
	const cards = evs(events, 'cards', t).at(-1), scroll = evs(events, 'scroll', t).at(-1);
	const sc = scroll ? ageOf(scroll, t) * 70 : 0;
	const id = 'ph-' + k.replace(/[^\w-]/g, '');
	return <g>
		<GFill P={body} col={pal.ink} k={k + 'bf'} B={B} a={0.95 * seg(age, 0.4, 0.9)} />
		<GPencil P={body} k={k + 'bp'} B={B} part={seg(age, 0, 0.6)} col={pal.graph} w={3} />
		<GLine P={body} k={k + 'bi'} B={B} part={seg(age, 0.3, 1.0)} col={pal.ink} w={9} />
		<GFill P={screen} col={pal.sheet} k={k + 'sf'} B={B} off={[0, 0]} a={seg(age, 0.7, 1.0)} />
		<defs><clipPath id={id}><rect x={-205} y={-400} width={410} height={790} rx={26} /></clipPath></defs>
		<g clipPath={`url(#${id})`}>
			{cards ? Array.from({length: 8}, (_, i) => {
				const ca = ageOf(cards, t), f = easeOut3(seg(ca, i * 0.22, i * 0.22 + 0.45)), y = -360 + i * 170 - sc;
				if (f <= 0) return null;
				return <g key={i} transform={`translate(0 ${y - (1 - f) * 140})`} opacity={f}>
					<GFill P={sketchBox(-175, 0, 350, 140, 12, 0)} col="#ffffff" k={`${k}c${i}`} B={B} off={[3, 3]} />
					<GFill P={[[-175, 0], [-155, 0], [-155, 140], [-175, 140]]} col={i % 2 ? pal.accent : pal.accentInk} k={`${k}cm${i}`} B={B} off={[0, 0]} />
					<GLine P={sketchBox(-175, 0, 350, 140, 12)} k={`${k}co${i}`} B={B} w={3.5} col={pal.ink} second={false} amp={0.8} />
					{[0, 1, 2].map((l) => <GLine key={l} P={[[-125, 36 + l * 34], [-125 + [250, 210, 150][l], 36 + l * 34]]} k={`${k}l${i}${l}`} B={B} w={5} col={pal.graph} second={false} amp={0.6} part={seg(ca, i * 0.22 + 0.3 + l * 0.08, i * 0.22 + 0.5 + l * 0.08)} />)}
				</g>;
			}) : null}
		</g>
		<GLine P={[[-50, -435], [50, -435]]} k={k + 'sp'} B={B} col={pal.sheet} w={8} second={false} part={seg(age, 0.9, 1.1)} />
	</g>;
};

// lista: caixas e linhas; {kind:'check', row} marca
const ChecklistArt: React.FC<ArtProps> = ({age, B, pal, k, t, events, rows = 3}) => <g>
	{Array.from({length: rows}, (_, i) => {
		const y = -300 + i * 260, c = evs(events, 'check', t).find((e) => e.row === i);
		return <g key={i}>
			<GPencil P={sketchBox(-420, y - 70, 140, 140, 14)} k={`${k}bp${i}`} B={B} part={seg(age, i * 0.15, 0.5 + i * 0.15)} col={pal.graph} />
			<GLine P={sketchBox(-420, y - 70, 140, 140, 14)} k={`${k}bi${i}`} B={B} part={seg(age, 0.3 + i * 0.15, 0.8 + i * 0.15)} col={pal.ink} w={7} />
			<GPencil P={[[-220, y - 15], [380, y - 25]]} k={`${k}l${i}`} B={B} part={seg(age, 0.4 + i * 0.15, 0.9 + i * 0.15)} col={pal.ink} w={7} />
			<GPencil P={[[-220, y + 40], [200, y + 34]]} k={`${k}m${i}`} B={B} part={seg(age, 0.5 + i * 0.15, 1.0 + i * 0.15)} col={pal.graph} w={6} a={0.6} />
			{c ? <GLine P={[[-395, y - 5], [-355, y + 45], [-250, y - 110]]} k={`${k}c${i}`} B={B} part={seg(ageOf(c, t), 0, 0.35)} col={pal.accentInk} w={20} step={8} /> : null}
		</g>;
	})}
</g>;

// seta a lápis que liga dois desenhos; bend curva o traço
const ArrowArt: React.FC<ArtProps> = ({age, B, pal, k, bend = 0.35}) => {
	const P: Pt[] = [];
	for (let i = 0; i <= 16; i++) {const u = i / 16; P.push([-460 + 920 * u, -Math.sin(u * Math.PI) * 460 * bend]);}
	const part = seg(age, 0, 0.8), Q = resample(P, 6), e = Q[Q.length - 1], q = Q[Q.length - 5], an = Math.atan2(e[1] - q[1], e[0] - q[0]);
	return <g>
		<GPencil P={P} k={k} B={B} part={part} col={pal.ink} w={6} a={0.95} />
		{part >= 1 ? [-1, 1].map((s) => <GPencil key={s} P={[e, [e[0] - Math.cos(an + s * 0.5) * 70, e[1] - Math.sin(an + s * 0.5) * 70]]} k={k + s} B={B} col={pal.ink} w={6} amp={0.6} />) : null}
	</g>;
};

// laço de anotação (marca o que importa)
const LoopArt: React.FC<ArtProps> = ({age, B, pal, k}) => <GLine P={loopPts(0, 0, 440, 320, 0.12)} k={k} B={B} part={seg(age, 0, 0.55)} col={pal.accentInk} w={11} />;

// folha pautada com título à mão; {kind:'write'} escreve as linhas com o lápis acompanhando
const EssayArt: React.FC<ArtProps> = ({age, B, pal, k, t, events, label, rows = 7}) => {
	const sheet = sketchBox(-360, -470, 720, 940, 14);
	const w = evs(events, 'write', t).at(-1), wa = w ? ageOf(w, t) : -1;
	const lines = Array.from({length: rows}, (_, i) => {const y = -250 + i * 95, R = RNG('ess', k, i), L = 520 - (i === rows - 1 ? 220 : R.f() * 90); const P: Pt[] = []; for (let j = 0; j <= 24; j++) {const x = -290 + (L * j) / 24; P.push([x, y + Math.sin(j * 1.7 + i) * 7]);} return P;});
	const per = 0.55, cur = wa >= 0 ? Math.min(rows - 1, Math.floor(wa / per)) : -1;
	const tip = cur >= 0 && wa < rows * per + 0.3 ? writeEnd(lines[cur], seg(wa, cur * per, (cur + 1) * per)) : null;
	return <g>
		<GFill P={sheet} col={pal.sheet} k={k + 'f'} B={B} a={seg(age, 0.1, 0.5)} />
		<GPencil P={sheet} k={k + 'p'} B={B} part={seg(age, 0, 0.6)} col={pal.graph} />
		<GLine P={sheet} k={k + 'i'} B={B} part={seg(age, 0.4, 1.1)} col={pal.ink} w={7} />
		{Array.from({length: rows}, (_, i) => <GPencil key={'r' + i} P={[[-300, -238 + i * 95], [300, -238 + i * 95]]} k={k + 'r' + i} B={B} part={seg(age, 0.7 + i * 0.05, 1.0 + i * 0.05)} col={pal.accentInk} w={2} a={0.5} amp={0.8} passes={1} />)}
		<GPencil P={[[-305, -470], [-305, 470]]} k={k + 'm'} B={B} part={seg(age, 0.8, 1.2)} col={pal.red} w={2.4} a={0.5} passes={1} />
		{label ? <HandText text={label} x={0} y={-330} size={64} reveal={seg(age, 0.9, 1.6)} col={pal.ink} k={k + 'lb'} B={B} /> : null}
		{wa >= 0 ? lines.map((P, i) => <GLine key={i} P={P} k={k + 'w' + i} B={B} part={seg(wa, i * per, (i + 1) * per)} col={pal.ink} w={4} second={false} amp={1.4} step={8} />) : null}
		{tip ? <PencilTool x={tip[0]} y={tip[1]} ang={-0.75 + 0.08 * Math.sin(B * 1.7)} s={1.1} B={B} /> : null}
	</g>;
};

// anotação à mão (texto da fala) com sublinhado escrito depois
const NoteArt: React.FC<ArtProps> = ({age, B, pal, k, label = ''}) => {
	const w = Math.min(900, label.length * 52);
	return <g>
		<HandText text={label} x={0} y={30} size={110} reveal={seg(age, 0, 0.9)} col={pal.ink} k={k + 't'} B={B} />
		<GLine P={[[-w / 2, 80], [0, 92], [w / 2, 72]]} k={k + 'u'} B={B} part={seg(age, 0.8, 1.2)} col={pal.accentInk} w={9} second={false} amp={2.2} />
	</g>;
};
