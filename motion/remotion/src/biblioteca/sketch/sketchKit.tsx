/*
 Porte parcial para SVG/Remotion de técnicas do estilo "sketchbook" do Animate:
 https://github.com/cth9191/animate — commit 7e5eb56feb2dd573f890e1b7b34748af43d58263 (05/10/2026).
 Origem: plugins/animate/skills/animate/kit/core.js (mulberry32, hash, RNG, resample, subPath, trace)
 e styles/sketchbook/kit.js (gwob, writeOn, gline, gpencil, loopPts, sketchBox, scribbleFill, ghatch,
 highlight, pencilTool, eraserTool). O desenho em Canvas virou geração de caminhos SVG; o tempo vem do
 frame do Remotion e o "boil" (tremor) é reamostrado a cada 2 quadros. Nada depende do quadro anterior.

 MIT License

 Copyright (c) 2026 cth9191

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/
import React from 'react';

export type Pt = [number, number];
export const TAU = Math.PI * 2;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut3 = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeInOut = (t: number) => {const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;};

function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a |= 0; a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function hash(...xs: (string | number)[]) {
	let h = 2166136261 >>> 0;
	for (const x of xs) {
		const s = String(x);
		for (let i = 0; i < s.length; i++) {h ^= s.charCodeAt(i); h = Math.imul(h, 16777619);}
		h ^= 124; h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
export function RNG(...xs: (string | number)[]) {
	const f = mulberry32(hash(...xs));
	return {f, r: (a: number, b: number) => a + (b - a) * f(), n: (amt: number) => (f() * 2 - 1) * amt};
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function resample(P: Pt[], step: number): Pt[] {
	const out: Pt[] = [];
	for (let i = 0; i < P.length - 1; i++) {
		const a = P[i], b = P[i + 1], k = Math.max(1, Math.ceil(dist(a, b) / step));
		for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
	}
	out.push(P[P.length - 1]);
	return out;
}
function subPath(P: Pt[], frac: number): Pt[] {
	let L = 0;
	for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]);
	let want = L * clamp01(frac);
	const out: Pt[] = [P[0]];
	for (let i = 1; i < P.length; i++) {
		const d = dist(P[i - 1], P[i]);
		if (want >= d) {out.push(P[i]); want -= d;} else {const k = want / (d || 1); out.push([lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)]); break;}
	}
	return out;
}
// write-on: a primeira fração do traço, por comprimento
export function writeOn(P: Pt[], part: number): Pt[] | null {
	if (part >= 1) return P;
	if (part <= 0) return null;
	const Q = subPath(P, part);
	return Q.length > 1 ? Q : null;
}
export const writeEnd = (P: Pt[], part: number): Pt => {const Q = writeOn(resample(P, 12), clamp01(part)); return Q ? Q[Q.length - 1] : P[0];};
export const closeP = (P: Pt[]): Pt[] => [...P, P[0]];
// tremor ao longo da normal; fases reamostradas a cada passo de boil (B); índice como parâmetro, então o tremor percorre o traço
export function gwob(P: Pt[], key: string, amp: number, B: number): Pt[] {
	const R = RNG('gw', key, B), p1 = R.r(0, TAU), p2 = R.r(0, TAU), f1 = 0.28 + R.f() * 0.25, f2 = 0.9 + R.f() * 0.5;
	const n = P.length;
	return P.map((p, i) => {
		const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
		let nx = a[1] - b[1], ny = b[0] - a[0];
		const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
		const o = amp * (0.62 * Math.sin(i * f1 + p1) + 0.38 * Math.sin(i * f2 + p2));
		return [p[0] + nx * o, p[1] + ny * o];
	});
}
// polilinha suavizada por quadráticas nos pontos médios (como trace() do core)
export function trace(P: Pt[], closed = false): string {
	const n = P.length;
	if (n < 2) return '';
	const f = (v: number) => v.toFixed(1);
	let d = `M${f(P[0][0])} ${f(P[0][1])}`;
	for (let i = 1; i < n - 1; i++) {const p = P[i], q = P[i + 1]; d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;}
	d += `L${f(P[n - 1][0])} ${f(P[n - 1][1])}`;
	return closed ? d + 'Z' : d;
}
// laço desenhado à mão: passa do início e se afasta um pouco
export function loopPts(cx: number, cy: number, rx: number, ry: number, over = 0.07, a0 = -2.2): Pt[] {
	const N = Math.max(24, Math.ceil((rx + ry) * 0.35)), P: Pt[] = [];
	for (let i = 0; i <= N; i++) {const u = i / N, a = a0 + u * TAU * (1 + over), s = 1 + 0.035 * u * Math.sign(over); P.push([cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s]);}
	return P;
}
// caixa traçada de uma vez, cantos arredondados, a caneta passa um pouco do começo
export function sketchBox(x: number, y: number, w: number, h: number, r = 0, over = 0.04): Pt[] {
	const P: Pt[] = [];
	const arc = (cx: number, cy: number, a0: number) => {for (let i = 0; i <= 6; i++) {const a = a0 + (i / 6) * (Math.PI / 2); P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);}};
	arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
	// adaptação: fecha a borda superior e passa um pouco do ponto inicial
	P.push([x + w - r + w * over, y - 1.5]);
	return P;
}
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, n = 48): Pt[] {
	const P: Pt[] = [];
	for (let i = 0; i <= n; i++) {const a = (i / n) * TAU; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);}
	return P;
}

type LineOpt = {w?: number; col?: string; a?: number; k: string; amp?: number; part?: number; step?: number; second?: boolean; closed?: boolean; B: number; dash?: string};
// tinta: um traço firme e uma segunda passada fina que não concorda totalmente
export const GLine: React.FC<{P: Pt[]} & LineOpt> = ({P, w = 5, col = '#0d1660', a = 1, k, amp = 1.7, part = 1, step = 12, second = true, closed, B, dash}) => {
	const Q = writeOn(resample(closed ? closeP(P) : P, step), part);
	if (!Q) return null;
	return <g opacity={a} fill="none" stroke={col} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash}>
		<path d={trace(gwob(Q, k, amp, B))} strokeWidth={w} />
		{second ? <path d={trace(gwob(Q, k + '~', amp * 1.6, B))} strokeWidth={w * 0.42} opacity={0.55} /> : null}
	</g>;
};
// grafite: duas passadas leves, a segunda mais solta (construção, rascunho, o que ainda não está decidido)
export const GPencil: React.FC<{P: Pt[]; passes?: number} & LineOpt> = ({P, w = 2.6, col = '#6f6a63', a = 0.8, k, amp = 2.4, part = 1, step = 12, passes = 2, closed, B, dash}) => {
	const Q = writeOn(resample(closed ? closeP(P) : P, step), part);
	if (!Q) return null;
	return <g fill="none" stroke={col} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash}>
		{Array.from({length: passes}, (_, i) => <path key={i} d={trace(gwob(Q, k + ':' + i, amp * (1 + i * 0.6), B))} strokeWidth={w * (i ? 0.8 : 1)} opacity={a * (i ? 0.5 : 0.85)} />)}
	</g>;
};
// cor chapada um pouco fora da linha (a passada de cor não registra com a tinta)
export const GFill: React.FC<{P: Pt[]; col: string; a?: number; off?: Pt; k: string; B: number}> = ({P, col, a = 1, off = [4, 3], k, B}) =>
	<path d={trace(gwob(resample(P, 14), k, 2, B), true)} fill={col} opacity={a} transform={`translate(${off[0]} ${off[1]})`} />;

let clipSeq = 0;
const nextId = (p: string) => `${p}-${(clipSeq = (clipSeq + 1) % 1e9)}`;
// rabisco de vai-e-vem que pinta uma forma (recortado); write-on com part
export const ScribbleFill: React.FC<{P: Pt[]; col: string; k: string; B: number; part?: number; gap?: number; w?: number; ang?: number; base?: number; a?: number}> = ({P, col, k, B, part = 1, gap = 11, w = 3.4, ang = -0.6, base = 0.3, a = 0.9}) => {
	const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
	const x0 = Math.min(...xs) - 6, x1 = Math.max(...xs) + 6, y0 = Math.min(...ys) - 6, y1 = Math.max(...ys) + 6;
	const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2, ca = Math.cos(ang), sa = Math.sin(ang), S = RNG('sfs', k), Z: Pt[] = [];
	for (let d = -rad, i = 0; d <= rad; d += gap, i++) {const e = i % 2 ? 1 : -1, L = rad * (0.9 + S.f() * 0.15); Z.push([cx - sa * d + ca * L * e, cy + ca * d + sa * L * e]);}
	const id = React.useMemo(() => nextId('sf-' + k.replace(/[^\w-]/g, '')), [k]);
	if (part <= 0) return null;
	return <g>
		<defs><clipPath id={id}><path d={trace(resample(P, 16), true)} /></clipPath></defs>
		<g clipPath={`url(#${id})`}>
			{base > 0 ? <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={col} opacity={base * clamp01(part * 3)} /> : null}
			<GLine P={Z} col={col} w={w} a={a} k={k + 'z'} amp={1.3} part={part} step={14} second={false} B={B} />
		</g>
	</g>;
};
// hachura paralela dentro de um recorte; estrutura pela chave, tremor pelo boil
export const Hatch: React.FC<{P: Pt[]; k: string; B: number; col?: string; gap?: number; ang?: number; w?: number; a?: number}> = ({P, k, B, col = '#6f6a63', gap = 8, ang = -0.85, w = 2, a = 0.45}) => {
	const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
	const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
	const S = RNG('ghs', k), R = RNG('ghj', k, B), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2 + 4, ca = Math.cos(ang), sa = Math.sin(ang);
	let d = '';
	for (let o = -rad; o <= rad; o += gap) {const j = R.n(1.1), len = rad * (0.8 + S.f() * 0.25), px = cx - sa * (o + j), py = cy + ca * (o + j); d += `M${(px - ca * len).toFixed(1)} ${(py - sa * len).toFixed(1)}L${(px + ca * len).toFixed(1)} ${(py + sa * len).toFixed(1)}`;}
	const id = React.useMemo(() => nextId('h-' + k.replace(/[^\w-]/g, '')), [k]);
	return <g><defs><clipPath id={id}><path d={trace(resample(P, 16), true)} /></clipPath></defs><path clipPath={`url(#${id})`} d={d} stroke={col} strokeWidth={w} opacity={a} strokeLinecap="round" /></g>;
};
// emaranhado de grafite: a bagunça (forma pela chave, tremor pelo boil)
export function tanglePts(cx: number, cy: number, w: number, h: number, k: string, n = 34): Pt[] {
	const S = RNG('gsc', k), P: Pt[] = [], a1 = 1.2 + S.f() * 1.6, a2 = 2.3 + S.f() * 1.9, ph = S.f() * TAU;
	for (let i = 0; i < n; i++) {const u = (i / n) * Math.PI * 4; P.push([cx + (Math.sin(u * a1 * 0.5 + ph) * w) / 2 * (0.55 + 0.45 * S.f()), cy + (Math.cos(u * a2 * 0.5) * h) / 2 * (0.55 + 0.45 * S.f())]);}
	return P;
}
// lápis (ponta em 0,0; corpo para cima e à direita) e borracha, simplificados do kit
export const PencilTool: React.FC<{x: number; y: number; ang: number; s?: number; B: number; lead?: string}> = ({x, y, ang, s = 1, B, lead = '#3b3632'}) =>
	<g transform={`translate(${x} ${y}) rotate(${(ang * 180) / Math.PI}) scale(${s})`}>
		<GFill P={[[0, 0], [38, -13], [38, 13]]} col="#ecc995" off={[0, 0]} k="pt1" B={B} />
		<GFill P={[[0, 0], [12, -4], [12, 4]]} col={lead} off={[0, 0]} k="pt2" B={B} />
		<GFill P={[[38, -13], [250, -13], [250, 13], [38, 13]]} col="#f1bf2c" off={[3, 2]} k="pt3" B={B} />
		<GFill P={[[250, -14], [278, -14], [278, 14], [250, 14]]} col="#b9b3a8" off={[0, 0]} k="pt5" B={B} />
		<GFill P={[[278, -13], [300, -12], [302, 12], [278, 13]]} col="#ef9aa6" off={[0, 0]} k="pt6" B={B} />
		<GLine P={[[0, 0], [38, -13], [300, -13], [302, 12], [38, 13], [0, 0]]} w={3.2} k="pt7" amp={0.8} second={false} B={B} col="#2a2420" />
	</g>;
export const EraserTool: React.FC<{x: number; y: number; ang: number; s?: number; B: number}> = ({x, y, ang, s = 1, B}) =>
	<g transform={`translate(${x} ${y}) rotate(${(ang * 180) / Math.PI}) scale(${s})`}>
		<GFill P={sketchBox(-80, -42, 160, 84, 18, 0)} col="#ef9aa6" k="er1" B={B} />
		<GFill P={[[-5, -46], [86, -46], [86, 46], [-5, 46]]} col="#f4efe4" off={[2, 2]} k="er2" B={B} />
		<GFill P={[[20, -46], [42, -46], [42, 46], [20, 46]]} col="#00a99a" off={[0, 0]} k="er3" B={B} a={0.9} />
		<GLine P={sketchBox(-80, -42, 160, 84, 18)} w={4} k="er4" B={B} col="#2a2420" />
	</g>;
