/* Aurora — maquete dos andares
   Paredes, portas, janelas e guarda-corpos saem dos retângulos dos cômodos (dados.js).
   Cada unidade é posicionada com [x, z, giro, espelho]: as alas giram 90° e as barras da
   frente e dos fundos ficam de costas uma para a outra, como na planta-chave do projeto.
   Paredes de divisa: cada unidade levanta a sua metade, então vizinhas nunca se sobrepõem.
   A mobília de cada planta fica em MOVEIS, desenhada a partir da planta de vendas, e a
   geometria parada é fundida por material para o andar (19 unidades) abrir leve. */
import * as THREE from "three";

/* junta tudo que não se mexe em uma malha por material (também usado na fachada) */
export function fundirGrupo(g, aoTampa) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const grupos = new Map(), sair = [];
  g.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let p = o; p && p !== g; p = p.parent) if (p.userData.manter) return;
    const tampa = !!o.userData.tampa, k = `${o.material.uuid}|${o.castShadow}|${tampa}`;
    if (!grupos.has(k)) grupos.set(k, { m: o.material, sombra: o.castShadow, tampa, geos: [] });
    const ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    ge.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    grupos.get(k).geos.push(ge); sair.push(o);
  });
  for (const o of sair) o.parent.remove(o);
  const vazios = []; g.traverse((o) => { if (o !== g && !o.isMesh && !o.isLight && !o.userData.manter && !o.children.length) vazios.push(o); });
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
    bg.computeBoundingSphere();
    const mesh = new THREE.Mesh(bg, m); mesh.castShadow = sombra; mesh.receiveShadow = true; mesh.userData.temp = true; g.add(mesh);
    if (tampa) aoTampa?.(mesh);
  }
}

export function criarMaquete({ mat, caixa, PE, interior, E, PLANTAS, foto }) {
  const ESP = 0.12, ESPX = 0.2;
  const OUT = new Set(["varanda", "jardim", "externo"]);
  const PISO = { social: "porcelanato", quarto: "porcelanato", hall: "porcelanato", cozinha: "porcelanato", molhado: "porcelanatoB", servico: "porcelanatoB", varanda: "porcelanatoV", tecnica: "cimento", jardim: "grama", externo: "deckExt", fitness: "borracha", kids: "eva" };
  const ESCALA = { porcelanato: 1.8, porcelanatoB: 1.2, porcelanatoV: 1.2, cimento: 2, deckExt: 3.5, grama: 3, borracha: 2, eva: 1.2 };
  const cache = new Map();
  const geo = (k, f) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g); } return g; };
  const cilGeo = (rt, rb, h, s = 18) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
  const esfGeo = (r) => geo(`e${r}`, () => new THREE.SphereGeometry(r, 20, 14));
  const icoGeo = (r) => geo(`i${r}`, () => new THREE.IcosahedronGeometry(r, 1));

  function construirUnidade(nomePlanta, pos, idx) {
    const planta = PLANTAS[nomePlanta], ext = planta.ext || [];
    const [px, pz, giro, esp] = pos;
    const g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = giro; g.scale.set(esp, 1, 1); interior.add(g);
    g.updateMatrix();
    const M4 = g.matrix.clone();
    const mundo = (u, w) => new THREE.Vector3(u, 0, w).applyMatrix4(M4);
    const obstLocal = [], vaosLocal = [];
    let emMoveis = false;
    const solido = (u0, w0, u1, w1) => obstLocal.push([Math.min(u0, u1), Math.min(w0, w1), Math.max(u0, u1), Math.max(w0, w1), emMoveis]);
    const sombra = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
    const comodos = planta.comodos.map(([id, nome, tipo, u0, w0, u1, w1, f]) => ({ id, nome, tipo, u0, w0, u1, w1, foto: f ? foto(f) : null }));
    const porId = Object.fromEntries(comodos.map((c) => [c.id, c]));
    const par = (a, b) => (x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a);

    /* ----- pisos (clicáveis) e forros (só na visita) ----- */
    for (const c of comodos) {
      const k = PISO[c.tipo] || "porcelanato", w = c.u1 - c.u0, d = c.w1 - c.w0, esc = ESCALA[k] || 2;
      const pg = new THREE.PlaneGeometry(w, d), uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / esc, (uv.getY(i) * d) / esc);
      const p = new THREE.Mesh(pg, mat[k].clone());
      p.rotation.x = -Math.PI / 2;
      p.position.set((c.u0 + c.u1) / 2, c.tipo === "varanda" || c.tipo === "jardim" || c.tipo === "tecnica" ? -0.02 : 0.01, (c.w0 + c.w1) / 2);
      p.receiveShadow = true;
      p.userData = { nome: c.nome, foto: c.foto, un: idx, area: Math.round(w * d), tipo: c.tipo, manter: true, temp: true };
      g.add(p); E.pisos.push(p); c.mesh = p;
      if (!OUT.has(c.tipo) && c.tipo !== "tecnica") {
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
    const bx = (eixo, v, a, b, y0, y1, m, esp2, s = true) => {
      const len = b - a, c = (a + b) / 2, h = y1 - y0;
      const o = eixo === "w" ? caixa(len, h, esp2, m, c, y0 + h / 2, v, g) : caixa(esp2, h, len, m, v, y0 + h / 2, c, g);
      return s ? sombra(o) : o;
    };
    const peca = (eixo, v, a, b, y0, y1, m = mat.parede, esp2 = ESP) => {
      if (b - a < 0.02) return;
      bx(eixo, v, a, b, y0, y1, m, esp2);
      if (y0 === 0 && m === mat.parede) bx(eixo, v, a, b, 0, 0.07, mat.rodape, esp2 + 0.02, false);
      if (y1 >= PE - 0.01) bx(eixo, v, a, b, PE, PE + 0.02, mat.tampa, esp2 + 0.004, false).userData.tampa = true;
    };
    const solidoLinha = (eixo, v, a, b, esp2 = ESP) => { if (b - a > 0.02) (eixo === "w" ? solido(a, v - esp2 / 2, b, v + esp2 / 2) : solido(v - esp2 / 2, a, v + esp2 / 2, b)); };
    const parede = (eixo, v, a, b, esp2 = ESPX) => { peca(eixo, v, a, b, 0, PE, mat.parede, esp2); solidoLinha(eixo, v, a, b, esp2); };

    function porta(eixo, v, a, b, lado, larg, m = mat.porta) {
      // verga, batentes e folha fechada; a folha gira 90° para dentro do cômodo quando alguém chega perto
      const espP = m === mat.portaEnt ? ESPX : ESP, eb = espP + 0.03, fl = larg - 0.08, h = 2.1;
      peca(eixo, v, a, b, 2.12, PE, mat.parede, espP);
      bx(eixo, v, a, a + 0.05, 0, 2.14, mat.batente, eb, false); bx(eixo, v, b - 0.05, b, 0, 2.14, mat.batente, eb, false); bx(eixo, v, a, b, 2.11, 2.16, mat.batente, eb, false);
      const piv = new THREE.Group(); piv.userData.manter = true; g.add(piv);
      if (eixo === "w") { piv.position.set(a + 0.05, 0, v); sombra(caixa(fl, h, 0.04, m, fl / 2, h / 2, 0, piv)); for (const s of [-1, 1]) caixa(0.14, 0.025, 0.025, mat.preto, fl - 0.1, 1.0, s * 0.04, piv); }
      else { piv.position.set(v, 0, a + 0.05); sombra(caixa(0.04, h, fl, m, 0, h / 2, fl / 2, piv)); for (const s of [-1, 1]) caixa(0.025, 0.025, 0.14, mat.preto, s * 0.04, 1.0, fl - 0.1, piv); }
      const aberta = eixo === "w" ? (-lado * Math.PI) / 2 : (lado * Math.PI) / 2;
      const cp = eixo === "w" ? mundo((a + b) / 2, v) : mundo(v, (a + b) / 2);
      E.portas.push({ piv, aberta, ang: 0, x: cp.x, z: cp.z });
      vaosLocal.push({ eixo, v, a, b, nome: m === mat.portaEnt ? "entrada" : "porta", banda: 0.9 });
    }
    function janela(eixo, v, a, b, y0, y1) {
      const len = b - a;
      peca(eixo, v, a, b, 0, y0, mat.parede, ESPX); peca(eixo, v, a, b, y1, PE, mat.parede, ESPX);
      bx(eixo, v, a, b, y0, y1, mat.vidro, 0.02, false);
      for (const yy of [y0, y1]) bx(eixo, v, a, b, yy - 0.025, yy + 0.025, mat.caixilho, 0.07, false);
      for (const p of len > 1.4 ? [a, (a + b) / 2 - 0.025, b - 0.05] : [a, b - 0.05]) bx(eixo, v, p, p + 0.05, y0, y1, mat.caixilho, 0.07, false);
      if (y0 > 0.1) bx(eixo, v, a - 0.05, b + 0.05, y0 - 0.015, y0 + 0.015, mat.peitoril, ESPX + 0.06);
    }
    function vidraca(eixo, v, a, b, aberturas = [], correr = true) {
      // caixilho preto de piso a teto; nas aberturas a folha de correr fica recolhida sobre a parte fixa
      const ab = [...aberturas].sort((x, y) => x[0] - y[0]);
      const dentro = (p) => ab.some(([p0, p1]) => p > p0 + 0.03 && p < p1 - 0.03);
      let cur = a;
      for (const [p0, p1] of [...ab, [b, b]]) { if (p0 - cur > 0.02) bx(eixo, v, cur, p0, 0.03, PE - 0.03, mat.vidro, 0.02, false); solidoLinha(eixo, v, cur, p0, 0.1); cur = p1; }
      for (const yy of [0.025, PE - 0.03]) bx(eixo, v, a, b, yy - 0.025, yy + 0.03, mat.caixilho, 0.07, false);
      const n = Math.max(1, Math.round((b - a) / 1.2)), postes = new Set();
      for (let i = 0; i <= n; i++) postes.add(+(a + ((b - a) * i) / n).toFixed(3));
      for (const [p0, p1] of ab) { postes.add(+p0.toFixed(3)); postes.add(+p1.toFixed(3)); }
      for (const p of postes) if (!dentro(p)) bx(eixo, v, Math.max(a, p - 0.022), Math.min(b, p + 0.022), 0, PE, mat.caixilho, 0.07, false);
      if (correr) for (const [p0, p1] of ab) { const L = p1 - p0, s = p0 - a > b - p1 ? -1 : 1, q0 = s > 0 ? p1 : p0 - L; if (q0 >= a - 0.01 && q0 + L <= b + 0.01) bx(eixo, v + 0.045, q0, q0 + L, 0.03, PE - 0.03, mat.vidro, 0.02, false); }
      bx(eixo, v, a, b, PE, PE + 0.02, mat.tampa, 0.1, false).userData.tampa = true;
    }
    function guarda(eixo, v, a, b) {
      // guarda-corpo em chapa perfurada bronze com montantes, como na fachada do projeto
      bx(eixo, v, a, b, 0.0, 1.1, mat.malha, 0.03, false);
      bx(eixo, v, a, b, 1.08, 1.12, mat.bronze, 0.06, false);
      const n = Math.max(1, Math.round((b - a) / 1.3));
      for (let i = 0; i <= n; i++) { const p = a + ((b - a - 0.03) * i) / n; bx(eixo, v, p, p + 0.03, 0, 1.1, mat.bronze, 0.05, false); }
      solidoLinha(eixo, v, a, b, 0.1);
    }
    function grade(eixo, v, a, b) { bx(eixo, v, a, b, 0.0, PE, mat.malha, 0.03, false); bx(eixo, v, a, b, PE - 0.04, PE, mat.bronze, 0.06, false); solidoLinha(eixo, v, a, b, 0.1); }
    function mureta(eixo, v, a, b, e = 0.16) { bx(eixo, v, a, b, 0, 0.95, mat.concreto, e); solidoLinha(eixo, v, a, b, e); }
    function corredor(eixo, v, a, b) {
      const ent = (planta.entradas || []).filter(([e0, e1]) => e0 >= a - 1e-6 && e1 <= b + 1e-6).sort((p, q) => p[0] - q[0]);
      if (planta.vitrine) { vidraca(eixo, v, a, b, ent, false); for (const [e0, e1] of ent) vaosLocal.push({ eixo, v, a: e0, b: e1, nome: "entrada", banda: 0.9 }); return; }
      let cur = a;
      for (const [e0, e1] of ent) { parede(eixo, v, cur, e0); porta(eixo, v, e0, e1, 1, e1 - e0, mat.portaEnt); cur = e1; }
      parede(eixo, v, cur, b);
    }
    function externa(c, eixo, v, a, b) {
      const L = b - a, md = (a + b) / 2;
      if (["social", "fitness", "kids", "servico"].includes(c.tipo)) { vidraca(eixo, v, a, b, [], false); return; }
      const jan = c.tipo === "quarto" ? [Math.min(L - 0.8, 2.2), 0.5, 2.3] : c.tipo === "cozinha" ? [Math.min(L - 0.6, 1.6), 1.05, 2.2] : c.tipo === "molhado" ? [Math.min(L - 0.6, 0.8), 1.6, 2.15] : null;
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
          const p = planta.portas.find(par(A.id, B.id));
          if (A.tipo === "tecnica" || B.tipo === "tecnica") {         // área técnica: parede cega, passagem pela varanda
            const outro = A.tipo === "tecnica" ? B : A;
            if (outro.tipo === "jardim") { grade(eixo, v, t.a, t.b); continue; }
            if (p) { const lg = p[3] || 0.7, pc = THREE.MathUtils.clamp(p[2] ?? md, t.a + lg / 2 + 0.05, t.b - lg / 2 - 0.05); peca(eixo, v, t.a, pc - lg / 2, 0, PE); solidoLinha(eixo, v, t.a, pc - lg / 2); peca(eixo, v, pc + lg / 2, t.b, 0, PE); solidoLinha(eixo, v, pc + lg / 2, t.b); peca(eixo, v, pc - lg / 2, pc + lg / 2, 2.12, PE); }
            else { peca(eixo, v, t.a, t.b, 0, PE); solidoLinha(eixo, v, t.a, t.b); }
            continue;
          }
          const fa = OUT.has(A.tipo), fb = OUT.has(B.tipo);
          if (fa && fb) continue;                                   // varanda que continua no jardim
          if (fa || fb) {                                            // caixilho de vidro para a varanda
            const dentro = fa ? B : A;
            if (p) { const lg = p[3] || 1.6, c = p[2] ?? md; vidraca(eixo, v, t.a, t.b, [[c - lg / 2, c + lg / 2]]); vaosLocal.push({ eixo, v, a: c - lg / 2, b: c + lg / 2, nome: "porta de correr", banda: 0.5 }); }
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
            if (larg > 1.2) { peca(eixo, v, g0, g1, 2.12, PE); vaosLocal.push({ eixo, v, a: g0, b: g1, nome: "vão", banda: 0.9 }); }
            else porta(eixo, v, g0, g1, Math.sign(centro - v), larg);
          } else { peca(eixo, v, t.a, t.b, 0, PE); solidoLinha(eixo, v, t.a, t.b); }
          continue;
        }
        // borda da unidade; nas divisas (u0/u1) cada unidade levanta só a sua metade
        const c = A, ehExt = !!borda && ext.includes(borda);
        const divisa = (borda === "u0" || borda === "u1") && !ehExt;
        const vm = divisa ? v + (borda === "u0" ? 0.05 : -0.05) : v;
        if (c.tipo === "tecnica") { if (borda === "w1") grade(eixo, v, t.a, t.b); else parede(eixo, vm, t.a, t.b, divisa ? 0.1 : ESPX); continue; }
        if (OUT.has(c.tipo)) {
          if (borda === "w0") continue;                              // terraço aberto para o corredor
          if (ehExt || borda === "w1") { guarda(eixo, v, t.a, t.b); continue; }
          if (c.tipo === "varanda") parede(eixo, vm, t.a, t.b, 0.1); else mureta(eixo, v + (borda === "u0" ? 0.04 : -0.04), t.a, t.b, 0.08);
          continue;
        }
        if (borda === "w0") { corredor(eixo, v, t.a, t.b); continue; }
        if (ehExt) { externa(c, eixo, v, t.a, t.b); continue; }
        parede(eixo, vm, t.a, t.b, divisa ? 0.1 : ESPX);
      }
    }

    /* ----- móveis (coordenadas da planta; o lado -z de cada móvel encosta na parede) ----- */
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
    const doTeto = (o) => { o.userData.manter = true; o.visible = false; E.tetos.push(o); return o; };
    const cadeira = (q, x, z, rot, tec = mat.tecidoCinza) => {
      const c = grupoRot(x, z, rot, q);
      sc(c, 0.48, 0.07, 0.46, tec, 0, 0.47, 0.01, 0.03); sc(c, 0.5, 0.3, 0.07, tec, 0, 0.7, -0.2, 0.035);
      for (const s of [-1, 1]) sc(c, 0.07, 0.16, 0.36, tec, s * 0.23, 0.58, -0.02, 0.03);
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) sc(c, 0.022, 0.46, 0.022, mat.preto, lx * 0.19, 0.23, lz * 0.17);
    };
    const m = {
      tapete(u, w, a, b, mt) { const t = new THREE.Mesh(new THREE.PlaneGeometry(a, b), mt); t.rotation.x = -Math.PI / 2; t.position.set(u, 0.018, w); t.receiveShadow = true; g.add(t); },
      cama(u, w, larg, rot, manta, mesas = [-1, 1], cabeceira = true) {
        const q = grupoRot(u, w, rot), comp = 2.0;
        sc(q, larg + 0.06, 0.3, comp, mat.tecidoCinza, 0, 0.17, 0, 0.04);
        sc(q, larg, 0.24, comp - 0.06, mat.lencol, 0, 0.43, 0.02, 0.07);
        sc(q, larg + 0.05, 0.05, comp * 0.62, mat.lencol, 0, 0.565, comp * 0.17, 0.03);
        sc(q, 0.5, 0.06, comp * 0.5, manta, larg * 0.05, 0.6, comp * 0.15, 0.02);
        for (const s of [-1, 1]) sc(q, larg / 2 - 0.1, 0.17, 0.4, mat.lencol, (s * larg) / 4, 0.64, -comp / 2 + 0.3, 0.07);
        sc(q, 0.42, 0.3, 0.13, mat.almofada, 0.1, 0.7, -comp / 2 + 0.52, 0.06);
        if (cabeceira) sc(q, larg + 0.24, 0.95, 0.08, mat.tecidoCinza, 0, 0.6, -comp / 2 - 0.04, 0.03);
        for (const s of mesas) {
          const x = s * (larg / 2 + 0.27);
          sc(q, 0.4, 0.48, 0.38, mat.carvalho, x, 0.24, -comp / 2 + 0.22, 0.02);
          cil(0.08, 0.1, 0.2, mat.abajur, x, 0.62, -comp / 2 + 0.2, q);
          ocupaQ(q, x - 0.2, -comp / 2 + 0.03, x + 0.2, -comp / 2 + 0.41);
        }
        ocupaQ(q, -larg / 2 - 0.03, -comp / 2 - 0.08, larg / 2 + 0.03, comp / 2);
      },
      nichoCama(u, w0, w1, rot) {
        // painel de madeira atrás da cabeceira e armários brancos até o teto, com arandela redonda (render do studio)
        const q = grupoRot(u, (w0 + w1) / 2, rot), L = w1 - w0;
        sc(q, L, 1.55, 0.04, mat.madeiraClara, 0, 0.775, 0.02);
        sc(q, L, PE - 1.75, 0.42, mat.laca, 0, 1.75 + (PE - 1.75) / 2 - 0.01, 0.21, 0.01);
        for (let i = 1; i < Math.round(L / 0.5); i++) caixa(0.006, PE - 1.8, 0.01, mat.lacaLinha, -L / 2 + (i * L) / Math.round(L / 0.5), 1.75 + (PE - 1.8) / 2, 0.425, q);
        sc(q, L, 0.05, 0.3, mat.madeiraClara, 0, 1.72, 0.15);
        const a = cil(0.09, 0.09, 0.02, mat.arandela, -L / 2 + 0.35, 1.25, 0.05, q, 24); a.rotation.x = Math.PI / 2;
      },
      sofa(u, w, len, rot, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, len, 0.2, 0.9, tec, 0, 0.21, 0, 0.05);
        for (const s of [-1, 1]) sc(q, 0.16, 0.56, 0.9, tec, s * (len / 2 - 0.08), 0.32, 0, 0.06);
        const n = len > 2.3 ? 3 : 2, lw = (len - 0.32) / n;
        for (let i = 0; i < n; i++) { const x = -len / 2 + 0.16 + lw * (i + 0.5); sc(q, lw - 0.02, 0.17, 0.64, tec, x, 0.39, 0.1, 0.07); sc(q, lw - 0.04, 0.4, 0.2, tec, x, 0.66, -0.32, 0.09); }
        sc(q, 0.42, 0.38, 0.13, mat.almofada, -len / 2 + 0.45, 0.66, -0.15, 0.06); sc(q, 0.4, 0.36, 0.13, mat.manta, len / 2 - 0.45, 0.65, -0.15, 0.06);
        ocupaQ(q, -len / 2, -0.45, len / 2, 0.45);
      },
      poltrona(u, w, rot, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, 0.76, 0.18, 0.74, tec, 0, 0.32, 0, 0.08); sc(q, 0.76, 0.5, 0.16, tec, 0, 0.6, -0.3, 0.08);
        for (const s of [-1, 1]) sc(q, 0.12, 0.28, 0.66, tec, s * 0.32, 0.5, 0, 0.06);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.035, 0.24, 0.035, mat.madeiraClara, s * 0.3, 0.12, t * 0.3);
        ocupaQ(q, -0.38, -0.38, 0.38, 0.38);
      },
      mesaLateral(u, w, r = 0.22, tampo = mat.carvalho) { cil(r, r, 0.03, tampo, u, 0.5, w, g, 24); cil(0.02, 0.02, 0.48, mat.preto, u, 0.25, w, g, 8); cil(r * 0.7, r * 0.7, 0.02, mat.preto, u, 0.01, w, g, 18); solido(u - r, w - r, u + r, w + r); },
      mesaCentro(u, w, a, b) { sc(g, a, 0.05, b, mat.marmore, u, 0.38, w, 0.02); sc(g, a - 0.16, 0.33, b - 0.16, mat.nogueira, u, 0.18, w, 0.02); solido(u - a / 2, w - b / 2, u + a / 2, w + b / 2); },
      mesa(u, w, a, b, rot, nCad, tampo = mat.carvalho, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, a, 0.05, b, tampo, 0, 0.745, 0, 0.02);
        for (const s of [-1, 1]) sc(q, 0.08, 0.72, b - 0.25, mat.preto, s * (a / 2 - 0.2), 0.36, 0);
        if (nCad) {
          const porLado = Math.max(1, Math.round(Math.min(nCad, a > 2.4 ? 6 : 4) / 2));
          for (let i = 0; i < porLado; i++) for (const s of [-1, 1]) cadeira(q, -a / 2 + (i + 0.5) * (a / porLado), s * (b / 2 + 0.26), s > 0 ? Math.PI : 0, tec);
          if (nCad > 2 * porLado) for (const s of [-1, 1]) cadeira(q, s * (a / 2 + 0.26), 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, tec);
        }
        ocupaQ(q, -a / 2 - 0.1, -b / 2 - 0.2, a / 2 + 0.1, b / 2 + 0.2);
      },
      mesaOval(u, w, a, b, rot, nCad, tec) {
        const q = grupoRot(u, w, rot), t = new THREE.Mesh(cilGeo(0.5, 0.5, 0.06, 40), mat.nogueira);
        t.scale.set(a, 1, b); t.position.set(0, 0.75, 0); sombra(t); q.add(t);
        sc(q, a * 0.42, 0.7, 0.2, mat.nogueira, 0, 0.36, 0, 0.03); sc(q, a * 0.3, 0.04, b * 0.5, mat.nogueira, 0, 0.02, 0, 0.02);
        const n = Math.max(2, Math.round(nCad / 2));
        for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const x = -a / 2 + 0.45 + (i * (a - 0.9)) / Math.max(1, n - 1); cadeira(q, x, s * (b / 2 + 0.22), s > 0 ? Math.PI : 0, tec); }
        ocupaQ(q, -a / 2, -b / 2 - 0.3, a / 2, b / 2 + 0.3);
      },
      mesaRedonda(u, w, r, cads, tampo = mat.carvalho) {
        cil(r, r, 0.04, tampo, u, 0.74, w, g, 32); cil(0.035, 0.035, 0.7, mat.preto, u, 0.37, w, g, 10); cil(0.22, 0.24, 0.025, mat.preto, u, 0.012, w, g, 24);
        const q = grupoRot(u, w, 0);
        for (const a of cads) { const x = Math.cos(a) * (r + 0.3), z = Math.sin(a) * (r + 0.3); cadeira(q, x, z, Math.atan2(-Math.cos(a), -Math.sin(a))); solido(u + x - 0.23, w + z - 0.23, u + x + 0.23, w + z + 0.23); }
        solido(u - r, w - r, u + r, w + r);
      },
      tvParede(u, w, rot, L) { const q = grupoRot(u, w, rot); sc(q, L * 0.86, L * 0.49, 0.04, mat.tela, 0, 1.3, 0.03, 0.01); },
      console(u, w, rot, L, h = 0.42, prof = 0.38) {
        const q = grupoRot(u, w, rot);
        sc(q, L, 0.3, prof, mat.madeiraClara, 0, h, prof / 2, 0.01);
        for (let x = -L / 2 + 0.6; x < L / 2 - 0.3; x += 0.6) caixa(0.004, 0.24, 0.01, mat.lacaLinha, x, h, prof + 0.003, q);
        ocupaQ(q, -L / 2, 0, L / 2, prof);
      },
      bancoMadeira(u, w, rot, L) { const q = grupoRot(u, w, rot); sc(q, L, 0.42, 0.42, mat.madeiraClara, 0, 0.21, 0.21, 0.015); sc(q, L * 0.4, 0.1, 0.36, mat.tecidoCinza, -L * 0.2, 0.47, 0.21, 0.04); ocupaQ(q, -L / 2, 0, L / 2, 0.42); },
      pendente(u, w, y = 1.9) { const p = new THREE.Mesh(cilGeo(0.06, 0.22, 0.18, 24), mat.pendente); p.position.set(u, y, w); g.add(p); caixa(0.008, PE - y - 0.09, 0.008, mat.preto, u, (PE + y + 0.09) / 2, w, g); },
      globo(u, w, y = 1.65) { bola(0.17, mat.globo, u, y, w); caixa(0.008, PE - y - 0.17, 0.008, mat.preto, u, (PE + y + 0.17) / 2, w, g); const a = cil(0.2, 0.2, 0.012, mat.preto, u, y, w, g, 32); a.rotation.z = Math.PI / 2; },
      trilho(u0, w0, u1, w1, n = 3) {
        const len = Math.hypot(u1 - u0, w1 - w0), ang = Math.atan2(u1 - u0, w1 - w0);
        const q = grupoRot((u0 + u1) / 2, (w0 + w1) / 2, ang); doTeto(q);
        caixa(0.035, 0.035, len, mat.preto, 0, PE - 0.02, 0, q);
        for (let i = 0; i < n; i++) { const z = -len / 2 + ((i + 0.5) * len) / n; const s = cil(0.035, 0.04, 0.13, mat.preto, 0, PE - 0.12, z, q, 14); s.rotation.x = 0.5; }
      },
      luminariaChao(u, w) { sc(g, 0.28, 0.03, 0.28, mat.preto, u, 0.015, w); sc(g, 0.025, 1.45, 0.025, mat.preto, u, 0.75, w); cil(0.16, 0.2, 0.26, mat.abajur, u, 1.55, w); solido(u - 0.14, w - 0.14, u + 0.14, w + 0.14); },
      planta(u, w, s = 1) {
        cil(0.2 * s, 0.15 * s, 0.42 * s, s > 0.95 ? mat.vasoEsc : mat.vaso, u, 0.21 * s, w, g, 20);
        for (let i = 0; i < 5; i++) { const f = sombra(new THREE.Mesh(icoGeo(+((0.3 - i * 0.03) * s).toFixed(3)), i % 2 ? mat.planta2 : mat.planta)); f.position.set(u + Math.sin(i * 2.1) * 0.14 * s, (0.6 + i * 0.25) * s, w + Math.cos(i * 2.1) * 0.14 * s); f.scale.set(1.15, 0.8, 1.15); g.add(f); }
        solido(u - 0.22 * s, w - 0.22 * s, u + 0.22 * s, w + 0.22 * s);
      },
      jardimVertical(eixo, v, a, b, lado, y0 = 0.25, y1 = 2.35) {
        // painel verde na parede lateral da varanda, como no render do studio
        const L = b - a, h = y1 - y0, c = (a + b) / 2;
        eixo === "u" ? caixa(0.05, h, L, mat.musgo, v + lado * 0.03, y0 + h / 2, c, g) : caixa(L, h, 0.05, mat.musgo, c, y0 + h / 2, v + lado * 0.03, g);
        for (let i = 0; i < Math.round(L * h * 9); i++) {
          const f = new THREE.Mesh(icoGeo(0.09), i % 3 ? mat.planta : mat.planta2), t = (i * 0.618) % 1, y = y0 + 0.08 + ((i * 0.382) % 1) * (h - 0.16);
          f.scale.set(1.3, 0.8, 1.3); eixo === "u" ? f.position.set(v + lado * 0.09, y, a + 0.08 + t * (L - 0.16)) : f.position.set(a + 0.08 + t * (L - 0.16), y, v + lado * 0.09); g.add(f);
        }
      },
      quadro(u, w, rot, k = 0, y = 1.55, s = 1) { const q = grupoRot(u, w, rot); sc(q, 0.62 * s, 0.82 * s, 0.03, mat.preto, 0, y, 0.015); const t = new THREE.Mesh(new THREE.PlaneGeometry(0.54 * s, 0.74 * s), mat.quadros[k % mat.quadros.length]); t.position.set(0, y, 0.032); q.add(t); },
      armario(u, w, prof, larg, rot, mt = mat.madeiraClara) {
        const q = grupoRot(u, w, rot);
        sc(q, larg, PE - 0.05, prof, mt, 0, (PE - 0.05) / 2, 0, 0.01);
        const n = Math.max(2, Math.round(larg / 0.5));
        for (let i = 1; i < n; i++) caixa(0.006, PE - 0.2, 0.01, mat.lacaLinha, -larg / 2 + (i * larg) / n, (PE - 0.05) / 2, prof / 2 + 0.002, q);
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
      cozinha(u0, w0, u1, w1, { pia, cooktop, forno = true, altos = true } = {}) {
        // marcenaria em madeira clara, tampo branco, cuba inox, cooktop de indução e forno embutido
        const A = u1 - u0, B = w1 - w0, cu = (u0 + u1) / 2, cw = (w0 + w1) / 2, horiz = A >= B;
        const prof = horiz ? B : A;
        sc(g, A - 0.03, 0.1, B - 0.05, mat.preto, cu, 0.05, cw);
        sc(g, A - 0.01, 0.76, B - 0.02, mat.madeiraClara, cu, 0.48, cw, 0.008);
        sc(g, A + 0.02, 0.035, B + 0.02, mat.quartzo, cu, 0.88, cw);
        const ao = (p) => (horiz ? [p, cw] : [cu, p]);
        if (pia !== undefined) { const [pu, pw] = ao(pia); caixa(horiz ? 0.5 : 0.38, 0.012, horiz ? 0.38 : 0.5, mat.inox, pu, 0.9, pw, g); caixa(0.025, 0.28, 0.025, mat.inox, pu + (horiz ? 0 : -prof * 0.32), 1.02, pw + (horiz ? -prof * 0.32 : 0), g); }
        if (cooktop !== undefined) {
          const [pu, pw] = ao(cooktop); caixa(horiz ? 0.58 : 0.5, 0.008, horiz ? 0.5 : 0.58, mat.preto, pu, 0.9, pw, g);
          if (forno) {
            if (horiz) { caixa(0.58, 0.56, 0.02, mat.forno, pu, 0.5, w1 + 0.002, g); caixa(0.48, 0.025, 0.03, mat.inox, pu, 0.72, w1 + 0.02, g); }
            else { caixa(0.02, 0.56, 0.58, mat.forno, u1 + 0.002, 0.5, pw, g); caixa(0.03, 0.025, 0.48, mat.inox, u1 + 0.02, 0.72, pw, g); }
          }
        }
        if (altos) {
          if (horiz) { sc(g, A, 0.7, 0.34, mat.madeiraClara, cu, 1.95, w0 + 0.17, 0.01); caixa(A - 0.06, 0.012, 0.03, mat.ledFita, cu, 1.594, w0 + 0.3, g); }
          else { sc(g, 0.34, 0.7, B, mat.madeiraClara, u0 + 0.17, 1.95, cw, 0.01); caixa(0.03, 0.012, B - 0.06, mat.ledFita, u0 + 0.3, 1.594, cw, g); }
        }
        solido(u0, w0, u1, w1);
      },
      coifa(u, w) { sc(g, 0.45, 0.12, 0.6, mat.inox, u, 1.62, w, 0.01); },
      bar(u0, w0, u1, w1) { sc(g, u1 - u0, 0.04, w1 - w0, mat.quartzo, (u0 + u1) / 2, 1.0, (w0 + w1) / 2); sc(g, u1 - u0 - 0.06, 0.98, w1 - w0 - 0.1, mat.madeiraClara, (u0 + u1) / 2, 0.49, (w0 + w1) / 2, 0.01); solido(u0, w0, u1, w1); },
      armarioAlto(u0, w0, u1, w1) { sc(g, u1 - u0, 0.7, w1 - w0, mat.madeiraClara, (u0 + u1) / 2, 1.95, (w0 + w1) / 2, 0.01); },
      geladeira(u, w, rot, m0 = mat.inox) { const q = grupoRot(u, w, rot); sc(q, 0.66, 1.86, 0.66, m0, 0, 0.93, 0, 0.03); caixa(0.64, 0.008, 0.01, mat.preto, 0, 1.22, 0.333, q); caixa(0.02, 0.4, 0.025, mat.preto, 0.28, 1.45, 0.345, q); caixa(0.02, 0.32, 0.025, mat.preto, 0.28, 0.95, 0.345, q); ocupaQ(q, -0.33, -0.33, 0.33, 0.33); },
      ilhaVerde(u, w, a, b, rot) {
        // ilha com frente em canelado verde e tampo de mármore verde, cooktop e coifa cilíndrica (render do living gourmet)
        const q = grupoRot(u, w, rot);
        sc(q, a, 0.04, b, mat.marmoreVerde, 0, 0.9, 0, 0.02);
        sc(q, a - 0.1, 0.86, b - 0.12, mat.verdeCanelado, 0, 0.44, 0);
        const n = Math.round(a / 0.08);
        for (let i = 0; i < n; i++) for (const s of [-1, 1]) cil(0.04, 0.04, 0.86, mat.verdeCanelado, -a / 2 + 0.06 + (i * (a - 0.12)) / (n - 1), 0.44, s * (b / 2 - 0.08), q, 10);
        caixa(0.6, 0.008, 0.5, mat.preto, 0, 0.925, 0, q);
        cil(0.25, 0.25, 0.9, mat.inox, 0, PE - 0.45, 0, q, 32);
        ocupaQ(q, -a / 2, -b / 2, a / 2, b / 2);
      },
      prateleiras(u0, w, u1, rot) { const q = grupoRot((u0 + u1) / 2, w, rot), L = u1 - u0; sc(q, L, 1.1, 0.02, mat.marmoreVerde, 0, 1.45, 0.01); for (const y of [1.45, 1.8]) sc(q, L, 0.04, 0.28, mat.marmoreVerde, 0, y, 0.14); caixa(L - 0.1, 0.012, 0.02, mat.ledFita, 0, 1.42, 0.25, q); },
      banquetas(u, w, n, passo = 0.62, eixoW = true) { for (let i = 0; i < n; i++) { const d = (i - (n - 1) / 2) * passo, uu = eixoW ? u : u + d, ww = eixoW ? w + d : w; cil(0.18, 0.18, 0.06, mat.couro, uu, 0.74, ww, g, 20); sc(g, 0.025, 0.72, 0.025, mat.preto, uu, 0.36, ww); cil(0.16, 0.16, 0.012, mat.preto, uu, 0.3, ww, g, 16); solido(uu - 0.18, ww - 0.18, uu + 0.18, ww + 0.18); } },
      tanque(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.55, 0.85, 0.5, mat.loucas, 0, 0.425, 0, 0.04); ocupaQ(q, -0.28, -0.25, 0.28, 0.25); },
      lavadora(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.6, 0.85, 0.6, mat.loucas, 0, 0.425, 0, 0.03); const p = new THREE.Mesh(cilGeo(0.18, 0.18, 0.02, 24), mat.preto); p.rotation.x = Math.PI / 2; p.position.set(0, 0.47, 0.305); q.add(p); ocupaQ(q, -0.3, -0.3, 0.3, 0.3); },
      maquinas(u, w, n, rot) {
        const q = grupoRot(u, w, rot);
        for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.66; sc(q, 0.6, 0.84, 0.6, mat.loucas, x, 0.42, 0.3, 0.04); const pt = new THREE.Mesh(cilGeo(0.19, 0.19, 0.02, 24), i % 2 ? mat.preto : mat.inox); pt.rotation.x = Math.PI / 2; pt.position.set(x, 0.46, 0.61); q.add(pt); }
        ocupaQ(q, -n * 0.33, 0, n * 0.33, 0.62);
      },
      ar(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.8, 0.6, 0.28, mat.ar, 0, 0.32, 0.16, 0.02); const f = cil(0.21, 0.21, 0.02, mat.preto, 0.12, 0.33, 0.3, q, 24); f.rotation.x = Math.PI / 2; sc(q, 0.8, 0.04, 0.3, mat.aco, 0, 0.02, 0.16); ocupaQ(q, -0.4, 0, 0.4, 0.3); },
      cortina(eixo, v, a, b, lado) {
        // cortina de voal clara, recolhida nas pontas
        const dentro = lado ?? (v > 0 ? -1 : 1);
        for (const ld of [0, 1]) for (let i = 0; i < 4; i++) {
          const p = ld ? b - 0.12 - i * 0.08 : a + 0.12 + i * 0.08;
          if (eixo === "w") caixa(0.09, PE - 0.12, 0.04, mat.voal, p, (PE - 0.12) / 2 + 0.02, v + dentro * (0.17 + (i % 2) * 0.03), g);
          else caixa(0.04, PE - 0.12, 0.09, mat.voal, v + dentro * (0.17 + (i % 2) * 0.03), (PE - 0.12) / 2 + 0.02, p, g);
        }
        eixo === "w" ? caixa(b - a, 0.03, 0.03, mat.preto, (a + b) / 2, PE - 0.06, v + dentro * 0.18, g) : caixa(0.03, 0.03, b - a, mat.preto, v + dentro * 0.18, PE - 0.06, (a + b) / 2, g);
      },
      /* banheiro */
      box(u0, w0, u1, w1, vidros = ["w1"]) {
        caixa(u1 - u0 - 0.03, 0.025, w1 - w0 - 0.03, mat.pedra, (u0 + u1) / 2, 0.012, (w0 + w1) / 2, g);
        for (const vd of vidros) {
          if (vd === "w1" || vd === "w0") { const w = vd === "w1" ? w1 : w0; caixa(u1 - u0, 1.95, 0.012, mat.vidro, (u0 + u1) / 2, 0.99, w, g); caixa(u1 - u0, 0.025, 0.03, mat.preto, (u0 + u1) / 2, 1.97, w, g); }
          if (vd === "u0") { caixa(0.012, 1.95, w1 - w0, mat.vidro, u0, 0.99, (w0 + w1) / 2, g); caixa(0.03, 0.025, w1 - w0, mat.preto, u0, 1.97, (w0 + w1) / 2, g); }
        }
        const cx = (u0 + u1) / 2, cz = (w0 + w1) / 2;
        cil(0.11, 0.11, 0.012, mat.preto, cx, 2.18, cz, g, 24); caixa(0.02, 0.02, 0.3, mat.preto, cx, 2.2, cz - 0.15, g);
        solido(u0, w0, u1, w1);
      },
      vaso(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.36, 0.38, 0.5, mat.loucas, 0, 0.19, 0.04, 0.13); sc(q, 0.38, 0.04, 0.5, mat.loucas, 0, 0.4, 0.05, 0.02); sc(q, 0.36, 0.08, 0.16, mat.loucas, 0, 0.42, -0.24, 0.03); caixa(0.12, 0.06, 0.01, mat.preto, 0, 1.0, -0.33, q); ocupaQ(q, -0.19, -0.33, 0.19, 0.3); },
      pia(u, w, rot, larg = 0.6, prof = 0.45) {
        const q = grupoRot(u, w, rot);
        sc(q, larg, 0.36, prof, mat.madeiraClara, 0, 0.66, prof / 2, 0.015); sc(q, larg + 0.02, 0.03, prof + 0.02, mat.quartzo, 0, 0.855, prof / 2 + 0.005);
        sc(q, 0.38, 0.1, 0.3, mat.loucas, 0, 0.92, prof / 2, 0.04); caixa(0.025, 0.22, 0.025, mat.preto, 0, 1.0, 0.06, q);
        caixa(larg - 0.06, 0.8, 0.02, mat.espelho, 0, 1.6, 0.012, q); caixa(larg - 0.06, 0.018, 0.03, mat.ledFita, 0, 2.03, 0.03, q);
        ocupaQ(q, -larg / 2, 0, larg / 2, prof);
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
      espelhoParede(eixo, v, a, b) { const c = (a + b) / 2; eixo === "u" ? caixa(0.02, 2.0, b - a, mat.espelho, v, 1.2, c, g) : caixa(b - a, 2.0, 0.02, mat.espelho, c, 1.2, v, g); },
      bola(u, w, r, m0) { bola(r, m0, u, r, w); solido(u - r, w - r, u + r, w + r); },
      sinuca(u, w, rot) {
        const q = grupoRot(u, w, rot);
        sc(q, 2.62, 0.16, 1.48, mat.nogueira, 0, 0.72, 0, 0.04); sc(q, 2.34, 0.02, 1.2, mat.feltro, 0, 0.81, 0);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.14, 0.66, 0.14, mat.nogueira, s * 1.1, 0.33, t * 0.55);
        for (let i = 0; i < 6; i++) bola(0.03, mat.bolas[i % mat.bolas.length], 0.55 + (i % 3) * 0.06, 0.85, -0.06 + Math.floor(i / 3) * 0.07, q);
        ocupaQ(q, -1.31, -0.74, 1.31, 0.74);
      },
      pingpong(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 2.74, 0.04, 1.52, mat.mesaAzul, 0, 0.76, 0, 0.01); caixa(2.74, 0.004, 0.02, mat.loucas, 0, 0.782, 0, q); caixa(0.02, 0.15, 1.7, mat.preto, 0, 0.85, 0, q); for (const s of [-1, 1]) sc(q, 0.08, 0.74, 1.2, mat.aco, s * 0.9, 0.37, 0); ocupaQ(q, -1.37, -0.76, 1.37, 0.76); },
      pebolim(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 1.4, 0.3, 0.76, mat.nogueira, 0, 0.78, 0, 0.02); caixa(1.24, 0.01, 0.62, mat.feltro, 0, 0.9, 0, q); for (let i = 0; i < 6; i++) caixa(0.025, 0.025, 1.1, mat.inox, -0.55 + i * 0.22, 0.95, 0, q); for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.08, 0.64, 0.08, mat.nogueira, s * 0.62, 0.32, t * 0.3); ocupaQ(q, -0.7, -0.55, 0.7, 0.55); },
      mesinha(u, w) {
        sc(g, 0.9, 0.04, 0.9, mat.loucas, u, 0.5, w, 0.02);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(g, 0.04, 0.48, 0.04, mat.loucas, u + s * 0.38, 0.24, w + t * 0.38);
        [[0, 0.68, mat.vermelho], [0, -0.68, mat.azul], [0.68, 0, mat.amarelo], [-0.68, 0, mat.verde]].forEach(([a, b, c]) => sc(g, 0.3, 0.3, 0.3, c, u + a, 0.15, w + b, 0.04));
        solido(u - 0.85, w - 0.85, u + 0.85, w + 0.85);
      },
      cabana(u, w) { cil(0.02, 0.75, 1.7, mat.lona, u, 0.85, w, g, 6); solido(u - 0.7, w - 0.7, u + 0.7, w + 0.7); },
      casinha(u, w) { sc(g, 1.4, 1.1, 1.2, mat.amarelo, u, 0.55, w, 0.03); const t = sc(g, 1.0, 0.08, 1.4, mat.vermelho, u - 0.33, 1.32, w, 0.02); t.rotation.z = 0.7; const t2 = sc(g, 1.0, 0.08, 1.4, mat.vermelho, u + 0.33, 1.32, w, 0.02); t2.rotation.z = -0.7; caixa(0.5, 0.7, 0.02, mat.preto, u, 0.35, w + 0.61, g); solido(u - 0.75, w - 0.65, u + 0.75, w + 0.65); },
      escorregador(u, w, rot) { const q = grupoRot(u, w, rot); for (const s of [-1, 1]) sc(q, 0.06, 1.5, 0.06, mat.amarelo, s * 0.35, 0.75, -0.6); sc(q, 0.8, 0.06, 0.8, mat.azul, 0, 1.5, -0.6, 0.02); const r = sc(q, 0.6, 0.04, 2.0, mat.vermelho, 0, 0.82, 0.55, 0.02); r.rotation.x = 0.6; ocupaQ(q, -0.45, -1.0, 0.45, 1.5); },
      balanco(u, w, rot) { const q = grupoRot(u, w, rot); for (const s of [-1, 1]) for (const t of [-1, 1]) { const p = sc(q, 0.07, 2.2, 0.07, mat.nogueira, s * 1.0, 1.05, t * 0.5); p.rotation.x = t * 0.2; } sc(q, 2.2, 0.08, 0.08, mat.nogueira, 0, 2.1, 0); for (const x of [-0.45, 0.45]) { caixa(0.01, 1.5, 0.01, mat.preto, x - 0.18, 1.3, 0, q); caixa(0.01, 1.5, 0.01, mat.preto, x + 0.18, 1.3, 0, q); sc(q, 0.45, 0.04, 0.2, mat.vermelho, x, 0.52, 0, 0.01); } ocupaQ(q, -1.1, -0.6, 1.1, 0.6); },
      puff(u, w, m0) { const o = bola(0.38, m0, u, 0.22, w); o.scale.set(1, 0.6, 1); solido(u - 0.35, w - 0.35, u + 0.35, w + 0.35); },
      espreguicadeira(u, w, rot, m0 = mat.lona) {
        const q = grupoRot(u, w, rot);
        sc(q, 0.66, 0.08, 1.9, mat.madeiraClara, 0, 0.28, 0, 0.02); sc(q, 0.6, 0.07, 1.22, m0, 0, 0.35, 0.32, 0.03);
        const e = sc(q, 0.6, 0.07, 0.64, m0, 0, 0.56, -0.6, 0.03); e.rotation.x = 0.7;
        for (const s of [-1, 1]) for (const t of [-0.8, 0.8]) sc(q, 0.05, 0.24, 0.05, mat.madeiraClara, s * 0.27, 0.12, t);
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
        for (let u = u0 + 0.25; u < u1; u += 0.45) sc(g, 0.06, 0.1, w1 - w0 + 0.3, mat.madeiraClara, u, h + 0.19, (w0 + w1) / 2);
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
      armarios(u, w, rot, larg, alt = 2.0) { // armários de entregas e maleiro
        const q = grupoRot(u, w, rot); sc(q, larg, alt, 0.55, mat.aco, 0, alt / 2, 0.275, 0.01);
        for (let x = -larg / 2 + 0.45; x < larg / 2 - 0.05; x += 0.45) caixa(0.008, alt - 0.1, 0.01, mat.preto, x, alt / 2, 0.556, q);
        for (let y = 0.4; y < alt; y += 0.4) caixa(larg - 0.04, 0.008, 0.01, mat.preto, 0, y, 0.556, q);
        ocupaQ(q, -larg / 2, 0, larg / 2, 0.55);
      },
    };
    emMoveis = true; MOVEIS[nomePlanta]?.(m, mat); emMoveis = false;

    // diagnóstico: nada de móvel na frente de portas e vãos
    for (const vo of vaosLocal) {
      const bd = vo.banda;
      const [ua, ub, wa, wb] = vo.eixo === "w" ? [vo.a, vo.b, vo.v - bd, vo.v + bd] : [vo.v - bd, vo.v + bd, vo.a, vo.b];
      for (const o of obstLocal) if (o[4] && o[0] < ub && o[2] > ua && o[1] < wb && o[3] > wa) E.conflitos.push({ unidade: idx, planta: nomePlanta, vao: vo.nome, linha: `${vo.eixo}=${vo.v}`, de: +vo.a.toFixed(2), ate: +vo.b.toFixed(2), movel: o.slice(0, 4).map((x) => +x.toFixed(2)) });
    }
    fundirGrupo(g, (mesh) => E.tampas.push(mesh));
    for (const [u0, w0, u1, w1] of obstLocal) {
      const p = mundo(u0, w0), q = mundo(u1, w1);
      E.obst.push([Math.min(p.x, q.x), Math.min(p.z, q.z), Math.max(p.x, q.x), Math.max(p.z, q.z)]);
    }
    const un = { g, planta, nome: nomePlanta, pos, idx, centro: mundo, comodos };
    E.unidades.push(un);
    return un;
  }

  /* núcleo, corredores e fechamentos do andar em "H" */
  function construirNucleo(a, tipo, xFrente) {
    const n = new THREE.Group(); interior.add(n);
    const sb = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
    const aberto = tipo === "rooftop";
    const piso = (x0, z0, x1, z1) => {
      const w = x1 - x0, d = z1 - z0, pg = new THREE.PlaneGeometry(w, d), uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 1.8, (uv.getY(i) * d) / 1.8);
      const p = new THREE.Mesh(pg, aberto ? mat.deckExt : mat.corredor); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2); p.receiveShadow = true; p.userData.temp = true; n.add(p);
      if (!aberto) { const t = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.teto); t.rotation.x = Math.PI / 2; t.position.set((x0 + x1) / 2, PE + 0.03, (z0 + z1) / 2); t.visible = false; t.castShadow = true; t.userData.temp = true; n.add(t); E.tetos.push(t); }
    };
    piso(-10.2, 13.2, xFrente, 14.9); piso(-10.2, -14.9, 10.2, -13.2); piso(-0.84, -13.2, 0.66, 13.2);
    // núcleo: elevadores voltados para o corredor da ala e escada nos fundos
    sb(caixa(7.8, PE + 0.02, 10.4, mat.nucleo, 4.68, PE / 2 + 0.01, -7.93, n));
    E.tampas.push(caixa(7.84, 0.02, 10.44, mat.tampa, 4.68, PE + 0.03, -7.93, n));
    for (const z of [-4.2, -5.9, -7.6]) { caixa(0.03, 2.1, 1.0, mat.elevador, 0.77, 1.05, z, n); caixa(0.05, 0.06, 1.16, mat.inox, 0.78, 2.15, z, n); caixa(0.035, 2.1, 0.02, mat.preto, 0.775, 1.05, z, n); E.tampas.push(caixa(2.0, 0.02, 1.5, mat.preto, 2.0, PE + 0.045, z, n)); }
    caixa(0.02, 0.18, 0.1, mat.led, 0.77, 1.2, -5.05, n);
    caixa(0.03, 2.1, 0.92, mat.portaCorta, 0.77, 1.05, -11.6, n);
    // fechamentos do corredor onde ele encosta nos pátios laterais, com janela
    const fech = (eixo, v, a0, a1) => {
      const L = a1 - a0, c = (a0 + a1) / 2;
      if (L < 0.05) return;
      if (aberto) { eixo === "x" ? caixa(0.03, 1.1, L, mat.malha, v, 0.55, c, n) : caixa(L, 1.1, 0.03, mat.malha, c, 0.55, v, n); }
      else {
        eixo === "x" ? sb(caixa(0.2, PE, L, mat.parede, v, PE / 2, c, n)) : sb(caixa(L, PE, 0.2, mat.parede, c, PE / 2, v, n));
        const jl = Math.min(1.2, L - 0.4);
        if (jl > 0.4) eixo === "x" ? caixa(0.22, 1.3, jl, mat.vidro, v, 1.55, c, n) : caixa(jl, 1.3, 0.22, mat.vidro, c, 1.55, v, n);
        E.tampas.push(eixo === "x" ? caixa(0.22, 0.02, L, mat.tampa, v, PE + 0.01, c, n) : caixa(L, 0.02, 0.22, mat.tampa, c, PE + 0.01, v, n));
      }
      E.obst.push(eixo === "x" ? [v - 0.12, a0, v + 0.12, a1] : [a0, v - 0.12, a1, v + 0.12]);
    };
    fech("x", -10.2, 13.2, 14.9); fech("x", xFrente, 13.2, 14.9); fech("z", 13.2, -10.2, -7.49); fech("z", 13.2, 7.31, xFrente);
    fech("x", -10.2, -14.9, -13.2); fech("x", 10.2, -14.9, -13.2); fech("z", -13.2, -10.2, -7.49); fech("z", -13.2, 8.6, 10.2);
    if (!aberto) for (const [x, z] of [[-6, 14.05], [5, 14.05], [-6, -14.05], [5, -14.05], [-0.09, -8], [-0.09, 0], [-0.09, 8]]) caixa(0.2, 0.012, 0.2, mat.spot, x, PE - 0.008, z, n);
    E.obst.push([0.76, -13.13, 8.58, -2.74]);
  }

  /* ---------------- mobília de cada planta (medidas da planta de vendas) ---------------- */
  const MOVEIS = {
    studio(m, mat) {
      // cozinha linear: geladeira, cuba e cooktop com forno na parede esquerda
      m.geladeira(0.44, 0.84, Math.PI / 2);
      m.cozinha(0.1, 1.2, 0.72, 2.72, { pia: 1.72, cooktop: 2.38 });
      // banho
      m.vaso(2.25, 0.45, 0); m.box(2.62, 0.1, 3.47, 1.48, ["u0", "w1"]); m.pia(3.47, 1.86, -Math.PI / 2, 0.62, 0.44);
      // living e quarto: banco de madeira sob a TV, mesa redonda junto à varanda, cama no nicho de madeira
      m.bancoMadeira(0.1, 3.5, Math.PI / 2, 1.3); m.tvParede(0.1, 3.5, Math.PI / 2, 1.05);
      m.mesaRedonda(0.82, 4.98, 0.36, [-2.0, -0.5]); m.globo(0.82, 4.98, 1.62);
      m.nichoCama(3.47, 2.36, 4.75, -Math.PI / 2);
      m.cama(2.38, 3.53, 1.36, -Math.PI / 2, mat.mantaBege, [-1, 1], false);
      m.tapete(2.17, 3.85, 1.55, 2.85, mat.tapeteCinza);
      m.trilho(1.8, 2.55, 1.8, 5.2, 4);
      m.cortina("w", 5.5, 0, 2.3, -1);
      // varanda com jardim vertical e poltrona; máquina de lavar na área técnica
      m.jardimVertical("u", 0.1, 5.62, 6.55, 1);
      m.planta(0.4, 6.3, 0.7); m.poltrona(1.08, 6.18, Math.PI * 1.08, mat.tecidoClaro);
      m.lavadora(3.0, 6.28, Math.PI);
    },
    um(m, mat) {
      // cozinha integrada na parede esquerda e bancada de refeições junto ao banho
      m.geladeira(0.44, 0.8, Math.PI / 2);
      m.cozinha(0.1, 1.2, 0.7, 2.7, { pia: 1.75, cooktop: 2.4 }); m.coifa(0.32, 2.4);
      m.bar(2.08, 0.13, 2.54, 1.54); m.banquetas(1.95, 0.9, 2, 0.6);
      // living: TV com painel de madeira, sofá encostado na parede do dormitório
      m.console(0.1, 4.0, Math.PI / 2, 2.4, 0.38, 0.36); m.tvParede(0.1, 4.0, Math.PI / 2, 1.2);
      m.sofa(2.09, 3.9, 2.1, -Math.PI / 2, mat.tecidoClaro); m.tapete(1.55, 3.95, 1.6, 2.5, mat.tapeteEscuro);
      m.mesaLateral(1.35, 2.85, 0.2); m.quadro(2.53, 3.4, -Math.PI / 2, 0, 1.55, 0.8); m.quadro(2.53, 4.3, -Math.PI / 2, 2, 1.55, 0.8);
      m.planta(0.4, 5.15, 0.8);
      m.cortina("w", 5.45, 0, 2.6, -1);
      // banho
      m.pia(3.03, 0.1, 0, 0.7, 0.42); m.vaso(3.78, 0.45, 0); m.box(4.17, 0.1, 5.0, 1.39, ["u0"]);
      // dormitório: armário de 1,80 m, cama com cabeceira na parede, criado-mudo junto à janela
      m.armario(4.725, 2.48, 0.55, 1.8, -Math.PI / 2);
      m.cama(3.9, 4.16, 1.4, -Math.PI / 2, mat.mantaBege, [1]);
      m.tapete(3.75, 4.15, 2.0, 2.3, mat.tapeteAzul);
      m.cortina("w", 5.45, 2.6, 3.6, -1);
      // varanda e área técnica
      m.ar(0.1, 6.05, Math.PI / 2); m.planta(0.95, 6.32, 0.95); m.poltrona(2.95, 6.15, Math.PI * 0.92, mat.tecidoClaro); m.mesaLateral(2.35, 6.4, 0.17);
      m.lavadora(4.55, 6.28, Math.PI);
    },
    gstudio(m, mat) {
      MOVEIS.studio(m, mat);
      m.espreguicadeira(2.0, 7.95, Math.PI / 2); m.floreira(0.15, 8.75, 3.42, 9.1); m.planta(0.5, 7.2, 1.0); m.planta(3.1, 7.2, 0.8);
    },
    brinquedoteca(m, mat) {
      m.tapete(4.6, 3.6, 6.4, 4.2, mat.tapeteKids); m.mesinha(3.0, 3.6); m.cabana(1.2, 5.4); m.casinha(6.4, 4.6);
      m.estante(5.1, 0.1, 0, 3.2); m.puff(8.0, 5.4, mat.vermelho); m.puff(8.8, 4.8, mat.azul); m.puff(9.0, 5.8, mat.amarelo);
      m.escorregador(1.4, 2.0, Math.PI / 2); m.planta(9.6, 6.1, 0.9);
    },
    jogos(m, mat) {
      m.sinuca(3.0, 3.6, 0); m.pendente(2.5, 3.6, 1.95); m.pendente(3.5, 3.6, 1.95);
      m.pingpong(6.7, 4.4, Math.PI / 2); m.pebolim(9.0, 3.4, Math.PI / 2);
      m.sofa(3.0, 6.05, 2.4, Math.PI, mat.couro); m.tvParede(10.1, 3.6, -Math.PI / 2, 1.6); m.planta(9.6, 6.1, 1.0); m.planta(0.6, 6.1, 0.9);
    },
    gourmet(m, mat) {
      // como no render: bancada com prateleiras em mármore verde, ilha canelada verde com coifa cilíndrica,
      // mesa oval de madeira com cadeiras verdes e estar com poltronas claras e sofá laranja
      m.cozinha(0.6, 0.1, 5.4, 0.72, { pia: 1.6, altos: false, forno: false }); m.prateleiras(0.6, 0.1, 5.4, 0);
      m.geladeira(5.85, 0.45, 0, mat.preto);
      m.ilhaVerde(3.0, 2.3, 2.6, 0.95, 0);
      m.mesaOval(7.2, 3.6, 3.4, 1.25, 0, 8, mat.tecidoVerde); m.pendente(6.4, 3.6, 1.9); m.pendente(8.0, 3.6, 1.9);
      m.sofa(11.4, 5.95, 2.4, Math.PI, mat.laranja); m.poltrona(10.3, 3.8, 0.4, mat.tecidoClaro); m.poltrona(12.3, 3.8, -0.4, mat.tecidoClaro); m.mesaCentro(11.4, 4.9, 1.1, 0.6);
      m.tapete(11.3, 4.7, 3.4, 2.8, mat.tapete1); m.quadro(0.1, 4.6, Math.PI / 2, 0, 1.55, 1.3); m.planta(13.0, 0.6, 1.1); m.planta(5.3, 6.15, 1.0);
    },
    lounge(m, mat) {
      for (const u of [3.4, 9.6]) { m.sofa(u, 4.1, 2.4, 0, mat.tecido2); m.mesaCentro(u, 5.2, 1.0, 0.55); m.poltrona(u - 1.6, 5.4, Math.PI / 2, mat.couro); m.poltrona(u + 1.6, 5.4, -Math.PI / 2, mat.couro); m.tapete(u, 5.0, 3.6, 2.6, mat.tapete1); }
      m.estante(12.4, 0.1, 0, 1.4, 2.0, false); m.planta(6.5, 6.15, 1.0); m.planta(0.6, 6.15, 1.0); m.tvParede(13.1, 3.4, -Math.PI / 2, 1.8);
    },
    lavanderia(m, mat) { m.maquinas(4.3, 6.55, 6, Math.PI); m.mesa(4.3, 3.2, 2.0, 0.8, 0, 0, mat.laca); m.tanque(7.4, 1.2, -Math.PI / 2); m.planta(7.3, 4.6, 0.8); },
    delivery(m, mat) { m.armarios(3.2, 6.55, Math.PI, 5.0); m.armarios(0.1, 3.0, Math.PI / 2, 2.4, 1.8); m.banco(3.4, 3.4, Math.PI / 2); m.planta(7.3, 6.1, 0.9); },
    externo1(m, mat) {
      m.escorregador(3.0, 3.6, 0); m.balanco(6.6, 3.4, 0); m.tapete(4.8, 3.6, 7.4, 4.6, mat.borrachaPlay);
      m.pergola(11.0, 1.2, 17.6, 5.8); m.mesa(14.3, 3.5, 2.4, 1.0, 0, 6, mat.madeiraClara);
      m.floreira(0.2, 6.0, 20.2, 6.5); m.espreguicadeira(19.3, 2.6, 0); m.planta(10.0, 1.0, 1.1);
    },
    piscina(m, mat) {
      m.piscina(2.2, 2.6, 18.2, 6.0, 2.6);
      m.espreguicadeira(3.0, 4.3, 0); m.espreguicadeira(3.9, 4.3, 0);
      for (const u of [6, 7.6, 9.2, 10.8, 12.4, 14.0, 15.6]) m.espreguicadeira(u, 1.3, 0);
      m.guardaSol(6.8, 1.3); m.guardaSol(11.6, 1.3); m.guardaSol(14.8, 1.3);
      m.floreira(19.0, 0.4, 20.1, 6.3); m.planta(1.0, 1.0, 1.2);
    },
    lareira(m, mat) {
      m.pergola(6.0, 1.2, 14.4, 6.0); m.fogueira(10.2, 3.6);
      m.sofa(10.2, 5.4, 2.8, Math.PI, mat.tecidoClaro); m.sofa(7.9, 3.6, 2.2, Math.PI / 2, mat.tecidoClaro); m.sofa(12.5, 3.6, 2.2, -Math.PI / 2, mat.tecidoClaro);
      m.tapete(10.2, 3.6, 4.8, 3.8, mat.tapete3); m.floreira(0.3, 0.6, 4.6, 6.2); m.floreira(15.8, 0.6, 20.1, 6.2);
    },
    fitness(m, mat) {
      for (const u of [1.8, 2.9, 4.0, 5.1]) m.esteira(u, 5.5, 0);
      for (const u of [6.6, 7.5, 8.4]) m.bike(u, 5.9, 0);
      m.espelhoParede("u", 0.11, 0.8, 4.2); m.rack(0.1, 2.5, Math.PI / 2, 2.2);
      m.banco(10.4, 3.4, 0); m.estacao(12.2, 4.6, -Math.PI / 2); m.tatame(9.6, 0.4, 12.6, 2.4); m.bola(10.5, 1.4, 0.32, mat.azul);
      m.planta(13.0, 6.2, 1.0);
    },
    coworking(m, mat) {
      m.mesa(3.4, 3.8, 3.0, 1.0, Math.PI / 2, 6, mat.madeiraClara); m.mesa(6.6, 3.8, 3.0, 1.0, Math.PI / 2, 6, mat.madeiraClara);
      for (const u of [3.4, 6.6]) { m.pendente(u, 3.1, 1.95); m.pendente(u, 4.5, 1.95); }
      for (const w of [3.6, 4.8]) m.cabine(12.62, w, -Math.PI / 2);
      m.estante(9.6, 0.1, 0, 2.4, 2.0, false); m.planta(12.6, 0.8, 1.0); m.planta(0.6, 6.15, 1.1);
    },
    solario(m, mat) {
      m.cozinha(0.1, 0.4, 0.72, 4.4, { pia: 2.0, altos: false, forno: false }); m.banquetas(1.15, 2.4, 5, 0.66);
      for (const u of [3.8, 5.3, 6.8, 8.3, 9.8, 11.3, 12.8]) m.espreguicadeira(u, 4.6, 0);
      for (const u of [4.55, 7.55, 10.55]) m.guardaSol(u, 4.4);
      m.floreira(14.2, 0.4, 15.6, 6.3); m.planta(2.0, 6.0, 1.0);
    },
  };

  return { construirUnidade, construirNucleo };
}
