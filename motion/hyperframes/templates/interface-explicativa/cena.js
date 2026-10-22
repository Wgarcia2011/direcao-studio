// Template Interface Explicativa — fala em tela cheia com legenda central e
// inserts de interface (perfil, busca, pergunta, checklist) entre as frases.
// Referência estrutural: Pin 984106956076960638. Tudo é função pura do tempo
// (renderAt); nenhum relógio, laço ou tween próprio.
import {ROTEIRO} from './roteiro.js';
import {LEGENDAS} from './legendas.js';

const W = 1080, H = 1920;
const P = {acento: '#6E29FF', acento2: '#9764FD', lavanda: '#DECEFD', claro: '#FFFFFF', escuro: '#171717', tinta: '#1B1530', luz: '#6D40CC', faixa: '#1F2FB8', destaqueClaro: '#CDB8FF', ...(ROTEIRO.paleta ?? {})};
const SRC_W = ROTEIRO.fonteVideo?.largura ?? 1080, SRC_H = ROTEIRO.fonteVideo?.altura ?? 1920;
const ENQ = {cx: SRC_W / 2, cy: SRC_H / 2, zoom: 1, rostoY: 640, ...(ROTEIRO.enquadramento ?? {})};
const LEG_Y = ROTEIRO.legendaY ?? 860;
const DUR_TR = {corte: 0, luz: 0.32, branco: 0.28, whip: 0.26, zoom: 0.34, cartao: 1.0};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = (x) => Math.pow(clamp(x), 3);
const easeInOut = (x) => {x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;};
const easeBack = (x) => {x = clamp(x); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);};
const spring = (s) => s <= 0 ? 0 : 1 - Math.exp(-7 * s) * Math.cos(9 * s);
const grad = `linear-gradient(90deg, ${P.acento} 0%, ${P.acento2} 100%)`;
// Sobre a fala (fundo escuro) o degradê fica mais claro para manter o contraste.
const gradVideo = `linear-gradient(90deg, ${P.acento2} 0%, ${P.destaqueClaro} 100%)`;

// Ícones próprios (viewBox 48×48). 'selo' é o marcador de lista da referência.
const ICONES = {
  selo: `<path d="M24 3 42 13.5v21L24 45 6 34.5v-21z" fill="${P.acento}"/><path d="m15 24 6.5 6.5L33.5 18" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  caixa: `<path d="M24 5 41 13v22L24 43 7 35V13z" fill="${P.acento}"/><path d="M7 13l17 8 17-8M24 21v22" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M18 26h-4M18 31h-4" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`,
  pular: `<path d="M9 9v30l22-15z" fill="${P.acento}"/><rect x="34" y="9" width="6" height="30" rx="2" fill="${P.acento}"/>`,
  lupa: `<circle cx="21" cy="21" r="12" fill="none" stroke="${P.acento}" stroke-width="5"/><path d="m30 30 10 10" stroke="${P.acento}" stroke-width="6" stroke-linecap="round"/>`,
  raio: `<path d="M27 3 9 27h13l-3 18 20-26H26z" fill="${P.acento}"/>`,
  alvo: `<circle cx="24" cy="24" r="19" fill="none" stroke="${P.acento}" stroke-width="4"/><circle cx="24" cy="24" r="11" fill="none" stroke="${P.acento}" stroke-width="4"/><circle cx="24" cy="24" r="4" fill="${P.acento}"/>`,
  livro: `<path d="M6 10c6-3 12-3 18 1v29c-6-4-12-4-18-1z" fill="${P.acento}"/><path d="M42 10c-6-3-12-3-18 1v29c6-4 12-4 18-1z" fill="${P.acento2}"/>`,
  grafico: `<rect x="7" y="27" width="8" height="14" rx="2" fill="${P.acento2}"/><rect x="20" y="18" width="8" height="23" rx="2" fill="${P.acento}"/><rect x="33" y="8" width="8" height="33" rx="2" fill="${P.acento}"/>`,
  relogio: `<circle cx="24" cy="24" r="19" fill="${P.acento}"/><path d="M24 12v13l8 5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  estrela: `<path d="m24 4 5.9 12.6 13.6 1.6-10 9.4 2.6 13.4L24 34.4 11.9 41l2.6-13.4-10-9.4 13.6-1.6z" fill="${P.acento}"/>`,
};
export const NOMES_ICONES = Object.keys(ICONES);
const icone = (nome, px) => `<svg viewBox="0 0 48 48" width="${px}" height="${px}" aria-hidden="true">${ICONES[nome] ?? ICONES.selo}</svg>`;

const el = (tag, css = '', parent, html) => {const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; parent?.append(e); return e;};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const destaqueCss = `background:${grad};-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700`;
// "Procurando uma *resposta*" → palavras em spans; *x* recebe o degradê.
function textoRico(texto, parent, {destaqueEscala = 1} = {}) {
  const spans = [];
  String(texto).split(/(\*[^*]+\*)/).filter(Boolean).forEach((parte) => {
    const marcado = parte.startsWith('*') && parte.endsWith('*');
    (marcado ? parte.slice(1, -1) : parte).split(/(\s+)/).forEach((w) => {
      if (!w) return;
      if (/^\s+$/.test(w)) {parent.append(document.createTextNode(' ')); return;}
      spans.push(el('span', `display:inline-block;${marcado ? destaqueCss + `;font-size:${destaqueEscala}em` : ''}`, parent, esc(w)));
    });
  });
  return spans;
}
const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export async function criarCena({root, fala, video, range}) {
  await Promise.all(['400', '500', '700'].map((w) => document.fonts.load(`${w} 64px IEText`)).concat(document.fonts.load('400 64px IEHand')));

  // ---------- fala: enquadramento fixo 9:16 ----------
  const base = Math.max(W / SRC_W, H / SRC_H) * ENQ.zoom;
  const vx = clamp(W / 2 - ENQ.cx * base, W - SRC_W * base, 0), vy = clamp(H / 2 - ENQ.cy * base, H - SRC_H * base, 0);
  video.style.transform = `translate(${vx}px,${vy}px) scale(${base})`;
  const sombra = el('div', `position:absolute;left:0;top:${LEG_Y - 260}px;width:${W}px;height:620px;background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(6,6,30,.42),rgba(6,6,30,0));pointer-events:none`, fala);
  const sobre = el('div', 'position:absolute;inset:0', fala);
  const legenda = el('div', `position:absolute;left:40px;top:${LEG_Y}px;width:1000px;text-align:center;color:#fff;font-weight:500;font-size:64px;line-height:1.12;text-shadow:0 4px 22px rgba(0,0,0,.45)`, fala);

  // Camadas acima da fala
  const cenasHost = el('div', 'position:absolute;inset:0;pointer-events:none', root);
  const luz = el('div', `position:absolute;inset:0;opacity:0;background:linear-gradient(165deg,#ffffff 0%,#f4eeff 30%,#c4a8ff 55%,${P.luz} 78%,${P.acento} 100%)`, root);
  const raio = el('div', 'position:absolute;left:-400px;top:-200px;width:1900px;height:520px;opacity:0;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.95),rgba(255,255,255,0));transform-origin:50% 50%', root);
  const branco = el('div', 'position:absolute;inset:0;opacity:0;background:#F4F2F8', root);
  const marca = ROTEIRO.fixture ? el('div', 'position:absolute;left:0;right:0;bottom:38px;text-align:center;font:500 26px IEText;color:rgba(120,110,150,.85);letter-spacing:.12em', root, 'AMOSTRA SINTÉTICA · REVISÃO PENDENTE') : null;

  // Filtro de borrão direcional para o whip (um por camada).
  const svgDefs = el('div', 'position:absolute;width:0;height:0;overflow:hidden', root);
  let filtroN = 0;
  const filtroX = () => {const id = `ie-whip-${filtroN++}`; svgDefs.insertAdjacentHTML('beforeend', `<svg width="0" height="0"><filter id="${id}" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation="0 0"/></filter></svg>`); return {id, blur: svgDefs.querySelector(`#${id} feGaussianBlur`)};};

  // ---------- legendas ----------
  const DESTAQUES = (ROTEIRO.destaques ?? []).map((d) => typeof d === 'string' ? {texto: d} : d).map((d) => ({...d, seq: d.texto.split(/\s+/).map(norm)}));
  let grupoAtual = -2, palavras = [];
  function montarGrupo(g) {
    legenda.replaceChildren(); palavras = [];
    if (!g) return;
    const ws = g.words, marca = ws.map(() => null);
    for (const d of DESTAQUES) for (let i = 0; i + d.seq.length <= ws.length; i++)
      if (d.seq.every((s, j) => norm(ws[i + j].text) === s) && marca.slice(i, i + d.seq.length).every((m) => !m)) for (let j = 0; j < d.seq.length; j++) marca[i + j] = {d, ultimo: j === d.seq.length - 1};
    let linha = null, tipo = null;
    ws.forEach((w, i) => {
      const m = marca[i], t = m ? 'destaque' : 'comum';
      if (!linha || t !== tipo) {linha = el('div', t === 'destaque' ? 'font-size:84px;line-height:1.08;white-space:nowrap' : 'white-space:nowrap', legenda); tipo = t;}
      if (linha.childNodes.length) linha.append(document.createTextNode(' '));
      const s = el('span', `display:inline-block;transform-origin:50% 70%;${m ? destaqueCss + `;background:${gradVideo};-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 16px rgba(110,41,255,.75))` : ''}`, linha, esc(w.text));
      palavras.push({s, w, destaque: !!m});
      if (m?.ultimo && m.d.icone) {const ic = el('span', 'display:inline-block;vertical-align:-0.08em;margin-left:.18em', linha, icone(m.d.icone, 70)); palavras.push({s: ic, w, destaque: true});}
    });
  }
  function legendas(t, visivel) {
    const gi = visivel ? LEGENDAS.findIndex((g, i) => t >= g.start - 0.05 && t < g.end + 0.3 && (!LEGENDAS[i + 1] || t < LEGENDAS[i + 1].start - 0.05)) : -1;
    if (gi !== grupoAtual) {montarGrupo(LEGENDAS[gi]); grupoAtual = gi;}
    for (const {s, w, destaque} of palavras) {
      const a = t - w.start, k = easeOut(a / 0.16);
      s.style.opacity = String(a < 0 ? 0 : k);
      s.style.transform = destaque ? `translateY(${(1 - k) * 14}px) scale(${a < 0 ? 1.15 : lerp(1.15, 1, easeBack(a / 0.3))})` : `translateY(${(1 - k) * 12}px)`;
      if (!destaque) s.style.filter = a < 0.16 ? `blur(${((1 - k) * 6).toFixed(2)}px)` : 'none';
    }
  }

  // ---------- sublinhados (traço ou slider sob a legenda) ----------
  const sublinhados = (ROTEIRO.sublinhados ?? []).map((u) => {
    const box = el('div', `position:absolute;left:${W / 2 - 230}px;width:460px;height:60px;opacity:0`, sobre);
    if (u.tipo === 'slider') {
      el('div', 'position:absolute;left:0;top:28px;width:460px;height:4px;border-radius:2px;background:rgba(255,255,255,.55)', box);
      const cheio = el('div', `position:absolute;left:0;top:27px;height:6px;border-radius:3px;background:${grad};box-shadow:0 0 14px ${P.acento2}`, box);
      const bola = el('div', `position:absolute;top:12px;width:36px;height:36px;margin-left:-18px;border-radius:50%;background:#fff;border:7px solid ${P.acento2};box-shadow:0 0 18px rgba(151,100,253,.8)`, box);
      return {u, box, f: (k) => {cheio.style.width = `${460 * k}px`; bola.style.left = `${460 * k}px`;}};
    }
    box.insertAdjacentHTML('beforeend', `<svg width="460" height="60" viewBox="0 0 460 60"><path d="M10 40 Q230 14 450 34" fill="none" stroke="${P.acento2}" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" style="filter:drop-shadow(0 0 10px ${P.acento})"/></svg>`);
    const path = box.querySelector('path');
    return {u, box, f: (k) => path.setAttribute('stroke-dashoffset', String(1 - k))};
  });
  function renderSublinhados(t, visivel) {
    for (const it of sublinhados) {
      const {u} = it, on = visivel && t >= u.at && t < u.ate;
      it.box.style.opacity = on ? String(Math.min(easeOut((t - u.at) / 0.2), 1 - easeIn((t - (u.ate - 0.2)) / 0.2))) : '0';
      if (!on) continue;
      it.box.style.top = `${legenda.offsetTop + legenda.offsetHeight + 4}px`;
      it.f(u.tipo === 'slider' ? easeInOut((t - u.at) / (u.ate - u.at)) : easeOut((t - u.at) / 0.5));
    }
  }

  // ---------- sobreposições na fala ----------
  const sobreposicoes = (ROTEIRO.sobreposicoes ?? []).map((o) => {
    const box = el('div', 'position:absolute;inset:0;opacity:0', sobre);
    if (o.tipo === 'lista') {
      const col = el('div', `position:absolute;left:0;right:0;top:${o.y ?? 1060}px;display:flex;flex-direction:column;align-items:center;gap:18px`, box);
      const itens = o.itens.map((it) => {const row = el('div', 'display:flex;align-items:center;gap:22px;color:#fff;font-weight:500;font-size:60px;text-shadow:0 4px 18px rgba(0,0,0,.4);opacity:0', col); const ic = el('span', 'display:inline-block', row, icone(it.icone ?? o.icone ?? 'selo', 62)); el('span', '', row, esc(it.texto)); return {it, row, ic};});
      return {o, box, f: (t) => itens.forEach(({it, row, ic}) => {const a = t - it.at, k = easeOut(a / 0.3); row.style.opacity = String(a < 0 ? 0 : k); row.style.transform = `translateY(${(1 - k) * 30}px)`; ic.style.transform = `scale(${a < 0 ? 0.4 : lerp(0.4, 1, spring(a))})`;})};
    }
    if (o.tipo === 'caminho') {
      const y = o.y ?? 1250;
      const d = `M -60 ${y + 330} C 260 ${y + 180}, 640 ${y + 40}, 1140 ${y - 120}`;
      box.insertAdjacentHTML('beforeend', `<svg width="${W}" height="${H}" style="position:absolute;inset:0"><defs><clipPath id="ie-cam-${o.at}"><rect x="0" y="0" width="0" height="${H}"/></clipPath></defs><path d="${d}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="5" stroke-dasharray="20 16" stroke-linecap="round" clip-path="url(#ie-cam-${o.at})"/></svg>`);
      const path = box.querySelector('path'), rect = box.querySelector('rect');
      const p = path.getPointAtLength(path.getTotalLength() * (o.posicao ?? 0.45));
      const disco = el('div', `position:absolute;left:${p.x - 82}px;top:${p.y - 82}px;width:164px;height:164px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(110,41,255,.45)`, box, icone(o.icone ?? 'caixa', 92));
      return {o, box, f: (t) => {const a = t - o.at; rect.setAttribute('width', String(W * easeInOut(a / 0.6))); path.setAttribute('stroke-dashoffset', String(-(t - o.at) * 60)); disco.style.transform = `scale(${a < 0.3 ? 0 : spring(a - 0.3)})`;}};
    }
    if (o.tipo === 'faixa') {
      el('div', `position:absolute;left:0;top:${o.y ?? 1440}px;width:${W}px;height:220px;background:linear-gradient(90deg,${P.faixa}cc,${P.faixa}88)`, box);
      const txt = el('div', `position:absolute;left:0;top:${(o.y ?? 1440) - 18}px;white-space:nowrap;font-weight:700;font-size:250px;line-height:1;color:#8d8d93;letter-spacing:-.02em`, box, esc(`${o.texto} · ${o.texto} · ${o.texto}`));
      return {o, box, f: (t) => {txt.style.transform = `translateX(${120 - (t - o.at) * (o.velocidade ?? 230)}px)`;}};
    }
    if (o.tipo === 'manuscrito') {
      const y = o.y ?? 1330;
      const painel = el('div', `position:absolute;left:-120px;top:${y}px;width:1320px;height:760px;transform:rotate(-6deg);transform-origin:0 0;background:linear-gradient(180deg,${P.faixa}e6,${P.faixa}aa);box-shadow:0 -10px 60px rgba(0,0,0,.35)`, box);
      const pos = [[150, 70], [330, 230], [640, 390]];
      const ws = o.palavras.map((w, i) => el('div', `position:absolute;left:${pos[i % 3][0]}px;top:${pos[i % 3][1] + 480 * Math.floor(i / 3)}px;font:400 96px IEHand;color:rgba(235,240,255,.92);white-space:nowrap`, painel, esc(w)));
      return {o, box, f: (t) => ws.forEach((w, i) => {const k = easeInOut((t - o.at - 0.15 - i * 0.32) / 0.5); w.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;}), painel};
    }
    throw new Error(`Sobreposição desconhecida: ${o.tipo}`);
  });
  function renderSobreposicoes(t, visivel) {
    for (const it of sobreposicoes) {
      const {o} = it, on = visivel && t >= o.at && t < o.ate;
      it.box.style.display = on ? 'block' : 'none';
      if (!on) continue;
      it.box.style.opacity = String(Math.min(easeOut((t - o.at) / 0.25), 1 - easeIn((t - (o.ate - 0.25)) / 0.25)));
      if (it.painel) it.painel.style.translate = `0 ${(1 - easeOut((t - o.at) / 0.4)) * 500}px`;
      it.f(t);
    }
  }

  // ---------- inserts de interface ----------
  const fundoClaro = (parent, lavagem) => {
    const f = el('div', `position:absolute;inset:0;background:${P.claro};overflow:hidden`, parent);
    if (lavagem === 'curva') f.insertAdjacentHTML('beforeend', `<svg width="${W}" height="${H}" style="position:absolute;inset:0"><path d="M0 0 H520 C 120 520, 140 1320, 760 1920 H0 Z" fill="${P.lavanda}" opacity=".55"/></svg>`);
    if (lavagem === 'canto') el('div', `position:absolute;left:-300px;bottom:-300px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,${P.lavanda},rgba(255,255,255,0) 70%)`, f);
    return f;
  };
  const cenas = (ROTEIRO.cenas ?? []).map((c) => {
    const box = el('div', 'position:absolute;inset:0;display:none;transform-origin:0 0', cenasHost);
    const fx = filtroX();
    const anim = [];
    if (c.tipo === 'perfil') {
      // Fundo branco atrás da fala (que vira card); só o cabeçalho e a legenda ficam nesta camada.
      const top = 470;
      const cab = el('div', `position:absolute;left:110px;top:${top}px;display:flex;align-items:center;gap:26px`, box);
      el('div', `width:116px;height:116px;border-radius:50%;background:${grad};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:46px`, cab, esc(c.iniciais ?? c.nome.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase()));
      const nomes = el('div', '', cab);
      el('div', `font-weight:500;font-size:54px;color:${P.tinta};line-height:1.1`, nomes, esc(c.nome));
      el('div', 'font-weight:400;font-size:32px;color:#6b6680', nomes, esc(c.detalhe ?? ''));
      const leg = el('div', `position:absolute;left:60px;right:60px;top:1395px;text-align:center;font-weight:500;font-size:70px;color:${P.tinta}`, box);
      const ws = textoRico(c.legenda, leg, {destaqueEscala: 1.12});
      anim.push((a) => {const k = easeOut((a - 0.1) / 0.35); cab.style.opacity = String(k); cab.style.transform = `translateY(${(1 - k) * 24}px)`;});
      anim.push((a) => ws.forEach((w, i) => {const k = easeOut((a - 0.35 - i * 0.14) / 0.22); w.style.opacity = String(k); w.style.transform = `translateY(${(1 - k) * 16}px)`;}));
    } else if (c.tipo === 'busca') {
      fundoClaro(box, 'canto');
      const linha = el('div', `position:absolute;left:0;right:0;top:${(c.y ?? 880)}px;text-align:center;font-weight:500;font-size:58px;color:${P.tinta};white-space:nowrap`, box);
      const inner = el('span', 'display:inline-block;position:relative;padding-bottom:22px', linha);
      const ws = textoRico(c.texto, inner, {destaqueEscala: 1.14});
      const sub = el('div', `position:absolute;left:0;bottom:0;height:7px;border-radius:4px;background:linear-gradient(90deg,${P.tinta},${P.acento} 45%,${P.acento2});width:0`, inner);
      anim.push((a) => {const n = ws.length; ws.forEach((w, i) => {const k = easeOut((a - 0.15 - i * 0.55 / n) / 0.12); w.style.opacity = String(k);}); sub.style.width = `${100 * easeInOut((a - 0.2) / 0.7)}%`;});
    } else if (c.tipo === 'pergunta') {
      fundoClaro(box, 'curva');
      const card = el('div', 'position:absolute;left:150px;top:660px;width:780px', box);
      const cab = el('div', `height:88px;border-radius:18px;background:${P.lavanda};display:flex;align-items:center;padding-left:42px;font-weight:500;font-size:52px;color:${P.acento}`, card, esc(c.titulo));
      const corpo = el('div', `margin-top:16px;border-radius:18px;background:${P.lavanda};padding:46px 0;display:flex;flex-direction:column;align-items:center;gap:44px`, card);
      const linhas = Array.from({length: c.linhas ?? 3}, () => el('div', `width:420px;height:0;border-top:6px dotted ${P.tinta}88`, corpo));
      const txt = el('div', `position:absolute;left:190px;right:190px;top:${1100 + 60 * Math.max(0, (c.linhas ?? 3) - 3)}px;text-align:center;font-weight:400;font-size:44px;line-height:1.3;color:${P.tinta}`, box);
      const ws = textoRico(c.texto, txt, {destaqueEscala: 1.08});
      anim.push((a) => {const k = spring(a - 0.05); card.style.transform = `scale(${lerp(0.9, 1, clamp(k, 0, 1.2))})`; card.style.opacity = String(easeOut(a / 0.2)); cab.style.opacity = String(easeOut((a - 0.1) / 0.2));});
      anim.push((a) => linhas.forEach((l, i) => {l.style.width = `${420 * easeOut((a - 0.25 - i * 0.12) / 0.35)}px`;}));
      anim.push((a, dur) => ws.forEach((w, i) => {const k = easeOut((a - 0.45 - i * Math.min(0.12, (dur - 1.0) / ws.length)) / 0.18); w.style.opacity = String(k);}));
    } else if (c.tipo === 'checklist') {
      const f = el('div', `position:absolute;inset:0;overflow:hidden;background-color:${P.escuro};background-image:linear-gradient(rgba(255,255,255,.05) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.05) 2px,transparent 2px);background-size:72px 72px`, box);
      const b1 = el('div', `position:absolute;left:-180px;top:40px;width:420px;height:560px;border-radius:120px;background:${P.acento};filter:blur(70px);opacity:.9`, f);
      const b2 = el('div', 'position:absolute;right:-140px;top:1250px;width:340px;height:520px;border-radius:120px;background:#f2ecff;filter:blur(60px);opacity:.85', f);
      const card = el('div', `position:absolute;left:230px;top:640px;width:620px;padding:56px 56px 70px;border-radius:44px;background:#fff;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.5)`, box);
      card.insertAdjacentHTML('beforeend', `<svg width="620" height="900" style="position:absolute;left:0;top:0"><path d="M0 560 C 200 470, 420 700, 620 520 V900 H0Z" fill="${P.lavanda}" opacity=".7"/></svg>`);
      el('div', `position:relative;font-size:84px;line-height:1.1;margin-bottom:26px;${destaqueCss}`, card, esc(c.titulo));
      const itens = c.itens.map((it) => {const row = el('div', `position:relative;display:flex;align-items:center;gap:20px;height:88px;font-weight:500;font-size:52px;color:${P.tinta}`, card); const ic = el('span', 'display:inline-block', row, icone(it.icone ?? 'selo', 56)); const tx = el('span', '', row, esc(it.texto)); return {it, ic, tx};});
      anim.push((a) => {b1.style.transform = `translate(${Math.sin(a * 0.9) * 40}px,${Math.cos(a * 0.7) * 30}px)`; b2.style.transform = `translate(${Math.cos(a * 0.8) * 30}px,${Math.sin(a * 0.6) * 40}px)`;});
      anim.push((a) => {const k = spring(a - 0.05); card.style.transform = `translateY(${(1 - clamp(k, 0, 1.2)) * 80}px) scale(${lerp(0.92, 1, clamp(k, 0, 1.2))})`; card.style.opacity = String(easeOut(a / 0.22));});
      anim.push((a) => itens.forEach(({it, ic, tx}) => {const r = it.at - c.from, ki = a - r; ic.style.transform = `scale(${ki < 0 ? 0 : spring(ki)})`; const k = easeOut((ki - 0.12) / 0.25); tx.style.opacity = String(ki < 0 ? 0 : k); tx.style.transform = `translateX(${(1 - k) * -20}px)`;}));
    } else throw new Error(`Cena desconhecida: ${c.tipo}`);
    if (c.tipo !== 'perfil') box.style.filter = `url(#${fx.id})`;
    return {c, box, anim, fx};
  });

  // ---------- segmentos: fala e cenas se alternam ----------
  const total = range.start + range.duration;
  const segs = [];
  let cursor = 0;
  const ordenadas = [...cenas].sort((a, b) => a.c.from - b.c.from);
  ordenadas.forEach((cn, i) => {
    if (cn.c.from > cursor + 1e-6) segs.push({tipo: 'fala', from: cursor, to: cn.c.from});
    segs.push({tipo: 'cena', cena: cn, from: cn.c.from, to: cn.c.to});
    cursor = cn.c.to;
  });
  if (cursor < total) segs.push({tipo: 'fala', from: cursor, to: Infinity});
  segs.forEach((s, i) => {
    const ant = segs[i - 1], prox = segs[i + 1];
    s.entrada = s.tipo === 'cena' ? (s.cena.c.entrada ?? 'luz') : ant ? (ant.cena.c.retorno ?? ant.cena.c.saida ?? 'luz') : (ROTEIRO.abertura ?? 'luz');
    s.saida = s.tipo === 'cena' ? (s.cena.c.saida ?? 'luz') : prox ? (prox.cena.c.entrada ?? 'luz') : 'corte';
  });

  // Estado de camada para entrada (idade a) e saída (resta r).
  const ZERO = () => ({tx: 0, ty: 0, s: 1, blur: 0, whip: 0, raio: 0, luz: 0, branco: 0});
  function aplicarEfeito(st, e, q, entrando) {
    // q: 0 longe da fronteira → 1 na fronteira.
    if (e === 'luz') {st.luz = Math.max(st.luz, q); st.blur += 10 * q; st.raio = Math.max(st.raio, q);}
    else if (e === 'branco') {st.branco = Math.max(st.branco, q); st.blur += 12 * q;}
    else if (e === 'whip') {st.tx += (entrando ? 1 : -1) * W * 0.9 * q; st.whip += 40 * q;}
    else if (e === 'zoom') {st.s *= entrando ? 1 + 0.14 * q : 1 + 0.6 * q; st.blur += (entrando ? 14 : 26) * q; st.branco = Math.max(st.branco, entrando ? 0 : q * 0.6);}
  }
  // Cartão: a fala vira card arredondado (entra pela direita / sai pela esquerda).
  function cartao(st, x, entrando) {
    // x: progresso 0→1 ao longo de 1 s (entrada) ou 1→0 (saída)
    const slide = easeOut(x / 0.42), grow = easeInOut((x - 0.62) / 0.38);
    const s = lerp(0.7, 1, grow);
    st.s = s; st.radius = lerp(48, 0, grow) / s;
    st.tx = (entrando ? 1 : -1) * (1 - slide) * W * 0.95 + (W - W * s) / 2;
    st.ty = (H - H * s) / 2; st.whip = 30 * (1 - slide);
  }
  function estado(seg, t) {
    const st = ZERO();
    const a = t - seg.from, r = seg.to - t;
    if (seg.entrada === 'cartao') {if (a < DUR_TR.cartao) cartao(st, a / DUR_TR.cartao, true);}
    else if (DUR_TR[seg.entrada]) aplicarEfeito(st, seg.entrada, 1 - easeOut(a / DUR_TR[seg.entrada]), true);
    if (seg.saida === 'cartao') {if (r < DUR_TR.cartao) cartao(st, r / DUR_TR.cartao, false);}
    else if (DUR_TR[seg.saida]) aplicarEfeito(st, seg.saida, easeIn(1 - r / DUR_TR[seg.saida]), false);
    return st;
  }
  const falaFx = filtroX();
  fala.style.filter = `url(#${falaFx.id})`;
  function aplicarCamada(node, fx, st, extraClip) {
    node.style.transform = `translate(${st.tx}px,${st.ty}px) scale(${st.s})`;
    fx.blur.setAttribute('stdDeviation', `${(st.whip + st.blur).toFixed(2)} ${st.blur.toFixed(2)}`);
    node.style.clipPath = extraClip ?? (st.radius ? `inset(0 round ${st.radius}px)` : 'none');
  }

  // ---------- quadro ----------
  function renderAt(local) {
    const t = local + range.start;
    const seg = segs.find((s) => t >= s.from && t < s.to) ?? segs[segs.length - 1];
    const st = estado(seg, t);
    const cena = seg.tipo === 'cena' ? seg.cena : null;
    const perfil = cena?.c.tipo === 'perfil';
    const falaVisivel = !cena || perfil;
    fala.style.display = falaVisivel ? 'block' : 'none';
    cenas.forEach((cn) => {cn.box.style.display = cn === cena ? 'block' : 'none';});
    if (cena) {
      const a = t - cena.c.from;
      cena.anim.forEach((f) => f(a, cena.c.to - cena.c.from));
      if (!perfil) aplicarCamada(cena.box, cena.fx, st);
    }
    if (perfil) {
      // A fala vira um card com o rosto, sob o cabeçalho do canal.
      const s = 0.86, rx = 40, ry = ENQ.rostoY - 407, a = t - cena.c.from;
      const k = easeOut((a) / 0.35);
      const sc = s * lerp(0.94, 1, k);
      const cx = 110 + 430, cy = 640 + 350;
      const tx = cx - sc * (rx + 500) + st.tx, ty = cy - sc * (ry + 407) + st.ty;
      fala.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`;
      falaFx.blur.setAttribute('stdDeviation', `${(st.whip + st.blur).toFixed(2)} ${st.blur.toFixed(2)}`);
      fala.style.clipPath = `inset(${ry}px ${W - rx - 1000}px ${H - ry - 814}px ${rx}px round ${34 / sc}px)`;
    } else if (falaVisivel) {
      // push-in leve contínuo em cada trecho de fala
      const push = 1 + 0.035 * clamp((t - seg.from) / Math.max(1, Math.min(8, seg.to - seg.from)));
      const s2 = {...st, s: st.s * push, tx: st.tx - (W * st.s * (push - 1)) / 2, ty: st.ty - (H * st.s * (push - 1)) / 2};
      aplicarCamada(fala, falaFx, s2);
    }
    const legendaVisivel = falaVisivel && !perfil;
    sobre.style.display = legenda.style.display = sombra.style.display = legendaVisivel ? 'block' : 'none';
    legendas(t, legendaVisivel);
    renderSublinhados(t, legendaVisivel);
    renderSobreposicoes(t, legendaVisivel);
    luz.style.opacity = String(clamp(st.luz * 1.15));
    raio.style.opacity = String(st.raio * 0.9);
    raio.style.transform = `translateY(${lerp(1900, -500, st.raio)}px) rotate(-18deg)`;
    branco.style.opacity = String(clamp(st.branco));
    if (marca) marca.style.color = cena && cena.c.tipo !== 'checklist' ? 'rgba(120,110,150,.85)' : 'rgba(255,255,255,.7)';
  }
  return {renderAt, segmentos: segs.map(({tipo, from, to, entrada, saida, cena}) => ({tipo: cena?.c.tipo ?? tipo, from, to, entrada, saida}))};
}
