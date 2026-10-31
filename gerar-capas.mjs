/* ==========================================================================
   Gera as capas (capturas de tela) de cada modelo em /modelos
     capa.jpg         -> computador (1440x900)
     capa-mobile.jpg  -> celular (390x844)

   Uso (precisa do Node 22+ e do Chrome ou Edge instalados):
     node gerar-capas.mjs              -> todos os modelos
     node gerar-capas.mjs sbc-dev      -> só um modelo
   ========================================================================== */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const ESPERA_MS = 7000; // tempo para as animações de entrada terminarem
const PORTA = 9333;

const navegador = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env["ProgramFiles(x86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env["ProgramFiles(x86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!navegador) throw new Error("Chrome ou Edge não encontrado.");

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(join(tmpdir(), "vitrine-capas-"));
const chrome = spawn(navegador, [
  "--headless=new", "--hide-scrollbars", "--mute-audio", "--no-first-run",
  `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, "about:blank",
], { stdio: "ignore" });

async function conecta() {
  for (let i = 0; i < 50; i++) {
    try {
      const abas = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
      const pagina = abas.find((a) => a.type === "page");
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch {}
    await espera(200);
  }
  throw new Error("Não foi possível conectar ao navegador.");
}

const ws = new WebSocket(await conecta());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pendentes = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id); }
});
const cdp = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pendentes.set(n, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });

// esconde cursores personalizados dos modelos (ficariam parados no meio da captura)
const LIMPA = `document.querySelectorAll('[class*="cursor" i],[id*="cursor" i]').forEach(e=>{
  const r=e.getBoundingClientRect(); if(getComputedStyle(e).position==='fixed' && r.width<120) e.style.display='none';
});`;

async function captura(url, destino, largura, altura, escala, mobile) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: escala, mobile });
  await cdp("Page.navigate", { url });
  await espera(ESPERA_MS);
  await cdp("Runtime.evaluate", { expression: LIMPA });
  await espera(300);
  const { data } = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 82 });
  writeFileSync(destino, Buffer.from(data, "base64"));
}

await cdp("Page.enable");
const filtro = process.argv[2];
const pastas = readdirSync(join(RAIZ, "modelos"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!filtro || d.name === filtro))
  .map((d) => d.name);

// modelos publicados em outro endereço (campo "url" no catalogo.js)
const janela = {};
new Function("window", readFileSync(join(RAIZ, "catalogo.js"), "utf8"))(janela);
const externos = (janela.MODELOS || []).filter((m) => m.url && (!filtro || m.pasta === filtro));

const alvos = [
  ...pastas.filter((p) => existsSync(join(RAIZ, "modelos", p, "index.html")))
    .map((p) => [p, pathToFileURL(join(RAIZ, "modelos", p, "index.html")).href]),
  ...externos.map((m) => [m.pasta, m.url]),
];

for (const [pasta, url] of alvos) {
  mkdirSync(join(RAIZ, "modelos", pasta), { recursive: true });
  process.stdout.write(`Capturando ${pasta}... `);
  await captura(url, join(RAIZ, "modelos", pasta, "capa.jpg"), 1440, 900, 1, false);
  await captura(url, join(RAIZ, "modelos", pasta, "capa-mobile.jpg"), 390, 844, 2, true);
  console.log("ok");
}

ws.close();
chrome.kill();
await espera(500);
try { rmSync(perfil, { recursive: true, force: true }); } catch {}
console.log("Pronto!");
