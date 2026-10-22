// Elementos 3D da Interface Explicativa (Three.js 0.186), compartilhados pela
// composição HyperFrames e pela composição Remotion "InterfaceElemento3D".
// Unidade: 1 = 100 px no plano z = 0. Tudo é construído em código, sem assets.
import * as THREE from './three.module.js';

export {THREE};
export const PALETA_PADRAO = {acento: '#6E29FF', acento2: '#9764FD', destaqueClaro: '#CDB8FF', lavanda: '#DECEFD', claro: '#FFFFFF', escuro: '#171717', tinta: '#1B1530', luz: '#6D40CC', faixa: '#1F2FB8'};
export const NOMES_ICONES = ['selo', 'caixa', 'pular', 'lupa', 'raio', 'alvo', 'livro', 'grafico', 'relogio', 'estrela'];

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const easeInOut = (x) => {x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;};
export const spring = (s) => s <= 0 ? 0 : 1 - Math.exp(-6.5 * s) * Math.cos(8.5 * s);

export function criarKit(paleta = {}) {
  const P = {...PALETA_PADRAO, ...paleta};
  const mats = {
    acento: new THREE.MeshPhysicalMaterial({color: P.acento, roughness: 0.26, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.18}),
    acento2: new THREE.MeshPhysicalMaterial({color: P.acento2, roughness: 0.3, metalness: 0.05, clearcoat: 0.7}),
    branco: new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.4}),
    lavanda: new THREE.MeshPhysicalMaterial({color: P.lavanda, roughness: 0.5, clearcoat: 0.3}),
    tinta: new THREE.MeshStandardMaterial({color: P.tinta, roughness: 0.6}),
    vidro: new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.08, transmission: 0.6, thickness: 0.4, transparent: true, opacity: 0.85}),
  };

  // ---------- geometria ----------
  const rr = (w, h, r) => {const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s;};
  const extrude = (shape, depth, bevel = 0.03) => {const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24}); g.translate(0, 0, -depth / 2); return g;};
  const mesh = (geo, mat, parent) => {const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m;};
  const poly = (pts) => {const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s;};
  const traco = (pts, w) => {
    // contorno grosso de uma polilinha (para o check e os ponteiros)
    const left = [], right = [];
    pts.forEach((p, i) => {const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; left.push([p[0] - dy / l * w / 2, p[1] + dx / l * w / 2]); right.push([p[0] + dy / l * w / 2, p[1] - dx / l * w / 2]);});
    return poly([...left, ...right.reverse()]);
  };

  // ---------- ícones (≈1 unidade) ----------
  const ICONES = {
    selo() {const g = new THREE.Group(); const hex = poly([...Array(6)].map((_, i) => {const a = Math.PI / 2 + i * Math.PI / 3; return [Math.cos(a) * 0.5, Math.sin(a) * 0.5];}));
      mesh(extrude(hex, 0.2, 0.05), mats.acento, g); const ck = mesh(extrude(traco([[-0.2, 0.01], [-0.05, -0.15], [0.22, 0.14]], 0.1), 0.08, 0.02), mats.branco, g); ck.position.z = 0.15; return g;},
    caixa() {const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.78, 0.66, 0.66), mats.acento, g).rotation.set(0.35, -0.6, 0);
      const fita = mesh(new THREE.BoxGeometry(0.8, 0.12, 0.68), mats.lavanda, g); fita.rotation.set(0.35, -0.6, 0); fita.position.y = 0.03; return g;},
    pular() {const g = new THREE.Group(); mesh(extrude(poly([[-0.42, 0.42], [0.2, 0], [-0.42, -0.42]]), 0.2, 0.04), mats.acento, g); mesh(extrude(rr(0.16, 0.84, 0.05), 0.2, 0.03), mats.acento2, g).position.x = 0.36; return g;},
    lupa() {const g = new THREE.Group(); mesh(new THREE.TorusGeometry(0.3, 0.08, 20, 48), mats.acento, g).position.set(-0.1, 0.1, 0); mesh(new THREE.CircleGeometry(0.28, 40), mats.vidro, g).position.set(-0.1, 0.1, 0);
      const cabo = mesh(new THREE.CapsuleGeometry(0.075, 0.38, 8, 16), mats.acento2, g); cabo.position.set(0.27, -0.27, 0); cabo.rotation.z = Math.PI / 4; return g;},
    raio() {const g = new THREE.Group(); mesh(extrude(poly([[0.1, 0.5], [-0.34, -0.05], [-0.04, -0.05], [-0.14, -0.5], [0.34, 0.08], [0.04, 0.08]]), 0.2, 0.04), mats.acento, g); return g;},
    alvo() {const g = new THREE.Group(); [0.44, 0.27].forEach((r, i) => mesh(new THREE.TorusGeometry(r, 0.06, 16, 60), i ? mats.acento2 : mats.acento, g)); mesh(new THREE.SphereGeometry(0.1, 24, 16), mats.acento, g); return g;},
    livro() {const g = new THREE.Group(); for (const s of [-1, 1]) {const f = new THREE.Group(); f.position.x = s * 0.23; f.rotation.y = s * -0.5; g.add(f); mesh(new THREE.BoxGeometry(0.46, 0.66, 0.06), s < 0 ? mats.acento : mats.acento2, f); const pg = mesh(new THREE.BoxGeometry(0.34, 0.52, 0.06), mats.lavanda, f); pg.position.z = 0.05;} return g;},
    grafico() {const g = new THREE.Group(); [[-0.3, 0.36, mats.acento2], [0, 0.6, mats.acento], [0.3, 0.9, mats.acento]].forEach(([x, h, m]) => {mesh(extrude(rr(0.2, h, 0.06), 0.2, 0.03), m, g).position.set(x, -0.45 + h / 2, 0);}); return g;},
    relogio() {const g = new THREE.Group(); const c = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 48), mats.acento, g); c.rotation.x = Math.PI / 2;
      const face = mesh(new THREE.CircleGeometry(0.38, 48), mats.branco, g); face.position.z = 0.1; mesh(extrude(traco([[0, 0], [0, 0.26]], 0.06), 0.04, 0.01), mats.tinta, g).position.z = 0.13; mesh(extrude(traco([[0, 0], [0.18, -0.1]], 0.06), 0.04, 0.01), mats.tinta, g).position.z = 0.14; return g;},
    estrela() {const g = new THREE.Group(); mesh(extrude(poly([...Array(10)].map((_, i) => {const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.22 : 0.5; return [Math.cos(a) * r, Math.sin(a) * r];})), 0.2, 0.05), mats.acento, g); return g;},
  };
  const icone = (nome) => (ICONES[nome] ?? ICONES.selo)();

  // ---------- cartão com espessura ----------
  function cartao({w, h, r = 0.34, espessura = 0.16, mat = mats.branco} = {}) {
    const g = new THREE.Group(); mesh(extrude(rr(w, h, r), espessura, 0.04), mat, g); g.userData.frente = espessura / 2 + 0.045; return g;
  }
  // Moeda com iniciais (avatar do perfil).
  function moeda(texto, raio = 0.58) {
    const g = new THREE.Group(); const c = mesh(new THREE.CylinderGeometry(raio, raio, 0.16, 64), mats.acento, g); c.rotation.x = Math.PI / 2;
    const t = textoPlano(texto, {px: 46, peso: 700, cor: '#ffffff', larguraPx: raio * 180}); t.position.z = 0.09; g.add(t); return g;
  }

  // ---------- texto em textura (fonte IEText carregada pela página) ----------
  // "*x*" vira destaque em degradê. Quebra em linhas por larguraPx (px do vídeo).
  function textoPlano(texto, {px = 56, peso = 500, cor = P.tinta, larguraPx = 800, alinhar = 'center', entrelinha = 1.2, familia = 'IEText', destaque = [P.acento, P.acento2], escalaDestaque = 1.12} = {}) {
    const S = 2.2; // supersample
    const c = document.createElement('canvas'), g = c.getContext('2d');
    const fonte = (d) => `${d ? 700 : peso} ${px * S * (d ? escalaDestaque : 1)}px ${familia}`;
    const tokens = []; String(texto).split(/(\*[^*]+\*)/).filter(Boolean).forEach((parte) => {const d = parte.startsWith('*') && parte.endsWith('*'); const colado = !d && tokens.length && /^\S/.test(parte); (d ? parte.slice(1, -1) : parte).split(/\s+/).filter(Boolean).forEach((w, i) => tokens.push({w, d, colado: colado && i === 0}));});
    const linhas = []; let atual = [], larg = 0;
    const medir = (t) => {g.font = fonte(t.d); return g.measureText(t.w).width;};
    g.font = fonte(false); const esp = g.measureText(' ').width;
    for (const t of tokens) {const m = medir(t); if (atual.length && !t.colado && larg + esp + m > larguraPx * S) {linhas.push({ts: atual, w: larg}); atual = []; larg = 0;} atual.push({...t, m}); larg += (atual.length > 1 && !t.colado ? esp : 0) + m;}
    if (atual.length) linhas.push({ts: atual, w: larg});
    const lh = px * S * entrelinha * (tokens.some((t) => t.d) ? escalaDestaque : 1);
    c.width = Math.ceil(larguraPx * S); c.height = Math.ceil(lh * linhas.length + px * S * 0.4);
    g.textBaseline = 'middle';
    linhas.forEach((l, i) => {
      let x = alinhar === 'left' ? 0 : (c.width - l.w) / 2; const y = lh * (i + 0.5) + px * S * 0.2;
      for (const [ti, t] of l.ts.entries()) {if (t.colado && ti) x -= esp; g.font = fonte(t.d); if (t.d) {const gr = g.createLinearGradient(x, 0, x + t.m, 0); gr.addColorStop(0, destaque[0]); gr.addColorStop(1, destaque[1]); g.fillStyle = gr;} else g.fillStyle = cor; g.fillText(t.w, x, y); x += t.m + esp;}
    });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(c.width / S / 100, c.height / S / 100), new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false}));
    m.userData.palavras = tokens.length; m.userData.larguraPx = c.width / S; m.renderOrder = 3; return m;
  }

  // ---------- luz e ambiente ----------
  function iluminar(scene, renderer, {escuro = false} = {}) {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({color: escuro ? 0x14101f : 0xeeeaf8, side: THREE.BackSide})));
    const painel = (color, k, pos, size) => {const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide})); m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);};
    painel('#ffffff', 4, [-6, 9, 8], [10, 6]); painel(P.acento2, 2.2, [9, -2, 5], [4, 10]); painel('#ffffff', 1.5, [0, 0, 15], [14, 8]);
    scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
    scene.add(new THREE.HemisphereLight('#ffffff', escuro ? '#1a1030' : '#d9d0f2', escuro ? 0.7 : 1.1));
    const key = new THREE.DirectionalLight('#ffffff', escuro ? 2.2 : 2.6); key.position.set(-5, 8, 12); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {left: -9, right: 9, top: 12, bottom: -12, near: 1, far: 50}); key.shadow.radius = 6; key.shadow.bias = -0.0004; scene.add(key);
    const rim = new THREE.PointLight(P.acento2, escuro ? 30 : 12, 18, 1.6); rim.position.set(5, -4, 6); scene.add(rim);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.ShadowMaterial({opacity: escuro ? 0.6 : 0.16})); sombra.receiveShadow = true; sombra.position.z = -0.6; scene.add(sombra);
    return {key, rim, sombra};
  }

  function renderizador(canvas, w, h) {
    const r = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: true});
    r.setSize(w, h, false); r.setPixelRatio(1); r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  }

  return {P, mats, rr, extrude, mesh, poly, traco, icone, cartao, moeda, textoPlano, iluminar, renderizador};
}

// Câmera em que 1 unidade = 100 px no plano z = 0 (quadro W×H).
export function cameraPlana(W, H, fov = 30) {
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400);
  cam.userData.D = (H / 200) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  cam.position.set(0, 0, cam.userData.D); cam.lookAt(0, 0, 0); return cam;
}

// Vitrine de um ou mais elementos (usada pela composição Remotion).
export function criarVitrine({canvas, W, H, elementos, fundo = 'claro', paleta, titulo}) {
  const kit = criarKit(paleta), r = kit.renderizador(canvas, W, H);
  const scene = new THREE.Scene(), cam = cameraPlana(W, H);
  scene.background = new THREE.Color(fundo === 'escuro' ? kit.P.escuro : fundo === 'lavanda' ? kit.P.lavanda : kit.P.claro);
  kit.iluminar(scene, r, {escuro: fundo === 'escuro'});
  const n = elementos.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const cel = Math.min(W / cols, (H - (titulo ? 260 : 0)) / rows) / 100, escala = cel * 0.52;
  const itens = elementos.map((nome, i) => {
    const g = kit.icone(nome); g.scale.setScalar(escala); const c = i % cols, l = Math.floor(i / cols);
    g.position.set((c - (cols - 1) / 2) * cel, ((rows - 1) / 2 - l) * cel - (titulo ? 0.9 : 0), 0); scene.add(g);
    const rot = kit.textoPlano(nome, {px: Math.max(26, 34 * escala / 1.6), cor: fundo === 'escuro' ? '#ffffff' : kit.P.tinta, larguraPx: cel * 90}); rot.position.set(g.position.x, g.position.y - escala * 0.78, 0.2); scene.add(rot);
    return {g, rot, i};
  });
  const cab = titulo ? kit.textoPlano(titulo, {px: 72, peso: 700, cor: fundo === 'escuro' ? '#ffffff' : kit.P.tinta, larguraPx: W * 0.85}) : null;
  if (cab) {cab.position.set(0, H / 200 - 1.6, 0.2); scene.add(cab);}
  function renderAt(t) {
    itens.forEach(({g, rot, i}) => {
      const a = t - 0.15 - i * 0.12, s = spring(a);
      g.scale.setScalar(escala * clamp(s, 0, 1.3)); g.rotation.set(0.22 + Math.sin(t * 1.1 + i) * 0.08, -0.35 + Math.sin(a * 0.9) * 0.4 + (1 - clamp(s)) * 2.4, Math.sin(t * 0.8 + i) * 0.05);
      g.position.z = Math.sin(t * 1.6 + i) * 0.15; rot.material.opacity = easeOut((a - 0.3) / 0.4);
    });
    if (cab) cab.material.opacity = easeOut(t / 0.4);
    r.render(scene, cam);
  }
  return {renderAt, kit};
}
