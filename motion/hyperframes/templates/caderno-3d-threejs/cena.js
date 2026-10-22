// Template Caderno 3D (Three.js) — motor genérico dirigido por roteiro.js.
// Cena Three.js: caderno azul-escuro com profundidade real, foto viva colada
// por homografia e cards roxos com bordas douradas. Tudo é função do tempo da
// montagem (determinístico); nenhum relógio ou laço próprio.
import * as THREE from './three.module.js';
import {ROTEIRO, LOGO_GEOMETRIA} from './roteiro.js';

const PLANOS = ROTEIRO.planos, CARDS = ROTEIRO.cards ?? [], FIM = ROTEIRO.encerramento, INSERTS = ROTEIRO.inserts ?? [];
// Encerramento opcional: a foto vai ao caderno, sobe para fora da página e o logo 3D entra.
const BLOCOS = [...(ROTEIRO.blocos ?? []), ...(FIM ? [{id: 'FIM', from: FIM.from, to: Infinity, semVolta: true, saidaFoto: FIM.saidaFoto, corte: FIM.transicao === 'corte', fade: FIM.fade ?? 0.12,
  photo: {x: 0, y: 5.25, w: 8.6, rot: -1.5}, cams: [{at: FIM.from, x: 0, y: 0.2, dist: 1, roll: 0}]}] : [])];

const W = 1080, H = 1920, SRC_W = ROTEIRO.fonte?.largura ?? 1920, SRC_H = ROTEIRO.fonte?.altura ?? 1080, FOV = 30;
const D = (H / 200) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // 1 unidade = 100 px em z=0
const TILT = THREE.MathUtils.degToRad(17), YAW = THREE.MathUtils.degToRad(7);
const IN = 0.75, OUT = 0.75;
const C = {page: '#0d1834', desk: '#050914', sheet: '#111e3b', ink: '#e4edff', teal: '#00d0b8', gold: '#FFE368', purple: '#1c172b', tile: '#34233f', lilac: '#BB99E8', red: '#e0483a', paper: '#eef2fb'};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x) => {x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;};
const easeBack = (x) => {x = clamp(x); const c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);};
const spring = (s) => s <= 0 ? 0 : 1 - Math.exp(-6.5 * s) * Math.cos(8.5 * s);

export async function criarCena({backHost, frontHost, photo, clipBox, video, gradient, captionsEl, legendas, range, logoGeometria, insertsHost}) {
  await document.fonts.load('700 100px ArialLocal');

  // ---------- renderizadores ----------
  const mk = (host, alpha) => {
    const r = new THREE.WebGLRenderer({antialias: true, alpha, preserveDrawingBuffer: true});
    r.setSize(W, H, false); r.setPixelRatio(1);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    host.append(r.domElement); return r;
  };
  const back = mk(backHost, false), front = mk(frontHost, true);
  front.setClearColor(0x000000, 0);

  // Ambiente simples para reflexos do dourado (sem arquivos externos).
  const envFor = (renderer) => {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({color: 0x0b1226, side: THREE.BackSide})));
    const panel = (color, k, pos, size) => {const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide})); m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);};
    panel('#fff0d8', 5, [-6, 9, 8], [10, 6]); panel('#7fe8ff', 2.2, [9, -2, 5], [4, 10]); panel('#ffffff', 1.4, [0, 0, 15], [14, 8]);
    const tex = pm.fromScene(env, 0.04).texture; pm.dispose(); return tex;
  };

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.05, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.transparent, envMapIntensity: o.env ?? 1});
  const goldMat = () => std(C.gold, {metal: 0.85, rough: 0.28, env: 1.15});
  const mesh = (geo, mat, parent) => {const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m;};

  const rr = (w, h, r) => {const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;};
  const extrude = (shape, depth, bevel = 0.03) => new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 18});

  // Texto em textura (Arial negrito local). Retorna plano com largura em unidades.
  function textPlane(lines, {size = 0.62, color = C.ink, accent, align = 'center', width = 8, lineH = 1.18, weight = 700} = {}) {
    const ppu = 220, wpx = Math.ceil(width * ppu), hpx = Math.ceil((lines.length * lineH + 0.35) * size * ppu);
    const c = document.createElement('canvas'); c.width = wpx; c.height = hpx;
    const g = c.getContext('2d'); g.font = `${weight} ${size * ppu}px ArialLocal`; g.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const y = hpx / 2 + (i - (lines.length - 1) / 2) * lineH * size * ppu;
      const parts = line.split(/(\s+)/), total = g.measureText(line).width;
      let x = align === 'left' ? 0 : (wpx - total) / 2;
      for (const p of parts) {g.fillStyle = accent && p.replace(/[.,?!]/g, '') === accent ? C.teal : color; g.fillText(p, x, y); x += g.measureText(p).width;}
    });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, hpx / ppu), new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false}));
    m.renderOrder = 2; return m;
  }

  // ---------- ícones 3D (≈1 unidade) ----------
  const ICONS = {
    setaBaixo(mat) {const s = new THREE.Shape(); s.moveTo(-0.14, 0.48); s.lineTo(0.14, 0.48); s.lineTo(0.14, -0.02); s.lineTo(0.4, -0.02); s.lineTo(0, -0.5); s.lineTo(-0.4, -0.02); s.lineTo(-0.14, -0.02); s.closePath(); const g = new THREE.Group(); mesh(extrude(s, 0.16, 0.03), mat, g); return g;},
    setaCima(mat) {const g = ICONS.setaBaixo(mat); g.rotation.z = Math.PI; return g;},
    predio(mat) {const g = new THREE.Group(); mesh(new THREE.BoxGeometry(1.0, 0.12, 0.34), mat, g).position.y = -0.44; mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), mat, g).position.y = -0.34;
      for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.56, 16), mat, g).position.set(-0.33 + i * 0.22, -0.02, 0);
      mesh(new THREE.BoxGeometry(0.98, 0.1, 0.32), mat, g).position.y = 0.3;
      const t = new THREE.Shape(); t.moveTo(-0.54, 0); t.lineTo(0.54, 0); t.lineTo(0, 0.27); t.closePath(); const p = mesh(extrude(t, 0.26, 0.02), mat, g); p.position.set(0, 0.36, -0.13); return g;},
    livro(mat, alt) {const g = new THREE.Group(), page = std('#f3f6ff', {rough: 0.8});
      for (const s of [-1, 1]) {const leaf = new THREE.Group(); leaf.position.x = s * 0.24; leaf.rotation.y = s * -0.32; g.add(leaf);
        mesh(new THREE.BoxGeometry(0.5, 0.68, 0.05), alt ?? mat, leaf); const pg = mesh(new THREE.BoxGeometry(0.45, 0.62, 0.06), page, leaf); pg.position.z = 0.05;
        for (let j = 0; j < 4; j++) mesh(new THREE.BoxGeometry(0.3, 0.025, 0.01), std('#6b7f9e'), leaf).position.set(0, 0.2 - j * 0.13, 0.085);}
      mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 12), mat, g).position.z = 0.02; return g;},
    edital(mat) {const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.72, 0.92, 0.06), std(C.paper, {rough: 0.75}), g);
      for (let j = 0; j < 4; j++) mesh(new THREE.BoxGeometry(j === 0 ? 0.42 : 0.5, 0.05, 0.02), std(C.teal, {emissive: C.teal, ei: 0.15}), g).position.set(j === 0 ? -0.04 : 0, 0.3 - j * 0.15, 0.04);
      const ck = new THREE.Shape(); ck.moveTo(-0.2, 0); ck.lineTo(-0.08, -0.12); ck.lineTo(0.2, 0.18); ck.lineTo(0.26, 0.12); ck.lineTo(-0.08, -0.24); ck.lineTo(-0.26, -0.06); ck.closePath();
      const c = mesh(extrude(ck, 0.08, 0.02), mat, g); c.position.set(0.22, -0.28, 0.05); return g;},
    coracao(mat) {const s = new THREE.Shape(); s.moveTo(0, -0.42); s.bezierCurveTo(-0.15, -0.3, -0.5, -0.05, -0.5, 0.18); s.bezierCurveTo(-0.5, 0.4, -0.3, 0.48, -0.18, 0.48); s.bezierCurveTo(-0.08, 0.48, 0, 0.4, 0, 0.32); s.bezierCurveTo(0, 0.4, 0.08, 0.48, 0.18, 0.48); s.bezierCurveTo(0.3, 0.48, 0.5, 0.4, 0.5, 0.18); s.bezierCurveTo(0.5, -0.05, 0.15, -0.3, 0, -0.42);
      const g = new THREE.Group(); mesh(extrude(s, 0.18, 0.06), mat, g); return g;},
    vaso(mat) {const pts = [[0, -0.46], [0.22, -0.46], [0.3, -0.36], [0.36, -0.12], [0.32, 0.1], [0.2, 0.26], [0.17, 0.38], [0.24, 0.46], [0.22, 0.48], [0, 0.48]].map(([x, y]) => new THREE.Vector2(x, y));
      const g = new THREE.Group(); mesh(new THREE.LatheGeometry(pts, 40), mat, g); return g;},
    figura(mat, h = 1) {const g = new THREE.Group(); mesh(new THREE.SphereGeometry(0.15 * h, 24, 16), mat, g).position.y = 0.3 * h; mesh(new THREE.CapsuleGeometry(0.15 * h, 0.26 * h, 8, 20), mat, g).position.y = -0.12 * h; return g;},
    pessoas(mat) {const g = new THREE.Group(); [[-0.34, 0.85, std(C.teal, {rough: 0.4})], [0, 1, mat], [0.34, 0.85, std(C.lilac, {rough: 0.5})]].forEach(([x, h, m]) => {const f = ICONS.figura(m, h); f.position.set(x, (h - 1) * 0.3, x === 0 ? 0.12 : 0); g.add(f);}); return g;},
    capelo(mat) {const g = new THREE.Group(), dark = std('#5a4690', {rough: 0.45}); mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.3, 24), dark, g).position.y = -0.1;
      const plate = mesh(new THREE.BoxGeometry(0.86, 0.06, 0.86), dark, g); plate.position.y = 0.08; plate.rotation.set(0.45, Math.PI / 4, 0);
      mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 8), mat, g).position.set(0.36, -0.08, 0.1); mesh(new THREE.SphereGeometry(0.05, 12, 8), mat, g).position.set(0.36, -0.28, 0.1); return g;},
    folha(mat) {const s = new THREE.Shape(); s.moveTo(0, -0.48); s.quadraticCurveTo(0.5, -0.1, 0, 0.5); s.quadraticCurveTo(-0.5, -0.1, 0, -0.48);
      const g = new THREE.Group(); mesh(extrude(s, 0.07, 0.03), mat, g); mesh(new THREE.BoxGeometry(0.03, 0.85, 0.03), std('#0b6d63'), g).position.z = 0.11; mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), std('#0b6d63'), g).position.y = -0.55; return g;},
    martelo(mat) {const g = new THREE.Group(), wood = std('#5a3d8a', {rough: 0.45});
      const head = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.62, 24), wood, g); head.rotation.z = Math.PI / 2; head.position.y = 0.22;
      for (const x of [-0.24, 0.24]) {const b = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), mat, g); b.rotation.z = Math.PI / 2; b.position.set(x, 0.22, 0);}
      mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.66, 12), mat, g).position.y = -0.16; return g;},
    maleta(mat) {const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.95, 0.62, 0.3), std('#3d2a63', {rough: 0.45}), g).position.y = -0.08;
      const h = mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 24, Math.PI), mat, g); h.position.y = 0.23; mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), mat, g).position.set(0, 0.05, 0.17);
      mesh(new THREE.BoxGeometry(0.95, 0.03, 0.31), mat, g).position.y = 0.04; return g;},
    casa(mat) {const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), std('#f3f6ff', {rough: 0.7}), g).position.y = -0.18;
      const t = new THREE.Shape(); t.moveTo(-0.52, 0); t.lineTo(0.52, 0); t.lineTo(0, 0.36); t.closePath(); const r = mesh(extrude(t, 0.56, 0.02), mat, g); r.position.set(0, 0.07, -0.28);
      mesh(new THREE.BoxGeometry(0.18, 0.3, 0.04), std(C.teal), g).position.set(0, -0.28, 0.26); return g;},
    bandeira(mat) {const g = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 12), mat, g).position.y = 0.15; mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.1, 28), mat, g).position.y = -0.6;
      const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.3, 0.12, 0.5, -0.1, 0.85, 0.04); s.lineTo(0.85, -0.42); s.bezierCurveTo(0.5, -0.56, 0.3, -0.34, 0, -0.46); s.closePath();
      const f = mesh(extrude(s, 0.04, 0.015), std(C.teal, {emissive: C.teal, ei: 0.25, rough: 0.4}), g); f.position.set(0.04, 0.88, 0); return g;},
  };

  // ---------- cena de trás: caderno ----------
  const backScene = new THREE.Scene(); backScene.background = new THREE.Color(C.desk);
  backScene.environment = envFor(back);
  const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200);
  const hemi = new THREE.HemisphereLight('#a9c8ff', '#0a0f24', 0.6); backScene.add(hemi);
  const key = new THREE.DirectionalLight('#ffe9c8', 2.9); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -9, right: 9, top: 13, bottom: -13, near: 1, far: 60}); key.shadow.normalBias = 0.02; key.shadow.bias = -0.0004;
  backScene.add(key, key.target);
  const rim = new THREE.PointLight(C.teal, 45, 24, 1.6); backScene.add(rim);

  // Página com textura de pontos e margem turquesa; argolas douradas na lateral.
  const dots = document.createElement('canvas'); dots.width = dots.height = 128;
  {const g = dots.getContext('2d'); g.fillStyle = C.page; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(200,215,255,0.22)'; g.fillRect(62, 62, 5, 5);}
  const dotTex = new THREE.CanvasTexture(dots); dotTex.wrapS = dotTex.wrapT = THREE.RepeatWrapping; dotTex.repeat.set(14 / 0.6, 26 / 0.6); dotTex.colorSpace = THREE.SRGBColorSpace;
  const page = mesh(new THREE.BoxGeometry(14, 26, 0.3), new THREE.MeshStandardMaterial({map: dotTex, roughness: 0.93, metalness: 0}), backScene); page.position.set(0.9, 0, -0.15); page.castShadow = false;
  const margin = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 26), new THREE.MeshBasicMaterial({color: C.teal, transparent: true, opacity: 0.35})); margin.position.set(-4.62, 0, 0.005); backScene.add(margin);
  const gold = goldMat();
  for (let y = -12; y <= 12; y += 1.2) {const r = mesh(new THREE.TorusGeometry(0.28, 0.055, 12, 36), gold, backScene); r.position.set(-5.05, y, 0.05); r.rotation.y = 1.15;}

  // Moldura física da foto (espessura e sombra). A imagem viva é o elemento DOM projetado na face.
  const frameMat = std(C.paper, {rough: 0.7});
  const photoFrame = mesh(new THREE.BoxGeometry(1, 1, 0.12), frameMat, backScene);

  const blockGroups = {};
  for (const b of BLOCOS) {const g = new THREE.Group(); g.visible = false; backScene.add(g); blockGroups[b.id] = g;}
  const anims = []; // {at, fn(age)}
  const at = (time, fn) => anims.push({time, fn});

  function pop(obj, time, {dur = 0.55, lift = 1.6, from = 0.2, deep = 1.5} = {}) {
    obj.scale.z *= deep;
    const base = obj.position.clone(), s0 = obj.scale.clone(); obj.visible = false;
    at(time, (age) => {const k = easeBack(age / dur), d = easeOut(age / dur); obj.visible = age >= 0; obj.scale.copy(s0).multiplyScalar(lerp(from, 1, k)); obj.position.set(base.x, base.y, base.z + (1 - d) * lift);});
  }
  function fadeText(m, time, until = Infinity) {m.material.opacity = 0; const y = m.position.y; at(time, (age, t) => {const o = Math.min(easeOut(age / 0.45), 1 - easeOut((t - until) / 0.35)); m.material.opacity = o; m.position.y = y - (1 - easeOut(age / 0.45)) * 0.25;});}
  function tube(points, time, {dur = 0.9, color = C.teal, r = 0.055, parent}) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2] ?? 0.12)));
    const geo = new THREE.TubeGeometry(curve, 160, r, 10, false), m = mesh(geo, std(color, {emissive: color, ei: 0.35, rough: 0.35}), parent);
    const total = geo.index.count; geo.setDrawRange(0, 0);
    at(time, (age) => geo.setDrawRange(0, Math.floor(total * easeInOut(age / dur) / 6) * 6)); return m;
  }
  const label = (txt, x, y, parent, o = {}) => {const m = textPlane([txt], {size: o.size ?? 0.42, width: o.width ?? 3.4, color: o.color ?? C.ink, accent: o.accent}); m.position.set(x, y, 0.03); parent.add(m); return m;};
  const heading = (txt, accent, y, parent, time, until) => {const m = textPlane([txt], {size: 0.62, width: 9.6, accent}); m.position.set(0, y, 0.04); parent.add(m); fadeText(m, time, until); return m;};
  const disc = (x, y, parent, color = C.gold) => {const d = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 28), color === C.gold ? gold : std(color), parent); d.rotation.x = Math.PI / 2; d.position.set(x, y, 0.06); return d;};

  // ---------- itens do caderno (vocabulário do template) ----------
  const MATS = {
    dourado: () => gold,
    turquesa: () => std(C.teal, {rough: 0.35, metal: 0.2, emissive: C.teal, ei: 0.08}),
    lilas: () => std(C.lilac, {rough: 0.45}),
    roxo: () => std('#3d2a63', {rough: 0.45}),
    branco: () => std('#f3f6ff', {rough: 0.7}),
  };
  const matOf = (name = 'dourado') => (MATS[name] ? MATS[name]() : std(name, {rough: 0.45}));
  const colorOf = (name) => ({turquesa: C.teal, dourado: C.gold, vermelho: C.red, lilas: C.lilac, branco: C.ink, texto: C.ink}[name] ?? name);
  const iconOf = (it) => ICONS[it.icone](matOf(it.material));

  function balanca(it, g) {
    const base = new THREE.Group(); base.position.set(it.x ?? 0, it.y ?? -1.15, 0.4); g.add(base); pop(base, it.at, {lift: 0.8});
    mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.18, 36), gold, base).position.y = -2.15;
    mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.15, 16), gold, base).position.y = -1.05;
    mesh(new THREE.SphereGeometry(0.17, 20, 14), gold, base);
    const beam = new THREE.Group(); base.add(beam); const hangs = [];
    mesh(new THREE.BoxGeometry(5.0, 0.11, 0.16), gold, beam);
    for (const s of [-1, 1]) {
      const hang = new THREE.Group(); hang.position.x = s * 2.4; beam.add(hang); hangs.push(hang);
      const pan = new THREE.Group(); pan.position.y = -1.25; hang.add(pan);
      for (const dx of [-0.42, 0.42]) {const str = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), gold, hang); str.position.set(dx * 0.5, -0.62, 0); str.rotation.z = -dx * 0.33;}
      mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.12, 32), std(C.gold, {metal: 0.6, rough: 0.3, emissive: C.gold, ei: 0.18}), pan);
    }
    const events = [];
    [['esquerda', 0, 0.2], ['direita', 1, -0.16]].forEach(([side, i, tilt]) => {
      const spec = it[side]; if (!spec) return;
      const o = iconOf(spec); o.scale.setScalar(spec.escala ?? 1.3); o.position.set(0, spec.altura ?? 0.7, 0); hangs[i].children[0].add(o); pop(o, spec.at, {lift: 1.2});
      if (spec.rotulo) fadeText(label(spec.rotulo, base.position.x + (i ? 2.4 : -2.4), base.position.y - 2.6, g, {size: 0.46, width: 2.8}), spec.at + 0.2);
      events.push([spec.at, tilt]);
    });
    events.sort((x, y) => x[0] - y[0]);
    at(it.at, (_, t) => {
      let a = 0; for (const [time, tilt] of events) a = lerp(a, tilt, easeBack((t - time - 0.25) / 0.7));
      if (it.iguala !== undefined) a = lerp(a, 0, easeInOut((t - it.iguala) / 1.0));
      beam.rotation.z = a; hangs.forEach((h) => {h.rotation.z = -a;});
    });
  }

  function pilha(it, g) {
    const stack = new THREE.Group(); stack.position.set(it.x ?? 0, it.y ?? -2.2, 0.4); g.add(stack);
    const layers = new THREE.Group(); stack.add(layers);
    (it.camadas ?? []).forEach((c, i) => {
      const y = c.y ?? -0.1 + i * 1.45;
      if (c.tipo === 'bloco') {
        const blk = new THREE.Group(); layers.add(blk); blk.position.y = y;
        mesh(new THREE.BoxGeometry(c.largura ?? 2.6, 0.75, 1.0), matOf(c.material ?? 'turquesa'), blk);
        const lbl = label(c.texto, 0, 0, blk, {size: 0.42, width: (c.largura ?? 2.6) - 0.2, color: '#06243a'}); lbl.position.z = 0.52;
        pop(blk, c.at, {lift: 0.4, from: 0.6});
      } else {
        const o = iconOf(c); o.scale.setScalar(c.escala ?? 1.75); o.position.set(0, y, 0); layers.add(o); pop(o, c.at, {lift: 0.4, from: 0.6});
        if (c.rotulo) fadeText(label(c.rotulo, c.rotuloX ?? 2.85, y - 0.1, stack, {size: 0.42, width: 2.8}), c.at + 0.25);
      }
    });
    if (it.base) {
      const slab = mesh(new THREE.BoxGeometry(it.base.largura ?? 5.6, 0.36, 1.3), gold, stack); slab.position.y = -0.75; slab.visible = false;
      if (it.base.rotulo) fadeText(label(it.base.rotulo, 0, -1.45, stack, {size: 0.42, width: 3.8, color: C.gold}), it.base.at + 0.3);
      at(it.base.at, (age) => {slab.visible = age >= 0; slab.position.x = (1 - easeOut(age / 0.7)) * -7; layers.position.y = easeBack((age - 0.45) / 0.5) * 0.14;});
    }
  }

  function buildItem(it, g) {
    switch (it.tipo) {
      case 'titulo': heading(it.texto, it.destaque, it.y ?? 1.85, g, it.at, it.ate ?? Infinity); break;
      case 'rotulo': fadeText(label(it.texto, it.x, it.y, g, {size: it.tamanho ?? 0.42, width: it.largura ?? 3.4, color: colorOf(it.cor ?? 'texto'), accent: it.destaque}), it.at, it.ate ?? Infinity); break;
      case 'icone': {const o = iconOf(it); o.scale.setScalar(it.escala ?? 1.5); o.position.set(it.x, it.y, it.z ?? 0.55); g.add(o); pop(o, it.at, {lift: it.elevacao ?? 1.6, dur: it.dur ?? 0.55}); break;}
      case 'disco': pop(disc(it.x, it.y, g), it.at, {lift: 0.6}); break;
      case 'caminho': tube(it.pontos, it.at, {dur: it.dur ?? 0.9, color: colorOf(it.cor ?? 'turquesa'), r: it.raio ?? 0.055, parent: g}); break;
      case 'no': {const pts = []; for (let i = 0; i <= 40; i++) {const a = i / 40 * Math.PI * 5; pts.push([it.x + Math.cos(a) * 0.38 * (1 - i / 60), it.y + Math.sin(a) * 0.38 + i * 0.012, 0.15 + 0.06 * Math.sin(a * 0.5)]);}
        tube(pts, it.at, {dur: it.dur ?? 1.1, color: colorOf(it.cor ?? 'vermelho'), r: 0.04, parent: g}); break;}
      case 'brilho': {const l = new THREE.PointLight(colorOf(it.cor ?? 'dourado'), 0, it.alcance ?? 6, 1.5); l.position.set(it.x, it.y, it.z ?? 2.2); g.add(l);
        at(it.at, (age) => {l.intensity = (it.intensidade ?? 18) * easeOut(age / 0.6);}); break;}
      case 'balanca': balanca(it, g); break;
      case 'pilha': pilha(it, g); break;
      default: throw new Error(`Item desconhecido: ${it.tipo}`);
    }
  }

  // Glifo do Instagram (contorno arredondado, lente e ponto) com o degradê da marca, em 3D.
  function instagram(sz) {
    const grp = new THREE.Group(), st = 0.09 * sz, r = 0.29 * sz, ro = 0.235 * sz, dot = 0.055 * sz, dx = 0.255 * sz;
    const ring = rr(sz, sz, r); ring.holes.push(rr(sz - 2 * st, sz - 2 * st, r - st));
    const lens = new THREE.Shape(); lens.absarc(0, 0, ro, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, ro - st, 0, Math.PI * 2, true); lens.holes.push(hole);
    const pt = new THREE.Shape(); pt.absarc(dx, dx, dot, 0, Math.PI * 2, false);
    const depth = 0.42, side = std('#8a2f9e', {rough: 0.35, metal: 0.35}), cap = std('#3a1450', {rough: 0.5});
    for (const shp of [ring, lens, pt]) {const geo = extrude(shp, depth, 0.04); geo.translate(0, 0, -depth / 2); mesh(geo, [cap, side], grp);}
    const n = 1024, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), k = n / sz, m = n / 2;
    const grad = x.createRadialGradient(0.3 * n, 1.07 * n, 0, 0.3 * n, 1.07 * n, 1.25 * n);
    [[0, '#fdf497'], [0.05, '#fdf497'], [0.45, '#fd5949'], [0.6, '#d6249f'], [0.9, '#285aeb']].forEach(([o, col]) => grad.addColorStop(o, col));
    x.fillStyle = grad; x.beginPath();
    x.roundRect(0, 0, n, n, r * k); x.roundRect(st * k, st * k, n - 2 * st * k, n - 2 * st * k, (r - st) * k); x.fill('evenodd');
    x.beginPath(); x.arc(m, m, ro * k, 0, Math.PI * 2); x.arc(m, m, (ro - st) * k, 0, Math.PI * 2, true); x.fill();
    x.beginPath(); x.arc(m + dx * k, m - dx * k, dot * k, 0, Math.PI * 2); x.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({map: tex, transparent: true, alphaTest: 0.04, toneMapped: false}));
    face.position.z = depth / 2 + 0.05; grp.add(face); return grp;
  }

  // Logo 3D do encerramento: arte original como textura na face; contorno extraído do alfa dá espessura.
  if (FIM) {
    // holder (entra e sobe) → turn (giro da transformação) → [ícone da rede, logo virado 180°]
    const g = blockGroups.FIM, logo = new THREE.Group(), turn = new THREE.Group(), spin = new THREE.Group(); logo.add(turn); turn.add(spin);
    const tex = await new THREE.TextureLoader().loadAsync(FIM.logo); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const geoData = logoGeometria ?? LOGO_GEOMETRIA, size = geoData?.tamanho ?? 6.4, depth = 0.42;
    const side = std('#0b1640', {rough: 0.5, metal: 0.2});
    for (const shp of geoData?.shapes ?? []) {
      const path = (pts, Kind) => {const o = new Kind(); pts.forEach(([x, y], i) => (i ? o.lineTo(x, y) : o.moveTo(x, y))); o.closePath(); return o;};
      const shape = path(shp.outline, THREE.Shape); shape.holes = (shp.holes ?? []).map((h) => path(h, THREE.Path));
      const geo = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 3, curveSegments: 8});
      geo.translate(0, 0, -depth / 2); mesh(geo, [side, gold], spin);
    }
    // Face sem iluminação nem tone mapping: as cores da marca saem iguais ao PNG.
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({map: tex, transparent: true, alphaTest: 0.04, toneMapped: false}));
    face.position.z = depth / 2 + 0.06; spin.add(face);
    logo.scale.setScalar(FIM.escala ?? 1); logo.position.set(0, FIM.logoY ?? 0.9, 1.0); g.add(logo);
    pop(logo, FIM.logoAt, {lift: 2.2, from: 0.35, dur: 0.85, deep: 1});
    const rede = FIM.rede === 'instagram' ? instagram(FIM.tamanhoRede ?? 4.6) : null;
    const first = rede ?? spin;
    if (rede) {turn.add(rede); spin.rotation.y = Math.PI;}
    at(FIM.logoAt, (age) => {first.rotation.y = -1.25 * (1 - easeOut(age / 1.5)); first.rotation.x = 0.18 * (1 - easeOut(age / 1.5));});
    if (rede) {
      // Transformação: meia volta; no perfil (90°) o ícone da rede dá lugar ao logo.
      const flash = new THREE.PointLight(C.teal, 0, 10, 1.3); flash.position.set(0, FIM.logoY ?? 0.9, 4); g.add(flash);
      at(FIM.transforma, (age) => {
        const k = easeInOut(age / 0.95), a = Math.PI * k;
        turn.rotation.y = a; rede.visible = a < Math.PI / 2; spin.visible = a >= Math.PI / 2;
        turn.scale.setScalar(1 + 0.1 * Math.sin(Math.PI * clamp(age / 0.95)));
        flash.intensity = 60 * Math.max(0, 1 - Math.abs(age - 0.47) / 0.35);
      });
    }
    const glow = new THREE.PointLight(C.teal, 0, 9, 1.4); glow.position.set(0, (FIM.logoY ?? 0.9) - 0.5, 3.5); g.add(glow);
    at(FIM.logoAt + 0.3, (age) => {glow.intensity = 30 * easeOut(age / 0.9);});
    const l1 = textPlane([FIM.chamada ?? 'Siga'], {size: 0.72, width: 9}); l1.position.set(0, FIM.textoY ?? -3.05, 0.05); g.add(l1); fadeText(l1, FIM.logoAt + 0.6);
    const l2 = textPlane([FIM.perfil], {size: 0.86, width: 9.6, color: C.teal}); l2.position.set(0, (FIM.textoY ?? -3.05) - 1.0, 0.05); g.add(l2); fadeText(l2, FIM.logoAt + 0.8);
  }
  for (const b of BLOCOS) for (const it of b.itens ?? []) buildItem(it, blockGroups[b.id]);

  // ---------- cena da frente: cards sobre a fala ----------
  const frontScene = new THREE.Scene(); frontScene.environment = envFor(front);
  const fcam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200); fcam.position.set(0, 0, D); fcam.lookAt(0, 0, 0);
  frontScene.add(new THREE.HemisphereLight('#c8d6ff', '#1a1030', 0.9));
  const fkey = new THREE.DirectionalLight('#fff0d6', 2.2); fkey.position.set(-6, 8, 11); fkey.castShadow = true; fkey.shadow.mapSize.set(2048, 2048);
  Object.assign(fkey.shadow.camera, {left: -8, right: 8, top: 12, bottom: -12, near: 1, far: 50}); fkey.shadow.radius = 4; frontScene.add(fkey);
  const fglow = new THREE.PointLight(C.gold, 6, 12, 1.5); fglow.position.set(4, -1, 5); frontScene.add(fglow);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 22), new THREE.ShadowMaterial({opacity: 0.55})); catcher.receiveShadow = true; frontScene.add(catcher);

  function cardFace(spec, mats) {
    const face = new THREE.Group();
    const tile = mesh(extrude(rr(1.36, 1.36, 0.26), 0.08, 0.02), mats.tile, face); tile.position.set(-3.1, 0, 0.32);
    const icon = ICONS[spec.icone](mats.gold); icon.scale.setScalar(0.92); icon.position.set(-3.1, 0, 0.62); face.add(icon);
    const txt = textPlane(spec.texto, {size: spec.texto.length > 1 ? 0.6 : 0.72, width: 5.9, align: 'left', lineH: 1.1});
    txt.position.set(0.95, 0, 0.345); face.add(txt); face.userData.icon = icon; return face;
  }
  const cards = CARDS.map((spec) => {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); frontScene.add(root); root.visible = false;
    const mats = {gold: goldMat(), tile: std(C.tile, {rough: 0.5}), body: std(C.purple, {rough: 0.55, metal: 0.1})};
    const w = 8.6, h = spec.frente.texto.length > 1 ? 2.25 : 1.9;
    mesh(extrude(rr(w - 0.2, h - 0.2, 0.34), 0.3, 0.04), mats.body, body);
    const ring = rr(w, h, 0.42); ring.holes.push(rr(w - 0.26, h - 0.26, 0.32));
    mesh(extrude(ring, 0.1, 0.04), mats.gold, body).position.z = 0.24;
    body.add(cardFace(spec.frente, mats));
    if (spec.verso) {
      mesh(extrude(ring, 0.1, 0.04), mats.gold, body).position.z = -0.1;
      const backFace = cardFace(spec.verso, mats); backFace.rotation.y = Math.PI; backFace.position.z = 0.29; body.add(backFace);
    }
    const all = []; root.traverse((o) => {if (o.material) {o.material.transparent = true; all.push(o.material);}});
    return {spec, root, body, mats: [...new Set(all)], baseOpacity: new Map([...new Set(all)].map((m) => [m, m.opacity]))};
  });

  // ---------- foto viva: homografia DOM ----------
  const fullRect = [0, 0, SRC_W, SRC_H];
  const cropRect = (p) => {const h = SRC_H / p.zoom, w = h * W / H; const x = clamp(p.cx - w / 2, 0, SRC_W - w); const y = clamp(p.cy - h * 0.37, 0, SRC_H - h); return [x, y, w, h];};
  const planoAt = (t) => PLANOS.find((p) => t >= p.from && t < p.to) ?? PLANOS[PLANOS.length - 1];
  const screenQuad = [[0, 0], [W, 0], [W, H], [0, H]];
  const v3 = new THREE.Vector3();
  const project = (x, y, z) => {v3.set(x, y, z).project(cam); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H];};
  function homography(w, h, q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    let g = 0, hh = 0; if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {const den = dx1 * dy2 - dx2 * dy1; g = (sx * dy2 - dx2 * sy) / den; hh = (dx1 * sy - sx * dy1) / den;}
    const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
    return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
  }
  const tape = photo.querySelector('.tape'), border = photo.querySelector('.border');

  function camPose(b, t) {
    const sc = b.cams; let i = 0; sc.forEach((s, j) => {if (t >= s.at) i = j;});
    const cur = sc[i], prev = sc[Math.max(0, i - 1)], k = i === 0 ? 1 : easeInOut((t - cur.at) / 1.1);
    const settle = 1 + 0.07 * (1 - easeOut((t - b.from) / 1.4));
    const drift = 1 - Math.min(Math.max(0, t - cur.at), 8) * 0.004;
    return {x: lerp(prev.x, cur.x, k), y: lerp(prev.y, cur.y, k), dist: lerp(prev.dist, cur.dist, k) * settle * drift, roll: lerp(prev.roll, cur.roll, k)};
  }
  function placeCamera(p) {
    const d = D * p.dist; cam.position.set(p.x + Math.sin(YAW) * d, p.y - Math.sin(TILT) * d, Math.cos(TILT) * Math.cos(YAW) * d);
    cam.up.set(Math.sin(THREE.MathUtils.degToRad(p.roll)), Math.cos(THREE.MathUtils.degToRad(p.roll)), 0); cam.lookAt(p.x, p.y, 0); cam.updateMatrixWorld();
    key.position.set(p.x - 10, p.y + 11, 8.5); key.target.position.set(p.x, p.y, 0); key.target.updateMatrixWorld();
    rim.position.set(p.x + 6, p.y - 4, 6);
  }

  // ---------- legendas DOM ----------
  const meas = document.createElement('canvas').getContext('2d'); meas.font = '700 76px ArialLocal';
  let curGroup = -1, spans = [];
  function captions(t) {
    const gi = legendas.findIndex((g, i) => t >= g.start - 0.05 && t < Math.max(g.end + 0.25, 0) && (!legendas[i + 1] || t < legendas[i + 1].start - 0.05));
    if (gi !== curGroup) {
      captionsEl.replaceChildren(); spans = []; curGroup = gi;
      if (gi >= 0) legendas[gi].words.forEach((w) => {const s = document.createElement('span'); s.textContent = w.text; const pad = Math.max(10, meas.measureText(w.text).width * 0.07); s.style.margin = `0 ${pad}px`; captionsEl.append(s); spans.push(s);});
    }
    if (gi < 0) return;
    const ws = legendas[gi].words;
    ws.forEach((w, i) => {
      const off = i + 1 < ws.length ? ws[i + 1].start : Math.max(w.end, legendas[gi].end);
      const active = t >= w.start && t < off;
      const up = clamp((t - w.start) / 0.08), down = clamp((off - t) / 0.08);
      spans[i].style.color = active ? '#FFE368' : '#ffffff';
      spans[i].style.transform = `scale(${active ? 1 + 0.12 * Math.min(easeOut(up), easeOut(down)) : 1})`;
    });
  }

  // ---------- inserts: imagens editoriais em tela cheia (câmera 2D, acentos vetoriais) ----------
  // Imagem opaca 1080×1920 como cutaway: entra em corte seco com a câmera já em movimento,
  // segura ≥ 8 quadros e sai com 'flash' (desfoca e estoura em branco) ou 'push' (acelera para dentro).
  const SVG = 'http://www.w3.org/2000/svg', EXIT = 0.43, HOLD = 0.3;
  const svgEl = (tag, attrs, parent) => {const e = document.createElementNS(SVG, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent?.append(e); return e;};
  const inserts = INSERTS.map((ins) => {
    const root = document.createElement('div'); root.className = 'insert'; root.style.display = 'none';
    const cam = document.createElement('div'); cam.className = 'insert-cam'; root.append(cam);
    const img = document.createElement('img'); img.src = ins.imagem; img.alt = ''; cam.append(img);
    const svg = svgEl('svg', {viewBox: '0 0 1080 1920', width: 1080, height: 1920}, cam);
    const defs = svgEl('defs', {}, svg);
    const flash = document.createElement('div'); flash.className = 'insert-flash'; root.append(flash);
    const acc = (ins.acentos ?? []).map((a, i) => {
      const col = colorOf(a.cor ?? 'dourado');
      if (a.tipo === 'caminho') {
        const d = a.pontos.map(([x, y], j) => `${j ? 'L' : 'M'}${x} ${y}`).join(' ');
        const glow = svgEl('path', {d, fill: 'none', stroke: col, 'stroke-width': (a.largura ?? 7) * 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.18, pathLength: 1, 'stroke-dasharray': '1 1'}, svg);
        const line = svgEl('path', {d, fill: 'none', stroke: col, 'stroke-width': a.largura ?? 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': '1 1'}, svg);
        return (t) => {const k = easeInOut((t - a.at) / (a.dur ?? 1)); [glow, line].forEach((e) => e.setAttribute('stroke-dashoffset', String(1 - k)));};
      }
      if (a.tipo === 'brilho') {
        const id = `ins-${Math.round(ins.from * 1000)}-${i}`;
        const grad = svgEl('radialGradient', {id}, defs); svgEl('stop', {offset: '0', 'stop-color': col, 'stop-opacity': '0.75'}, grad); svgEl('stop', {offset: '1', 'stop-color': col, 'stop-opacity': '0'}, grad);
        const c = svgEl('circle', {cx: a.x, cy: a.y, r: a.r ?? 180, fill: `url(#${id})`, style: 'mix-blend-mode:screen'}, svg);
        return (t) => {const age = t - a.at; c.setAttribute('opacity', String(age < 0 ? 0 : (a.manter ? easeOut(age / 0.5) : Math.min(easeOut(age / 0.35), 1 - easeInOut((age - 0.6) / 0.7))) * (a.intensidade ?? 0.8)));};
      }
      if (a.tipo === 'pulso') {
        const rings = a.pontos.map(([x, y]) => svgEl('circle', {cx: x, cy: y, r: 10, fill: 'none', stroke: col, 'stroke-width': 6}, svg));
        return (t) => {const age = t - a.at, k = clamp(age / 0.9); rings.forEach((r) => {r.setAttribute('r', String(20 + (a.r ?? 120) * easeOut(k))); r.setAttribute('opacity', String(age < 0 ? 0 : (1 - k) * 0.9));});};
      }
      throw new Error(`Acento desconhecido: ${a.tipo}`);
    });
    insertsHost.append(root);
    return {ins, root, cam, img, flash, acc};
  });
  await Promise.all(inserts.map((it) => it.img.decode()));
  function renderInserts(t) {
    for (const it of inserts) {
      const {ins} = it, on = t >= ins.from && t < ins.to;
      it.root.style.display = on ? 'block' : 'none';
      if (!on) continue;
      const moveEnd = ins.to - EXIT - HOLD, k = 1 - Math.pow(1 - clamp((t - ins.from) / (moveEnd - ins.from)), 2.2); // já em voo no 1º quadro
      const a = ins.camera.de, b = ins.camera.para, s0 = lerp(a.escala, b.escala, k);
      const fx = lerp(a.x, b.x, k), fy = lerp(a.y, b.y, k);
      const e = Math.pow(clamp((t - (ins.to - EXIT)) / EXIT), 2.4), push = ins.saida === 'push';
      const s = s0 * (push ? 1 + 0.16 * e : 1);
      const tx = clamp(W / 2 - fx * s, W - W * s, 0), ty = clamp(H / 2 - fy * s, H - H * s, 0);
      it.cam.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
      const blur = push ? 6 * e : 22 * e;
      it.cam.style.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : 'none';
      it.flash.style.opacity = String(push ? 0 : Math.min(0.92, e));
      it.acc.forEach((f) => f(t));
    }
  }

  // ---------- quadro ----------
  function renderAt(local) {
    const t = local + range.start;
    // Toda animação é função pura do tempo: idade negativa devolve o estado inicial (busca para trás).
    anims.forEach((a) => a.fn(t - a.time, t));

    const b = BLOCOS.find((x) => t >= x.from && t < x.to);
    let k = 0;
    if (b) {
      const out = b.out ?? OUT;
      const kin = b.corteSeco ? 1 : easeInOut((t - b.from) / IN), kout = b.semVolta ? 1 : 1 - easeInOut((t - (b.to - out)) / out);
      k = b.corte ? 0 : Math.min(kin, kout);
      placeCamera(camPose(b, t));
      Object.entries(blockGroups).forEach(([id, g]) => {g.visible = id === b.id;});
    }
    // recorte da fala no momento (ou nas bordas do bloco, para a transição)
    const plano = b ? planoAt(t < (b.from + b.to) / 2 ? Math.max(0, b.from - 0.001) : b.to + 0.001) : planoAt(t);
    const crop = cropRect(plano);
    let quad = screenQuad, src = crop;
    if (b && k > 0) {
      const p = b.saidaFoto ? {...b.photo, y: b.photo.y + easeInOut((t - b.saidaFoto) / 0.6) * 10} : b.photo, hgt = p.w * SRC_H / SRC_W, r = THREE.MathUtils.degToRad(p.rot), z = 0.125;
      const corner = (u, v) => {const x = (u - 0.5) * p.w, y = (0.5 - v) * hgt; return project(p.x + x * Math.cos(r) - y * Math.sin(r), p.y + x * Math.sin(r) + y * Math.cos(r), z);};
      const target = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
      quad = screenQuad.map((q, i) => [lerp(q[0], target[i][0], k), lerp(q[1], target[i][1], k)]);
      src = crop.map((v, i) => lerp(v, fullRect[i], k));
      const bw = p.w * 1.07, bh = hgt + p.w * 0.07;
      photoFrame.scale.set(bw, bh, 1); photoFrame.position.set(p.x, p.y, 0.06); photoFrame.rotation.set(0, 0, r); photoFrame.visible = k > 0.72;
    } else photoFrame.visible = false;
    const [sx, sy, sw, sh] = src;
    photo.style.width = `${sw}px`; photo.style.height = `${sh}px`;
    photo.style.transform = homography(sw, sh, quad);
    clipBox.style.width = `${sw}px`; clipBox.style.height = `${sh}px`;
    video.style.transform = `translate(${-sx}px,${-sy}px)`;
    border.style.opacity = String(clamp((k - 0.15) / 0.5)); border.style.inset = `${-sw * 0.035}px`;
    tape.style.opacity = String(clamp((k - 0.85) / 0.15) * 0.92); tape.style.width = `${sw * 0.3}px`; tape.style.height = `${sw * 0.065}px`; tape.style.left = `${sw * 0.35}px`; tape.style.top = `${-sw * 0.06}px`;
    // Transição 'corte': a fala termina inteira em tela cheia e se dissolve no encerramento.
    const live = b?.corte ? 1 - clamp((t - b.from) / b.fade) : 1;
    photo.style.opacity = String(live);
    gradient.style.opacity = String((1 - k) * live);

    backHost.style.visibility = b ? 'visible' : 'hidden';
    if (b) back.render(backScene, cam);

    // cards
    let anyCard = false;
    cards.forEach((c) => {
      const s = c.spec, on = t >= s.from && t < s.to; c.root.visible = on; if (!on) return; anyCard = true;
      const age = t - s.from, ex = easeInOut((t - (s.to - 0.42)) / 0.42), sp = spring(age);
      const wy = (H / 2 - s.y) / 100;
      c.root.position.set((1 - sp) * 7.5 - ex * 6.5, wy + Math.sin(age * 1.7) * 0.03, 2.0 + (1 - clamp(age / 0.5)) * 1.2);
      c.root.rotation.set(-0.12, -0.2 + (1 - sp) * -0.75 + ex * 0.55, -0.03);
      c.root.scale.setScalar(lerp(0.86, 1, easeOut(age / 0.5)));
      c.body.rotation.y = s.vira ? Math.PI * easeInOut((t - s.vira) / 0.7) : 0;
      const op = clamp(age / 0.18) * (1 - ex);
      c.mats.forEach((m) => {m.opacity = c.baseOpacity.get(m) * op;});
    });
    frontHost.style.visibility = anyCard ? 'visible' : 'hidden';
    if (anyCard) front.render(frontScene, fcam);

    renderInserts(t);
    captions(t);
  }
  return {renderAt, scene: backScene, frontScene, cam};
}
