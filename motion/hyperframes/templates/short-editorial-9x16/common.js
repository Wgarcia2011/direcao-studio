// Template "short editorial 9:16" para HyperFrames: fundo, legenda palavra a palavra,
// entrada com desfoque e recorte por plano. Deterministico: nada de valores aleatorios.
window.ED = {
  css(fonts) {
    const face = (n, src, extra) => src ? `@font-face{font-family:${n};src:url('${src}');${extra}}` : '';
    return face('EdSerif', fonts.serif, 'font-style:italic;font-weight:700') + face('EdSans', fonts.sans, 'font-weight:700') + face('EdLabel', fonts.label, 'font-weight:700') + `
  *{box-sizing:border-box}
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f3eee4}
  .serif{font-family:EdSerif,Georgia,serif;font-style:italic;font-weight:700}
  .sans{font-family:EdSans,Arial,sans-serif;font-weight:700}
  .paper{position:absolute;inset:0;background:#f3eee4}
  .vignette{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 40%,transparent 55%,#00000022 100%)}
  .label{position:absolute;left:70px;top:120px;display:flex;align-items:center;gap:16px;font:700 28px EdLabel,Arial,sans-serif;letter-spacing:4px;color:#0a1150;z-index:6}
  .label i{width:16px;height:16px;border-radius:8px;background:#00b3a0;display:block}
  .vcard{position:absolute;overflow:hidden;box-shadow:0 30px 70px #1415163a,0 6px 16px #14151626;background:#141516}
  .vcard video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .caps{position:absolute;left:60px;right:60px;top:1640px;text-align:center;font:700 66px EdSans,Arial,sans-serif;letter-spacing:-1px;z-index:7}
  .caps .chunk{position:absolute;left:0;right:0;opacity:0}
  .caps span{display:inline-block;margin:0 14px;opacity:.28;color:var(--cw,#7a7469)}
  .caps span.k{color:var(--ck,#0a1150)}
  .wd{display:inline-block}`;
  },
  fit(text, base, max, ratio) { return Math.min(base, Math.floor(max / Math.max(1, text.length * (ratio || .58)))); },
  setup(fonts) { const s = document.createElement('style'); s.textContent = this.css(fonts); document.head.appendChild(s); },
  arcs() {
    return `<svg width="1080" height="1920" style="position:absolute;inset:0">
      <circle class="arc1" cx="980" cy="210" r="260" fill="none" stroke="#d8d0c2" stroke-width="3" stroke-dasharray="10 16" style="transform-origin:980px 210px"/>
      <circle class="arc2" cx="90" cy="1650" r="330" fill="none" stroke="#d8d0c2" stroke-width="3" stroke-dasharray="4 14" style="transform-origin:90px 1650px"/>
      <circle class="arc3" cx="90" cy="1650" r="250" fill="none" stroke="#00b3a0" stroke-opacity=".35" stroke-width="2" stroke-dasharray="60 30" style="transform-origin:90px 1650px"/></svg>`;
  },
  spinArcs(tl, dur) {
    tl.to('.arc1', { rotation: dur * 10.5, duration: dur, ease: 'none' }, 0);
    tl.to('.arc2', { rotation: -dur * 7.5, duration: dur, ease: 'none' }, 0);
    tl.to('.arc3', { rotation: dur * 5.4, duration: dur, ease: 'none' }, 0);
  },
  // Texto com uma palavra/expressao por elemento, cada uma entrando no seu tempo.
  cues(el, list, tl, sep) {
    list.forEach((c, i) => { const s = document.createElement('span'); s.className = 'wd'; s.textContent = c.t; el.appendChild(s);
      if (i < list.length - 1) el.appendChild(document.createTextNode(sep || ' ')); this.blurIn(tl, s, c.at); });
  },
  blurIn(tl, target, at) {
    tl.fromTo(target, { opacity: 0, y: 34, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .38, ease: 'expo.out' }, Math.max(0, at - .04));
  },
  captions(tl, el, words) {
    const chunks = []; let cur = [];
    for (const w of words) {
      if (cur.length && (cur.length >= 3 || cur.map(x => x.t).join(' ').length + w.t.length > 20)) { chunks.push(cur); cur = []; }
      cur.push(w);
    }
    if (cur.length) chunks.push(cur);
    chunks.forEach((c, n) => {
      const d = document.createElement('div'); d.className = 'chunk';
      c.forEach(w => { const s = document.createElement('span'); s.textContent = w.t; if (w.k) s.className = 'k'; d.appendChild(s);
        tl.to(s, { opacity: 1, scale: 1.08, duration: .12 }, Math.max(0, w.s - .03)); tl.to(s, { scale: 1, duration: .15 }, w.e + .05); });
      el.appendChild(d);
      tl.set(d, { opacity: 1 }, Math.max(0, c[0].s - .05));
      if (n < chunks.length - 1) tl.set(d, { opacity: 0 }, chunks[n + 1][0].s - .05);
    });
  },
  // Recorte horizontal (object-position %) que centraliza a pessoa de cada plano.
  focus(tl, video, shots, size, w, h) {
    const [sw, sh] = size, cropW = Math.min(sw, sh * w / h);
    const pos = x => sw - cropW < 1 ? 50 : Math.max(0, Math.min(100, (x * sw - cropW / 2) / (sw - cropW) * 100));
    shots.forEach(s => tl.set(video, { objectPosition: pos(s.x).toFixed(2) + '% 50%' }, s.at));
  }
};
