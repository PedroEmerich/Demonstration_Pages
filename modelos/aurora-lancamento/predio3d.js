/* Aurora — prédio em 3D, fiel ao projeto de referência
   - volumetria em "H": barra da frente (4 unidades de 1 dorm., 5 até o 8º andar), barra dos fundos,
     ala oeste com 7 studios, ala leste com 4 studios e núcleo; embasamento com portaria e garagem,
     lazer no 1º pavimento, rooftop com pérgola branca e coroamento escuro sobre a ala oeste
   - fachada: varandas recuadas, pilares em tom areia, faixas claras salientes a cada dois andares,
     guarda-corpos em chapa bronze, área técnica com grade e fita de LED no forro das varandas
   - cidade em volta (avenida, quadras, árvores, postes e carros) e iluminação de manhã, tarde e noite
   - passar o mouse num andar acende as luzes; clicar abre o andar como maquete;
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
import { Sky } from "three/addons/objects/Sky.js";
import { criarMaquete, fundirGrupo } from "./maquete.js";

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
  const A = window.AURORA, T = A.T, UN = A.U, N = A.N;
  const celular = matchMedia("(pointer: coarse)").matches;
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- medidas (metros) ---------- */
  const LAJE = 0.3, PE = 2.6, HT = 2.9, H1 = 5.2;
  const baseY = (a) => (a <= 1 ? H1 : 2 * H1 + (a - 2) * HT);   // 1º pavimento em 5,2 m; tipo a partir de 10,4 m
  const altA = (a) => (a === 1 ? H1 : HT);
  const xFrente = (a) => (a >= 1 && a <= 8 ? 15.3 : 10.2);       // a barra da frente é mais larga até o 8º andar
  const TOPO = baseY(N) + LAJE;                                    // piso da cobertura
  const ALTURA = TOPO + 6.5;                                       // topo do coroamento
  const ZB = 21.55;                                                // linha dos guarda-corpos da frente e dos fundos
  const tipoAndar = (a) => A.ANDAR(a).tipo;

  /* ---------- renderizador ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, celular ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd8a88e, 0.0012);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 9000);

  /* ---------- céu: Preetham de dia, céu estrelado à noite ---------- */
  const ajustaCeu = (sky) => {
    sky.material.uniforms.brilho = { value: 1 };
    sky.material.fragmentShader = sky.material.fragmentShader.replace("uniform vec3 up;", "uniform vec3 up;\nuniform float brilho;").replace("gl_FragColor = vec4( retColor, 1.0 );", "gl_FragColor = vec4( retColor * brilho, 1.0 );");
    return sky;
  };
  const ceu = ajustaCeu(new Sky()); ceu.scale.setScalar(6000); scene.add(ceu);
  const noiteMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { lua: { value: new THREE.Vector3(0.3, 0.6, -0.7).normalize() } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `varying vec3 vP; uniform vec3 lua;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(vec3(.05, .065, .13), vec3(.008, .012, .035), smoothstep(0., .55, h));
        c += vec3(.32, .19, .12) * pow(1. - clamp(h, 0., 1.), 9.) * .55;
        vec3 q = floor(d * 420.); float s = h3(q);
        c += vec3(.9, .92, 1.) * step(.9982, s) * (s - .9982) * 520. * smoothstep(.06, .35, h);
        float m = max(dot(d, lua), 0.); c += vec3(.85, .9, 1.) * smoothstep(.99955, .9997, m) * 2.2 + vec3(.15, .18, .3) * pow(m, 60.);
        c = mix(vec3(.02, .02, .035), c, smoothstep(-.06, .01, h));
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const ceuNoite = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), noiteMat); ceuNoite.visible = false; scene.add(ceuNoite);
  // cena só do céu para gerar o mapa de reflexos de cada horário
  const envScene = new THREE.Scene();
  const ceuEnv = ajustaCeu(new Sky()); ceuEnv.scale.setScalar(60); envScene.add(ceuEnv);
  const noiteEnv = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), noiteMat); noiteEnv.visible = false; envScene.add(noiteEnv);
  envScene.add(new THREE.Mesh(new THREE.CircleGeometry(48, 32).rotateX(-Math.PI / 2).translate(0, -2, 0), new THREE.MeshBasicMaterial({ color: 0x3a3632 })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envInterno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  let envCeu = null;

  /* ---------- luzes ---------- */
  const hemi = new THREE.HemisphereLight(0xd9b49c, 0x4a3c34, 0.8); scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xffa964, 2.8); scene.add(sol, sol.target);
  sol.castShadow = true;
  sol.shadow.mapSize.set(celular ? 2048 : 4096, celular ? 2048 : 4096);
  Object.assign(sol.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.05;
  const estudio = new THREE.DirectionalLight(0xfff4e6, 0);
  estudio.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048);
  Object.assign(estudio.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  estudio.shadow.bias = -0.0005; estudio.shadow.normalBias = 0.03; estudio.shadow.radius = 4;
  scene.add(estudio, estudio.target);
  const amb = new THREE.AmbientLight(0xffffff, 0.05); scene.add(amb);

  /* ---------- texturas geradas ---------- */
  const tela = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const repete = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const luzTex = tela(1024, 64, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const lw = 30 + rnd() * 90, b = 0.35 + rnd() * 0.65, quente = rnd() > 0.2;
      if (rnd() > 0.3) {
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, quente ? `rgba(255,${190 + rnd() * 30 | 0},${125 + rnd() * 40 | 0},${b})` : `rgba(235,240,255,${b * .8})`);
        grd.addColorStop(1, `rgba(255,170,110,${b * .4})`);
        g.fillStyle = grd; g.fillRect(x, 0, lw, h);
      }
      x += lw + 3;
    }
  });
  const ruido = (g, w, h, n, cores, tam = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cores[i % cores.length]; g.fillRect(rnd() * w, rnd() * h, tam, tam); } };
  const pisoTex = (base, linha, n) => repete(tela(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 5000, ["rgba(255,255,255,.05)", "rgba(120,100,80,.04)"], 2);
    for (let i = 0; i < 9; i++) { g.strokeStyle = "rgba(160,140,120,.06)"; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.bezierCurveTo(rnd() * w, rnd() * h, rnd() * w, rnd() * h, rnd() * w, rnd() * h); g.stroke(); }
    g.strokeStyle = linha; g.lineWidth = 2.5; for (let i = 0; i <= n; i++) { const p = (i * w) / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  }));
  const madeiraTex = (base, vari) => repete(tela(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = rnd() * w; g.strokeStyle = `rgba(${90 + rnd() * 40 | 0},${60 + rnd() * 30 | 0},${30 + rnd() * 20 | 0},${.05 + rnd() * vari})`; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rnd() * 10 - 5, h * .3, x + rnd() * 10 - 5, h * .7, x + rnd() * 6 - 3, h); g.stroke(); }
  }));
  const deckTex = repete(tela(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 42) for (let x = -((y / 42) % 3) * 90; x < w; x += 270) {
      const t = 150 + rnd() * 30; g.fillStyle = `rgb(${t + 30 | 0},${t - 5 | 0},${t - 45 | 0})`; g.fillRect(x, y, 268, 40);
      for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(90,55,25,${.05 + rnd() * .08})`; g.beginPath(); const yy = y + 3 + rnd() * 34; g.moveTo(x, yy); g.lineTo(x + 268, yy + rnd() * 3 - 1.5); g.stroke(); }
      g.fillStyle = "rgba(50,30,15,.45)"; g.fillRect(x + 268, y, 2, 42); g.fillRect(x, y + 40, 270, 2);
    }
  }));
  const gramaTex = repete(tela(256, 256, (g, w, h) => { g.fillStyle = "#5b7a40"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const t = rnd(); g.fillStyle = `rgba(${55 + t * 70 | 0},${95 + t * 80 | 0},${35 + t * 35 | 0},.4)`; g.fillRect(rnd() * w, rnd() * h, 1.4, 3.2); } }));
  const borrachaTex = repete(tela(256, 256, (g, w, h) => { g.fillStyle = "#2c2b31"; g.fillRect(0, 0, w, h); ruido(g, w, h, 5000, ["rgba(255,255,255,.07)", "rgba(0,0,0,.25)"], 1.5); g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }));
  const evaTex = repete(tela(256, 256, (g) => { const cs = ["#8bbbe0", "#f4c87a", "#f19a8e", "#a6d494"]; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = cs[(x + y * 2 + y) % 4]; g.fillRect(x * 128, y * 128, 128, 128); } }));
  const malhaTex = repete(tela(128, 128, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#000"; for (let y = 4; y < h; y += 12) for (let x = (y / 12) % 2 ? 4 : 10; x < w; x += 12) { g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.fill(); } }));
  malhaTex.colorSpace = THREE.NoColorSpace;
  const marmoreVerdeTex = repete(tela(512, 512, (g, w, h) => { g.fillStyle = "#2f5a48"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${170 + rnd() * 60 | 0},${210 + rnd() * 40 | 0},${190 + rnd() * 40 | 0},${.08 + rnd() * .2})`; g.lineWidth = .6 + rnd() * 2.5; g.beginPath(); g.moveTo(rnd() * w, 0); g.bezierCurveTo(rnd() * w, h * .3, rnd() * w, h * .6, rnd() * w, h); g.stroke(); } }));
  const tapeteTex = (cor, borda, trama = true) => tela(256, 256, (g, w, h) => { g.fillStyle = cor; g.fillRect(0, 0, w, h); if (trama) ruido(g, w, h, 7000, ["rgba(0,0,0,.06)", "rgba(255,255,255,.05)"], 1.5); if (borda) { g.strokeStyle = borda; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); } });
  const quadroTex = (paleta) => tela(256, 320, (g, w, h) => { g.fillStyle = paleta[0]; g.fillRect(0, 0, w, h); for (let i = 1; i < paleta.length; i++) { g.fillStyle = paleta[i]; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 90, 30 + rnd() * 80, rnd() * 3, 0, 7); g.fill(); } });
  const empenaTex = repete(tela(256, 512, (g, w, h) => { g.fillStyle = "#d9d6d1"; g.fillRect(0, 0, w, h); ruido(g, w, h, 3000, ["rgba(255,255,255,.05)", "rgba(0,0,0,.035)"], 2); g.fillStyle = "rgba(80,76,72,.55)"; g.fillRect(0, 0, w, 7); g.fillStyle = "rgba(80,76,72,.35)"; g.fillRect(0, h / 2, w, 4); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(0, 7, w, 3); }));
  const pedraTex = repete(tela(512, 256, (g, w, h) => { g.fillStyle = "#c4b6a3"; g.fillRect(0, 0, w, h); ruido(g, w, h, 6000, ["rgba(255,255,255,.06)", "rgba(80,60,40,.05)"], 2); g.strokeStyle = "rgba(90,75,60,.35)"; g.lineWidth = 2; for (let y = 0; y <= h; y += h / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }));

  /* ---------- materiais ---------- */
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const vidroBase = { transparent: true, depthWrite: false };
  const mat = {
    // fachada
    faixa: M({ color: 0xeeebe6, roughness: 0.6 }),
    pilar: M({ color: 0xc9b499, roughness: 0.75 }),
    peitorilExt: M({ color: 0x8a7a69, roughness: 0.6, metalness: 0.25 }),
    gradeExt: M({ color: 0x5d5045, roughness: 0.6, metalness: 0.3 }),
    empena: M({ color: 0xffffff, map: empenaTex, roughness: 0.85 }),
    coroa: M({ color: 0x4f453e, roughness: 0.7 }),
    pedraBase: M({ color: 0xffffff, map: pedraTex, roughness: 0.8 }),
    marrom: M({ color: 0x3a2f28, roughness: 0.6 }),
    bronzeCx: M({ color: 0x4e4136, metalness: 0.5, roughness: 0.45 }),
    lobby: M({ color: 0x2a2018, emissive: 0xffcf9c, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.15 }),
    ledFachada: M({ color: 0xfff1d6, emissive: 0xffdcae, emissiveIntensity: 0 }),
    forroVaranda: M({ color: 0xf1ebe2, emissive: 0xffd6a4, emissiveIntensity: 0, roughness: 0.8 }),
    portaoGrade: M({ color: 0x2b2a2c, roughness: 0.5, metalness: 0.6 }),
    deckCor: M({ color: 0xb08e6c, roughness: 0.8 }),
    aguaExt: M({ color: 0x1690b5, emissive: 0x19b6d8, emissiveIntensity: 0.3, roughness: 0.06, metalness: 0.2 }),
    guardaVidro: new THREE.MeshPhysicalMaterial({ color: 0xa8bdd4, ...vidroBase, roughness: 0.05, opacity: 0.28 }),
    branco: M({ color: 0xf2f0ec, roughness: 0.55 }),
    // cidade
    asfalto: M({ color: 0x3a3a3d, roughness: 0.95 }),
    calcada: M({ color: 0xa8a39b, roughness: 0.9 }),
    pintura: M({ color: 0xe8e6df, roughness: 0.8 }),
    telhado: M({ color: 0x8d8984, roughness: 0.9 }),
    folha: M({ color: 0x3f6131, roughness: 0.9, flatShading: true }),
    folha2: M({ color: 0x55783c, roughness: 0.9, flatShading: true }),
    tronco: M({ color: 0x4a382b, roughness: 1 }),
    poste: M({ color: 0x3b3d42, roughness: 0.5, metalness: 0.6 }),
    lampada: M({ color: 0xfff0d6, emissive: 0xffd9a0, emissiveIntensity: 0 }),
    carro: M({ color: 0xffffff, roughness: 0.35, metalness: 0.6 }),
    vidroCarro: M({ color: 0x1b2127, roughness: 0.1, metalness: 0.8 }),
    farol: M({ color: 0xffffff, emissive: 0xfff3d8, emissiveIntensity: 0 }),
    lanterna: M({ color: 0x550000, emissive: 0xff2a1a, emissiveIntensity: 0 }),
    // maquete e interiores
    parede: M({ color: 0xefebe5, roughness: 0.92 }),
    rodape: M({ color: 0xfaf8f4, roughness: 0.5 }),
    batente: M({ color: 0xf5f2ed, roughness: 0.45 }),
    tampa: M({ color: 0x3b3346, roughness: 0.8 }),
    porcelanato: M({ color: 0xffffff, map: pisoTex("#e7dfd2", "rgba(160,150,135,.55)", 2), roughness: 0.28 }),
    porcelanatoB: M({ color: 0xffffff, map: pisoTex("#d8d1c6", "rgba(140,130,120,.5)", 2), roughness: 0.3 }),
    porcelanatoV: M({ color: 0xffffff, map: pisoTex("#cdc7bd", "rgba(120,112,104,.5)", 2), roughness: 0.5 }),
    corredor: M({ color: 0xffffff, map: pisoTex("#d9d3ca", "rgba(140,130,120,.5)", 2), roughness: 0.3 }),
    cimento: M({ color: 0xa9a49d, roughness: 0.9 }),
    deckExt: M({ color: 0xffffff, map: deckTex, roughness: 0.75 }),
    grama: M({ color: 0xffffff, map: gramaTex, roughness: 1 }),
    borracha: M({ color: 0xffffff, map: borrachaTex, roughness: 0.95 }),
    borrachaPlay: M({ color: 0x5a7fa3, roughness: 0.95 }),
    eva: M({ color: 0xffffff, map: evaTex, roughness: 0.9 }),
    nucleo: M({ color: 0x8b8490, roughness: 0.85 }),
    teto: M({ color: 0xf6f3ef, roughness: 0.95, side: THREE.DoubleSide }),
    spot: M({ color: 0xffffff, emissive: 0xfff1d8, emissiveIntensity: 3 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: 0xd6e6f2, ...vidroBase, roughness: 0.02, opacity: 0.16, envMapIntensity: 1.2 }),
    caixilho: M({ color: 0x1f1e22, metalness: 0.4, roughness: 0.4 }),
    peitoril: M({ color: 0xe9e4dc, roughness: 0.4 }),
    porta: M({ color: 0xf2efe9, roughness: 0.5 }),
    portaEnt: M({ color: 0x7a5a3f, map: madeiraTex("#8a6a4c", 0.15), roughness: 0.5 }),
    portaCorta: M({ color: 0x8c8f96, roughness: 0.5, metalness: 0.3 }),
    malha: M({ color: 0x6b5b4d, alphaMap: malhaTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }),
    bronze: M({ color: 0x5a4b3e, roughness: 0.45, metalness: 0.5 }),
    madeiraClara: M({ color: 0xffffff, map: madeiraTex("#c9a27a", 0.18), roughness: 0.55 }),
    nogueira: M({ color: 0x6a4a33, map: madeiraTex("#7a573c", 0.2), roughness: 0.5 }),
    carvalho: M({ color: 0xffffff, map: madeiraTex("#b88f66", 0.18), roughness: 0.55 }),
    quartzo: M({ color: 0xf4f2ee, roughness: 0.18 }),
    forno: M({ color: 0x141416, roughness: 0.12, metalness: 0.4 }),
    ledFita: M({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 2.2 }),
    globo: M({ color: 0xfff6e8, emissive: 0xffe2b8, emissiveIntensity: 2.4, roughness: 0.3 }),
    arandela: M({ color: 0x2a2520, emissive: 0xffcf96, emissiveIntensity: 1.6 }),
    musgo: M({ color: 0x2f4a29, roughness: 1 }),
    voal: M({ color: 0xf7f4ee, roughness: 1, transparent: true, opacity: 0.6 }),
    laca: M({ color: 0xf1eee9, roughness: 0.45 }),
    lacaLinha: M({ color: 0x8d877e, roughness: 0.6 }),
    lacaEsc: M({ color: 0x3e3a44, roughness: 0.5 }),
    tecido: M({ color: 0xa69a8f, roughness: 0.95 }),
    tecido2: M({ color: 0x6f7a72, roughness: 0.95 }),
    tecidoEsc: M({ color: 0x5c5866, roughness: 0.95 }),
    tecidoCinza: M({ color: 0x9a968f, roughness: 0.95 }),
    tecidoClaro: M({ color: 0xdedad2, roughness: 0.95 }),
    tecidoVerde: M({ color: 0x6f7f52, roughness: 0.9 }),
    laranja: M({ color: 0xc8643a, roughness: 0.9 }),
    couro: M({ color: 0x8a5a3c, roughness: 0.6 }),
    lencol: M({ color: 0xf5f2ec, roughness: 0.9 }),
    manta: M({ color: 0xc19a6b, roughness: 0.9 }),
    mantaBege: M({ color: 0x8c7a5c, roughness: 0.95 }),
    almofada: M({ color: 0xb59a7a, roughness: 0.9 }),
    preto: M({ color: 0x1d1c21, roughness: 0.4 }),
    inox: M({ color: 0xc9ccd2, metalness: 0.9, roughness: 0.28 }),
    aco: M({ color: 0x3a3a42, metalness: 0.6, roughness: 0.4 }),
    ar: M({ color: 0xd9d9d6, roughness: 0.5 }),
    marmore: M({ color: 0xf1efea, roughness: 0.2 }),
    marmoreVerde: M({ color: 0xffffff, map: marmoreVerdeTex, roughness: 0.15 }),
    verdeCanelado: M({ color: 0x2f5a46, roughness: 0.45 }),
    loucas: M({ color: 0xf8f8f6, roughness: 0.15 }),
    espelho: M({ color: 0xb9c3cb, metalness: 0.35, roughness: 0.12, envMapIntensity: 0.6 }),
    planta: M({ color: 0x3f6d48, roughness: 0.9, flatShading: true }),
    planta2: M({ color: 0x5a8a4a, roughness: 0.9, flatShading: true }),
    vaso: M({ color: 0xbfa58a, roughness: 0.8 }),
    vasoEsc: M({ color: 0x6d6862, roughness: 0.7 }),
    tela: M({ color: 0x0b0b10, emissive: 0x223355, emissiveIntensity: 0.15, roughness: 0.12 }),
    pendente: M({ color: 0x2a2520, emissive: 0xffc98a, emissiveIntensity: 2.2, side: THREE.DoubleSide }),
    abajur: M({ color: 0xf2e6d4, emissive: 0xffd9a6, emissiveIntensity: 1.2, roughness: 0.9 }),
    elevador: M({ color: 0x9aa0aa, metalness: 0.9, roughness: 0.3 }),
    led: M({ color: 0xffb38a, emissive: 0xffb38a, emissiveIntensity: 2.2 }),
    concreto: M({ color: 0xbdb6b2, roughness: 0.9 }),
    pedra: M({ color: 0xd9d3c9, roughness: 0.6 }),
    agua: M({ color: 0x1aa6c8, emissive: 0x0e8fb0, emissiveIntensity: 0.5, roughness: 0.08, metalness: 0.1 }),
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
    tapeteCinza: M({ color: 0xffffff, map: tapeteTex("#a7a39c", null), roughness: 1 }),
    tapeteEscuro: M({ color: 0xffffff, map: tapeteTex("#55524f", null), roughness: 1 }),
    tapeteAzul: M({ color: 0xffffff, map: tapeteTex("#9fb6bd", "rgba(255,255,255,.25)"), roughness: 1 }),
    tapeteKids: M({ color: 0xffffff, map: evaTex, roughness: 0.95 }),
    quadros: [quadroTex(["#e9dfd2", "#d58a5e", "#2f3b4c", "#c9b38f"]), quadroTex(["#efe7da", "#7d8a6a", "#c56d43", "#2b2a2c"]), quadroTex(["#efe9e0", "#5f7a63", "#c2a27c"])].map((t) => M({ map: t, roughness: 0.6 })),
    bolas: [0xf2c14e, 0x4f86c6, 0xe0614f, 0x6a4c93, 0xf08a3e, 0x2e8b57].map((c) => M({ color: c, roughness: 0.3 })),
  };
  mat.grama.map.repeat.set(1, 1);
  const vidroAndar = () => M({ color: 0x18222d, metalness: 0.92, roughness: 0.1, envMapIntensity: 1.0, emissive: 0xffd0a0, emissiveMap: luzTex, emissiveIntensity: 0 });

  /* ---------- helpers ---------- */
  const geoCache = new Map();
  const geoCaixa = (w, h, d, r) => {
    const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`;
    let g = geoCache.get(k);
    if (!g) { const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001); g = r && rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 1, rr) : new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
    return g;
  };
  const caixa = (w, h, d, m, x, y, z, pai, r = 0) => {
    const o = new THREE.Mesh(geoCaixa(w, h, d, r), m); o.position.set(x, y, z); pai.add(o);
    if (m === mat.malha) { // furos da chapa em escala real, sem esticar com o tamanho da peça
      const ge = o.geometry.clone(), uv = ge.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let i = 0; i < uv.count; i++) { const f = dims[Math.floor(i / 4)]; uv.setXY(i, (uv.getX(i) * f[0]) / 0.12, (uv.getY(i) * f[1]) / 0.12); }
      o.geometry = ge;
    }
    return o;
  };
  // caixa com UV em metros (texturas que repetem: empena, pedra, fachadas da cidade)
  const caixaUV = (w, h, d, m, x, y, z, pai, tu, tv) => {
    const ge = new THREE.BoxGeometry(w, h, d), uv = ge.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < uv.count; i++) { const f = dims[Math.floor(i / 4)]; uv.setXY(i, (uv.getX(i) * f[0]) / tu, (uv.getY(i) * f[1]) / tv); }
    const o = new THREE.Mesh(ge, m); o.position.set(x, y, z); pai.add(o); return o;
  };
  const instancias = (geo, m, pos, escala, cores) => {
    const im = new THREE.InstancedMesh(geo, m, pos.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    pos.forEach((p, i) => { if (p[3] !== undefined) q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p[3]); else q.identity(); m4.compose(v.set(p[0], p[1], p[2]), q, escala ? s.set(...escala[i]) : s.set(1, 1, 1)); im.setMatrixAt(i, m4); if (cores) im.setColorAt(i, cores[i]); });
    im.castShadow = true; im.receiveShadow = true; return im;
  };
  const sombreia = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

  /* ================================================================
     CIDADE
     ================================================================ */
  const cidade = new THREE.Group(); scene.add(cidade);
  const estilos = [
    { base: "#d8ccb8", jan: "#2e3238", faixa: "#efe8dc", larg: 0.55, alt: 0.55, var: "resid" },
    { base: "#e3e2de", jan: "#3a3f48", faixa: "#cfcdc8", larg: 0.62, alt: 0.6, var: "varanda" },
    { base: "#5b6d7f", jan: "#33475a", faixa: "#b7c2cc", larg: 0.86, alt: 0.72, var: "vidro" },
    { base: "#b07255", jan: "#2d2622", faixa: "#c98f74", larg: 0.4, alt: 0.5, var: "antigo" },
    { base: "#c9c3b8", jan: "#2b2f35", faixa: "#e0dbd2", larg: 0.5, alt: 0.62, var: "resid" },
  ];
  // cada textura cobre 16 m de largura por 24 m de altura (5 colunas, 8 andares)
  const matsCidade = estilos.map((e) => {
    const desenha = (lit) => (g, w, h) => {
      g.fillStyle = lit ? "#000" : e.base; g.fillRect(0, 0, w, h);
      if (!lit) ruido(g, w, h, 2500, ["rgba(255,255,255,.04)", "rgba(0,0,0,.05)"], 2);
      const cw = w / 5, ch = h / 8;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) {
        const ww = cw * e.larg, hh = ch * e.alt, x = c * cw + (cw - ww) / 2, y = r * ch + ch * 0.18;
        if (lit) { const k = rnd(); if (k < 0.42) { g.fillStyle = k < 0.33 ? `rgba(255,${190 + rnd() * 40 | 0},${120 + rnd() * 50 | 0},${.55 + rnd() * .45})` : `rgba(215,228,255,${.5 + rnd() * .4})`; g.fillRect(x, y, ww, hh); } continue; }
        g.fillStyle = e.jan; g.fillRect(x, y, ww, hh);
        g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(x, y, ww, hh * 0.35);
        if (e.var === "varanda") { g.fillStyle = e.faixa; g.fillRect(c * cw + 4, y + hh - 4, cw - 8, ch * 0.22); }
      }
      if (!lit && e.var !== "vidro") { g.fillStyle = e.faixa; for (let r = 0; r <= 8; r++) g.fillRect(0, r * ch - 2, w, 4); }
      if (!lit && e.var === "vidro") { g.fillStyle = e.faixa; for (let c = 0; c <= 5; c++) g.fillRect(c * cw - 2, 0, 4, h); }
    };
    const map = repete(tela(320, 480, desenha(false))), emi = repete(tela(320, 480, desenha(true)));
    return M({ color: 0xffffff, map, emissive: 0xffffff, emissiveMap: emi, emissiveIntensity: 0, roughness: e.var === "vidro" ? 0.35 : 0.85, metalness: e.var === "vidro" ? 0.3 : 0 });
  });
  const vistaHero = new THREE.Vector2(Math.sin(-0.6), Math.cos(-0.6));   // direção da câmera da capa, para não tapar o prédio
  function predio(x, z, w, d, h, est, grupo) {
    caixaUV(w, h, d, matsCidade[est], x, h / 2, z, grupo, 16, 24);
    caixa(w + 0.3, 0.6, d + 0.3, mat.telhado, x, h + 0.3, z, grupo);
    if (h > 25 && rnd() > 0.35) caixa(Math.min(6, w * 0.4), 3.2, Math.min(5, d * 0.4), mat.telhado, x + (rnd() - 0.5) * w * 0.3, h + 2.2, z + (rnd() - 0.5) * d * 0.3, grupo);
  }
  function montarCidade() {
    const g = new THREE.Group();
    // ruas: avenida em frente (z de 26 a 44, canteiro central), ruas transversais a cada ~150 m
    caixa(4000, 0.1, 4000, mat.asfalto, 0, -0.05, 0, g);
    const ruasX = [-68, 80, 228, -216, 376, -364], ruasZ = [35, -90, 160, -215, 285];
    const largX = 12, largZ = (z) => (z === 35 ? 18 : 12);
    const blocos = [];
    const zs = [...ruasZ].sort((a, b) => a - b), xs = [...ruasX].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i] + largX / 2, x1 = xs[i + 1] - largX / 2, z0 = zs[j] + largZ(zs[j]) / 2, z1 = zs[j + 1] - largZ(zs[j + 1]) / 2;
      blocos.push([x0, z0, x1, z1]);
    }
    const arv = [], postes = [];
    for (const [x0, z0, x1, z1] of blocos) {
      // calçada e miolo da quadra
      caixa(x1 - x0, 0.16, z1 - z0, mat.calcada, (x0 + x1) / 2, 0.08, (z0 + z1) / 2, g);
      for (let x = x0 + 5; x < x1 - 4; x += 9 + rnd() * 3) { arv.push([x, z0 + 2.2]); arv.push([x + 3, z1 - 2.2]); }
      for (let x = x0 + 12; x < x1 - 6; x += 30) { postes.push([x, z0 + 0.9, 0]); postes.push([x, z1 - 0.9, Math.PI]); }
      const meu = x0 < 0 && x1 > 0 && z0 < 0 && z1 > 0;           // a quadra do Aurora
      // lotes ao longo das quatro faces da quadra
      const lados = [[x0, z0, x1, z0, 0, 1], [x0, z1, x1, z1, 0, -1], [x0, z0, x0, z1, 1, 0], [x1, z0, x1, z1, -1, 0]];
      for (const [ax, az, bx2, bz, nx, nz] of lados) {
        const comp = Math.hypot(bx2 - ax, bz - az), dx = (bx2 - ax) / comp, dz = (bz - az) / comp;
        let s = 6;
        while (s < comp - 14) {
          const fr = 14 + rnd() * 14, pr = 14 + rnd() * 16, recuo = 4 + rnd() * 3;
          const cx = ax + dx * (s + fr / 2) + nx * (recuo + pr / 2), cz = az + dz * (s + fr / 2) + nz * (recuo + pr / 2);
          s += fr + 3 + rnd() * 6;
          if (meu && cx > -24 && cx < 24 && cz > -32 && cz < 30) continue;  // o lote do Aurora
          const dist = Math.hypot(cx, cz), dir = new THREE.Vector2(cx, cz).normalize();
          const naFrente = dist < 240 && dir.dot(vistaHero) > 0.93;
          let h = dist < 120 ? 8 + rnd() * 38 : 14 + rnd() * (dist < 400 ? 70 : 110);
          if (rnd() < 0.25) h = 6 + rnd() * 8;
          if (naFrente) { arv.push([cx - 3, cz], [cx + 4, cz + 3]); continue; }   // praça arborizada: nada tapa a vista do prédio
          if (meu) h = Math.min(h, 34);
          const est = h < 14 ? (rnd() > 0.5 ? 3 : 0) : Math.floor(rnd() * estilos.length);
          const w = Math.abs(dx) > 0.5 ? fr : pr, d = Math.abs(dx) > 0.5 ? pr : fr;
          predio(cx, cz, w, d, h, est, g);
        }
      }
    }
    // faixas da avenida e faixa de pedestres na frente do prédio
    const listras = [];
    for (let x = -600; x < 600; x += 9) listras.push([x, 0.02, 30.5], [x, 0.02, 39.5]);
    g.add(instancias(new THREE.BoxGeometry(4, 0.02, 0.18), mat.pintura, listras));
    const zebra = []; for (let z = 27; z < 43.5; z += 1.1) zebra.push([22.5, 0.02, z]);
    g.add(instancias(new THREE.BoxGeometry(4, 0.02, 0.55), mat.pintura, zebra));
    caixa(1200, 0.25, 2.2, mat.calcada, 0, 0.12, 35, g);                          // canteiro central
    for (let x = -300; x < 300; x += 11 + rnd() * 4) arv.push([x, 35]);
    // árvores e postes
    const copas = [], tr = [], esc = [], cores = [];
    for (const [x, z] of arv) { const s = 0.8 + rnd() * 0.7; copas.push([x, 4.2 * s, z]); esc.push([2.4 * s, 2.0 * s, 2.4 * s]); tr.push([x, 1.5 * s, z]); cores.push(new THREE.Color().setHSL(0.27 + rnd() * 0.06, 0.38, 0.22 + rnd() * 0.1)); }
    g.add(instancias(new THREE.IcosahedronGeometry(1, 1), mat.branco.clone(), copas, esc, cores));
    g.add(instancias(new THREE.CylinderGeometry(0.16, 0.22, 3, 6), mat.tronco, tr, tr.map((p) => [1, p[1] / 1.5, 1])));
    for (const x of [-60, -30, 0, 30, 60, 90]) postes.push([x, 34.2, 0], [x + 15, 35.8, Math.PI]);
    const hastes = postes.map(([x, z]) => [x, 4, z]), cabecas = postes.map(([x, z, r]) => [x, 7.9, z + Math.cos(r) * 1.2]);
    g.add(instancias(new THREE.CylinderGeometry(0.09, 0.13, 8, 6), mat.poste, hastes));
    g.add(instancias(new THREE.BoxGeometry(0.5, 0.18, 1.0), mat.lampada, cabecas));
    // manchas de luz no chão (só à noite)
    const brilho = tela(128, 128, (c, w, h) => { const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,210,150,.55)"); r.addColorStop(1, "rgba(255,210,150,0)"); c.fillStyle = r; c.fillRect(0, 0, w, h); });
    pocas = new THREE.InstancedMesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: brilho, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), cabecas.length);
    const m4 = new THREE.Matrix4(); cabecas.forEach(([x, , z], i) => { m4.makeTranslation(x, 0.2, z); pocas.setMatrixAt(i, m4); }); pocas.visible = false; g.add(pocas);
    fundirGrupo(g);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o.isInstancedMesh ? true : o.material !== mat.asfalto; o.receiveShadow = true; } });
    cidade.add(g);
    montarCarros();
  }
  let pocas = null;
  // carros: estacionados junto à calçada e andando na avenida
  const carros = [];
  let carroCorpo, carroCabine, farois, lanternas;
  function montarCarros() {
    const paleta = [0xf2f2f2, 0xb9bcc0, 0x1e1f22, 0x8a1c1c, 0x2f4f7a, 0x5f6368, 0xe8e2d6];
    for (let i = 0; i < 26; i++) carros.push({ x: -400 + rnd() * 800, z: [28.3, 32.2, 37.8, 41.7][i % 4], v: (i % 4 < 2 ? 1 : -1) * (9 + rnd() * 5), cor: paleta[i % paleta.length] });
    for (let x = -150; x < 180; x += 7 + rnd() * 9) if (Math.abs(x) > 26) carros.push({ x, z: 26.9, v: 0, cor: paleta[Math.floor(rnd() * paleta.length)] });
    const n = carros.length;
    carroCorpo = new THREE.InstancedMesh(geoCaixa(4.3, 0.75, 1.8, 0.2), mat.carro, n); carroCabine = new THREE.InstancedMesh(geoCaixa(2.3, 0.6, 1.62, 0.2), mat.vidroCarro, n);
    farois = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.16, 1.5), mat.farol, n); lanternas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.14, 1.5), mat.lanterna, n);
    carros.forEach((c, i) => carroCorpo.setColorAt(i, new THREE.Color(c.cor)));
    for (const im of [carroCorpo, carroCabine]) { im.castShadow = true; im.receiveShadow = true; }
    cidade.add(carroCorpo, carroCabine, farois, lanternas);
    moverCarros(0);
  }
  const m4c = new THREE.Matrix4(), qc = new THREE.Quaternion(), um = new THREE.Vector3(1, 1, 1), vc = new THREE.Vector3();
  function moverCarros(dt) {
    carros.forEach((c, i) => {
      if (c.v) { c.x += c.v * dt; if (c.x > 420) c.x -= 840; if (c.x < -420) c.x += 840; }
      const s = c.v < 0 ? -1 : 1; qc.setFromAxisAngle(vc.set(0, 1, 0), s > 0 ? 0 : Math.PI);
      m4c.compose(vc.set(c.x, 0.62, c.z), qc, um); carroCorpo.setMatrixAt(i, m4c);
      m4c.compose(vc.set(c.x - s * 0.25, 1.25, c.z), qc, um); carroCabine.setMatrixAt(i, m4c);
      m4c.compose(vc.set(c.x + s * 2.16, 0.72, c.z), qc, um); farois.setMatrixAt(i, m4c);
      m4c.compose(vc.set(c.x - s * 2.16, 0.78, c.z), qc, um); lanternas.setMatrixAt(i, m4c);
    });
    for (const im of [carroCorpo, carroCabine, farois, lanternas]) im.instanceMatrix.needsUpdate = true;
  }

  /* ================================================================
     O PRÉDIO
     ================================================================ */
  const torre = new THREE.Group(); scene.add(torre);
  // embasamento: térreo com portaria, vitrines e garagem
  const terreo = new THREE.Group(); torre.add(terreo);
  (function embasamento() {
    const g = terreo;
    caixaUV(34.5, H1, 0.4, mat.pedraBase, 0.25, H1 / 2, -24, g, 2.4, 1.2);                 // fundos
    for (const s of [-1, 1]) caixaUV(0.4, H1, 45.8, mat.pedraBase, s < 0 ? -17 : 17.5, H1 / 2, -1.1, g, 2.4, 1.2);
    caixa(34.5, 0.3, 45.8, mat.faixa, 0.25, H1 - 0.15, -1.1, g);                              // laje do térreo (piso do 1º)
    // garagem à esquerda: portão em grade e parede de pedra
    caixa(5.8, 3.2, 0.12, mat.portaoGrade, -13.8, 1.6, 21.6, g); caixaUV(6.8, H1 - 3.2, 0.4, mat.pedraBase, -13.6, 3.2 + (H1 - 3.2) / 2, 21.6, g, 2.4, 1.2);
    caixaUV(0.6, 3.2, 0.4, mat.pedraBase, -10.5, 1.6, 21.6, g, 2.4, 1.2);
    // portaria: entrada recuada com faixa marrom e o nome, vitrines com caixilhos bronze
    caixa(7.3, 1.2, 0.6, mat.marrom, -6.35, 4.6, 21.65, g);
    caixa(6.6, 3.9, 0.08, mat.lobby, -6.35, 2.05, 19.6, g);
    for (const x of [-9.4, -3.3]) caixa(0.5, 4.0, 2.2, mat.marrom, x, 2.0, 20.6, g);
    caixa(18.3, 3.85, 0.08, mat.lobby, 6.15, 0.3 + 3.85 / 2, 21.55, g);
    for (let x = -3, i = 0; x <= 15.3; x += 1.65, i++) caixa(0.07, 3.9, 0.14, mat.bronzeCx, x, 2.25, 21.6, g);
    caixa(18.5, 1.2, 0.6, mat.marrom, 6.15, 4.6, 21.65, g);
    caixaUV(2.2, H1, 0.6, mat.marrom, 16.4, H1 / 2, 21.5, g, 1, 1);
    // jardineiras na calçada
    for (const x of [-8.2, -4.4, 2, 9, 14]) { caixa(1.6, 0.5, 0.7, mat.concreto, x, 0.25, 22.6, g); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), mat.planta2); f.position.set(x, 0.85, 22.6); f.scale.set(1.3, 0.8, 0.8); g.add(f); }
    // calçada e pátio do lote
    caixa(38, 0.16, 4.2, mat.calcada, 0.25, 0.08, 23.9, g);
    sombreia(g); fundirGrupo(g);
  })();
  // nome na faixa da portaria
  const placaTex = tela(1024, 160, () => {});
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.66), new THREE.MeshBasicMaterial({ map: placaTex, transparent: true, color: new THREE.Color(1.6, 1.35, 1.1) }));
  placa.position.set(-6.35, 4.62, 21.96); torre.add(placa);
  const desenharPlaca = () => {
    const c = placaTex.image, g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '400 112px "Instrument Serif", Georgia, serif'; if ("letterSpacing" in g) g.letterSpacing = "22px";
    g.fillText("AURORA", c.width / 2, c.height / 2 + 6); placaTex.needsUpdate = true;
  };
  desenharPlaca(); document.fonts?.load('112px "Instrument Serif"').then(desenharPlaca).catch(() => {});

  const andares = [], vidros = [];
  const intens = new Array(N + 1).fill(0), alvo = new Array(N + 1).fill(0);
  const pickScene = new THREE.Scene();
  const pickGeo = new THREE.BoxGeometry(27, 2.9, 44.5);
  let baseVidro = 0;

  // uma unidade vista de fora: caixilhos, peitoril em chapa bronze, grade da área técnica, pilares areia e LED no forro
  function fachadaUnidade(gr, nome, pos, a, vidro) {
    const P = A.PLANTAS[nome], [px, pz, giro, esp] = pos;
    const q = new THREE.Group(); q.position.set(px, 0, pz); q.rotation.y = giro; q.scale.set(esp, 1, 1); gr.add(q);
    const vg = P.comodos.find((c) => c[2] === "varanda"), tc = P.comodos.find((c) => c[2] === "tecnica");
    const wv = vg[4], W = 6.65, U = P.U, uT = tc ? tc[3] : U, hv = HT - LAJE;
    caixa(U - 0.1, hv, 0.06, vidro, U / 2, LAJE + hv / 2, wv, q);
    caixa(uT - 0.12, 1.1, 0.05, mat.peitorilExt, uT / 2, LAJE + 0.55, W - 0.03, q);
    caixa(uT - 0.12, 0.05, 0.08, mat.bronzeCx, uT / 2, LAJE + 1.12, W - 0.03, q);
    if (tc) caixa(U - uT - 0.1, hv - 0.2, 0.05, mat.gradeExt, (U + uT) / 2, LAJE + (hv - 0.2) / 2, W - 0.03, q);
    for (const u of [0.17, U - 0.17]) caixa(0.34, hv, 1.3, mat.pilar, u, LAJE + hv / 2, W - 0.58, q);
    const sal = a % 2 === 0 ? 0.32 : 0.06;
    caixa(U, LAJE + (a % 2 === 0 ? 0.2 : 0.08), 0.22 + sal, mat.faixa, U / 2, LAJE / 2, W + sal / 2, q);
    caixa(uT - 0.2, 0.012, W - wv - 0.05, mat.forroVaranda, uT / 2, HT - 0.008, (wv + W) / 2, q);
    caixa(uT - 0.4, 0.03, 0.1, mat.ledFachada, uT / 2, HT - 0.03, W - 0.35, q);
    if (nome === "gstudio") { caixa(U, 0.06, 2.6, mat.grama, U / 2, LAJE - 0.02, 7.95, q); caixa(0.1, 0.95, 2.6, mat.concreto, 0.05, LAJE + 0.47, 7.95, q); caixa(U, 1.1, 0.04, mat.guardaVidro, U / 2, LAJE + 0.55, 9.23, q); }
  }
  function empena(g, x0, z0, x1, z1, h, y0 = 0) {
    const w = Math.abs(x1 - x0) || 0.3, d = Math.abs(z1 - z0) || 0.3;
    caixaUV(w, h, d, mat.empena, (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, g, 3.2, 2 * HT);
  }
  function lajes(g, a) {
    const xf = xFrente(a);
    caixa(xf + 10.2, LAJE, 8.35, mat.faixa, (xf - 10.2) / 2, LAJE / 2, 17.375, g);
    caixa(20.4, LAJE, 8.35, mat.faixa, 0, LAJE / 2, -17.375, g);
    caixa(8.15, LAJE, 26.4, mat.faixa, -3.415, LAJE / 2, 0, g);
    caixa(6.65, LAJE, 15.8, mat.faixa, 3.985, LAJE / 2, 5.3, g);
    caixa(7.94, LAJE, 10.54, mat.faixa, 4.63, LAJE / 2, -7.93, g);
  }
  function andarTipo(a, g, casca, vidro) {
    const xf = xFrente(a), h = HT;
    for (const x of A.layout(a)) fachadaUnidade(casca, x.planta, x.pos, a, vidro);
    // empenas cegas nas pontas das barras e faces voltadas para os pátios, com janelinhas do corredor
    empena(casca, -10.2 - 0.12, 13.2, -10.2 + 0.12, ZB, h); empena(casca, xf - 0.12, 13.2, xf + 0.12, ZB, h);
    empena(casca, -10.2 - 0.12, -ZB, -10.2 + 0.12, -13.2, h); empena(casca, 10.2 - 0.12, -ZB, 10.2 + 0.12, -13.2, h);
    empena(casca, -10.2, 13.08, -7.49, 13.32, h); empena(casca, 7.31, 13.08, xf, 13.32, h);
    empena(casca, -10.2, -13.32, -7.49, -13.08, h); empena(casca, 8.6, -13.32, 10.2, -13.08, h);
    empena(casca, 8.48, -13.2, 8.72, -2.66, h); empena(casca, 7.31, -2.78, 8.6, -2.54, h);
    for (const [x, z, rx] of [[-8.85, 13.33, 0], [8.8, 13.33, 0], [-8.85, -13.33, 0], [9.4, -13.33, 0]]) caixa(1.0, 1.2, 0.04, vidro, x, LAJE + 1.5, z, casca);
    if (a === 8) { // laje e guarda-corpo do terraço sobre o avanço da frente
      caixa(5.1, LAJE, 8.35, mat.faixa, 12.75, HT + LAJE / 2, 17.375, g);
      caixa(5.1, 1.1, 0.04, mat.guardaVidro, 12.75, HT + LAJE + 0.55, ZB, casca);
      caixa(0.04, 1.1, 8.35, mat.guardaVidro, 15.3, HT + LAJE + 0.55, 17.375, casca);
    }
  }
  function andarLazer1(g, casca, vidro) {
    // 1º pavimento: grande vitrine na frente, faixa de pedra em cima e laterais em pedra
    const h = H1;
    caixa(25.5, 0.25, 43.1, mat.faixa, 2.55, 0.12, 0, g);
    caixa(24.6, 2.9, 0.08, vidro, 2.55, 0.5 + 1.45, ZB - 0.25, casca);
    for (let x = -9.6, i = 0; x <= 14.8; x += 2.05, i++) caixa(0.08, 2.95, 0.14, mat.bronzeCx, x, 1.95, ZB - 0.2, casca);
    caixaUV(25.5, 1.85, 0.5, mat.pedraBase, 2.55, h - 0.925, ZB - 0.15, casca, 2.4, 1.2);
    caixaUV(25.5, 0.45, 0.5, mat.pedraBase, 2.55, 0.225, ZB - 0.15, casca, 2.4, 1.2);
    for (const s of [-1, 1]) caixaUV(0.5, h, 43.1, mat.pedraBase, s < 0 ? -10.2 : 15.3, h / 2, 0, casca, 2.4, 1.2);
    caixaUV(25.5, h, 0.5, mat.pedraBase, 2.55, h / 2, -ZB, casca, 2.4, 1.2);
    for (let z = -18; z <= 12; z += 6) { caixa(0.06, 2.2, 3.0, vidro, -10.47, 2.3, z, casca); caixa(0.06, 2.2, 3.0, vidro, 15.57, 2.3, z, casca); }
  }
  function cobertura(g, casca, vidro) {
    // decks, piscina (mesma posição da maquete) e guarda-corpos de vidro
    caixa(20.4, LAJE, 8.35, mat.faixa, 0, LAJE / 2, 17.375, g); caixa(20.4, LAJE, 8.35, mat.faixa, 0, LAJE / 2, -17.375, g);
    caixa(8.15, LAJE, 26.4, mat.faixa, -3.415, LAJE / 2, 0, g); caixa(6.65, LAJE, 15.8, mat.faixa, 3.985, LAJE / 2, 5.3, g); caixa(7.94, LAJE, 10.54, mat.faixa, 4.63, LAJE / 2, -7.93, g);
    caixa(20.3, 0.03, 8.25, mat.deckCor, 0, LAJE + 0.015, 17.375, casca); caixa(20.3, 0.03, 8.25, mat.deckCor, 0, LAJE + 0.015, -17.375, casca); caixa(6.55, 0.03, 15.7, mat.deckCor, 3.985, LAJE + 0.015, 5.3, casca);
    caixa(16.0, 0.04, 3.4, mat.aguaExt, 0, LAJE + 0.05, 14.9 + 4.3, casca);
    for (const [x0, z0, x1, z1] of [[-10.2, ZB, 10.2, ZB], [-10.2, -ZB, 10.2, -ZB], [-10.2, 13.2, -10.2, ZB], [10.2, 13.2, 10.2, ZB], [-10.2, -ZB, -10.2, -13.2], [10.2, -ZB, 10.2, -13.2], [7.31, -2.6, 7.31, 13.2]]) {
      const w = Math.abs(x1 - x0) || 0.04, d = Math.abs(z1 - z0) || 0.04;
      caixa(w, 1.1, d, mat.guardaVidro, (x0 + x1) / 2, LAJE + 0.55, (z0 + z1) / 2, casca);
    }
    for (const [x, z] of [[-9.3, -14.2], [-9.3, -20.5], [9.3, -20.5], [9.4, 14.5], [-9.4, 20.6]]) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), mat.planta); f.position.set(x, LAJE + 0.9, z); f.scale.set(1.3, 1, 1.3); casca.add(f); }
  }
  for (let a = 1; a <= N; a++) {
    const g = new THREE.Group(); g.position.y = baseY(a); torre.add(g);
    const casca = new THREE.Group(); g.add(casca);
    const vidro = vidroAndar(); vidros[a] = vidro;
    const tipo = tipoAndar(a);
    if (tipo === "lazer") andarLazer1(g, casca, vidro);
    else if (tipo === "rooftop") cobertura(g, casca, vidro);
    else { lajes(g, a); andarTipo(a, g, casca, vidro); }
    sombreia(g); fundirGrupo(casca); casca.userData.manter = true; fundirGrupo(g);
    const pk = new THREE.Mesh(a === 1 ? new THREE.BoxGeometry(27, H1, 44.5) : pickGeo); pk.position.set(2.5, baseY(a) + altA(a) / 2, 0); pk.userData.andar = a; pickScene.add(pk);
    g.userData = { casca, y0: baseY(a), dy: 0, alvoDy: 0 };
    andares[a] = g;
  }
  // coroamento: volume escuro sobre a ala oeste (fitness e coworking), casa de máquinas e a pérgola branca da frente
  const coroa = new THREE.Group(); coroa.position.y = TOPO; torre.add(coroa);
  (function coroamento() {
    const g = coroa, hC = 4.6;
    caixa(8.15, hC, 26.4, mat.coroa, -3.415, hC / 2, 0, g);
    caixa(0.06, 2.4, 25.6, vidros[N], -7.53, 1.7, 0, g);
    caixa(8.0, 0.06, 0.06, mat.ledFachada, -3.415, 0.25, 13.25, g);
    caixa(5.4, 0.04, 22, mat.vidro, -3.4, hC + 0.02, 0, g);
    caixa(7.94, 5.2, 10.54, mat.coroa, 4.63, 2.6, -7.93, g);
    // pérgola branca sobre o deck da piscina
    const P = 3.4;
    for (const [x, z] of [[-10.0, 13.4], [10.0, 13.4], [-10.0, 21.35], [10.0, 21.35]]) caixa(0.4, P, 0.4, mat.branco, x, P / 2, z, g);
    caixa(20.4, 0.55, 0.45, mat.branco, 0, P, 21.35, g); caixa(20.4, 0.55, 0.45, mat.branco, 0, P, 13.4, g);
    for (const x of [-10.0, 10.0]) caixa(0.45, 0.55, 8.4, mat.branco, x, P, 17.375, g);
    for (let x = -7.5; x <= 7.6; x += 2.5) caixa(0.22, 0.4, 8.0, mat.branco, x, P + 0.05, 17.375, g);
    sombreia(g); fundirGrupo(g);
  })();
  coroa.userData = { dy: 0, alvoDy: 0 };

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
    maq.construirNucleo(a, tipoAndar(a), xFrente(a));
    interior.position.y = baseY(a) + LAJE;
  }

  /* ---------- pós-processamento ---------- */
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: celular ? 2 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 256, 256);
  gtao.enabled = false;
  gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.4, thickness: 1.4, scale: 1, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- horários: manhã, tarde e noite ---------- */
  const HORAS = {
    manha: { el: 26, az: 58, turb: 2.6, ray: 1.0, mie: 0.004, mieG: 0.78, brilho: 0.7, solCor: 0xfff2e2, solI: 3.2, hemi: [0xc4d8ff, 0x6a6052, 1.25], neb: [0xc6d6ea, 0.0008], expo: 0.72, noite: 0, led: 0, bloom: [0.94, 0.16] },
    tarde: { el: 4, az: 166, turb: 4.5, ray: 3.0, mie: 0.004, mieG: 0.9, brilho: 0.6, solCor: 0xffa060, solI: 2.6, hemi: [0xffdcc0, 0x5c4c42, 1.45], neb: [0xe6b496, 0.0010], expo: 0.8, noite: 0.35, led: 0.6, bloom: [0.84, 0.32] },
    noite: { el: 38, az: 150, lua: true, solCor: 0x9fb4ff, solI: 0.35, hemi: [0x3a4a78, 0x0b0a10, 0.6], neb: [0x10162a, 0.0015], expo: 0.95, noite: 1, led: 1, bloom: [0.62, 0.62] },
  };
  let hora = "tarde";
  try { const h = localStorage.getItem("aurora:hora"); if (HORAS[h]) hora = h; } catch (e) {}
  const solDir = new THREE.Vector3();
  function aplicarHora(k) {
    const P = HORAS[k]; if (!P) return; hora = k;
    const el = THREE.MathUtils.degToRad(P.el), az = THREE.MathUtils.degToRad(P.az);
    solDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    const noite = !!P.lua;
    ceu.visible = !noite; ceuNoite.visible = noite; ceuEnv.visible = !noite; noiteEnv.visible = noite;
    if (!noite) for (const s of [ceu, ceuEnv]) { const u = s.material.uniforms; u.turbidity.value = P.turb; u.rayleigh.value = P.ray; u.mieCoefficient.value = P.mie; u.mieDirectionalG.value = P.mieG; u.sunPosition.value.copy(solDir); u.brilho.value = P.brilho; }
    else noiteMat.uniforms.lua.value.copy(solDir);
    if (envCeu) envCeu.dispose();
    envCeu = pmrem.fromScene(envScene, 0.02).texture;
    sol.color.setHex(P.solCor); solBase = P.solI;
    hemi.color.setHex(P.hemi[0]); hemi.groundColor.setHex(P.hemi[1]); hemiBase = P.hemi[2];
    scene.fog.color.setHex(P.neb[0]); scene.fog.density = P.neb[1];
    expoBase = P.expo; bloomBase = P.bloom;
    const n = P.noite;
    baseVidro = n * 0.85;
    for (const m of matsCidade) m.emissiveIntensity = n;
    mat.lampada.emissiveIntensity = n * 4; mat.ledFachada.emissiveIntensity = P.led * 2.6; mat.forroVaranda.emissiveIntensity = P.led * 0.9; mat.lobby.emissiveIntensity = 0.7 + n * 1.0;
    mat.farol.emissiveIntensity = 0.2 + n * 3; mat.lanterna.emissiveIntensity = 0.2 + n * 2.5; mat.aguaExt.emissiveIntensity = 0.25 + n * 0.6;
    if (pocas) pocas.visible = n > 0.5;
    if (modo === "predio" || modo === "fechando") luzExterior(); else if (modo === "explorar") luzMaquete(); else if (modo === "andar") luzVisita();
    for (const b of host.querySelectorAll(".x3d__hora button")) b.classList.toggle("on", b.dataset.hora === k);
    try { localStorage.setItem("aurora:hora", k); } catch (e) {}
  }
  let solBase = 2.9, hemiBase = 0.85, expoBase = 0.66, bloomBase = [0.86, 0.32];
  for (const b of host.querySelectorAll(".x3d__hora button")) b.addEventListener("click", (e) => { e.stopPropagation(); aplicarHora(b.dataset.hora); });
  function posSol(centro, dist) { sol.position.copy(centro).addScaledVector(solDir, dist); sol.target.position.copy(centro); sol.target.updateMatrixWorld(); }
  function luzExterior() {
    scene.environment = envCeu; scene.environmentIntensity = 1;
    renderer.toneMappingExposure = expoBase; bloom.threshold = bloomBase[0]; bloom.strength = bloomBase[1];
    sol.castShadow = true; estudio.castShadow = false;
    posSol(new THREE.Vector3(0, 30, 0), 200);
  }
  function luzMaquete() {
    const y = baseY(andarAberto);
    estudio.position.set(-22, y + 46, 24); estudio.target.position.set(2, y, 0); estudio.target.updateMatrixWorld();
    estudio.color.setHex(0xfff4e6); estudio.castShadow = true; sol.castShadow = false;
    scene.environment = envInterno; scene.environmentIntensity = 0.45;
    renderer.toneMappingExposure = Math.max(expoBase, 0.8); bloom.threshold = 0.95; bloom.strength = 0.25;
  }

  /* ---------- câmera e enquadramento ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 6; controls.maxDistance = 160; controls.maxPolarAngle = 1.32; controls.screenSpacePanning = true;
  let modo = "predio", andarAberto = 0, unidadeAtiva = 0, zoom = "andar";
  let largura = 1, altura = 1;
  const alvoPredio = new THREE.Vector3(1.5, ALTURA * 0.5, -2);
  let distPredio = 170, mouseX = 0, mouseY = 0;
  const azBase = -0.6;
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
      const tanV = Math.tan(THREE.MathUtils.degToRad(17)), fr = compacto() ? 0.78 : 0.76;
      distPredio = Math.max((ALTURA / 2 + 5) / (tanV * fr), 26 / (tanV * camera.aspect * 0.9));
    }
    offAlvo.x = 0; offAlvo.y = noPredio && !compacto() ? altura * 0.015 : 0;
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
    if (info.tipo !== "tipo") return `${info.titulo} — clique para explorar`;
    const us = UN.filter((u) => u.andar === a), d = us.filter((u) => u.st === "d").length;
    return `${a}º andar · ${us.length} unidades · ${d ? `${d} disponíve${d > 1 ? "is" : "l"}` : "esgotado"} — clique para explorar`;
  };
  function apontar(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
  }
  const posDica = (e, txt) => { const r = host.getBoundingClientRect(); dica.textContent = txt; const x = Math.min(e.clientX - r.left + 16, r.width - dica.offsetWidth - 8); dica.style.transform = `translate(${Math.max(8, x)}px, ${e.clientY - r.top + 16}px)`; dica.classList.add("on"); };
  function hoverAndar(a, e) {
    for (let i = 1; i <= N; i++) alvo[i] = i === a ? 1.6 : 0;
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
  const dadosUn = (un) => { const l = un && A.layout(andarAberto)[un.idx]; if (!l || l.c === undefined) return null; return UN.find((q) => q.andar === andarAberto && q.c === l.c) || null; };
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
        rotulos.push({ el, p: un.centro(un.planta.U / 2, Math.min(un.planta.W, 6.65) * 0.45).setY(PE + 0.5) });
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
    const info = A.ANDAR(andarAberto);
    ui.titulo.textContent = info.titulo;
    ui.sub.textContent = `${info.sub} · clique ${info.tipo === "tipo" ? "numa unidade" : "num ambiente"} para ver de perto`;
    ui.card.hidden = true; ui.andar.hidden = true;
  }
  function painelUnidade() {
    const un = E.unidades[unidadeAtiva], u = dadosUn(un);
    ui.andar.hidden = false;
    if (u) {
      const t = T[u.tipo];
      ui.titulo.textContent = `Unidade ${u.id}`;
      ui.sub.textContent = `${t.n} · ${t.m2} m²${t.jardim ? ` com jardim de ${t.jardim} m²` : ""} · ${u.face} · clique num cômodo para ver a foto`;
      const msg = `Olá! Tenho interesse na unidade ${u.id} (${t.n}, ${t.m2} m²) do Aurora.`;
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
    const y = baseY(a) + LAJE, tgt = new THREE.Vector3(a <= 8 ? 2.6 : 0, y, 0);
    if (retrato()) return [esfera(tgt, 96, 1.12, 0.22), tgt];
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(17)) * (largura / altura));
    return [esfera(tgt, Math.max(66, 31 / Math.tan(hf)), 1.05, -Math.PI / 2 + 0.3), tgt];
  }
  function vistaUnidade(un) {
    const pl = un.planta, c = un.centro(pl.U / 2, Math.min(pl.W, 6.65) / 2), fora = un.centro(pl.U / 2, 10).sub(c).normalize();
    const tgt = new THREE.Vector3(c.x, baseY(andarAberto) + LAJE + 0.4, c.z);
    const r = Math.max(pl.U, Math.min(pl.W, 6.65)) * (retrato() ? 2.5 : 1.7) + 5;
    return [esfera(tgt, r, 1.02, Math.atan2(fora.x, fora.z) + 0.38), tgt];
  }
  function escolherUnidade(a, op) {
    const lista = A.layout(a);
    if (op.lazer) { const i = lista.findIndex((x) => x.planta === op.lazer); if (i >= 0) return i; }
    if (op.unidade !== undefined) return op.unidade;
    if (op.tipo) {
      const cands = lista.map((x, i) => ({ x, i })).filter(({ x }) => x.planta === op.tipo);
      const disp = cands.find(({ x }) => UN.find((u) => u.andar === a && u.c === x.c)?.st === "d");
      return (disp || cands[0] || { i: 0 }).i;
    }
    return a === 1 || a === N ? 0 : 2;
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
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = i > a ? 120 + (i - a) * 3 : 0;
    coroa.userData.alvoDy = 120 + (N - a) * 3 + 6;
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
  function fechar(instantaneo = false) {
    if (modo === "andar") sairVisita();
    if (modo !== "explorar" && !(instantaneo && modo === "fechando")) return;
    modo = "fechando"; controls.enabled = false; fecharFoto(); enquadrar();
    ui.rotulos.innerHTML = ""; rotulos = []; realcar(null); dica.classList.remove("on");
    for (let i = 1; i <= N; i++) andares[i].userData.alvoDy = 0;
    coroa.userData.alvoDy = 0;
    const fim = () => {
      andares[andarAberto].userData.casca.visible = true;
      interior.visible = false; limpar(); luzExterior();
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
  let visitaFora = false;
  function luzVisita() {
    const un = E.unidades[unidadeAtiva]; if (!un) return;
    const pl = un.planta, c = un.centro(pl.U / 2, pl.W / 2), fora = un.centro(pl.U / 2, pl.W + 10).sub(c).normalize(), y = interior.position.y;
    // sol baixo entrando pela fachada da unidade, na cor do horário
    estudio.position.set(c.x + fora.x * 14 - fora.z * 6, y + 8, c.z + fora.z * 14 + fora.x * 6); estudio.target.position.set(c.x, y, c.z); estudio.target.updateMatrixWorld();
    estudio.castShadow = true; sol.castShadow = false;
    const noite = hora === "noite";
    estudio.color.setHex(hora === "manha" ? 0xfff0dc : hora === "tarde" ? 0xffb07a : 0x9fb4ff);
    if (visitaFora) { scene.environment = envCeu; scene.environmentIntensity = 0.9; renderer.toneMappingExposure = expoBase; }
    else { scene.environment = envInterno; scene.environmentIntensity = noite ? 0.18 : 0.32; renderer.toneMappingExposure = noite ? 0.95 : 0.9; }
    bloom.threshold = noite ? 0.8 : 0.96; bloom.strength = noite ? 0.45 : 0.22;
  }
  function entrarVisita() {
    if (modo !== "explorar") return;
    const un = E.unidades[unidadeAtiva]; if (!un) return;
    modo = "andar"; controls.enabled = false; tween.on = false; fecharFoto(); realcar(null); dica.classList.remove("on");
    ui.rotulos.style.display = "none";
    E.tampas.forEach((t) => (t.visible = false)); E.tetos.forEach((t) => (t.visible = true));
    host.classList.add("visita"); host.classList.remove("calmo");
    clearTimeout(entrarVisita.t); entrarVisita.t = setTimeout(() => { if (modo === "andar") host.classList.add("calmo"); }, 6000);
    const pl = un.planta;
    const sp = un.centro(pl.spawn[0], pl.spawn[1]), fora = un.centro(pl.spawn[0], pl.spawn[1] + 1).sub(sp);
    posMundo.set(sp.x, 0, sp.z); yaw = Math.atan2(-fora.x, -fora.z); pitch = -0.04;
    const noite = hora === "noite";
    for (const [u, w, i] of pl.luzes || []) {
      const c = un.centro(u, w);
      const l = new THREE.PointLight(0xffd6a8, i * (noite ? 0.9 : 0.5), 9, 2); l.position.set(c.x, PE - 0.25, c.z); interior.add(l); luzesInt.push(l);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), mat.spot); s.position.set(c.x, PE - 0.012, c.z); interior.add(s); luzesInt.push(s);
    }
    camera.fov = 70; camera.near = 0.05; camera.updateProjectionMatrix();
    visitaFora = un.comodos.every((c) => OUT.has(c.tipo));
    luzVisita();
    if (!celular) canvas.requestPointerLock?.();
  }
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
    p.x = THREE.MathUtils.clamp(p.x, -10.2 + 0.25, xFrente(andarAberto) - 0.25);
    p.z = THREE.MathUtils.clamp(p.z, -ZB + 0.2, ZB - 0.2);
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
    const az = azBase + (reduz ? 0 : Math.sin(relogio * 0.07) * 0.06) + mouseX * 0.1;
    return new THREE.Vector3(Math.sin(az) * distPredio + 1.5, 24 - mouseY * 8, Math.cos(az) * distPredio - 2);
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
    if (!reduz) moverCarros(dt);
    if (Math.abs(off.x - offAlvo.x) + Math.abs(off.y - offAlvo.y) > 0.5) { const k = Math.min(1, dt * 3); off.x += (offAlvo.x - off.x) * k; off.y += (offAlvo.y - off.y) * k; aplicarOff(); }
    for (let i = 1; i <= N; i++) {
      intens[i] += (alvo[i] - intens[i]) * Math.min(1, dt * 6);
      vidros[i].emissiveIntensity = baseVidro * (0.55 + ((i * 37) % 10) / 22) + intens[i];
      const u = andares[i].userData; u.dy += (u.alvoDy - u.dy) * Math.min(1, dt * 3.2);
      andares[i].position.y = u.y0 + u.dy; andares[i].visible = u.dy < 100;
    }
    const cu = coroa.userData; cu.dy += (cu.alvoDy - cu.dy) * Math.min(1, dt * 3.2);
    coroa.position.y = TOPO + cu.dy; coroa.visible = cu.dy < 100;
    if (tween.on) {
      tween.t += dt / tween.dur; const k = Math.min(1, tween.t), e = ease(k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); camera.lookAt(controls.target);
      if (k >= 1) { tween.on = false; tween.fim?.(); }
    } else if (modo === "predio") { camera.position.lerp(posPredio(), Math.min(1, dt * 2.5)); controls.target.copy(alvoPredio); camera.lookAt(alvoPredio); }
    else if (modo === "explorar") controls.update();
    else if (modo === "andar") andar(dt);
    // o sol do horário no prédio; estúdio na maquete; sol pela janela na visita
    const noite = hora === "noite";
    const alvoLuz = modo === "explorar" ? [noite ? 1.0 : 1.2, 0.12, noite ? 2.4 : 2.6, solBase * 0.35] : modo === "andar" ? (visitaFora ? [hemiBase, 0.05, 0, solBase] : [noite ? 0.25 : 0.55, 0.04, noite ? 0.0 : 1.9, 0]) : [hemiBase, 0.05, 0, solBase];
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
  montarCidade();
  aplicarHora(hora);
  enquadrar(); off.x = offAlvo.x; off.y = offAlvo.y; aplicarOff();
  camera.position.copy(posPredio()).add(new THREE.Vector3(-30, 30, 40));
  window.__predio3d = {
    abrirAndar, fechar, entrarVisita, sairVisita, ativarUnidade, verAndar, hoverAndar, hora: aplicarHora,
    abrirFoto: (n) => { const p = E.pisos.find((q) => q.userData.un === unidadeAtiva && q.userData.nome === n); if (p) abrirFoto(p.userData); },
    estado: () => ({ modo, andarAberto, unidadeAtiva, zoom, hora, unidades: E.unidades.length, obst: E.obst.length, pisos: E.pisos.length, portas: E.portas.length }),
    conflitos: () => E.conflitos,
    irPara: (x, z, y, pt) => { posMundo.set(x, 0, z); if (y !== undefined) yaw = y; if (pt !== undefined) pitch = pt; },
    posicao: () => ({ x: +posMundo.x.toFixed(2), z: +posMundo.z.toFixed(2) }),
    pular: () => { if (tween.on) tween.t = 1; for (const g of [...andares.slice(1), coroa]) g.userData.dy = g.userData.alvoDy || 0; },
  };
  requestAnimationFrame(quadro);
}
