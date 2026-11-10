/* Aurora Vila Mariana — prédio em 3D
   - topo da página: lâmina de 22 pavimentos ao entardecer, com as janelas apagadas
   - passar o mouse num andar acende as luzes; clicar abre o andar como maquete
   - 1º: gardens e lazer · 2º ao 20º: 8 studios e 4 de 1 dormitório · 21º: fitness e coworking · 22º: rooftop
   - na maquete: clicar numa unidade aproxima; clicar num cômodo mostra a foto;
     "Visualizar por dentro" anda pelo apartamento com W A S D e o mouse */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { criarMaquete } from "./maquete.js";

const host = document.getElementById("x3d");
const canvas = document.createElement("canvas");
let gl = null;
try { gl = canvas.getContext("webgl2", { antialias: true }); } catch (e) { gl = null; }
if (host && gl && window.AURORA) {
  try { iniciar(); } catch (e) { console.error(e); semTresD(); }
} else semTresD();

function semTresD() {
  document.documentElement.classList.add("sem3d");
  window.dispatchEvent(new Event("predio3d:sem"));
}

function iniciar() {
  host.prepend(canvas);
  const $ = (s) => host.querySelector(s);
  const A = window.AURORA, T = A.T, UN = A.U;
  const celular = matchMedia("(pointer: coarse)").matches;
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- medidas (metros) ---------- */
  const W = 34, D = 16, HX = W / 2, HZ = D / 2;
  const N = A.N, H = 3.0, TERREO = 6, PE = 2.6, LAJE = 0.3, NUC = 3;
  const ZV = 6.8, ZJ = 11.2;                      // linha dos caixilhos (fundo das sacadas) e borda dos gardens
  const baseY = (a) => TERREO + (a - 1) * H;
  const hv = H - LAJE;
  const ALTURA = baseY(N) + LAJE + 8;
  const tipoAndar = (a) => A.ANDAR(a).tipo;

  /* ---------- renderizador ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, celular ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1b1530, 0.0034);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 2500);

  /* céu do pôr do sol */
  const sunDir = new THREE.Vector3(-0.3, 0.05, -0.95).normalize();
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
        c += vec3(1., .62, .42) * pow(s, 6.) * (1. - smoothstep(.0, .3, h)) * .62;
        c += vec3(1., .78, .6) * pow(s, 60.) * .42;
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
  const sol = new THREE.DirectionalLight(0xffb08a, 1.5); sol.position.set(-21, 26, -66); scene.add(sol);
  const preench = new THREE.DirectionalLight(0xa9b8ff, 0.72); preench.position.set(30, 40, 60); scene.add(preench);
  const amb = new THREE.AmbientLight(0xffffff, 0.08); scene.add(amb);
  // luz de estúdio da maquete, com sombras suaves
  const estudio = new THREE.DirectionalLight(0xfff4e6, 0);
  estudio.castShadow = true;
  estudio.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048);
  Object.assign(estudio.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 110 });
  estudio.shadow.bias = -0.0005; estudio.shadow.normalBias = 0.03; estudio.shadow.radius = 4;
  scene.add(estudio, estudio.target);

  /* ---------- texturas geradas ---------- */
  const tela = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const repete = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const luzTex = tela(1024, 64, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const lw = 30 + rnd() * 90, b = 0.45 + rnd() * 0.55, quente = rnd() > 0.2;
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, quente ? `rgba(255,${190 + rnd() * 30 | 0},${120 + rnd() * 40 | 0},${b})` : `rgba(235,240,255,${b * .8})`);
      grd.addColorStop(1, `rgba(255,170,110,${b * .45})`);
      g.fillStyle = grd; g.fillRect(x, 0, lw, h);
      for (let k = 0; k < lw / 18; k++) { g.fillStyle = `rgba(255,240,210,${.25 + rnd() * .3})`; g.beginPath(); g.ellipse(x + 8 + k * 18, 4, 5, 3, 0, 0, 7); g.fill(); }
      if (rnd() > 0.5) { g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(x + lw * rnd() * .6, 0, lw * .25, h); }
      x += lw; g.fillStyle = "#000"; g.fillRect(x, 0, 3, h); x += 3;
    }
  });
  const janelasCidade = repete(tela(128, 128, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) if (rnd() > 0.8) {
      const q = rnd() > .3; g.fillStyle = q ? `rgba(255,${185 + rnd() * 45 | 0},130,${.35 + rnd() * .5})` : `rgba(205,215,255,${.25 + rnd() * .4})`; g.fillRect(x + 3, y + 4, 10, 8);
    }
  }));
  const tabuas = (base, vari, larg) => repete(tela(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += larg) for (let x = -((y / larg) % 3) * 90; x < w; x += 270) {
      const t = base + rnd() * vari;
      g.fillStyle = `rgb(${t + 25 | 0},${t - 12 | 0},${t - 58 | 0})`; g.fillRect(x, y, 268, larg - 1);
      for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(80,45,20,${.06 + rnd() * .1})`; g.beginPath(); const yy = y + 3 + rnd() * (larg - 6); g.moveTo(x, yy); g.bezierCurveTo(x + 90, yy + rnd() * 4 - 2, x + 180, yy + rnd() * 4 - 2, x + 268, yy); g.stroke(); }
      g.fillStyle = "rgba(40,22,10,.45)"; g.fillRect(x + 268, y, 2, larg); g.fillRect(x, y + larg - 1, 270, 1);
    }
  }));
  const madeiraTex = tabuas(150, 40, 32), deckTex = tabuas(95, 30, 40), deckClaroTex = tabuas(165, 25, 44);
  const pisoTex = repete(tela(256, 256, (g, w, h) => {
    g.fillStyle = "#dcd7d0"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { const c = rnd() > .5 ? 255 : 120; g.fillStyle = `rgba(${c},${c - 5},${c - 10},.05)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = "rgba(120,110,100,.35)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  }));
  const gramaTex = repete(tela(256, 256, (g, w, h) => {
    g.fillStyle = "#56743f"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const t = rnd(); g.fillStyle = `rgba(${55 + t * 70 | 0},${95 + t * 80 | 0},${35 + t * 35 | 0},.4)`; g.fillRect(rnd() * w, rnd() * h, 1.4, 3.2); }
  }));
  const borrachaTex = repete(tela(256, 256, (g, w, h) => {
    g.fillStyle = "#2c2b31"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = rnd() > .5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.25)"; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  }));
  const evaTex = repete(tela(256, 256, (g) => { const cs = ["#8bbbe0", "#f4c87a", "#f19a8e", "#a6d494"]; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = cs[(x + y * 2 + y) % 4]; g.fillRect(x * 128, y * 128, 128, 128); g.strokeStyle = "rgba(0,0,0,.08)"; g.strokeRect(x * 128, y * 128, 128, 128); } }));
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
  const vidroBase = { roughness: 0.05, transparent: true, depthWrite: false };
  const mat = {
    laje: M({ color: 0xece6f0, roughness: 0.55 }),
    fachada: M({ color: 0xd7ccd3, roughness: 0.85 }),
    fachada2: M({ color: 0x433c4d, roughness: 0.8 }),
    espinha: M({ color: 0x7f7190, roughness: 0.75 }),
    aleta: M({ color: 0xffffff, roughness: 0.72 }),
    metal: M({ color: 0x2a2531, metalness: 0.8, roughness: 0.35 }),
    guarda: new THREE.MeshPhysicalMaterial({ color: 0xa8bdd4, ...vidroBase, opacity: 0.24, envMapIntensity: 1.2 }),
    lobby: M({ color: 0x1a1410, emissive: 0xffc58f, emissiveIntensity: 1.1, emissiveMap: luzTex, metalness: 0.4, roughness: 0.2 }),
    led: M({ color: 0xffb38a, emissive: 0xffb38a, emissiveIntensity: 2.2 }),
    chao: M({ color: 0x15111f, roughness: 0.95 }),
    praca: M({ color: 0x2a2436, roughness: 0.8 }),
    folha: M({ color: 0x23402f, roughness: 0.9, flatShading: true }),
    tronco: M({ color: 0x3a2a22, roughness: 1 }),
    poste: M({ color: 0xfff0d6, emissive: 0xffe2b0, emissiveIntensity: 2.5 }),
    gramaExt: M({ color: 0x6c8a52, roughness: 1 }),
    deckCor: M({ color: 0xb48e6a, roughness: 0.8 }),
    aguaExt: M({ color: 0x1690b5, emissive: 0x19b6d8, emissiveIntensity: 0.45, roughness: 0.06, metalness: 0.2 }),
    luzinha: M({ color: 0xffe2b8, emissive: 0xffd39a, emissiveIntensity: 0.4 }),
    // maquete
    parede: M({ color: 0xf1ede7, roughness: 0.9 }),
    rodape: M({ color: 0xfbfaf7, roughness: 0.5 }),
    batente: M({ color: 0xf6f3ee, roughness: 0.45 }),
    tampa: M({ color: 0x3b3346, roughness: 0.8 }),
    madeira: M({ color: 0xffffff, map: madeiraTex, roughness: 0.5 }),
    deck: M({ color: 0xffffff, map: deckTex, roughness: 0.7 }),
    deckExt: M({ color: 0xffffff, map: deckClaroTex, roughness: 0.75 }),
    porcelanato: M({ color: 0xffffff, map: pisoTex, roughness: 0.3 }),
    grama: M({ color: 0xffffff, map: gramaTex, roughness: 1 }),
    borracha: M({ color: 0xffffff, map: borrachaTex, roughness: 0.95 }),
    eva: M({ color: 0xffffff, map: evaTex, roughness: 0.9 }),
    lobbyPiso: M({ color: 0xbdb5c4, map: pisoTex, roughness: 0.35 }),
    nucleo: M({ color: 0x8b8490, roughness: 0.85 }),
    teto: M({ color: 0xf7f4f0, roughness: 0.95, side: THREE.DoubleSide }),
    spot: M({ color: 0xffffff, emissive: 0xfff1d8, emissiveIntensity: 3 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: 0xd6e6f2, ...vidroBase, roughness: 0.02, opacity: 0.18, envMapIntensity: 1.5 }),
    caixilho: M({ color: 0x2d2a33, metalness: 0.5, roughness: 0.4 }),
    peitoril: M({ color: 0xe9e4dc, roughness: 0.4 }),
    porta: M({ color: 0xd9c6ae, roughness: 0.55 }),
    portaEnt: M({ color: 0x6b4a33, roughness: 0.5 }),
    portaCorta: M({ color: 0x8c8f96, roughness: 0.5, metalness: 0.3 }),
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
    aco: M({ color: 0x3a3a42, metalness: 0.6, roughness: 0.4 }),
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
    concreto: M({ color: 0xbdb6b2, roughness: 0.9 }),
    pedra: M({ color: 0xd9d3c9, roughness: 0.6 }),
    agua: M({ color: 0x1aa6c8, emissive: 0x0e8fb0, emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.1 }),
    aguaRasa: M({ color: 0x67d2e2, emissive: 0x23a9c0, emissiveIntensity: 0.45, roughness: 0.1 }),
    feltro: M({ color: 0x1f6b4a, roughness: 0.95 }),
    mesaAzul: M({ color: 0x24508f, roughness: 0.5 }),
    fogo: M({ color: 0xff8a3d, emissive: 0xff6a1a, emissiveIntensity: 3 }),
    lona: M({ color: 0xf0ebe3, roughness: 0.95 }),
    lona2: M({ color: 0xe9dccb, roughness: 0.95, side: THREE.DoubleSide }),
    tatame: M({ color: 0x4a4458, roughness: 0.95 }),
    vermelho: M({ color: 0xe0614f, roughness: 0.7 }), amarelo: M({ color: 0xf2c14e, roughness: 0.7 }), azul: M({ color: 0x4f86c6, roughness: 0.7 }),
    verde: M({ color: 0x6fb36a, roughness: 0.7 }), lilas: M({ color: 0xa48ad8, roughness: 0.7 }),
    tapete1: M({ color: 0xffffff, map: tapeteTex("#cdbfac", "rgba(120,95,70,.35)"), roughness: 1 }),
    tapete2: M({ color: 0xffffff, map: tapeteTex("#8e93a0", "rgba(240,235,225,.35)"), roughness: 1 }),
    tapete3: M({ color: 0xffffff, map: tapeteTex("#d9cbb8", "rgba(160,110,80,.4)"), roughness: 1 }),
    tapeteKids: M({ color: 0xffffff, map: evaTex, roughness: 0.95 }),
    quadros: [quadroTex(["#e9dfd2", "#d58a5e", "#2f3b4c", "#c9b38f"]), quadroTex(["#1f2433", "#ffb38a", "#c9b6ff", "#f6f1ff"]), quadroTex(["#efe9e0", "#5f7a63", "#c2a27c"])].map((t) => M({ map: t, roughness: 0.6 })),
    bolas: [0xf2c14e, 0x4f86c6, 0xe0614f, 0x6a4c93, 0xf08a3e, 0x2e8b57].map((c) => M({ color: c, roughness: 0.3 })),
  };
  const vidroAndar = (cor = 0xffd0a0) => M({ color: 0x0c1122, metalness: 1, roughness: 0.07, envMapIntensity: 1.15, emissive: cor, emissiveMap: luzTex, emissiveIntensity: 0 });

  /* ---------- helpers ---------- */
  const geoCache = new Map();
  const geoCaixa = (w, h, d, r) => {
    const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`;
    let g = geoCache.get(k);
    if (!g) { const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001); g = r && rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 1, rr) : new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
    return g;
  };
  const caixa = (w, h, d, m, x, y, z, pai, r = 0) => { const o = new THREE.Mesh(geoCaixa(w, h, d, r), m); o.position.set(x, y, z); pai.add(o); return o; };
  const instancias = (geo, m, pos, cores) => {
    const im = new THREE.InstancedMesh(geo, m, pos.length), m4 = new THREE.Matrix4();
    pos.forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); im.setMatrixAt(i, m4); if (cores) im.setColorAt(i, cores[i]); });
    return im;
  };

  /* ---------- entorno ---------- */
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat.chao); chao.rotation.x = -Math.PI / 2; scene.add(chao);
  caixa(W + 30, 0.25, D + 40, mat.praca, 0, 0.12, 8, scene);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, rx = (HX + 10) * Math.cos(a), rz = 5 + (HZ + 12) * Math.sin(a);
    if (Math.abs(rx) < HX + 3 && rz > 0 && rz < 26) continue;
    const t = new THREE.Group(); t.position.set(rx, 0, rz); scene.add(t);
    caixa(0.3, 2.4, 0.3, mat.tronco, 0, 1.2, 0, t);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + rnd(), 0), mat.folha); f.position.y = 3.6; t.add(f);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * .6, 0), mat.folha); f2.position.set(.8, 4.6, -.3); t.add(f2);
  }
  for (const x of [-20, -8, 8, 20]) { caixa(0.12, 4.5, 0.12, mat.metal, x, 2.25, ZJ + 13, scene); const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat.poste); l.position.set(x, 4.6, ZJ + 13); scene.add(l); }
  for (let i = 0; i < 50; i++) {
    const a = rnd() * Math.PI * 2, r = 120 + rnd() * 320;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 40;
    if (z > 30 && Math.abs(x) < 80) continue;
    const w = 14 + rnd() * 22, d = 14 + rnd() * 22, h = 10 + rnd() * (r < 190 ? 34 : 80);
    const t = janelasCidade.clone(); t.needsUpdate = true; t.repeat.set(w / 24, h / 25);
    caixa(w, h, d, M({ color: 0x1b1630, roughness: 0.9, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45 + rnd() * 0.4 }), x, h / 2, z, scene);
  }

  /* ---------- torre ---------- */
  const torre = new THREE.Group(); scene.add(torre);
  // embasamento: lobby com espera de check-in, delivery e bicicletário; o teto do avanço frontal vira os gardens do 1º
  const terreo = new THREE.Group(); torre.add(terreo);
  caixa(30, TERREO - 0.9, 0.08, mat.lobby, 0, 0.3 + (TERREO - 0.9) / 2, ZJ - 0.1, terreo);
  for (const s of [-1, 1]) { caixa(2, TERREO + 0.3, 0.9, mat.fachada2, s * 16, (TERREO + 0.3) / 2, ZJ - 0.45, terreo); caixa(0.3, TERREO + 0.3, D + 3.2, mat.fachada2, s * (HX - 0.15), (TERREO + 0.3) / 2, 1.6, terreo); }
  caixa(W, TERREO + 0.3, 0.3, mat.fachada2, 0, (TERREO + 0.3) / 2, -HZ + 0.15, terreo);
  caixa(W + 0.2, 0.6, 0.6, mat.laje, 0, TERREO, ZJ - 0.3, terreo);
  caixa(W, 0.3, ZJ - HZ, mat.laje, 0, TERREO + 0.15, (ZJ + HZ) / 2, terreo);
  for (let x = -12; x <= 12; x += 4) caixa(0.08, TERREO - 0.9, 0.12, mat.metal, x, 0.3 + (TERREO - 0.9) / 2, ZJ - 0.06, terreo);
  caixa(11, 0.3, 3.4, mat.laje, 0, 4.3, ZJ + 1.6, terreo);
  caixa(10.6, 0.06, 3.0, mat.led, 0, 4.13, ZJ + 1.6, terreo);
  caixa(5.8, 0.5, ZJ - HZ - 0.2, mat.concreto, 0, TERREO + 0.55, (ZJ + HZ) / 2, terreo);
  terreo.add(instancias(new THREE.IcosahedronGeometry(0.42, 1), mat.planta2, Array.from({ length: 8 }, (_, i) => [-2.4 + i * 0.68, TERREO + 1.0 + (i % 3) * 0.1, 9.2 + (i % 2) * 0.8])));

  const andares = [], brilho = [];
  const intens = new Array(N + 1).fill(0), alvo = new Array(N + 1).fill(0);
  const pickScene = new THREE.Scene();
  const pickGeo = new THREE.BoxGeometry(W + 1, H, D + 7);
  // fachada "colagem": aletas coloridas entre as sacadas, mudando de tom a cada três andares
  const PAL = [0xd98c6a, 0xe8d6bd, 0x6f6280, 0x9fb39b, 0xc4a7d6].map((c) => new THREE.Color(c));
  const aletaGeo = new THREE.BoxGeometry(0.24, hv, 1.3), uni = new THREE.BoxGeometry(1, 1, 1);
  const XS = [-10.8, -6.9, 6.9, 10.8];
  const VAOS = [[-17, -10.8], [-10.8, -6.9], [-6.9, -3], [3, 6.9], [6.9, 10.8], [10.8, 17]];
  const hash = (a, b) => { const x = Math.sin(a * 91.7 + b * 37.3) * 43758.5; return x - Math.floor(x); };
  function aletas(a, lados) {
    // aletas entre as sacadas e peitoris coloridos: a "colagem" de cores muda de andar para andar
    const g = new THREE.Group(), pos = [], cores = [];
    for (const f of lados) XS.forEach((x) => { pos.push([x, LAJE + hv / 2, f * 7.45]); cores.push(PAL[1]); });
    g.add(instancias(aletaGeo, mat.aleta, pos, cores));
    const pp = [];
    for (const f of lados) VAOS.forEach(([x0, x1], i) => { if (hash(a + (f > 0 ? 0 : 40), i) < 0.5) pp.push([x0, x1, f, PAL[Math.floor(hash(i * 3 + (f > 0 ? 0 : 11), Math.floor(a / 2)) * PAL.length)]]); });
    if (pp.length) {
      const im = new THREE.InstancedMesh(uni, mat.aleta, pp.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      pp.forEach(([x0, x1, f, c], k) => { m4.compose(new THREE.Vector3((x0 + x1) / 2, LAJE + 0.55, f * (HZ - 0.07)), q, new THREE.Vector3(x1 - x0 - 0.3, 1.1, 0.08)); im.setMatrixAt(k, m4); im.setColorAt(k, c); });
      g.add(im);
    }
    return g;
  }
  function unidadesFachada(casca, vidro, f, guardaCorpo) {
    for (const s of [-1, 1]) {
      caixa(14, hv, 0.06, vidro, s * 10, LAJE + hv / 2, f * ZV, casca);
      if (guardaCorpo) { caixa(14, 1.05, 0.03, mat.guarda, s * 10, LAJE + 0.53, f * (HZ - 0.03), casca); caixa(14, 0.05, 0.07, mat.metal, s * 10, LAJE + 1.08, f * (HZ - 0.03), casca); }
      caixa(0.03, 1.05, 1.2, mat.guarda, s * (HX - 0.02), LAJE + 0.53, f * 7.4, casca);
    }
  }
  function laterais(casca, vidro) {
    for (const s of [-1, 1]) {
      caixa(0.3, hv, 13.6, mat.fachada2, s * (HX - 0.15), LAJE + hv / 2, 0, casca);
      for (const f of [-1, 1]) caixa(0.06, 1.8, 2.2, vidro, s * (HX + 0.01), LAJE + 1.4, f * 3.8, casca);
      caixa(0.06, 2.3, 1.4, vidro, s * (HX + 0.01), LAJE + 1.25, 0, casca);
    }
  }
  function peleVidro(casca, vidro, lados, laterais2) {
    for (const f of lados) for (const s of [-1, 1]) caixa(14, hv, 0.06, vidro, s * 10, LAJE + hv / 2, f * (HZ - 0.05), casca);
    const pos = [];
    for (const f of lados) for (const s of [-1, 1]) for (let x = 3.7; x < 17; x += 1.4) pos.push([s * x, LAJE + hv / 2, f * (HZ - 0.01)]);
    if (laterais2) for (const s of [-1, 1]) { caixa(0.06, hv, D - 0.2, vidro, s * (HX - 0.05), LAJE + hv / 2, 0, casca); for (let z = -6.3; z < 7; z += 1.4) pos.push([s * (HX - 0.01), LAJE + hv / 2, z]); }
    casca.add(instancias(geoCaixa(0.08, hv, 0.08, 0), mat.metal, pos));
  }
  function gardens(casca) {
    const gm = mat.grama.clone(); gm.map = gramaTex.clone(); gm.map.needsUpdate = true; gm.map.repeat.set(4, 1);
    for (const s of [-1, 1]) {
      caixa(14, 0.04, 3.2, gm, s * 10, LAJE - 0.01, 9.6, casca);
      caixa(14, 1.05, 0.03, mat.guarda, s * 10, LAJE + 0.53, ZJ - 0.03, casca);
      caixa(14, 0.05, 0.07, mat.metal, s * 10, LAJE + 1.08, ZJ - 0.03, casca);
      caixa(0.03, 1.05, 3.2, mat.guarda, s * (HX - 0.02), LAJE + 0.53, 9.6, casca);
      for (const x of [3, 6.9, 10.8]) caixa(0.16, 0.95, 3.2, mat.concreto, s * x, LAJE + 0.47, 9.6, casca);
    }
    const pos = [];
    for (const x of [-16, -12, -9.8, -5.2, 4.6, 8.2, 12.5, 15.8]) pos.push([x, LAJE + 0.4, 10.4 - (Math.abs(x) % 3) * 0.4]);
    casca.add(instancias(new THREE.IcosahedronGeometry(0.5, 1), mat.planta, pos));
  }
  function rooftop(casca, vidro, a) {
    caixa(W - 0.1, 0.02, D - 0.1, mat.deckCor, 0, LAJE + 0.01, 0, casca);
    for (const f of [-1, 1]) for (const s of [-1, 1]) { caixa(14, 1.1, 0.03, mat.guarda, s * 10, LAJE + 0.55, f * (HZ - 0.03), casca); caixa(14, 0.05, 0.07, mat.metal, s * 10, LAJE + 1.12, f * (HZ - 0.03), casca); }
    for (const s of [-1, 1]) { caixa(0.03, 1.1, D, mat.guarda, s * (HX - 0.02), LAJE + 0.55, 0, casca); caixa(0.07, 0.05, D, mat.metal, s * (HX - 0.02), LAJE + 1.12, 0, casca); }
    // salão envidraçado nos fundos
    caixa(14, hv, 0.06, vidro, -10, LAJE + hv / 2, -HZ + 0.08, casca); caixa(14, hv, 0.06, vidro, -10, LAJE + hv / 2, -0.85, casca); caixa(0.06, hv, 7.2, vidro, -HX + 0.08, LAJE + hv / 2, -4.4, casca);
    caixa(14.3, 0.22, 7.6, mat.laje, -10, H - 0.11, -4.4, casca);
    // piscina com deck molhado (mesma posição da maquete)
    caixa(10.7, 0.07, 4.25, mat.pedra, 11.3, LAJE + 0.035, 5.475, casca);
    caixa(10.2, 0.03, 3.75, mat.aguaExt, 11.3, LAJE + 0.085, 5.475, casca);
    // pérgola do lounge com lareira, com varal de luzes
    const post = [], rip = [], luz = [];
    for (const x of [6, 14]) for (const z of [-7.3, -2.1]) post.push([x, LAJE + 1.25, z]);
    for (let x = 6.25; x < 14; x += 0.45) rip.push([x, LAJE + 2.7, -4.7]);
    for (let x = 6.3; x < 14; x += 0.55) for (const z of [-6.4, -4.7, -3.0]) luz.push([x, LAJE + 2.35 + Math.sin(x * 1.7) * 0.06, z]);
    casca.add(instancias(geoCaixa(0.12, 2.5, 0.12, 0), mat.lacaEsc, post), instancias(geoCaixa(0.06, 0.1, 5.5, 0), mat.nogueira, rip), instancias(new THREE.SphereGeometry(0.05, 8, 6), mat.luzinha, luz));
    caixa(1.6, 0.4, 1.6, mat.concreto, 10, LAJE + 0.2, -4.7, casca);
    brilho[a].push({ m: mat.aguaExt, base: 0.45, k: 0.7 }, { m: mat.luzinha, base: 0.4, k: 2.6 });
  }

  for (let a = 1; a <= N; a++) {
    const g = new THREE.Group(); g.position.y = baseY(a); torre.add(g);
    const casca = new THREE.Group(); g.add(casca);
    const tipo = tipoAndar(a);
    const vidro = vidroAndar(tipo === "fitness" ? 0xdfe6ff : 0xffd0a0); brilho[a] = [{ m: vidro, base: 0, k: 1 }];
    caixa(W + 0.3, LAJE, D + 0.3, mat.laje, 0, LAJE / 2, 0, g);
    if (tipo !== "rooftop") for (const f of [-1, 1]) caixa(2 * NUC, H, 1.3, mat.espinha, 0, H / 2, f * 7.45, casca);
    if (tipo === "tipo") { unidadesFachada(casca, vidro, 1, true); unidadesFachada(casca, vidro, -1, true); casca.add(aletas(a, [1, -1])); laterais(casca, vidro); }
    else if (tipo === "garden") { unidadesFachada(casca, vidro, 1, false); gardens(casca); peleVidro(casca, vidro, [-1]); casca.add(aletas(a, [1])); laterais(casca, vidro); }
    else if (tipo === "fitness") { peleVidro(casca, vidro, [1, -1], true); for (const f of [-1, 1]) caixa(W + 0.32, 0.06, 0.06, mat.led, 0, 0.04, f * (HZ + 0.16), g); }
    else rooftop(casca, vidro, a);
    const pk = new THREE.Mesh(pickGeo); pk.position.set(0, baseY(a) + H / 2, 1.5); pk.userData.andar = a; pickScene.add(pk);
    g.userData = { casca, y0: baseY(a), dy: 0, alvoDy: 0 };
    andares[a] = g;
  }
  // coroamento: casa de máquinas sobre o núcleo e a lâmina com o nome
  const coroa = new THREE.Group(); coroa.position.y = baseY(N) + LAJE; torre.add(coroa);
  caixa(2 * NUC, 4.4, 15.6, mat.espinha, 0, 2.2, 0, coroa);
  caixa(6.6, 8.0, 0.6, mat.fachada2, 0, 4.0, HZ + 0.15, coroa);
  caixa(6.62, 0.06, 0.06, mat.led, 0, 8.0, HZ + 0.46, coroa);
  const placaTex = tela(1024, 256, () => {});
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: placaTex, transparent: true, color: new THREE.Color(2.4, 1.7, 1.35) }));
  placa.position.set(0, 6.1, HZ + 0.46); coroa.add(placa);
  const desenharPlaca = () => {
    const c = placaTex.image, g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '400 190px "Instrument Serif", Georgia, serif';
    if ("letterSpacing" in g) g.letterSpacing = "26px";
    g.fillText("AURORA", c.width / 2, c.height / 2 + 8); placaTex.needsUpdate = true;
  };
  desenharPlaca(); document.fonts?.load('190px "Instrument Serif"').then(desenharPlaca).catch(() => {});

  /* ================================================================
     MAQUETE DO ANDAR (maquete.js)
     ================================================================ */
  const interior = new THREE.Group(); interior.visible = false; scene.add(interior);
  const E = { obst: [], pisos: [], unidades: [], tampas: [], tetos: [], portas: [], conflitos: [] };
  const maq = criarMaquete({ mat, caixa, PE, interior, E, PLANTAS: A.PLANTAS, foto: (k) => A.foto(k) });
  let luzesInt = [];
  function limpar() {
    interior.traverse((o) => { if (o.isMesh && o.userData.temp) { o.geometry.dispose(); if (o.userData.foto !== undefined) o.material.dispose(); } });
    for (const c of [...interior.children]) interior.remove(c);
    for (const k in E) E[k].length = 0;
    luzesInt = [];
  }
  function montarAndar(a) {
    limpar();
    A.layout(a).forEach((x, i) => maq.construirUnidade(x.planta, x.pos, i));
    maq.construirNucleo(tipoAndar(a));
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
  controls.minDistance = 6; controls.maxDistance = 120; controls.maxPolarAngle = 1.3; controls.screenSpacePanning = true;
  let modo = "predio", andarAberto = 0, unidadeAtiva = 0, zoom = "andar";
  let largura = 1, altura = 1;
  const alvoPredio = new THREE.Vector3(0, ALTURA * 0.5, 2);
  let distPredio = 150, mouseX = 0, mouseY = 0;
  const azBase = 0.52;
  const off = { x: 0, y: 0 }, offAlvo = { x: 0, y: 0 };
  const compacto = () => innerWidth <= 1040;
  const retrato = () => altura > largura * 1.05;
  function aplicarOff() { camera.setViewOffset(largura, altura, off.x, off.y, largura, altura); camera.updateProjectionMatrix(); }
  function enquadrar() {
    const r = host.getBoundingClientRect();
    largura = Math.max(1, r.width); altura = Math.max(1, r.height);
    renderer.setSize(largura, altura, false);
    composer.setSize(largura, altura);
    bloom.resolution.set(largura / 2, altura / 2);
    camera.aspect = largura / altura;
    const noPredio = modo === "predio" || modo === "fechando";
    if (noPredio) {
      const tanV = Math.tan(THREE.MathUtils.degToRad(17)), fr = compacto() ? 0.8 : 0.84;
      // cabe na altura e, em telas estreitas, também na largura
      distPredio = Math.max((ALTURA / 2 + 3) / (tanV * fr), (W * 0.62) / (tanV * camera.aspect * 0.9));
    }
    offAlvo.x = 0;
    offAlvo.y = noPredio && !compacto() ? altura * 0.015 : 0;
    aplicarOff();
  }
  new ResizeObserver(enquadrar).observe(host);

  /* ---------- interação no prédio ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const dica = $(".x3d__dica");
  const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const STATUS = { d: "Disponível", r: "Reservada", v: "Vendida" };
  const resumoAndar = (a) => {
    const info = A.ANDAR(a);
    if (info.tipo === "rooftop" || info.tipo === "fitness") return `${info.titulo} — clique para explorar`;
    const us = UN.filter((u) => u.andar === a), d = us.filter((u) => u.st === "d").length;
    const base = info.tipo === "garden" ? "1º pavimento · gardens e lazer" : `${a}º andar · 8 studios e 4 de 1 dorm.`;
    return `${base} · ${d ? `${d} disponíve${d > 1 ? "is" : "l"}` : "esgotado"} — clique para explorar`;
  };
  function apontar(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
  }
  const posDica = (e, txt) => { const r = host.getBoundingClientRect(); dica.textContent = txt; const x = Math.min(e.clientX - r.left + 16, r.width - dica.offsetWidth - 8); dica.style.transform = `translate(${Math.max(8, x)}px, ${e.clientY - r.top + 16}px)`; dica.classList.add("on"); };
  function hoverAndar(a, e) {
    for (let i = 1; i <= N; i++) alvo[i] = i === a ? 1.7 : 0;
    canvas.style.cursor = a ? "pointer" : "";
    if (a && e) posDica(e, resumoAndar(a)); else dica.classList.remove("on");
  }
  const andarSob = (e) => { apontar(e); pickScene.updateMatrixWorld(); const hit = ray.intersectObjects(pickScene.children)[0]; return hit ? hit.object.userData.andar : 0; };
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width - 0.5; mouseY = (e.clientY - r.top) / r.height - 0.5;
    if (modo === "predio" && e.pointerType === "mouse") hoverAndar(andarSob(e), e);
    else if (modo === "explorar") hoverPiso(e);
  });
  canvas.addEventListener("pointerleave", () => { if (modo === "predio") hoverAndar(0); dica.classList.remove("on"); });
  let downAt = null;
  canvas.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("click", (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    if (modo === "predio") { const a = andarSob(e); if (a) { hoverAndar(a); abrirAndar(a); } }
    else if (modo === "explorar") {
      apontar(e);
      const hit = ray.intersectObjects(E.pisos)[0];
      if (!hit) return;
      const u = hit.object.userData;
      if (zoom === "andar" || u.un !== unidadeAtiva) ativarUnidade(u.un);
      else if (u.foto) abrirFoto(u);
    }
  });

  /* ---------- abrir andar ---------- */
  const tween = { on: false };
  function voar(pos, tgt, dur, fim) { Object.assign(tween, { on: true, t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone(), fim }); }
  const ui = { titulo: $(".x3d__titulo"), sub: $(".x3d__sub"), card: $(".x3d__card"), andar: $(".x3d__andar"), rotulos: $(".x3d__rotulos"), foto: $(".x3d__foto") };
  let rotulos = [];
  const dadosUn = (un) => { if (!un || A.layout(andarAberto)[un.idx]?.c === undefined) return null; return UN.find((q) => q.andar === andarAberto && q.c === un.idx) || null; };
  const nomeLazer = (un) => un.comodos.filter((c) => c.foto).map((c) => c.nome).join(" + ");
  function montarRotulos() {
    ui.rotulos.innerHTML = ""; rotulos = [];
    if (zoom === "andar") {
      for (const un of E.unidades) {
        const u = dadosUn(un), el = document.createElement("button");
        if (u) { el.className = "x3d__un"; el.innerHTML = `<b>${u.id}</b><i class="${u.st}"></i>`; el.title = `${T[u.tipo].n} · ${T[u.tipo].m2} m² · ${STATUS[u.st]}`; }
        else { el.className = "x3d__un lazer"; el.innerHTML = `<b>${nomeLazer(un)}</b>`; }
        el.onclick = () => ativarUnidade(un.idx);
        ui.rotulos.append(el);
        rotulos.push({ el, p: un.centro(un.planta.U / 2, Math.min(un.planta.W, 7.2) * 0.5).setY(PE + 0.5) });
      }
      return;
    }
    const ativa = E.unidades[unidadeAtiva];
    for (const c of ativa.comodos) {
      if (!c.foto) continue;
      const el = document.createElement("button"); el.className = "x3d__comodo"; el.textContent = c.nome;
      el.onclick = () => abrirFoto(c.mesh.userData);
      el.onmouseenter = () => realcar(c.mesh); el.onmouseleave = () => realcar(null);
      ui.rotulos.append(el); rotulos.push({ el, p: ativa.centro((c.u0 + c.u1) / 2, (c.w0 + c.w1) / 2).setY(0.3) });
    }
  }
  function painelAndar() {
    const info = A.ANDAR(andarAberto), lazer = info.tipo === "rooftop" || info.tipo === "fitness";
    ui.titulo.textContent = info.titulo;
    ui.sub.textContent = `${info.sub} · clique ${lazer ? "num ambiente" : "numa unidade"} para ver de perto`;
    ui.card.hidden = true; ui.andar.hidden = true;
  }
  function painelUnidade() {
    const un = E.unidades[unidadeAtiva], u = dadosUn(un);
    ui.andar.hidden = false;
    if (u) {
      const t = T[u.tipo];
      ui.titulo.textContent = `Unidade ${u.id}`;
      ui.sub.textContent = `${t.n} · ${t.m2} m²${t.jardim ? ` com jardim de ${t.jardim} m²` : ""} · ${u.face} · clique num cômodo para ver a foto`;
      const msg = `Olá! Tenho interesse na unidade ${u.id} (${t.n}, ${t.m2} m²) do Aurora Vila Mariana.`;
      ui.card.innerHTML = `<span class="st ${u.st}">${STATUS[u.st]}</span>${u.st === "v" ? "" : `<b>${brl(u.preco)}</b>`}<a class="btn btn--o" target="_blank" rel="noopener" href="${A.wa(msg)}">${u.st === "v" ? "Lista de espera" : "Tenho interesse"}</a>`;
      ui.card.hidden = false;
    } else {
      ui.titulo.textContent = nomeLazer(un);
      ui.sub.textContent = `${A.ANDAR(andarAberto).titulo} · clique num ambiente para ver a foto`;
      ui.card.hidden = true;
    }
  }
  function ativarUnidade(i, mover = true) {
    if (modo !== "explorar" || !E.unidades[i]) return;
    unidadeAtiva = i; zoom = "unidade"; realcar(null); montarRotulos(); painelUnidade();
    if (mover) { const [pos, tgt] = vistaUnidade(E.unidades[i]); controls.enabled = false; voar(pos, tgt, 1.1, () => { controls.enabled = true; }); }
  }
  function verAndar() {
    if (modo !== "explorar") return;
    zoom = "andar"; fecharFoto(); realcar(null); montarRotulos(); painelAndar();
    const [pos, tgt] = vistaAndar(andarAberto); controls.enabled = false; voar(pos, tgt, 1.1, () => { controls.enabled = true; });
  }
  let realce = null;
  function realcar(p) {
    if (realce) { realce.material.emissive.setHex(0x000000); realce.material.emissiveIntensity = 0; }
    realce = p;
    if (p) { p.material.emissive.setHex(0xffb38a); p.material.emissiveIntensity = 0.22; }
    canvas.style.cursor = p ? "pointer" : "";
  }
  function hoverPiso(e) {
    apontar(e);
    const hit = ray.intersectObjects(E.pisos)[0];
    if (!hit) { realcar(null); dica.classList.remove("on"); return; }
    const p = hit.object, d = p.userData;
    if (zoom === "unidade" && d.un === unidadeAtiva) {
      realcar(d.foto ? p : null);
      if (d.foto && e.pointerType === "mouse") posDica(e, `${d.nome} — clique para ver a foto`); else dica.classList.remove("on");
    } else {
      realcar(p);
      const un = E.unidades[d.un], u = dadosUn(un);
      if (e.pointerType === "mouse") posDica(e, u ? `Unidade ${u.id} · ${T[u.tipo].n} · ${STATUS[u.st]} — clique para ver de perto` : `${nomeLazer(un)} — clique para ver de perto`);
    }
  }
  const esfera = (tgt, r, el, az) => tgt.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r));
  function vistaAndar(a) {
    const y = baseY(a) + LAJE, tgt = new THREE.Vector3(0, y, a === 1 ? 1.8 : 0.4);
    if (retrato()) return [esfera(tgt, 77, 1.1, 1.3), tgt];
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(17)) * (largura / altura));
    return [esfera(tgt, Math.max(40, 21.5 / Math.tan(hf)), 0.98, -0.2), tgt];
  }
  function vistaUnidade(un) {
    const pl = un.planta, c = un.centro(pl.U / 2, pl.W / 2), tgt = new THREE.Vector3(c.x, baseY(andarAberto) + LAJE + 0.4, c.z);
    const r = Math.max(pl.U, pl.W) * (retrato() ? 2.4 : 1.5) + 5;
    return [esfera(tgt, r, 1.05, retrato() ? 1.0 : -0.25), tgt];
  }
  function escolherUnidade(a, op) {
    const lista = A.layout(a);
    if (op.lazer) { const i = lista.findIndex((x) => x.planta === op.lazer); if (i >= 0) return i; }
    if (op.unidade !== undefined) return op.unidade;
    if (op.tipo) {
      const cands = lista.map((x, i) => ({ x, i })).filter(({ x }) => x.planta === op.tipo);
      const disp = cands.find(({ i }) => UN.find((u) => u.andar === a && u.c === i)?.st === "d");
      return (disp || cands[0] || { i: 0 }).i;
    }
    return a === 21 || a === 22 ? 0 : 3;
  }
  function abrirAndar(a, op = {}) {
    if (!(a >= 1 && a <= N)) return;
    if (modo === "andar") sairVisita();
    if (modo === "explorar" || modo === "fechando") fechar(true);
    if (modo !== "predio") return;
    modo = "explorar"; andarAberto = a; zoom = "andar";
    montarAndar(a);
    host.classList.add("aberto"); document.body.classList.add("x3d-travado");
    dica.classList.remove("on"); fecharFoto();
    enquadrar();
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = i > a ? 70 + (i - a) * 3 : 0;
    coroa.userData.alvoDy = 70 + (N - a) * 3 + 6;
    andares[a].userData.casca.visible = false;
    interior.visible = true;
    luzMaquete();
    unidadeAtiva = escolherUnidade(a, op);
    const focar = op.visita || op.tipo || op.lazer || op.unidade !== undefined;
    if (focar) { zoom = "unidade"; montarRotulos(); painelUnidade(); } else { montarRotulos(); painelAndar(); }
    const [pos, tgt] = focar ? vistaUnidade(E.unidades[unidadeAtiva]) : vistaAndar(a);
    controls.target.copy(tgt);
    if (op.visita) { tween.on = false; camera.position.copy(pos); camera.lookAt(tgt); entrarVisita(); return; }
    voar(pos, tgt, 1.8, () => { controls.enabled = true; });
  }
  function luzMaquete() {
    const y = baseY(andarAberto);
    estudio.position.set(-14, y + 40, 26); estudio.target.position.set(0, y, 1); estudio.target.updateMatrixWorld();
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
  function fechar(instantaneo = false) {
    if (modo === "andar") sairVisita();
    if (modo !== "explorar" && !(instantaneo && modo === "fechando")) return;
    modo = "fechando"; controls.enabled = false; fecharFoto(); enquadrar();
    ui.rotulos.innerHTML = ""; rotulos = []; realcar(null); dica.classList.remove("on");
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = 0;
    coroa.userData.alvoDy = 0;
    const fim = () => {
      andares[andarAberto].userData.casca.visible = true;
      interior.visible = false; limpar(); luzNoite();
      host.classList.remove("aberto"); document.body.classList.remove("x3d-travado");
      modo = "predio"; enquadrar(); hoverAndar(0);
      window.dispatchEvent(new Event("predio3d:fechou"));
    };
    if (instantaneo) { for (const g of [...andares.slice(1), coroa]) g.userData.dy = 0; tween.on = false; fim(); camera.position.copy(posPredio()); return; }
    voar(posPredio(), alvoPredio, 1.5, fim);
  }
  $(".x3d__voltar").onclick = () => fechar();
  $(".x3d__entrar").onclick = () => entrarVisita();
  ui.andar.onclick = verAndar;
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || document.pointerLockElement) return;
    if (ui.foto.classList.contains("on")) fecharFoto(); else if (modo === "andar") sairVisita(); else if (modo === "explorar") (zoom === "unidade" ? verAndar() : fechar());
  });

  /* ---------- foto do cômodo ---------- */
  const fotoLista = () => (E.unidades[unidadeAtiva]?.comodos || []).filter((c) => c.foto).map((c) => c.mesh.userData);
  let fotoIdx = 0;
  function abrirFoto(info) { const l = fotoLista(); fotoIdx = Math.max(0, l.findIndex((x) => x.nome === info.nome)); mostrarFoto(info); }
  function mostrarFoto(info) {
    const img = ui.foto.querySelector("img");
    img.classList.remove("ok"); img.onload = () => img.classList.add("ok"); img.src = info.foto;
    ui.foto.querySelector("h3").textContent = info.nome;
    ui.foto.querySelector("p").textContent = `${info.area ? `cerca de ${info.area} m² · ` : ""}imagem ilustrativa de ambiente decorado`;
    ui.foto.classList.add("on");
  }
  function fecharFoto() { ui.foto.classList.remove("on"); }
  ui.foto.querySelector(".x3d__fechar").onclick = fecharFoto;
  ui.foto.addEventListener("click", (e) => { if (e.target === ui.foto) fecharFoto(); });
  for (const [sel, d] of [[".x3d__ant", -1], [".x3d__prox", 1]]) ui.foto.querySelector(sel).onclick = () => { const l = fotoLista(); if (!l.length) return; fotoIdx = (fotoIdx + d + l.length) % l.length; mostrarFoto(l[fotoIdx]); };

  /* ---------- visita em primeira pessoa ---------- */
  const OLHO = 1.62, RAIO = 0.26;
  let yaw = Math.PI, pitch = -0.05;
  const teclas = {}, joy = { x: 0, y: 0 };
  const posMundo = new THREE.Vector3();
  const OUT = new Set(["varanda", "jardim", "externo"]);
  function entrarVisita() {
    if (modo !== "explorar") return;
    const un = E.unidades[unidadeAtiva]; if (!un) return;
    modo = "andar"; controls.enabled = false; tween.on = false; fecharFoto(); realcar(null); dica.classList.remove("on");
    ui.rotulos.style.display = "none";
    E.tampas.forEach((t) => (t.visible = false)); E.tetos.forEach((t) => (t.visible = true));
    host.classList.add("visita"); host.classList.remove("calmo");
    clearTimeout(entrarVisita.t); entrarVisita.t = setTimeout(() => { if (modo === "andar") host.classList.add("calmo"); }, 6000);
    const pl = un.planta, sx = un.pos[2], sz = un.pos[3];
    const sp = un.centro(pl.spawn[0], pl.spawn[1]); posMundo.set(sp.x, 0, sp.z);
    yaw = sz > 0 ? Math.PI : 0; pitch = -0.04;
    for (const [u, w, i] of pl.luzes || []) {
      const c = un.centro(u, w);
      const l = new THREE.PointLight(0xffd6a8, i * 0.55, 9, 2); l.position.set(c.x, PE - 0.25, c.z); interior.add(l); luzesInt.push(l);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), mat.spot); s.position.set(c.x, PE - 0.012, c.z); interior.add(s); luzesInt.push(s);
    }
    camera.fov = 70; camera.near = 0.05; camera.updateProjectionMatrix();
    const fora = un.comodos.every((c) => OUT.has(c.tipo));
    // sol baixo vindo da fachada da unidade, entrando pelas janelas
    const fc = un.centro(pl.U / 2, pl.W / 2);
    estudio.position.set(fc.x - 9 * sx, interior.position.y + 7, fc.z + sz * 16); estudio.target.position.set(fc.x, interior.position.y, fc.z); estudio.target.updateMatrixWorld();
    estudio.color.setHex(0xffc89c);
    if (fora) { hemi.color.setHex(0xb9a8f0); hemi.groundColor.setHex(0x3a2f45); scene.environment = envCeu; scene.environmentIntensity = 0.8; renderer.toneMappingExposure = 1.0; bloom.threshold = 0.85; bloom.strength = 0.5; }
    else { hemi.color.setHex(0xfff6ee); hemi.groundColor.setHex(0x7a6e64); scene.environment = envInterno; scene.environmentIntensity = 0.3; renderer.toneMappingExposure = 0.92; bloom.threshold = 0.97; bloom.strength = 0.25; }
    luzVisitaFora = fora;
    if (!celular) canvas.requestPointerLock?.();
  }
  let luzVisitaFora = false;
  function sairVisita() {
    if (modo !== "andar") return;
    if (document.pointerLockElement) document.exitPointerLock();
    modo = "explorar"; ui.rotulos.style.display = "";
    E.tampas.forEach((t) => (t.visible = true)); E.tetos.forEach((t) => (t.visible = false));
    luzesInt.forEach((l) => { interior.remove(l); l.geometry?.dispose(); }); luzesInt = [];
    host.classList.remove("visita", "calmo"); clearTimeout(entrarVisita.t);
    camera.fov = 34; camera.near = 0.1; camera.updateProjectionMatrix();
    luzMaquete();
    const [pos, tgt] = zoom === "unidade" ? vistaUnidade(E.unidades[unidadeAtiva]) : vistaAndar(andarAberto);
    camera.position.copy(pos); controls.target.copy(tgt); controls.enabled = true;
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
    for (let it = 0; it < 3; it++) for (const [x1, z1, x2, z2] of E.obst) {
      const ax = x1 - RAIO, bx = x2 + RAIO, az = z1 - RAIO, bz = z2 + RAIO;
      if (p.x > ax && p.x < bx && p.z > az && p.z < bz) {
        const dl = p.x - ax, dr = bx - p.x, dt = p.z - az, db = bz - p.z, mn = Math.min(dl, dr, dt, db);
        if (mn === dl) p.x = ax; else if (mn === dr) p.x = bx; else if (mn === dt) p.z = az; else p.z = bz;
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -HX + 0.3, HX - 0.3);
    p.z = THREE.MathUtils.clamp(p.z, -HZ + 0.2, (andarAberto === 1 ? ZJ : HZ) - 0.2);
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
  let relogio = 0, ultimo = performance.now(), visivel = true, primeiro = true;
  function posPredio() {
    const az = azBase + (reduz ? 0 : Math.sin(relogio * 0.08) * 0.07) + mouseX * 0.12;
    return new THREE.Vector3(Math.sin(az) * distPredio, ALTURA * 0.5 + 7 - mouseY * 8, Math.cos(az) * distPredio);
  }
  new IntersectionObserver((es) => { visivel = es[0].isIntersecting; }).observe(host);
  const v3 = new THREE.Vector3();
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const aproxima = (o, k, alvoV, dt) => { o[k] += (alvoV - o[k]) * Math.min(1, dt * 3); };
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    if (!visivel && modo === "predio" && !primeiro) return;
    relogio += dt;
    if (Math.abs(off.x - offAlvo.x) + Math.abs(off.y - offAlvo.y) > 0.5) { const k = Math.min(1, dt * 3); off.x += (offAlvo.x - off.x) * k; off.y += (offAlvo.y - off.y) * k; aplicarOff(); }
    for (let i = 1; i <= N; i++) {
      intens[i] += (alvo[i] - intens[i]) * Math.min(1, dt * 6);
      for (const b of brilho[i]) b.m.emissiveIntensity = b.base + intens[i] * b.k;
      const u = andares[i].userData; u.dy += (u.alvoDy - u.dy) * Math.min(1, dt * 3.2);
      andares[i].position.y = u.y0 + u.dy; andares[i].visible = u.dy < 60;
    }
    const cu = coroa.userData; cu.dy = (cu.dy || 0) + ((cu.alvoDy || 0) - (cu.dy || 0)) * Math.min(1, dt * 3.2);
    coroa.position.y = baseY(N) + LAJE + cu.dy; coroa.visible = cu.dy < 60;
    if (tween.on) {
      tween.t += dt / tween.dur; const k = Math.min(1, tween.t), e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); camera.lookAt(controls.target);
      if (k >= 1) { tween.on = false; tween.fim?.(); }
    } else if (modo === "predio") { camera.position.lerp(posPredio(), Math.min(1, dt * 2.5)); controls.target.copy(alvoPredio); camera.lookAt(alvoPredio); }
    else if (modo === "explorar") controls.update();
    else if (modo === "andar") andar(dt);
    // noite no prédio, estúdio na maquete, interior aconchegante na visita
    const alvoLuz = modo === "explorar" ? [0.8, 0.18, 1.6, 0.3] : modo === "andar" ? (luzVisitaFora ? [0.7, 0.1, 0.9, 1.2] : [0.3, 0.06, 1.5, 0.0]) : [0.75, 0.08, 0.0, 1.5];
    aproxima(hemi, "intensity", alvoLuz[0], dt); aproxima(amb, "intensity", alvoLuz[1], dt); aproxima(estudio, "intensity", alvoLuz[2], dt); aproxima(sol, "intensity", alvoLuz[3], dt);
    for (const p of E.portas) {
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
    if (primeiro) { primeiro = false; requestAnimationFrame(() => { host.classList.add("pronto"); window.dispatchEvent(new Event("predio3d:pronto")); }); }
  }
  enquadrar(); off.x = offAlvo.x; off.y = offAlvo.y; aplicarOff();
  camera.position.copy(posPredio()).add(new THREE.Vector3(34, 26, 46));
  window.__predio3d = {
    abrirAndar, fechar, entrarVisita, sairVisita, ativarUnidade, verAndar, hoverAndar,
    abrirFoto: (n) => { const p = E.pisos.find((q) => q.userData.un === unidadeAtiva && q.userData.nome === n); if (p) abrirFoto(p.userData); },
    estado: () => ({ modo, andarAberto, unidadeAtiva, zoom, unidades: E.unidades.length, obst: E.obst.length, pisos: E.pisos.length, portas: E.portas.length }),
    conflitos: () => E.conflitos,
    irPara: (x, z, y, pt) => { posMundo.set(x, 0, z); if (y !== undefined) yaw = y; if (pt !== undefined) pitch = pt; },
    posicao: () => ({ x: +posMundo.x.toFixed(2), z: +posMundo.z.toFixed(2) }),
    pular: () => { if (tween.on) tween.t = 1; for (const g of [...andares.slice(1), coroa]) g.userData.dy = g.userData.alvoDy || 0; },
  };
  requestAnimationFrame(quadro);
}
