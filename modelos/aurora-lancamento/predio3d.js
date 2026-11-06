/* Residencial Aurora — prédio em 3D
   - topo da página: torre ao entardecer, janelas apagadas
   - passar o mouse num andar acende as luzes; clicar abre o andar em corte com a planta 3D
   - na planta: clicar num cômodo mostra a foto do ambiente; "Visualizar por dentro" anda com W A S D */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const host = document.getElementById("x3d");
const hero = host?.closest(".hero");
const canvas = document.createElement("canvas");
let gl = null;
try { gl = canvas.getContext("webgl2", { antialias: true }); } catch (e) { gl = null; }
if (host && gl) iniciar();

function iniciar() {
  hero.classList.add("tem3d");
  host.prepend(canvas);
  const $ = (s) => host.querySelector(s);
  const DADOS = window.AURORA || { U: [], T: {} };
  const celular = matchMedia("(pointer: coarse)").matches;
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- medidas do prédio (metros) ---------- */
  const W = 28, D = 15, HX = W / 2, HZ = D / 2;
  const N = 18, H = 3.1, TERREO = 6, PE = 2.7, LAJE = 0.32;
  const baseY = (a) => TERREO + (a - 1) * H;
  const TOPO = baseY(N + 1);

  /* ---------- renderizador ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, celular ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1b1530, 0.0042);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 2500);

  /* céu do pôr do sol */
  const sunDir = new THREE.Vector3(-0.45, 0.06, -1).normalize();
  const ceuMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: sunDir } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir;
      void main(){
        float h = vP.y;
        vec3 topo = vec3(.055,.043,.13), meio = vec3(.17,.12,.3), hor = vec3(.93,.52,.45), chao = vec3(.07,.05,.11);
        vec3 c = mix(hor, meio, smoothstep(.0, .22, h));
        c = mix(c, topo, smoothstep(.18, .75, h));
        float s = max(dot(vP, sunDir), 0.);
        c += vec3(1., .62, .42) * pow(s, 6.) * (1. - smoothstep(.0, .3, h)) * .9;
        c += vec3(1., .78, .6) * pow(s, 60.) * .6;
        c = mix(chao, c, smoothstep(-.06, .01, h));
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), ceuMat);
  scene.add(ceu);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ceuScene = new THREE.Scene(); ceuScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), ceuMat));
  scene.environment = pmrem.fromScene(ceuScene, 0.02).texture;

  const hemi = new THREE.HemisphereLight(0x9a8ad8, 0x1a1426, 0.75);
  scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xffb08a, 1.5); sol.position.set(-40, 26, -60); scene.add(sol);
  const preench = new THREE.DirectionalLight(0x9db0ff, 0.45); preench.position.set(30, 40, 50); scene.add(preench);
  const amb = new THREE.AmbientLight(0xffffff, 0.08); scene.add(amb);

  /* ---------- texturas geradas ---------- */
  const tela = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  // luz atrás do vidro: ambientes com intensidades diferentes, cortinas e spots no teto
  const luzTex = tela(1024, 64, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const lw = 40 + rnd() * 120, b = 0.45 + rnd() * 0.55, quente = rnd() > 0.2;
      const grd = g.createLinearGradient(0, 0, 0, h);
      const c1 = quente ? `rgba(255,${190 + rnd() * 30 | 0},${120 + rnd() * 40 | 0},${b})` : `rgba(235,240,255,${b * .8})`;
      grd.addColorStop(0, c1); grd.addColorStop(1, `rgba(255,170,110,${b * .45})`);
      g.fillStyle = grd; g.fillRect(x, 0, lw, h);
      for (let k = 0; k < lw / 18; k++) { g.fillStyle = `rgba(255,240,210,${.25 + rnd() * .3})`; g.beginPath(); g.ellipse(x + 8 + k * 18, 4, 5, 3, 0, 0, 7); g.fill(); }
      if (rnd() > 0.5) { g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(x + lw * rnd() * .6, 0, lw * .25, h); }
      x += lw; g.fillStyle = "#000"; g.fillRect(x, 0, 3, h); x += 3;
    }
  });
  const janelasCidade = tela(128, 128, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      if (rnd() > 0.8) { const q = rnd() > .3; g.fillStyle = q ? `rgba(255,${185 + rnd() * 45 | 0},130,${.35 + rnd() * .5})` : `rgba(205,215,255,${.25 + rnd() * .4})`; g.fillRect(x + 3, y + 4, 10, 8); }
    }
  });
  janelasCidade.wrapS = janelasCidade.wrapT = THREE.RepeatWrapping;
  const madeiraTex = tela(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 3) * 90; x < w; x += 270) {
      const t = 150 + rnd() * 40;
      g.fillStyle = `rgb(${t + 25 | 0},${t - 12 | 0},${t - 58 | 0})`; g.fillRect(x, y, 268, 31);
      for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(80,45,20,${.08 + rnd() * .1})`; g.beginPath(); const yy = y + 3 + rnd() * 26; g.moveTo(x, yy); g.bezierCurveTo(x + 90, yy + rnd() * 4 - 2, x + 180, yy + rnd() * 4 - 2, x + 268, yy); g.stroke(); }
      g.fillStyle = "rgba(40,22,10,.5)"; g.fillRect(x + 268, y, 2, 32); g.fillRect(x, y + 31, 270, 1);
    }
  });
  madeiraTex.wrapS = madeiraTex.wrapT = THREE.RepeatWrapping;
  const pisoTex = tela(256, 256, (g, w, h) => {
    g.fillStyle = "#d9d4cd"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${rnd() > .5 ? 255 : 120},${rnd() > .5 ? 250 : 115},${rnd() > .5 ? 245 : 110},.06)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = "rgba(120,110,100,.35)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  });
  pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping;
  const tapeteTex = tela(256, 256, (g, w, h) => {
    g.fillStyle = "#cfc2b0"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(90,70,50,${rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    g.strokeStyle = "rgba(120,95,70,.35)"; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
  });

  /* ---------- materiais ---------- */
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const mat = {
    laje: M({ color: 0xece6f0, roughness: 0.55 }),
    fachada: M({ color: 0xd7ccd3, roughness: 0.85 }),
    metal: M({ color: 0x2a2531, metalness: 0.8, roughness: 0.35 }),
    guarda: new THREE.MeshPhysicalMaterial({ color: 0xa8bdd4, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.2 }),
    lobby: M({ color: 0x1a1410, emissive: 0xffc58f, emissiveIntensity: 1.1, emissiveMap: luzTex, metalness: 0.4, roughness: 0.2 }),
    led: M({ color: 0xffb38a, emissive: 0xffb38a, emissiveIntensity: 2.2 }),
    chao: M({ color: 0x15111f, roughness: 0.95 }),
    praca: M({ color: 0x2a2436, roughness: 0.8 }),
    folha: M({ color: 0x23402f, roughness: 0.9, flatShading: true }),
    tronco: M({ color: 0x3a2a22, roughness: 1 }),
    poste: M({ color: 0xfff0d6, emissive: 0xffe2b0, emissiveIntensity: 2.5 }),
    // interior
    parede: M({ color: 0xf2ede7, roughness: 0.92 }),
    paredeTopo: M({ color: 0xbdb3c9, roughness: 0.9 }),
    madeira: M({ color: 0xffffff, map: madeiraTex, roughness: 0.55 }),
    porcelanato: M({ color: 0xffffff, map: pisoTex, roughness: 0.35 }),
    circulacao: M({ color: 0xcfc8d6, roughness: 0.5 }),
    nucleo: M({ color: 0x8c8496, roughness: 0.8 }),
    teto: M({ color: 0xf7f4f0, roughness: 0.95, side: THREE.DoubleSide }),
    spot: M({ color: 0xffffff, emissive: 0xfff1d8, emissiveIntensity: 3 }),
    vidroInt: new THREE.MeshPhysicalMaterial({ color: 0xcfe0f0, roughness: 0.03, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.4 }),
    caixilho: M({ color: 0x2d2a33, metalness: 0.6, roughness: 0.4 }),
    nogueira: M({ color: 0x5e3f2b, roughness: 0.6 }),
    carvalho: M({ color: 0xb48a62, roughness: 0.6 }),
    tecido: M({ color: 0x9d928a, roughness: 0.95 }),
    tecidoEsc: M({ color: 0x5c5a66, roughness: 0.95 }),
    lencol: M({ color: 0xf1ede6, roughness: 0.9 }),
    manta: M({ color: 0xc19a6b, roughness: 0.9 }),
    almofada: M({ color: 0xe0a77f, roughness: 0.9 }),
    preto: M({ color: 0x1d1c21, roughness: 0.4 }),
    marmore: M({ color: 0xf1efea, roughness: 0.25 }),
    loucas: M({ color: 0xf6f6f4, roughness: 0.2 }),
    armario: M({ color: 0xe6e0d8, roughness: 0.6 }),
    planta: M({ color: 0x3f6d48, roughness: 0.9, flatShading: true }),
    vaso: M({ color: 0xc9b29a, roughness: 0.8 }),
    tapete: M({ color: 0xffffff, map: tapeteTex, roughness: 1 }),
    tela: M({ color: 0x0b0b10, emissive: 0x334466, emissiveIntensity: 0.3, roughness: 0.2 }),
    pendente: M({ color: 0x2a2520, emissive: 0xffc98a, emissiveIntensity: 2.4 }),
    elevador: M({ color: 0x9aa0aa, metalness: 0.9, roughness: 0.3 }),
  };
  const vidroAndar = (a) => M({ color: 0x0c1122, metalness: 1, roughness: 0.07, envMapIntensity: 1.15, emissive: 0xffd0a0, emissiveMap: luzTex, emissiveIntensity: 0 });

  /* ---------- helpers de geometria ---------- */
  const caixa = (w, h, d, m, x, y, z, pai, r = 0) => { const g = r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); pai.add(o); return o; };

  /* ---------- entorno ---------- */
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat.chao); chao.rotation.x = -Math.PI / 2; scene.add(chao);
  caixa(W + 26, 0.25, D + 26, mat.praca, 0, 0.12, 4, scene);
  caixa(W + 3, 0.5, D + 3, mat.laje, 0, 0.25, 0, scene);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rx = (HX + 9) * Math.cos(a), rz = 4 + (HZ + 9) * Math.sin(a);
    if (Math.abs(rx) < HX + 3 && rz > 0 && rz < 18) continue;
    const t = new THREE.Group(); t.position.set(rx, 0, rz); scene.add(t);
    caixa(0.3, 2.4, 0.3, mat.tronco, 0, 1.2, 0, t);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + rnd(), 0), mat.folha); f.position.y = 3.6; t.add(f);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * .6, 0), mat.folha); f2.position.set(.8, 4.6, -.3); t.add(f2);
  }
  for (const x of [-18, -6, 6, 18]) { caixa(0.12, 4.5, 0.12, mat.metal, x, 2.25, HZ + 12, scene); const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat.poste); l.position.set(x, 4.6, HZ + 12); scene.add(l); }
  // cidade ao redor
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 110 + rnd() * 300;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 40;
    if (z > 30 && Math.abs(x) < 70) continue;
    const w = 14 + rnd() * 22, d = 14 + rnd() * 22, h = 10 + rnd() * (r < 180 ? 30 : 70);
    const t = janelasCidade.clone(); t.needsUpdate = true; t.repeat.set(w / 24, h / 25);
    const m = M({ color: 0x1b1630, roughness: 0.9, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45 + rnd() * 0.4 });
    caixa(w, h, d, m, x, h / 2, z, scene);
  }

  /* ---------- torre ---------- */
  const torre = new THREE.Group(); scene.add(torre);
  // térreo com lobby iluminado
  const terreo = new THREE.Group(); torre.add(terreo);
  caixa(W - 6, TERREO - 0.6, 0.08, mat.lobby, 0, 0.5 + (TERREO - 0.6) / 2, HZ - 2.2, terreo);
  caixa(0.08, TERREO - 0.6, D - 5, mat.lobby, -HX + 3, 0.5 + (TERREO - 0.6) / 2, 0, terreo);
  caixa(0.08, TERREO - 0.6, D - 5, mat.lobby, HX - 3, 0.5 + (TERREO - 0.6) / 2, 0, terreo);
  caixa(W - 6, TERREO - 0.6, 0.3, mat.fachada, 0, 0.5 + (TERREO - 0.6) / 2, -HZ + 2.2, terreo);
  for (let x = -HX + 1; x <= HX - 1; x += 4.5) caixa(0.6, TERREO, 0.6, mat.laje, x, TERREO / 2, HZ - 0.6, terreo);
  caixa(14, 0.35, 5, mat.laje, 0, 4.6, HZ + 1.6, terreo);
  caixa(13.6, 0.06, 4.6, mat.led, 0, 4.4, HZ + 1.6, terreo);

  const andares = [];
  const vidros = [];
  const intens = new Array(N + 1).fill(0), alvo = new Array(N + 1).fill(0);
  const pickScene = new THREE.Scene();
  const pickGeo = new THREE.BoxGeometry(W + 1, H, D + 5);
  for (let a = 1; a <= N; a++) {
    const g = new THREE.Group(); g.position.y = baseY(a); torre.add(g);
    const vidro = vidroAndar(a); vidros[a] = vidro;
    const casca = new THREE.Group(); g.add(casca);
    const hv = H - LAJE;
    caixa(W + 0.5, LAJE, D + 0.5, mat.laje, 0, LAJE / 2, 0, g);
    // frente: pele de vidro + varandas
    caixa(W - 0.3, hv, 0.06, vidro, 0, LAJE + hv / 2, HZ - 0.05, casca);
    const mont = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, hv, 0.12), mat.metal, 2 * Math.ceil(W / 2.2) + 2);
    let k = 0; const m4 = new THREE.Matrix4();
    for (let x = -HX + 1.1; x < HX; x += 2.2) { m4.makeTranslation(x, LAJE + hv / 2, HZ); mont.setMatrixAt(k++, m4); m4.makeTranslation(x, LAJE + 1.6, -HZ); mont.setMatrixAt(k++, m4); }
    mont.count = k; casca.add(mont);
    caixa(24.4, 0.26, 2.2, mat.laje, 0, 0.13, HZ + 1.1, g);
    caixa(24.4, 1.05, 0.03, mat.guarda, 0, 0.26 + 0.53, HZ + 2.18, g);
    caixa(24.4, 0.05, 0.07, mat.metal, 0, 0.26 + 1.07, HZ + 2.18, g);
    for (const x of [-12.2, 12.2]) caixa(0.03, 1.05, 2.2, mat.guarda, x, 0.26 + 0.53, HZ + 1.1, g);
    caixa(0.3, hv, 2.2, mat.fachada, 2, LAJE + hv / 2, HZ + 1.1, g);
    // fundos: peitoril + faixa de janelas
    caixa(W, 0.9, 0.22, mat.fachada, 0, LAJE + 0.45, -HZ + 0.11, casca);
    caixa(W - 0.3, 1.75, 0.06, vidro, 0, LAJE + 0.9 + 0.875, -HZ + 0.05, casca);
    caixa(W, hv - 0.9 - 1.75, 0.22, mat.fachada, 0, H - (hv - 0.9 - 1.75) / 2, -HZ + 0.11, casca);
    // laterais: parede com duas janelas
    for (const s of [-1, 1]) {
      caixa(0.24, hv, D, mat.fachada, s * (HX - 0.12), LAJE + hv / 2, 0, casca);
      for (const z of [-3.8, 3.9]) caixa(0.06, 1.75, 3.6, vidro, s * (HX + 0.01), LAJE + 1.8, z, casca);
    }
    const pk = new THREE.Mesh(pickGeo); pk.position.set(0, baseY(a) + H / 2, 2.5); pk.userData.andar = a; pickScene.add(pk);
    g.userData = { casca, y0: baseY(a), dy: 0, alvoDy: 0 };
    andares[a] = g;
  }
  // coroamento
  const coroa = new THREE.Group(); coroa.position.y = TOPO; torre.add(coroa);
  caixa(W + 0.5, LAJE, D + 0.5, mat.laje, 0, LAJE / 2, 0, coroa);
  caixa(W + 0.5, 1.2, 0.2, mat.fachada, 0, 0.9, HZ + 0.15, coroa);
  caixa(W + 0.5, 1.2, 0.2, mat.fachada, 0, 0.9, -HZ - 0.15, coroa);
  caixa(9, 3.2, 6, mat.fachada, -3, 1.9, -2, coroa);
  caixa(W + 0.6, 0.08, 0.08, mat.led, 0, 1.55, HZ + 0.28, coroa);
  const aletas = new THREE.Group(); torre.add(aletas);
  for (const s of [-1, 1]) caixa(0.5, TOPO - TERREO + 4, 1.4, mat.laje, s * (HX + 0.25), TERREO + (TOPO - TERREO + 4) / 2, HZ - 0.4, aletas);

  /* ---------- planta do andar (interior) ---------- */
  const interior = new THREE.Group(); interior.visible = false; scene.add(interior);
  const obst = [];      // caixas 2D para colisão: [x1,z1,x2,z2]
  const pisos = [];     // cômodos clicáveis
  const tetoGrupo = new THREE.Group(); tetoGrupo.visible = false; interior.add(tetoGrupo);
  const luzesInt = [];
  const ESP = 0.12;
  const FOTO = (id) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;
  const FOTOS = {
    sala: FOTO("1600607687939-ce8a6c25118c"), jantar: FOTO("1617806118233-18e1de247200"), cozinha: FOTO("1556911220-bff31c812dba"),
    master: FOTO("1616594039964-ae9021a400a0"), suite: FOTO("1631049307264-da0ec9d70304"), suite3: FOTO("1540518614846-7eded433c457"),
    banhoM: FOTO("1620626011761-996317b8d101"), banho: FOTO("1584622650111-993a426fbf0a"), lavabo: FOTO("1552321554-5fefe8c9ef14"),
    lavanderia: FOTO("1626806787461-102c1bfaaea1"), varanda: FOTO("1604014237800-1c9102c219da"), studio: FOTO("1567767292278-a4f21aa2d36e"),
  };

  function parede(x1, z1, x2, z2, { vaos = [], janelas = [], alt = PE, m = mat.parede } = {}) {
    const hor = z1 === z2, a0 = hor ? Math.min(x1, x2) : Math.min(z1, z2), a1 = hor ? Math.max(x1, x2) : Math.max(z1, z2), fixo = hor ? z1 : x1;
    const cortes = [...vaos.map((v) => ({ v, t: "porta" })), ...janelas.map((v) => ({ v, t: "janela" }))].sort((p, q) => p.v[0] - q.v[0]);
    let cur = a0;
    const pedaco = (b0, b1, y0, y1, mm = m) => {
      const len = b1 - b0; if (len <= 0.01) return;
      const c = (b0 + b1) / 2, hh = y1 - y0;
      const o = hor ? caixa(len, hh, ESP, mm, c, y0 + hh / 2, fixo, interior) : caixa(ESP, hh, len, mm, fixo, y0 + hh / 2, c, interior);
      return o;
    };
    const solido = (b0, b1) => { if (b1 - b0 > 0.01) obst.push(hor ? [b0, fixo - ESP / 2, b1, fixo + ESP / 2] : [fixo - ESP / 2, b0, fixo + ESP / 2, b1]); };
    for (const { v: [v0, v1], t } of cortes) {
      pedaco(cur, v0, 0, alt); solido(cur, v0);
      if (t === "porta") pedaco(v0, v1, 2.15, alt);
      else {
        pedaco(v0, v1, 0, 0.9); pedaco(v0, v1, 2.3, alt); solido(v0, v1);
        const len = v1 - v0, c = (v0 + v1) / 2;
        hor ? caixa(len, 1.4, 0.03, mat.vidroInt, c, 1.6, fixo, interior) : caixa(0.03, 1.4, len, mat.vidroInt, fixo, 1.6, c, interior);
      }
      cur = v1;
    }
    pedaco(cur, a1, 0, alt); solido(cur, a1);
  }
  function vidraca(x1, x2, z, portas = []) {
    const len = x2 - x1, c = (x1 + x2) / 2;
    caixa(len, PE - 0.1, 0.03, mat.vidroInt, c, (PE - 0.1) / 2 + 0.05, z, interior);
    caixa(len, 0.06, 0.08, mat.caixilho, c, 0.03, z, interior);
    caixa(len, 0.08, 0.08, mat.caixilho, c, PE - 0.04, z, interior);
    for (let x = x1; x <= x2 + 0.01; x += 1.4) caixa(0.05, PE, 0.08, mat.caixilho, Math.min(x, x2), PE / 2, z, interior);
    let cur = x1;
    for (const [p0, p1] of portas) { if (p0 > cur) obst.push([cur, z - 0.06, p0, z + 0.06]); cur = p1; }
    obst.push([cur, z - 0.06, x2, z + 0.06]);
  }
  function piso(x1, z1, x2, z2, m, info) {
    const w = x2 - x1, d = z2 - z1;
    let mm = m;
    if (m.map) { mm = m.clone(); mm.map = m.map.clone(); mm.map.needsUpdate = true; mm.map.repeat.set(w / (m === mat.madeira ? 4 : 0.9), d / (m === mat.madeira ? 4 : 0.9)); }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mm);
    p.rotation.x = -Math.PI / 2; p.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2); interior.add(p);
    if (info) { p.userData = { ...info, cx: (x1 + x2) / 2, cz: (z1 + z2) / 2, area: Math.round(w * d) }; pisos.push(p); }
    return p;
  }
  const solidoBox = (x, z, w, d) => obst.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);

  /* móveis */
  function cama(x, z, larg, rot = 0, m2 = mat.manta) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; interior.add(g);
    const comp = 2.05;
    caixa(larg + 0.1, 0.32, comp, mat.nogueira, 0, 0.16, 0, g, 0.03);
    caixa(larg, 0.24, comp - 0.08, mat.lencol, 0, 0.44, 0.03, g, 0.08);
    caixa(larg + 0.02, 0.06, 0.7, m2, 0, 0.58, comp / 2 - 0.42, g, 0.03);
    for (const s of [-1, 1]) caixa(larg / 2 - 0.12, 0.14, 0.4, mat.lencol, s * larg / 4, 0.62, -comp / 2 + 0.32, g, 0.06);
    caixa(larg + 0.5, 1.15, 0.1, mat.tecidoEsc, 0, 0.58, -comp / 2 - 0.02, g, 0.03);
    for (const s of [-1, 1]) {
      caixa(0.5, 0.5, 0.42, mat.carvalho, s * (larg / 2 + 0.45), 0.25, -comp / 2 + 0.25, g, 0.02);
      const l = caixa(0.18, 0.28, 0.18, mat.pendente, s * (larg / 2 + 0.45), 0.66, -comp / 2 + 0.25, g, 0.05); l.material = mat.pendente;
    }
    const w = rot % Math.PI === 0 ? larg + 1.4 : comp + 0.1, d = rot % Math.PI === 0 ? comp + 0.1 : larg + 1.4;
    solidoBox(x, z, w, d);
  }
  function sofa(x, z, larg, rot = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; interior.add(g);
    caixa(larg, 0.42, 0.95, mat.tecido, 0, 0.21, 0, g, 0.06);
    caixa(larg, 0.45, 0.22, mat.tecido, 0, 0.62, 0.36, g, 0.08);
    for (const s of [-1, 1]) caixa(0.2, 0.6, 0.95, mat.tecido, s * (larg / 2 - 0.1), 0.3, 0, g, 0.06);
    for (const s of [-1, 0, 1]) caixa(0.45, 0.4, 0.14, s ? mat.almofada : mat.lencol, s * larg * 0.3, 0.66, 0.2, g, 0.07);
    solidoBox(x, z, rot % Math.PI === 0 ? larg : 0.95, rot % Math.PI === 0 ? 0.95 : larg);
  }
  function mesa(x, z, w, d, cadeiras = true, m = mat.carvalho) {
    caixa(w, 0.05, d, m, x, 0.74, z, interior, 0.02);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(0.06, 0.72, 0.06, mat.preto, x + sx * (w / 2 - 0.12), 0.36, z + sz * (d / 2 - 0.12), interior);
    if (cadeiras) {
      const n = Math.max(1, Math.round(w / 0.7));
      for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
        const cx = x - w / 2 + (i + 0.5) * (w / n), cz = z + s * (d / 2 + 0.3);
        caixa(0.44, 0.06, 0.44, mat.tecidoEsc, cx, 0.45, cz, interior, 0.02);
        caixa(0.44, 0.45, 0.05, mat.tecidoEsc, cx, 0.7, cz + s * 0.2, interior, 0.02);
        for (const lx of [-1, 1]) for (const lz of [-1, 1]) caixa(0.03, 0.43, 0.03, mat.preto, cx + lx * 0.18, 0.21, cz + lz * 0.18, interior);
      }
    }
    solidoBox(x, z, w + 0.3, d + (cadeiras ? 1.0 : 0.2));
  }
  function planta(x, z, s = 1) {
    caixa(0.42 * s, 0.45 * s, 0.42 * s, mat.vaso, x, 0.225 * s, z, interior, 0.05);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 * s, 1), mat.planta); f.position.set(x, 0.85 * s, z); interior.add(f);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * s, 1), mat.planta); f2.position.set(x + 0.12, 1.25 * s, z - 0.08); interior.add(f2);
    solidoBox(x, z, 0.5 * s, 0.5 * s);
  }
  function tapete(x, z, w, d) { const t = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.tapete); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.02, z); interior.add(t); }
  function armario(x, z, w, d, h = 2.5) { caixa(w, h, d, mat.armario, x, h / 2, z, interior, 0.02); solidoBox(x, z, w, d); }
  function banheiro(x1, z1, x2, z2, banheira = false) {
    caixa(0.9, 0.5, 0.5, mat.carvalho, x1 + 0.55, 0.6, z1 + 0.28, interior, 0.02);
    caixa(0.92, 0.04, 0.52, mat.marmore, x1 + 0.55, 0.87, z1 + 0.28, interior);
    caixa(0.8, 0.8, 0.03, mat.vidroInt, x1 + 0.55, 1.55, z1 + 0.08, interior);
    solidoBox(x1 + 0.55, z1 + 0.28, 0.9, 0.55);
    caixa(0.62, 0.42, 0.4, mat.loucas, x1 + 0.33, 0.21, z1 + 1.35, interior, 0.12);
    solidoBox(x1 + 0.33, z1 + 1.35, 0.65, 0.45);
    if (banheira) { caixa(0.8, 0.55, 1.6, mat.loucas, x2 - 0.45, 0.28, z1 + 0.85, interior, 0.15); solidoBox(x2 - 0.45, z1 + 0.85, 0.85, 1.65); }
    else { caixa(0.03, 2.0, 1.2, mat.vidroInt, x2 - 0.95, 1.0, z1 + 0.65, interior); solidoBox(x2 - 0.48, z1 + 0.65, 0.95, 1.25); }
  }
  function luzInt(x, z, i = 7) { const l = new THREE.PointLight(0xffd6a8, i, 9, 2); l.position.set(x, PE - 0.25, z); interior.add(l); luzesInt.push(l); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), mat.spot); s.position.set(x, PE - 0.012, z); tetoGrupo.add(s); }

  /* --- unidade x01: 3 suítes (frente esquerda), completa --- */
  const zc = 0.9;               // corredor z[-0.9, 0.9]
  const U1 = { un: 0 };
  piso(-14, 4, -10, HZ, mat.madeira, { nome: "Suíte master", foto: FOTOS.master, ...U1 });
  piso(-10, 4, -6.8, HZ, mat.madeira, { nome: "Suíte 2", foto: FOTOS.suite, ...U1 });
  piso(-6.8, 4, -3.6, HZ, mat.madeira, { nome: "Suíte 3", foto: FOTOS.suite3, ...U1 });
  piso(-3.6, 3, 2, HZ, mat.madeira, { nome: "Living", foto: FOTOS.sala, ...U1 });
  piso(-3.6, zc, 2, 3, mat.porcelanato, { nome: "Cozinha", foto: FOTOS.cozinha, ...U1 });
  piso(-14, 3, -3.6, 4, mat.madeira, { nome: "Circulação íntima", foto: null, ...U1 });
  piso(-14, zc, -12, 3, mat.porcelanato, { nome: "Banho master", foto: FOTOS.banhoM, ...U1 });
  piso(-12, zc, -10.2, 3, mat.porcelanato, { nome: "Banho suíte 2", foto: FOTOS.banho, ...U1 });
  piso(-10.2, zc, -8.4, 3, mat.porcelanato, { nome: "Banho suíte 3", foto: FOTOS.banho, ...U1 });
  piso(-8.4, zc, -6.6, 3, mat.porcelanato, { nome: "Área de serviço", foto: FOTOS.lavanderia, ...U1 });
  piso(-6.6, zc, -5.2, 3, mat.porcelanato, { nome: "Lavabo", foto: FOTOS.lavabo, ...U1 });
  piso(-5.2, zc, -3.6, 3, mat.porcelanato, { nome: "Entrada", foto: null, ...U1 });
  piso(-12, HZ, 2, HZ + 2.1, mat.porcelanato, { nome: "Varanda gourmet", foto: FOTOS.varanda, ...U1 });
  // paredes
  parede(-14, zc, -14, HZ, { janelas: [[1.3, 2.6], [4.6, 6.9]] });
  vidraca(-14, 2, HZ, [[-3, -0.6]]);
  parede(2, zc, 2, HZ);
  parede(-14, zc, 2, zc, { vaos: [[-4.8, -4.0]] });
  parede(-14, 4, -3.6, 4, { vaos: [[-11.3, -10.5], [-8.2, -7.4], [-5.0, -4.2]] });
  parede(-10, 4, -10, HZ); parede(-6.8, 4, -6.8, HZ); parede(-3.6, 4, -3.6, HZ);
  parede(-14, 3, -5.2, 3, { vaos: [[-13.6, -12.9], [-11.6, -10.9], [-9.8, -9.1], [-8.1, -7.4], [-6.3, -5.7]] });
  for (const x of [-12, -10.2, -8.4, -6.6, -5.2]) parede(x, zc, x, 3);
  parede(-3.6, zc, -3.6, 2.1);
  // varanda: guarda-corpo e parede lateral
  caixa(14, 1.05, 0.03, mat.vidroInt, -5, 0.53, HZ + 2.1, interior); obst.push([-12, HZ + 2.04, 2, HZ + 2.16]);
  parede(-12, HZ, -12, HZ + 2.1, { alt: 1.05 });
  parede(2, HZ, 2, HZ + 2.1);
  // móveis — living
  tapete(-0.8, 5.4, 3.2, 2.3);
  sofa(-0.8, 6.8, 2.8);
  caixa(1.1, 0.34, 0.6, mat.nogueira, -0.8, 0.17, 5.4, interior, 0.04); solidoBox(-0.8, 5.4, 1.1, 0.6);
  caixa(2.4, 0.45, 0.42, mat.nogueira, -0.8, 0.225, 3.35, interior, 0.02); solidoBox(-0.8, 3.35, 2.4, 0.42);
  caixa(1.6, 0.92, 0.05, mat.tela, -0.8, 1.35, 3.2, interior, 0.01);
  sofa(1.35, 5.3, 1.0, Math.PI / 2);
  planta(-3.1, 7.0);
  // cozinha
  caixa(3.6, 0.9, 0.62, mat.armario, -1.2, 0.45, zc + 0.37, interior, 0.02); caixa(3.62, 0.04, 0.64, mat.marmore, -1.2, 0.92, zc + 0.37, interior); solidoBox(-1.2, zc + 0.37, 3.6, 0.62);
  caixa(3.6, 0.7, 0.36, mat.armario, -1.2, 1.95, zc + 0.24, interior, 0.02);
  caixa(0.8, 0.02, 0.5, mat.preto, -0.4, 0.95, zc + 0.37, interior);
  caixa(0.75, 2.0, 0.7, mat.elevador, 1.5, 1.0, zc + 0.42, interior, 0.03); solidoBox(1.5, zc + 0.42, 0.75, 0.7);
  caixa(2.2, 0.92, 0.9, mat.nogueira, -1.0, 0.46, 2.35, interior, 0.03); caixa(2.24, 0.04, 0.94, mat.marmore, -1.0, 0.94, 2.35, interior); solidoBox(-1.0, 2.35, 2.2, 0.9);
  for (const x of [-1.7, -1.0, -0.3]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.7, 16), mat.tecidoEsc); b.position.set(x, 0.35, 3.0); interior.add(b); }
  for (const x of [-1.6, -0.4]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat.pendente); p.position.set(x, 1.85, 2.35); interior.add(p); caixa(0.01, PE - 1.95, 0.01, mat.preto, x, (PE + 1.95) / 2, 2.35, interior); }
  // suítes
  cama(-12, 6.35, 1.9, Math.PI, mat.manta);
  tapete(-12, 5.9, 2.6, 2.2);
  cama(-8.4, 6.4, 1.6, Math.PI, mat.tecidoEsc);
  armario(-9.7, 4.6, 0.6, 1.0);
  cama(-5.2, 6.4, 1.6, Math.PI, mat.almofada);
  // banheiros, serviço, lavabo
  banheiro(-14, zc, -12, 3, true);
  banheiro(-12, zc, -10.2, 3);
  banheiro(-10.2, zc, -8.4, 3);
  caixa(0.62, 0.85, 0.62, mat.loucas, -7.95, 0.43, zc + 0.38, interior, 0.06); caixa(0.62, 0.85, 0.62, mat.loucas, -7.05, 0.43, zc + 0.38, interior, 0.06); solidoBox(-7.5, zc + 0.38, 1.3, 0.62);
  caixa(0.4, 0.42, 0.6, mat.loucas, -5.9, 0.21, zc + 0.4, interior, 0.12); solidoBox(-5.9, zc + 0.4, 0.45, 0.62);
  // varanda gourmet
  caixa(2.2, 0.92, 0.62, mat.nogueira, -10.6, 0.46, HZ + 0.45, interior, 0.03); caixa(2.22, 0.04, 0.64, mat.marmore, -10.6, 0.94, HZ + 0.45, interior); solidoBox(-10.6, HZ + 0.45, 2.2, 0.62);
  caixa(0.6, 0.5, 0.5, mat.preto, -11.4, 1.2, HZ + 0.4, interior, 0.04);
  mesa(-6.5, HZ + 1.05, 1.8, 0.85);
  planta(1.4, HZ + 1.6, 1.1); planta(-11.5, HZ + 1.65, 0.9);
  // luzes da unidade
  luzInt(-0.8, 5.3, 9); luzInt(-1.0, 2.0, 7); luzInt(-12, 5.8); luzInt(-8.4, 5.8); luzInt(-5.2, 5.8); luzInt(-5, HZ + 1, 5);

  /* --- x02: 2 dormitórios (frente direita), simplificada --- */
  const U2 = { un: 1 };
  piso(2, zc, 9, HZ, mat.madeira, { nome: "Living integrado", foto: FOTOS.sala, ...U2 });
  piso(9, 4.2, 14, HZ, mat.madeira, { nome: "Suíte", foto: FOTOS.suite, ...U2 });
  piso(9, zc, 14, 4.2, mat.madeira, { nome: "Dormitório", foto: FOTOS.suite3, ...U2 });
  piso(2, HZ, 12, HZ + 2.1, mat.porcelanato, { nome: "Varanda gourmet", foto: FOTOS.varanda, ...U2 });
  parede(2, zc, 14, zc, { vaos: [[3.0, 3.8]] });
  parede(14, zc, 14, HZ, { janelas: [[1.6, 3.6], [4.8, 6.8]] });
  parede(9, zc, 9, HZ, { vaos: [[2.6, 3.4], [4.6, 5.4]] });
  parede(9, 4.2, 14, 4.2);
  vidraca(2, 14, HZ, [[4, 6.6]]);
  caixa(10, 1.05, 0.03, mat.vidroInt, 7, 0.53, HZ + 2.1, interior); obst.push([2, HZ + 2.04, 12, HZ + 2.16]);
  parede(12, HZ, 12, HZ + 2.1, { alt: 1.05 });
  sofa(5.5, 5.6, 2.4); tapete(5.5, 4.4, 2.6, 1.8); mesa(4.6, 2.4, 1.4, 0.8);
  caixa(2.6, 0.9, 0.6, mat.armario, 7.4, 0.45, zc + 0.35, interior, 0.02); solidoBox(7.4, zc + 0.35, 2.6, 0.6);
  cama(11.6, 6.4, 1.6, Math.PI); cama(11.6, 2.2, 1.4, 0, mat.tecidoEsc);
  luzInt(7, 4.2, 9);

  /* --- fundos: x04 (3 suítes), núcleo e x03 (studio) --- */
  const U4 = { un: 3 }, U3 = { un: 2 };
  piso(-14, -HZ, 0, -zc, mat.madeira, { nome: "Living", foto: FOTOS.sala, ...U4 });
  piso(0, -HZ, 9, -zc, mat.nucleo, null);
  piso(9, -HZ, 14, -zc, mat.madeira, { nome: "Studio", foto: FOTOS.studio, ...U3 });
  piso(-14, -zc, 14, zc, mat.circulacao, { nome: "Hall dos elevadores", foto: null, un: -1 });
  parede(-14, -zc, 14, -zc, { vaos: [[-3, -2.2], [10, 10.8]] });
  parede(-14, -HZ, 0, -HZ, { janelas: [[-13, -9.6], [-8.6, -5.2], [-4.2, -0.8]] });
  parede(9, -HZ, 14, -HZ, { janelas: [[9.8, 13.2]] });
  parede(-14, -HZ, -14, -zc, { janelas: [[-6, -2.4]] });
  parede(14, -HZ, 14, -zc, { janelas: [[-6, -2.4]] });
  parede(-14, zc, -14, -zc); parede(14, zc, 14, -zc);
  parede(-9.4, -HZ, -9.4, -zc, { vaos: [[-2.4, -1.6]] }); parede(-4.8, -HZ, -4.8, -zc, { vaos: [[-2.4, -1.6]] });
  cama(-11.7, -5.4, 1.8); cama(-7.1, -5.4, 1.5); sofa(-2.4, -5.8, 2.4); tapete(-2.4, -4.6, 2.4, 1.6);
  cama(12.6, -5.3, 1.4); sofa(10.3, -2.4, 1.6, -Math.PI / 2);
  // núcleo: elevadores e escada
  caixa(9, PE, 0.3, mat.nucleo, 4.5, PE / 2, -HZ + 0.15, interior); caixa(0.3, PE, D / 2 - zc, mat.nucleo, 0.15, PE / 2, -(HZ + zc) / 2, interior); caixa(0.3, PE, D / 2 - zc, mat.nucleo, 8.85, PE / 2, -(HZ + zc) / 2, interior);
  obst.push([0, -HZ, 9, -zc]);
  for (const x of [1.6, 3.6]) { caixa(1.6, 2.2, 1.8, mat.nucleo, x, 1.1, -2.2, interior); caixa(1.0, 2.1, 0.04, mat.elevador, x, 1.05, -1.28, interior); }
  for (let i = 0; i < 9; i++) caixa(1.2, 0.18 * (i + 1), 0.3, mat.laje, 6.6, 0.09 * (i + 1), -6.9 + i * 0.3, interior);
  // teto (só na visita)
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 2.1), mat.teto); teto.rotation.x = Math.PI / 2; teto.position.set(0, PE, 1.05); tetoGrupo.add(teto);
  luzesInt.forEach((l) => (l.visible = false));

  /* ---------- pós-processamento ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- câmera e enquadramento ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 9; controls.maxDistance = 70; controls.maxPolarAngle = 1.32; controls.enablePan = true; controls.screenSpacePanning = true;
  let modo = "predio", andarAberto = 0;
  let largura = 1, altura = 1;
  const alvoPredio = new THREE.Vector3(0, TOPO * 0.5, 0);
  let distPredio = 120, azBase = 0.62, mouseX = 0, mouseY = 0;
  const off = { x: 0, y: 0 }, offAlvo = { x: 0, y: 0 };
  function aplicarOff() { camera.setViewOffset(largura, altura, off.x, off.y, largura, altura); camera.updateProjectionMatrix(); }
  const compacto = () => innerWidth <= 1040;
  function enquadrar() {
    const r = host.getBoundingClientRect();
    largura = Math.max(1, r.width); altura = Math.max(1, r.height);
    renderer.setSize(largura, altura, false);
    composer.setSize(largura, altura);
    bloom.resolution.set(largura / 2, altura / 2);
    camera.aspect = largura / altura;
    const asp = camera.aspect, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    if (modo === "predio" || modo === "fechando") {
      const ocupa = compacto() ? 0.66 : 0.82;
      distPredio = ((TOPO + 6) / 2) / (tan * ocupa);
    }
    offAlvo.x = modo === "predio" || modo === "fechando" ? (compacto() ? 0 : -largura * 0.2) : 0;
    offAlvo.y = modo === "predio" || modo === "fechando" ? (compacto() ? -altura * 0.05 : altura * 0.02) : 0;
    aplicarOff();
  }
  new ResizeObserver(enquadrar).observe(host);

  /* ---------- interação no prédio ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const dica = $(".x3d__dica");
  let hover = 0;
  const T = DADOS.T || {}, UN = DADOS.U || [];
  const resumoAndar = (a) => {
    const us = UN.filter((u) => u.andar === a);
    const d = us.filter((u) => u.st === "d").length;
    return `${a === 18 ? "Coberturas" : a + "º andar"} · ${d ? `${d} disponíve${d > 1 ? "is" : "l"}` : "esgotado"}`;
  };
  function apontar(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
  }
  function hoverAndar(a, e) {
    hover = a;
    for (let i = 1; i <= N; i++) alvo[i] = i === a ? 1.7 : 0;
    canvas.style.cursor = a ? "pointer" : "";
    if (a && e) { dica.textContent = `${resumoAndar(a)} — clique para explorar`; dica.style.transform = `translate(${e.clientX - host.getBoundingClientRect().left + 16}px, ${e.clientY - host.getBoundingClientRect().top + 16}px)`; dica.classList.add("on"); }
    else dica.classList.remove("on");
  }
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width - 0.5; mouseY = (e.clientY - r.top) / r.height - 0.5;
    if (modo === "predio" && e.pointerType === "mouse") {
      apontar(e); pickScene.updateMatrixWorld();
      const hit = ray.intersectObjects(pickScene.children)[0];
      hoverAndar(hit ? hit.object.userData.andar : 0, e);
    } else if (modo === "explorar") hoverComodo(e);
  });
  canvas.addEventListener("pointerleave", () => { if (modo === "predio") hoverAndar(0); });
  let downAt = null;
  canvas.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("click", (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;   // foi arrasto
    if (modo === "predio") {
      apontar(e); pickScene.updateMatrixWorld();
      const hit = ray.intersectObjects(pickScene.children)[0];
      if (hit) { hoverAndar(hit.object.userData.andar); abrirAndar(hit.object.userData.andar); }
    } else if (modo === "explorar") {
      apontar(e);
      const hit = ray.intersectObjects(pisos)[0];
      if (hit && hit.object.userData.foto) abrirFoto(hit.object.userData);
    }
  });

  /* ---------- abrir andar ---------- */
  const tween = { on: false };
  function voar(pos, tgt, dur = 1.5, fim) {
    Object.assign(tween, { on: true, t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone(), fim });
  }
  const ui = { painel: $(".x3d__painel"), titulo: $(".x3d__titulo"), sub: $(".x3d__sub"), rotulos: $(".x3d__rotulos"), visita: $(".x3d__visita"), foto: $(".x3d__foto") };
  const rotulos = [];
  function montarRotulos(a) {
    ui.rotulos.innerHTML = ""; rotulos.length = 0;
    const centros = [[-6, 1.4], [8, 1.4], [11.5, -1.4], [-7, -1.4]];
    const us = UN.filter((u) => u.andar === a);
    centros.forEach(([x, z], c) => {
      const u = us.find((q) => q.c === c);
      if (a === 18 && c >= 2) return;
      const el = document.createElement("button");
      el.className = "x3d__un";
      if (u) {
        const t = T[u.tipo] || {};
        const st = { d: ["Disponível", "d"], r: ["Reservada", "r"], v: ["Vendida", "v"] }[u.st];
        el.innerHTML = `<b>${u.id}</b> ${t.n || ""} · ${t.m2 || ""} m²<i class="${st[1]}">${st[0]}</i>`;
        el.onclick = () => { fechar(); setTimeout(() => { document.querySelector(`#floors .u[data-id="${u.id}"]`)?.click(); document.querySelector("#unidades")?.scrollIntoView({ behavior: "smooth" }); }, 1600); };
      } else el.innerHTML = `<b>${a}0${c + 1}</b>`;
      ui.rotulos.append(el); rotulos.push({ el, p: new THREE.Vector3(x, 3.1, z), un: true });
    });
    pisos.filter((p) => p.userData.un === 0 && p.userData.foto && p.userData.area >= 6).forEach((p) => {
      const el = document.createElement("button");
      el.className = "x3d__comodo"; el.textContent = p.userData.nome;
      el.onclick = () => abrirFoto(p.userData);
      el.onmouseenter = () => realcar(p); el.onmouseleave = () => realcar(null);
      ui.rotulos.append(el); rotulos.push({ el, p: new THREE.Vector3(p.userData.cx, 0.2, p.userData.cz), piso: p });
    });
  }
  let realce = null;
  function realcar(p) {
    if (realce) { realce.material.emissive?.setHex(0x000000); realce.material.emissiveIntensity = 0; }
    realce = p;
    if (p) { p.material.emissive = new THREE.Color(0xffb38a); p.material.emissiveIntensity = 0.25; }
    canvas.style.cursor = p ? "pointer" : "";
  }
  function hoverComodo(e) {
    apontar(e);
    const hit = ray.intersectObjects(pisos)[0];
    const p = hit && hit.object.userData.foto ? hit.object : null;
    realcar(p);
    if (p && e.pointerType === "mouse") {
      const r = host.getBoundingClientRect();
      dica.textContent = `${p.userData.nome} — clique para ver a foto`;
      dica.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px)`; dica.classList.add("on");
    } else dica.classList.remove("on");
  }

  function abrirAndar(a) {
    if (modo !== "predio") return;
    modo = "explorar"; andarAberto = a;
    host.classList.add("aberto"); document.body.classList.add("x3d-travado");
    dica.classList.remove("on");
    enquadrar();
    for (let i = 1; i <= N; i++) { andares[i].userData.alvoDy = i > a ? 70 + (i - a) * 3 : 0; }
    coroa.userData.alvoDy = 70 + (N - a) * 3 + 6; aletas.visible = false;
    andares[a].userData.casca.visible = false;
    interior.position.y = baseY(a) + LAJE; interior.visible = true;
    luzesInt.forEach((l) => (l.visible = true));
    ui.titulo.textContent = a === 18 ? "Coberturas · 18º andar" : `${a}º andar`;
    ui.sub.textContent = "Arraste para girar · clique em um cômodo do apartamento de 3 suítes para ver a foto";
    montarRotulos(a);
    const y = baseY(a);
    controls.target.set(-3, y + 1, 1.5);
    voar(new THREE.Vector3(-9, y + 21, 25), new THREE.Vector3(-3, y + 0.5, 1.5), 1.8, () => { controls.enabled = true; });
  }
  function fechar() {
    if (modo === "andar") sairVisita();
    if (modo !== "explorar") return;
    modo = "fechando"; controls.enabled = false; fecharFoto(); enquadrar();
    ui.rotulos.innerHTML = ""; rotulos.length = 0; realcar(null); dica.classList.remove("on");
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = 0;
    coroa.userData.alvoDy = 0;
    const pos = posPredio();
    voar(pos, alvoPredio, 1.5, () => {
      andares[andarAberto].userData.casca.visible = true; aletas.visible = true;
      interior.visible = false; luzesInt.forEach((l) => (l.visible = false));
      host.classList.remove("aberto"); document.body.classList.remove("x3d-travado");
      modo = "predio"; enquadrar(); hoverAndar(0);
    });
  }
  $(".x3d__voltar").onclick = fechar;
  $(".x3d__entrar").onclick = entrarVisita;
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.pointerLockElement) { if (ui.foto.classList.contains("on")) fecharFoto(); else if (modo === "andar") sairVisita(); else if (modo === "explorar") fechar(); } });

  /* ---------- foto do cômodo ---------- */
  const fotoLista = () => pisos.filter((p) => p.userData.un === 0 && p.userData.foto).map((p) => p.userData);
  let fotoIdx = 0;
  function abrirFoto(info) {
    const lista = fotoLista(); fotoIdx = Math.max(0, lista.findIndex((x) => x.nome === info.nome && x.un === info.un));
    mostrarFoto(info);
  }
  function mostrarFoto(info) {
    const img = ui.foto.querySelector("img");
    img.classList.remove("ok"); img.onload = () => img.classList.add("ok"); img.src = info.foto;
    ui.foto.querySelector("h3").textContent = info.nome;
    ui.foto.querySelector("p").textContent = `${info.area ? `cerca de ${info.area} m² · ` : ""}foto ilustrativa de ambiente decorado`;
    ui.foto.classList.add("on");
  }
  function fecharFoto() { ui.foto.classList.remove("on"); }
  ui.foto.querySelector(".x3d__fechar").onclick = fecharFoto;
  ui.foto.addEventListener("click", (e) => { if (e.target === ui.foto) fecharFoto(); });
  for (const [sel, d] of [[".x3d__ant", -1], [".x3d__prox", 1]]) ui.foto.querySelector(sel).onclick = () => { const l = fotoLista(); fotoIdx = (fotoIdx + d + l.length) % l.length; mostrarFoto(l[fotoIdx]); };

  /* ---------- visita em primeira pessoa ---------- */
  const OLHO = 1.62, RAIO = 0.28;
  let yaw = Math.PI, pitch = -0.05;
  const teclas = {};
  const joy = { x: 0, y: 0 };
  let posLocal = new THREE.Vector3();
  function entrarVisita() {
    if (modo !== "explorar") return;
    modo = "andar"; controls.enabled = false; fecharFoto(); realcar(null); dica.classList.remove("on");
    ui.rotulos.style.display = "none"; tetoGrupo.visible = true;
    host.classList.add("visita");
    posLocal.set(-0.8, 0, 4.6); yaw = Math.PI; pitch = -0.04;
    hemi.intensity = 0.55; amb.intensity = 0.25;
    camera.fov = 70; camera.near = 0.05; camera.updateProjectionMatrix();
  }
  function sairVisita() {
    if (modo !== "andar") return;
    if (document.pointerLockElement) document.exitPointerLock();
    modo = "explorar"; tetoGrupo.visible = false; ui.rotulos.style.display = "";
    host.classList.remove("visita");
    camera.fov = 34; camera.near = 0.1; camera.updateProjectionMatrix();
    hemi.intensity = 1.25; amb.intensity = 0.35;
    const y = baseY(andarAberto);
    camera.position.set(-9, y + 21, 25); controls.target.set(-3, y + 0.5, 1.5); controls.enabled = true;
  }
  $(".x3d__sair").onclick = sairVisita;
  $(".x3d__olhar").onclick = () => { canvas.requestPointerLock?.(); };
  document.addEventListener("pointerlockchange", () => host.classList.toggle("travado", document.pointerLockElement === canvas));
  document.addEventListener("mousemove", (e) => {
    if (modo === "andar" && document.pointerLockElement === canvas) { yaw -= e.movementX * 0.0022; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.2, 1.2); }
  });
  // arrastar para olhar (mouse sem trava e toque fora do joystick)
  let arrasto = null;
  canvas.addEventListener("pointerdown", (e) => { if (modo === "andar" && document.pointerLockElement !== canvas) { arrasto = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener("pointermove", (e) => { if (arrasto && e.pointerId === arrasto.id) { yaw -= (e.clientX - arrasto.x) * 0.005; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - arrasto.y) * 0.005, -1.2, 1.2); arrasto.x = e.clientX; arrasto.y = e.clientY; } });
  canvas.addEventListener("pointerup", (e) => { if (arrasto && e.pointerId === arrasto.id) arrasto = null; });
  addEventListener("keydown", (e) => { if (modo === "andar") { teclas[e.code] = true; if (/^(Arrow|Space)/.test(e.code)) e.preventDefault(); } });
  addEventListener("keyup", (e) => { teclas[e.code] = false; });
  addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });
  const jb = $(".x3d__joy"), jk = jb.querySelector("i");
  let joyId = null;
  jb.addEventListener("pointerdown", (e) => { joyId = e.pointerId; jb.setPointerCapture(e.pointerId); moverJoy(e); e.stopPropagation(); });
  jb.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) moverJoy(e); });
  const soltarJoy = () => { joyId = null; joy.x = joy.y = 0; jk.style.transform = ""; };
  jb.addEventListener("pointerup", soltarJoy); jb.addEventListener("pointercancel", soltarJoy);
  function moverJoy(e) {
    const r = jb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    joy.x = dx; joy.y = dy; jk.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
  }
  function colidir(p) {
    for (let it = 0; it < 3; it++) for (const [x1, z1, x2, z2] of obst) {
      const ax = x1 - RAIO, bx = x2 + RAIO, az = z1 - RAIO, bz = z2 + RAIO;
      if (p.x > ax && p.x < bx && p.z > az && p.z < bz) {
        const dl = p.x - ax, dr = bx - p.x, dt = p.z - az, db = bz - p.z, m = Math.min(dl, dr, dt, db);
        if (m === dl) p.x = ax; else if (m === dr) p.x = bx; else if (m === dt) p.z = az; else p.z = bz;
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -HX + 0.3, HX - 0.3); p.z = THREE.MathUtils.clamp(p.z, -HZ + 0.3, HZ + 1.8);
  }
  function andar(dt) {
    let f = (teclas.KeyW || teclas.ArrowUp ? 1 : 0) - (teclas.KeyS || teclas.ArrowDown ? 1 : 0) - joy.y;
    let s = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0) + joy.x;
    const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
    const v = (teclas.ShiftLeft || teclas.ShiftRight ? 3.6 : 2.0) * dt;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    posLocal.x += (fx * f + rx * s) * v; posLocal.z += (fz * f + rz * s) * v;
    colidir(posLocal);
    camera.position.set(posLocal.x, interior.position.y + OLHO, posLocal.z);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }

  /* ---------- laço ---------- */
  function posPredio() {
    const az = azBase + (reduz ? 0 : Math.sin(relogio * 0.08) * 0.07) + mouseX * 0.12;
    return new THREE.Vector3(Math.sin(az) * distPredio, TOPO * 0.5 + 6 - mouseY * 8, Math.cos(az) * distPredio);
  }
  let relogio = 0, ultimo = performance.now(), visivel = true;
  new IntersectionObserver((es) => { visivel = es[0].isIntersecting; }).observe(host);
  const v3 = new THREE.Vector3();
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    if (!visivel && modo === "predio") return;
    relogio += dt;
    if (Math.abs(off.x - offAlvo.x) + Math.abs(off.y - offAlvo.y) > 0.5) { const k = Math.min(1, dt * 3); off.x += (offAlvo.x - off.x) * k; off.y += (offAlvo.y - off.y) * k; aplicarOff(); }
    for (let i = 1; i <= N; i++) {
      intens[i] += (alvo[i] - intens[i]) * Math.min(1, dt * 6);
      vidros[i].emissiveIntensity = intens[i];
      const u = andares[i].userData; u.dy += (u.alvoDy - u.dy) * Math.min(1, dt * 3.2);
      andares[i].position.y = u.y0 + u.dy; andares[i].visible = u.dy < 60;
    }
    coroa.userData.dy = (coroa.userData.dy || 0) + ((coroa.userData.alvoDy || 0) - (coroa.userData.dy || 0)) * Math.min(1, dt * 3.2);
    coroa.position.y = TOPO + coroa.userData.dy; coroa.visible = coroa.userData.dy < 60;
    if (tween.on) {
      tween.t += dt / tween.dur; const k = Math.min(1, tween.t), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); camera.lookAt(controls.target);
      if (k >= 1) { tween.on = false; tween.fim?.(); }
    } else if (modo === "predio") {
      camera.position.lerp(posPredio(), Math.min(1, dt * 2.5)); controls.target.copy(alvoPredio); camera.lookAt(alvoPredio);
    } else if (modo === "explorar") controls.update();
    else if (modo === "andar") andar(dt);
    if (modo === "explorar") { hemi.intensity += (1.25 - hemi.intensity) * dt * 3; amb.intensity += (0.35 - amb.intensity) * dt * 3; }
    else if (modo === "predio") { hemi.intensity += (0.75 - hemi.intensity) * dt * 3; amb.intensity += (0.08 - amb.intensity) * dt * 3; }
    if (rotulos.length && modo === "explorar") {
      for (const r of rotulos) {
        v3.copy(r.p); v3.y += interior.position.y; v3.project(camera);
        const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
        r.el.style.opacity = vis ? "" : 0;
        r.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * largura}px, ${(-v3.y * 0.5 + 0.5) * altura}px) translate(-50%, -50%)`;
      }
    }
    composer.render();
  }
  enquadrar(); off.x = offAlvo.x; off.y = offAlvo.y; aplicarOff();
  camera.position.copy(posPredio()).add(new THREE.Vector3(30, 20, 40));
  requestAnimationFrame(quadro);
  host.classList.add("pronto");
  window.__predio3d = { abrirAndar, fechar, entrarVisita, sairVisita, abrirFoto: (n) => abrirFoto(pisos.find((p) => p.userData.nome === n).userData), estado: () => ({ modo, andarAberto }), hoverAndar };
}
