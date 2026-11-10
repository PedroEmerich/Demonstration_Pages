/* Residencial Aurora — prédio em 3D
   - topo da página: torre ao entardecer, janelas apagadas
   - passar o mouse num andar acende as luzes; clicar abre o andar como maquete
   - 1º ao 9º: 4 apartamentos de 2 dormitórios · 10º ao 17º: 2 de 3 suítes · 18º: coberturas
   - na maquete: clicar num cômodo mostra a foto; "Visualizar por dentro" anda com W A S D */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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

  /* ---------- medidas (metros) ---------- */
  const W = 28, D = 15, HX = W / 2, HZ = D / 2;
  const N = 18, H = 3.1, TERREO = 6, PE = 2.7, LAJE = 0.32, NUC = 3;   // núcleo de elevadores em x[-3, 3]
  const baseY = (a) => TERREO + (a - 1) * H;
  const TOPO = baseY(N + 1);
  const tipoAndar = (a) => (a === 18 ? "cob" : a >= 10 ? "tres" : "dois");

  /* ---------- renderizador ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, celular ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), ceuMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ceuScene = new THREE.Scene(); ceuScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), ceuMat));
  const envCeu = pmrem.fromScene(ceuScene, 0.02).texture;
  const envInterno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envCeu;

  const hemi = new THREE.HemisphereLight(0x9a8ad8, 0x1a1426, 0.75); scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xffb08a, 1.5); sol.position.set(-40, 26, -60); scene.add(sol);
  const preench = new THREE.DirectionalLight(0x9db0ff, 0.45); preench.position.set(30, 40, 50); scene.add(preench);
  const amb = new THREE.AmbientLight(0xffffff, 0.08); scene.add(amb);
  // luz de estúdio da maquete, com sombras suaves
  const estudio = new THREE.DirectionalLight(0xfff4e6, 0);
  estudio.castShadow = true;
  estudio.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048);
  Object.assign(estudio.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 90 });
  estudio.shadow.bias = -0.0005; estudio.shadow.normalBias = 0.03; estudio.shadow.radius = 4;
  scene.add(estudio, estudio.target);

  /* ---------- texturas geradas ---------- */
  const tela = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const luzTex = tela(1024, 64, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const lw = 40 + rnd() * 120, b = 0.45 + rnd() * 0.55, quente = rnd() > 0.2;
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, quente ? `rgba(255,${190 + rnd() * 30 | 0},${120 + rnd() * 40 | 0},${b})` : `rgba(235,240,255,${b * .8})`);
      grd.addColorStop(1, `rgba(255,170,110,${b * .45})`);
      g.fillStyle = grd; g.fillRect(x, 0, lw, h);
      for (let k = 0; k < lw / 18; k++) { g.fillStyle = `rgba(255,240,210,${.25 + rnd() * .3})`; g.beginPath(); g.ellipse(x + 8 + k * 18, 4, 5, 3, 0, 0, 7); g.fill(); }
      if (rnd() > 0.5) { g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(x + lw * rnd() * .6, 0, lw * .25, h); }
      x += lw; g.fillStyle = "#000"; g.fillRect(x, 0, 3, h); x += 3;
    }
  });
  const janelasCidade = tela(128, 128, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) if (rnd() > 0.8) {
      const q = rnd() > .3; g.fillStyle = q ? `rgba(255,${185 + rnd() * 45 | 0},130,${.35 + rnd() * .5})` : `rgba(205,215,255,${.25 + rnd() * .4})`; g.fillRect(x + 3, y + 4, 10, 8);
    }
  });
  janelasCidade.wrapS = janelasCidade.wrapT = THREE.RepeatWrapping;
  const tabuas = (base, vari, larg) => tela(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += larg) for (let x = -((y / larg) % 3) * 90; x < w; x += 270) {
      const t = base + rnd() * vari;
      g.fillStyle = `rgb(${t + 25 | 0},${t - 12 | 0},${t - 58 | 0})`; g.fillRect(x, y, 268, larg - 1);
      for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(80,45,20,${.06 + rnd() * .1})`; g.beginPath(); const yy = y + 3 + rnd() * (larg - 6); g.moveTo(x, yy); g.bezierCurveTo(x + 90, yy + rnd() * 4 - 2, x + 180, yy + rnd() * 4 - 2, x + 268, yy); g.stroke(); }
      g.fillStyle = "rgba(40,22,10,.45)"; g.fillRect(x + 268, y, 2, larg); g.fillRect(x, y + larg - 1, 270, 1);
    }
  });
  const madeiraTex = tabuas(150, 40, 32), deckTex = tabuas(95, 30, 40);
  for (const t of [madeiraTex, deckTex]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const pisoTex = tela(256, 256, (g, w, h) => {
    g.fillStyle = "#dcd7d0"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { const c = rnd() > .5 ? 255 : 120; g.fillStyle = `rgba(${c},${c - 5},${c - 10},.05)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = "rgba(120,110,100,.35)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  });
  pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping;
  const tapeteTex = (cor, borda) => tela(256, 256, (g, w, h) => {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(60,45,35,${rnd() * .07})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    g.strokeStyle = borda; g.lineWidth = 6; g.strokeRect(16, 16, w - 32, h - 32);
  });
  const quadroTex = (paleta) => tela(256, 320, (g, w, h) => {
    g.fillStyle = paleta[0]; g.fillRect(0, 0, w, h);
    for (let i = 1; i < paleta.length; i++) { g.fillStyle = paleta[i]; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 90, 30 + rnd() * 80, rnd() * 3, 0, 7); g.fill(); }
  });

  /* ---------- materiais ---------- */
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const mat = {
    laje: M({ color: 0xece6f0, roughness: 0.55 }),
    fachada: M({ color: 0xd7ccd3, roughness: 0.85 }),
    espinha: M({ color: 0xa79aa5, roughness: 0.75 }),
    metal: M({ color: 0x2a2531, metalness: 0.8, roughness: 0.35 }),
    guarda: new THREE.MeshPhysicalMaterial({ color: 0xa8bdd4, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.2 }),
    lobby: M({ color: 0x1a1410, emissive: 0xffc58f, emissiveIntensity: 1.1, emissiveMap: luzTex, metalness: 0.4, roughness: 0.2 }),
    led: M({ color: 0xffb38a, emissive: 0xffb38a, emissiveIntensity: 2.2 }),
    chao: M({ color: 0x15111f, roughness: 0.95 }),
    praca: M({ color: 0x2a2436, roughness: 0.8 }),
    folha: M({ color: 0x23402f, roughness: 0.9, flatShading: true }),
    tronco: M({ color: 0x3a2a22, roughness: 1 }),
    poste: M({ color: 0xfff0d6, emissive: 0xffe2b0, emissiveIntensity: 2.5 }),
    // maquete
    parede: M({ color: 0xf1ede7, roughness: 0.9 }),
    rodape: M({ color: 0xfbfaf7, roughness: 0.5 }),
    batente: M({ color: 0xf6f3ee, roughness: 0.45 }),
    tampa: M({ color: 0x3b3346, roughness: 0.8 }),
    madeira: M({ color: 0xffffff, map: madeiraTex, roughness: 0.5 }),
    deck: M({ color: 0xffffff, map: deckTex, roughness: 0.7 }),
    porcelanato: M({ color: 0xffffff, map: pisoTex, roughness: 0.3 }),
    lobbyPiso: M({ color: 0xbdb5c4, roughness: 0.35 }),
    nucleo: M({ color: 0x5f5869, roughness: 0.85 }),
    teto: M({ color: 0xf7f4f0, roughness: 0.95, side: THREE.DoubleSide }),
    spot: M({ color: 0xffffff, emissive: 0xfff1d8, emissiveIntensity: 3 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: 0xd6e6f2, roughness: 0.02, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.5 }),
    caixilho: M({ color: 0x2d2a33, metalness: 0.5, roughness: 0.4 }),
    peitoril: M({ color: 0xe9e4dc, roughness: 0.4 }),
    porta: M({ color: 0xd9c6ae, roughness: 0.55 }),
    portaEnt: M({ color: 0x6b4a33, roughness: 0.5 }),
    nogueira: M({ color: 0x5e3f2b, roughness: 0.55 }),
    carvalho: M({ color: 0xb48a62, roughness: 0.55 }),
    laca: M({ color: 0xe8e2da, roughness: 0.45 }),
    lacaEsc: M({ color: 0x3e3a44, roughness: 0.5 }),
    tecido: M({ color: 0xa69a8f, roughness: 0.95 }),
    tecido2: M({ color: 0x6f7a72, roughness: 0.95 }),
    tecidoEsc: M({ color: 0x5c5866, roughness: 0.95 }),
    couro: M({ color: 0x8a5a3c, roughness: 0.6 }),
    lencol: M({ color: 0xf3efe8, roughness: 0.9 }),
    manta: M({ color: 0xc19a6b, roughness: 0.9 }),
    manta2: M({ color: 0x7d8fa3, roughness: 0.9 }),
    almofada: M({ color: 0xe0a77f, roughness: 0.9 }),
    cortina: M({ color: 0xeee6da, roughness: 1, transparent: true, opacity: 0.92 }),
    preto: M({ color: 0x1d1c21, roughness: 0.4 }),
    inox: M({ color: 0xc9ccd2, metalness: 0.9, roughness: 0.28 }),
    marmore: M({ color: 0xf1efea, roughness: 0.2 }),
    granito: M({ color: 0x2b2a30, roughness: 0.25 }),
    loucas: M({ color: 0xf8f8f6, roughness: 0.15 }),
    espelho: M({ color: 0xb9c3cb, metalness: 0.35, roughness: 0.12, envMapIntensity: 0.6 }),
    planta: M({ color: 0x3f6d48, roughness: 0.9, flatShading: true }),
    planta2: M({ color: 0x5a8a4a, roughness: 0.9, flatShading: true }),
    vaso: M({ color: 0xc9b29a, roughness: 0.8 }),
    vasoEsc: M({ color: 0x4a4250, roughness: 0.7 }),
    tela: M({ color: 0x0b0b10, emissive: 0x223355, emissiveIntensity: 0.25, roughness: 0.15 }),
    pendente: M({ color: 0x2a2520, emissive: 0xffc98a, emissiveIntensity: 2.2, side: THREE.DoubleSide }),
    abajur: M({ color: 0xf2e6d4, emissive: 0xffd9a6, emissiveIntensity: 1.2, roughness: 0.9 }),
    elevador: M({ color: 0x9aa0aa, metalness: 0.9, roughness: 0.3 }),
    tapete1: M({ color: 0xffffff, map: tapeteTex("#cdbfac", "rgba(120,95,70,.35)"), roughness: 1 }),
    tapete2: M({ color: 0xffffff, map: tapeteTex("#8e93a0", "rgba(240,235,225,.35)"), roughness: 1 }),
    tapete3: M({ color: 0xffffff, map: tapeteTex("#d9cbb8", "rgba(160,110,80,.4)"), roughness: 1 }),
    quadros: [quadroTex(["#e9dfd2", "#d58a5e", "#2f3b4c", "#c9b38f"]), quadroTex(["#1f2433", "#ffb38a", "#c9b6ff", "#f6f1ff"]), quadroTex(["#efe9e0", "#5f7a63", "#c2a27c"])].map((t) => M({ map: t, roughness: 0.6 })),
  };
  const vidroAndar = () => M({ color: 0x0c1122, metalness: 1, roughness: 0.07, envMapIntensity: 1.15, emissive: 0xffd0a0, emissiveMap: luzTex, emissiveIntensity: 0 });

  /* ---------- helpers ---------- */
  const geoCache = new Map();
  const geoCaixa = (w, h, d, r) => {
    const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`;
    let g = geoCache.get(k);
    if (!g) { const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001); g = r && rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
    return g;
  };
  const caixa = (w, h, d, m, x, y, z, pai, r = 0) => { const o = new THREE.Mesh(geoCaixa(w, h, d, r), m); o.position.set(x, y, z); pai.add(o); return o; };

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
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 110 + rnd() * 300;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 40;
    if (z > 30 && Math.abs(x) < 70) continue;
    const w = 14 + rnd() * 22, d = 14 + rnd() * 22, h = 10 + rnd() * (r < 180 ? 30 : 70);
    const t = janelasCidade.clone(); t.needsUpdate = true; t.repeat.set(w / 24, h / 25);
    caixa(w, h, d, M({ color: 0x1b1630, roughness: 0.9, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45 + rnd() * 0.4 }), x, h / 2, z, scene);
  }

  /* ---------- torre ---------- */
  const torre = new THREE.Group(); scene.add(torre);
  const terreo = new THREE.Group(); torre.add(terreo);
  caixa(W - 6, TERREO - 0.6, 0.08, mat.lobby, 0, 0.5 + (TERREO - 0.6) / 2, HZ - 2.2, terreo);
  caixa(0.08, TERREO - 0.6, D - 5, mat.lobby, -HX + 3, 0.5 + (TERREO - 0.6) / 2, 0, terreo);
  caixa(0.08, TERREO - 0.6, D - 5, mat.lobby, HX - 3, 0.5 + (TERREO - 0.6) / 2, 0, terreo);
  caixa(W - 6, TERREO - 0.6, 0.3, mat.fachada, 0, 0.5 + (TERREO - 0.6) / 2, -HZ + 2.2, terreo);
  for (let x = -HX + 1; x <= HX - 1; x += 4.5) caixa(0.6, TERREO, 0.6, mat.laje, x, TERREO / 2, HZ - 0.6, terreo);
  caixa(14, 0.35, 5, mat.laje, 0, 4.6, HZ + 1.6, terreo);
  caixa(13.6, 0.06, 4.6, mat.led, 0, 4.4, HZ + 1.6, terreo);

  const andares = [], vidros = [];
  const intens = new Array(N + 1).fill(0), alvo = new Array(N + 1).fill(0);
  const pickScene = new THREE.Scene();
  const pickGeo = new THREE.BoxGeometry(W + 1, H, D + 5);
  const hv = H - LAJE;
  function varandaExt(g, x0, x1, lado) {
    const len = x1 - x0, cx = (x0 + x1) / 2, z = lado * (HZ + 1.1), zg = lado * (HZ + 2.18);
    caixa(len, 0.26, 2.2, mat.laje, cx, 0.13, z, g);
    caixa(len, 1.05, 0.03, mat.guarda, cx, 0.26 + 0.53, zg, g);
    caixa(len, 0.05, 0.07, mat.metal, cx, 0.26 + 1.07, zg, g);
    for (const x of [x0, x1]) caixa(0.03, 1.05, 2.2, mat.guarda, x, 0.79, z, g);
  }
  for (let a = 1; a <= N; a++) {
    const g = new THREE.Group(); g.position.y = baseY(a); torre.add(g);
    const vidro = vidroAndar(); vidros[a] = vidro;
    const casca = new THREE.Group(); g.add(casca);
    const tipo = tipoAndar(a);
    caixa(W + 0.5, LAJE, D + 0.5, mat.laje, 0, LAJE / 2, 0, g);
    for (const s of [-1, 1]) {
      for (const lado of [-1, 1]) caixa(HX - NUC - 0.2, hv, 0.06, vidro, s * (NUC + (HX - NUC) / 2), LAJE + hv / 2, lado * (HZ - 0.05), casca);
      caixa(0.24, hv, D, mat.fachada, s * (HX - 0.12), LAJE + hv / 2, 0, casca);
      for (const z of [-3.6, 3.6]) caixa(0.06, 1.75, 3.2, vidro, s * (HX + 0.01), LAJE + 1.8, z, casca);
    }
    for (const lado of [-1, 1]) caixa(2 * NUC, H, 0.5, mat.espinha, 0, H / 2, lado * (HZ + 0.05), g);
    const mont = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, hv, 0.12), mat.metal, 24);
    let k = 0; const m4 = new THREE.Matrix4();
    for (const s of [-1, 1]) for (let u = 0; u <= 11; u += 2.2) for (const lado of [-1, 1]) { m4.makeTranslation(s * (NUC + u), LAJE + hv / 2, lado * HZ); mont.setMatrixAt(k++, m4); }
    mont.count = k; casca.add(mont);
    if (tipo === "dois") { for (const s of [-1, 1]) for (const lado of [-1, 1]) varandaExt(g, s < 0 ? -NUC - 7.6 : NUC, s < 0 ? -NUC : NUC + 7.6, lado); }
    else for (const s of [-1, 1]) varandaExt(g, s < 0 ? -HX : NUC, s < 0 ? -NUC : HX, 1);
    const pk = new THREE.Mesh(pickGeo); pk.position.set(0, baseY(a) + H / 2, 0); pk.userData.andar = a; pickScene.add(pk);
    g.userData = { casca, y0: baseY(a), dy: 0, alvoDy: 0 };
    andares[a] = g;
  }
  const coroa = new THREE.Group(); coroa.position.y = TOPO; torre.add(coroa);
  caixa(W + 0.5, LAJE, D + 0.5, mat.laje, 0, LAJE / 2, 0, coroa);
  caixa(W + 0.5, 1.2, 0.2, mat.fachada, 0, 0.9, HZ + 0.15, coroa);
  caixa(W + 0.5, 1.2, 0.2, mat.fachada, 0, 0.9, -HZ - 0.15, coroa);
  caixa(6, 4.2, D, mat.espinha, 0, 2.1, 0, coroa);
  caixa(W + 0.6, 0.08, 0.08, mat.led, 0, 1.55, HZ + 0.28, coroa);
  const aletas = new THREE.Group(); torre.add(aletas);
  for (const s of [-1, 1]) caixa(0.5, TOPO - TERREO + 4, 1.4, mat.laje, s * (HX + 0.25), TERREO + (TOPO - TERREO + 4) / 2, HZ - 0.4, aletas);

  /* ================================================================
     MAQUETE DO ANDAR
     Cada apartamento é desenhado em coordenadas locais (u, w):
     u vai do núcleo (u = 0) até a fachada lateral (u = 11);
     w vai do meio/fundos (w = 0) até a fachada com varanda.
     O grupo da unidade é espelhado (escala ±1) para cada canto.
     ================================================================ */
  const FOTO = (id) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;
  const FOTOS = {
    sala: FOTO("1600607687939-ce8a6c25118c"), jantar: FOTO("1617806118233-18e1de247200"), cozinha: FOTO("1556911220-bff31c812dba"),
    master: FOTO("1616594039964-ae9021a400a0"), suite: FOTO("1631049307264-da0ec9d70304"), dorm: FOTO("1540518614846-7eded433c457"),
    banhoM: FOTO("1620626011761-996317b8d101"), banho: FOTO("1584622650111-993a426fbf0a"), lavabo: FOTO("1552321554-5fefe8c9ef14"),
    servico: FOTO("1626806787461-102c1bfaaea1"), varanda: FOTO("1604014237800-1c9102c219da"),
  };
  const PISO = { social: "madeira", quarto: "madeira", hall: "madeira", cozinha: "porcelanato", molhado: "porcelanato", servico: "porcelanato", varanda: "deck" };

  const PLANTAS = {
    dois: {
      U: 11, W: 7.5,
      ext: (eixo, v) => (eixo === "w" && v === 7.5) || (eixo === "u" && v === 11),
      entrada: [0.6, 1.5],
      comodos: [
        ["entrada", "Entrada", "hall", 0, 0, 1.6, 2.5],
        ["cozinha", "Cozinha", "cozinha", 1.6, 0, 4.6, 2.5, FOTOS.cozinha],
        ["servico", "Área de serviço", "servico", 4.6, 0, 6.2, 2.5, FOTOS.servico],
        ["banho", "Banho social", "molhado", 6.2, 0, 8.0, 2.5, FOTOS.banho],
        ["banhoS", "Banho da suíte", "molhado", 8.0, 0, 11, 2.5, FOTOS.banhoM],
        ["hall", "Circulação", "hall", 4.6, 2.5, 11, 3.6],
        ["living", "Living e jantar", "social", 0, 2.5, 4.6, 7.5, FOTOS.sala],
        ["dorm", "Dormitório", "quarto", 4.6, 3.6, 7.6, 7.5, FOTOS.dorm],
        ["suite", "Suíte", "quarto", 7.6, 3.6, 11, 7.5, FOTOS.master],
        ["varanda", "Varanda gourmet", "varanda", 0, 7.5, 7.6, 9.5, FOTOS.varanda],
      ],
      abertos: [["entrada", "living"], ["cozinha", "living"], ["entrada", "cozinha"], ["living", "hall"]],
      portas: [["servico", "cozinha"], ["banho", "hall"], ["banhoS", "hall", 9.0], ["dorm", "hall", 6.6], ["suite", "hall", 8.25]],
      moveis(m) {
        m.tapete(2.4, 5.6, 2.6, 1.9, mat.tapete1);
        m.tv(0.06, 5.6, Math.PI / 2, 2.2);
        m.sofa(3.75, 5.6, 2.3, -Math.PI / 2, mat.tecido);
        m.mesaCentro(2.3, 5.6, 0.9, 0.55);
        m.poltrona(2.2, 7.0, Math.PI, mat.tecido2);
        m.mesa(2.6, 3.35, 1.3, 0.85, 0, 4);
        m.pendente(2.6, 3.35, 2);
        m.planta(4.25, 7.15, 1.1); m.luminariaChao(0.35, 7.1);
        m.quadro(0.03, 3.4, Math.PI / 2, 1);
        m.bancada(1.65, 0, 4.55, 0.62, "w0", { pia: 3.5, cooktop: 2.3 });
        m.armarioAlto(1.65, 0, 4.55, 0.36);
        m.lavadora(5.0, 0.38, 0); m.tanque(5.85, 0.33, 0);
        m.banheiro(6.2, 0, 8.0, 2.5, "w1", false);
        m.banheiro(8.0, 0, 11, 2.5, "w1", true);
        m.cama(6.55, 6.0, 1.4, -Math.PI / 2, mat.manta2);
        m.armario(4.9, 4.55, 0.6, 1.7, Math.PI / 2);
        m.planta(4.95, 7.1, 0.8);
        m.cortina("w", 7.5, 4.6, 7.6);
        m.cama(9.95, 5.55, 1.6, -Math.PI / 2, mat.manta);
        m.armario(7.9, 6.0, 0.6, 2.0, Math.PI / 2);
        m.tapete(9.3, 5.55, 2.2, 2.6, mat.tapete3);
        m.cortina("w", 7.5, 7.6, 11);
        m.churrasqueira(0.35, 8.5, Math.PI / 2);
        m.mesa(3.0, 8.5, 1.4, 0.8, 0, 4, mat.nogueira);
        m.poltrona(6.0, 8.6, Math.PI, mat.tecido2); m.planta(7.15, 9.1, 0.9); m.planta(1.3, 9.15, 0.75);
      },
      luzes: [[2.4, 5.4, 9], [3.0, 1.2, 6], [6.1, 5.6, 5], [9.3, 5.6, 6], [7.8, 3.0, 3]],
      spawn: [2.0, 4.2],
    },
    tres: {
      U: 11, W: 15,
      ext: (eixo, v) => (eixo === "w" && (v === 0 || v === 15)) || (eixo === "u" && v === 11),
      entrada: [8.0, 8.9],
      comodos: [
        ["suite3", "Suíte 3", "quarto", 0, 0, 3.8, 4.2, FOTOS.dorm],
        ["suite2", "Suíte 2", "quarto", 3.8, 0, 7.4, 4.2, FOTOS.suite],
        ["master", "Suíte master", "quarto", 7.4, 0, 11, 4.2, FOTOS.master],
        ["hall", "Circulação íntima", "hall", 0, 4.2, 11, 5.4],
        ["banho3", "Banho suíte 3", "molhado", 0, 5.4, 2, 7.8, FOTOS.banho],
        ["banho2", "Banho suíte 2", "molhado", 2, 5.4, 4, 7.8, FOTOS.banho],
        ["galeria", "Galeria", "hall", 4, 5.4, 5.2, 7.8],
        ["servico", "Área de serviço", "servico", 5.2, 5.4, 7.2, 7.8, FOTOS.servico],
        ["lavabo", "Lavabo", "molhado", 7.2, 5.4, 8.8, 7.8, FOTOS.lavabo],
        ["banhoM", "Banho master", "molhado", 8.8, 5.4, 11, 7.8, FOTOS.banhoM],
        ["entrada", "Hall de entrada", "hall", 0, 7.8, 2, 9.6],
        ["jantar", "Jantar", "social", 2, 7.8, 7, 9.6, FOTOS.jantar],
        ["cozinha", "Cozinha gourmet", "cozinha", 7, 7.8, 11, 15, FOTOS.cozinha],
        ["living", "Living", "social", 0, 9.6, 7, 15, FOTOS.sala],
        ["varanda", "Varanda gourmet", "varanda", 0, 15, 11, 17, FOTOS.varanda],
      ],
      abertos: [["entrada", "jantar"], ["jantar", "living"], ["entrada", "living"], ["galeria", "jantar"], ["galeria", "hall"], ["cozinha", "jantar"]],
      portas: [["suite3", "hall", 2.9], ["suite2", "hall", 6.5], ["master", "hall", 8.4], ["banho3", "hall"], ["banho2", "hall"], ["lavabo", "hall"], ["banhoM", "hall", 9.3], ["servico", "jantar", 6.55], ["cozinha", "living", 13.4, 1.4]],
      moveis(m) {
        m.cama(1.03, 2.0, 1.6, Math.PI / 2, mat.manta2); m.armario(3.5, 1.7, 0.6, 2.0, -Math.PI / 2); m.cortina("w", 0, 0, 3.8);
        m.cama(4.83, 2.0, 1.6, Math.PI / 2, mat.manta); m.armario(7.1, 1.7, 0.6, 2.0, -Math.PI / 2); m.cortina("w", 0, 3.8, 7.4);
        m.cama(9.95, 2.0, 1.9, -Math.PI / 2, mat.lencol); m.armario(7.7, 1.9, 0.6, 2.2, Math.PI / 2); m.tapete(9.2, 2.0, 2.4, 2.8, mat.tapete3); m.cortina("w", 0, 7.4, 11);
        m.banheiro(0, 5.4, 2, 7.8, "w0", false); m.banheiro(2, 5.4, 4, 7.8, "w0", false); m.banheiro(8.8, 5.4, 11, 7.8, "w0", true);
        m.lavabo(7.2, 5.4, 8.8, 7.8);
        m.lavadora(5.6, 5.72, 0); m.tanque(6.6, 5.67, 0);
        m.quadro(4.03, 6.6, Math.PI / 2, 2); m.quadro(5.17, 6.6, -Math.PI / 2, 0);
        m.planta(1.6, 9.2, 0.7);
        m.mesa(4.5, 8.7, 2.1, 0.95, 0, 6);
        m.pendente(4.0, 8.7, 2); m.pendente(5.0, 8.7, 2);
        m.tapete(3.4, 12.3, 3.2, 2.6, mat.tapete2);
        m.tv(0.06, 12.3, Math.PI / 2, 2.6);
        m.sofa(4.9, 12.3, 2.9, -Math.PI / 2, mat.tecido);
        m.mesaCentro(3.2, 12.3, 1.1, 0.65);
        m.poltrona(2.9, 14.2, Math.PI, mat.couro); m.poltrona(3.9, 14.2, Math.PI, mat.couro);
        m.planta(6.6, 14.55, 1.2); m.luminariaChao(0.4, 14.5); m.quadro(0.03, 10.4, Math.PI / 2, 1);
        m.bancada(10.38, 8.0, 11, 12.6, "u1", { pia: 10.8, cooktop: 9.0 });
        m.armarioAlto(10.64, 8.0, 11, 10.3);
        m.geladeira(10.6, 13.3, -Math.PI / 2); m.torre(10.6, 14.1, -Math.PI / 2);
        m.ilha(8.5, 10.6, 1.0, 2.4); m.banquetas(7.75, 10.6, 3);
        m.pendente(8.5, 10.0, 1.9); m.pendente(8.5, 11.2, 1.9);
        m.churrasqueira(10.6, 16.0, -Math.PI / 2);
        m.mesa(7.4, 16.0, 1.8, 0.9, 0, 6, mat.nogueira);
        m.poltrona(2.0, 16.1, Math.PI, mat.tecido2); m.poltrona(3.2, 16.1, Math.PI, mat.tecido2);
        m.planta(0.5, 16.5, 1.0); m.planta(4.7, 16.55, 0.8);
      },
      luzes: [[3.4, 12.3, 10], [4.5, 8.7, 7], [8.8, 11, 8], [9.2, 2.0, 7], [5.5, 2.0, 5], [1.8, 2.0, 5], [5.5, 4.8, 3]],
      spawn: [2.2, 11.6],
    },
  };
  PLANTAS.cob = PLANTAS.tres;
  // posição de cada unidade no andar: [px, pz, sx, sz]
  const POS = {
    dois: [[-NUC, 0, -1, 1], [NUC, 0, 1, 1], [NUC, 0, 1, -1], [-NUC, 0, -1, -1]],
    tres: [[-NUC, -HZ, -1, 1], [NUC, -HZ, 1, 1]],
  };
  POS.cob = POS.tres;

  const interior = new THREE.Group(); interior.visible = false; scene.add(interior);
  let obst = [], pisos = [], unidades = [], tampas = [], tetos = [], luzesInt = [], portasMundo = [], conflitos = [];
  const ESP = 0.12, ESPX = 0.2;

  function limpar(o) { for (const c of [...o.children]) o.remove(c); }

  function construirUnidade(planta, pos, idx) {
    const [px, pz, sx, sz] = pos;
    const g = new THREE.Group(); g.position.set(px, 0, pz); g.scale.set(sx, 1, sz); interior.add(g);
    const obstLocal = [];
    let emMoveis = false;
    const solido = (u0, w0, u1, w1) => obstLocal.push([Math.min(u0, u1), Math.min(w0, w1), Math.max(u0, u1), Math.max(w0, w1), emMoveis]);
    const vaosLocal = [];
    const sombra = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
    const cx = (u, y, w, wd, h, dp, m, r = 0) => sombra(caixa(wd, h, dp, m, u, y, w, g, r));
    const comodos = planta.comodos.map(([id, nome, tipo, u0, w0, u1, w1, foto]) => ({ id, nome, tipo, u0, w0, u1, w1, foto }));
    const porId = Object.fromEntries(comodos.map((c) => [c.id, c]));
    const par = (a, b) => (x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a);

    for (const c of comodos) {
      const m0 = mat[PISO[c.tipo]], w = c.u1 - c.u0, d = c.w1 - c.w0;
      const mm = m0.clone();
      if (m0.map) { const esc = c.tipo === "varanda" ? 3 : m0 === mat.madeira ? 4 : 0.9; mm.map = m0.map.clone(); mm.map.needsUpdate = true; mm.map.repeat.set(w / esc, d / esc); }
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mm);
      p.rotation.x = -Math.PI / 2; p.position.set((c.u0 + c.u1) / 2, c.tipo === "varanda" ? -0.03 : 0.01, (c.w0 + c.w1) / 2); p.receiveShadow = true; g.add(p);
      p.userData = { nome: c.nome, foto: c.foto || null, un: idx, area: Math.round(w * d), tipo: c.tipo };
      pisos.push(p); c.mesh = p;
    }
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(planta.U, planta.W), mat.teto);
    teto.rotation.x = Math.PI / 2; teto.position.set(planta.U / 2, PE + 0.03, planta.W / 2); teto.visible = false; teto.castShadow = true; g.add(teto); tetos.push(teto);

    /* ----- paredes geradas a partir dos cômodos ----- */
    const linhas = new Map();
    for (const c of comodos) {
      const add = (eixo, v, a, b) => { const k = `${eixo}|${v}`; if (!linhas.has(k)) linhas.set(k, []); linhas.get(k).push({ a, b, id: c.id }); };
      add("w", c.w0, c.u0, c.u1); add("w", c.w1, c.u0, c.u1); add("u", c.u0, c.w0, c.w1); add("u", c.u1, c.w0, c.w1);
    }
    const peca = (eixo, v, a, b, y0, y1, m = mat.parede, esp = ESP) => {
      const len = b - a; if (len < 0.02) return;
      const c = (a + b) / 2, h = y1 - y0;
      const o = eixo === "w" ? cx(c, y0 + h / 2, v, len, h, esp, m) : cx(v, y0 + h / 2, c, esp, h, len, m);
      if (y0 === 0 && m === mat.parede) eixo === "w" ? caixa(len, 0.08, esp + 0.024, mat.rodape, c, 0.04, v, g) : caixa(esp + 0.024, 0.08, len, mat.rodape, v, 0.04, c, g);
      if (y1 >= PE - 0.01) tampas.push(eixo === "w" ? caixa(len, 0.02, esp + 0.004, mat.tampa, c, PE + 0.01, v, g) : caixa(esp + 0.004, 0.02, len, mat.tampa, v, PE + 0.01, c, g));
      return o;
    };
    const solidoLinha = (eixo, v, a, b, esp = ESP) => { if (b - a > 0.02) (eixo === "w" ? solido(a, v - esp / 2, b, v + esp / 2) : solido(v - esp / 2, a, v + esp / 2, b)); };
    function porta(eixo, v, a, b, lado, larg, m = mat.porta) {
      // verga, batentes e folha fechada; a folha gira 90° para dentro do cômodo quando alguém se aproxima
      peca(eixo, v, a, b, 2.12, PE);
      const fl = larg - 0.08, h = 2.1, espB = (m === mat.portaEnt ? ESPX : ESP) + 0.03;
      if (eixo === "w") { caixa(0.05, 2.14, espB, mat.batente, a + 0.025, 1.07, v, g); caixa(0.05, 2.14, espB, mat.batente, b - 0.025, 1.07, v, g); caixa(b - a, 0.05, espB, mat.batente, (a + b) / 2, 2.135, v, g); }
      else { caixa(espB, 2.14, 0.05, mat.batente, v, 1.07, a + 0.025, g); caixa(espB, 2.14, 0.05, mat.batente, v, 1.07, b - 0.025, g); caixa(espB, 0.05, b - a, mat.batente, v, 2.135, (a + b) / 2, g); }
      const piv = new THREE.Group(); g.add(piv);
      if (eixo === "w") { piv.position.set(a + 0.05, 0, v); sombra(caixa(fl, h, 0.04, m, fl / 2, h / 2, 0, piv)); caixa(0.12, 0.03, 0.03, mat.inox, fl - 0.1, 1.0, 0.04, piv); caixa(0.12, 0.03, 0.03, mat.inox, fl - 0.1, 1.0, -0.04, piv); }
      else { piv.position.set(v, 0, a + 0.05); sombra(caixa(0.04, h, fl, m, 0, h / 2, fl / 2, piv)); caixa(0.03, 0.03, 0.12, mat.inox, 0.04, 1.0, fl - 0.1, piv); caixa(0.03, 0.03, 0.12, mat.inox, -0.04, 1.0, fl - 0.1, piv); }
      const aberta = eixo === "w" ? -lado * Math.PI / 2 : lado * Math.PI / 2;
      const cl = eixo === "w" ? [(a + b) / 2, v] : [v, (a + b) / 2];
      portasMundo.push({ piv, aberta, ang: 0, x: px + sx * cl[0], z: pz + sz * cl[1] });
      vaosLocal.push({ eixo, v, a, b, nome: m === mat.portaEnt ? "entrada" : "porta" });
    }
    function janela(eixo, v, a, b, y0, y1) {
      const len = b - a, c = (a + b) / 2, hh = y1 - y0;
      peca(eixo, v, a, b, 0, y0, mat.parede, ESPX); peca(eixo, v, a, b, y1, PE, mat.parede, ESPX);
      eixo === "w" ? caixa(len, hh, 0.02, mat.vidro, c, y0 + hh / 2, v, g) : caixa(0.02, hh, len, mat.vidro, v, y0 + hh / 2, c, g);
      const hor = (yy) => eixo === "w" ? caixa(len, 0.05, 0.08, mat.caixilho, c, yy, v, g) : caixa(0.08, 0.05, len, mat.caixilho, v, yy, c, g);
      const ver = (pp) => eixo === "w" ? caixa(0.05, hh, 0.08, mat.caixilho, pp, y0 + hh / 2, v, g) : caixa(0.08, hh, 0.05, mat.caixilho, v, y0 + hh / 2, pp, g);
      hor(y0); hor(y1); ver(a + 0.02); ver(b - 0.02); if (len > 1.4) ver(c);
      if (y0 > 0.1) sombra(eixo === "w" ? caixa(len + 0.1, 0.03, ESPX + 0.08, mat.peitoril, c, y0, v, g) : caixa(ESPX + 0.08, 0.03, len + 0.1, mat.peitoril, v, y0, c, g));
    }
    function vidraca(eixo, v, a, b, aberturas = []) {
      const len = b - a, c = (a + b) / 2;
      eixo === "w" ? caixa(len, PE - 0.06, 0.02, mat.vidro, c, PE / 2, v, g) : caixa(0.02, PE - 0.06, len, mat.vidro, v, PE / 2, c, g);
      const hor = (yy) => eixo === "w" ? caixa(len, 0.06, 0.08, mat.caixilho, c, yy, v, g) : caixa(0.08, 0.06, len, mat.caixilho, v, yy, c, g);
      const ver = (pp) => eixo === "w" ? caixa(0.05, PE, 0.08, mat.caixilho, pp, PE / 2, v, g) : caixa(0.08, PE, 0.05, mat.caixilho, v, PE / 2, pp, g);
      hor(0.03); hor(PE - 0.03);
      const passo = len / Math.max(1, Math.round(len / 1.5));
      for (let p = a; p <= b + 0.01; p += passo) ver(Math.min(p, b));
      let cur = a;
      for (const [p0, p1] of aberturas) { solidoLinha(eixo, v, cur, p0, 0.1); cur = p1; }
      solidoLinha(eixo, v, cur, b, 0.1);
    }
    function guarda(eixo, v, a, b) {
      const len = b - a, c = (a + b) / 2;
      eixo === "w" ? caixa(len, 1.05, 0.02, mat.vidro, c, 0.53, v, g) : caixa(0.02, 1.05, len, mat.vidro, v, 0.53, c, g);
      eixo === "w" ? caixa(len, 0.05, 0.07, mat.caixilho, c, 1.07, v, g) : caixa(0.07, 0.05, len, mat.caixilho, v, 1.07, c, g);
      solidoLinha(eixo, v, a, b, 0.1);
    }

    for (const [k, segs] of linhas) {
      const [eixo, vs] = k.split("|"); const v = +vs;
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
        if (t.ids.length === 2) {
          if (planta.abertos.some(par(A.id, B.id))) continue;
          const varanda = A.tipo === "varanda" ? A : B.tipo === "varanda" ? B : null;
          if (varanda) {
            const outro = varanda === A ? B : A;
            if (outro.tipo === "social" || outro.tipo === "cozinha") { const md = (t.a + t.b) / 2, L = Math.min(1.8, t.b - t.a - 0.6); vidraca(eixo, v, t.a, t.b, [[md - L / 2, md + L / 2]]); }
            else vidraca(eixo, v, t.a, t.b);
            continue;
          }
          const p = planta.portas.find(par(A.id, B.id));
          if (p) {
            const larg = p[3] || 0.8;
            const pc = THREE.MathUtils.clamp(p[2] ?? (t.a + t.b) / 2, t.a + larg / 2 + 0.05, t.b - larg / 2 - 0.05);
            const g0 = pc - larg / 2, g1 = pc + larg / 2;
            peca(eixo, v, t.a, g0, 0, PE); solidoLinha(eixo, v, t.a, g0);
            peca(eixo, v, g1, t.b, 0, PE); solidoLinha(eixo, v, g1, t.b);
            const alvoC = porId[p[0]], centro = eixo === "w" ? (alvoC.w0 + alvoC.w1) / 2 : (alvoC.u0 + alvoC.u1) / 2;
            if (larg > 1.2) { peca(eixo, v, g0, g1, 2.12, PE); vaosLocal.push({ eixo, v, a: g0, b: g1, nome: "vão" }); } else porta(eixo, v, g0, g1, Math.sign(centro - v), larg);
          } else { peca(eixo, v, t.a, t.b, 0, PE); solidoLinha(eixo, v, t.a, t.b); }
        } else if (t.ids.length === 1) {
          const c = A;
          if (c.tipo === "varanda") {
            if (eixo === "u" && v === 0) { peca(eixo, v, t.a, t.b, 0, PE, mat.parede, ESPX); solidoLinha(eixo, v, t.a, t.b, ESPX); } else guarda(eixo, v, t.a, t.b);
            continue;
          }
          if (eixo === "u" && v === 0 && c.id === "entrada") {
            const [e0, e1] = planta.entrada;
            peca(eixo, v, t.a, e0, 0, PE, mat.parede, ESPX); solidoLinha(eixo, v, t.a, e0, ESPX);
            peca(eixo, v, e1, t.b, 0, PE, mat.parede, ESPX); solidoLinha(eixo, v, e1, t.b, ESPX);
            porta(eixo, v, e0, e1, 1, e1 - e0, mat.portaEnt);
            continue;
          }
          if (planta.ext(eixo, v)) {
            const L = t.b - t.a, md = (t.a + t.b) / 2;
            const jan = c.tipo === "quarto" ? [Math.min(L - 0.8, 2.2), 0.5, 2.35] : c.tipo === "social" ? [L - 0.4, 0.05, 2.5] : c.tipo === "cozinha" ? [Math.min(L - 0.6, 1.8), 1.05, 2.25] : c.tipo === "hall" ? null : [Math.min(L - 0.6, 0.9), 1.6, 2.2];
            if (jan && jan[0] > 0.4) {
              const j0 = md - jan[0] / 2, j1 = md + jan[0] / 2;
              peca(eixo, v, t.a, j0, 0, PE, mat.parede, ESPX); peca(eixo, v, j1, t.b, 0, PE, mat.parede, ESPX);
              janela(eixo, v, j0, j1, jan[1], jan[2]);
            } else peca(eixo, v, t.a, t.b, 0, PE, mat.parede, ESPX);
          } else peca(eixo, v, t.a, t.b, 0, PE, mat.parede, ESPX);
          solidoLinha(eixo, v, t.a, t.b, ESPX);
        }
      }
    }

    /* ----- móveis ----- */
    const giro = (larg, prof, rot) => (Math.abs(Math.sin(rot)) > 0.5 ? [prof, larg] : [larg, prof]);
    const grupoRot = (u, w, rot, pai = g) => { const q = new THREE.Group(); q.position.set(u, 0, w); q.rotation.y = rot; pai.add(q); return q; };
    const sc = (q, wd, h, dp, m, x, y, z, r = 0) => sombra(caixa(wd, h, dp, m, x, y, z, q, r));
    const ocupa = (u, w, a, b, rot = 0) => { const [aa, bb] = giro(a, b, rot); solido(u - aa / 2, w - bb / 2, u + aa / 2, w + bb / 2); };
    const cadeira = (q, x, z, rot) => { const c = grupoRot(x, z, rot, q); sc(c, 0.44, 0.05, 0.44, mat.tecidoEsc, 0, 0.46, 0, 0.02); sc(c, 0.44, 0.42, 0.05, mat.tecidoEsc, 0, 0.7, -0.2, 0.02); for (const lx of [-1, 1]) for (const lz of [-1, 1]) sc(c, 0.03, 0.44, 0.03, mat.nogueira, lx * 0.18, 0.22, lz * 0.18); };
    const m = {
      tapete(u, w, a, b, mt) { const t = new THREE.Mesh(new THREE.PlaneGeometry(a, b), mt); t.rotation.x = -Math.PI / 2; t.position.set(u, 0.018, w); t.receiveShadow = true; g.add(t); },
      cama(u, w, larg, rot, manta) {
        const q = grupoRot(u, w, rot), comp = 2.05, dupla = larg > 1.2;
        sc(q, larg + 0.08, 0.3, comp, mat.nogueira, 0, 0.15, 0, 0.03);
        sc(q, larg, 0.22, comp - 0.06, mat.lencol, 0, 0.41, 0.02, 0.09);
        sc(q, larg + 0.04, 0.07, comp * 0.55, manta, 0, 0.53, comp * 0.2, 0.04);
        sc(q, larg + 0.06, 0.04, 0.32, mat.lencol, 0, 0.555, -comp * 0.08, 0.02);
        for (const s of dupla ? [-1, 1] : [0]) sc(q, dupla ? larg / 2 - 0.1 : larg - 0.2, 0.15, 0.42, mat.lencol, s * larg / 4, 0.6, -comp / 2 + 0.32, 0.07);
        if (dupla) sc(q, 0.38, 0.28, 0.12, mat.almofada, 0, 0.66, -comp / 2 + 0.55, 0.05);
        sc(q, larg + 0.5, 1.1, 0.08, mat.tecidoEsc, 0, 0.6, -comp / 2 - 0.03, 0.03);
        for (const s of dupla ? [-1, 1] : [1]) {
          sc(q, 0.48, 0.5, 0.4, mat.carvalho, s * (larg / 2 + 0.36), 0.25, -comp / 2 + 0.24, 0.02);
          sc(q, 0.06, 0.24, 0.06, mat.preto, s * (larg / 2 + 0.36), 0.62, -comp / 2 + 0.22);
          const ab = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.2, 18), mat.abajur); ab.position.set(s * (larg / 2 + 0.36), 0.84, -comp / 2 + 0.22); q.add(ab);
        }
        ocupa(u, w, larg + 1.4, comp + 0.1, rot);
      },
      sofa(u, w, len, rot, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, len, 0.2, 0.92, tec, 0, 0.22, 0, 0.05);
        for (const s of [-1, 1]) sc(q, 0.18, 0.58, 0.92, tec, s * (len / 2 - 0.09), 0.33, 0, 0.06);
        const n = len > 2.4 ? 3 : 2, lw = (len - 0.36) / n;
        for (let i = 0; i < n; i++) { const x = -len / 2 + 0.18 + lw * (i + 0.5); sc(q, lw - 0.02, 0.16, 0.66, tec, x, 0.4, 0.1, 0.07); sc(q, lw - 0.04, 0.42, 0.2, tec, x, 0.66, -0.33, 0.09); }
        sc(q, 0.42, 0.38, 0.13, mat.almofada, -len / 2 + 0.45, 0.66, -0.15, 0.06); sc(q, 0.4, 0.36, 0.13, mat.lencol, len / 2 - 0.45, 0.65, -0.15, 0.06);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.05, 0.12, 0.05, mat.preto, s * (len / 2 - 0.1), 0.06, t * 0.38);
        ocupa(u, w, len, 0.95, rot);
      },
      poltrona(u, w, rot, tec) {
        const q = grupoRot(u, w, rot);
        sc(q, 0.78, 0.18, 0.78, tec, 0, 0.32, 0, 0.06); sc(q, 0.78, 0.5, 0.16, tec, 0, 0.62, -0.31, 0.07);
        for (const s of [-1, 1]) sc(q, 0.12, 0.3, 0.7, tec, s * 0.33, 0.52, 0, 0.05);
        for (const s of [-1, 1]) for (const t of [-1, 1]) sc(q, 0.04, 0.24, 0.04, mat.nogueira, s * 0.32, 0.12, t * 0.32);
        ocupa(u, w, 0.8, 0.8);
      },
      mesaCentro(u, w, a, b) { sc(g, a, 0.05, b, mat.marmore, u, 0.38, w, 0.02); sc(g, a - 0.2, 0.33, b - 0.2, mat.nogueira, u, 0.18, w, 0.02); ocupa(u, w, a, b); },
      mesa(u, w, a, b, rot, nCad, tampo = mat.carvalho) {
        const q = grupoRot(u, w, rot);
        sc(q, a, 0.05, b, tampo, 0, 0.745, 0, 0.02);
        for (const s of [-1, 1]) sc(q, 0.08, 0.72, b - 0.25, mat.preto, s * (a / 2 - 0.2), 0.36, 0);
        const porLado = Math.max(1, Math.floor(Math.min(nCad, 4) / 2));
        for (let i = 0; i < porLado; i++) for (const s of [-1, 1]) cadeira(q, -a / 2 + (i + 0.5) * (a / porLado), s * (b / 2 + 0.28), s > 0 ? Math.PI : 0);
        if (nCad > 4) for (const s of [-1, 1]) cadeira(q, s * (a / 2 + 0.28), 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
        ocupa(u, w, a + 0.3, b + 0.3, rot);
      },
      tv(u, w, rot, L) { const q = grupoRot(u, w, rot); sc(q, L + 0.6, 0.42, 0.42, mat.nogueira, 0, 0.36, 0.21, 0.02); sc(q, L * 0.55, L * 0.32, 0.04, mat.tela, 0, 1.35, 0.04, 0.01); solido(u, w - (L + 0.6) / 2, u + 0.45, w + (L + 0.6) / 2); },
      pendente(u, w, y = 1.9) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.18, 24, 1, true), mat.pendente); p.position.set(u, y, w); g.add(p); caixa(0.008, PE - y - 0.09, 0.008, mat.preto, u, (PE + y + 0.09) / 2, w, g); },
      luminariaChao(u, w) { sc(g, 0.3, 0.03, 0.3, mat.preto, u, 0.015, w); sc(g, 0.03, 1.45, 0.03, mat.preto, u, 0.75, w); const ab = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 20), mat.abajur); ab.position.set(u, 1.55, w); g.add(ab); ocupa(u, w, 0.3, 0.3); },
      planta(u, w, s = 1) {
        const v = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.15 * s, 0.42 * s, 20), s > 0.95 ? mat.vasoEsc : mat.vaso)); v.position.set(u, 0.21 * s, w); g.add(v);
        for (let i = 0; i < 4; i++) { const f = sombra(new THREE.Mesh(new THREE.IcosahedronGeometry((0.32 - i * 0.04) * s, 1), i % 2 ? mat.planta2 : mat.planta)); f.position.set(u + Math.sin(i * 2.1) * 0.12 * s, (0.62 + i * 0.28) * s, w + Math.cos(i * 2.1) * 0.12 * s); g.add(f); }
        ocupa(u, w, 0.45 * s, 0.45 * s);
      },
      quadro(u, w, rot, k = 0, y = 1.55) { const q = grupoRot(u, w, rot); sc(q, 0.72, 0.92, 0.035, mat.preto, 0, y, 0.02); const t = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), mat.quadros[k % 3]); t.position.set(0, y, 0.04); q.add(t); },
      armario(u, w, prof, larg, rot) {
        const q = grupoRot(u, w, rot);
        sc(q, larg, 2.45, prof, mat.laca, 0, 1.225, 0, 0.01);
        const n = Math.max(2, Math.round(larg / 0.55));
        for (let i = 1; i < n; i++) caixa(0.008, 2.3, 0.01, mat.lacaEsc, -larg / 2 + (i * larg) / n, 1.22, prof / 2 + 0.002, q);
        for (let i = 0; i < n; i++) caixa(0.02, 0.3, 0.02, mat.inox, -larg / 2 + ((i + (i % 2 ? 0.15 : 0.85)) * larg) / n, 1.1, prof / 2 + 0.015, q);
        ocupa(u, w, larg, prof, rot);
      },
      escrivaninha(u, w, a, b, rot) { const q = grupoRot(u, w, rot); sc(q, a, 0.04, b, mat.carvalho, 0, 0.75, 0, 0.01); for (const s of [-1, 1]) sc(q, 0.04, 0.73, b, mat.preto, s * (a / 2 - 0.04), 0.365, 0); cadeira(q, 0, b / 2 + 0.25, Math.PI); ocupa(u, w, a, b, rot); },
      aparador(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 1.4, 0.8, 0.38, mat.nogueira, 0, 0.4, 0.19, 0.02); caixa(0.9, 0.7, 0.02, mat.espelho, 0, 1.45, 0.01, q); const [a, b] = giro(1.4, 0.4, rot); solido(u, w - b / 2, u + a, w + b / 2); },
      bancada(u0, w0, u1, w1, lado, { pia, cooktop } = {}) {
        const horiz = lado[0] === "w", P = 0.62;
        const ao = horiz ? [(u0 + u1) / 2, w0 + P / 2] : [u1 - P / 2, (w0 + w1) / 2];
        const dims = horiz ? [u1 - u0, P] : [P, w1 - w0];
        sc(g, dims[0], 0.1, dims[1], mat.lacaEsc, ao[0], 0.05, ao[1]);
        sc(g, dims[0] - 0.02, 0.76, dims[1] - 0.04, mat.laca, ao[0], 0.48, ao[1], 0.01);
        sc(g, dims[0] + 0.02, 0.04, dims[1] + 0.03, mat.granito, ao[0], 0.88, ao[1]);
        if (pia !== undefined) { const p = horiz ? [pia, ao[1]] : [ao[0], pia]; caixa(horiz ? 0.55 : 0.4, 0.02, horiz ? 0.4 : 0.55, mat.inox, p[0], 0.905, p[1], g); caixa(0.03, 0.3, 0.03, mat.inox, horiz ? p[0] : p[0] + 0.24, 1.05, horiz ? p[1] - 0.24 : p[1], g); }
        if (cooktop !== undefined) { const p = horiz ? [cooktop, ao[1]] : [ao[0], cooktop]; caixa(horiz ? 0.6 : 0.5, 0.012, horiz ? 0.5 : 0.6, mat.preto, p[0], 0.905, p[1], g); }
        solido(ao[0] - dims[0] / 2, ao[1] - dims[1] / 2, ao[0] + dims[0] / 2, ao[1] + dims[1] / 2);
      },
      armarioAlto(u0, w0, u1, w1) { const horiz = u1 - u0 > w1 - w0; horiz ? sc(g, u1 - u0, 0.72, 0.36, mat.laca, (u0 + u1) / 2, 1.95, w0 + 0.18, 0.01) : sc(g, 0.36, 0.72, w1 - w0, mat.laca, u1 - 0.18, 1.95, (w0 + w1) / 2, 0.01); },
      geladeira(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.75, 1.9, 0.7, mat.inox, 0, 0.95, 0, 0.03); caixa(0.02, 0.6, 0.02, mat.preto, 0.3, 1.2, 0.36, q); ocupa(u, w, 0.75, 0.7, rot); },
      torre(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.65, 2.2, 0.6, mat.laca, 0, 1.1, 0, 0.01); caixa(0.55, 0.45, 0.02, mat.preto, 0, 1.2, 0.31, q); caixa(0.55, 0.38, 0.02, mat.preto, 0, 0.7, 0.31, q); ocupa(u, w, 0.65, 0.6, rot); },
      ilha(u, w, a, b) { sc(g, a, 0.88, b, mat.nogueira, u, 0.44, w, 0.02); sc(g, a + 0.25, 0.04, b + 0.06, mat.marmore, u - 0.12, 0.9, w); solido(u - a / 2 - 0.25, w - b / 2, u + a / 2, w + b / 2); },
      banquetas(u, w, n) { for (let i = 0; i < n; i++) { const z = w + (i - (n - 1) / 2) * 0.62; const s = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 20), mat.couro)); s.position.set(u, 0.72, z); g.add(s); sc(g, 0.03, 0.7, 0.03, mat.preto, u, 0.35, z); } },
      lavadora(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.6, 0.85, 0.6, mat.loucas, 0, 0.425, 0, 0.04); const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24), mat.preto); pt.rotation.x = Math.PI / 2; pt.position.set(0, 0.45, 0.31); q.add(pt); ocupa(u, w, 0.6, 0.6, rot); },
      tanque(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 0.55, 0.85, 0.5, mat.loucas, 0, 0.425, 0, 0.04); ocupa(u, w, 0.55, 0.5, rot); },
      churrasqueira(u, w, rot) { const q = grupoRot(u, w, rot); sc(q, 1.6, 0.9, 0.6, mat.lacaEsc, 0, 0.45, 0, 0.02); sc(q, 1.62, 0.04, 0.62, mat.granito, 0, 0.92, 0); sc(q, 0.7, 0.6, 0.5, mat.preto, -0.35, 1.25, -0.02, 0.03); ocupa(u, w, 1.6, 0.6, rot); },
      banheiro(u0, w0, u1, w1, porta, banheira) {
        // bancada na parede oposta à porta, vaso na lateral, box ou banheira no outro lado
        const fundo = porta === "w1" ? w0 : w1, s = porta === "w1" ? 1 : -1;
        const bx = Math.min(1.1, u1 - u0 - 1.08), bu = u0 + 0.1 + bx / 2;
        sc(g, bx, 0.45, 0.5, mat.carvalho, bu, 0.62, fundo + s * 0.27, 0.02);
        sc(g, bx + 0.02, 0.04, 0.52, mat.marmore, bu, 0.86, fundo + s * 0.27);
        const cuba = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.12, 24), mat.loucas); cuba.position.set(bu, 0.93, fundo + s * 0.27); g.add(cuba);
        caixa(bx - 0.05, 0.8, 0.02, mat.espelho, bu, 1.6, fundo + s * 0.02, g);
        solido(u0 + 0.1, Math.min(fundo, fundo + s * 0.55), u0 + 0.1 + bx, Math.max(fundo, fundo + s * 0.55));
        const vz = fundo + s * 1.15;
        sc(g, 0.38, 0.4, 0.55, mat.loucas, u0 + 0.3, 0.2, vz, 0.15); sc(g, 0.38, 0.38, 0.16, mat.loucas, u0 + 0.12, 0.6, vz, 0.05);
        solido(u0, vz - 0.3, u0 + 0.6, vz + 0.3);
        if (banheira) { sc(g, 0.82, 0.55, 1.65, mat.loucas, u1 - 0.46, 0.28, fundo + s * 0.88, 0.15); solido(u1 - 0.88, Math.min(fundo, fundo + s * 1.72), u1, Math.max(fundo, fundo + s * 1.72)); }
        else { caixa(0.02, 2.0, 1.1, mat.vidro, u1 - 0.95, 1.0, fundo + s * 0.58, g); caixa(0.9, 0.03, 1.1, mat.porcelanato, u1 - 0.48, 0.02, fundo + s * 0.58, g); caixa(0.18, 0.02, 0.18, mat.inox, u1 - 0.48, 2.15, fundo + s * 0.5, g); solido(u1 - 0.95, Math.min(fundo, fundo + s * 1.15), u1, Math.max(fundo, fundo + s * 1.15)); }
      },
      lavabo(u0, w0, u1, w1) {
        const cu = (u0 + u1) / 2;
        sc(g, 0.9, 0.3, 0.42, mat.nogueira, cu, 0.85, w1 - 0.23, 0.02);
        const cuba = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.14, 24), mat.loucas); cuba.position.set(cu, 1.07, w1 - 0.23); g.add(cuba);
        caixa(0.7, 0.9, 0.02, mat.espelho, cu, 1.65, w1 - 0.02, g);
        sc(g, 0.38, 0.4, 0.55, mat.loucas, u0 + 0.3, 0.2, w1 - 1.0, 0.15);
        solido(u0, w1 - 1.3, u0 + 0.6, w1 - 0.7); solido(cu - 0.45, w1 - 0.45, cu + 0.45, w1);
      },
      cortina(eixo, v, a, b) {
        const dentro = v > 0 ? -1 : 1;
        for (const lado of [0, 1]) for (let i = 0; i < 4; i++) {
          const p = lado ? b - 0.14 - i * 0.09 : a + 0.14 + i * 0.09;
          if (eixo === "w") caixa(0.1, 2.5, 0.05, mat.cortina, p, 1.3, v + dentro * (0.2 + (i % 2) * 0.03), g);
          else caixa(0.05, 2.5, 0.1, mat.cortina, v + dentro * (0.2 + (i % 2) * 0.03), 1.3, p, g);
        }
      },
    };
    emMoveis = true; planta.moveis(m); emMoveis = false;
    for (const vo of vaosLocal) {
      const [ua, ub, wa, wb] = vo.eixo === "w" ? [vo.a, vo.b, vo.v - 0.9, vo.v + 0.9] : [vo.v - 0.9, vo.v + 0.9, vo.a, vo.b];
      for (const o of obstLocal) if (o[4] && o[0] < ub && o[2] > ua && o[1] < wb && o[3] > wa) conflitos.push({ unidade: idx, vao: vo.nome, linha: `${vo.eixo}=${vo.v}`, de: +vo.a.toFixed(2), ate: +vo.b.toFixed(2), movel: o.slice(0, 4).map((x) => +x.toFixed(2)) });
    }

    for (const [u0, w0, u1, w1] of obstLocal) {
      const xa = px + sx * u0, xb = px + sx * u1, za = pz + sz * w0, zb = pz + sz * w1;
      obst.push([Math.min(xa, xb), Math.min(za, zb), Math.max(xa, xb), Math.max(za, zb)]);
    }
    const centro = (u, w) => new THREE.Vector3(px + sx * u, 0, pz + sz * w);
    unidades.push({ g, planta, pos, idx, centro, comodos });
  }

  function construirNucleo() {
    const n = new THREE.Group(); interior.add(n);
    const sb = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2 * NUC, 4.4), mat.lobbyPiso); p.rotation.x = -Math.PI / 2; p.position.set(0, 0.012, 0); p.receiveShadow = true; n.add(p);
    sb(caixa(2 * NUC - 0.2, PE, 2.6, mat.nucleo, 0, PE / 2, 3.5, n));
    for (const x of [-1.2, 1.2]) caixa(1.0, 2.1, 0.03, mat.elevador, x, 1.05, 2.19, n);
    sb(caixa(2 * NUC - 0.2, PE, 2.6, mat.nucleo, 0, PE / 2, 6.2, n));
    sb(caixa(0.2, PE, 5.3, mat.nucleo, -NUC + 0.3, PE / 2, -4.85, n)); sb(caixa(0.2, PE, 5.3, mat.nucleo, NUC - 0.3, PE / 2, -4.85, n));
    sb(caixa(2 * NUC - 0.6, PE, 0.2, mat.nucleo, 0, PE / 2, -7.4, n));
    for (let i = 0; i < 9; i++) { sb(caixa(1.15, 0.17 * (i + 1), 0.28, mat.laje, -1.2, 0.085 * (i + 1), -2.6 - i * 0.28, n)); sb(caixa(1.15, 0.17 * (9 - i), 0.28, mat.laje, 1.2, 0.085 * (9 - i), -2.6 - i * 0.28, n)); }
    sb(caixa(2.4, 1.53, 1.3, mat.laje, 0, 0.765, -6.2, n));
    const q = caixa(0.6, 0.8, 0.02, mat.quadros[1], -NUC + 0.42, 1.5, 0, n); q.rotation.y = Math.PI / 2;
    obst.push([-NUC, 2.2, NUC, HZ], [-NUC, -HZ, NUC, -2.2]);
  }

  function montarAndar(a) {
    limpar(interior); obst = []; pisos = []; unidades = []; tampas = []; tetos = []; luzesInt = []; portasMundo = []; conflitos = [];
    const tipo = tipoAndar(a);
    POS[tipo].forEach((pos, i) => construirUnidade(PLANTAS[tipo], pos, i));
    construirNucleo();
    interior.position.y = baseY(a) + LAJE;
  }

  /* ---------- pós-processamento ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 256, 256);
  gtao.enabled = false;
  gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.4, thickness: 1.4, scale: 1, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- câmera e enquadramento ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 8; controls.maxDistance = 75; controls.maxPolarAngle = 1.3; controls.screenSpacePanning = true;
  let modo = "predio", andarAberto = 0, unidadeAtiva = 0;
  let largura = 1, altura = 1;
  const alvoPredio = new THREE.Vector3(0, TOPO * 0.5, 0);
  let distPredio = 120, mouseX = 0, mouseY = 0;
  const azBase = 0.62;
  const off = { x: 0, y: 0 }, offAlvo = { x: 0, y: 0 };
  const compacto = () => innerWidth <= 1040;
  function aplicarOff() { camera.setViewOffset(largura, altura, off.x, off.y, largura, altura); camera.updateProjectionMatrix(); }
  function enquadrar() {
    const r = host.getBoundingClientRect();
    largura = Math.max(1, r.width); altura = Math.max(1, r.height);
    renderer.setSize(largura, altura, false);
    composer.setSize(largura, altura);
    bloom.resolution.set(largura / 2, altura / 2);
    camera.aspect = largura / altura;
    const noPredio = modo === "predio" || modo === "fechando";
    if (noPredio) distPredio = ((TOPO + 6) / 2) / (Math.tan(THREE.MathUtils.degToRad(17)) * (compacto() ? 0.66 : 0.82));
    offAlvo.x = noPredio ? (compacto() ? 0 : -largura * 0.2) : 0;
    offAlvo.y = noPredio ? (compacto() ? -altura * 0.05 : altura * 0.02) : 0;
    aplicarOff();
  }
  new ResizeObserver(enquadrar).observe(host);

  /* ---------- interação no prédio ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const dica = $(".x3d__dica");
  const T = DADOS.T || {}, UN = DADOS.U || [];
  const resumoAndar = (a) => {
    const us = UN.filter((u) => u.andar === a), d = us.filter((u) => u.st === "d").length;
    const nome = { dois: "2 dormitórios", tres: "3 suítes", cob: "coberturas" }[tipoAndar(a)];
    return `${a}º andar · ${nome} · ${d ? `${d} disponíve${d > 1 ? "is" : "l"}` : "esgotado"}`;
  };
  function apontar(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
  }
  const posDica = (e, txt) => { const r = host.getBoundingClientRect(); dica.textContent = txt; dica.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px)`; dica.classList.add("on"); };
  function hoverAndar(a, e) {
    for (let i = 1; i <= N; i++) alvo[i] = i === a ? 1.7 : 0;
    canvas.style.cursor = a ? "pointer" : "";
    if (a && e) posDica(e, `${resumoAndar(a)} — clique para explorar`); else dica.classList.remove("on");
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
  canvas.addEventListener("pointerleave", () => { if (modo === "predio") hoverAndar(0); dica.classList.remove("on"); });
  let downAt = null;
  canvas.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("click", (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    if (modo === "predio") {
      apontar(e); pickScene.updateMatrixWorld();
      const hit = ray.intersectObjects(pickScene.children)[0];
      if (hit) { hoverAndar(hit.object.userData.andar); abrirAndar(hit.object.userData.andar); }
    } else if (modo === "explorar") {
      apontar(e);
      const hit = ray.intersectObjects(pisos)[0];
      if (hit) { const u = hit.object.userData; if (u.un !== unidadeAtiva) ativarUnidade(u.un); if (u.foto) abrirFoto(u); }
    }
  });

  /* ---------- abrir andar ---------- */
  const tween = { on: false };
  function voar(pos, tgt, dur, fim) { Object.assign(tween, { on: true, t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone(), fim }); }
  const ui = { titulo: $(".x3d__titulo"), sub: $(".x3d__sub"), rotulos: $(".x3d__rotulos"), foto: $(".x3d__foto") };
  let rotulos = [];
  function montarRotulos() {
    ui.rotulos.innerHTML = ""; rotulos = [];
    const us = UN.filter((u) => u.andar === andarAberto);
    for (const un of unidades) {
      if (un.idx === unidadeAtiva) continue;   // a unidade ativa já aparece no painel
      const u = us.find((q) => q.c === un.idx), pl = un.planta;
      const el = document.createElement("button"); el.className = "x3d__un" + (un.idx === unidadeAtiva ? " ativo" : "");
      if (u) {
        const t = T[u.tipo] || {}, st = { d: ["Disponível", "d"], r: ["Reservada", "r"], v: ["Vendida", "v"] }[u.st];
        el.innerHTML = `<b>${u.id}</b> ${t.n || ""} · ${t.m2 || ""} m²<i class="${st[1]}">${st[0]}</i>`;
      } else el.innerHTML = `<b>${andarAberto}0${un.idx + 1}</b>`;
      el.onclick = () => ativarUnidade(un.idx);
      ui.rotulos.append(el);
      rotulos.push({ el, p: un.centro(pl.U * 0.62, pl.W === 15 ? 5.6 : 3.05).setY(3.1) });
    }
    const ativa = unidades[unidadeAtiva];
    for (const c of ativa.comodos) {
      if (!c.foto || (c.u1 - c.u0) * (c.w1 - c.w0) < 5) continue;
      const el = document.createElement("button"); el.className = "x3d__comodo"; el.textContent = c.nome;
      el.onclick = () => abrirFoto(c.mesh.userData);
      el.onmouseenter = () => realcar(c.mesh); el.onmouseleave = () => realcar(null);
      ui.rotulos.append(el); rotulos.push({ el, p: ativa.centro((c.u0 + c.u1) / 2, (c.w0 + c.w1) / 2).setY(0.25) });
    }
  }
  function ativarUnidade(i) {
    unidadeAtiva = i; montarRotulos();
    const u = UN.find((q) => q.andar === andarAberto && q.c === i), t = u && T[u.tipo];
    ui.sub.textContent = `${u ? `Unidade ${u.id} · ${t?.n} · ${t?.m2} m² · ` : ""}clique num cômodo para ver a foto · arraste para girar`;
  }
  let realce = null;
  function realcar(p) {
    if (realce) { realce.material.emissive.setHex(0x000000); realce.material.emissiveIntensity = 0; }
    realce = p;
    if (p) { p.material.emissive.setHex(0xffb38a); p.material.emissiveIntensity = 0.22; }
    canvas.style.cursor = p ? "pointer" : "";
  }
  function hoverComodo(e) {
    apontar(e);
    const hit = ray.intersectObjects(pisos)[0];
    const p = hit && hit.object.userData.foto ? hit.object : null;
    realcar(p);
    if (p && e.pointerType === "mouse") posDica(e, `${p.userData.nome} — clique para ver a foto`); else dica.classList.remove("on");
  }
  const vistaAndar = (a) => { const y = baseY(a); return [new THREE.Vector3(-12, y + 31, 33), new THREE.Vector3(0, y + 3.2, 0.5)]; };
  function abrirAndar(a) {
    if (modo !== "predio") return;
    modo = "explorar"; andarAberto = a;
    montarAndar(a); unidadeAtiva = 0;
    host.classList.add("aberto"); document.body.classList.add("x3d-travado");
    dica.classList.remove("on");
    enquadrar();
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = i > a ? 70 + (i - a) * 3 : 0;
    coroa.userData.alvoDy = 70 + (N - a) * 3 + 6; aletas.visible = false;
    andares[a].userData.casca.visible = false;
    interior.visible = true;
    const y = baseY(a);
    luzMaquete();
    ui.titulo.textContent = a === 18 ? "18º andar · coberturas" : `${a}º andar · ${tipoAndar(a) === "dois" ? "4 apartamentos de 2 dormitórios" : "2 apartamentos de 3 suítes"}`;
    ativarUnidade(0);
    const [pos, tgt] = vistaAndar(a);
    controls.target.copy(tgt);
    voar(pos, tgt, 1.8, () => { controls.enabled = true; });
  }
  function luzMaquete() {
    const y = baseY(andarAberto);
    estudio.position.set(-16, y + 34, 22); estudio.target.position.set(0, y, 0); estudio.target.updateMatrixWorld();
    estudio.color.setHex(0xfff4e6);
    hemi.color.setHex(0xf2eeff); hemi.groundColor.setHex(0x5a5262);
    scene.environment = envInterno; scene.environmentIntensity = 0.35;
    renderer.toneMappingExposure = 1.0;
    bloom.threshold = 0.9; bloom.strength = 0.35;
  }
  function luzNoite() {
    hemi.color.setHex(0x9a8ad8); hemi.groundColor.setHex(0x1a1426);
    scene.environment = envCeu; scene.environmentIntensity = 1;
    renderer.toneMappingExposure = 1.05;
    bloom.threshold = 0.82; bloom.strength = 0.6;
  }
  function fechar() {
    if (modo === "andar") sairVisita();
    if (modo !== "explorar") return;
    modo = "fechando"; controls.enabled = false; fecharFoto(); enquadrar();
    ui.rotulos.innerHTML = ""; rotulos = []; realcar(null); dica.classList.remove("on");
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = 0;
    coroa.userData.alvoDy = 0;
    voar(posPredio(), alvoPredio, 1.5, () => {
      andares[andarAberto].userData.casca.visible = true; aletas.visible = true;
      interior.visible = false; limpar(interior); luzNoite();
      host.classList.remove("aberto"); document.body.classList.remove("x3d-travado");
      modo = "predio"; enquadrar(); hoverAndar(0);
    });
  }
  $(".x3d__voltar").onclick = fechar;
  $(".x3d__entrar").onclick = entrarVisita;
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.pointerLockElement) { if (ui.foto.classList.contains("on")) fecharFoto(); else if (modo === "andar") sairVisita(); else if (modo === "explorar") fechar(); } });

  /* ---------- foto do cômodo ---------- */
  const fotoLista = () => unidades[unidadeAtiva].comodos.filter((c) => c.foto).map((c) => c.mesh.userData);
  let fotoIdx = 0;
  function abrirFoto(info) { const l = fotoLista(); fotoIdx = Math.max(0, l.findIndex((x) => x.nome === info.nome)); mostrarFoto(info); }
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
  const OLHO = 1.62, RAIO = 0.26;
  let yaw = Math.PI, pitch = -0.05;
  const teclas = {}, joy = { x: 0, y: 0 };
  const posMundo = new THREE.Vector3();
  function entrarVisita() {
    if (modo !== "explorar") return;
    modo = "andar"; controls.enabled = false; fecharFoto(); realcar(null); dica.classList.remove("on");
    ui.rotulos.style.display = "none";
    tampas.forEach((t) => (t.visible = false)); tetos.forEach((t) => (t.visible = true));
    host.classList.add("visita"); host.classList.remove("calmo");
    clearTimeout(entrarVisita.t); entrarVisita.t = setTimeout(() => { if (modo === "andar") host.classList.add("calmo"); }, 6000);
    const un = unidades[unidadeAtiva], pl = un.planta, sx = un.pos[2], sz = un.pos[3];
    const sp = un.centro(pl.spawn[0], pl.spawn[1]); posMundo.set(sp.x, 0, sp.z);
    yaw = sz > 0 ? Math.PI : 0; pitch = -0.04;
    for (const [u, w, i] of pl.luzes) {
      const c = un.centro(u, w);
      const l = new THREE.PointLight(0xffd6a8, i * 0.55, 9, 2); l.position.set(c.x, PE - 0.25, c.z); interior.add(l); luzesInt.push(l);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), mat.spot); s.position.set(c.x, PE - 0.012, c.z); interior.add(s); luzesInt.push(s);
    }
    camera.fov = 70; camera.near = 0.05; camera.updateProjectionMatrix();
    // sol baixo vindo da fachada da unidade, entrando pelas janelas
    const fc = un.centro(pl.U / 2, pl.W / 2);
    estudio.position.set(fc.x - 9 * sx, interior.position.y + 7, fc.z + sz * 16); estudio.target.position.set(fc.x, interior.position.y, fc.z); estudio.target.updateMatrixWorld();
    estudio.color.setHex(0xffc89c);
    hemi.color.setHex(0xfff6ee); hemi.groundColor.setHex(0x7a6e64);
    scene.environment = envInterno; scene.environmentIntensity = 0.3;
    renderer.toneMappingExposure = 0.92;
    bloom.threshold = 0.97; bloom.strength = 0.25;
    if (!celular) canvas.requestPointerLock?.();
  }
  function sairVisita() {
    if (modo !== "andar") return;
    if (document.pointerLockElement) document.exitPointerLock();
    modo = "explorar"; ui.rotulos.style.display = "";
    tampas.forEach((t) => (t.visible = true)); tetos.forEach((t) => (t.visible = false));
    luzesInt.forEach((l) => interior.remove(l)); luzesInt = [];
    host.classList.remove("visita", "calmo"); clearTimeout(entrarVisita.t);
    camera.fov = 34; camera.near = 0.1; camera.updateProjectionMatrix();
    luzMaquete();
    const [pos, tgt] = vistaAndar(andarAberto); camera.position.copy(pos); controls.target.copy(tgt); controls.enabled = true;
  }
  $(".x3d__sair").onclick = sairVisita;
  $(".x3d__olhar").onclick = () => { canvas.requestPointerLock?.(); };
  document.addEventListener("pointerlockchange", () => host.classList.toggle("travado", document.pointerLockElement === canvas));
  // mouse: olhar só movendo, sem arrastar; clique trava o cursor (como em jogos); Esc solta
  document.addEventListener("mousemove", (e) => {
    if (modo !== "andar") return;
    const travado = document.pointerLockElement === canvas;
    if (!travado && e.target !== canvas) return;
    const k = travado ? 0.0022 : 0.0035;
    yaw -= e.movementX * k; pitch = THREE.MathUtils.clamp(pitch - e.movementY * k, -1.2, 1.2);
  });
  canvas.addEventListener("click", () => { if (modo === "andar" && document.pointerLockElement !== canvas && !celular) canvas.requestPointerLock?.(); });
  let arrasto = null;
  canvas.addEventListener("pointerdown", (e) => { if (modo === "andar" && e.pointerType !== "mouse") { arrasto = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
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
    const r = jb.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    joy.x = dx; joy.y = dy; jk.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
  }
  function colidir(p) {
    for (let it = 0; it < 3; it++) for (const [x1, z1, x2, z2] of obst) {
      const ax = x1 - RAIO, bx = x2 + RAIO, az = z1 - RAIO, bz = z2 + RAIO;
      if (p.x > ax && p.x < bx && p.z > az && p.z < bz) {
        const dl = p.x - ax, dr = bx - p.x, dt = p.z - az, db = bz - p.z, mn = Math.min(dl, dr, dt, db);
        if (mn === dl) p.x = ax; else if (mn === dr) p.x = bx; else if (mn === dt) p.z = az; else p.z = bz;
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -HX + 0.3, HX - 0.3); p.z = THREE.MathUtils.clamp(p.z, -HZ - 1.8, HZ + 1.8);
  }
  function andar(dt) {
    let f = (teclas.KeyW || teclas.ArrowUp ? 1 : 0) - (teclas.KeyS || teclas.ArrowDown ? 1 : 0) - joy.y;
    let s = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0) + joy.x;
    const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
    const v = (teclas.ShiftLeft || teclas.ShiftRight ? 3.6 : 2.0) * dt;
    posMundo.x += (-Math.sin(yaw) * f + Math.cos(yaw) * s) * v; posMundo.z += (-Math.cos(yaw) * f - Math.sin(yaw) * s) * v;
    colidir(posMundo);
    camera.position.set(posMundo.x, interior.position.y + OLHO, posMundo.z);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }

  /* ---------- laço ---------- */
  let relogio = 0, ultimo = performance.now(), visivel = true;
  function posPredio() {
    const az = azBase + (reduz ? 0 : Math.sin(relogio * 0.08) * 0.07) + mouseX * 0.12;
    return new THREE.Vector3(Math.sin(az) * distPredio, TOPO * 0.5 + 6 - mouseY * 8, Math.cos(az) * distPredio);
  }
  new IntersectionObserver((es) => { visivel = es[0].isIntersecting; }).observe(host);
  const v3 = new THREE.Vector3();
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const aproxima = (o, k, alvoV, dt) => { o[k] += (alvoV - o[k]) * Math.min(1, dt * 3); };
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    if (!visivel && modo === "predio") return;
    relogio += dt;
    if (Math.abs(off.x - offAlvo.x) + Math.abs(off.y - offAlvo.y) > 0.5) { const k = Math.min(1, dt * 3); off.x += (offAlvo.x - off.x) * k; off.y += (offAlvo.y - off.y) * k; aplicarOff(); }
    for (let i = 1; i <= N; i++) {
      intens[i] += (alvo[i] - intens[i]) * Math.min(1, dt * 6); vidros[i].emissiveIntensity = intens[i];
      const u = andares[i].userData; u.dy += (u.alvoDy - u.dy) * Math.min(1, dt * 3.2);
      andares[i].position.y = u.y0 + u.dy; andares[i].visible = u.dy < 60;
    }
    const cu = coroa.userData; cu.dy = (cu.dy || 0) + ((cu.alvoDy || 0) - (cu.dy || 0)) * Math.min(1, dt * 3.2);
    coroa.position.y = TOPO + cu.dy; coroa.visible = cu.dy < 60;
    if (tween.on) {
      tween.t += dt / tween.dur; const k = Math.min(1, tween.t), e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); camera.lookAt(controls.target);
      if (k >= 1) { tween.on = false; tween.fim?.(); }
    } else if (modo === "predio") { camera.position.lerp(posPredio(), Math.min(1, dt * 2.5)); controls.target.copy(alvoPredio); camera.lookAt(alvoPredio); }
    else if (modo === "explorar") controls.update();
    else if (modo === "andar") andar(dt);
    // noite no prédio, estúdio na maquete, interior aconchegante na visita
    const alvoLuz = modo === "explorar" ? [0.8, 0.18, 1.6, 0.3] : modo === "andar" ? [0.3, 0.06, 1.5, 0.0] : [0.75, 0.08, 0.0, 1.5];
    aproxima(hemi, "intensity", alvoLuz[0], dt); aproxima(amb, "intensity", alvoLuz[1], dt); aproxima(estudio, "intensity", alvoLuz[2], dt); aproxima(sol, "intensity", alvoLuz[3], dt);
    for (const p of portasMundo) {
      const perto = modo === "andar" && Math.hypot(posMundo.x - p.x, posMundo.z - p.z) < 1.7;
      p.ang += ((perto ? p.aberta : 0) - p.ang) * Math.min(1, dt * 7); p.piv.rotation.y = p.ang;
    }
    gtao.enabled = !celular && (modo === "explorar" || modo === "andar") && interior.visible;
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
  window.__predio3d = { abrirAndar, fechar, entrarVisita, sairVisita, ativarUnidade, abrirFoto: (n) => abrirFoto(pisos.find((p) => p.userData.un === unidadeAtiva && p.userData.nome === n).userData), estado: () => ({ modo, andarAberto, unidadeAtiva, obst: obst.length, pisos: pisos.length, portas: portasMundo.length }), conflitos: () => conflitos, irPara: (x, z, y) => { posMundo.set(x, 0, z); if (y !== undefined) yaw = y; }, hoverAndar };
}
