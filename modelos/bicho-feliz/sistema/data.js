/*
  Bicho Feliz · Sistema de agendamento — camada de dados
  Demonstração sem servidor: tudo fica no localStorage do navegador.
  BF.db() lê o banco, BF.salvar() grava, BF.resetar() volta aos dados de exemplo.
*/
(() => {
  const CHAVE = "bf_sistema_v1";
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoje = () => iso(new Date());
  const addDias = (s, n) => { const [y, m, d] = s.split("-").map(Number); const x = new Date(y, m - 1, d + n); return iso(x); };
  const dataObj = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const difDias = (a, b) => Math.round((dataObj(b) - dataObj(a)) / 864e5);
  const uid = (p) => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const u = (id, w = 600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;

  /* ---------- catálogo de serviços e preços ---------- */
  const SERVICOS = {
    hotel: {
      nome: "Hotelzinho", cor: "#e26a2c", icone: "casa",
      desc: "Quartinho climatizado, passeios diários e caminha de verdade.",
      diaria: { P: 85, M: 95, G: 110 },
      extras: [
        { id: "taxi_ida_volta", nome: "Táxi pet (ida e volta)", preco: 45, tipo: "fixo" },
        { id: "banho_saida", nome: "Banho na saída", preco: "banho", tipo: "porte" },
        { id: "medicacao", nome: "Medicação nos horários", preco: 10, tipo: "dia" },
        { id: "passeio_extra", nome: "Passeio extra individual", preco: 20, tipo: "dia" },
        { id: "relatorio_video", nome: "Vídeo diário do seu pet", preco: 8, tipo: "dia" },
      ],
    },
    creche: {
      nome: "Creche / Day use", cor: "#2f7d4f", icone: "sol",
      desc: "Recreação monitorada, piscina e soneca. Das 7h às 19h.",
      periodos: { integral: { nome: "Integral (7h–19h)", preco: 69 }, meio: { nome: "Meio período (até 5h)", preco: 49 } },
      pacote: { nome: "Pacote 10 diárias", preco: 590, diarias: 10 },
      extras: [
        { id: "taxi_ida_volta", nome: "Táxi pet (ida e volta)", preco: 45, tipo: "fixo" },
        { id: "banho_saida", nome: "Banho na saída", preco: "banho", tipo: "porte" },
      ],
    },
    banho: {
      nome: "Banho & tosa", cor: "#3d7be0", icone: "gota",
      desc: "Produtos hipoalergênicos e secagem silenciosa.",
      opcoes: [
        { id: "banho", nome: "Banho", dur: 60, preco: { P: 59, M: 75, G: 95 } },
        { id: "banho_higienica", nome: "Banho + tosa higiênica", dur: 75, preco: { P: 79, M: 95, G: 119 } },
        { id: "tosa_completa", nome: "Banho + tosa completa", dur: 105, preco: { P: 110, M: 135, G: 165 } },
      ],
      extras: [
        { id: "hidratacao", nome: "Hidratação de pelagem", preco: 30, tipo: "fixo" },
        { id: "unhas", nome: "Corte de unhas", preco: 15, tipo: "fixo" },
        { id: "dentes", nome: "Escovação dental", preco: 15, tipo: "fixo" },
        { id: "perfume", nome: "Laço e perfume", preco: 0, tipo: "fixo" },
        { id: "taxi_ida_volta", nome: "Táxi pet (ida e volta)", preco: 45, tipo: "fixo" },
      ],
      inicio: "08:00", fim: "18:00", passo: 30,
    },
  };
  const PROFISSIONAIS = [
    { id: "ju", nome: "Ju Martins", papel: "Banhista e tosadora", cor: "#e26a2c", foto: "1573497019940-1c28c88b4f3e" },
    { id: "rafa", nome: "Rafa Okada", papel: "Tosador", cor: "#3d7be0", foto: "1568602471122-7832951cc4c5" },
    { id: "carol", nome: "Carol Dias", papel: "Banhista", cor: "#2f7d4f", foto: "1494790108377-be9c29b29330" },
  ];
  const STATUS = {
    pendente: { nome: "Aguardando confirmação", cor: "#b7791f", bg: "#fff3d6" },
    confirmado: { nome: "Confirmado", cor: "#2f6fd0", bg: "#e4eeff" },
    andamento: { nome: "Em andamento", cor: "#c4521b", bg: "#ffe8dc" },
    concluido: { nome: "Concluído", cor: "#2f7d4f", bg: "#e2f3e8" },
    cancelado: { nome: "Cancelado", cor: "#8a7f73", bg: "#efe9e1" },
  };
  const STATUS_PEDIDO = {
    novo: { nome: "Novo", cor: "#b7791f", bg: "#fff3d6" },
    separado: { nome: "Separado", cor: "#2f6fd0", bg: "#e4eeff" },
    entregue: { nome: "Entregue", cor: "#2f7d4f", bg: "#e2f3e8" },
    cancelado: { nome: "Cancelado", cor: "#8a7f73", bg: "#efe9e1" },
  };

  /* ---------- dados de exemplo (relativos a hoje) ---------- */
  function semente() {
    const H = hoje();
    const users = [
      { id: "u_ana", nome: "Ana Souza", email: "ana@exemplo.com", senha: "123456", papel: "cliente", tel: "(11) 98765-4321", endereco: "Rua das Flores, 120 · Granja Viana, Cotia", desde: addDias(H, -420) },
      { id: "u_marcos", nome: "Marcos Lima", email: "marcos@exemplo.com", senha: "123456", papel: "cliente", tel: "(11) 99812-3344", endereco: "Av. São Camilo, 900 · Cotia", desde: addDias(H, -300) },
      { id: "u_bia", nome: "Beatriz Rocha", email: "bia@exemplo.com", senha: "123456", papel: "cliente", tel: "(11) 97777-1020", endereco: "Rua Jatobá, 45 · Carapicuíba", desde: addDias(H, -190) },
      { id: "u_caio", nome: "Caio Ferreira", email: "caio@exemplo.com", senha: "123456", papel: "cliente", tel: "(11) 96655-0909", endereco: "Estrada da Roselândia, 300 · Cotia", desde: addDias(H, -90) },
      { id: "u_lu", nome: "Luciana Prado", email: "lu@exemplo.com", senha: "123456", papel: "cliente", tel: "(11) 95544-7788", endereco: "Rua Ipê Roxo, 12 · Vargem Grande Paulista", desde: addDias(H, -40) },
      { id: "u_equipe", nome: "Patrícia Alves", email: "equipe@bichofeliz.com.br", senha: "123456", papel: "operador", cargo: "Recepção e operação", tel: "(11) 4000-2000" },
    ];
    const P = (id, donoId, nome, especie, raca, porte, nascAnos, peso, foto, extra = {}) => ({
      id, donoId, nome, especie, raca, porte, nasc: addDias(H, -Math.round(nascAnos * 365)), peso, foto,
      v10: addDias(H, extra.v10 ?? 200), raiva: addDias(H, extra.raiva ?? 160), antipulgas: addDias(H, extra.pulgas ?? 20),
      castrado: extra.castrado ?? true, temperamento: extra.temp || "Sociável", obs: extra.obs || "", alimentacao: extra.alim || "Ração própria, 2x ao dia",
    });
    const pets = [
      P("p_thor", "u_ana", "Thor", "Cão", "Beagle", "M", 4, 13, "1543466835-00a7907e9de1", { temp: "Brincalhão e guloso", obs: "Adora bolinha. Não pode comer frango.", alim: "Ração hipoalergênica, 150 g 2x ao dia" }),
      P("p_luna", "u_ana", "Luna", "Cão", "Border collie", "G", 2, 19, "1587300003388-59208cc962cb", { temp: "Muita energia", v10: 12, obs: "Gosta de pegar frisbee." }),
      P("p_paco", "u_marcos", "Paçoca", "Cão", "Toller", "M", 5, 21, "1544568100-847a948585b9", { temp: "Calmo", obs: "Toma remédio para articulação às 8h." }),
      P("p_mel", "u_bia", "Mel", "Cão", "Shih-tzu", "P", 7, 6, "1608096299210-db7e38487075", { temp: "Tímida no começo", v10: -5, obs: "Usar shampoo para pele sensível." }),
      P("p_bidu", "u_bia", "Bidu", "Cão", "Schnauzer", "P", 3, 8, "1625316708582-7c38734be31d", { temp: "Late para estranhos" }),
      P("p_zeca", "u_caio", "Zeca", "Cão", "Pug", "P", 6, 9, "1517849845537-4d257902454a", { temp: "Preguiçoso", obs: "Braquicefálico: evitar calor e esforço." }),
      P("p_bolt", "u_caio", "Bolt", "Cão", "Bulldog francês", "P", 2, 11, "1583511655857-d19b40a7a54e", { temp: "Sociável", pulgas: -3 }),
      P("p_nina", "u_lu", "Nina", "Cão", "Golden retriever", "G", 1, 26, "1591946614720-90a587da4a36", { temp: "Muito dócil", castrado: false }),
      P("p_mingau", "u_lu", "Mingau", "Gato", "SRD", "P", 3, 4, "1592194996308-7b43878e84a6", { temp: "Independente", obs: "Só banho, não fica na creche." }),
    ];
    let n = 0;
    const A = (tipo, petId, ini, o = {}) => {
      const pet = pets.find((p) => p.id === petId);
      const a = { id: "a" + (++n), tipo, petId, donoId: pet.donoId, ini, status: o.status || "confirmado", criado: addDias(ini, -5), pagamento: o.pag || "pix", pago: o.pago ?? (o.status === "concluido"), extras: o.extras || [], obs: o.obs || "", ...o };
      a.valor = calcularValor(a, pet);
      return a;
    };
    const agend = [
      A("hotel", "p_thor", addDias(H, -1), { fim: addDias(H, 3), status: "andamento", suite: 4, extras: ["relatorio_video", "banho_saida"], pago: true }),
      A("banho", "p_luna", addDias(H, 1), { hora: "10:00", opcao: "banho_higienica", prof: "ju", extras: ["unhas"] }),
      A("creche", "p_luna", addDias(H, 2), { periodo: "integral", pacote: true }),
      A("hotel", "p_luna", addDias(H, 18), { fim: addDias(H, 22), status: "pendente", suite: null, extras: ["taxi_ida_volta"] }),
      A("banho", "p_thor", addDias(H, -12), { hora: "14:00", opcao: "banho", prof: "carol", status: "concluido" }),
      A("creche", "p_thor", addDias(H, -6), { periodo: "integral", status: "concluido", pacote: true }),
      A("hotel", "p_paco", addDias(H, -2), { fim: addDias(H, 1), status: "andamento", suite: 2, extras: ["medicacao"], pago: true }),
      A("hotel", "p_nina", addDias(H, 0), { fim: addDias(H, 5), status: "confirmado", suite: 7, extras: ["taxi_ida_volta"] }),
      A("hotel", "p_zeca", addDias(H, -4), { fim: addDias(H, 0), status: "andamento", suite: 9, pago: true }),
      A("hotel", "p_bidu", addDias(H, 3), { fim: addDias(H, 6), status: "confirmado", suite: 3 }),
      A("hotel", "p_mel", addDias(H, 3), { fim: addDias(H, 6), status: "pendente", suite: null }),
      A("hotel", "p_bolt", addDias(H, 8), { fim: addDias(H, 12), status: "confirmado", suite: 5 }),
      A("creche", "p_bolt", H, { periodo: "integral", status: "andamento" }),
      A("creche", "p_nina", H, { periodo: "meio", status: "confirmado" }),
      A("creche", "p_bidu", H, { periodo: "integral", status: "andamento", extras: ["banho_saida"] }),
      A("creche", "p_mel", addDias(H, 1), { periodo: "integral", status: "confirmado" }),
      A("banho", "p_mel", H, { hora: "09:00", opcao: "tosa_completa", prof: "rafa", status: "concluido", pago: true }),
      A("banho", "p_bidu", H, { hora: "11:00", opcao: "banho", prof: "ju", status: "andamento" }),
      A("banho", "p_mingau", H, { hora: "13:30", opcao: "banho", prof: "carol", status: "confirmado" }),
      A("banho", "p_zeca", H, { hora: "15:00", opcao: "banho_higienica", prof: "rafa", status: "confirmado", extras: ["hidratacao"] }),
      A("banho", "p_paco", addDias(H, 1), { hora: "16:00", opcao: "banho", prof: "carol", status: "pendente" }),
      A("banho", "p_nina", addDias(H, 2), { hora: "09:30", opcao: "tosa_completa", prof: "rafa", status: "confirmado" }),
    ];
    /* mais cães na creche de hoje para o painel ficar realista */
    const produtos = [
      { id: "pr1", nome: "Ração Super Premium Cães Adultos 10 kg", cat: "Alimentação", preco: 289.9, estoque: 14, img: "1589924691995-400dc9ecc119", desc: "Proteína de frango e arroz, sem corantes. Para cães adultos de porte médio." },
      { id: "pr2", nome: "Biscoitos de osso integrais 300 g", cat: "Petiscos", preco: 24.9, estoque: 42, img: "1568640347023-a616a30bc3bd", desc: "Feitos com aveia e batata-doce, assados na receita da casa." },
      { id: "pr3", nome: "Osso de borracha maciça", cat: "Brinquedos", preco: 39.9, estoque: 18, img: "1535294435445-d7249524ef2e", desc: "Borracha atóxica, resistente para cães que adoram morder." },
      { id: "pr4", nome: "Pelúcia ovelhinha com apito", cat: "Brinquedos", preco: 49.9, estoque: 9, img: "1591946614720-90a587da4a36", desc: "Pelúcia macia com apito interno. Lavável." },
      { id: "pr5", nome: "Caminha de fibra natural", cat: "Conforto", preco: 219.0, estoque: 4, img: "1600369671236-e74521d4b6ad", desc: "Trançada à mão, com almofada removível. 60 × 45 cm." },
      { id: "pr6", nome: "Moletom pet amarelo", cat: "Roupinhas", preco: 79.9, estoque: 11, img: "1583511655857-d19b40a7a54e", desc: "Algodão com felpa. Tamanhos PP ao G." },
      { id: "pr7", nome: "Suéter de tricô vermelho", cat: "Roupinhas", preco: 89.9, estoque: 7, img: "1608096299210-db7e38487075", desc: "Tricô de lã macia para os dias frios." },
      { id: "pr8", nome: "Cachecol de lã cinza", cat: "Roupinhas", preco: 45.0, estoque: 2, img: "1517849845537-4d257902454a", desc: "Acabamento em ponto inglês. Tamanho único." },
      { id: "pr9", nome: "Jaqueta college verde", cat: "Roupinhas", preco: 119.0, estoque: 5, img: "1598133894008-61f7fdb8cc3a", desc: "Nylon impermeável com forro. P ao GG." },
      { id: "pr10", nome: "Shampoo hipoalergênico 500 ml", cat: "Higiene", preco: 54.9, estoque: 23, svg: "shampoo", desc: "O mesmo que usamos no banho & tosa. Sem parabenos." },
      { id: "pr11", nome: "Guia retrátil 5 m", cat: "Passeio", preco: 99.9, estoque: 8, svg: "guia", desc: "Trava com um clique e cabo refletivo. Até 25 kg." },
      { id: "pr12", nome: "Tapete higiênico 30 unidades", cat: "Higiene", preco: 69.9, estoque: 31, svg: "tapete", desc: "Ultra-absorvente com atrativo. 60 × 60 cm." },
    ];
    const pedidos = [
      { id: "pd1", donoId: "u_ana", itens: [{ prodId: "pr2", qtd: 2, preco: 24.9 }, { prodId: "pr3", qtd: 1, preco: 39.9 }], total: 89.7, entrega: "checkout", status: "separado", criado: addDias(H, -1), pagamento: "pix" },
      { id: "pd2", donoId: "u_marcos", itens: [{ prodId: "pr1", qtd: 1, preco: 289.9 }], total: 289.9, entrega: "retirada", status: "novo", criado: H, pagamento: "cartao" },
      { id: "pd3", donoId: "u_bia", itens: [{ prodId: "pr10", qtd: 1, preco: 54.9 }, { prodId: "pr7", qtd: 1, preco: 89.9 }], total: 144.8, entrega: "retirada", status: "entregue", criado: addDias(H, -9), pagamento: "pix" },
    ];
    const fotos = [
      { id: "f1", petId: "p_thor", texto: "Thor acabou de lanchar e já pediu a bolinha de novo 🎾", img: "1543466835-00a7907e9de1", quando: new Date(Date.now() - 40 * 60e3).toISOString(), autor: "Ju" },
      { id: "f2", petId: "p_thor", texto: "Soneca depois do passeio da manhã. Comeu tudo e bebeu bastante água.", img: "1560743641-3914f2c45636", quando: new Date(Date.now() - 4 * 3600e3).toISOString(), autor: "Rafa" },
      { id: "f3", petId: "p_thor", texto: "Primeira noite tranquila! Dormiu abraçado na caminha.", img: "1544568100-847a948585b9", quando: new Date(Date.now() - 22 * 3600e3).toISOString(), autor: "Patrícia" },
      { id: "f4", petId: "p_paco", texto: "Paçoca tomou o remédio das 8h direitinho.", img: "1544568100-847a948585b9", quando: new Date(Date.now() - 3 * 3600e3).toISOString(), autor: "Patrícia" },
    ];
    const pacotes = [{ id: "pk1", donoId: "u_ana", tipo: "creche", saldo: 6, total: 10, compra: addDias(H, -30) }];
    const config = { suites: 16, crecheVagas: 30, abreDomingo: false };
    return { versao: 1, users, pets, agend, produtos, pedidos, fotos, pacotes, config, notas: [] };
  }

  /* ---------- preço de um agendamento ---------- */
  function calcularValor(a, pet) {
    const S = SERVICOS[a.tipo], porte = pet ? pet.porte : "M";
    let total = 0;
    const dias = a.tipo === "hotel" ? Math.max(1, difDias(a.ini, a.fim)) : 1;
    if (a.tipo === "hotel") total += S.diaria[porte] * dias;
    if (a.tipo === "creche") total += a.pacote ? 0 : S.periodos[a.periodo || "integral"].preco;
    if (a.tipo === "banho") { const o = S.opcoes.find((x) => x.id === a.opcao) || S.opcoes[0]; total += o.preco[porte]; }
    (a.extras || []).forEach((id) => {
      const e = S.extras.find((x) => x.id === id); if (!e) return;
      const p = e.preco === "banho" ? SERVICOS.banho.opcoes[0].preco[porte] : e.preco;
      total += e.tipo === "dia" ? p * dias : p;
    });
    return Math.round(total * 100) / 100;
  }

  /* ---------- persistência ---------- */
  let cache = null;
  function db() {
    if (cache) return cache;
    try { const raw = localStorage.getItem(CHAVE); if (raw) { cache = JSON.parse(raw); if (cache.versao === 1) return cache; } } catch (e) { /* armazenamento indisponível */ }
    cache = semente(); salvar(); return cache;
  }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(cache)); } catch (e) { /* modo privado: segue só em memória */ } }
  function resetar() { cache = semente(); salvar(); }

  /* ---------- disponibilidade ---------- */
  const ativos = (lista) => lista.filter((a) => a.status !== "cancelado");
  function ocupacaoHotel(dia, ignorar) {
    /* noite de "dia": quem entra até o dia e sai depois dele */
    return ativos(db().agend).filter((a) => a.tipo === "hotel" && a.id !== ignorar && a.ini <= dia && a.fim > dia).length;
  }
  function vagasHotel(ini, fim, ignorar) {
    let menor = Infinity;
    for (let d = ini; d < fim; d = addDias(d, 1)) menor = Math.min(menor, db().config.suites - ocupacaoHotel(d, ignorar));
    return menor === Infinity ? db().config.suites : menor;
  }
  const ocupacaoCreche = (dia) => ativos(db().agend).filter((a) => a.tipo === "creche" && a.ini === dia).length + 9; /* +9 mensalistas fixos */
  const vagasCreche = (dia) => db().config.crecheVagas - ocupacaoCreche(dia);
  const minutos = (h) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
  const hora = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  function horariosBanho(dia, profId, dur, ignorar) {
    const S = SERVICOS.banho, out = [];
    const ocup = ativos(db().agend).filter((a) => a.tipo === "banho" && a.ini === dia && a.prof === profId && a.id !== ignorar)
      .map((a) => { const o = S.opcoes.find((x) => x.id === a.opcao) || S.opcoes[0]; return [minutos(a.hora), minutos(a.hora) + o.dur]; });
    const agora = new Date(), minAgora = dia === hoje() ? agora.getHours() * 60 + agora.getMinutes() + 30 : 0;
    for (let m = minutos(S.inicio); m + dur <= minutos(S.fim); m += S.passo) {
      const livre = !ocup.some(([a, b]) => m < b && m + dur > a) && m >= minAgora && !(m < 13 * 60 && m + dur > 12 * 60);
      out.push({ hora: hora(m), livre });
    }
    return out;
  }
  const abertoNoDia = (dia, tipo) => { const w = dataObj(dia).getDay(); if (tipo === "hotel") return true; if (w === 0) return db().config.abreDomingo; return true; };

  /* ---------- formatação ---------- */
  const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"], MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const fmtData = (s, comSemana = true) => { const d = dataObj(s); return `${comSemana ? DIAS[d.getDay()] + ", " : ""}${d.getDate()} ${MESES[d.getMonth()]}`; };
  const fmtCurta = (s) => { const d = dataObj(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const rel = (s) => { const n = difDias(hoje(), s); return n === 0 ? "hoje" : n === 1 ? "amanhã" : n === -1 ? "ontem" : n > 1 ? `em ${n} dias` : `há ${-n} dias`; };
  const idade = (nasc) => { const a = difDias(nasc, hoje()) / 365.25; return a < 1 ? `${Math.max(1, Math.round(a * 12))} meses` : `${Math.floor(a)} ${Math.floor(a) === 1 ? "ano" : "anos"}`; };
  const desde = (isoStr) => { const m = Math.round((Date.now() - new Date(isoStr)) / 60e3); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`; };
  const statusVacina = (d) => { const n = difDias(hoje(), d); return n < 0 ? { k: "vencida", t: "Vencida", c: "#c0392b" } : n <= 30 ? { k: "vence", t: `Vence em ${n} d`, c: "#b7791f" } : { k: "ok", t: "Em dia", c: "#2f7d4f" }; };

  window.BF = { db, salvar, resetar, uid, u, hoje, addDias, dataObj, difDias, SERVICOS, PROFISSIONAIS, STATUS, STATUS_PEDIDO, calcularValor, ocupacaoHotel, vagasHotel, ocupacaoCreche, vagasCreche, horariosBanho, abertoNoDia, minutos, hora, brl, fmtData, fmtCurta, rel, idade, desde, statusVacina, DIAS, MESES };
})();
