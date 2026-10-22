// Interface Explicativa — versão 3D (HyperFrames + Three.js 0.186).
// Mesma estrutura do roteiro 2D: fala com legenda central, inserts de interface
// e sobreposições; aqui inserts, ícones, cards e o "cartão" são objetos 3D com
// luz, sombra e câmera em perspectiva. A fala viva entra nos cards por homografia.
// Tudo é função pura do tempo (renderAt); nenhum relógio próprio.
import {THREE, criarKit, cameraPlana, clamp, lerp, easeOut, easeIn, easeInOut, spring} from './elementos3d.js';
import {ROTEIRO, LOGO_GEOMETRIA} from './roteiro.js';
import {LEGENDAS} from './legendas.js';

const W = 1080, H = 1920;
const SRC_W = ROTEIRO.fonteVideo?.largura ?? 1080, SRC_H = ROTEIRO.fonteVideo?.altura ?? 1920;
const ENQ = {cx: SRC_W / 2, cy: SRC_H / 2, zoom: 1, rostoY: 640, ...(ROTEIRO.enquadramento ?? {})};
const LEG_Y = ROTEIRO.legendaY ?? 860;
const DUR_TR = {corte: 0, luz: 0.32, branco: 0.28, whip: 0.26, zoom: 0.34, cartao: 1.0};
const u = (px) => px / 100; // px → unidades
const wx = (px) => u(px - W / 2), wy = (py) => u(H / 2 - py); // coordenadas do quadro → mundo

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const el = (tag, css = '', parent, html) => {const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; parent?.append(e); return e;};

function homografia(w, h, q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let g = 0, hh = 0; if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {const den = dx1 * dy2 - dx2 * dy1; g = (sx * dy2 - dx2 * sy) / den; hh = (dx1 * sy - sx * dy1) / den;}
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
}

export async function criarCena({root, fala, video, range}) {
  await Promise.all(['400', '500', '700'].map((w) => document.fonts.load(`${w} 64px IEText`)).concat(document.fonts.load('400 64px IEHand')));
  const kit = criarKit(ROTEIRO.paleta), P = kit.P;
  const grad = `linear-gradient(90deg, ${P.acento} 0%, ${P.acento2} 100%)`;
  const gradVideo = `linear-gradient(90deg, ${P.acento2} 0%, ${P.destaqueClaro} 100%)`;

  // ---------- camadas ----------
  // z: fundos DOM (1) < canvas 3D (2) < fala em modo card (3) < textos DOM (4) < luz/branco (5)
  // Enquadramento 9:16: um plano fixo ou `planos` que mudam com as trocas de câmera.
  const PLANOS = ROTEIRO.planos?.length ? ROTEIRO.planos : [{from: 0, to: Infinity, ...ENQ}];
  function enquadrar(t) {
    const p = PLANOS.find((x) => t >= x.from && t < x.to) ?? PLANOS[PLANOS.length - 1];
    const b = Math.max(W / SRC_W, H / SRC_H) * (p.zoom ?? 1);
    const x = clamp(W / 2 - p.cx * b, W - SRC_W * b, 0), y = clamp(H / 2 - (p.cy ?? SRC_H / 2) * b, H - SRC_H * b, 0);
    video.style.transform = `translate(${x}px,${y}px) scale(${b})`;
  }
  enquadrar(range.start);
  fala.style.zIndex = '0';
  const fundos = el('div', 'position:absolute;inset:0;z-index:1;transform-origin:0 0', root);
  const canvas = el('canvas', 'position:absolute;left:0;top:0;width:1080px;height:1920px;z-index:2;transform-origin:0 0', root);
  canvas.width = W; canvas.height = H;
  const textos = el('div', 'position:absolute;inset:0;z-index:4;transform-origin:0 0;pointer-events:none', root);
  const sombraLeg = el('div', `position:absolute;left:0;top:${LEG_Y - 260}px;width:${W}px;height:620px;background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(6,6,30,.42),rgba(6,6,30,0))`, textos);
  const legenda = el('div', `position:absolute;left:40px;top:${LEG_Y}px;width:1000px;text-align:center;color:#fff;font-weight:500;font-size:64px;line-height:1.12;text-shadow:0 4px 22px rgba(0,0,0,.45)`, textos);
  const luz = el('div', `position:absolute;inset:0;z-index:5;opacity:0;background:linear-gradient(165deg,#ffffff 0%,#f4eeff 30%,#c4a8ff 55%,${P.luz} 78%,${P.acento} 100%)`, root);
  const raio = el('div', 'position:absolute;left:-400px;top:-200px;width:1900px;height:520px;z-index:5;opacity:0;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.95),rgba(255,255,255,0))', root);
  const branco = el('div', 'position:absolute;inset:0;z-index:5;opacity:0;background:#F4F2F8', root);
  const marca = ROTEIRO.fixture ? el('div', 'position:absolute;left:0;right:0;bottom:38px;z-index:6;text-align:center;font:500 26px IEText;letter-spacing:.12em', root, 'AMOSTRA SINTÉTICA · REVISÃO PENDENTE') : null;

  // Borrão direcional (whip) por camada.
  const defs = el('div', 'position:absolute;width:0;height:0;overflow:hidden', root);
  let nf = 0;
  const filtro = (node) => {const id = `ie3-f${nf++}`; defs.insertAdjacentHTML('beforeend', `<svg width="0" height="0"><filter id="${id}" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="0 0"/></filter></svg>`); node.style.filter = `url(#${id})`; return defs.querySelector(`#${id} feGaussianBlur`);};
  const camadas = [fala, fundos, canvas, textos].map((node) => ({node, blur: filtro(node)}));

  // ---------- Three.js ----------
  const r = kit.renderizador(canvas, W, H);
  r.localClippingEnabled = true;
  const cam = cameraPlana(W, H), D = cam.userData.D;
  const v3 = new THREE.Vector3();
  const projetar = (x, y, z) => {v3.set(x, y, z).project(cam); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H];};
  const cenaNova = (escuro) => {const s = new THREE.Scene(); kit.iluminar(s, r, {escuro}); return s;};
  const corte = (x) => new THREE.Plane(new THREE.Vector3(-1, 0, 0), x); // mostra o que está à esquerda de x
  const textoSombra = (texto, o) => kit.textoPlano(texto, {cor: '#ffffff', ...o});

  // ---------- legendas (DOM) ----------
  const DESTAQUES = (ROTEIRO.destaques ?? []).map((d) => typeof d === 'string' ? {texto: d} : d).map((d) => ({...d, seq: d.texto.split(/\s+/).map(norm)}));
  const ICONE_SVG = {pular: `<svg viewBox="0 0 48 48" width="70" height="70"><path d="M9 9v30l22-15z" fill="${P.acento2}"/><rect x="34" y="9" width="6" height="30" rx="2" fill="${P.acento2}"/></svg>`};
  let grupoAtual = -2, palavras = [];
  function montarGrupo(g) {
    legenda.replaceChildren(); palavras = [];
    if (!g) return;
    const ws = g.words, marcas = ws.map(() => null);
    for (const d of DESTAQUES) for (let i = 0; i + d.seq.length <= ws.length; i++)
      if (d.seq.every((s, j) => norm(ws[i + j].text) === s) && marcas.slice(i, i + d.seq.length).every((m) => !m)) for (let j = 0; j < d.seq.length; j++) marcas[i + j] = {d, ultimo: j === d.seq.length - 1};
    let linha = null, tipo = null;
    ws.forEach((w, i) => {
      const m = marcas[i], t = m ? 'destaque' : 'comum';
      if (!linha || t !== tipo) {linha = el('div', t === 'destaque' ? 'font-size:84px;line-height:1.08;white-space:nowrap' : 'white-space:nowrap', legenda); tipo = t;}
      if (linha.childNodes.length) linha.append(document.createTextNode(' '));
      const s = el('span', `display:inline-block;transform-origin:50% 70%;${m ? `background:var(--grad-destaque);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700;filter:drop-shadow(0 0 16px rgba(110,41,255,.75))` : ''}`, linha, esc(w.text));
      palavras.push({s, w, destaque: !!m});
      if (m?.ultimo && m.d.icone) palavras.push({s: el('span', 'display:inline-block;vertical-align:-0.08em;margin-left:.18em', linha, ICONE_SVG[m.d.icone] ?? ICONE_SVG.pular), w, destaque: true});
    });
  }
  function legendas(t, visivel) {
    const gi = visivel ? LEGENDAS.findIndex((g, i) => t >= g.start - 0.05 && t < g.end + 0.3 && (!LEGENDAS[i + 1] || t < LEGENDAS[i + 1].start - 0.05)) : -1;
    if (gi !== grupoAtual) {montarGrupo(LEGENDAS[gi]); grupoAtual = gi;}
    for (const {s, w, destaque} of palavras) {
      const a = t - w.start, k = easeOut(a / 0.16);
      s.style.opacity = String(a < 0 ? 0 : k);
      s.style.transform = destaque ? `translateY(${(1 - k) * 14}px) scale(${a < 0 ? 1.15 : lerp(1.15, 1, clamp(spring(a * 1.4), 0, 1.1))})` : `translateY(${(1 - k) * 12}px)`;
    }
  }
  const sublinhados = (ROTEIRO.sublinhados ?? []).map((sb) => {
    const box = el('div', `position:absolute;left:${W / 2 - 230}px;width:460px;height:60px;opacity:0`, textos);
    if (sb.tipo === 'slider') {
      el('div', 'position:absolute;left:0;top:28px;width:460px;height:4px;border-radius:2px;background:rgba(255,255,255,.55)', box);
      const cheio = el('div', `position:absolute;left:0;top:27px;height:6px;border-radius:3px;background:${grad};box-shadow:0 0 14px ${P.acento2}`, box);
      const bola = el('div', `position:absolute;top:12px;width:36px;height:36px;margin-left:-18px;border-radius:50%;background:#fff;border:7px solid ${P.acento2};box-shadow:0 0 18px rgba(151,100,253,.8)`, box);
      return {sb, box, f: (k) => {cheio.style.width = `${460 * k}px`; bola.style.left = `${460 * k}px`;}};
    }
    box.insertAdjacentHTML('beforeend', `<svg width="460" height="60" viewBox="0 0 460 60"><path d="M10 40 Q230 14 450 34" fill="none" stroke="${P.acento2}" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/></svg>`);
    const path = box.querySelector('path');
    return {sb, box, f: (k) => path.setAttribute('stroke-dashoffset', String(1 - k))};
  });
  function renderSublinhados(t, visivel) {
    for (const it of sublinhados) {
      const {sb} = it, on = visivel && t >= sb.at && t < sb.ate;
      it.box.style.opacity = on ? String(Math.min(easeOut((t - sb.at) / 0.2), 1 - easeIn((t - (sb.ate - 0.2)) / 0.2))) : '0';
      if (!on) continue;
      it.box.style.top = `${legenda.offsetTop + legenda.offsetHeight + 4}px`;
      it.f(sb.tipo === 'slider' ? easeInOut((t - sb.at) / (sb.ate - sb.at)) : easeOut((t - sb.at) / 0.5));
    }
  }

  // ---------- sobreposições 3D sobre a fala ----------
  const sobreCena = new THREE.Scene(); kit.iluminar(sobreCena, r, {escuro: false}).rim.intensity = 3;
  sobreCena.children.filter((o) => o.material instanceof THREE.ShadowMaterial).forEach((o) => {o.visible = false;});
  const sobreposicoes = (ROTEIRO.sobreposicoes ?? []).map((o) => {
    const g = new THREE.Group(); g.visible = false; sobreCena.add(g);
    if (o.tipo === 'lista') {
      const y0 = o.y ?? 1060;
      const itens = o.itens.map((it, i) => {
        const ic = kit.icone(it.icone ?? o.icone ?? 'selo'); ic.scale.setScalar(0.7); const tx = textoSombra(it.texto, {px: 60, larguraPx: 620, alinhar: 'left'});
        const y = wy(y0 + 50 + i * 92); ic.position.set(-2.3, y, 0.4); tx.position.set(-1.75 + 3.1, y, 0.3); g.add(ic, tx); return {it, ic, tx, y};
      });
      return {o, g, f: (t) => itens.forEach(({it, ic, tx, y}) => {const a = t - it.at, k = easeOut(a / 0.3); ic.scale.setScalar(0.7 * clamp(spring(a), 0, 1.25)); ic.rotation.set(0.15, (1 - clamp(spring(a))) * 3 - 0.3 + Math.sin(t * 2 + y) * 0.12, 0); tx.material.opacity = a < 0 ? 0 : k; tx.position.y = y - (1 - k) * 0.3;})};
    }
    if (o.tipo === 'caminho') {
      const y = o.y ?? 1250;
      const curva = new THREE.CatmullRomCurve3([[-60, y + 330], [260, y + 200], [640, y + 40], [1140, y - 120]].map(([px, py], i) => new THREE.Vector3(wx(px), wy(py), [0.2, 1.2, 1.0, 0.2][i])));
      const n = 34, tracos = [];
      for (let i = 0; i < n; i++) {const a = i / n, b = (i + 0.55) / n; const seg = new THREE.CatmullRomCurve3([curva.getPoint(a), curva.getPoint((a + b) / 2), curva.getPoint(b)]); const m = kit.mesh(new THREE.TubeGeometry(seg, 6, 0.035, 8), kit.mats.branco, g); tracos.push(m);}
      const p = curva.getPoint(o.posicao ?? 0.45);
      const disco = new THREE.Group(); disco.position.copy(p).add(new THREE.Vector3(0, 0, 0.3)); g.add(disco);
      const moeda = kit.mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.22, 64), kit.mats.branco, disco); moeda.rotation.x = Math.PI / 2;
      const ic = kit.icone(o.icone ?? 'caixa'); ic.scale.setScalar(0.95); ic.position.z = 0.28; disco.add(ic);
      return {o, g, f: (t) => {const a = t - o.at; tracos.forEach((m, i) => {m.visible = a > 0 && i / n < easeInOut(a / 0.7);}); const s = a < 0.3 ? 0 : spring(a - 0.3); disco.scale.setScalar(clamp(s, 0, 1.2)); disco.rotation.y = (1 - clamp(s)) * Math.PI * 2 + Math.sin(t * 1.5) * 0.25; disco.position.z = 0.3 + Math.sin(t * 2) * 0.12;}};
    }
    if (o.tipo === 'faixa') {
      const y = o.y ?? 1440;
      const faixa = kit.mesh(new THREE.BoxGeometry(14, 2.3, 0.18), new THREE.MeshStandardMaterial({color: P.faixa, roughness: 0.7, transparent: true, opacity: 0.82}), g);
      const tx = kit.textoPlano(`${o.texto} · ${o.texto} · ${o.texto}`, {px: 230, peso: 700, cor: '#9a9aa2', larguraPx: 9000, alinhar: 'left'});
      g.add(tx); g.position.set(0, wy(y + 110), 0.6); g.rotation.set(-0.32, 0.12, -0.03); tx.position.z = 0.4;
      const w0 = tx.geometry.parameters.width;
      return {o, g, f: (t) => {tx.position.x = w0 / 2 - 5.2 - (t - o.at) * (o.velocidade ?? 230) / 100; faixa.rotation.x = 0;}};
    }
    if (o.tipo === 'manuscrito') {
      const y = o.y ?? 1330;
      const painel = kit.mesh(new THREE.BoxGeometry(14, 9, 0.2), new THREE.MeshStandardMaterial({color: P.faixa, roughness: 0.7, transparent: true, opacity: 0.88}), g);
      painel.position.set(0, -4.5, 0);
      const pos = [[-3.6, -0.9], [-1.6, -2.5], [1.4, -4.1]];
      const ws = o.palavras.map((w, i) => {const tx = kit.textoPlano(w, {px: 96, peso: 400, familia: 'IEHand', cor: '#eef1ff', larguraPx: 560, alinhar: 'left'}); const plano = corte(-10); tx.material.clippingPlanes = [plano]; tx.position.set(pos[i][0] + 2.8, pos[i][1], 0.2); g.add(tx); return {tx, plano, x0: pos[i][0]};});
      g.position.set(0, wy(y), 0.5); g.rotation.set(-0.38, 0, -0.1);
      return {o, g, entra: true, f: (t) => {g.updateMatrixWorld(); ws.forEach(({tx, plano, x0}, i) => {const k = easeInOut((t - o.at - 0.2 - i * 0.32) / 0.5); v3.set(x0 + k * 5.6, 0, 0).applyMatrix4(tx.parent.matrixWorld); plano.constant = v3.x;});}};
    }
    throw new Error(`Sobreposição desconhecida: ${o.tipo}`);
  });
  function sobreAtivas(t, visivel) {
    let alguma = false;
    for (const it of sobreposicoes) {
      const {o} = it, on = visivel && t >= o.at && t < o.ate; it.g.visible = on; if (!on) continue; alguma = true;
      const k = Math.min(easeOut((t - o.at) / 0.3), 1 - easeIn((t - (o.ate - 0.3)) / 0.3));
      it.g.scale.setScalar(lerp(0.92, 1, k));
      if (it.entra) it.g.position.y = wy(it.o.y ?? 1330) - (1 - easeOut((t - o.at) / 0.45)) * 6;
      it.f(t);
    }
    return alguma;
  }

  // ---------- inserts 3D ----------
  const FIM = ROTEIRO.encerramento;
  const listaCenas = [...(ROTEIRO.cenas ?? []), ...(FIM ? [{...FIM, tipo: 'encerramento', to: Infinity, entrada: FIM.entrada ?? 'luz'}] : [])];
  const carregar = (src) => new THREE.TextureLoader().loadAsync(src).then((t) => {t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;});
  const texturas = await Promise.all(listaCenas.map((c) => c.tipo === 'broll' && c.imagem ? carregar(c.imagem) : c.tipo === 'encerramento' && c.logo ? carregar(c.logo) : null));
  const cenas = listaCenas.map((c, ci) => {
    const escuro = c.tipo === 'checklist' || (c.tipo === 'broll' && c.fundo === 'escuro');
    const s = cenaNova(escuro), grp = new THREE.Group(); s.add(grp);
    const bg = el('div', `position:absolute;inset:0;display:none;background:${escuro ? P.escuro : P.claro};overflow:hidden`, fundos);
    const anim = [];
    const fade = (m, k) => {m.material.opacity = k;};
    if (c.tipo === 'perfil') {
      el('div', `position:absolute;left:-300px;bottom:-300px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,${P.lavanda},rgba(255,255,255,0) 70%)`, bg);
      const card = kit.cartao({w: 9.0, h: 7.4, r: 0.4, espessura: 0.3}); card.position.set(0, wy(990), 0); grp.add(card);
      const avatar = kit.moeda(c.iniciais ?? c.nome.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase());
      avatar.position.set(wx(168), wy(528), 0.4); grp.add(avatar);
      const nome = kit.textoPlano(c.nome, {px: 54, larguraPx: 640, alinhar: 'left'}); nome.position.set(wx(250 + 320), wy(505), 0.3); grp.add(nome);
      const det = kit.textoPlano(c.detalhe ?? '', {px: 32, peso: 400, cor: '#6b6680', larguraPx: 640, alinhar: 'left'}); det.position.set(wx(250 + 320), wy(560), 0.3); grp.add(det);
      const leg = kit.textoPlano(c.legenda, {px: 70, larguraPx: 960}); leg.position.set(0, wy(1440), 0.4); grp.add(leg);
      anim.push((a) => {
        const k = easeOut(a / 0.45); card.rotation.set(0.06 * (1 - k) + Math.sin(a * 1.3) * 0.015, lerp(-0.55, -0.1, k) + Math.sin(a * 0.9) * 0.03, 0); card.position.z = lerp(-1.5, 0, k);
        avatar.rotation.y = (1 - clamp(spring(a - 0.1))) * Math.PI * 2; avatar.scale.setScalar(clamp(spring(a - 0.1), 0, 1.15));
        [nome, det].forEach((m) => fade(m, easeOut((a - 0.2) / 0.3))); fade(leg, easeOut((a - 0.4) / 0.3)); leg.position.y = wy(1440) - (1 - easeOut((a - 0.4) / 0.3)) * 0.3;
      });
      return {c, s, bg, anim, card, cam: {orbita: 0.012}};
    }
    if (c.tipo === 'busca') {
      el('div', `position:absolute;left:-300px;bottom:-300px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,${P.lavanda},rgba(255,255,255,0) 70%)`, bg);
      const pilula = kit.cartao({w: 10.0, h: 1.7, r: 0.85, espessura: 0.36}); grp.add(pilula); pilula.position.y = wy((c.y ?? 880) + 10);
      const lupa = kit.icone('lupa'); lupa.scale.setScalar(0.95); lupa.position.set(-4.15, 0, 0.45); pilula.add(lupa);
      const txt = kit.textoPlano(c.texto, {px: 52, larguraPx: 820, alinhar: 'left'}); txt.position.set(0.75, 0, 0.26); pilula.add(txt);
      const plano = corte(-10); txt.material.clippingPlanes = [plano];
      const barGeo = new THREE.BoxGeometry(8.6, 0.12, 0.12); barGeo.translate(4.3, 0, 0);
      const barra = kit.mesh(barGeo, kit.mats.acento, grp); barra.position.set(-4.3, pilula.position.y - 1.2, 0.2);
      anim.push((a) => {
        const k = spring(a - 0.05); pilula.scale.setScalar(lerp(0.82, 1, clamp(k, 0, 1.15))); pilula.rotation.set(0.22 * (1 - easeOut(a / 0.6)) - 0.08, -0.2 + a * 0.06, 0);
        pilula.updateMatrixWorld(); v3.set(-3.5 + 8.4 * easeOut((a - 0.2) / 0.75), 0, 0.26).applyMatrix4(pilula.matrixWorld); plano.constant = v3.x;
        barra.scale.x = Math.max(0.001, easeInOut((a - 0.3) / 0.7)); barra.rotation.y = pilula.rotation.y * 0.5;
      });
      return {c, s, bg, anim, cam: {orbita: 0.018}};
    }
    if (c.tipo === 'pergunta') {
      bg.insertAdjacentHTML('beforeend', `<svg width="${W}" height="${H}" style="position:absolute;inset:0"><path d="M0 0 H520 C 120 520, 140 1320, 760 1920 H0 Z" fill="${P.lavanda}" opacity=".55"/></svg>`);
      const card = new THREE.Group(); card.position.set(0, wy(860), 0); grp.add(card);
      const cab = kit.cartao({w: 7.8, h: 0.9, r: 0.18, espessura: 0.2, mat: kit.mats.lavanda}); cab.position.y = 1.55; card.add(cab);
      const tit = kit.textoPlano(c.titulo, {px: 52, cor: P.acento, larguraPx: 700, alinhar: 'left'}); tit.position.set(0.15, 0, cab.userData.frente + 0.01); cab.add(tit);
      const nl = c.linhas ?? 3, corpo = kit.cartao({w: 7.8, h: 0.95 * nl + 0.5, r: 0.18, espessura: 0.24, mat: kit.mats.lavanda}); corpo.position.y = 1.0 - (0.95 * nl + 0.5) / 2 - 0.1; card.add(corpo);
      const pontos = [];
      for (let i = 0; i < nl; i++) for (let j = 0; j < 22; j++) {const p = kit.mesh(new THREE.SphereGeometry(0.045, 10, 8), kit.mats.tinta, corpo); p.position.set(-2.1 + j * 0.2, (nl - 1) / 2 * 0.95 - i * 0.95, corpo.userData.frente + 0.02); pontos.push({p, i, j});}
      const txt = kit.textoPlano(c.texto, {px: 44, peso: 400, larguraPx: 700, entrelinha: 1.3}); txt.position.set(0, corpo.position.y - (0.95 * nl + 0.5) / 2 - 1.0, 0.2); card.add(txt);
      anim.push((a, dur) => {
        const k = spring(a); card.scale.setScalar(lerp(0.85, 1, clamp(k, 0, 1.15))); card.rotation.set(-0.1 + Math.sin(a) * 0.02, lerp(0.6, 0.12, easeOut(a / 0.7)), 0);
        cab.position.z = lerp(1.2, 0, easeOut((a - 0.1) / 0.4));
        pontos.forEach(({p, i, j}) => {p.visible = easeOut((a - 0.25 - i * 0.12) / 0.4) * 22 > j;});
        fade(tit, easeOut((a - 0.15) / 0.3)); fade(txt, easeOut((a - 0.5) / Math.max(0.4, dur * 0.35)));
      });
      return {c, s, bg, anim, cam: {orbita: 0.015}};
    }
    if (c.tipo === 'checklist') {
      // chão em grade em perspectiva e luzes coloridas desfocadas
      const grade = new THREE.GridHelper(80, 80, 0x3a3550, 0x2a2638); grade.position.set(0, -6.5, -6); s.add(grade);
      const grade2 = new THREE.GridHelper(80, 80, 0x2b2840, 0x221f2e); grade2.rotation.x = Math.PI / 2; grade2.position.z = -12; s.add(grade2);
      const blob = (cor, x, y, sz) => {const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g2 = cv.getContext('2d'); const gr = g2.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 256, 256);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true})); sp.scale.set(sz, sz * 1.3, 1); sp.position.set(x, y, -4); s.add(sp); return sp;};
      const b1 = blob(P.acento, -5.2, 7, 9), b2 = blob('#f2ecff', 5.4, -4.6, 7);
      const CW = 7.4, card = kit.cartao({w: CW, h: 1.5 + 1.0 * c.itens.length + 0.9, r: 0.45, espessura: 0.34}); grp.add(card); card.position.y = wy(900);
      const ch = 1.5 + 1.0 * c.itens.length + 0.9;
      const onda = new THREE.Shape(); const hw = CW / 2; onda.moveTo(-hw, -ch / 2 + 0.45); onda.lineTo(-hw, -ch * 0.12); onda.bezierCurveTo(-1, ch * 0.05, 1, -ch * 0.35, hw, -ch * 0.08); onda.lineTo(hw, -ch / 2 + 0.45); onda.quadraticCurveTo(hw, -ch / 2, hw - 0.45, -ch / 2); onda.lineTo(-hw + 0.45, -ch / 2); onda.quadraticCurveTo(-hw, -ch / 2, -hw, -ch / 2 + 0.45);
      kit.mesh(kit.extrude(onda, 0.04, 0), kit.mats.lavanda, card).position.z = card.userData.frente;
      const tit = kit.textoPlano(`*${c.titulo}*`, {px: 76, larguraPx: 640, alinhar: 'left', escalaDestaque: 1}); tit.position.set(0.05, ch / 2 - 0.95, card.userData.frente + 0.05); card.add(tit);
      const itens = c.itens.map((it, i) => {const y = ch / 2 - 2.0 - i * 1.0; const ic = kit.icone(it.icone ?? 'selo'); ic.scale.setScalar(0.62); ic.position.set(-CW / 2 + 0.85, y, card.userData.frente + 0.25); card.add(ic);
        const tx = kit.textoPlano(it.texto, {px: 52, larguraPx: 540, alinhar: 'left'}); tx.position.set(-CW / 2 + 1.4 + 2.7, y, card.userData.frente + 0.06); card.add(tx); return {it, ic, tx};});
      anim.push((a) => {
        b1.position.set(-5.2 + Math.sin(a * 0.9) * 0.5, 7 + Math.cos(a * 0.7) * 0.4, -4); b2.position.set(5.4 + Math.cos(a * 0.8) * 0.4, -4.6 + Math.sin(a * 0.6) * 0.5, -4);
        const k = spring(a - 0.05); card.scale.setScalar(lerp(0.8, 1, clamp(k, 0, 1.15))); card.rotation.set(lerp(0.5, 0.08, easeOut(a / 0.7)) + Math.sin(a) * 0.02, lerp(-0.9, -0.16, easeOut(a / 0.8)) + Math.sin(a * 0.7) * 0.04, 0);
        fade(tit, easeOut((a - 0.15) / 0.3));
        itens.forEach(({it, ic, tx}) => {const ki = a - (it.at - c.from); ic.scale.setScalar(0.62 * clamp(spring(ki), 0, 1.25)); ic.rotation.y = (1 - clamp(spring(ki))) * 3.2 + Math.sin(a * 2 + ki) * 0.15; fade(tx, ki < 0 ? 0 : easeOut((ki - 0.12) / 0.25)); tx.position.x = -CW / 2 + 4.1 - (1 - easeOut((ki - 0.12) / 0.25)) * 0.3;});
      });
      return {c, s, bg, anim, cam: {orbita: 0.022}};
    }
    if (c.tipo === 'broll') {
      // B-roll 3D em tela cheia: a voz continua e a legenda passa para a versão escura, embaixo.
      const fundo = c.fundo === 'escuro' ? P.escuro : c.fundo === 'claro' ? P.claro : P.lavanda;
      bg.style.background = escuro ? P.escuro : `radial-gradient(ellipse 85% 60% at 50% 38%, #ffffff 0%, ${fundo} 100%)`;
      const palco = new THREE.Group(); palco.position.y = u(H / 2 - (c.y ?? 700)); grp.add(palco);
      const extras = (c.icones ?? []).map((nome, i) => {const ic = kit.icone(nome); ic.scale.setScalar(0.9); ic.position.set(i % 2 ? 3.7 : -3.7, 6.2 - i * 2.2, -1.5 - i * 0.4); grp.add(ic); return ic;});
      if (c.cena === 'fichas') {
        // fichas pautadas em leque; a de cima é escrita a lápis, linha por linha
        const fichas = [];
        for (let i = 0; i < 3; i++) {const f = kit.cartao({w: 7.8, h: 4.8, r: 0.18, espessura: 0.06}); f.position.set((i - 1) * 0.35, (1 - i) * 0.3, -0.25 * (2 - i)); f.rotation.z = (i - 1) * 0.09; palco.add(f); fichas.push(f);}
        const topo = fichas[2], fz = topo.userData.frente + 0.004;
        const faixa = kit.mesh(new THREE.BoxGeometry(7.8, 0.5, 0.02), kit.mats.lavanda, topo); faixa.position.set(0, 2.15, fz - 0.02);
        for (let i = 0; i < 5; i++) {const l = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 0.025), new THREE.MeshBasicMaterial({color: '#b9b2cf'})); l.position.set(0, 1.18 - i * 0.78, fz); topo.add(l);}
        const linhas = (c.linhas ?? []).slice(0, 4).map((txt, i) => {
          const m = kit.textoPlano(txt, {px: 48, peso: 400, familia: 'IEHand', cor: P.tinta, larguraPx: 680, alinhar: 'left', escalaDestaque: 1, entrelinha: 1.05});
          m.position.set(0, 1.5 - i * 0.78, fz + 0.002); const plano = corte(-10); m.material.clippingPlanes = [plano]; topo.add(m); return {m, plano};
        });
        const lapis = new THREE.Group(); palco.add(lapis);
        const corpo = kit.mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.2, 6), new THREE.MeshPhysicalMaterial({color: P.acento, roughness: 0.35, clearcoat: 0.6}), lapis); corpo.position.y = 1.6;
        const madeira = kit.mesh(new THREE.ConeGeometry(0.13, 0.42, 6), new THREE.MeshStandardMaterial({color: '#e2bf8f', roughness: 0.7}), lapis); madeira.position.y = -0.21; madeira.rotation.x = Math.PI;
        const grafite = kit.mesh(new THREE.ConeGeometry(0.05, 0.16, 8), kit.mats.tinta, lapis); grafite.position.y = -0.37; grafite.rotation.x = Math.PI;
        const borracha = kit.mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.3, 16), kit.mats.lavanda, lapis); borracha.position.y = 3.35;
        const ponta = new THREE.Vector3();
        anim.push((a, dur) => {
          palco.rotation.set(lerp(-0.75, -0.42, easeOut(a / 0.9)), lerp(0.5, 0.12, easeOut(a / 1.1)) + Math.sin(a * 0.6) * 0.03, 0);
          palco.scale.setScalar(1.12 * lerp(0.82, 1, clamp(spring(a), 0, 1.1)));
          fichas.forEach((f, i) => {f.position.y = (1 - i) * 0.3 - (1 - easeOut((a - i * 0.08) / 0.5)) * 6;});
          const n = Math.max(1, linhas.length), janela = Math.max(0.6, (dur - 0.9) / n);
          palco.updateMatrixWorld();
          let escrevendo = false;
          linhas.forEach(({m, plano}, i) => {
            const k = easeInOut((a - 0.45 - i * janela) / (janela * 0.85)), w = m.geometry.parameters.width;
            const xl = m.position.x - w / 2 + 0.1 + (w - 0.2) * k;
            v3.set(xl, m.position.y, fz).applyMatrix4(topo.matrixWorld); plano.constant = v3.x;
            if (k > 0 && k < 1) {ponta.set(xl, m.position.y - 0.1, fz + 0.05); escrevendo = true;}
          });
          if (escrevendo) {topo.localToWorld(ponta); palco.worldToLocal(ponta); lapis.position.copy(ponta); lapis.position.y += Math.abs(Math.sin(a * 24)) * 0.05;}
          else lapis.position.set(3.4, -1.6, 0.9);
          lapis.rotation.set(0.5, 0, -0.5);
          lapis.visible = a > 0.35;
        });
      } else {
        // imagem PNG com alfa num set 3D: sombra própria, flutuação e parallax
        const tex = texturas[ci], asp = tex.image.width / tex.image.height, larg = c.escala ?? 7.6;
        const mat = new THREE.MeshStandardMaterial({map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8});
        const obj = new THREE.Mesh(new THREE.PlaneGeometry(larg, larg / asp), mat); obj.castShadow = true;
        obj.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.35});
        palco.add(obj);
        anim.push((a) => {
          const k = spring(a - 0.05); obj.scale.setScalar(lerp(0.75, 1, clamp(k, 0, 1.12)));
          obj.rotation.set(Math.sin(a * 0.8) * 0.04, lerp(-0.45, 0, easeOut(a / 0.9)) + Math.sin(a * 0.7) * 0.06, Math.sin(a * 0.5) * 0.02);
          obj.position.set(0, Math.sin(a * 1.4) * 0.12, 0.4 + 0.25 * easeOut(a / 2));
        });
      }
      if (c.rotulo) {
        const ry = u(H / 2 - (c.rotuloY ?? 250)), rot = kit.textoPlano(c.rotulo, {px: 58, peso: 700, cor: escuro ? '#ffffff' : P.tinta, larguraPx: 940}); rot.position.set(0, ry, 0.5); grp.add(rot);
        anim.push((a) => {rot.material.opacity = easeOut((a - 0.3) / 0.4); rot.position.y = ry - (1 - easeOut((a - 0.3) / 0.4)) * 0.3;});
      }
      anim.push((a) => extras.forEach((ic, i) => {ic.scale.setScalar(0.9 * clamp(spring(a - 0.3 - i * 0.15), 0, 1.2)); ic.rotation.set(0.2, -0.4 + Math.sin(a + i) * 0.4, 0); ic.position.y = 6.2 - i * 2.2 + Math.sin(a * 1.3 + i) * 0.15;}));
      return {c, s, bg, anim, cam: {orbita: 0.016}, legendaClara: !escuro};
    }
    if (c.tipo === 'encerramento') {
      // Chamada para o perfil: ícone do Instagram em 3D gira e vira o logo extrudado da marca.
      bg.style.background = `radial-gradient(ellipse 85% 60% at 50% 40%, #ffffff 0%, ${P.lavanda} 100%)`;
      const hold = new THREE.Group(), giro = new THREE.Group(); hold.add(giro); hold.position.set(0, u(H / 2 - (c.logoY ?? 760)), 0.6); grp.add(hold);
      const ig = new THREE.Group(), sz = c.tamanhoRede ?? 4.4, st = 0.09 * sz, rr2 = 0.29 * sz, ro = 0.235 * sz, dot = 0.055 * sz, dx = 0.255 * sz, prof = 0.42;
      const anel = kit.rr(sz, sz, rr2); anel.holes.push(kit.rr(sz - 2 * st, sz - 2 * st, rr2 - st));
      const lente = new THREE.Shape(); lente.absarc(0, 0, ro, 0, Math.PI * 2, false); const furo = new THREE.Path(); furo.absarc(0, 0, ro - st, 0, Math.PI * 2, true); lente.holes.push(furo);
      const ponto = new THREE.Shape(); ponto.absarc(dx, dx, dot, 0, Math.PI * 2, false);
      const lado = new THREE.MeshStandardMaterial({color: '#8a2f9e', roughness: 0.35, metalness: 0.35}), tampa = new THREE.MeshStandardMaterial({color: '#3a1450', roughness: 0.5});
      for (const shp of [anel, lente, ponto]) kit.mesh(kit.extrude(shp, prof, 0.04), [tampa, lado], ig);
      const n = 1024, cv = document.createElement('canvas'); cv.width = cv.height = n; const x = cv.getContext('2d'), kk = n / sz, mm = n / 2;
      const gr = x.createRadialGradient(0.3 * n, 1.07 * n, 0, 0.3 * n, 1.07 * n, 1.25 * n);
      [[0, '#fdf497'], [0.05, '#fdf497'], [0.45, '#fd5949'], [0.6, '#d6249f'], [0.9, '#285aeb']].forEach(([o, col]) => gr.addColorStop(o, col));
      x.fillStyle = gr; x.beginPath(); x.roundRect(0, 0, n, n, rr2 * kk); x.roundRect(st * kk, st * kk, n - 2 * st * kk, n - 2 * st * kk, (rr2 - st) * kk); x.fill('evenodd');
      x.beginPath(); x.arc(mm, mm, ro * kk, 0, Math.PI * 2); x.arc(mm, mm, (ro - st) * kk, 0, Math.PI * 2, true); x.fill();
      x.beginPath(); x.arc(mm + dx * kk, mm - dx * kk, dot * kk, 0, Math.PI * 2); x.fill();
      const ctex = new THREE.CanvasTexture(cv); ctex.colorSpace = THREE.SRGBColorSpace;
      const igFace = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({map: ctex, transparent: true, alphaTest: 0.04, toneMapped: false})); igFace.position.z = prof / 2 + 0.05; ig.add(igFace);
      giro.add(ig);
      const logo = new THREE.Group(); logo.rotation.y = Math.PI; giro.add(logo);
      const geo = LOGO_GEOMETRIA, tam = geo?.tamanho ?? 5.2;
      const ladoLogo = new THREE.MeshStandardMaterial({color: c.corLateral ?? '#0b1270', roughness: 0.45, metalness: 0.2});
      for (const shp of geo?.shapes ?? []) {
        const path = (pts, Kind) => {const o = new Kind(); pts.forEach(([px, py], i) => (i ? o.lineTo(px, py) : o.moveTo(px, py))); o.closePath(); return o;};
        const shape = path(shp.outline, THREE.Shape); shape.holes = (shp.holes ?? []).map((h2) => path(h2, THREE.Path));
        kit.mesh(kit.extrude(shape, prof, 0.04), ladoLogo, logo);
      }
      if (texturas[ci]) {const lf = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.MeshBasicMaterial({map: texturas[ci], transparent: true, alphaTest: 0.04, toneMapped: false})); lf.position.z = prof / 2 + 0.06; logo.add(lf);}
      const ty0 = u(H / 2 - (c.textoY ?? 1290));
      const chamada = kit.textoPlano(c.chamada ?? 'Siga no Instagram', {px: 66, peso: 500, cor: P.tinta, larguraPx: 960}); chamada.position.set(0, ty0, 0.5); grp.add(chamada);
      const perfilTx = kit.textoPlano(`*${c.perfil}*`, {px: 92, larguraPx: 1000, escalaDestaque: 1}); perfilTx.position.set(0, ty0 - 1.2, 0.5); grp.add(perfilTx);
      const brilho = new THREE.PointLight(P.acento2, 0, 14, 1.4); brilho.position.set(0, hold.position.y, 4); s.add(brilho);
      const tr = (c.transforma ?? (c.from + 2.0)) - c.from;
      anim.push((a) => {
        const k = spring(a - 0.1); hold.scale.setScalar(clamp(k, 0, 1.15)); hold.position.z = 0.6 + Math.sin(a * 1.5) * 0.12;
        const g2 = easeInOut((a - tr) / 0.95), ang = Math.PI * g2;
        giro.rotation.set(0.12 * (1 - easeOut(a / 1.2)), -1.1 * (1 - easeOut(a / 1.3)) + ang, 0);
        ig.visible = ang < Math.PI / 2; logo.visible = ang >= Math.PI / 2;
        giro.scale.setScalar(1 + 0.1 * Math.sin(Math.PI * clamp((a - tr) / 0.95)));
        brilho.intensity = 40 * Math.max(0, 1 - Math.abs(a - tr - 0.47) / 0.4) + 8 * easeOut((a - 0.4) / 0.8);
        chamada.material.opacity = easeOut((a - 0.5) / 0.4); perfilTx.material.opacity = easeOut((a - 0.75) / 0.4);
        perfilTx.position.y = ty0 - 1.2 - (1 - easeOut((a - 0.75) / 0.4)) * 0.3;
      });
      return {c, s, bg, anim, cam: {orbita: 0.01}};
    }
    throw new Error(`Cena desconhecida: ${c.tipo}`);
  });

  // Cartão 3D: laje que leva a fala viva (homografia) — entrada pela direita.
  const cartaoCena = cenaNova(false);
  const cartaoLaje = kit.cartao({w: 10.8, h: 19.2, r: 0.5, espessura: 0.3}); cartaoCena.add(cartaoLaje);

  // ---------- segmentos ----------
  const total = range.start + range.duration;
  const segs = []; let cursor = 0;
  [...cenas].sort((a, b) => a.c.from - b.c.from).forEach((cn) => {if (cn.c.from > cursor + 1e-6) segs.push({tipo: 'fala', from: cursor, to: cn.c.from}); segs.push({tipo: 'cena', cena: cn, from: cn.c.from, to: cn.c.to}); cursor = cn.c.to;});
  if (cursor < total) segs.push({tipo: 'fala', from: cursor, to: Infinity});
  segs.forEach((s, i) => {
    const ant = segs[i - 1], prox = segs[i + 1];
    s.entrada = s.tipo === 'cena' ? (s.cena.c.entrada ?? 'luz') : ant ? (ant.cena.c.retorno ?? ant.cena.c.saida ?? 'luz') : (ROTEIRO.abertura ?? 'luz');
    s.saida = s.tipo === 'cena' ? (s.cena.c.saida ?? 'luz') : prox ? (prox.cena.c.entrada ?? 'luz') : 'corte';
  });
  function estado(seg, t) {
    const st = {tx: 0, ty: 0, s: 1, blur: 0, whip: 0, raio: 0, luz: 0, branco: 0, cartao: null, camZ: 0};
    const ap = (e, q, entrando) => {
      if (e === 'luz') {st.luz = Math.max(st.luz, q); st.blur += 10 * q; st.raio = Math.max(st.raio, q);}
      else if (e === 'branco') {st.branco = Math.max(st.branco, q); st.blur += 12 * q;}
      else if (e === 'whip') {st.tx += (entrando ? 1 : -1) * W * 0.9 * q; st.whip += 40 * q;}
      else if (e === 'zoom') {st.s *= entrando ? 1 + 0.14 * q : 1 + 0.6 * q; st.blur += (entrando ? 14 : 26) * q; st.branco = Math.max(st.branco, entrando ? 0 : q * 0.6); st.camZ = entrando ? q * 0.3 : -q * 0.5;}
    };
    const a = t - seg.from, rr = seg.to - t;
    if (seg.entrada === 'cartao') {if (a < DUR_TR.cartao) st.cartao = {x: a / DUR_TR.cartao, entrando: true};}
    else if (DUR_TR[seg.entrada]) ap(seg.entrada, 1 - easeOut(a / DUR_TR[seg.entrada]), true);
    if (seg.saida === 'cartao') {if (rr < DUR_TR.cartao) st.cartao = {x: rr / DUR_TR.cartao, entrando: false};}
    else if (DUR_TR[seg.saida]) ap(seg.saida, easeIn(1 - rr / DUR_TR[seg.saida]), false);
    return st;
  }
  const camPadrao = () => {cam.position.set(0, 0, D); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();};
  const quadDe = (obj, w, h, z) => {obj.updateMatrixWorld(); return [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]].map(([x, y]) => {v3.set(x, y, z).applyMatrix4(obj.matrixWorld).project(cam); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H];});};

  // ---------- quadro ----------
  function renderAt(local) {
    const t = local + range.start;
    const seg = segs.find((s) => t >= s.from && t < s.to) ?? segs[segs.length - 1];
    const st = estado(seg, t);
    const cena = seg.tipo === 'cena' ? seg.cena : null, perfil = cena?.c.tipo === 'perfil';
    const broll = cena?.c.tipo === 'broll' && cena.c.legenda !== false;
    const falaVisivel = !cena || perfil, legendaVisivel = !cena || broll;
    enquadrar(t);
    // Legenda: branca sobre a fala; escura e embaixo durante o B-roll claro.
    const clara = broll && cena.legendaClara;
    legenda.style.top = `${broll ? (cena.c.legendaY ?? 1470) : LEG_Y}px`;
    legenda.style.color = clara ? P.tinta : '#fff';
    legenda.style.textShadow = clara ? 'none' : '0 4px 22px rgba(0,0,0,.45)';
    legenda.style.setProperty('--grad-destaque', clara ? grad : gradVideo);
    sombraLeg.style.display = broll ? 'none' : 'block';
    cenas.forEach((cn) => {cn.bg.style.display = cn === cena ? 'block' : 'none';});
    fala.style.display = falaVisivel ? 'block' : 'none';
    camPadrao();
    let cenaRender = null;
    fala.style.zIndex = '0'; fala.style.clipPath = 'none';
    let falaTransform = null;
    if (cena) {
      const a = t - cena.c.from, dur = cena.c.to - cena.c.from;
      // câmera: aproxima e orbita levemente durante o insert
      const o = cena.cam.orbita, dz = 0.12 * (1 - easeOut(a / 1.2)) + st.camZ;
      cam.position.set(Math.sin(a * 0.6) * D * o, Math.cos(a * 0.5) * D * o * 0.4, D * (1 + dz)); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
      cena.anim.forEach((f) => f(a, dur));
      cenaRender = cena.s;
      if (perfil) {
        // a fala viva vai para a face do card 3D (recorte do rosto 1000×814)
        const rx = 40, ry = ENQ.rostoY - 407, q = quadDe(cena.card, 8.6, 7.0, cena.card.userData.frente + 0.002);
        falaTransform = `${homografia(1000, 814, q)} translate(${-rx}px,${-ry}px)`;
        fala.style.clipPath = `inset(${ry}px ${W - rx - 1000}px ${H - ry - 814}px ${rx}px round 30px)`;
        fala.style.zIndex = '3';
      }
    } else if (st.cartao) {
      // cartão 3D: entra pela direita girando, para e cresce até a tela cheia
      const {x, entrando} = st.cartao, dir = entrando ? 1 : -1;
      const slide = easeOut(x / 0.42), grow = easeInOut((x - 0.62) / 0.38), sc = lerp(0.7, 1, grow);
      cartaoLaje.scale.set(sc, sc, 1); cartaoLaje.position.set(dir * (1 - slide) * 11, 0, -(1 - slide) * 2); cartaoLaje.rotation.set(0.05 * (1 - grow), dir * -0.75 * (1 - slide) + -0.12 * (1 - grow) * dir, 0);
      const q = quadDe(cartaoLaje, 10.8, 19.2, cartaoLaje.userData.frente + 0.002);
      falaTransform = homografia(W, H, q);
      fala.style.clipPath = `inset(0 round ${lerp(48, 0, grow)}px)`; fala.style.zIndex = '3';
      cenaRender = grow < 1 ? cartaoCena : null;
    }
    fundos.style.background = st.cartao ? P.claro : 'transparent';
    // sobreposições 3D na fala
    const temSobre = !cena && sobreAtivas(t, !st.cartao);
    if (!cena && !st.cartao) sobreposicoes.forEach((it) => {if (!(t >= it.o.at && t < it.o.ate)) it.g.visible = false;});
    if (!cenaRender && temSobre) cenaRender = sobreCena;
    canvas.style.visibility = cenaRender ? 'visible' : 'hidden';
    if (cenaRender) r.render(cenaRender, cam);
    // transformações 2D de transição aplicadas às camadas
    const push = !cena && !st.cartao ? 1 + 0.035 * clamp((t - seg.from) / Math.max(1, Math.min(8, seg.to - seg.from))) : 1;
    const s2 = st.s * push, tx = st.tx - (W * s2 - W) / 2, ty = st.ty - (H * s2 - H) / 2;
    const css = `translate(${tx}px,${ty}px) scale(${s2})`;
    camadas.forEach(({node, blur}) => {
      blur.setAttribute('stdDeviation', `${(st.whip + st.blur).toFixed(2)} ${st.blur.toFixed(2)}`);
      node.style.transform = node === fala ? (falaTransform ? falaTransform : css) : (node === fundos && !cena ? 'none' : css);
    });
    textos.style.display = legendaVisivel ? 'block' : 'none';
    legendas(t, legendaVisivel);
    renderSublinhados(t, legendaVisivel && !broll);
    luz.style.opacity = String(clamp(st.luz * 1.15));
    raio.style.opacity = String(st.raio * 0.9);
    raio.style.transform = `translateY(${lerp(1900, -500, st.raio)}px) rotate(-18deg)`;
    branco.style.opacity = String(clamp(st.branco));
    if (marca) marca.style.color = cena && !(cena.c.tipo === 'checklist' || cena.c.fundo === 'escuro') ? 'rgba(120,110,150,.85)' : 'rgba(255,255,255,.7)';
  }
  return {renderAt, segmentos: segs.map(({tipo, from, to, entrada, saida, cena}) => ({tipo: cena?.c.tipo ?? tipo, from, to, entrada, saida}))};
}
