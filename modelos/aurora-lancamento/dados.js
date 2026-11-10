/* Aurora — dados compartilhados pela página e pelo prédio em 3D.
   O prédio segue o projeto de referência: andar em "H" com 19 unidades
   (4 de 1 dormitório na frente, 4 nos fundos, 7 studios na ala oeste e 4 na ala leste),
   núcleo atrás da ala leste, embasamento com lazer e rooftop com piscina.

   Plantas em metros, no sistema local de cada unidade:
   - u atravessa a unidade (de uma parede de divisa à outra);
   - w vai do corredor (w = 0) até o guarda-corpo da varanda (w = W).
   No andar, cada unidade recebe [x, z, giro, espelho]: posição do canto (u = 0, w = 0),
   rotação em torno do eixo vertical e espelhamento do eixo u. A avenida fica em +z. */
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
      resumo: "Living e quarto integrados, cozinha linear e varanda com área técnica",
      feats: ["Cozinha linear com forno e cooktop de indução", "Varanda com porta de correr e jardim vertical", "Área técnica para máquina de lavar", "Planta pronta para locação de curta temporada"],
    },
    um: {
      n: "1 dormitório", m2: 38, base: 598000, planta: "um", jardim: 0,
      resumo: "Living com cozinha integrada, bancada de refeições e dormitório com armário",
      feats: ["Dormitório separado com armário de 1,80 m", "Bancada de refeições junto à cozinha", "Varanda com área técnica", "Banho com box e bancada"],
    },
    gstudio: {
      n: "Garden studio", m2: 36, base: 455000, planta: "gstudio", jardim: 10,
      resumo: "Studio no 2º andar com jardim privativo sobre o embasamento",
      feats: ["Jardim privativo de cerca de 10 m²", "Living e quarto integrados", "Cozinha linear com forno e indução", "Área técnica para máquina de lavar"],
    },
  };

  /* ---------- plantas (medidas da planta de vendas) ---------- */
  const studio = {
    U: 3.57, W: 6.65, ext: [],
    comodos: [
      ["entrada", "Cozinha", "cozinha", 0, 0, 1.75, 2.27, "cozinha"],
      ["banho", "Banho", "molhado", 1.75, 0, 3.57, 2.27, "banho"],
      ["studio", "Living e quarto", "social", 0, 2.27, 3.57, 5.5, "studio"],
      ["varanda", "Varanda", "varanda", 0, 5.5, 2.3, 6.65, "varanda"],
      ["servico", "Área técnica", "tecnica", 2.3, 5.5, 3.57, 6.65],
    ],
    abertos: [["entrada", "studio"]],
    portas: [["banho", "entrada", 1.85, 0.7], ["varanda", "studio", 1.9, 0.7], ["servico", "varanda", 6.05, 0.7]],
    entradas: [[0.85, 1.65]],
    luzes: [[1.8, 3.9, 6], [0.9, 1.3, 4], [2.6, 1.2, 2.2]],
    spawn: [1.25, 0.55],
  };
  const um = {
    U: 5.1, W: 6.65, ext: [],
    comodos: [
      ["sala", "Living e cozinha", "social", 0, 0, 2.6, 5.45, "sala"],
      ["banho", "Banho", "molhado", 2.6, 0, 5.1, 1.45, "banho2"],
      ["hall", "Circulação", "hall", 2.6, 1.45, 3.5, 2.5],
      ["closet", "Armário", "quarto", 3.5, 1.45, 5.1, 2.5],
      ["quarto", "Dormitório", "quarto", 2.6, 2.5, 5.1, 5.45, "dorm"],
      ["varanda", "Varanda", "varanda", 0, 5.45, 3.6, 6.65, "varanda"],
      ["servico", "Área técnica", "tecnica", 3.6, 5.45, 5.1, 6.65],
    ],
    abertos: [["sala", "hall"], ["closet", "quarto"]],
    portas: [["banho", "hall", 3.05, 0.7], ["quarto", "hall", 3.05, 0.75], ["varanda", "sala", 1.5, 1.6], ["servico", "varanda", 6.05, 0.7]],
    entradas: [[0.9, 1.75]],
    luzes: [[1.3, 3.8, 6], [1.0, 1.4, 4], [3.85, 3.9, 5], [3.85, 0.7, 2.2]],
    spawn: [1.3, 0.55],
  };
  const gstudio = { ...studio, W: 9.25, comodos: [...studio.comodos, ["jardim", "Jardim privativo", "jardim", 0, 6.65, 3.57, 9.25, "jardim"]] };
  const lazer = (U, comodos, extra) => ({ U, W: 6.65, ext: ["w1"], abertos: [], portas: [], entradas: [], luzes: [], spawn: [1.6, 0.9], ...extra, comodos });
  const PLANTAS = {
    studio, um, gstudio,
    // 1º pavimento (embasamento)
    brinquedoteca: lazer(10.2, [["brinquedoteca", "Brinquedoteca", "kids", 0, 0, 10.2, 6.65, "brinquedoteca"]], { ext: ["w1", "u0"], vitrine: true, entradas: [[7.6, 9.2]], luzes: [[3, 3.3, 8], [7.2, 3.3, 7]], spawn: [8.4, 0.9] }),
    jogos: lazer(10.2, [["jogos", "Sala de jogos", "social", 0, 0, 10.2, 6.65, "jogos"]], { ext: ["w1", "u0"], vitrine: true, entradas: [[7.6, 9.2]], luzes: [[3, 3.3, 8], [7.2, 3.3, 8]], spawn: [8.4, 0.9] }),
    gourmet: lazer(13.2, [["gourmet", "Living gourmet", "social", 0, 0, 13.2, 6.65, "gourmet"]], { vitrine: true, entradas: [[10.6, 12.2]], luzes: [[3, 3.3, 9], [7.2, 3.3, 9], [11, 3.3, 7]], spawn: [11.4, 0.9] }),
    lounge: lazer(13.2, [["lounge", "Lounge e TV", "social", 0, 0, 13.2, 6.65, "salao"]], { vitrine: true, entradas: [[1.0, 2.6]], luzes: [[4, 3.3, 8], [9.5, 3.3, 8]], spawn: [1.8, 0.9] }),
    lavanderia: lazer(7.9, [["lavanderia", "Lavanderia", "servico", 0, 0, 7.9, 6.65, "lavanderia"]], { vitrine: true, entradas: [[1.0, 2.4]], luzes: [[4, 3.3, 7]], spawn: [1.7, 0.9] }),
    delivery: lazer(7.9, [["delivery", "Delivery e maleiro", "social", 0, 0, 7.9, 6.65, "delivery"]], { vitrine: true, entradas: [[5.5, 6.9]], luzes: [[4, 3.3, 7]], spawn: [6.2, 0.9] }),
    externo1: lazer(20.4, [["externo1", "Lounge externo e playground", "externo", 0, 0, 20.4, 6.65, "solario"]], { ext: ["w1", "u0", "u1"], spawn: [10.2, 0.9] }),
    // cobertura
    piscina: lazer(20.4, [["piscina", "Piscina com deck molhado", "externo", 0, 0, 20.4, 6.65, "piscina"]], { ext: ["w1", "u0", "u1"], spawn: [10.2, 0.8] }),
    lareira: lazer(20.4, [["lareira", "Lounge com lareira", "externo", 0, 0, 20.4, 6.65, "lareira"]], { ext: ["w1", "u0", "u1"], luzes: [[10.2, 3.6, 5]], spawn: [10.2, 0.8] }),
    fitness: lazer(13.2, [["fitness", "Fitness", "fitness", 0, 0, 13.2, 6.65, "fitness"]], { vitrine: true, entradas: [[10.6, 12.2]], luzes: [[3.5, 3.3, 8], [9.5, 3.3, 8]], spawn: [11.4, 0.9] }),
    coworking: lazer(13.2, [["coworking", "Coworking", "social", 0, 0, 13.2, 6.65, "cowork"]], { vitrine: true, entradas: [[1.0, 2.6]], luzes: [[4, 3.3, 9], [9.5, 3.3, 8]], spawn: [1.8, 0.9] }),
    solario: lazer(15.8, [["solario", "Solário e pool bar", "externo", 0, 0, 15.8, 6.65, "solario"]], { ext: ["w1", "u0"], spawn: [7.9, 0.8] }),
  };

  /* ---------- andar em "H" (posições medidas na planta-chave) ---------- */
  const N = 24;                                   // 1º = lazer no embasamento · 2º ao 23º = tipo · 24 = cobertura
  const XF = -10.2, LF = 5.1, ZF = 14.9;          // barra da frente: 4 unidades de 5,10 m, corredor até z = 14,9
  const ZA = -13.2, LA = 3.77, XA = -0.84;        // ala oeste: 7 studios de 3,77 m a partir de z = -13,2
  const ZM = 13.2, LM = 3.95, XM = 0.66;          // ala leste: 4 studios de 3,95 m a partir de z = 13,2
  // [x, z, giro, espelho] do canto (u = 0, w = 0) de cada vaga
  const frente = (i, m = 1, larg = LF) => [XF + LF * i + (m < 0 ? larg : 0), ZF, 0, m];
  const fundos = (i, m = 1, larg = LF) => [-XF - LF * i - (m < 0 ? larg : 0), -ZF, Math.PI, m];
  const oeste = (i, m = 1, larg = LA) => [XA, ZA + LA * i + (m < 0 ? larg : 0), -Math.PI / 2, m];
  const leste = (i, m = 1, larg = LM) => [XM, ZM - LM * i - (m < 0 ? larg : 0), Math.PI / 2, m];
  const espelho = (i) => (i % 2 ? -1 : 1);
  function layout(a) {
    if (a === 1) return [
      { planta: "brinquedoteca", pos: frente(0) }, { planta: "jogos", pos: frente(2, -1, 2 * LF) },
      { planta: "gourmet", pos: oeste(0) }, { planta: "lounge", pos: oeste(3.5) },
      { planta: "lavanderia", pos: leste(0) }, { planta: "delivery", pos: leste(2) },
      { planta: "externo1", pos: fundos(0) },
    ];
    if (a === N) return [
      { planta: "piscina", pos: frente(0) }, { planta: "lareira", pos: fundos(0) },
      { planta: "fitness", pos: oeste(0) }, { planta: "coworking", pos: oeste(3.5) },
      { planta: "solario", pos: leste(0) },
    ];
    const L = [];
    [2, 3, 4, 5].forEach((n, i) => L.push({ planta: "um", pos: frente(i, espelho(i)), c: n }));
    if (a <= 8) L.push({ planta: "um", pos: frente(4, -1), c: 6 });
    [7, 8, 9, 10].forEach((n, i) => L.push({ planta: "studio", pos: leste(i, espelho(i)), c: n }));
    [17, 16, 15, 14, 13, 12, 11].forEach((n, i) => L.push({ planta: a === 2 ? "gstudio" : "studio", pos: oeste(i, espelho(i)), c: n }));
    [19, 20, 21, 22].forEach((n, i) => L.push({ planta: "um", pos: fundos(i, espelho(i)), c: n }));
    return L;
  }
  const ANDAR = (a) =>
    a === N ? { tipo: "rooftop", nome: "Cobertura", titulo: "Cobertura · Rooftop", sub: "Piscina com deck molhado, lounge com lareira, fitness, coworking e solário" }
    : a === 1 ? { tipo: "lazer", nome: "Lazer", titulo: "1º pavimento · Lazer", sub: "Brinquedoteca, sala de jogos, living gourmet, lounge, lavanderia, delivery e lounge externo" }
    : { tipo: "tipo", nome: "Tipo", titulo: `${a}º andar`, sub: `${a <= 8 ? 20 : 19} unidades: ${a <= 8 ? 9 : 8} de 1 dormitório e 11 ${a === 2 ? "studios (7 garden)" : "studios"}` };

  /* ---------- espelho de vendas (status fictício, mas sempre o mesmo) ---------- */
  const U = [];
  for (let a = 2; a < N; a++) for (const x of layout(a)) {
    const t = T[x.planta];
    const k = Math.abs(Math.sin(a * 12.9898 + x.c * 78.233) * 43758.5453) % 1;
    const st = k < 0.4 ? "d" : k < 0.58 ? "r" : "v";
    const face = x.pos[2] === 0 ? "Frente · avenida" : x.pos[2] === Math.PI ? "Fundos" : x.pos[2] < 0 ? "Oeste · pôr do sol" : "Leste · nascente";
    const preco = Math.round((t.base * (1 + (a - 2) * 0.008) * (x.pos[2] === 0 ? 1.02 : 1)) / 1000) * 1000;
    U.push({ id: `${a}${String(x.c).padStart(2, "0")}`, andar: a, c: x.c, tipo: x.planta, st, preco, m2: t.m2, face });
  }

  const WA = "5511999990000";
  window.AURORA = { T, U, N, PLANTAS, layout, ANDAR, foto, WA, wa: (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}` };
})();
