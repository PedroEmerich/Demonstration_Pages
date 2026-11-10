/* Aurora Vila Mariana — dados compartilhados pela página e pelo prédio em 3D.
   Plantas em metros. Em cada planta:
   - u vai do lado do núcleo (u = 0) para fora (u = U);
   - w vai do corredor (w = 0) até a fachada (w = W).
   O prédio 3D espelha cada planta para o canto onde ela fica no andar. */
(() => {
  const FOTO = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=78&auto=format&fit=crop`;
  const ID = {
    piscina: "1542314831-068cd1dbfeeb", solario: "1566073771259-6a8506099945", poolbar: "1571896349842-33c89424de2d",
    lareira: "1600210491892-03d54c0aaf87", fitness: "1540497077202-7c8a3999166f", funcional: "1534438327276-14e5300c3a48",
    fitness2: "1593079831268-3381b0db4a77", cowork: "1497366811353-6870744d04b2", cowork2: "1527192491265-7e15c55b1ed2",
    lobby: "1524758631624-e2822e304c36", brinquedoteca: "1596464716127-f2a82984de30", brinquedos: "1515488042361-ee00e0ddd4e4",
    jogos: "1611251135345-18c56206b863", gourmet: "1528605248644-14dd04022da1", lavanderia: "1626806787461-102c1bfaaea1",
    bike: "1507035895480-2b3156c31fc8", delivery: "1607082348824-0a96f2a4b9da", salao: "1567767292278-a4f21aa2d36e",
    studio: "1522708323590-d24dbb6b0267", sala: "1493809842364-78817add7ffb", sala2: "1600607687939-ce8a6c25118c",
    cozinha: "1556911220-bff31c812dba", jantar: "1617806118233-18e1de247200", dorm: "1540518614846-7eded433c457",
    dorm2: "1566665797739-1674de7a421a", banho: "1584622650111-993a426fbf0a", banho2: "1620626011761-996317b8d101",
    varanda: "1604014237800-1c9102c219da", jardim: "1604014237800-1c9102c219da", fachada: "1545324418-cc1a3fa10c00",
    fachada2: "1460317442991-0ec209397118", cidade: "1543059080-f9b1272213d5", cidade2: "1554168848-228452c09d60",
  };
  const foto = (k, w) => (ID[k] ? FOTO(ID[k], w) : "");

  /* ---------- tipologias ---------- */
  const T = {
    studio: {
      n: "Studio", m2: 26, base: 412000, planta: "studio", jardim: 0,
      resumo: "Living e quarto integrados, cozinha americana e sacada",
      feats: ["Cozinha americana com ponto para lava e seca", "Sacada com porta de correr", "Fechadura digital e tomadas USB", "Planta pronta para locação de curta temporada"],
    },
    um: {
      n: "1 dormitório", m2: 38, base: 598000, planta: "um", jardim: 0,
      resumo: "Dormitório com janela lateral, living com varanda e cozinha integrada",
      feats: ["Dormitório com janela lateral e cortina blackout", "Living com saída para a varanda", "Cozinha integrada ao living", "Medição individual de água e energia"],
    },
    gstudio: {
      n: "Garden studio", m2: 40, base: 529000, planta: "gstudio", jardim: 14,
      resumo: "Studio no 1º pavimento com jardim privativo de 14 m²",
      feats: ["Jardim privativo de 14 m² com deck", "Living e quarto integrados", "Cozinha americana", "Ponto de água e tomada no jardim"],
    },
    gum: {
      n: "Garden 1 dormitório", m2: 58, base: 742000, planta: "gum", jardim: 20,
      resumo: "1 dormitório no 1º pavimento com jardim privativo de 20 m²",
      feats: ["Jardim privativo de 20 m² em L", "Dormitório com janela lateral", "Living com varanda integrada ao jardim", "Ponto de água e tomada no jardim"],
    },
  };

  /* ---------- plantas ---------- */
  const studio = {
    U: 3.9, W: 7.2, ext: [],
    comodos: [
      ["banho", "Banho", "molhado", 0, 0, 1.7, 2.3, "banho"],
      ["cozinha", "Cozinha", "cozinha", 1.7, 0, 3.9, 2.3, "cozinha"],
      ["studio", "Living e quarto", "social", 0, 2.3, 3.9, 6.0, "studio"],
      ["sacada", "Sacada", "varanda", 0, 6.0, 3.9, 7.2, "varanda"],
    ],
    abertos: [["cozinha", "studio"]],
    portas: [["banho", "cozinha", 1.75], ["sacada", "studio", 2.85, 1.3]],
    entradas: [[1.9, 2.8]],
    luzes: [[1.7, 4.4, 6], [2.8, 1.1, 4], [0.85, 1.4, 2.2]],
    spawn: [2.35, 0.75],
  };
  const um = {
    U: 6.2, W: 7.2, ext: ["u1"],
    comodos: [
      ["banho", "Banho", "molhado", 0, 0, 1.7, 2.4, "banho2"],
      ["cozinha", "Cozinha", "cozinha", 1.7, 0, 3.6, 2.4, "cozinha"],
      ["living", "Living", "social", 0, 2.4, 3.6, 6.0, "sala"],
      ["quarto", "Dormitório", "quarto", 3.6, 0, 6.2, 6.0, "dorm"],
      ["varanda", "Varanda", "varanda", 0, 6.0, 6.2, 7.2, "varanda"],
    ],
    abertos: [["cozinha", "living"]],
    portas: [["banho", "cozinha", 1.85], ["quarto", "living", 2.95], ["varanda", "living", 2.0, 1.6]],
    entradas: [[1.9, 2.8]],
    luzes: [[1.8, 4.3, 7], [2.6, 1.1, 4], [4.9, 2.4, 5], [4.9, 4.8, 3], [0.85, 1.4, 2.2]],
    spawn: [2.35, 0.75],
  };
  const comJardim = (p) => ({ ...p, W: 10.4, comodos: [...p.comodos, ["jardim", "Jardim privativo", "jardim", 0, 7.2, p.U, 10.4, "jardim"]] });
  const lazer = (comodos, extra) => ({ U: 14, W: 7.2, ext: ["w1", "u1"], abertos: [], portas: [], entradas: [], luzes: [], spawn: [2, 1], ...extra, comodos });
  const PLANTAS = {
    studio, um, gstudio: comJardim(studio), gum: comJardim(um),
    gourmet: lazer([["gourmet", "Living gourmet", "social", 0, 0, 9, 7.2, "gourmet"], ["lavanderia", "Lavanderia", "servico", 9, 0, 14, 7.2, "lavanderia"]],
      { vitrine: true, entradas: [[2.4, 4.0], [11.0, 11.9]], luzes: [[4.5, 3.4, 10], [11.5, 3.6, 6]], spawn: [3.2, 0.9] }),
    kids: lazer([["brinquedoteca", "Brinquedoteca", "kids", 0, 0, 6, 7.2, "brinquedoteca"], ["jogos", "Sala de jogos", "social", 6, 0, 14, 7.2, "jogos"]],
      { vitrine: true, entradas: [[2.2, 3.6], [9.3, 10.7]], luzes: [[3, 3.6, 7], [10, 3.6, 8]], spawn: [9.9, 0.9] }),
    fitness: lazer([["fitness", "Fitness", "fitness", 0, 0, 14, 7.2, "fitness"]],
      { vitrine: true, entradas: [[1.0, 2.6]], luzes: [[4, 3.6, 8], [10, 3.6, 8]], spawn: [1.8, 0.9] }),
    funcional: lazer([["funcional", "Espaço funcional", "fitness", 0, 0, 14, 7.2, "funcional"]],
      { vitrine: true, entradas: [[1.0, 2.6]], luzes: [[4, 3.6, 7], [10, 3.6, 7]], spawn: [1.8, 0.9] }),
    cowork: lazer([["cowork", "Coworking", "social", 0, 0, 9.5, 7.2, "cowork"], ["reuniao", "Sala de reunião", "social", 9.5, 0, 14, 7.2, "cowork2"]],
      { vitrine: true, entradas: [[1.0, 2.6]], portas: [["reuniao", "cowork", 1.4]], luzes: [[4.6, 3.6, 9], [11.8, 3.6, 6]], spawn: [1.8, 0.9] }),
    lounge: lazer([["lounge", "Lounge e cabines", "social", 0, 0, 14, 7.2, "lobby"]],
      { vitrine: true, entradas: [[1.0, 2.6]], luzes: [[4, 3.6, 8], [10.5, 3.6, 7]], spawn: [1.8, 0.9] }),
    piscina: lazer([["piscina", "Piscina com deck molhado", "externo", 0, 0, 14, 7.2, "piscina"]], { spawn: [1.2, 0.9] }),
    solario: lazer([["solario", "Solário e pool bar", "externo", 0, 0, 14, 7.2, "solario"]], { spawn: [1.2, 0.9] }),
    lareira: lazer([["lareira", "Lounge com lareira", "externo", 0, 0, 14, 7.2, "lareira"]], { luzes: [[7.0, 3.9, 5]], spawn: [1.2, 0.9] }),
    salao: lazer([["salao", "Salão da cobertura", "social", 0, 0, 14, 7.2, "salao"]],
      { vitrine: true, entradas: [[1.0, 2.6]], luzes: [[4, 3.6, 8], [10.5, 3.6, 8]], spawn: [1.8, 0.9] }),
  };

  /* ---------- andares ---------- */
  const N = 22;
  const Q = { fd: [3, 0.8, 1, 1], fe: [-3, 0.8, -1, 1], td: [3, -0.8, 1, -1], te: [-3, -0.8, -1, -1] };
  // 6 unidades de cada lado do corredor: na frente da esquerda para a direita, nos fundos da direita para a esquerda
  const linha = (f) => {
    const L = [["um", -10.8, -1], ["studio", -6.9, -1], ["studio", -3, -1], ["studio", 3, 1], ["studio", 6.9, 1], ["um", 10.8, 1]];
    return (f > 0 ? L : [...L].reverse()).map(([planta, px, sx]) => ({ planta, pos: [px, 0.8 * f, sx, f] }));
  };
  function layout(a) {
    if (a === 1) return [...linha(1).map((x, c) => ({ ...x, planta: x.planta === "um" ? "gum" : "gstudio", c })), { planta: "gourmet", pos: Q.td }, { planta: "kids", pos: Q.te }];
    if (a === 21) return [{ planta: "fitness", pos: Q.fd }, { planta: "funcional", pos: Q.fe }, { planta: "cowork", pos: Q.td }, { planta: "lounge", pos: Q.te }];
    if (a === 22) return [{ planta: "piscina", pos: Q.fd }, { planta: "solario", pos: Q.fe }, { planta: "lareira", pos: Q.td }, { planta: "salao", pos: Q.te }];
    return [...linha(1), ...linha(-1)].map((x, c) => ({ ...x, c }));
  }
  const ANDAR = (a) =>
    a === 22 ? { tipo: "rooftop", nome: "Rooftop", titulo: "22º · Rooftop", sub: "Piscina com deck molhado, solário com pool bar, lounge com lareira e salão envidraçado" }
    : a === 21 ? { tipo: "fitness", nome: "Fitness e coworking", titulo: "21º · Fitness e coworking", sub: "Fitness, espaço funcional, coworking com sala de reunião e lounge com cabines" }
    : a === 1 ? { tipo: "garden", nome: "Gardens e lazer", titulo: "1º pavimento · Gardens e lazer", sub: "6 unidades com jardim privativo, living gourmet, lavanderia, brinquedoteca e sala de jogos" }
    : { tipo: "tipo", nome: "8 studios e 4 de 1 dormitório", titulo: `${a}º andar`, sub: "8 studios de 26 m² e 4 apartamentos de 1 dormitório com 38 m²" };

  /* ---------- espelho de vendas (status fictício, mas sempre o mesmo) ---------- */
  const U = [];
  for (let a = 1; a <= 20; a++) for (const x of layout(a)) {
    if (x.c === undefined) continue;
    const t = T[x.planta];
    const k = Math.abs(Math.sin(a * 12.9898 + x.c * 78.233) * 43758.5453) % 1;
    const st = k < 0.42 ? "d" : k < 0.6 ? "r" : "v";
    const frente = x.pos[3] > 0;
    const preco = Math.round((t.base * (1 + Math.max(0, a - 2) * 0.009) * (frente ? 1.015 : 1)) / 1000) * 1000;
    U.push({ id: `${a}${String(x.c + 1).padStart(2, "0")}`, andar: a, c: x.c, tipo: x.planta, st, preco, m2: t.m2, face: frente ? "Frente" : "Fundos" });
  }

  const WA = "5511999990000";
  window.AURORA = { T, U, N, PLANTAS, layout, ANDAR, foto, WA, wa: (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}` };
})();
