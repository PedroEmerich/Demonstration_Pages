/* Aurora — maquete dos andares
   Paredes, portas, janelas e guarda-corpos saem dos retângulos dos cômodos (dados.js).
   A mobília de cada planta fica em MOVEIS. Depois de montada, a geometria parada de cada
   unidade é fundida por material, para o andar inteiro (12 apartamentos) abrir leve. */
import * as THREE from "three";

export function criarMaquete({ mat, caixa, PE, interior, E, PLANTAS, foto }) {
  const ESP = 0.12, ESPX = 0.2;
  const OUT = new Set(["varanda", "jardim", "externo"]);
  const PISO = { social: "madeira", quarto: "madeira", hall: "madeira", cozinha: "porcelanato", molhado: "porcelanato", servico: "porcelanato", varanda: "deck", jardim: "grama", externo: "deckExt", fitness: "borracha", kids: "eva" };
  const ESCALA = { madeira: 4, deck: 3, deckExt: 3.5, porcelanato: 0.9, grama: 3, borracha: 2, eva: 1.2 };
  const cache = new Map();
  const geo = (k, f) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g); } return g; };
  const cilGeo = (rt, rb, h, s = 18) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
  const esfGeo = (r) => geo(`e${r}`, () => new THREE.SphereGeometry(r, 18, 12));
  const icoGeo = (r) => geo(`i${r}`, () => new THREE.IcosahedronGeometry(r, 1));

  function construirUnidade(nomePlanta, pos, idx) {
    const planta = PLANTAS[nomePlanta], ext = planta.ext || [];
    const [px, pz, sx, sz] = pos;
    const g = new THREE.Group(); g.position.set(px, 0, pz); g.scale.set(sx, 1, sz); interior.add(g);
    const obstLocal = [], vaosLocal = [];
    let emMoveis = false;
    const solido = (u0, w0, u1, w1) => obstLocal.push([Math.min(u0, u1), Math.min(w0, w1), Math.max(u0, u1), Math.max(w0, w1), emMoveis]);
    const sombra = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
    const comodos = planta.comodos.map(([id, nome, tipo, u0, w0, u1, w1, f]) => ({ id, nome, tipo, u0, w0, u1, w1, foto: f ? foto(f) : null }));
    const porId = Object.fromEntries(comodos.map((c) => [c.id, c]));
    const par = (a, b) => (x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a);

    /* ----- pisos (clicáveis) e forros (só na visita) ----- */
    for (const c of comodos) {
      const k = PISO[c.tipo] || "madeira", w = c.u1 - c.u0, d = c.w1 - c.w0, esc = ESCALA[k] || 2;
      const pg = new THREE.PlaneGeometry(w, d), uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / esc, (uv.getY(i) * d) / esc);
      const p = new THREE.Mesh(pg, mat[k].clone());
      p.rotation.x = -Math.PI / 2;
      p.position.set((c.u0 + c.u1) / 2, c.tipo === "varanda" || c.tipo === "jardim" ? -0.03 : 0.01, (c.w0 + c.w1) / 2);
      p.receiveShadow = true;
      p.userData = { nome: c.nome, foto: c.foto, un: idx, area: Math.round(w * d), tipo: c.tipo, manter: true, temp: true };
      g.add(p); E.pisos.push(p); c.mesh = p;
      if (!OUT.has(c.tipo)) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.teto);
        t.rotation.x = Math.PI / 2; t.position.set((c.u0 + c.u1) / 2, PE + 0.03, (c.w0 + c.w1) / 2);
        t.visible = false; t.castShadow = true; t.userData.manter = true; t.userData.temp = true; g.add(t); E.tetos.push(t);
      }
    }

    /* ----- paredes geradas a partir dos cômodos ----- */
    const linhas = new Map();
    for (const c of comodos) {
      const add = (eixo, v, a, b) => { const k = `${eixo}|${v}`; if (!linhas.has(k)) linhas.set(k, []); linhas.get(k).push({ a, b, id: c.id }); };
      add("w", c.w0, c.u0, c.u1); add("w", c.w1, c.u0, c.u1); add("u", c.u0, c.w0, c.w1); add("u", c.u1, c.w0, c.w1);
    }
    // caixa ao longo de uma linha da planta
    const bx = (eixo, v, a, b, y0, y1, m, esp, s = true) => {
      const len = b - a, c = (a + b) / 2, h = y1 - y0;
      const o = eixo === "w" ? caixa(len, h, esp, m, c, y0 + h / 2, v, g) : caixa(esp, h, len, m, v, y0 + h / 2, c, g);
      return s ? sombra(o) : o;
    };
    const peca = (eixo, v, a, b, y0, y1, m = mat.parede, esp = ESP) => {
      if (b - a < 0.02) return;
      bx(eixo, v, a, b, y0, y1, m, esp);
      if (y0 === 0 && m === mat.parede) bx(eixo, v, a, b, 0, 0.08, mat.rodape, esp + 0.024, false);
      if (y1 >= PE - 0.01) bx(eixo, v, a, b, PE, PE + 0.02, mat.tampa, esp + 0.004, false).userData.tampa = true;
    };
    const solidoLinha = (eixo, v, a, b, esp = ESP) => { if (b - a > 0.02) (eixo === "w" ? solido(a, v - esp / 2, b, v + esp / 2) : solido(v - esp / 2, a, v + esp / 2, b)); };
    const parede = (eixo, v, a, b, esp = ESPX) => { peca(eixo, v, a, b, 0, PE, mat.parede, esp); solidoLinha(eixo, v, a, b, esp); };

    function porta(eixo, v, a, b, lado, larg, m = mat.porta) {
      // verga, batentes e folha fechada; a folha gira 90° para dentro do cômodo quando alguém chega perto
      const esp = m === mat.portaEnt ? ESPX : ESP, eb = esp + 0.03, fl = larg - 0.08, h = 2.1;
      peca(eixo, v, a, b, 2.12, PE, mat.parede, esp);
      bx(eixo, v, a, a + 0.05, 0, 2.14, mat.batente, eb, false); bx(eixo, v, b - 0.05, b, 0, 2.14, mat.batente, eb, false); bx(eixo, v, a, b, 2.11, 2.16, mat.batente, eb, false);
      const piv = new THREE.Group(); piv.userData.manter = true; g.add(piv);
      if (eixo === "w") { piv.position.set(a + 0.05, 0, v); sombra(caixa(fl, h, 0.04, m, fl / 2, h / 2, 0, piv)); for (const s of [-1, 1]) caixa(0.12, 0.03, 0.03, mat.inox, fl - 0.1, 1.0, s * 0.04, piv); }
      else { piv.position.set(v, 0, a + 0.05); sombra(caixa(0.04, h, fl, m, 0, h / 2, fl / 2, piv)); for (const s of [-1, 1]) caixa(0.03, 0.03, 0.12, mat.inox, s * 0.04, 1.0, fl - 0.1, piv); }
      const aberta = eixo === "w" ? (-lado * Math.PI) / 2 : (lado * Math.PI) / 2;
      const cl = eixo === "w" ? [(a + b) / 2, v] : [v, (a + b) / 2];
      E.portas.push({ piv, aberta, ang: 0, x: px + sx * cl[0], z: pz + sz * cl[1] });
      vaosLocal.push({ eixo, v, a, b, nome: m === mat.portaEnt ? "entrada" : "porta" });
    }
    function janela(eixo, v, a, b, y0, y1) {
      const len = b - a;
      peca(eixo, v, a, b, 0, y0, mat.parede, ESPX); peca(eixo, v, a, b, y1, PE, mat.parede, ESPX);
      bx(eixo, v, a, b, y0, y1, mat.vidro, 0.02, false);
      for (const yy of [y0, y1]) bx(eixo, v, a, b, yy - 0.025, yy + 0.025, mat.caixilho, 0.08, false);
      for (const p of len > 1.4 ? [a, (a + b) / 2 - 0.025, b - 0.05] : [a, b - 0.05]) bx(eixo, v, p, p + 0.05, y0, y1, mat.caixilho, 0.08, false);
      if (y0 > 0.1) bx(eixo, v, a - 0.05, b + 0.05, y0 - 0.015, y0 + 0.015, mat.peitoril, ESPX + 0.08);
    }
    function vidraca(eixo, v, a, b, aberturas = []) {
      // pele de vidro do piso ao teto; nas aberturas a folha de correr fica recolhida
      const ab = [...aberturas].sort((x, y) => x[0] - y[0]);
      const dentro = (p) => ab.some(([p0, p1]) => p > p0 + 0.03 && p < p1 - 0.03);
      let cur = a;
      for (const [p0, p1] of [...ab, [b, b]]) { if (p0 - cur > 0.02) bx(eixo, v, cur, p0, 0.03, PE - 0.03, mat.vidro, 0.02, false); solidoLinha(eixo, v, cur, p0, 0.1); cur = p1; }
      for (const yy of [0.03, PE - 0.03]) bx(eixo, v, a, b, yy - 0.03, yy + 0.03, mat.caixilho, 0.08, false);
      const n = Math.max(1, Math.round((b - a) / 1.5)), postes = new Set();
      for (let i = 0; i <= n; i++) postes.add(+(a + ((b - a) * i) / n).toFixed(3));
      for (const [p0, p1] of ab) { postes.add(+p0.toFixed(3)); postes.add(+p1.toFixed(3)); }
      for (const p of postes) if (!dentro(p)) bx(eixo, v, Math.max(a, p - 0.025), Math.min(b, p + 0.025), 0, PE, mat.caixilho, 0.08, false);
      bx(eixo, v, a, b, PE, PE + 0.02, mat.tampa, 0.1, false).userData.tampa = true;
    }
    function guarda(eixo, v, a, b) {
      bx(eixo, v, a, b, 0.02, 1.06, mat.vidro, 0.02, false);
      bx(eixo, v, a, b, 1.04, 1.1, mat.caixilho, 0.07, false);
      solidoLinha(eixo, v, a, b, 0.1);
    }
    function mureta(eixo, v, a, b) { bx(eixo, v, a, b, 0, 0.95, mat.concreto, 0.16); solidoLinha(eixo, v, a, b, 0.16); }
    function corredor(eixo, v, a, b) {
      const ent = (planta.entradas || []).filter(([e0, e1]) => e0 >= a - 1e-6 && e1 <= b + 1e-6).sort((p, q) => p[0] - q[0]);
      if (planta.vitrine) { vidraca(eixo, v, a, b, ent); for (const [e0, e1] of ent) vaosLocal.push({ eixo, v, a: e0, b: e1, nome: "entrada" }); return; }
      let cur = a;
      for (const [e0, e1] of ent) { parede(eixo, v, cur, e0); porta(eixo, v, e0, e1, 1, e1 - e0, mat.portaEnt); cur = e1; }
      parede(eixo, v, cur, b);
    }
    function externa(c, eixo, v, a, b) {
      const L = b - a, md = (a + b) / 2;
      if (c.tipo === "social" || c.tipo === "fitness" || c.tipo === "kids") { vidraca(eixo, v, a, b); return; }
      const jan = c.tipo === "quarto" ? [Math.min(L - 0.8, 2.2), 0.5, 2.3] : c.tipo === "cozinha" || c.tipo === "servico" ? [Math.min(L - 0.6, 1.6), 1.05, 2.2] : c.tipo === "molhado" ? [Math.min(L - 0.6, 0.8), 1.6, 2.15] : null;
      if (jan && jan[0] > 0.4) {
        const j0 = md - jan[0] / 2, j1 = md + jan[0] / 2;
        peca(eixo, v, a, j0, 0, PE, mat.parede, ESPX); peca(eixo, v, j1, b, 0, PE, mat.parede, ESPX);
        janela(eixo, v, j0, j1, jan[1], jan[2]);
      } else peca(eixo, v, a, b, 0, PE, mat.parede, ESPX);
      solidoLinha(eixo, v, a, b, ESPX);
    }

    for (const [k, segs] of linhas) {
      const [eixo, vs] = k.split("|"); const v = +vs;
      const borda = Math.abs(v) < 1e-6 ? eixo + "0" : Math.abs(v - (eixo === "w" ? planta.W : planta.U)) < 1e-6 ? eixo + "1" : null;
      const pts = [...new Set(segs.flatMap((s) => [s.a, s.b]))].sort((p, q) => p - q);
      const trechos = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], md = (a + b) / 2;
        const ids = segs.filter((s) => s.a <= md && s.b >= md).map((s) => s.id).sort();
        const chave = ids.join("+"), ult = trechos[trechos.length - 1];
        if (ult && ult.chave === chave && Math.abs(ult.b - a) < 1e-6) ult.b = b; else trechos.push({ a, b, ids, chave });
      }
      for (const t of trechos) {
        const [A, B] = t.ids.map((id) => porId[id]);
        const L = t.b - t.a, md = (t.a + t.b) / 2;
        if (t.ids.length === 2) {
          if (planta.abertos.some(par(A.id, B.id))) continue;
          const fa = OUT.has(A.tipo), fb = OUT.has(B.tipo);
          if (fa && fb) continue;                                   // sacada que continua no jardim
          const p = planta.portas.find(par(A.id, B.id));
          if (fa || fb) {                                            // caixilho de vidro para a varanda
            const dentro = fa ? B : A;
            if (p) { const lg = p[3] || 1.6, c = p[2] ?? md; vidraca(eixo, v, t.a, t.b, [[c - lg / 2, c + lg / 2]]); vaosLocal.push({ eixo, v, a: c - lg / 2, b: c + lg / 2, nome: "porta de correr" }); }
            else if (dentro.tipo === "social") { const lg = Math.min(1.8, L - 0.6); vidraca(eixo, v, t.a, t.b, [[md - lg / 2, md + lg / 2]]); }
            else vidraca(eixo, v, t.a, t.b);
            continue;
          }
          if (p) {
            const larg = p[3] || 0.8;
            const pc = THREE.MathUtils.clamp(p[2] ?? md, t.a + larg / 2 + 0.05, t.b - larg / 2 - 0.05);
            const g0 = pc - larg / 2, g1 = pc + larg / 2;
            peca(eixo, v, t.a, g0, 0, PE); solidoLinha(eixo, v, t.a, g0);
            peca(eixo, v, g1, t.b, 0, PE); solidoLinha(eixo, v, g1, t.b);
            const alvoC = porId[p[0]], centro = eixo === "w" ? (alvoC.w0 + alvoC.w1) / 2 : (alvoC.u0 + alvoC.u1) / 2;
            if (larg > 1.2) { peca(eixo, v, g0, g1, 2.12, PE); vaosLocal.push({ eixo, v, a: g0, b: g1, nome: "vão" }); }
            else porta(eixo, v, g0, g1, Math.sign(centro - v), larg);
          } else { peca(eixo, v, t.a, t.b, 0, PE); solidoLinha(eixo, v, t.a, t.b); }
          continue;
        }
        // borda da unidade
        const c = A;
        if (borda === "u1" && !ext.includes("u1")) continue;       // a vizinha levanta essa parede
        if (OUT.has(c.tipo)) {
          if (borda === "w0") continue;                              // rooftop aberto para o corredor
          if (borda === "u0") { if (c.tipo === "varanda") parede(eixo, v, t.a, t.b); else if (c.tipo === "jardim") mureta(eixo, v, t.a, t.b); continue; }
          guarda(eixo, v, t.a, t.b); continue;
        }
        if (borda === "w0") { corredor(eixo, v, t.a, t.b); continue; }
        if (borda && ext.includes(borda)) { externa(c, eixo, v, t.a, t.b); continue; }
        parede(eixo, v, t.a, t.b);
      }
    }

    /* ----- móveis (coordenadas da planta; "rot" gira o móvel e o lado -z dele encosta na parede) ----- */
    const grupoRot = (u, w, rot, pai = g) => { const q = new THREE.Group(); q.position.set(u, 0, w); q.rotation.y = rot; pai.add(q); return q; };
    const sc = (q, wd, h, dp, m, x, y, z, r = 0) => sombra(caixa(wd, h, dp, m, x, y, z, q, r));
    const cil = (rt, rb, h, m, x, y, z, pai = g, s = 18) => { const o = sombra(new THREE.Mesh(cilGeo(rt, rb, h, s), m)); o.position.set(x, y, z); pai.add(o); return o; };
    const bola = (r, m, x, y, z, pai = g) => { const o = sombra(new THREE.Mesh(esfGeo(r), m)); o.position.set(x, y, z); pai.add(o); return o; };
    const ocupaQ = (q, x0, z0, x1, z1) => {
      const c = Math.cos(q.rotation.y), s = Math.sin(q.rotation.y);
      let ua = 1e9, ub = -1e9, wa = 1e9, wb = -1e9;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
        const u = q.position.x + x * c + z * s, w = q.position.z - x * s + z * c;
        ua = Math.min(ua, u); ub = Math.max(ub, u); wa = Math.min(wa, w); wb = Math.max(wb, w);
      }
      solido(ua, wa, ub, wb);
    };
    const cadeira = (q, x, z, rot, tec = mat.tecidoEsc) => { const c = grupoRot(x, z, rot, q); sc(c, 0.44, 0.05, 0.44, tec, 0, 0.46, 0, 0.02); sc(c, 0.44, 0.42, 0.05, tec, 0, 0.7, -0.2, 0.02); for (const lx of [-1, 1]) for (const lz of [-1, 1]) sc(c, 0.03, 0.44, 0.03, mat.nogueira, lx * 0.18, 0.22, lz * 0.18); };
    const m = {
      tapete(u, w, a, b, mt) { const t = new THREE.Mesh(new THREE.PlaneGeometry(a, b), mt); t.rotation.x = -Math.PI / 2; t.position.set(u, 0.018, w); t.receiveShadow = true; g.add(t); },
      cama(u, w, larg, rot, manta, mesas = [-1, 1]) {
        const q = grupoRot(u, w, rot), comp = 2.05, dupla = larg > 1.2;
        sc(q, larg + 0.08, 0.3, comp, mat.nogueira, 0, 0.15, 0, 0.03);
        sc(q, larg, 0.22, comp - 0.06, mat.lencol, 0, 0.41, 0.02, 0.06);
        sc(q, larg + 0.04, 0.07, comp * 0.55, manta, 0, 0.53, comp * 0.2, 0.03);
        sc(q, larg + 0.06, 0.04, 0.3, mat.lencol, 0, 0.555, -comp * 0.08, 0.02);
        for (const s of dupla ? [-1, 1] : [0]) sc(q, dupla ? larg / 2 - 0.1 : larg - 0.2, 0.15, 0.42, mat.lencol, (s * larg) / 4, 0.6, -comp / 2 + 0.32, 0.06);
        if (dupla) sc(q, 0.38, 0.28, 0.12, mat.almofada, 0, 0.66, -comp / 2 + 0.55, 0.05);
        sc(q, larg + 0.3, 1.0, 0.07, mat.tecidoEsc, 0, 0.55, -comp / 2 - 0.04, 0.03);
        for (const s of mesas) {
          const x = s * (larg / 2 + 0.29);
          sc(q, 0.42, 0.5, 0.38, mat.carvalho, x, 0.25, -comp / 2 + 0.22, 0.02);
          caixa(0.05, 0.22, 0.05, mat.preto, x, 0.61, -comp / 2 + 0.2, q);
          cil(0.1, 0.13, 0.18, mat.abajur, x, 0.81, -comp / 2 + 0.2, q);
          ocupaQ(q, x - 0.21, -comp / 2 + 0.03, x + 0.21, -comp / 2 + 0.41);
        }
        ocupaQ(q, -larg / 2 - 0.04, -comp / 2 - 0.08, larg / 2 + 0.04, comp / 2);
      },
      sofa(u, w, len, rot, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, len, 0.2, 0.92, tec, 0, 0.22, 0, 0.05);
        for (const s of [-1, 1]) sc(q, 0.18, 0.58, 0.92, tec, s * (len / 2 - 0.09), 0.33, 0, 0.06);
        const n = len > 2.3 ? 3 : 2, lw = (len - 0.36) / n;
        for (let i = 0; i < n; i++) { const x = -len / 2 + 0.18 + lw * (i + 0.5); sc(q, lw - 0.02, 0.16, 0.66, tec, x, 0.4, 0.1, 0.07); sc(q, lw - 0.04, 0.42, 0.2, tec, x, 0.66, -0.33, 0.09); }
        sc(q, 0.42, 0.38, 0.13, mat.almofada, -len / 2 + 0.45, 0.66, -0.15, 0.06); sc(q, 0.4, 0.36, 0.13, mat.lencol, len / 2 - 0.45, 0.65, -0.15, 0.06);
        ocupaQ(q, -len / 2, -0.46, len / 2, 0.46);
      },
      poltrona(u, w, rot, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, 0.78, 0.18, 0.78, tec, 0, 0.32, 0, 0.06); sc(q, 0.78, 0.5, 0.16, tec, 0, 0.62, -0.31, 0.07);
        for (const s of [-1, 1]) sc(q, 0.12, 0.3, 0.7, tec, s * 0.33, 0.52, 0, 0.05);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.04, 0.24, 0.04, mat.nogueira, s * 0.32, 0.12, t * 0.32);
        ocupaQ(q, -0.4, -0.4, 0.4, 0.4);
      },
      mesaCentro(u, w, a, b) { sc(g, a, 0.05, b, mat.marmore, u, 0.38, w, 0.02); sc(g, a - 0.16, 0.33, b - 0.16, mat.nogueira, u, 0.18, w, 0.02); solido(u - a / 2, w - b / 2, u + a / 2, w + b / 2); },
      mesa(u, w, a, b, rot, nCad, tampo = mat.carvalho) {
        const q = grupoRot(u, w, rot);
        sc(q, a, 0.05, b, tampo, 0, 0.745, 0, 0.02);
        for (const s of [-1, 1]) sc(q, 0.08, 0.72, b - 0.25, mat.preto, s * (a / 2 - 0.2), 0.36, 0);
        if (nCad) {
          const porLado = Math.max(1, Math.round(Math.min(nCad, a > 2.4 ? 6 : 4) / 2));
          for (let i = 0; i < porLado; i++) for (const s of [-1, 1]) cadeira(q, -a / 2 + (i + 0.5) * (a / porLado), s * (b / 2 + 0.28), s > 0 ? Math.PI : 0);
          if (nCad > 2 * porLado) for (const s of [-1, 1]) cadeira(q, s * (a / 2 + 0.28), 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
        }
        ocupaQ(q, -a / 2 - 0.1, -b / 2 - 0.2, a / 2 + 0.1, b / 2 + 0.2);
      },
      mesaRedonda(u, w, r, n, tampo = mat.carvalho) {
        cil(r, r, 0.04, tampo, u, 0.74, w, g, 28); cil(0.035, 0.035, 0.7, mat.preto, u, 0.37, w, g, 10); cil(0.2, 0.22, 0.03, mat.preto, u, 0.015, w, g, 20);
        const q = grupoRot(u, w, 0);
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * (r + 0.32), z = Math.sin(a) * (r + 0.32); cadeira(q, x, z, Math.atan2(-Math.cos(a), -Math.sin(a))); solido(u + x - 0.22, w + z - 0.22, u + x + 0.22, w + z + 0.22); }
        solido(u - r, w - r, u + r, w + r);
      },
      tv(u, w, rot, L) { const q = grupoRot(u, w, rot); sc(q, L + 0.4, 0.42, 0.42, mat.nogueira, 0, 0.24, 0.21, 0.02); sc(q, L * 0.62, L * 0.36, 0.04, mat.tela, 0, 1.2, 0.05, 0.01); ocupaQ(q, -(L + 0.4) / 2, 0, (L + 0.4) / 2, 0.42); },
      tvParede(u, w, rot, L) { const q = grupoRot(u, w, rot); sc(q, L + 0.3, 0.06, 0.3, mat.nogueira, 0, 0.5, 0.15, 0.01); sc(q, L * 0.62, L * 0.36, 0.04, mat.tela, 0, 1.25, 0.03, 0.01); ocupaQ(q, -(L + 0.3) / 2, 0, (L + 0.3) / 2, 0.3); },
      pendente(u, w, y = 1.9) { const p = new THREE.Mesh(cilGeo(0.06, 0.22, 0.18, 24), mat.pendente); p.position.set(u, y, w); g.add(p); caixa(0.008, PE - y - 0.09, 0.008, mat.preto, u, (PE + y + 0.09) / 2, w, g); },
      luminariaChao(u, w) { sc(g, 0.3, 0.03, 0.3, mat.preto, u, 0.015, w); sc(g, 0.03, 1.45, 0.03, mat.preto, u, 0.75, w); cil(0.16, 0.2, 0.26, mat.abajur, u, 1.55, w); solido(u - 0.15, w - 0.15, u + 0.15, w + 0.15); },
      planta(u, w, s = 1) {
        cil(0.2 * s, 0.15 * s, 0.42 * s, s > 0.95 ? mat.vasoEsc : mat.vaso, u, 0.21 * s, w, g, 20);
        for (let i = 0; i < 4; i++) { const f = sombra(new THREE.Mesh(icoGeo(+((0.32 - i * 0.04) * s).toFixed(3)), i % 2 ? mat.planta2 : mat.planta)); f.position.set(u + Math.sin(i * 2.1) * 0.12 * s, (0.62 + i * 0.28) * s, w + Math.cos(i * 2.1) * 0.12 * s); g.add(f); }
        solido(u - 0.22 * s, w - 0.22 * s, u + 0.22 * s, w + 0.22 * s);
      },
      quadro(u, w, rot, k = 0, y = 1.55) { const q = grupoRot(u, w, rot); sc(q, 0.72, 0.92, 0.035, mat.preto, 0, y, 0.02); const t = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), mat.quadros[k % mat.quadros.length]); t.position.set(0, y, 0.04); q.add(t); },
      armario(u, w, prof, larg, rot) {
        const q = grupoRot(u, w, rot);
        sc(q, larg, 2.35, prof, mat.laca, 0, 1.175, 0, 0.01);
        const n = Math.max(2, Math.round(larg / 0.55));
        for (let i = 1; i < n; i++) caixa(0.008, 2.2, 0.01, mat.lacaEsc, -larg / 2 + (i * larg) / n, 1.17, prof / 2 + 0.002, q);
        for (let i = 0; i < n; i++) caixa(0.02, 0.3, 0.02, mat.inox, -larg / 2 + ((i + (i % 2 ? 0.15 : 0.85)) * larg) / n, 1.1, prof / 2 + 0.015, q);
        ocupaQ(q, -larg / 2, -prof / 2, larg / 2, prof / 2);
      },
      estante(u, w, rot, larg, alt = 1.8, cheia = true) {
        const q = grupoRot(u, w, rot);
        sc(q, larg, alt, 0.03, mat.laca, 0, alt / 2, 0.015);
        for (const s of [-1, 1]) sc(q, 0.04, alt, 0.35, mat.laca, s * (larg / 2 - 0.02), alt / 2, 0.175);
        for (let i = 0; i <= 4; i++) sc(q, larg, 0.03, 0.35, mat.laca, 0, 0.02 + (i * (alt - 0.04)) / 4, 0.175);
        const cs = [mat.vermelho, mat.amarelo, mat.azul, mat.verde, mat.nogueira, mat.lilas];
        let k = 0;
        if (cheia) for (let i = 0; i < 4; i++) for (let x = -larg / 2 + 0.2; x < larg / 2 - 0.15; x += 0.3) { if ((k * 7) % 5) sc(q, 0.22, 0.18 + (k % 3) * 0.05, 0.24, cs[k % cs.length], x, 0.04 + (i * (alt - 0.04)) / 4 + 0.12 + (k % 3) * 0.025, 0.17, 0.02); k++; }
        ocupaQ(q, -larg / 2, 0, larg / 2, 0.36);
      },
      bancada(u0, w0, u1, w1, { pia, cooktop } = {}) {
        const A = u1 - u0, B = w1 - w0, cu = (u0 + u1) / 2, cw = (w0 + w1) / 2, horiz = A >= B;
        sc(g, A - 0.04, 0.1, B - 0.06, mat.lacaEsc, cu, 0.05, cw);
        sc(g, A - 0.02, 0.76, B - 0.04, mat.laca, cu, 0.48, cw, 0.01);
        sc(g, A + 0.02, 0.04, B + 0.02, mat.granito, cu, 0.88, cw);
        if (pia !== undefined) { const [pu, pw] = horiz ? [pia, cw] : [cu, pia]; caixa(horiz ? 0.55 : 0.4, 0.02, horiz ? 0.4 : 0.55, mat.inox, pu, 0.905, pw, g); }
        if (cooktop !== undefined) { const [pu, pw] = horiz ? [cooktop, cw] : [cu, cooktop]; caixa(horiz ? 0.6 : 0.5, 0.012, horiz ? 0.5 : 0.6, mat.preto, pu, 0.905, pw, g); }
        solido(u0, w0, u1, w1);
      },
      armarioAlto(u0, w0, u1, w1) { sc(g, u1 - u0, 0.7, w1 - w0, mat.laca, (u0 + u1) / 2, 1.95, (w0 + w1) / 2, 0.01); },
      geladeira(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.7, 1.85, 0.66, mat.inox, 0, 0.925, 0, 0.03); caixa(0.02, 0.55, 0.02, mat.preto, 0.28, 1.2, 0.34, q); caixa(0.02, 0.35, 0.02, mat.preto, 0.28, 0.5, 0.34, q); caixa(0.68, 0.01, 0.01, mat.preto, 0, 0.75, 0.335, q); ocupaQ(q, -0.35, -0.33, 0.35, 0.33); },
      ilha(u, w, a, b, lado = 1) { sc(g, a, 0.88, b, mat.nogueira, u, 0.44, w, 0.02); sc(g, a + 0.3, 0.04, b + 0.06, mat.marmore, u + lado * 0.15, 0.9, w); solido(u - a / 2 + Math.min(0, lado * 0.3), w - b / 2, u + a / 2 + Math.max(0, lado * 0.3), w + b / 2); },
      banquetas(u, w, n, passo = 0.62) { for (let i = 0; i < n; i++) { const z = w + (i - (n - 1) / 2) * passo; cil(0.18, 0.18, 0.06, mat.couro, u, 0.72, z, g, 20); sc(g, 0.03, 0.7, 0.03, mat.preto, u, 0.35, z); solido(u - 0.18, z - 0.18, u + 0.18, z + 0.18); } },
      tanque(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.55, 0.85, 0.5, mat.loucas, 0, 0.425, 0, 0.04); ocupaQ(q, -0.28, -0.25, 0.28, 0.25); },
      maquinas(u, w, n, rot) {
        const q = grupoRot(u, w, rot);
        for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.66; sc(q, 0.6, 0.84, 0.6, mat.loucas, x, 0.42, 0.3, 0.04); const pt = new THREE.Mesh(cilGeo(0.19, 0.19, 0.02, 24), i % 2 ? mat.preto : mat.inox); pt.rotation.x = Math.PI / 2; pt.position.set(x, 0.46, 0.61); q.add(pt); }
        ocupaQ(q, -n * 0.33, 0, n * 0.33, 0.62);
      },
      cortina(eixo, v, a, b) {
        const dentro = v > 0 ? -1 : 1;
        for (const lado of [0, 1]) for (let i = 0; i < 4; i++) {
          const p = lado ? b - 0.14 - i * 0.09 : a + 0.14 + i * 0.09;
          if (eixo === "w") caixa(0.1, 2.4, 0.05, mat.cortina, p, 1.25, v + dentro * (0.2 + (i % 2) * 0.03), g);
          else caixa(0.05, 2.4, 0.1, mat.cortina, v + dentro * (0.2 + (i % 2) * 0.03), 1.25, p, g);
        }
      },
      /* banheiro */
      box(u0, w0, u1, w1) {
        const cu = (u0 + u1) / 2, gl = (u1 - u0) * 0.62;
        caixa(u1 - u0 - 0.04, 0.03, w1 - w0 - 0.04, mat.pedra, cu, 0.015, (w0 + w1) / 2, g);
        caixa(gl, 1.95, 0.02, mat.vidro, u0 + gl / 2, 1.0, w1, g);
        caixa(0.03, 1.95, 0.03, mat.inox, u0 + gl, 1.0, w1, g);
        caixa(0.22, 0.02, 0.22, mat.inox, cu, 2.15, w0 + 0.35, g); caixa(0.02, 0.02, 0.25, mat.inox, cu, 2.16, w0 + 0.2, g);
        caixa(0.3, 0.35, 0.04, mat.lacaEsc, cu, 1.3, w0 + 0.12, g);
        solido(u0, w0, u1, w1);
      },
      vaso(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.38, 0.4, 0.5, mat.loucas, 0, 0.2, 0.02, 0.12); sc(q, 0.4, 0.05, 0.52, mat.loucas, 0, 0.425, 0.03, 0.02); sc(q, 0.38, 0.42, 0.16, mat.loucas, 0, 0.55, -0.27, 0.04); ocupaQ(q, -0.2, -0.35, 0.2, 0.3); },
      pia(u, w, rot, larg = 0.6) {
        const q = grupoRot(u, w, rot);
        sc(q, larg, 0.42, 0.44, mat.carvalho, 0, 0.62, 0.23, 0.02); sc(q, larg + 0.02, 0.04, 0.47, mat.marmore, 0, 0.85, 0.235);
        cil(0.17, 0.14, 0.12, mat.loucas, 0, 0.92, 0.25, q, 22); caixa(0.03, 0.22, 0.03, mat.inox, 0, 1.0, 0.06, q);
        caixa(larg - 0.04, 0.8, 0.02, mat.espelho, 0, 1.55, 0.012, q);
        ocupaQ(q, -larg / 2, 0, larg / 2, 0.47);
      },
      /* lazer */
      esteira(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.8, 0.2, 1.9, mat.aco, 0, 0.1, 0, 0.04); sc(q, 0.52, 0.02, 1.6, mat.preto, 0, 0.21, -0.05); for (const s of [-1, 1]) sc(q, 0.05, 1.15, 0.06, mat.aco, s * 0.36, 0.75, 0.82); sc(q, 0.8, 0.26, 0.2, mat.aco, 0, 1.32, 0.86, 0.04); caixa(0.4, 0.2, 0.02, mat.tela, 0, 1.38, 0.75, q); ocupaQ(q, -0.4, -0.95, 0.4, 0.95); },
      bike(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.5, 0.06, 1.0, mat.aco, 0, 0.03, 0); sc(q, 0.08, 0.78, 0.08, mat.aco, 0, 0.45, -0.25); sc(q, 0.25, 0.06, 0.32, mat.preto, 0, 0.87, -0.27, 0.02); sc(q, 0.08, 0.92, 0.08, mat.aco, 0, 0.5, 0.3); sc(q, 0.48, 0.05, 0.12, mat.preto, 0, 1.0, 0.36, 0.02); const r = cil(0.24, 0.24, 0.05, mat.preto, 0, 0.42, 0.12, q, 24); r.rotation.z = Math.PI / 2; ocupaQ(q, -0.3, -0.5, 0.3, 0.5); },
      rack(u, w, rot, larg) {
        const q = grupoRot(u, w, rot);
        for (const s of [-1, 1]) sc(q, 0.06, 0.8, 0.5, mat.aco, s * (larg / 2 - 0.03), 0.4, 0.25);
        for (const [y, z] of [[0.45, 0.17], [0.75, 0.33]]) { sc(q, larg, 0.04, 0.22, mat.aco, 0, y, z); for (let x = -larg / 2 + 0.16; x < larg / 2 - 0.1; x += 0.24) sc(q, 0.16, 0.09, 0.09, mat.preto, x, y + 0.07, z, 0.03); }
        ocupaQ(q, -larg / 2, 0, larg / 2, 0.5);
      },
      banco(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.32, 0.09, 1.2, mat.couro, 0, 0.45, 0, 0.03); for (const t of [-0.45, 0.45]) sc(q, 0.26, 0.42, 0.06, mat.aco, 0, 0.21, t); ocupaQ(q, -0.16, -0.6, 0.16, 0.6); },
      estacao(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 1.3, 0.08, 1.3, mat.aco, 0, 0.04, 0); for (const s of [-1, 1]) sc(q, 0.08, 2.1, 0.08, mat.aco, s * 0.6, 1.05, -0.6); sc(q, 1.3, 0.08, 0.08, mat.aco, 0, 2.1, -0.6); sc(q, 0.32, 1.1, 0.16, mat.preto, 0, 0.62, -0.5, 0.02); sc(q, 0.4, 0.08, 0.9, mat.couro, 0, 0.5, 0.15, 0.03); sc(q, 0.4, 0.6, 0.08, mat.couro, 0, 0.85, -0.25, 0.03); ocupaQ(q, -0.65, -0.65, 0.65, 0.65); },
      tatame(u0, w0, u1, w1, m0 = mat.tatame) { caixa(u1 - u0, 0.02, w1 - w0, m0, (u0 + u1) / 2, 0.01, (w0 + w1) / 2, g).receiveShadow = true; },
      espelhoParede(eixo, v, a, b) { const c = (a + b) / 2; eixo === "u" ? caixa(0.02, 2.0, b - a, mat.espelho, v + 0.011 * Math.sign(1 - v), 1.25, c, g) : caixa(b - a, 2.0, 0.02, mat.espelho, c, 1.25, v, g); },
      bola(u, w, r, m0) { bola(r, m0, u, r, w); solido(u - r, w - r, u + r, w + r); },
      kettlebell(u, w, m0 = mat.preto) { bola(0.11, m0, u, 0.11, w); caixa(0.14, 0.03, 0.03, m0, u, 0.25, w, g); },
      caixote(u, w, a = 0.6) { sc(g, a, a * 0.75, a * 0.8, mat.carvalho, u, (a * 0.75) / 2, w, 0.02); solido(u - a / 2, w - a * 0.4, u + a / 2, w + a * 0.4); },
      sinuca(u, w, rot) {
        const q = grupoRot(u, w, rot);
        sc(q, 2.62, 0.16, 1.48, mat.nogueira, 0, 0.72, 0, 0.04); sc(q, 2.34, 0.02, 1.2, mat.feltro, 0, 0.81, 0);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.14, 0.66, 0.14, mat.nogueira, s * 1.1, 0.33, t * 0.55);
        for (let i = 0; i < 6; i++) bola(0.03, mat.bolas[i % mat.bolas.length], 0.55 + (i % 3) * 0.06, 0.85, -0.06 + Math.floor(i / 3) * 0.07, q);
        bola(0.03, mat.loucas, -0.6, 0.85, 0.05, q);
        ocupaQ(q, -1.31, -0.74, 1.31, 0.74);
      },
      pingpong(u, w, rot) {
        const q = grupoRot(u, w, rot);
        sc(q, 2.74, 0.04, 1.52, mat.mesaAzul, 0, 0.76, 0, 0.01);
        caixa(2.74, 0.004, 0.02, mat.loucas, 0, 0.782, 0, q); caixa(0.02, 0.15, 1.7, mat.preto, 0, 0.85, 0, q);
        for (const s of [-1, 1]) sc(q, 0.08, 0.74, 1.2, mat.aco, s * 0.9, 0.37, 0);
        ocupaQ(q, -1.37, -0.76, 1.37, 0.76);
      },
      mesinha(u, w) {
        sc(g, 0.9, 0.04, 0.9, mat.loucas, u, 0.5, w, 0.02);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(g, 0.04, 0.48, 0.04, mat.loucas, u + s * 0.38, 0.24, w + t * 0.38);
        [[0, 0.68, mat.vermelho], [0, -0.68, mat.azul], [0.68, 0, mat.amarelo], [-0.68, 0, mat.verde]].forEach(([a, b, c]) => sc(g, 0.3, 0.3, 0.3, c, u + a, 0.15, w + b, 0.04));
        solido(u - 0.85, w - 0.85, u + 0.85, w + 0.85);
      },
      cabana(u, w) { cil(0.02, 0.75, 1.7, mat.lona, u, 0.85, w, g, 6); solido(u - 0.7, w - 0.7, u + 0.7, w + 0.7); },
      puff(u, w, m0) { const o = bola(0.38, m0, u, 0.22, w); o.scale.set(1, 0.6, 1); solido(u - 0.35, w - 0.35, u + 0.35, w + 0.35); },
      espreguicadeira(u, w, rot, m0 = mat.lona) {
        const q = grupoRot(u, w, rot);
        sc(q, 0.66, 0.08, 1.9, mat.nogueira, 0, 0.28, 0, 0.02); sc(q, 0.6, 0.07, 1.22, m0, 0, 0.35, 0.32, 0.03);
        const e = sc(q, 0.6, 0.07, 0.64, m0, 0, 0.56, -0.6, 0.03); e.rotation.x = 0.7;
        for (const s of [-1, 1]) for (const t of [-0.8, 0.8]) sc(q, 0.05, 0.24, 0.05, mat.nogueira, s * 0.27, 0.12, t);
        ocupaQ(q, -0.33, -0.95, 0.33, 0.95);
      },
      guardaSol(u, w) { cil(0.025, 0.025, 2.3, mat.aco, u, 1.15, w); cil(0.03, 1.2, 0.35, mat.lona2, u, 2.22, w, g, 24); cil(0.25, 0.25, 0.08, mat.concreto, u, 0.04, w); solido(u - 0.15, w - 0.15, u + 0.15, w + 0.15); },
      piscina(u0, w0, u1, w1, pr = 0) {
        const cu = (u0 + u1) / 2, cw = (w0 + w1) / 2, L = u1 - u0, D = w1 - w0;
        sc(g, L + 0.5, 0.06, 0.25, mat.pedra, cu, 0.03, w0 - 0.125); sc(g, L + 0.5, 0.06, 0.25, mat.pedra, cu, 0.03, w1 + 0.125);
        sc(g, 0.25, 0.06, D, mat.pedra, u0 - 0.125, 0.03, cw); sc(g, 0.25, 0.06, D, mat.pedra, u1 + 0.125, 0.03, cw);
        const a = new THREE.Mesh(new THREE.PlaneGeometry(L - pr, D), mat.agua); a.rotation.x = -Math.PI / 2; a.position.set(u0 + pr + (L - pr) / 2, 0.03, cw); g.add(a);
        if (pr) { const b = new THREE.Mesh(new THREE.PlaneGeometry(pr, D), mat.aguaRasa); b.rotation.x = -Math.PI / 2; b.position.set(u0 + pr / 2, 0.035, cw); g.add(b); caixa(0.04, 0.05, D, mat.pedra, u0 + pr, 0.04, cw, g); }
        solido(u0, w0, u1, w1);
      },
      fogueira(u, w) {
        cil(0.75, 0.8, 0.38, mat.concreto, u, 0.19, w, g, 28); cil(0.6, 0.6, 0.02, mat.preto, u, 0.385, w, g, 28);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; const f = new THREE.Mesh(cilGeo(0, 0.1 + (i % 2) * 0.05, 0.3 + (i % 3) * 0.12, 8), mat.fogo); f.position.set(u + Math.cos(a) * 0.18, 0.55 + (i % 3) * 0.05, w + Math.sin(a) * 0.18); g.add(f); }
        solido(u - 0.8, w - 0.8, u + 0.8, w + 0.8);
      },
      pergola(u0, w0, u1, w1, h = 2.5) {
        for (const u of [u0, u1]) for (const w of [w0, w1]) { sc(g, 0.12, h, 0.12, mat.lacaEsc, u, h / 2, w); solido(u - 0.08, w - 0.08, u + 0.08, w + 0.08); }
        for (const w of [w0, w1]) sc(g, u1 - u0 + 0.2, 0.14, 0.1, mat.lacaEsc, (u0 + u1) / 2, h + 0.07, w);
        for (let u = u0 + 0.25; u < u1; u += 0.45) sc(g, 0.06, 0.1, w1 - w0 + 0.3, mat.nogueira, u, h + 0.19, (w0 + w1) / 2);
      },
      floreira(u0, w0, u1, w1) {
        sc(g, u1 - u0, 0.5, w1 - w0, mat.concreto, (u0 + u1) / 2, 0.25, (w0 + w1) / 2, 0.02);
        const longo = u1 - u0 > w1 - w0, n = Math.max(1, Math.round(Math.max(u1 - u0, w1 - w0) / 0.55));
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const f = sombra(new THREE.Mesh(icoGeo(i % 3 ? 0.28 : 0.36), i % 2 ? mat.planta : mat.planta2)); f.position.set(longo ? u0 + (u1 - u0) * t : (u0 + u1) / 2, 0.68 + (i % 3) * 0.08, longo ? (w0 + w1) / 2 : w0 + (w1 - w0) * t); g.add(f); }
        solido(u0, w0, u1, w1);
      },
      cabine(u, w, rot) {
        const q = grupoRot(u, w, rot);
        sc(q, 1.0, 2.2, 0.06, mat.lacaEsc, 0, 1.1, -0.47); for (const s of [-1, 1]) sc(q, 0.06, 2.2, 1.0, mat.lacaEsc, s * 0.47, 1.1, 0); sc(q, 1.0, 0.06, 1.0, mat.lacaEsc, 0, 2.2, 0);
        caixa(0.88, 2.1, 0.02, mat.vidro, 0, 1.05, 0.48, q); sc(q, 0.8, 0.04, 0.38, mat.carvalho, 0, 1.0, -0.22); sc(q, 0.5, 0.42, 0.45, mat.tecido2, 0, 0.21, 0.1, 0.04);
        ocupaQ(q, -0.5, -0.5, 0.5, 0.5);
      },
    };
    emMoveis = true; MOVEIS[nomePlanta]?.(m, mat); emMoveis = false;

    // diagnóstico: nada de móvel na frente de portas e vãos
    for (const vo of vaosLocal) {
      const [ua, ub, wa, wb] = vo.eixo === "w" ? [vo.a, vo.b, vo.v - 0.9, vo.v + 0.9] : [vo.v - 0.9, vo.v + 0.9, vo.a, vo.b];
      for (const o of obstLocal) if (o[4] && o[0] < ub && o[2] > ua && o[1] < wb && o[3] > wa) E.conflitos.push({ unidade: idx, planta: nomePlanta, vao: vo.nome, linha: `${vo.eixo}=${vo.v}`, de: +vo.a.toFixed(2), ate: +vo.b.toFixed(2), movel: o.slice(0, 4).map((x) => +x.toFixed(2)) });
    }
    fundir(g);
    for (const [u0, w0, u1, w1] of obstLocal) {
      const xa = px + sx * u0, xb = px + sx * u1, za = pz + sz * w0, zb = pz + sz * w1;
      E.obst.push([Math.min(xa, xb), Math.min(za, zb), Math.max(xa, xb), Math.max(za, zb)]);
    }
    const un = { g, planta, nome: nomePlanta, pos, idx, centro: (u, w) => new THREE.Vector3(px + sx * u, 0, pz + sz * w), comodos };
    E.unidades.push(un);
    return un;
  }

  /* junta tudo que não se mexe em uma malha por material */
  function fundir(g) {
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const grupos = new Map(), sair = [];
    g.traverse((o) => {
      if (!o.isMesh) return;
      for (let p = o; p && p !== g; p = p.parent) if (p.userData.manter) return;
      const tampa = !!o.userData.tampa, k = `${o.material.uuid}|${o.castShadow}|${tampa}`;
      if (!grupos.has(k)) grupos.set(k, { m: o.material, sombra: o.castShadow, tampa, geos: [] });
      const ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      ge.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      grupos.get(k).geos.push(ge); sair.push(o);
    });
    for (const o of sair) o.parent.remove(o);
    const vazios = []; g.traverse((o) => { if (o !== g && !o.isMesh && !o.userData.manter && !o.children.length) vazios.push(o); });
    for (const o of vazios) o.parent?.remove(o);
    for (const { m, sombra, tampa, geos } of grupos.values()) {
      let n = 0; for (const ge of geos) n += ge.attributes.position.count;
      const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), UV = new Float32Array(n * 2);
      let k = 0;
      for (const ge of geos) {
        P.set(ge.attributes.position.array, k * 3); Nn.set(ge.attributes.normal.array, k * 3);
        if (ge.attributes.uv) UV.set(ge.attributes.uv.array, k * 2);
        k += ge.attributes.position.count; ge.dispose();
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute("position", new THREE.BufferAttribute(P, 3)); bg.setAttribute("normal", new THREE.BufferAttribute(Nn, 3)); bg.setAttribute("uv", new THREE.BufferAttribute(UV, 2));
      const mesh = new THREE.Mesh(bg, m); mesh.castShadow = sombra; mesh.receiveShadow = true; mesh.userData.temp = true; g.add(mesh);
      if (tampa) E.tampas.push(mesh);
    }
  }

  /* núcleo: corredor, elevadores e escada */
  function construirNucleo(tipo) {
    const n = new THREE.Group(); interior.add(n);
    const sb = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
    const aberto = tipo === "rooftop";
    const cg = new THREE.PlaneGeometry(34, 1.6), uv = cg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 34 / 3, uv.getY(i) * 1.6 / 3);
    const p = new THREE.Mesh(cg, aberto ? mat.deckExt : mat.lobbyPiso); p.rotation.x = -Math.PI / 2; p.position.set(0, 0.012, 0); p.receiveShadow = true; n.add(p);
    if (!aberto) { const t = new THREE.Mesh(new THREE.PlaneGeometry(34, 1.6), mat.teto); t.rotation.x = Math.PI / 2; t.position.set(0, PE + 0.03, 0); t.visible = false; t.castShadow = true; n.add(t); E.tetos.push(t); }
    // elevadores na frente (poços escuros vistos de cima) e caixa de escada aberta nos fundos
    sb(caixa(5.8, PE + 0.02, 7.0, mat.nucleo, 0, PE / 2 + 0.01, 4.4, n));
    E.tampas.push(caixa(5.84, 0.02, 7.04, mat.tampa, 0, PE + 0.03, 4.4, n));
    for (const x of [-1.25, 1.25]) E.tampas.push(caixa(2.0, 0.02, 2.2, mat.preto, x, PE + 0.045, 2.2, n));
    const muro = (w, d, x, z) => { sb(caixa(w, PE + 0.02, d, mat.nucleo, x, PE / 2 + 0.01, z, n)); E.tampas.push(caixa(w + 0.02, 0.02, d + 0.02, mat.tampa, x, PE + 0.03, z, n)); };
    muro(5.8, 0.2, 0, -1.0); muro(5.8, 0.2, 0, -7.8); muro(0.2, 6.6, -2.8, -4.4); muro(0.2, 6.6, 2.8, -4.4);
    const pg = new THREE.PlaneGeometry(5.4, 6.6); const pp = new THREE.Mesh(pg, mat.concreto); pp.rotation.x = -Math.PI / 2; pp.position.set(0, 0.015, -4.4); pp.receiveShadow = true; n.add(pp);
    for (let i = 0; i < 9; i++) { sb(caixa(1.15, 0.17 * (i + 1), 0.28, mat.laje, -1.2, 0.085 * (i + 1), -2.0 - i * 0.28, n)); sb(caixa(1.15, 0.17 * (9 - i), 0.28, mat.laje, 1.2, 0.085 * (9 - i), -2.0 - i * 0.28, n)); }
    sb(caixa(5.4, 1.53, 1.5, mat.laje, 0, 0.765, -5.3, n)); sb(caixa(0.12, 1.0, 2.6, mat.caixilho, 0, 0.5, -3.2, n));
    for (const x of [-1.25, 1.25]) { caixa(1.0, 2.1, 0.03, mat.elevador, x, 1.05, 0.885, n); caixa(1.16, 0.06, 0.05, mat.inox, x, 2.15, 0.89, n); caixa(0.02, 2.1, 0.035, mat.preto, x, 1.05, 0.88, n); }
    caixa(0.1, 0.18, 0.02, mat.led, 0, 1.2, 0.885, n);
    caixa(0.92, 2.1, 0.03, mat.portaCorta, 0, 1.05, -0.885, n); caixa(0.12, 0.03, 0.04, mat.inox, 0.3, 1.0, -0.86, n);
    if (aberto) {
      for (const s of [-1, 1]) { caixa(0.02, 1.04, 1.6, mat.vidro, s * 16.95, 0.54, 0, n); caixa(0.07, 0.06, 1.6, mat.caixilho, s * 16.95, 1.07, 0, n); }
    } else {
      for (const s of [-1, 1]) {
        caixa(0.02, PE - 0.1, 1.5, mat.vidro, s * 16.95, PE / 2, 0, n);
        for (const y of [0.04, PE - 0.04]) caixa(0.08, 0.06, 1.6, mat.caixilho, s * 16.95, y, 0, n);
      }
      for (const x of [-12, -6, 6, 12]) caixa(0.24, 0.015, 0.24, mat.spot, x, PE - 0.01, 0, n);
    }
    E.obst.push([-2.9, 0.9, 2.9, 7.9], [-2.9, -7.9, 2.9, -0.9], [-17.3, -0.8, -16.9, 0.8], [16.9, -0.8, 17.3, 0.8]);
  }

  /* ---------------- mobília de cada planta ---------------- */
  function jardim(m, U) {
    m.floreira(0.1, 7.45, 0.6, 10.15);
    m.espreguicadeira(U - 1.0, 8.95, 0);
    if (U > 5) { m.espreguicadeira(U - 2.0, 8.95, 0); m.guardaSol(U - 1.5, 7.7); m.mesaRedonda(1.75, 9.35, 0.35, 2); }
    else m.guardaSol(U - 2.05, 7.85);
    m.planta(U - 0.4, 10.0, 1.1);
  }
  const MOVEIS = {
    studio(m, mat) {
      m.box(0, 0, 1.7, 0.95); m.vaso(0.45, 1.3, Math.PI / 2); m.pia(0.1, 1.92, Math.PI / 2, 0.6);
      m.bancada(3.2, 0.1, 3.8, 1.5, { pia: 1.05, cooktop: 0.42 }); m.armarioAlto(3.44, 0.1, 3.8, 1.5); m.geladeira(3.46, 1.9, -Math.PI / 2);
      m.armario(0.85, 2.7, 0.6, 1.5, 0);
      m.cama(1.13, 4.55, 1.4, Math.PI / 2, mat.manta2, [-1]);
      m.tapete(1.8, 4.55, 1.9, 2.3, mat.tapete1); m.quadro(0.1, 4.55, Math.PI / 2, 1, 1.5);
      m.tvParede(3.8, 4.45, -Math.PI / 2, 1.1); m.luminariaChao(3.45, 3.05);
      m.cortina("w", 6.0, 0, 3.9);
      m.mesaRedonda(1.0, 6.6, 0.3, 2); m.planta(3.7, 6.95, 0.8);
    },
    um(m, mat) {
      m.box(0, 0, 1.7, 0.95); m.vaso(0.45, 1.33, Math.PI / 2); m.pia(0.1, 2.0, Math.PI / 2, 0.6);
      m.bancada(2.92, 0.1, 3.54, 1.65, { pia: 1.15, cooktop: 0.45 }); m.armarioAlto(3.18, 0.1, 3.54, 1.65); m.geladeira(3.2, 2.03, -Math.PI / 2);
      m.mesaRedonda(1.1, 3.0, 0.35, 2); m.pendente(1.1, 3.0, 1.85);
      m.sofa(0.58, 4.35, 1.7, Math.PI / 2, mat.tecido); m.mesaCentro(1.75, 4.35, 0.5, 0.9); m.tapete(1.9, 4.35, 2.3, 2.2, mat.tapete2);
      m.quadro(0.1, 4.35, Math.PI / 2, 0, 1.6); m.tv(3.54, 4.6, -Math.PI / 2, 1.2); m.planta(3.2, 5.65, 1.0);
      m.cortina("w", 6.0, 0, 3.6);
      m.cama(4.9, 1.2, 1.4, 0, mat.manta); m.tapete(4.9, 2.45, 2.0, 1.3, mat.tapete3);
      m.armario(5.8, 5.1, 0.6, 1.6, -Math.PI / 2); m.poltrona(4.3, 5.3, Math.PI * 0.85, mat.tecido2);
      m.cortina("u", 6.2, 1.9, 4.1); m.cortina("w", 6.0, 3.6, 6.2);
      m.mesaRedonda(4.6, 6.6, 0.3, 2); m.planta(0.4, 6.8, 0.9); m.planta(5.95, 6.95, 0.7);
    },
    gstudio(m, mat) { MOVEIS.studio(m, mat); jardim(m, 3.9); },
    gum(m, mat) { MOVEIS.um(m, mat); jardim(m, 6.2); },
    gourmet(m, mat) {
      m.bancada(0.1, 0.9, 0.72, 5.6, { pia: 2.3, cooktop: 4.0 }); m.armarioAlto(0.1, 0.9, 0.46, 5.6); m.geladeira(0.45, 6.3, Math.PI / 2);
      m.ilha(2.4, 3.3, 1.0, 2.4, 1); m.banquetas(3.2, 3.3, 3); m.pendente(2.4, 2.7, 1.9); m.pendente(2.4, 3.9, 1.9);
      m.mesa(5.8, 4.0, 2.6, 1.0, 0, 6, mat.nogueira); m.pendente(5.3, 4.0, 1.85); m.pendente(6.3, 4.0, 1.85);
      m.sofa(7.6, 6.6, 2.2, Math.PI, mat.tecido); m.mesaCentro(7.6, 5.6, 1.0, 0.5); m.planta(8.6, 0.6, 1.1); m.planta(4.3, 6.75, 1.0);
      m.maquinas(11.6, 7.08, 6, Math.PI); m.mesa(11.5, 3.6, 1.8, 0.8, 0, 0, mat.laca); m.tanque(13.6, 1.2, -Math.PI / 2); m.planta(9.5, 0.6, 0.8);
    },
    kids(m, mat) {
      m.tapete(3.0, 4.2, 3.8, 3.2, mat.tapeteKids); m.mesinha(3.0, 4.3); m.cabana(1.2, 6.1);
      m.estante(0.1, 3.3, Math.PI / 2, 2.4); m.puff(5.3, 6.4, mat.vermelho); m.puff(5.4, 5.4, mat.azul); m.puff(4.5, 6.5, mat.amarelo);
      m.sinuca(8.4, 4.6, 0); m.pendente(7.9, 4.6, 1.95); m.pendente(8.9, 4.6, 1.95);
      m.pingpong(11.9, 4.6, 0); m.sofa(10.2, 6.6, 2.2, Math.PI, mat.couro); m.quadro(6.06, 2.6, Math.PI / 2, 1);
      m.planta(13.5, 6.7, 1.0); m.planta(6.6, 6.7, 0.9);
    },
    fitness(m, mat) {
      for (const u of [4.2, 5.3, 6.4, 7.5]) m.esteira(u, 5.95, 0);
      for (const u of [9.2, 10.1, 11.0, 11.9]) m.bike(u, 6.3, 0);
      m.espelhoParede("u", 0.1, 1.2, 6.4); m.rack(0.1, 3.7, Math.PI / 2, 2.4);
      m.banco(1.6, 2.6, Math.PI / 2); m.banco(1.6, 4.8, Math.PI / 2); m.estacao(12.4, 2.3, 0);
      m.tatame(8.4, 1.2, 11.2, 3.8); m.bola(9.0, 2.9, 0.32, mat.azul); m.bola(9.8, 3.1, 0.32, mat.lilas);
      m.planta(13.5, 6.75, 1.0); m.planta(2.9, 6.75, 0.9);
    },
    funcional(m, mat) {
      m.tatame(1.4, 1.4, 12.8, 6.4); m.espelhoParede("u", 0.1, 1.4, 6.4);
      m.bola(3.0, 3.0, 0.32, mat.lilas); m.bola(3.8, 2.5, 0.32, mat.azul); m.bola(3.4, 4.0, 0.32, mat.amarelo);
      for (let i = 0; i < 6; i++) m.kettlebell(6.2 + i * 0.4, 1.8, i % 2 ? mat.preto : mat.aco);
      m.caixote(9.0, 3.2); m.caixote(9.8, 3.2, 0.5); m.caixote(10.6, 3.2, 0.4);
      m.pergola(11.0, 4.3, 12.8, 6.0, 2.3); m.planta(13.5, 6.75, 1.1); m.planta(13.5, 0.6, 0.9);
    },
    cowork(m, mat) {
      m.mesa(3.0, 4.2, 3.0, 1.0, Math.PI / 2, 6, mat.carvalho); m.mesa(6.2, 4.2, 3.0, 1.0, Math.PI / 2, 6, mat.carvalho);
      for (const u of [3.0, 6.2]) { m.pendente(u, 3.5, 1.95); m.pendente(u, 4.9, 1.95); }
      m.estante(0.1, 3.6, Math.PI / 2, 3.0, 2.0, false); m.planta(8.9, 0.6, 1.0); m.planta(0.5, 6.7, 1.1); m.poltrona(8.7, 6.4, Math.PI * 1.15, mat.couro);
      m.mesa(11.9, 4.4, 2.6, 1.1, Math.PI / 2, 6, mat.nogueira); m.tv(9.56, 4.4, Math.PI / 2, 1.4); m.planta(13.5, 6.7, 0.9);
    },
    lounge(m, mat) {
      for (const w of [1.65, 2.8, 3.95]) m.cabine(0.62, w, Math.PI / 2);
      m.bancada(0.1, 5.0, 0.72, 6.9, { pia: 5.6 }); m.banquetas(1.15, 5.95, 3, 0.6);
      for (const u of [6.0, 10.6]) { m.sofa(u, 4.4, 2.4, 0, mat.tecido2); m.mesaCentro(u, 5.5, 1.0, 0.55); m.poltrona(u - 1.6, 5.6, Math.PI / 2, mat.couro); m.poltrona(u + 1.6, 5.6, -Math.PI / 2, mat.couro); m.tapete(u, 5.2, 3.6, 2.6, mat.tapete1); }
      m.planta(13.5, 0.6, 1.1); m.planta(8.3, 6.75, 1.0); m.planta(13.5, 6.75, 1.0);
    },
    piscina(m, mat) {
      m.piscina(3.2, 2.8, 13.4, 6.55, 2.2);
      m.espreguicadeira(3.75, 4.6, 0, mat.lona); m.espreguicadeira(4.65, 4.6, 0, mat.lona);
      for (const u of [6.0, 7.6, 9.2, 10.8, 12.4]) m.espreguicadeira(u, 1.4, 0, mat.lona);
      m.guardaSol(6.8, 1.35); m.guardaSol(10.0, 1.35);
      m.floreira(0.15, 0.5, 0.75, 6.9); m.planta(13.6, 0.5, 1.2);
    },
    solario(m, mat) {
      m.bancada(0.1, 1.0, 0.72, 4.6, { pia: 2.0 }); m.banquetas(1.15, 2.8, 5, 0.66); m.pergola(0.25, 0.55, 2.3, 5.1);
      for (const u of [4.0, 5.4, 6.8, 8.2, 9.6, 11.0]) m.espreguicadeira(u, 5.3, 0, mat.lona);
      for (const u of [4.7, 7.5, 10.3]) m.guardaSol(u, 5.2);
      m.floreira(0.1, 5.7, 2.4, 6.95); m.planta(13.5, 0.6, 1.2); m.planta(12.6, 6.7, 1.0);
    },
    lareira(m, mat) {
      m.pergola(3.0, 1.3, 11.0, 6.5); m.fogueira(7.0, 3.9);
      m.sofa(7.0, 5.7, 2.6, Math.PI, mat.tecido); m.sofa(4.8, 3.9, 2.2, Math.PI / 2, mat.tecido); m.sofa(9.2, 3.9, 2.2, -Math.PI / 2, mat.tecido);
      m.poltrona(7.0, 2.1, 0, mat.tecido2); m.tapete(7.0, 3.9, 4.6, 3.8, mat.tapete3);
      m.floreira(0.15, 0.5, 0.75, 6.9); m.planta(13.5, 0.6, 1.2); m.planta(13.5, 6.7, 1.1); m.planta(1.6, 6.7, 1.0);
    },
    salao(m, mat) {
      m.bancada(0.1, 1.2, 0.72, 5.8, { pia: 3.0 }); m.armarioAlto(0.1, 1.2, 0.46, 5.8); m.banquetas(1.15, 3.5, 4);
      m.mesa(5.0, 4.0, 3.0, 1.1, 0, 6, mat.nogueira); m.pendente(4.4, 4.0, 1.9); m.pendente(5.6, 4.0, 1.9);
      m.sofa(10.6, 4.3, 2.6, 0, mat.tecido2); m.mesaCentro(10.6, 5.45, 1.1, 0.6); m.poltrona(8.8, 5.6, Math.PI / 2, mat.couro); m.poltrona(12.4, 5.6, -Math.PI / 2, mat.couro);
      m.tapete(10.6, 5.2, 4.2, 2.8, mat.tapete2); m.planta(13.5, 0.6, 1.1); m.planta(7.6, 6.75, 1.0); m.planta(13.5, 6.75, 0.9);
    },
  };

  return { construirUnidade, construirNucleo };
}
