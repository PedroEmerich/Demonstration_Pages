/*
  Marmita realista — Quintal da Vó
  A comida é desenhada em canvas (texturas com sombreamento e ruído) e cai pedaço por pedaço
  na bandeja de alumínio, com gravidade, quique e acomodação. Quando a porção assenta, ela é
  "assada" num canvas próprio para não pesar no desenho.
  Uso: Marmita.set({ tam: "P"|"M"|"G", prot: "frango"|..., acomp: ["arroz", ...] })
*/
(() => {
  const cv = document.getElementById("cvMarmita");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const W = 400, H = 340, OY = 76;           /* área lógica; a bandeja começa em OY */
  cv.width = W * DPR; cv.height = H * DPR;
  const COMP = [
    { x: 26, y: 26, w: 200, h: 208, r: 20 },
    { x: 238, y: 26, w: 136, h: 64, r: 15 },
    { x: 238, y: 98, w: 136, h: 64, r: 15 },
    { x: 238, y: 170, w: 136, h: 64, r: 15 },
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- utilidades de sprite ---------- */
  function mk(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const x = c.getContext("2d"); x.scale(DPR, DPR); draw(x, w, h);
    c._w = w; c._h = h; return c;
  }
  function ruido(c, amt) {
    const x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const n = (Math.random() - .5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
    x.putImageData(d, 0, 0); return c;
  }
  const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  /* forma orgânica (para filés, bife etc.) */
  function blob(x, cx, cy, rx, ry, irreg, pts = 14) {
    x.beginPath();
    const off = [...Array(pts)].map(() => 1 + rnd(-irreg, irreg));
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2, k = off[i % pts];
      const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
      if (!i) x.moveTo(px, py); else { const a0 = ((i - .5) / pts) * Math.PI * 2, k0 = (off[(i - 1) % pts] + k) / 2; x.quadraticCurveTo(cx + Math.cos(a0) * rx * k0 * 1.04, cy + Math.sin(a0) * ry * k0 * 1.04, px, py); }
    }
    x.closePath();
  }

  /* ---------- sprites de cada alimento ---------- */
  const S = {};
  S.arroz = [...Array(6)].map(() => ruido(mk(9, 5, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 5); g.addColorStop(0, "#fffef9"); g.addColorStop(.55, pick(["#f3ecdc", "#efe6d2", "#f6f0e2"])); g.addColorStop(1, "#cbbf9f");
    x.fillStyle = g; x.beginPath(); x.ellipse(4.5, 2.5, 4.1, 1.9, 0, 0, 7); x.fill();
    x.fillStyle = "rgba(255,255,255,.85)"; x.beginPath(); x.ellipse(3.4, 1.7, 1.7, .55, 0, 0, 7); x.fill();
  }), 8));
  S.feijao = [...Array(6)].map(() => ruido(mk(11, 8, (x) => {
    const g = x.createRadialGradient(4, 3, .4, 5.5, 4, 6); g.addColorStop(0, "#8d5238"); g.addColorStop(.45, "#4d2617"); g.addColorStop(1, "#1f0c06");
    x.fillStyle = g; x.beginPath(); x.ellipse(5.5, 4, 4.8, 3.1, rnd(-.15, .15), 0, 7); x.fill();
    x.fillStyle = "rgba(255,225,200,.6)"; x.beginPath(); x.ellipse(3.9, 2.7, 1.7, .7, -.4, 0, 7); x.fill();
  }), 12));
  S.farofa = [...Array(10)].map((_, i) => ruido(mk(5, 5, (x) => {
    x.fillStyle = i < 7 ? pick(["#d9ae66", "#c8954d", "#e3bd7a", "#b9813f"]) : pick(["#9c3b25", "#7e2c1a", "#3f6b2a"]);
    x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 7, r = rnd(1.2, 2.3); x[k ? "lineTo" : "moveTo"](2.5 + Math.cos(a) * r, 2.5 + Math.sin(a) * r); } x.fill();
  }), 30));
  S.folha = [...Array(5)].map(() => ruido(mk(30, 20, (x) => {
    const g = x.createLinearGradient(0, 0, 30, 20); g.addColorStop(0, pick(["#9bc75a", "#a8d16a", "#7fb046"])); g.addColorStop(1, pick(["#3f7a2a", "#4d8a32", "#2f6320"]));
    x.fillStyle = g; blob(x, 15, 10, 13, 8, .22, 12); x.fill();
    x.strokeStyle = "rgba(230,255,200,.55)"; x.lineWidth = .8; x.beginPath(); x.moveTo(3, 11); x.quadraticCurveTo(15, 8, 27, 10); x.stroke();
    x.lineWidth = .5; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(7 + k * 5, 10); x.lineTo(10 + k * 5, 4); x.stroke(); }
  }), 14));
  S.tomate = [...Array(3)].map(() => ruido(mk(16, 16, (x) => {
    x.fillStyle = "#b3241a"; x.beginPath(); x.arc(8, 8, 7.4, 0, 7); x.fill();
    x.fillStyle = "#e0432f"; x.beginPath(); x.arc(8, 8, 6, 0, 7); x.fill();
    x.fillStyle = "#f07a5a"; for (let k = 0; k < 3; k++) { const a = k * 2.1; x.beginPath(); x.ellipse(8 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 2.2, 1.4, a, 0, 7); x.fill(); }
    x.fillStyle = "#f6d27a"; for (let k = 0; k < 9; k++) { const a = rnd(0, 7), r = rnd(1.5, 4); x.beginPath(); x.arc(8 + Math.cos(a) * r, 8 + Math.sin(a) * r, .55, 0, 7); x.fill(); }
    x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.ellipse(5.5, 5, 2, .9, -.6, 0, 7); x.fill();
  }), 10));
  S.cebolaRoxa = [...Array(3)].map(() => mk(14, 14, (x) => { x.strokeStyle = "#a54a7c"; x.lineWidth = 1.6; x.beginPath(); x.arc(7, 7, 5.5, 0, 7); x.stroke(); x.strokeStyle = "rgba(255,240,250,.85)"; x.lineWidth = .9; x.beginPath(); x.arc(7, 7, 4.3, 0, 7); x.stroke(); }));
  S.cenouraRalada = [...Array(4)].map(() => mk(14, 4, (x) => { const g = x.createLinearGradient(0, 0, 0, 4); g.addColorStop(0, "#ffb15c"); g.addColorStop(1, "#d8681c"); x.fillStyle = g; rr(x, 0, 1, 14, 2, 1); x.fill(); }));
  S.pure = [...Array(4)].map(() => mk(30, 30, (x) => {
    const g = x.createRadialGradient(12, 11, 2, 15, 15, 15); g.addColorStop(0, "#fff6d2"); g.addColorStop(.6, "#f1d98e"); g.addColorStop(1, "rgba(226,196,112,0)");
    x.fillStyle = g; x.beginPath(); x.arc(15, 15, 15, 0, 7); x.fill();
    x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 1.2; x.beginPath(); x.arc(14, 14, 6, 3.4, 5.6); x.stroke();
  }));
  S.manteiga = [mk(14, 12, (x) => { const g = x.createLinearGradient(0, 0, 14, 12); g.addColorStop(0, "#fff3a8"); g.addColorStop(1, "#e8c34c"); x.fillStyle = g; rr(x, 1, 1, 12, 10, 2.5); x.fill(); x.fillStyle = "rgba(255,255,255,.7)"; rr(x, 2.5, 2, 6, 2, 1); x.fill(); })];
  S.salsinha = [...Array(4)].map(() => mk(4, 4, (x) => { x.fillStyle = pick(["#2f6b25", "#3f8a2e", "#24561c"]); x.beginPath(); x.ellipse(2, 2, 1.8, 1.1, rnd(0, 3), 0, 7); x.fill(); }));
  S.frita = [...Array(6)].map(() => ruido(mk(34, 10, (x) => {
    const L = rnd(24, 33), g = x.createLinearGradient(0, 0, 0, 9); g.addColorStop(0, "#ffe08a"); g.addColorStop(.5, "#f0b444"); g.addColorStop(1, "#b9761f");
    x.fillStyle = g; rr(x, 1, 1, L, 8, 2.4); x.fill();
    const t = x.createLinearGradient(1, 0, L, 0); t.addColorStop(0, "rgba(140,70,10,.55)"); t.addColorStop(.1, "rgba(0,0,0,0)"); t.addColorStop(.9, "rgba(0,0,0,0)"); t.addColorStop(1, "rgba(140,70,10,.55)");
    x.fillStyle = t; rr(x, 1, 1, L, 8, 2.4); x.fill();
    x.fillStyle = "rgba(255,255,240,.55)"; rr(x, 3, 2.2, L - 6, 1.6, .8); x.fill();
    x.fillStyle = "rgba(140,80,20,.25)"; rr(x, 2, 6.5, L - 3, 2, 1); x.fill();
  }), 16));
  S.cenouraCubo = [...Array(3)].map(() => ruido(mk(10, 10, (x) => { const g = x.createLinearGradient(0, 0, 10, 10); g.addColorStop(0, "#ffb35a"); g.addColorStop(1, "#c55a12"); x.fillStyle = g; rr(x, 1, 1, 8, 8, 2); x.fill(); x.fillStyle = "rgba(255,255,255,.4)"; rr(x, 2, 2, 4, 1.6, .8); x.fill(); }), 12));
  S.brocolis = [...Array(3)].map(() => ruido(mk(18, 18, (x) => {
    x.strokeStyle = "#7fa95a"; x.lineWidth = 3.5; x.lineCap = "round"; x.beginPath(); x.moveTo(9, 16); x.lineTo(9, 10); x.stroke();
    for (let k = 0; k < 14; k++) { const a = rnd(0, 7), r = rnd(0, 5.5); const g = x.createRadialGradient(9 + Math.cos(a) * r - .6, 7 + Math.sin(a) * r * .8 - .6, .2, 9 + Math.cos(a) * r, 7 + Math.sin(a) * r * .8, 2.6); g.addColorStop(0, "#6fa84a"); g.addColorStop(1, "#1f4f1a"); x.fillStyle = g; x.beginPath(); x.arc(9 + Math.cos(a) * r, 7 + Math.sin(a) * r * .8, 2.6, 0, 7); x.fill(); }
  }), 14));
  S.vagem = [...Array(3)].map(() => mk(22, 5, (x) => { const g = x.createLinearGradient(0, 0, 0, 5); g.addColorStop(0, "#9ccf62"); g.addColorStop(1, "#3f7a28"); x.fillStyle = g; rr(x, 1, 1, 20, 3, 1.5); x.fill(); }));
  S.milho = [...Array(2)].map(() => mk(5, 5, (x) => { const g = x.createRadialGradient(2, 2, .2, 2.5, 2.5, 2.4); g.addColorStop(0, "#fff2a0"); g.addColorStop(1, "#e2a823"); x.fillStyle = g; x.beginPath(); x.arc(2.5, 2.5, 2.2, 0, 7); x.fill(); }));
  S.couve = [...Array(4)].map(() => mk(20, 4, (x) => { x.strokeStyle = pick(["#2e6b2a", "#3b7f33", "#24571f"]); x.lineWidth = 2.2; x.lineCap = "round"; x.beginPath(); x.moveTo(1, 2); x.quadraticCurveTo(10, rnd(0, 4), 19, 2); x.stroke(); }));
  S.cebolaDourada = [...Array(5)].map(() => mk(26, 26, (x) => {
    const r = rnd(8, 12), e = rnd(.3, .5), a0 = rnd(0, 6), a1 = a0 + rnd(1.6, 2.6);
    x.lineCap = "round"; x.strokeStyle = "rgba(205,140,62,.55)"; x.lineWidth = 1.7; x.beginPath(); x.ellipse(13, 13, r, r * e, 0, a0, a1); x.stroke();
    x.strokeStyle = "rgba(255,230,180,.5)"; x.lineWidth = .7; x.beginPath(); x.ellipse(13, 12.4, r - .6, (r - .6) * e, 0, a0 + .2, a1 - .3); x.stroke();
    x.strokeStyle = "rgba(120,60,20,.35)"; x.lineWidth = .8; x.beginPath(); x.ellipse(13, 13.8, r + .6, (r + .6) * e, 0, a0 + .3, a1 - .2); x.stroke();
  }));

  /* peças grandes */
  const file = () => ruido(mk(96, 64, (x) => {
    x.save(); blob(x, 48, 32, 44, 27, .1, 16); x.clip();
    const g = x.createRadialGradient(40, 24, 4, 48, 32, 50); g.addColorStop(0, "#f2c27a"); g.addColorStop(.5, "#d4924a"); g.addColorStop(1, "#8a4f22");
    x.fillStyle = g; x.fillRect(0, 0, 96, 64);
    x.strokeStyle = "rgba(60,28,10,.75)"; x.lineWidth = 5; x.shadowColor = "rgba(40,15,5,.8)"; x.shadowBlur = 4;
    for (let k = -2; k < 5; k++) { x.beginPath(); x.moveTo(k * 18, 64); x.lineTo(k * 18 + 40, 0); x.stroke(); }
    x.shadowBlur = 0;
    for (let k = 0; k < 18; k++) { x.fillStyle = `rgba(90,40,12,${rnd(.1, .35)})`; x.beginPath(); x.arc(rnd(0, 96), rnd(0, 64), rnd(1, 4), 0, 7); x.fill(); }
    const s = x.createLinearGradient(20, 8, 60, 40); s.addColorStop(0, "rgba(255,240,210,.35)"); s.addColorStop(1, "rgba(255,240,210,0)"); x.fillStyle = s; x.fillRect(0, 0, 96, 64);
    x.restore();
    x.strokeStyle = "rgba(80,35,10,.6)"; x.lineWidth = 1.5; blob(x, 48, 32, 44, 27, .02, 16); x.stroke();
  }), 22);
  const bife = () => ruido(mk(112, 74, (x) => {
    x.save(); blob(x, 56, 37, 52, 31, .13, 18); x.clip();
    const g = x.createRadialGradient(48, 30, 4, 56, 37, 58); g.addColorStop(0, "#a8653a"); g.addColorStop(.55, "#7a3d1d"); g.addColorStop(1, "#401b0b");
    x.fillStyle = g; x.fillRect(0, 0, 112, 74);
    for (let k = 0; k < 70; k++) { x.fillStyle = Math.random() < .6 ? `rgba(40,14,4,${rnd(.12, .35)})` : `rgba(205,130,80,${rnd(.08, .2)})`; x.beginPath(); x.ellipse(rnd(0, 112), rnd(0, 74), rnd(1.5, 6), rnd(1, 3.5), rnd(0, 3), 0, 7); x.fill(); }
    x.strokeStyle = "rgba(35,12,4,.45)"; x.lineWidth = 6; x.shadowColor = "rgba(25,8,2,.7)"; x.shadowBlur = 5;
    for (let k = -1; k < 5; k++) { x.beginPath(); x.moveTo(k * 24, 74); x.lineTo(k * 24 + 46, 0); x.stroke(); }
    x.shadowBlur = 0;
    const s = x.createLinearGradient(20, 6, 70, 50); s.addColorStop(0, "rgba(255,220,180,.32)"); s.addColorStop(.5, "rgba(255,220,180,.06)"); s.addColorStop(1, "rgba(255,220,180,0)"); x.fillStyle = s; x.fillRect(0, 0, 112, 74);
    x.restore();
    x.strokeStyle = "rgba(60,22,6,.7)"; x.lineWidth = 2; blob(x, 56, 37, 52, 31, .01, 18); x.stroke();
  }), 18);
  const linguica = () => ruido(mk(24, 24, (x) => {
    x.fillStyle = "#5a2612"; x.beginPath(); x.arc(12, 12, 11, 0, 7); x.fill();
    const g = x.createRadialGradient(10, 10, 1, 12, 12, 9); g.addColorStop(0, "#d98a6b"); g.addColorStop(.7, "#a8503a"); g.addColorStop(1, "#7a3320"); x.fillStyle = g; x.beginPath(); x.arc(12, 12, 9, 0, 7); x.fill();
    for (let k = 0; k < 10; k++) { const a = rnd(0, 7), r = rnd(0, 7); x.fillStyle = `rgba(255,235,220,${rnd(.4, .8)})`; x.beginPath(); x.arc(12 + Math.cos(a) * r, 12 + Math.sin(a) * r, rnd(.6, 1.3), 0, 7); x.fill(); }
    for (let k = 0; k < 6; k++) { x.fillStyle = "rgba(70,25,10,.5)"; x.beginPath(); x.arc(rnd(4, 20), rnd(4, 20), rnd(1.5, 3), 0, 7); x.fill(); }
    x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.ellipse(9, 8, 3, 1.2, -.6, 0, 7); x.fill();
  }), 16);
  const omelete = () => ruido(mk(150, 104, (x) => {
    x.save(); x.beginPath(); x.moveTo(8, 74); x.bezierCurveTo(6, 14, 144, 10, 142, 72); x.quadraticCurveTo(76, 92, 8, 74); x.closePath(); x.clip();
    const g = x.createRadialGradient(70, 46, 6, 76, 56, 90); g.addColorStop(0, "#ffe58a"); g.addColorStop(.6, "#f2c24a"); g.addColorStop(1, "#c98a24"); x.fillStyle = g; x.fillRect(0, 0, 150, 104);
    for (let k = 0; k < 40; k++) { const gg = x.createRadialGradient(0, 0, 0, 0, 0, 1); const px = rnd(0, 150), py = rnd(0, 104), r = rnd(2, 9); x.fillStyle = `rgba(170,98,30,${rnd(.12, .35)})`; x.beginPath(); x.ellipse(px, py, r, r * rnd(.5, 1), rnd(0, 3), 0, 7); x.fill(); }
    const dob = x.createLinearGradient(0, 60, 0, 92); dob.addColorStop(0, "rgba(150,90,20,0)"); dob.addColorStop(1, "rgba(150,90,20,.45)"); x.fillStyle = dob; x.fillRect(0, 60, 150, 40);
    const s = x.createLinearGradient(30, 10, 90, 60); s.addColorStop(0, "rgba(255,255,230,.45)"); s.addColorStop(1, "rgba(255,255,230,0)"); x.fillStyle = s; x.fillRect(0, 0, 150, 104);
    x.restore();
    x.fillStyle = "rgba(255,238,160,.95)"; x.beginPath(); x.moveTo(52, 84); x.quadraticCurveTo(60, 96, 70, 86); x.quadraticCurveTo(80, 98, 92, 85); x.closePath(); x.fill();
  }), 14);

  /* ---------- receitas: o que cai em cada compartimento ---------- */
  const amostra = (c, n) => { const out = []; let t = 0; while (out.length < n && t++ < n * 20) { const x = rnd(c.x + 3, c.x + c.w - 3), y = rnd(c.y + 3, c.y + c.h - 3); const dx = Math.max(c.x + c.r - x, 0, x - (c.x + c.w - c.r)), dy = Math.max(c.y + c.r - y, 0, y - (c.y + c.h - c.r)); if (dx * dx + dy * dy <= (c.r - 3) * (c.r - 3)) out.push([x, y]); } return out; };
  const fino = (c, sprs, dens, k, o = {}) => {
    const sMax = o.s ? o.s[1] : 1, m = Math.min(Math.max(...sprs.map((p) => Math.max(p._w, p._h))) * sMax * .42, Math.min(c.w, c.h) * .3);
    const ci = { x: c.x + m, y: c.y + m, w: c.w - 2 * m, h: c.h - 2 * m, r: Math.max(4, c.r - m * .5) };
    return amostra(ci, Math.round(c.w * c.h * dens * k)).map(([x, y]) => ({ spr: pick(sprs), tx: x, ty: y, rot: rnd(0, 6.28), s: o.s ? rnd(o.s[0], o.s[1]) : 1 }));
  };
  const BASE = {
    arroz: (x, c) => { const g = x.createRadialGradient(c.x + c.w * .45, c.y + c.h * .4, 4, c.x + c.w / 2, c.y + c.h / 2, c.w * .7); g.addColorStop(0, "#fbf6ea"); g.addColorStop(1, "#d9cdb2"); return g; },
    feijao: (x, c) => { const g = x.createRadialGradient(c.x + c.w * .4, c.y + c.h * .35, 2, c.x + c.w / 2, c.y + c.h / 2, c.w * .7); g.addColorStop(0, "#7a4430"); g.addColorStop(.6, "#4a2414"); g.addColorStop(1, "#2a110a"); return g; },
    farofa: (x, c) => { const g = x.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h); g.addColorStop(0, "#e2bb78"); g.addColorStop(1, "#b98443"); return g; },
    salada: (x, c) => { const g = x.createLinearGradient(c.x, c.y, c.x, c.y + c.h); g.addColorStop(0, "#5f9a3a"); g.addColorStop(1, "#3c6e26"); return g; },
    pure: (x, c) => { const g = x.createRadialGradient(c.x + c.w * .4, c.y + c.h * .35, 3, c.x + c.w / 2, c.y + c.h / 2, c.w * .7); g.addColorStop(0, "#fff4cc"); g.addColorStop(1, "#e7cb7d"); return g; },
    fritas: (x, c) => { const g = x.createLinearGradient(c.x, c.y, c.x, c.y + c.h); g.addColorStop(0, "rgba(214,160,70,.55)"); g.addColorStop(1, "rgba(160,110,40,.55)"); return g; },
    legumes: (x, c) => "#8a6a3a",
    frango: "molho:#c98c45", bife: "molho:#6a3417", linguica: "molho:#8a3f22", omelete: null, dia: "molho:#4a2414",
  };
  function receita(k, c, tam) {
    const f = { P: .72, M: .86, G: 1 }[tam] || .86;
    switch (k) {
      case "arroz": return fino(c, S.arroz, .2, f).concat(fino(c, S.arroz, .06, f));
      case "feijao": return fino(c, S.feijao, .085, f);
      case "farofa": return fino(c, S.farofa, .22, f);
      case "salada": return fino(c, S.folha, .016, f, { s: [1.1, 1.5] }).concat(fino(c, S.folha, .006, f, { s: [.9, 1.2] }), fino(c, S.cenouraRalada, .003, 1), fino(c, S.cebolaRoxa, .0009, 1), fino(c, S.tomate, .0006, 1, { s: [.85, 1] }));
      case "pure": return fino(c, S.pure, .012, f, { s: [1, 1.4] }).concat([{ spr: S.manteiga[0], tx: c.x + c.w * .5, ty: c.y + c.h * .45, rot: .3, s: 1.1 }], fino(c, S.salsinha, .004, 1));
      case "fritas": return fino(c, S.frita, .013, f, { s: [1.05, 1.25] });
      case "legumes": return fino(c, S.cenouraCubo, .006, f).concat(fino(c, S.brocolis, .004, f, { s: [1, 1.3] }), fino(c, S.vagem, .004, f), fino(c, S.milho, .006, f));
      case "frango": { const sz = { P: 1.38, M: 1.5, G: 1.6 }[tam]; const a = [{ spr: file(), tx: c.x + c.w * .52, ty: c.y + c.h * .28, rot: -.22, s: sz, big: 1 }, { spr: file(), tx: c.x + c.w * .48, ty: c.y + c.h * .72, rot: .2, s: sz * .96, big: 1 }]; return a.concat(fino({ ...c, x: c.x + 20, y: c.y + 20, w: c.w - 40, h: c.h - 40 }, S.salsinha, .0012, 1)); }
      case "bife": { const sz = { P: 1.5, M: 1.65, G: 1.78 }[tam]; return [{ spr: bife(), tx: c.x + c.w * .5, ty: c.y + c.h * .3, rot: .12, s: sz, big: 1 }, { spr: bife(), tx: c.x + c.w * .5, ty: c.y + c.h * .72, rot: -.18, s: sz * .9, big: 1 }].concat(fino({ ...c, x: c.x + 14, y: c.y + 14, w: c.w - 28, h: c.h - 28 }, S.cebolaDourada, .0011, 1, { s: [1.1, 1.5] })); }
      case "linguica": return amostra({ ...c, x: c.x + 22, y: c.y + 22, w: c.w - 44, h: c.h - 44, r: 10 }, { P: 20, M: 26, G: 32 }[tam]).map(([x, y]) => ({ spr: linguica(), tx: x, ty: y, rot: rnd(0, 6), s: rnd(1.6, 1.85), big: 1 })).concat(fino({ ...c, x: c.x + 20, y: c.y + 20, w: c.w - 40, h: c.h - 40 }, S.cebolaDourada, .0012, 1));
      case "omelete": return [{ spr: omelete(), tx: c.x + c.w * .5, ty: c.y + c.h * .5, rot: -1.0, s: { P: 1.3, M: 1.42, G: 1.52 }[tam], big: 1 }].concat(fino({ ...c, x: c.x + 30, y: c.y + 40, w: c.w - 60, h: c.h - 80 }, S.salsinha, .002, 1));
      case "dia": return [{ spr: bife(), tx: c.x + c.w * .5, ty: c.y + c.h * .3, rot: -.2, s: 1.55, big: 1 }].concat(fino({ ...c, x: c.x + 6, y: c.y + c.h * .55, w: c.w - 12, h: c.h * .42 }, S.couve, .02, 1), fino({ ...c, x: c.x + 6, y: c.y + c.h * .55, w: c.w - 12, h: c.h * .42 }, S.feijao, .02, 1));
      default: return [];
    }
  }

  /* ---------- bandeja de alumínio (desenhada uma vez) ---------- */
  const bandeja = mk(W, H, (x) => {
    x.save(); x.translate(0, OY);
    /* sombra na mesa */
    x.save(); x.shadowColor = "rgba(0,0,0,.55)"; x.shadowBlur = 34; x.shadowOffsetY = 18; x.fillStyle = "#777"; rr(x, 14, 18, 372, 236, 30); x.fill(); x.restore();
    /* aba externa com reflexos metálicos */
    let g = x.createLinearGradient(0, 0, W, 260); [["0", "#f4f6f7"], [".12", "#b5bcc2"], [".28", "#eef1f3"], [".42", "#a3abb2"], [".6", "#f7f9fa"], [".78", "#aeb5bb"], ["1", "#dde1e4"]].forEach(([o, c]) => g.addColorStop(+o, c));
    x.fillStyle = g; rr(x, 6, 6, 388, 248, 30); x.fill();
    /* frisos da aba */
    x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = 1.2; rr(x, 9, 9, 382, 242, 28); x.stroke();
    x.strokeStyle = "rgba(90,98,106,.35)"; x.lineWidth = 1; rr(x, 12.5, 12.5, 375, 235, 25); x.stroke();
    /* fundo da bandeja */
    g = x.createLinearGradient(14, 14, 386, 246); g.addColorStop(0, "#d9dde0"); g.addColorStop(.5, "#c4c9cd"); g.addColorStop(1, "#b2b8bd");
    x.fillStyle = g; rr(x, 14, 14, 372, 232, 24); x.fill();
    /* amassados do alumínio */
    x.globalAlpha = .18; for (let k = 0; k < 90; k++) { x.strokeStyle = Math.random() < .5 ? "#fff" : "#6d757c"; x.lineWidth = rnd(.4, 1.1); x.beginPath(); const sx = rnd(14, 386), sy = rnd(14, 246); x.moveTo(sx, sy); x.lineTo(sx + rnd(-26, 26), sy + rnd(-10, 10)); x.stroke(); }
    x.globalAlpha = 1;
    /* compartimentos rebaixados */
    COMP.forEach((c) => {
      x.save(); rr(x, c.x - 3, c.y - 3, c.w + 6, c.h + 6, c.r + 3); x.fillStyle = "rgba(255,255,255,.6)"; x.fill(); x.restore();
      const gg = x.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h); gg.addColorStop(0, "#a8afb5"); gg.addColorStop(.5, "#cdd2d6"); gg.addColorStop(1, "#e3e6e8");
      x.fillStyle = gg; rr(x, c.x, c.y, c.w, c.h, c.r); x.fill();
      x.save(); rr(x, c.x, c.y, c.w, c.h, c.r); x.clip(); x.shadowColor = "rgba(40,46,52,.6)"; x.shadowBlur = 12; x.shadowOffsetX = 3; x.shadowOffsetY = 5; x.strokeStyle = "#000"; x.lineWidth = 8; rr(x, c.x - 4, c.y - 4, c.w + 8, c.h + 8, c.r + 4); x.stroke(); x.restore();
      x.globalAlpha = .14; for (let k = 0; k < 24; k++) { x.strokeStyle = Math.random() < .5 ? "#fff" : "#59626a"; x.lineWidth = .6; x.beginPath(); const sx = rnd(c.x, c.x + c.w), sy = rnd(c.y, c.y + c.h); x.moveTo(sx, sy); x.lineTo(sx + rnd(-16, 16), sy + rnd(-6, 6)); x.stroke(); } x.globalAlpha = 1;
    });
    x.restore();
  });
  ruido(bandeja, 6);
  /* borda dos compartimentos por cima da comida, para dar profundidade */
  const bordas = mk(W, H, (x) => {
    x.translate(0, OY);
    COMP.forEach((c) => {
      x.save(); rr(x, c.x, c.y, c.w, c.h, c.r); x.clip();
      x.shadowColor = "rgba(30,20,10,.55)"; x.shadowBlur = 9; x.shadowOffsetY = 3; x.strokeStyle = "#000"; x.lineWidth = 6; rr(x, c.x - 3, c.y - 3, c.w + 6, c.h + 6, c.r + 3); x.stroke();
      x.restore();
      x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 1.2; rr(x, c.x - .5, c.y - .5, c.w + 1, c.h + 1, c.r); x.stroke();
    });
  });

  /* ---------- estado das porções ---------- */
  const slots = COMP.map((c, i) => ({ c, i, k: null, parts: [], baseA: 0, assado: null, saindo: null }));
  let tamAtual = "M";
  function encher(slot, k, atraso = 0) {
    const c = slot.c;
    slot.k = k; slot.assado = null; slot.baseA = 0; slot.calma = 0;
    if (!k) { slot.parts = []; return; }
    const lista = receita(k, c, tamAtual);
    /* os grandes caem primeiro; enfeites e grãos depois, numa chuva que vem de cima */
    lista.sort((a, b) => (b.big || 0) - (a.big || 0));
    const dur = lista.length > 200 ? 900 : 650;
    slot.parts = lista.map((p, i) => {
      const h0 = p.big ? rnd(150, 210) : rnd(60, 200);
      return { ...p, x: p.tx + rnd(-14, 14) + (p.big ? rnd(-30, 30) : 0), y: p.ty - h0 - OY * .2, vy: rnd(0, 40), vr: rnd(-4, 4), r0: p.rot + rnd(-1.2, 1.2), t0: performance.now() + atraso + (p.big ? i * (lista.filter((q) => q.big).length > 4 ? 45 : 150) : (i / lista.length) * dur + rnd(0, 120) + (lista[0].big ? 260 : 0)), st: 0, quiques: 0, sq: 1, a: 1 };
    });
    if (reduz) slot.parts.forEach((p) => { p.x = p.tx; p.y = p.ty; p.st = 2; p.r0 = p.rot; });
  }
  function esvaziar(slot) {
    if (!slot.k) return;
    const img = slot.assado || assar(slot);
    slot.saindo = { img, t0: performance.now() };
    slot.k = null; slot.parts = []; slot.assado = null; slot.baseA = 0;
  }
  function desenhaBase(x, slot, a) {
    const f = BASE[slot.k]; if (!f || a <= 0) return;
    if (typeof f === "string") {
      const cor = f.slice(6), c = slot.c; if (!slot.poca) slot.poca = [...Array(14)].map(() => rnd(.82, 1.12));
      x.save(); x.globalAlpha = a * .7; const g = x.createRadialGradient(c.x + c.w * .45, c.y + c.h * .45, 6, c.x + c.w / 2, c.y + c.h / 2, c.w * .55);
      g.addColorStop(0, cor); g.addColorStop(.75, cor + "cc"); g.addColorStop(1, cor + "00"); x.fillStyle = g;
      const P = slot.poca.map((k, i) => { const an = i / 14 * Math.PI * 2; return [c.x + c.w / 2 + Math.cos(an) * c.w * .4 * k, c.y + c.h / 2 + Math.sin(an) * c.h * .42 * k]; });
      x.filter = "blur(3px)"; x.beginPath();
      P.forEach((p, i) => { const q = P[(i + 1) % P.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (!i) { const z = P[P.length - 1]; x.moveTo((z[0] + p[0]) / 2, (z[1] + p[1]) / 2); } x.quadraticCurveTo(p[0], p[1], mx, my); });
      x.closePath(); x.fill(); x.filter = "none";
      x.globalAlpha = a * .35; x.fillStyle = "rgba(255,240,210,.6)"; x.beginPath(); x.ellipse(c.x + c.w * .38, c.y + c.h * .3, c.w * .14, c.h * .04, -.5, 0, 7); x.fill();
      x.restore(); return;
    }
    x.save(); x.globalAlpha = a; x.fillStyle = f(x, slot.c); rr(x, slot.c.x + 2, slot.c.y + 2, slot.c.w - 4, slot.c.h - 4, slot.c.r - 2); x.fill(); x.restore();
  }
  function desenhaPart(x, p, escala) {
    const w = p.spr._w * p.s, h = p.spr._h * p.s, cs = Math.cos(p.r0), sn = Math.sin(p.r0);
    x.setTransform(cs * escala, sn * escala * p.sq, -sn * escala, cs * escala * p.sq, p.x * escala, p.y * escala + OY * escala);
    x.globalAlpha = p.a;
    if (p.big && p.st) { x.save(); x.globalAlpha = .35 * p.a; x.filter = "blur(4px)"; x.drawImage(p.spr, -w / 2 + 3, -h / 2 + 5, w, h); x.restore(); }
    x.drawImage(p.spr, -w / 2, -h / 2, w, h);
  }
  function assar(slot) {
    const c = document.createElement("canvas"); c.width = W * DPR; c.height = H * DPR;
    const x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, OY * DPR);
    x.save(); rr(x, slot.c.x, slot.c.y, slot.c.w, slot.c.h, slot.c.r); x.clip();
    desenhaBase(x, slot, 1); x.restore();
    x.save(); x.beginPath(); x.rect(slot.c.x - 40, slot.c.y - 40, slot.c.w + 80, slot.c.h + 80); x.clip();
    slot.parts.forEach((p) => desenhaPart(x, p, DPR));
    x.restore(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
    return c;
  }

  /* ---------- vapor ---------- */
  const vapor = [];
  function soltaVapor() {
    const ocupados = slots.filter((s) => s.k && s.assado);
    if (!ocupados.length || vapor.length > 26) return;
    const s = pick(ocupados), c = s.c;
    vapor.push({ x: rnd(c.x + 10, c.x + c.w - 10), y: c.y + c.h * rnd(.3, .8), r: rnd(10, 22), vy: rnd(-16, -26), vx: rnd(-4, 4), a: 0, vida: 0, max: rnd(2.2, 3.6) });
  }
  const mouse = { x: -999, y: -999 };
  cv.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * W; mouse.y = (e.clientY - r.top) / r.height * H - OY; });
  cv.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });

  /* ---------- laço ---------- */
  const G = 1700;
  let ult = performance.now(), visivel = true, proxVapor = 0;
  let jaViu = false, pendente = null;
  new IntersectionObserver((es) => { visivel = es[0].isIntersecting; if (visivel && !jaViu && es[0].intersectionRatio > .35) { jaViu = true; if (pendente) { const p = pendente; pendente = null; window.Marmita.set(p); } } }, { threshold: [0, .35, .6] }).observe(cv);
  function frame(t) {
    const dt = Math.min(.033, (t - ult) / 1000); ult = t;
    requestAnimationFrame(frame);
    if (!visivel) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none";
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(bandeja, 0, 0, cv.width, cv.height);
    slots.forEach((s) => {
      /* porção antiga sendo retirada com a colher */
      if (s.saindo) {
        const k = (t - s.saindo.t0) / 380;
        if (k >= 1) s.saindo = null;
        else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - k; ctx.drawImage(s.saindo.img, 0, -k * 30 * DPR, cv.width, cv.height); ctx.globalAlpha = 1; }
      }
      if (!s.k) return;
      if (s.assado) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(s.assado, 0, 0); return; }
      let pousados = 0;
      s.parts.forEach((p) => {
        if (t < p.t0) return;
        if (p.st === 0) p.st = 1;
        if (p.st === 1) {
          p.vy += G * dt; p.y += p.vy * dt; p.r0 += p.vr * dt;
          if (p.y >= p.ty) {
            p.y = p.ty;
            if (p.quiques < (p.big ? 2 : 1) && p.vy > 160) { p.vy = -p.vy * (p.big ? .22 : .18); p.quiques++; p.sq = p.big ? .86 : .9; p.vr *= .4; p.x += rnd(-2, 2); }
            else { p.st = 2; p.vy = 0; }
          }
          p.x += (p.tx - p.x) * Math.min(1, dt * 6);
        }
        if (p.st === 2) { p.r0 += (p.rot - p.r0) * Math.min(1, dt * 10); pousados++; }
        p.sq += (1 - p.sq) * Math.min(1, dt * 12);
      });
      const fr = s.parts.length ? pousados / s.parts.length : 1;
      s.baseA += (Math.min(1, fr * 1.4) - s.baseA) * Math.min(1, dt * 6);
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, OY * DPR); rr(ctx, s.c.x, s.c.y, s.c.w, s.c.h, s.c.r); ctx.clip(); desenhaBase(ctx, s, s.baseA); ctx.restore();
      s.parts.forEach((p) => { if (p.st) desenhaPart(ctx, p, DPR); });
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      if (fr >= 1) { s.calma += dt; if (s.calma > .25) { s.baseA = 1; s.parts.forEach((p) => { p.r0 = p.rot; p.sq = 1; p.x = p.tx; }); s.assado = assar(s); } }
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bordas, 0, 0, cv.width, cv.height);
    /* vapor que se afasta do cursor */
    if (!reduz && t > proxVapor) { soltaVapor(); proxVapor = t + 140; }
    ctx.setTransform(DPR, 0, 0, DPR, 0, OY * DPR);
    for (let i = vapor.length - 1; i >= 0; i--) {
      const v = vapor[i]; v.vida += dt;
      const dx = v.x - mouse.x, dy = v.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 70) { v.vx += dx / d * 120 * dt; v.vy += dy / d * 60 * dt; }
      v.x += v.vx * dt; v.y += v.vy * dt; v.r += 7 * dt;
      const k = v.vida / v.max; v.a = Math.sin(Math.min(1, k) * Math.PI) * .09;
      if (k >= 1) { vapor.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r); g.addColorStop(0, `rgba(255,255,255,${v.a})`); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, 7); ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  requestAnimationFrame(frame);

  /* ---------- API ---------- */
  window.Marmita = {
    set({ tam, prot, acomp }) {
      if (!jaViu && !reduz) { pendente = { tam, prot, acomp: [...acomp] }; return; }
      const mudouTam = tam !== tamAtual; tamAtual = tam;
      /* mistura no compartimento grande */
      if (prot !== slots[0].k || mudouTam) { const atraso = slots[0].k ? 260 : 0; esvaziar(slots[0]); encher(slots[0], prot, atraso); }
      /* acompanhamentos mantêm o compartimento onde caíram */
      const restantes = [...acomp];
      slots.slice(1).forEach((s) => { if (s.k && !restantes.includes(s.k)) esvaziar(s); else if (s.k) restantes.splice(restantes.indexOf(s.k), 1); });
      restantes.forEach((k, i) => { const livre = slots.slice(1).find((s) => !s.k && !s.reservado); if (livre) encher(livre, k, (livre.saindo ? 260 : 0) + i * 160); });
      if (mudouTam) slots.slice(1).forEach((s) => { if (s.k) { const k = s.k; esvaziar(s); encher(s, k, 260); } });
    },
  };
})();
