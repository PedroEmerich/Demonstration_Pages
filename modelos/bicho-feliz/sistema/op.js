/*
  Bicho Feliz · Sistema de agendamento — área da equipe (operador)
*/
(() => {
  const A = window.BFApp;
  const { ROTAS, $, $$, esc, ico, toast, modal, fecharModal, cabModal, confirmar, statusTag, petDe, userDe, petImg, iniciais, icServ, descAgend, cardAgend, ligaAgend, detalheAgend, assistente, formPet, postHTML, prodImg, render, ir } = A;
  const { db, salvar, SERVICOS, PROFISSIONAIS, brl, fmtData, fmtCurta, hoje, addDias, difDias, u } = BF;
  const R = ROTAS.operador;
  const ativo = (a) => a.status !== "cancelado";

  /* linha do tempo do banho & tosa (um dia) */
  function timeline(dia) {
    const S = SERVICOS.banho, ini = BF.minutos(S.inicio), fim = BF.minutos(S.fim), span = fim - ini;
    const ag = db().agend.filter((a) => a.tipo === "banho" && a.ini === dia && ativo(a));
    const agora = new Date(), mAgora = agora.getHours() * 60 + agora.getMinutes();
    const marcas = []; for (let m = ini; m <= fim; m += 60) marcas.push(m);
    return `<div class="tl"><div class="tl__g">
      <div class="tl__hs"><span></span><div class="tl__escala">${marcas.map((m) => `<span style="left:${(m - ini) / span * 100}%">${BF.hora(m)}</span>`).join("")}</div></div>
      ${PROFISSIONAIS.map((pf) => `<div class="tl__lin"><div class="tl__prof"><img class="av av--sm" src="${u(pf.foto, 80)}" alt="" /><div><b>${pf.nome.split(" ")[0]}</b><small>${pf.papel}</small></div></div>
        <div class="tl__trilho">${dia === hoje() && mAgora > ini && mAgora < fim ? `<span class="tl__agora" style="left:${(mAgora - ini) / span * 100}%"></span>` : ""}
          ${ag.filter((a) => a.prof === pf.id).map((a) => { const o = S.opcoes.find((x) => x.id === a.opcao) || S.opcoes[0], m = BF.minutos(a.hora), p = petDe(a.petId); return `<div class="tl__bloco ${a.status}" data-ag="${a.id}" style="left:${(m - ini) / span * 100}%;width:${o.dur / span * 100}%;background:${a.status === "pendente" ? "#b7791f" : pf.cor}" title="${esc(p.nome)} · ${a.hora} · ${o.nome}">${petImg(p, "")}<span><b>${esc(p.nome)}</b>${a.hora} · ${o.nome.replace("Banho + ", "+ ")}</span></div>`; }).join("")}
        </div></div>`).join("")}
    </div></div>`;
  }

  /* ---------- painel do dia ---------- */
  R.painel = {
    titulo: "Painel do dia",
    sub: () => `${fmtData(hoje())} · Bicho Feliz Cotia`,
    render(v) {
      const D = db(), H = hoje();
      const noHotel = D.agend.filter((a) => a.tipo === "hotel" && ativo(a) && a.status !== "pendente" && a.ini <= H && a.fim > H);
      const chegadas = D.agend.filter((a) => a.tipo === "hotel" && a.ini === H && ["confirmado", "andamento"].includes(a.status));
      const saidas = D.agend.filter((a) => a.tipo === "hotel" && a.fim === H && ["andamento", "concluido"].includes(a.status));
      const creche = D.agend.filter((a) => a.tipo === "creche" && a.ini === H && ativo(a));
      const banhos = D.agend.filter((a) => a.tipo === "banho" && a.ini === H && ativo(a));
      const pend = D.agend.filter((a) => a.status === "pendente").sort((a, b) => a.ini.localeCompare(b.ini));
      const fat = D.agend.filter((a) => ativo(a) && a.ini === H).reduce((t, a) => t + a.valor, 0) + D.pedidos.filter((p) => p.criado === H && p.status !== "cancelado").reduce((t, p) => t + p.total, 0);
      const ocupH = BF.ocupacaoHotel(H), ocupC = BF.ocupacaoCreche(H);
      const alertas = [];
      D.agend.filter((a) => ativo(a) && a.status !== "concluido" && a.tipo !== "banho" && a.ini <= addDias(H, 3) && (a.tipo === "hotel" ? a.fim >= H : a.ini >= H)).forEach((a) => { const p = petDe(a.petId); if (BF.statusVacina(p.v10).k === "vencida" || BF.statusVacina(p.raiva).k === "vencida") alertas.push(["vacina", `${p.nome}: vacina vencida`, `${SERVICOS[a.tipo].nome} ${BF.rel(a.ini)} · pedir carteirinha`]); });
      D.produtos.filter((p) => p.estoque <= 5).forEach((p) => alertas.push(["caixa", `Estoque baixo: ${p.nome}`, `${p.estoque} unidade(s)`]));
      D.pedidos.filter((p) => p.status === "novo").forEach((p) => alertas.push(["loja", `Pedido novo de ${userDe(p.donoId).nome}`, `${brl(p.total)} · separar para ${{ retirada: "retirada", checkout: "check-out", entrega: "entrega" }[p.entrega]}`]));
      const linhaHotel = (a, tipo) => { const p = petDe(a.petId); return `<div class="linha">${petImg(p)}<div class="linha__t"><b>${esc(p.nome)} <small style="display:inline;color:var(--muted);font-weight:500">${esc(userDe(a.donoId).nome)}</small></b><small>${tipo === "in" ? `até ${fmtData(a.fim)} · suíte ${a.suite || "—"}` : `entrou ${fmtData(a.ini)} · suíte ${a.suite || "—"}`}${a.extras.includes("taxi_ida_volta") ? " · táxi pet" : ""}</small></div><div class="linha__d">${tipo === "in" ? (a.status === "confirmado" ? `<button class="b b--sm" data-in="${a.id}">Check-in</button>` : statusTag(a.status)) : (a.status === "andamento" ? `<button class="b b--sm b--ok" data-out="${a.id}">Check-out</button>` : statusTag(a.status))}</div></div>`; };
      v.innerHTML = `
        <div class="kpis">
          <div class="kpi"><small>${ico("cama")}Hotel hoje</small><b>${ocupH}<span style="font-size:16px;color:var(--muted)">/${D.config.suites}</span></b><span>${chegadas.length} chegada(s) · ${saidas.length} saída(s)</span><div class="barra"><i style="width:${ocupH / D.config.suites * 100}%"></i></div></div>
          <div class="kpi"><small>${ico("sol")}Creche hoje</small><b>${ocupC}<span style="font-size:16px;color:var(--muted)">/${D.config.crecheVagas}</span></b><span>9 mensalistas + ${creche.length} agendados</span><div class="barra"><i style="width:${ocupC / D.config.crecheVagas * 100}%"></i></div></div>
          <div class="kpi"><small>${ico("gota")}Banho &amp; tosa</small><b>${banhos.length}</b><span>${banhos.filter((a) => a.status === "concluido").length} concluído(s) · ${banhos.filter((a) => a.status === "andamento").length} em andamento</span></div>
          <div class="kpi"><small>${ico("alerta")}Para confirmar</small><b style="color:${pend.length ? "var(--orange2)" : "inherit"}">${pend.length}</b><span>pedidos de agendamento</span></div>
          <div class="kpi"><small>${ico("grafico")}Movimento do dia</small><b style="font-size:24px">${brl(fat)}</b><span>serviços + loja</span></div>
        </div>
        <div class="cols">
          <div class="pilha">
            <div class="card"><div class="card__h"><h3>Banho &amp; tosa · hoje</h3><a href="#/banho">Abrir agenda</a></div>${timeline(H)}</div>
            <div class="cols3" style="grid-template-columns:1fr 1fr">
              <div class="card"><div class="card__h"><h3>Chegadas no hotel</h3><span class="tag">${chegadas.length}</span></div>${chegadas.map((a) => linhaHotel(a, "in")).join("") || `<p class="muted" style="font-size:14px">Nenhuma chegada hoje.</p>`}</div>
              <div class="card"><div class="card__h"><h3>Saídas do hotel</h3><span class="tag">${saidas.length}</span></div>${saidas.map((a) => linhaHotel(a, "out")).join("") || `<p class="muted" style="font-size:14px">Nenhuma saída hoje.</p>`}</div>
            </div>
            <div class="card"><div class="card__h"><h3>Creche · lista de presença</h3><span class="tag">${creche.length} agendados</span></div>${creche.map((a) => { const p = petDe(a.petId); return `<div class="linha">${petImg(p)}<div class="linha__t"><b>${esc(p.nome)} <small style="display:inline;color:var(--muted);font-weight:500">${esc(p.raca)} · ${esc(p.temperamento)}</small></b><small>${SERVICOS.creche.periodos[a.periodo].nome}${a.extras.length ? " · " + a.extras.map((e) => A.nomeExtra("creche", e)).join(", ") : ""}</small></div><div class="linha__d">${a.status === "confirmado" ? `<button class="b b--sm" data-in="${a.id}">Chegou</button>` : a.status === "andamento" ? `<button class="b b--sm b--ok" data-out="${a.id}">Saiu</button>` : statusTag(a.status)}</div></div>`; }).join("") || `<p class="muted" style="font-size:14px">Sem agendamentos avulsos hoje.</p>`}</div>
          </div>
          <div class="pilha">
            <div class="card"><div class="card__h"><h3>Aguardando confirmação</h3><span class="tag" style="background:#fff3d6;color:#b7791f">${pend.length}</span></div>${pend.map((a) => { const p = petDe(a.petId); return `<div class="linha">${petImg(p)}<div class="linha__t"><b>${SERVICOS[a.tipo].nome} · ${esc(p.nome)}</b><small>${descAgend(a)}</small></div><div class="linha__d"><button class="ib" data-rec="${a.id}" title="Recusar" aria-label="Recusar" style="color:var(--red)">${ico("x")}</button><button class="b b--sm b--ok" data-conf="${a.id}">${ico("check")}Confirmar</button></div></div>`; }).join("") || `<div class="vazio" style="padding:16px">${ico("check")}<b>Tudo confirmado</b></div>`}</div>
            <div class="card alertas"><div class="card__h"><h3>Alertas</h3></div>${alertas.map(([i, t, s]) => `<div class="linha">${ico(i)}<div class="linha__t"><b>${esc(t)}</b><small>${esc(s)}</small></div></div>`).join("") || '<p class="muted" style="font-size:14px">Sem alertas.</p>'}</div>
            <div class="card"><div class="card__h"><h3>No hotel agora</h3><a href="#/hotel">Ocupação</a></div>${noHotel.map((a) => { const p = petDe(a.petId); return `<div class="linha">${petImg(p, "av av--sm")}<div class="linha__t"><b>${esc(p.nome)} · suíte ${a.suite || "—"}</b><small>${esc(p.alimentacao)}${p.obs ? " · " + esc(p.obs) : ""}</small></div><a class="ib" href="#/fotos-op?pet=${p.id}" title="Enviar foto" aria-label="Enviar foto de ${esc(p.nome)}">${ico("foto")}</a></div>`; }).join("") || '<p class="muted" style="font-size:14px">Nenhum hóspede.</p>'}</div>
          </div>
        </div>`;
      ligaAgend(v);
      const muda = (id, st, msg) => { const a = db().agend.find((x) => x.id === id); a.status = st; if (st === "concluido") a.pago = true; if (st === "confirmado" && a.tipo === "hotel" && !a.suite) a.suite = A.suiteLivre(a); salvar(); toast(msg(petDe(a.petId).nome, a)); render(); };
      $$("[data-in]", v).forEach((b) => b.onclick = () => muda(b.dataset.in, "andamento", (n) => `Entrada de ${n} registrada`));
      $$("[data-out]", v).forEach((b) => b.onclick = () => muda(b.dataset.out, "concluido", (n) => `Saída de ${n} registrada`));
      $$("[data-conf]", v).forEach((b) => b.onclick = () => muda(b.dataset.conf, "confirmado", (n, a) => `Confirmado para ${n}${a.suite && a.tipo === "hotel" ? ` · suíte ${a.suite}` : ""}`));
      $$("[data-rec]", v).forEach((b) => b.onclick = async () => { const a = db().agend.find((x) => x.id === b.dataset.rec); if (await confirmar("Recusar pedido?", `${SERVICOS[a.tipo].nome} de ${petDe(a.petId).nome} · ${descAgend(a)}.`, "Recusar", true)) { a.status = "cancelado"; salvar(); toast("Pedido recusado"); render(); } });
    },
  };

  /* ---------- agenda semanal ---------- */
  R.agenda = {
    titulo: "Agenda",
    render(v, params) {
      const D = db(), base = params.de || hoje(), w = BF.dataObj(base).getDay(), seg = addDias(base, -((w + 6) % 7));
      const filtro = params.f || "todos";
      const dias = [...Array(7)].map((_, i) => addDias(seg, i));
      const doDia = (d) => D.agend.filter((a) => ativo(a) && (filtro === "todos" || a.tipo === filtro) && (a.tipo === "hotel" ? a.ini === d || a.fim === d : a.ini === d)).sort((a, b) => (a.hora || "00").localeCompare(b.hora || "00"));
      v.innerHTML = `<div class="barra-ferr"><div class="abas" style="margin:0">${[["todos", "Todos"], ["hotel", "Hotel"], ["creche", "Creche"], ["banho", "Banho & tosa"]].map(([k, n]) => `<button class="${k === filtro ? "on" : ""}" data-f="${k}">${n}</button>`).join("")}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-left:auto"><button class="ib" data-sem="-7" aria-label="Semana anterior">${ico("voltar")}</button><button class="b b--ghost b--sm" data-sem="0">Hoje</button><button class="ib" data-sem="7" aria-label="Próxima semana">${ico("seta")}</button><b style="font-family:var(--display);margin-left:6px">${fmtData(seg, false)} – ${fmtData(addDias(seg, 6), false)}</b></div></div>
        <div class="semana">${dias.map((d) => { const l = doDia(d), dObj = BF.dataObj(d); return `<div class="semana__d ${d === hoje() ? "hoje" : ""}"><h4>${BF.DIAS[dObj.getDay()]} ${dObj.getDate()}<small>${l.length} item(ns)</small></h4>
          ${l.map((a) => { const p = petDe(a.petId), S = SERVICOS[a.tipo]; const lbl = a.tipo === "hotel" ? (a.ini === d ? "Check-in" : "Check-out") : a.tipo === "banho" ? a.hora : S.periodos[a.periodo].nome.split(" ")[0]; return `<div class="mini-ag" data-ag="${a.id}" style="border-color:${S.cor}">${petImg(p, "")}<div><b>${esc(p.nome)}</b><small>${lbl} · ${S.nome.split(" ")[0]}${a.status === "pendente" ? " · ⏳" : ""}</small></div></div>`; }).join("") || '<p class="muted" style="font-size:12.5px;padding:6px">Livre</p>'}
          <div class="muted" style="font-size:11.5px;margin-top:8px;border-top:1px dashed var(--line);padding-top:6px">${ico("cama", "i")} ${BF.ocupacaoHotel(d)}/${D.config.suites} suítes · ${ico("sol", "i")} ${BF.ocupacaoCreche(d)}/${D.config.crecheVagas}</div></div>`; }).join("")}</div>`;
      $$(".semana__d .muted svg", v).forEach((s) => { s.style.width = "13px"; s.style.height = "13px"; s.style.verticalAlign = "-2px"; });
      $$("[data-f]", v).forEach((b) => b.onclick = () => ir(`agenda?f=${b.dataset.f}&de=${base}`));
      $$("[data-sem]", v).forEach((b) => b.onclick = () => ir(`agenda?f=${filtro}&de=${+b.dataset.sem ? addDias(base, +b.dataset.sem) : hoje()}`));
      ligaAgend(v);
    },
  };

  /* ---------- hotel: mapa de ocupação ---------- */
  R.hotel = {
    titulo: "Hotel · ocupação",
    sub: () => "Próximos 14 dias por suíte",
    render(v, params) {
      const D = db(), ini = params.de || addDias(hoje(), -1), dias = [...Array(14)].map((_, i) => addDias(ini, i));
      const hs = D.agend.filter((a) => a.tipo === "hotel" && ativo(a));
      const semSuite = hs.filter((a) => !a.suite && a.fim > ini);
      const cores = ["#e26a2c", "#3d7be0", "#2f7d4f", "#9b59b6", "#c4521b", "#16a085", "#d35400", "#2c3e50"];
      let linhas = "";
      for (let s = 1; s <= D.config.suites; s++) {
        let cel = "", i = 0;
        while (i < dias.length) {
          const d = dias[i], a = hs.find((x) => x.suite === s && x.ini <= d && x.fim > d);
          if (a) { let n = 1; while (i + n < dias.length && a.fim > dias[i + n]) n++; const p = petDe(a.petId); cel += `<td class="ocp" colspan="${n}" data-ag="${a.id}" style="background:${a.status === "pendente" ? "#b7791f" : cores[s % cores.length]}${a.status === "concluido" ? ";opacity:.5" : ""}" title="${esc(p.nome)} · ${fmtCurta(a.ini)} a ${fmtCurta(a.fim)}">${esc(p.nome)}${a.status === "andamento" ? " ●" : ""}</td>`; i += n; }
          else { cel += "<td></td>"; i++; }
        }
        linhas += `<tr><td class="q">Suíte ${s}</td>${cel}</tr>`;
      }
      v.innerHTML = `<div class="barra-ferr"><div style="display:flex;gap:6px;align-items:center"><button class="ib" data-d="-7" aria-label="Voltar uma semana">${ico("voltar")}</button><button class="b b--ghost b--sm" data-d="0">Hoje</button><button class="ib" data-d="7" aria-label="Avançar uma semana">${ico("seta")}</button></div><span class="muted" style="font-size:13px">Clique numa reserva para ver detalhes. ● hóspede presente · amarelo: aguardando confirmação</span><a class="b b--sm" href="#/novo?tipo=hotel" style="margin-left:auto">${ico("mais")}Nova hospedagem</a></div>
        <div class="card ocup"><table><thead><tr><th></th>${dias.map((d) => { const o = BF.dataObj(d); return `<th class="${d === hoje() ? "hoje" : ""}">${BF.DIAS[o.getDay()]}<br />${o.getDate()}<br /><span style="font-weight:600;color:${D.config.suites - BF.ocupacaoHotel(d) <= 2 ? "var(--red)" : "var(--green)"}">${D.config.suites - BF.ocupacaoHotel(d)} livres</span></th>`; }).join("")}</tr></thead><tbody>${linhas}</tbody></table></div>
        ${semSuite.length ? `<div class="card" style="margin-top:18px"><div class="card__h"><h3>Reservas sem suíte definida</h3><span class="tag">${semSuite.length}</span></div>${semSuite.map((a) => cardAgend(a, { dono: true })).join("")}</div>` : ""}`;
      $$("[data-d]", v).forEach((b) => b.onclick = () => ir(`hotel?de=${+b.dataset.d ? addDias(ini, +b.dataset.d) : addDias(hoje(), -1)}`));
      ligaAgend(v);
    },
  };

  /* ---------- banho & tosa ---------- */
  R.banho = {
    titulo: "Banho & tosa",
    render(v, params) {
      const dia = params.dia || hoje(), D = db();
      const lista = D.agend.filter((a) => a.tipo === "banho" && a.ini === dia && ativo(a)).sort((a, b) => a.hora.localeCompare(b.hora));
      v.innerHTML = `<div class="barra-ferr"><div class="chips">${[...Array(7)].map((_, i) => { const d = addDias(hoje(), i - 1), o = BF.dataObj(d); return `<button class="chip ${d === dia ? "on" : ""}" data-dia="${d}">${i === 1 ? "Hoje" : BF.DIAS[o.getDay()] + " " + o.getDate()}</button>`; }).join("")}</div><a class="b b--sm" href="#/novo?tipo=banho" style="margin-left:auto">${ico("mais")}Encaixar horário</a></div>
        <div class="card" style="margin-bottom:18px"><div class="card__h"><h3>${fmtData(dia)}</h3><span class="tag">${lista.length} atendimento(s)</span></div>${timeline(dia)}</div>
        <div class="card"><div class="card__h"><h3>Fila do dia</h3></div>${lista.map((a) => cardAgend(a, { dono: true })).join("") || '<p class="muted">Nenhum atendimento nesse dia.</p>'}</div>`;
      $$("[data-dia]", v).forEach((b) => b.onclick = () => ir("banho?dia=" + b.dataset.dia));
      ligaAgend(v);
    },
  };

  /* ---------- clientes e pets ---------- */
  function fichaCliente(id) {
    const D = db(), c = userDe(id), pets = D.pets.filter((p) => p.donoId === id), ag = D.agend.filter((a) => a.donoId === id).sort((a, b) => b.ini.localeCompare(a.ini));
    const gasto = ag.filter((a) => a.status === "concluido").reduce((t, a) => t + a.valor, 0) + D.pedidos.filter((p) => p.donoId === id && p.status === "entregue").reduce((t, p) => t + p.total, 0);
    const el = modal(`${cabModal(esc(c.nome), `${esc(c.email)} · ${esc(c.tel)}`)}
      <div class="grid3" style="margin-bottom:16px"><div class="kpi" style="padding:12px"><small>Pets</small><b style="font-size:22px">${pets.length}</b></div><div class="kpi" style="padding:12px"><small>Agendamentos</small><b style="font-size:22px">${ag.length}</b></div><div class="kpi" style="padding:12px"><small>Total gasto</small><b style="font-size:20px">${brl(gasto)}</b></div></div>
      <p class="muted" style="font-size:13.5px;margin-bottom:10px">${ico("casa")} ${esc(c.endereco || "Endereço não informado")}</p>
      <h4 style="margin:10px 0 6px">Pets</h4>${pets.map((p) => { const v10 = BF.statusVacina(p.v10); return `<div class="linha">${petImg(p)}<div class="linha__t"><b>${esc(p.nome)} · ${esc(p.raca)}</b><small>${BF.idade(p.nasc)} · porte ${p.porte} · ${esc(p.temperamento)}${p.obs ? " · " + esc(p.obs) : ""}</small></div><div class="linha__d"><span class="st" style="color:${v10.c};background:${v10.c}18">V10 ${v10.t.toLowerCase()}</span><button class="ib" data-ep="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></div></div>`; }).join("")}
      <button class="b b--ghost b--sm" id="fcNovoPet" style="margin-top:8px">${ico("mais")}Adicionar pet</button>
      <h4 style="margin:18px 0 6px">Histórico</h4><div id="fcHist">${ag.slice(0, 6).map((a) => cardAgend(a)).join("") || '<p class="muted">Sem agendamentos.</p>'}</div>
      <div class="modal__f"><a class="b b--ghost" target="_blank" rel="noopener" href="https://wa.me/55${c.tel.replace(/\D/g, "")}">${ico("whats")}WhatsApp</a><a class="b" href="#/novo?cliente=${c.id}" data-fecha>${ico("cal")}Novo agendamento</a></div>`, { grande: true });
    $$("[data-ep]", el).forEach((b) => b.onclick = () => formPet(petDe(b.dataset.ep), id, () => fichaCliente(id)));
    $("#fcNovoPet", el).onclick = () => formPet(null, id, () => fichaCliente(id));
    $$("[data-ag]", el).forEach((x) => x.onclick = () => detalheAgend(x.dataset.ag));
  }
  R.clientes = {
    titulo: "Clientes e pets",
    render(v) {
      const D = db();
      let busca = "";
      v.innerHTML = `<div class="barra-ferr"><div class="busca">${ico("busca")}<input class="in" id="cBusca" placeholder="Buscar por tutor, pet ou telefone" /></div><button class="b b--sm" id="cNovo" style="margin-left:auto">${ico("mais")}Novo cliente</button></div><div class="card tabwrap"><table class="tab"><thead><tr><th>Tutor</th><th>Pets</th><th>Contato</th><th>Próximo agendamento</th><th>Desde</th></tr></thead><tbody id="cTab"></tbody></table></div>`;
      const desenha = () => {
        const cl = D.users.filter((x) => x.papel === "cliente").filter((c) => { if (!busca) return true; const pets = D.pets.filter((p) => p.donoId === c.id).map((p) => p.nome).join(" "); return (c.nome + " " + c.tel + " " + c.email + " " + pets).toLowerCase().includes(busca); });
        $("#cTab", v).innerHTML = cl.map((c) => { const pets = D.pets.filter((p) => p.donoId === c.id), prox = D.agend.filter((a) => a.donoId === c.id && ativo(a) && a.status !== "concluido" && a.ini >= hoje()).sort((a, b) => a.ini.localeCompare(b.ini))[0]; return `<tr data-cl="${c.id}" style="cursor:pointer"><td><div style="display:flex;gap:10px;align-items:center"><span class="av av--txt av--sm">${iniciais(c.nome)}</span><b>${esc(c.nome)}</b></div></td><td><div style="display:flex;gap:4px;align-items:center">${pets.map((p) => `<span title="${esc(p.nome)}">${petImg(p, "av av--sm")}</span>`).join("")}<span class="muted" style="font-size:12.5px;margin-left:4px">${pets.map((p) => esc(p.nome)).join(", ")}</span></div></td><td><span class="muted">${esc(c.tel)}</span></td><td>${prox ? `<span class="muted">${SERVICOS[prox.tipo].nome} · ${fmtCurta(prox.ini)}</span>` : "—"}</td><td class="muted">${c.desde ? fmtCurta(c.desde) + "/" + c.desde.slice(2, 4) : "—"}</td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Nenhum cliente encontrado.</td></tr>`;
        $$("[data-cl]", v).forEach((t) => t.onclick = () => fichaCliente(t.dataset.cl));
      };
      $("#cBusca", v).oninput = (e) => { busca = e.target.value.trim().toLowerCase(); desenha(); };
      $("#cNovo", v).onclick = () => {
        const c = modal(`${cabModal("Novo cliente", "A senha inicial é 123456 — o tutor pode trocar no primeiro acesso.")}<form id="fNC" class="pilha" style="gap:12px"><label class="f"><span>Nome</span><input class="in" id="ncN" required /></label><div class="grid2"><label class="f"><span>WhatsApp</span><input class="in" id="ncT" inputmode="tel" /></label><label class="f"><span>E-mail</span><input class="in" id="ncE" type="email" /></label></div><label class="f"><span>Endereço</span><input class="in" id="ncEnd" /></label><p class="erro" id="ncErro"></p><div class="modal__f" style="margin-top:0"><button type="button" class="b b--ghost" data-fecha>Cancelar</button><button class="b">Cadastrar e adicionar pet</button></div></form>`);
        $("#fNC", c).onsubmit = (e) => {
          e.preventDefault(); const n = $("#ncN", c).value.trim(), em = $("#ncE", c).value.trim().toLowerCase() || n.toLowerCase().replace(/\s+/g, ".") + "@cliente.bf";
          if (!n) { $("#ncErro", c).textContent = "Informe o nome."; return; }
          if (D.users.some((x) => x.email === em)) { $("#ncErro", c).textContent = "Já existe cliente com esse e-mail."; return; }
          const us = { id: BF.uid("u_"), nome: n, email: em, senha: "123456", papel: "cliente", tel: $("#ncT", c).value.trim() || "—", endereco: $("#ncEnd", c).value.trim(), desde: hoje() };
          D.users.push(us); salvar(); fecharModal(); toast(`${n} cadastrado`); formPet(null, us.id, () => { render(); fichaCliente(us.id); });
        };
      };
      desenha();
    },
  };

  /* ---------- loja: pedidos e estoque ---------- */
  R.pedidos = {
    titulo: "Loja e estoque",
    render(v, params) {
      const D = db(), aba = params.aba || "pedidos";
      if (aba === "pedidos") {
        const ped = [...D.pedidos].sort((a, b) => (a.status === "novo" ? -1 : 0) - (b.status === "novo" ? -1 : 0) || b.criado.localeCompare(a.criado));
        v.innerHTML = `<div class="abas"><button class="on">Pedidos</button><button data-ab="produtos">Produtos e estoque</button></div>
          <div class="card tabwrap"><table class="tab"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Recebimento</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${ped.map((p) => `<tr><td><b>${A.codigo(p.id)}</b><br /><small class="muted">${fmtCurta(p.criado)}</small></td><td>${esc(userDe(p.donoId).nome)}</td><td style="max-width:260px"><small>${p.itens.map((it) => `${it.qtd}× ${esc((D.produtos.find((x) => x.id === it.prodId) || {}).nome || "")}`).join("<br />")}</small></td><td><small>${{ retirada: "Retirada", checkout: "No check-out", entrega: "Entrega" }[p.entrega]}<br /><span class="muted">${{ pix: "Pix", cartao: "Cartão", unidade: "Na retirada" }[p.pagamento]}</span></small></td><td><b>${brl(p.total)}</b></td><td>${statusTag(p.status, BF.STATUS_PEDIDO)}</td><td style="white-space:nowrap">${p.status === "novo" ? `<button class="b b--xs" data-ps="${p.id}:separado">Separar</button> ` : ""}${p.status === "separado" ? `<button class="b b--xs b--ok" data-ps="${p.id}:entregue">Entregue</button> ` : ""}${["novo", "separado"].includes(p.status) ? `<button class="b b--xs b--perigo" data-ps="${p.id}:cancelado">Cancelar</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
        $("[data-ab]", v).onclick = () => ir("pedidos?aba=produtos");
        $$("[data-ps]", v).forEach((b) => b.onclick = () => { const [id, st] = b.dataset.ps.split(":"), p = D.pedidos.find((x) => x.id === id); if (st === "cancelado") p.itens.forEach((it) => { const pr = D.produtos.find((x) => x.id === it.prodId); if (pr) pr.estoque += it.qtd; }); p.status = st; salvar(); toast(`Pedido ${BF.STATUS_PEDIDO[st].nome.toLowerCase()}`); render(); });
        return;
      }
      v.innerHTML = `<div class="barra-ferr"><div class="abas" style="margin:0"><button data-ab="pedidos">Pedidos</button><button class="on">Produtos e estoque</button></div><button class="b b--sm" id="prNovo" style="margin-left:auto">${ico("mais")}Novo produto</button></div>
        <div class="card tabwrap"><table class="tab"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th></th></tr></thead><tbody>${D.produtos.map((p) => `<tr><td><div style="display:flex;gap:10px;align-items:center"><span class="av" style="overflow:hidden">${prodImg(p)}</span><b>${esc(p.nome)}</b></div></td><td><span class="tag">${esc(p.cat)}</span></td><td><input class="in" data-preco="${p.id}" value="${p.preco.toFixed(2).replace(".", ",")}" inputmode="decimal" aria-label="Preço de ${esc(p.nome)}" /></td><td><div style="display:flex;gap:6px;align-items:center"><input class="in" data-est="${p.id}" value="${p.estoque}" inputmode="numeric" style="max-width:70px" aria-label="Estoque de ${esc(p.nome)}" />${p.estoque <= 5 ? `<span class="st" style="color:#b7791f;background:#fff3d6">baixo</span>` : ""}</div></td><td><button class="ib" data-del="${p.id}" aria-label="Excluir ${esc(p.nome)}">${ico("lixo")}</button></td></tr>`).join("")}</tbody></table></div><p class="muted" style="font-size:12.5px;margin-top:10px">As alterações de preço e estoque são salvas ao sair do campo e já aparecem na loja do cliente.</p>`;
      $("[data-ab]", v).onclick = () => ir("pedidos");
      $$("[data-preco]", v).forEach((i) => i.onchange = () => { const p = D.produtos.find((x) => x.id === i.dataset.preco), n = parseFloat(i.value.replace(",", ".")); if (n > 0) { p.preco = n; salvar(); toast("Preço atualizado"); } });
      $$("[data-est]", v).forEach((i) => i.onchange = () => { const p = D.produtos.find((x) => x.id === i.dataset.est), n = parseInt(i.value, 10); if (n >= 0) { p.estoque = n; salvar(); toast("Estoque atualizado"); render(); } });
      $$("[data-del]", v).forEach((b) => b.onclick = async () => { const p = D.produtos.find((x) => x.id === b.dataset.del); if (await confirmar("Excluir produto?", esc(p.nome), "Excluir", true)) { D.produtos = D.produtos.filter((x) => x !== p); salvar(); render(); } });
      $("#prNovo", v).onclick = () => {
        const fotos = ["1589924691995-400dc9ecc119", "1568640347023-a616a30bc3bd", "1535294435445-d7249524ef2e", "1591946614720-90a587da4a36", "1600369671236-e74521d4b6ad", "1583511655857-d19b40a7a54e"]; let foto = fotos[0];
        const c = modal(`${cabModal("Novo produto")}<form id="fNP" class="pilha" style="gap:12px"><label class="f"><span>Nome</span><input class="in" id="npN" required /></label><div class="grid3"><label class="f"><span>Categoria</span><select class="in" id="npC">${[...new Set(D.produtos.map((p) => p.cat))].map((x) => `<option>${x}</option>`).join("")}</select></label><label class="f"><span>Preço (R$)</span><input class="in" id="npP" inputmode="decimal" /></label><label class="f"><span>Estoque</span><input class="in" id="npE" inputmode="numeric" value="10" /></label></div><label class="f"><span>Descrição</span><textarea class="in" id="npD"></textarea></label><div class="f"><span>Foto</span><div class="chips" id="npF">${fotos.map((f, i) => `<button type="button" data-f="${f}" style="border-radius:12px;padding:0;overflow:hidden;box-shadow:inset 0 0 0 3px ${i ? "transparent" : "var(--orange)"}"><img src="${u(f, 100)}" alt="" style="width:48px;height:48px;object-fit:cover" /></button>`).join("")}</div></div><p class="erro" id="npErro"></p><div class="modal__f" style="margin-top:0"><button type="button" class="b b--ghost" data-fecha>Cancelar</button><button class="b">Cadastrar</button></div></form>`);
        $$("#npF button", c).forEach((b) => b.onclick = () => { foto = b.dataset.f; $$("#npF button", c).forEach((x) => x.style.boxShadow = `inset 0 0 0 3px ${x === b ? "var(--orange)" : "transparent"}`); });
        $("#fNP", c).onsubmit = (e) => { e.preventDefault(); const n = $("#npN", c).value.trim(), pr = parseFloat($("#npP", c).value.replace(",", ".")); if (!n || !(pr > 0)) { $("#npErro", c).textContent = "Informe nome e preço."; return; } D.produtos.unshift({ id: BF.uid("pr"), nome: n, cat: $("#npC", c).value, preco: pr, estoque: parseInt($("#npE", c).value, 10) || 0, img: foto, desc: $("#npD", c).value.trim() || "Novidade na loja." }); salvar(); fecharModal(); toast("Produto cadastrado"); render(); };
      };
    },
  };

  /* ---------- enviar fotos do dia ---------- */
  R["fotos-op"] = {
    titulo: "Enviar fotos aos tutores",
    render(v, params) {
      const D = db(), H = hoje();
      const presentes = D.agend.filter((a) => ativo(a) && a.status !== "pendente" && ((a.tipo === "hotel" && a.ini <= H && a.fim >= H) || (a.tipo !== "hotel" && a.ini === H))).map((a) => a.petId);
      const pets = [...new Set(presentes)].map(petDe);
      let pet = params.pet && pets.find((p) => p.id === params.pet) ? params.pet : pets[0] && pets[0].id;
      const GAL = ["1560743641-3914f2c45636", "1548199973-03cce0bbc87b", "1561130627-94d7dd29776d", "1544568100-847a948585b9", "1587300003388-59208cc962cb", "1591946614720-90a587da4a36"];
      let foto = null;
      const desenha = () => {
        const p = petDe(pet), opcoes = p ? [p.foto, ...GAL] : GAL; if (!foto || !opcoes.includes(foto)) foto = opcoes[0];
        v.innerHTML = `<div class="cols"><div class="card"><div class="card__h"><h3>Nova atualização</h3></div>${pets.length ? `
          <div class="secao-wiz"><h4>Pet <small>presentes hoje</small></h4><div class="chips">${pets.map((x) => `<button class="chip ${x.id === pet ? "on" : ""}" data-p="${x.id}"><img src="${u(x.foto, 60)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover" />${esc(x.nome)}</button>`).join("")}</div></div>
          <div class="secao-wiz"><h4>Foto <small>na operação real, a câmera do celular abre aqui</small></h4><div class="chips">${opcoes.map((f) => `<button data-f="${f}" style="border-radius:14px;padding:0;overflow:hidden;box-shadow:inset 0 0 0 3px ${f === foto ? "var(--orange)" : "transparent"}"><img src="${u(f, 160)}" alt="" style="width:76px;height:76px;object-fit:cover" /></button>`).join("")}</div></div>
          <div class="secao-wiz"><h4>Recado</h4><div class="chips" style="margin-bottom:10px">${["Comeu tudo direitinho 🍽️", "Soneca depois do passeio 😴", "Brincou muito no gramado 🎾", "Tomou o remédio no horário 💊", "Banho tomado, cheirosinho ✨"].map((t) => `<button class="chip" data-t="${t}">${t}</button>`).join("")}</div><textarea class="in" id="foTxt" placeholder="Escreva como foi o momento…"></textarea></div>
          <button class="b" id="foEnviar">${ico("foto")}Enviar para ${esc(userDe(p.donoId).nome.split(" ")[0])}</button>` : `<div class="vazio">${ico("pata")}<b>Nenhum pet presente hoje</b>Faça o check-in no painel para enviar fotos.</div>`}</div>
          <div class="card"><div class="card__h"><h3>Enviadas recentemente</h3></div><div class="feed feed--mini">${D.fotos.slice().sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 4).map(postHTML).join("")}</div></div></div>`;
        $$("[data-p]", v).forEach((b) => b.onclick = () => { pet = b.dataset.p; foto = null; desenha(); });
        $$("[data-f]", v).forEach((b) => b.onclick = () => { foto = b.dataset.f; const t = $("#foTxt", v).value; desenha(); $("#foTxt", v).value = t; });
        $$("[data-t]", v).forEach((b) => b.onclick = () => { const t = $("#foTxt", v); t.value = (t.value ? t.value + " " : "") + b.dataset.t; });
        const env = $("#foEnviar", v); if (env) env.onclick = () => { const t = $("#foTxt", v).value.trim(); if (!t) { toast("Escreva um recado para o tutor", "alerta"); return; } D.fotos.push({ id: BF.uid("f"), petId: pet, texto: t, img: foto, quando: new Date().toISOString(), autor: A.eu.nome.split(" ")[0] }); salvar(); toast(`Enviado para o tutor de ${petDe(pet).nome}`); desenha(); };
      };
      desenha();
    },
  };

  /* ---------- configurações ---------- */
  R.config = {
    titulo: "Configurações",
    render(v) {
      const D = db();
      v.innerHTML = `<div class="cols"><div class="pilha"><div class="card"><div class="card__h"><h3>Capacidade</h3></div><form id="fCfg" class="pilha" style="gap:12px"><div class="grid2"><label class="f"><span>Suítes do hotel</span><input class="in" id="cfS" type="number" min="1" max="40" value="${D.config.suites}" /></label><label class="f"><span>Vagas na creche por dia</span><input class="in" id="cfC" type="number" min="5" max="80" value="${D.config.crecheVagas}" /></label></div><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="cfD" ${D.config.abreDomingo ? "checked" : ""} /> Creche e banho abrem aos domingos</label><div><button class="b">${ico("check")}Salvar</button></div></form></div>
        <div class="card"><div class="card__h"><h3>Tabela de preços</h3></div><table class="tab"><thead><tr><th>Serviço</th><th>P</th><th>M</th><th>G</th></tr></thead><tbody><tr><td>Diária do hotel</td>${["P", "M", "G"].map((k) => `<td>${brl(SERVICOS.hotel.diaria[k])}</td>`).join("")}</tr>${SERVICOS.banho.opcoes.map((o) => `<tr><td>${o.nome}</td>${["P", "M", "G"].map((k) => `<td>${brl(o.preco[k])}</td>`).join("")}</tr>`).join("")}<tr><td>Creche integral / meio</td><td colspan="3">${brl(SERVICOS.creche.periodos.integral.preco)} / ${brl(SERVICOS.creche.periodos.meio.preco)} · pacote 10 diárias ${brl(SERVICOS.creche.pacote.preco)}</td></tr></tbody></table></div></div>
        <div class="pilha"><div class="card"><div class="card__h"><h3>Equipe do banho &amp; tosa</h3></div>${PROFISSIONAIS.map((p) => `<div class="linha"><img class="av" src="${u(p.foto, 100)}" alt="" /><div class="linha__t"><b>${p.nome}</b><small>${p.papel} · ${SERVICOS.banho.inicio}–${SERVICOS.banho.fim}</small></div><span class="st" style="color:${p.cor};background:${p.cor}18">ativo</span></div>`).join("")}</div>
        <div class="card"><h3 style="font-size:17px">Dados de demonstração</h3><p class="muted" style="font-size:14px;margin:4px 0 12px">Tudo fica salvo só neste navegador. Restaure para voltar ao exemplo.</p><button class="b b--ghost b--sm" id="cfReset">Restaurar dados de exemplo</button></div></div></div>`;
      $("#fCfg", v).onsubmit = (e) => { e.preventDefault(); D.config.suites = Math.max(1, +$("#cfS", v).value || 16); D.config.crecheVagas = Math.max(5, +$("#cfC", v).value || 30); D.config.abreDomingo = $("#cfD", v).checked; salvar(); toast("Configurações salvas"); };
      $("#cfReset", v).onclick = A.resetDemo;
    },
  };

  /* ---------- novo agendamento pela recepção ---------- */
  R.novo = { titulo: "Novo agendamento", sub: () => "Agendamento feito pela recepção já entra confirmado", render: (v, p) => assistente(v, p, true) };
})();
