/*
  Bicho Feliz · Sistema de agendamento — núcleo e área do cliente
  Roteamento por hash (#/rota?param=valor). Cada papel (cliente/operador) tem seu menu e suas telas.
*/
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = (n, c = "i") => `<svg class="${c}"><use href="#i-${n}"/></svg>`;
  const { db, salvar, SERVICOS, STATUS, PROFISSIONAIS, brl, fmtData, fmtCurta, rel, hoje, addDias, difDias, dataObj, u } = BF;
  const app = $("#app"), modalEl = $("#modal"), toastsEl = $("#toasts");
  const WA = "5511999990000";

  /* ---------- utilidades de interface ---------- */
  function toast(msg, icone = "check") {
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = `${ico(icone)}<span>${esc(msg)}</span>`;
    toastsEl.appendChild(t); setTimeout(() => { t.style.transition = "opacity .3s, transform .3s"; t.style.opacity = 0; t.style.transform = "translateY(8px)"; setTimeout(() => t.remove(), 300); }, 2600);
  }
  function modal(html, { grande = false } = {}) {
    modalEl.innerHTML = `<div class="modal__c ${grande ? "modal__c--lg" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    modalEl.hidden = false; document.body.style.overflow = "hidden";
    const c = $(".modal__c", modalEl);
    $$("[data-fecha]", c).forEach((b) => b.addEventListener("click", fecharModal));
    setTimeout(() => { const f = $("input, select, textarea, button:not([data-fecha])", c); f && f.focus({ preventScroll: true }); }, 50);
    return c;
  }
  function fecharModal() { modalEl.hidden = true; modalEl.innerHTML = ""; document.body.style.overflow = ""; }
  modalEl.addEventListener("click", (e) => { if (e.target === modalEl) fecharModal(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!modalEl.hidden) fecharModal(); const g = $(".gaveta"); if (g) g.remove(); } });
  const cabModal = (titulo, sub = "") => `<div class="modal__h"><div><h3>${titulo}</h3>${sub ? `<p>${sub}</p>` : ""}</div><button class="ib" data-fecha aria-label="Fechar">${ico("x")}</button></div>`;
  function confirmar(titulo, texto, ok = "Confirmar", perigo = false) {
    return new Promise((res) => {
      const c = modal(`${cabModal(titulo)}<p class="muted">${texto}</p><div class="modal__f"><button class="b b--ghost" data-fecha>Voltar</button><button class="b ${perigo ? "b--perigo" : ""}" id="mOk">${ok}</button></div>`);
      $("#mOk", c).onclick = () => { fecharModal(); res(true); };
      $$("[data-fecha]", c).forEach((b) => b.addEventListener("click", () => res(false)));
    });
  }
  const codigo = (id) => "#" + id.replace(/^(pd|a)/, "").slice(-5).toUpperCase();
  const statusTag = (k, mapa = STATUS) => { const s = mapa[k] || mapa.pendente; return `<span class="st" style="color:${s.cor};background:${s.bg}">${s.nome}</span>`; };
  const petDe = (id) => db().pets.find((p) => p.id === id);
  const userDe = (id) => db().users.find((x) => x.id === id);
  const petImg = (p, cls = "av") => p ? `<img class="${cls}" src="${u(p.foto, 200)}" alt="${esc(p.nome)}" loading="lazy" />` : `<span class="${cls} av--txt">?</span>`;
  const iniciais = (n) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const icServ = (t) => ({ hotel: "casa", creche: "sol", banho: "gota" }[t]);
  function descAgend(a) {
    const S = SERVICOS[a.tipo];
    if (a.tipo === "hotel") { const n = difDias(a.ini, a.fim); return `${fmtData(a.ini)} → ${fmtData(a.fim)} · ${n} ${n === 1 ? "diária" : "diárias"}`; }
    if (a.tipo === "creche") return `${fmtData(a.ini)} · ${S.periodos[a.periodo || "integral"].nome}${a.pacote ? " · pacote" : ""}`;
    const o = S.opcoes.find((x) => x.id === a.opcao) || S.opcoes[0], p = PROFISSIONAIS.find((x) => x.id === a.prof);
    return `${fmtData(a.ini)} às ${a.hora} · ${o.nome}${p ? " com " + p.nome.split(" ")[0] : ""}`;
  }
  const nomeExtra = (tipo, id) => (SERVICOS[tipo].extras.find((e) => e.id === id) || {}).nome || id;

  /* ---------- sessão ---------- */
  const SESSAO = "bf_sessao";
  let eu = null;
  function carregarSessao() { try { const id = localStorage.getItem(SESSAO); eu = id ? userDe(id) || null : null; } catch (e) { eu = null; } }
  function entrar(user) { eu = user; try { localStorage.setItem(SESSAO, user.id); } catch (e) { /* sem armazenamento */ } location.hash = user.papel === "operador" ? "#/painel" : "#/inicio"; render(); }
  function sair() { eu = null; try { localStorage.removeItem(SESSAO); } catch (e) { /* */ } location.hash = "#/entrar"; render(); }

  /* ---------- rotas ---------- */
  const ROTAS = { cliente: {}, operador: {} };
  const MENUS = {
    cliente: [["inicio", "Início", "inicio"], ["agendar", "Agendar", "cal"], ["agendamentos", "Meus agendamentos", "relogio"], ["pets", "Meus pets", "pata"], ["fotos", "Fotos do dia", "foto"], ["loja", "Loja", "loja"], ["perfil", "Meu perfil", "user"]],
    operador: [["painel", "Painel do dia", "grafico"], ["agenda", "Agenda", "cal"], ["hotel", "Hotel · ocupação", "cama"], ["banho", "Banho & tosa", "gota"], ["clientes", "Clientes e pets", "users"], ["pedidos", "Loja e estoque", "caixa"], ["fotos-op", "Enviar fotos", "foto"], ["config", "Configurações", "config"]],
  };
  const BOTTOM = { cliente: [["inicio", "Início", "inicio"], ["agendar", "Agendar", "mais"], ["agendamentos", "Agenda", "cal"], ["pets", "Pets", "pata"], ["loja", "Loja", "loja"]], operador: [["painel", "Painel", "grafico"], ["agenda", "Agenda", "cal"], ["hotel", "Hotel", "cama"], ["clientes", "Clientes", "users"], ["pedidos", "Loja", "caixa"]] };
  function rotaAtual() {
    const h = location.hash.replace(/^#\/?/, ""), [p, q] = h.split("?");
    const params = Object.fromEntries(new URLSearchParams(q || ""));
    return { path: p || "", params };
  }
  const ir = (r) => { location.hash = "#/" + r; };

  function render() {
    carregarSessao();
    const { path, params } = rotaAtual();
    if (!eu) { telaLogin(path === "cadastro"); return; }
    const papel = eu.papel, rotas = ROTAS[papel];
    const alvo = rotas[path] ? path : MENUS[papel][0][0];
    if (alvo !== path) { history.replaceState(null, "", "#/" + alvo); }
    if (!$(".shell")) montarShell();
    const item = MENUS[papel].find((m) => m[0] === alvo) || [alvo, rotas[alvo].titulo || ""];
    $$(".sb nav a, .bn a").forEach((a) => a.classList.toggle("on", a.dataset.r === alvo || (alvo === "agendar" && a.dataset.r === "agendar")));
    $("#tbTitulo").textContent = rotas[alvo].titulo || item[1];
    $("#tbSub").textContent = rotas[alvo].sub ? rotas[alvo].sub() : fmtData(hoje()) + " · " + new Date().getFullYear();
    $(".shell").classList.remove("menu");
    const v = $("#view"); v.innerHTML = ""; v.style.animation = "none"; v.offsetWidth; v.style.animation = "";
    $$(".carrinho-fab").forEach((x) => x.remove());
    rotas[alvo].render(v, params);
    atualizaBadges();
    window.scrollTo({ top: 0 });
  }
  addEventListener("hashchange", render);

  function montarShell() {
    const papel = eu.papel;
    app.innerHTML = `
      <div class="shell">
        <aside class="sb" aria-label="Menu principal">
          <a class="logo" href="#/${MENUS[papel][0][0]}"><b>${ico("pata")}</b>bicho feliz</a>
          <span class="sb__papel">${papel === "operador" ? "Área da equipe" : "Área do cliente"}</span>
          <nav>${MENUS[papel].map(([r, n, i], k) => `${papel === "operador" && k === 5 ? '<span class="sep"></span>' : ""}${papel === "cliente" && k === 5 ? '<span class="sep"></span>' : ""}<a href="#/${r}" data-r="${r}">${ico(i)}<span>${n}</span><em hidden></em></a>`).join("")}</nav>
          <div class="sb__eu"><span class="av av--txt av--sm">${iniciais(eu.nome)}</span><div><b>${esc(eu.nome.split(" ")[0])}</b><small>${papel === "operador" ? esc(eu.cargo || "Equipe") : "Cliente desde " + (eu.desde ? new Date(eu.desde).getFullYear() : new Date().getFullYear())}</small></div><button class="ib" id="btSair" title="Sair" aria-label="Sair">${ico("sair")}</button></div>
        </aside>
        <div class="main">
          <header class="tb">
            <button class="ib tb__menu" id="btMenu" aria-label="Abrir menu">${ico("menu")}</button>
            <div><h1 id="tbTitulo"></h1><div class="tb__sub" id="tbSub"></div></div>
            <div class="tb__dir">
              <a class="ib" href="../index.html" title="Voltar ao site" aria-label="Voltar ao site">${ico("voltar")}</a>
              <button class="ib sino" id="btSino" aria-label="Avisos">${ico("sino")}<i hidden></i></button>
              ${papel === "cliente" ? `<a class="b b--sm" href="#/agendar">${ico("mais")}Agendar</a>` : `<a class="b b--sm" href="#/novo">${ico("mais")}Novo agendamento</a>`}
            </div>
          </header>
          <main class="view" id="view"></main>
        </div>
        <nav class="bn vidro" aria-label="Atalhos">${BOTTOM[papel].map(([r, n, i]) => `<a href="#/${r}" data-r="${r}">${ico(i)}<span>${n}</span></a>`).join("")}</nav>
      </div>`;
    $("#btSair").onclick = sair;
    $("#btMenu").onclick = () => $(".shell").classList.add("menu");
    const shell = $(".shell");
    shell.addEventListener("click", (e) => { if (shell.classList.contains("menu") && !e.target.closest(".sb") && !e.target.closest("#btMenu")) shell.classList.remove("menu"); });
    $("#btSino").onclick = abrirAvisos;
  }
  function avisos() {
    const D = db();
    if (eu.papel === "operador") {
      const out = [];
      const pend = D.agend.filter((a) => a.status === "pendente"); if (pend.length) out.push(["alerta", `${pend.length} agendamento(s) aguardando confirmação`, "painel"]);
      const ped = D.pedidos.filter((p) => p.status === "novo"); if (ped.length) out.push(["caixa", `${ped.length} pedido(s) novo(s) na loja`, "pedidos"]);
      const est = D.produtos.filter((p) => p.estoque <= 5); if (est.length) out.push(["alerta", `${est.length} produto(s) com estoque baixo`, "pedidos?aba=produtos"]);
      return out;
    }
    const meus = D.pets.filter((p) => p.donoId === eu.id).map((p) => p.id);
    const out = [];
    const f = D.fotos.filter((x) => meus.includes(x.petId) && Date.now() - new Date(x.quando) < 864e5); if (f.length) out.push(["foto", `${f.length} foto(s) nova(s) do seu pet hoje`, "fotos"]);
    D.pets.filter((p) => p.donoId === eu.id).forEach((p) => { const v = BF.statusVacina(p.v10); if (v.k !== "ok") out.push(["vacina", `Vacina V10 de ${p.nome}: ${v.t.toLowerCase()}`, "pets"]); });
    D.agend.filter((a) => a.donoId === eu.id && a.status === "confirmado" && a.ini === addDias(hoje(), 1)).forEach((a) => out.push(["cal", `Amanhã: ${SERVICOS[a.tipo].nome} de ${petDe(a.petId).nome}`, "agendamentos"]));
    return out;
  }
  function atualizaBadges() {
    const n = avisos().length; const s = $("#btSino i"); if (s) s.hidden = !n;
    if (eu && eu.papel === "operador") { const p = db().agend.filter((a) => a.status === "pendente").length, a = $('.sb nav a[data-r="painel"] em'); if (a) { a.hidden = !p; a.textContent = p; } const pe = db().pedidos.filter((x) => x.status === "novo").length, b = $('.sb nav a[data-r="pedidos"] em'); if (b) { b.hidden = !pe; b.textContent = pe; } }
  }
  function abrirAvisos() {
    const l = avisos();
    const c = modal(`${cabModal("Avisos", l.length ? "O que precisa da sua atenção" : "")}${l.length ? l.map(([i, t, r]) => `<a class="linha" href="#/${r}" data-fecha>${ico(i)}<div class="linha__t"><b>${esc(t)}</b></div>${ico("seta")}</a>`).join("") : `<div class="vazio">${ico("sino")}<b>Tudo em dia</b>Nenhum aviso por enquanto.</div>`}`);
  }

  /* ---------- tela de login ---------- */
  function telaLogin(cadastro) {
    app.innerHTML = `
      <div class="login">
        <div class="login__arte">
          <img src="${u("1548199973-03cce0bbc87b", 1400)}" alt="" />
          <a class="logo" href="../index.html"><b>${ico("pata")}</b>bicho feliz</a>
          <div class="login__frase">
            <h1>Tudo do seu pet,<br /><span class="serif">num lugar só.</span></h1>
            <p>Agende hotelzinho, creche e banho &amp; tosa, acompanhe as fotos do dia e compre na nossa lojinha.</p>
            <div class="login__cards"><span>${ico("casa")}Hotelzinho</span><span>${ico("sol")}Day use</span><span>${ico("gota")}Banho &amp; tosa</span><span>${ico("loja")}Loja</span></div>
          </div>
        </div>
        <div class="login__form">
          <a class="login__voltar" href="../index.html">${ico("voltar")}Voltar ao site</a>
          <div class="login__box" id="lbox"></div>
        </div>
      </div>`;
    const box = $("#lbox");
    const formEntrar = () => {
      box.innerHTML = `<h2>Que bom te ver!</h2><p>Entre para agendar ou acompanhar seu pet.</p>
        <form id="fEntrar" novalidate>
          <label class="f"><span>E-mail</span><input class="in" type="email" id="lEmail" autocomplete="email" placeholder="voce@email.com" required /></label>
          <label class="f"><span>Senha</span><input class="in" type="password" id="lSenha" autocomplete="current-password" placeholder="••••••" required /></label>
          <div style="display:flex;justify-content:space-between;align-items:center"><label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" checked /> Manter conectado</label><button type="button" class="lnk" id="lEsqueci" style="font-size:13.5px">Esqueci a senha</button></div>
          <p class="erro" id="lErro"></p>
          <button class="b b--blk" type="submit">Entrar ${ico("seta")}</button>
        </form>
        <div class="login__demo"><b>Acesso de demonstração</b><p>Escolha um perfil para entrar sem digitar.</p>
          <div class="grid2"><button type="button" data-demo="ana@exemplo.com"><span class="av av--txt av--sm">AS</span><span><b>Cliente</b><small>Ana · tutora do Thor</small></span></button><button type="button" data-demo="equipe@bichofeliz.com.br"><span class="av av--txt av--sm" style="background:#1f1a14;color:#ffcf3f">BF</span><span><b>Equipe</b><small>Recepção e operação</small></span></button></div>
        </div>
        <p class="alterna">Ainda não tem conta? <button type="button" id="lCad">Criar conta</button></p>`;
      $("#fEntrar").onsubmit = (e) => {
        e.preventDefault();
        const em = $("#lEmail").value.trim().toLowerCase(), se = $("#lSenha").value;
        const us = db().users.find((x) => x.email.toLowerCase() === em);
        if (!em || !se) { $("#lErro").textContent = "Preencha e-mail e senha."; return; }
        if (!us || us.senha !== se) { $("#lErro").textContent = "E-mail ou senha incorretos."; return; }
        entrar(us);
      };
      $$("[data-demo]").forEach((b) => b.onclick = () => entrar(db().users.find((x) => x.email === b.dataset.demo)));
      $("#lCad").onclick = formCadastro;
      $("#lEsqueci").onclick = () => toast("Enviamos um link de redefinição para o seu e-mail.", "whats");
    };
    const formCadastro = () => {
      box.innerHTML = `<h2>Criar conta</h2><p>Leva menos de um minuto. Depois é só cadastrar seu pet.</p>
        <form id="fCad" novalidate>
          <label class="f"><span>Nome completo</span><input class="in" id="cNome" autocomplete="name" required /></label>
          <div class="grid2"><label class="f"><span>E-mail</span><input class="in" type="email" id="cEmail" autocomplete="email" required /></label><label class="f"><span>WhatsApp</span><input class="in" id="cTel" inputmode="tel" autocomplete="tel" placeholder="(11) 9...." required /></label></div>
          <label class="f"><span>Senha</span><input class="in" type="password" id="cSenha" autocomplete="new-password" minlength="6" required /><small>Mínimo de 6 caracteres.</small></label>
          <p class="erro" id="cErro"></p>
          <button class="b b--blk" type="submit">Criar conta ${ico("seta")}</button>
        </form>
        <p class="alterna">Já tem conta? <button type="button" id="cVolta">Entrar</button></p>`;
      $("#cVolta").onclick = formEntrar;
      $("#fCad").onsubmit = (e) => {
        e.preventDefault();
        const n = $("#cNome").value.trim(), em = $("#cEmail").value.trim().toLowerCase(), t = $("#cTel").value.trim(), s = $("#cSenha").value;
        if (!n || !em.includes("@") || !t || s.length < 6) { $("#cErro").textContent = "Confira os campos: e-mail válido e senha com 6 caracteres."; return; }
        if (db().users.some((x) => x.email.toLowerCase() === em)) { $("#cErro").textContent = "Já existe uma conta com esse e-mail."; return; }
        const us = { id: BF.uid("u_"), nome: n, email: em, senha: s, papel: "cliente", tel: t, endereco: "", desde: hoje() };
        db().users.push(us); salvar(); toast("Conta criada! Agora cadastre seu pet."); entrar(us); setTimeout(() => ir("pets?novo=1"), 50);
      };
    };
    cadastro ? formCadastro() : formEntrar();
  }

  /* =====================================================================
     ÁREA DO CLIENTE
     ===================================================================== */
  const meusPets = () => db().pets.filter((p) => p.donoId === eu.id);
  const meusAgend = () => db().agend.filter((a) => a.donoId === eu.id);
  function cardAgend(a, opts = {}) {
    const p = petDe(a.petId), S = SERVICOS[a.tipo];
    return `<div class="ag" data-ag="${a.id}" tabindex="0" role="button">
      <span class="ag__ic" style="background:${S.cor}1f;color:${S.cor}">${ico(icServ(a.tipo))}</span>
      ${opts.pet !== false ? petImg(p) : ""}
      <div class="ag__t"><b>${S.nome} · ${esc(p ? p.nome : "")}${opts.dono ? ` <small style="display:inline;font-weight:500">(${esc(userDe(a.donoId).nome)})</small>` : ""}</b><small>${descAgend(a)}</small></div>
      <div class="ag__d">${statusTag(a.status)}<strong>${brl(a.valor)}</strong></div>
    </div>`;
  }
  function ligaAgend(raiz) { $$("[data-ag]", raiz).forEach((el) => { const f = () => detalheAgend(el.dataset.ag); el.onclick = f; el.onkeydown = (e) => { if (e.key === "Enter") f(); }; }); }

  function detalheAgend(id) {
    const D = db(), a = D.agend.find((x) => x.id === id); if (!a) return;
    const p = petDe(a.petId), dono = userDe(a.donoId), S = SERVICOS[a.tipo], op = eu.papel === "operador";
    const linhas = [["Serviço", S.nome], ["Quando", descAgend(a)]];
    if (a.tipo === "hotel") linhas.push(["Suíte", a.suite ? `Suíte ${a.suite}` : "a definir na confirmação"]);
    if (a.extras.length) linhas.push(["Extras", a.extras.map((e) => nomeExtra(a.tipo, e)).join(", ")]);
    if (a.obs) linhas.push(["Observações", esc(a.obs)]);
    linhas.push(["Pagamento", `${{ pix: "Pix", cartao: "Cartão", unidade: "Na unidade" }[a.pagamento] || a.pagamento} · ${a.pago ? "pago" : "a pagar"}`]);
    if (op) linhas.unshift(["Tutor", `${esc(dono.nome)} · ${esc(dono.tel)}`]);
    const futuro = a.ini >= hoje() && ["pendente", "confirmado"].includes(a.status);
    let acoes = "";
    if (op) {
      if (a.status === "pendente") acoes += `<button class="b b--perigo" data-acao="recusar">Recusar</button><button class="b b--ok" data-acao="confirmar">${ico("check")}Confirmar</button>`;
      if (a.status === "confirmado") acoes += `<button class="b b--perigo" data-acao="cancelar">Cancelar</button><button class="b" data-acao="checkin">${a.tipo === "banho" ? "Iniciar atendimento" : "Fazer check-in"}</button>`;
      if (a.status === "andamento") acoes += `<button class="b b--ok" data-acao="concluir">${ico("check")}${a.tipo === "banho" ? "Concluir" : "Fazer check-out"}</button>`;
      if (!a.pago && a.status !== "cancelado") acoes += `<button class="b b--ghost" data-acao="pago">Marcar como pago</button>`;
      acoes += `<a class="b b--ghost" target="_blank" rel="noopener" href="https://wa.me/55${dono.tel.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${dono.nome.split(" ")[0]}! Aqui é da Bicho Feliz sobre o agendamento de ${p.nome}.`)}">${ico("whats")}WhatsApp</a>`;
    } else {
      if (futuro) acoes += `<button class="b b--perigo" data-acao="cancelar">Cancelar agendamento</button>`;
      acoes += `<a class="b b--ghost" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(`Olá, Bicho Feliz! Sobre o agendamento de ${p.nome} (${S.nome}, ${descAgend(a)}).`)}">${ico("whats")}Falar com a equipe</a>`;
      if (futuro) acoes += `<button class="b b--ghost" data-acao="ics">${ico("cal")}Adicionar à agenda</button>`;
    }
    const suiteSel = op && a.tipo === "hotel" && ["pendente", "confirmado", "andamento"].includes(a.status) ? `<label class="f" style="margin-top:12px"><span>Suíte</span><select class="in" id="dSuite"><option value="">a definir</option>${[...Array(D.config.suites)].map((_, i) => { const n = i + 1, ocup = D.agend.some((x) => x.id !== a.id && x.tipo === "hotel" && x.suite === n && x.status !== "cancelado" && x.ini < a.fim && x.fim > a.ini); return `<option value="${n}" ${a.suite === n ? "selected" : ""} ${ocup ? "disabled" : ""}>Suíte ${n}${ocup ? " · ocupada" : ""}</option>`; }).join("")}</select></label>` : "";
    const c = modal(`${cabModal(`${S.nome} · ${esc(p.nome)}`, `Pedido ${codigo(a.id)} · criado em ${fmtCurta(a.criado)}`)}
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">${petImg(p, "av av--lg")}<div><b style="font-family:var(--display);font-size:20px">${esc(p.nome)}</b><div class="muted" style="font-size:13.5px">${esc(p.raca)} · porte ${p.porte} · ${BF.idade(p.nasc)}</div><div style="margin-top:6px">${statusTag(a.status)}</div></div></div>
      <div class="card" style="padding:6px 16px">${linhas.map(([k, v]) => `<div class="res-l"><span>${k}</span><b style="text-align:right">${v}</b></div>`).join("")}<div class="res-total"><span class="muted">Total</span><b>${brl(a.valor)}</b></div></div>
      ${op && p.obs ? `<p style="margin-top:12px;padding:12px 14px;border-radius:14px;background:#fff3d6;font-size:13.5px">${ico("alerta")} <b>Cuidados:</b> ${esc(p.obs)} · ${esc(p.alimentacao)}</p>` : ""}
      ${suiteSel}
      <div class="modal__f">${acoes}</div>`);
    const sel = $("#dSuite", c); if (sel) sel.onchange = () => { a.suite = sel.value ? +sel.value : null; salvar(); toast(sel.value ? `Suíte ${sel.value} reservada para ${p.nome}` : "Suíte liberada"); };
    $$("[data-acao]", c).forEach((b) => b.onclick = async () => {
      const k = b.dataset.acao;
      if (k === "ics") { baixarICS(a); return; }
      if (k === "cancelar" || k === "recusar") { fecharModal(); if (!(await confirmar(k === "recusar" ? "Recusar agendamento?" : "Cancelar agendamento?", `${S.nome} de ${p.nome} · ${descAgend(a)}. ${op ? "O tutor será avisado." : "Cancelamentos com mais de 24 h de antecedência têm reembolso integral."}`, k === "recusar" ? "Recusar" : "Cancelar agendamento", true))) return; a.status = "cancelado"; if (a.pacote) devolvePacote(a); salvar(); toast(k === "recusar" ? "Agendamento recusado" : "Agendamento cancelado"); render(); return; }
      if (k === "confirmar") { a.status = "confirmado"; if (a.tipo === "hotel" && !a.suite) a.suite = suiteLivre(a); toast(`Confirmado${a.suite && a.tipo === "hotel" ? ` · suíte ${a.suite}` : ""}. Tutor avisado no WhatsApp.`); }
      if (k === "checkin") { a.status = "andamento"; toast(a.tipo === "banho" ? `${p.nome} já está no banho` : `Check-in de ${p.nome} feito`); }
      if (k === "concluir") { a.status = "concluido"; a.pago = true; toast(a.tipo === "banho" ? `${p.nome} está pronto! Tutor avisado.` : `Check-out de ${p.nome} concluído`); }
      if (k === "pago") { a.pago = true; toast("Pagamento registrado"); }
      salvar(); fecharModal(); render();
    });
  }
  function suiteLivre(a) { const D = db(); for (let n = 1; n <= D.config.suites; n++) if (!D.agend.some((x) => x.id !== a.id && x.tipo === "hotel" && x.suite === n && x.status !== "cancelado" && x.ini < a.fim && x.fim > a.ini)) return n; return null; }
  function devolvePacote(a) { const pk = db().pacotes.find((k) => k.donoId === a.donoId && k.tipo === "creche"); if (pk) pk.saldo++; }
  function baixarICS(a) {
    const p = petDe(a.petId), S = SERVICOS[a.tipo], d = a.ini.replace(/-/g, "");
    const ini = a.tipo === "banho" ? `${d}T${a.hora.replace(":", "")}00` : d, fim = a.tipo === "hotel" ? a.fim.replace(/-/g, "") : a.tipo === "banho" ? `${d}T${BF.hora(BF.minutos(a.hora) + 60).replace(":", "")}00` : addDias(a.ini, 1).replace(/-/g, "");
    const dt = (x) => x.length === 8 ? `;VALUE=DATE:${x}` : `:${x}`;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bicho Feliz//PT", "BEGIN:VEVENT", `UID:${a.id}@bichofeliz`, `DTSTART${dt(ini)}`, `DTEND${dt(fim)}`, `SUMMARY:${S.nome} · ${p.nome} (Bicho Feliz)`, "LOCATION:Estrada do Embu, 2200 · Cotia, SP", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); l.download = `bicho-feliz-${p.nome.toLowerCase()}.ics`; l.click(); toast("Evento salvo para sua agenda", "cal");
  }

  /* ---------- início ---------- */
  ROTAS.cliente.inicio = {
    titulo: "Início",
    render(v) {
      const D = db(), pets = meusPets(), ag = meusAgend(), H = hoje();
      const prox = ag.filter((a) => (a.tipo === "hotel" ? a.fim >= H : a.ini >= H) && !["cancelado", "concluido"].includes(a.status)).sort((a, b) => (a.ini + (a.hora || "")).localeCompare(b.ini + (b.hora || "")));
      const agora = ag.find((a) => a.status === "andamento");
      const pk = D.pacotes.find((k) => k.donoId === eu.id && k.tipo === "creche");
      const fotos = D.fotos.filter((f) => pets.some((p) => p.id === f.petId)).sort((a, b) => b.quando.localeCompare(a.quando));
      const h = new Date().getHours(), sauda = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
      v.innerHTML = `
        <div class="ola"><div><h2>${sauda}, ${esc(eu.nome.split(" ")[0])} <span class="serif">${agora ? `— ${esc(petDe(agora.petId).nome)} está com a gente!` : "!"}</span></h2><p>${agora ? `${SERVICOS[agora.tipo].nome} em andamento · ${descAgend(agora)}` : prox.length ? `Próximo compromisso: ${SERVICOS[prox[0].tipo].nome} de ${esc(petDe(prox[0].petId).nome)} ${rel(prox[0].ini)}.` : "Que tal agendar um dia de creche?"}</p></div></div>
        <div class="acoes">
          <a class="acao" href="#/agendar?tipo=hotel" style="background:linear-gradient(140deg,#e26a2c,#c4521b)">${ico("casa")}<div><b>Hotelzinho</b><small>a partir de ${brl(SERVICOS.hotel.diaria.P)}/diária</small></div></a>
          <a class="acao" href="#/agendar?tipo=creche" style="background:linear-gradient(140deg,#2f7d4f,#1f5c38)">${ico("sol")}<div><b>Creche · day use</b><small>${pk ? `${pk.saldo} diárias no pacote` : `a partir de ${brl(SERVICOS.creche.periodos.meio.preco)}`}</small></div></a>
          <a class="acao" href="#/agendar?tipo=banho" style="background:linear-gradient(140deg,#3d7be0,#2a5bb0)">${ico("gota")}<div><b>Banho &amp; tosa</b><small>a partir de ${brl(SERVICOS.banho.opcoes[0].preco.P)}</small></div></a>
          <a class="acao" href="#/loja" style="background:linear-gradient(140deg,#1f1a14,#3a3128)">${ico("loja")}<div><b>Lojinha</b><small>ração, petiscos e mimos</small></div></a>
        </div>
        <div class="cols">
          <div class="pilha">
            <div class="card"><div class="card__h"><h3>Próximos agendamentos</h3><a href="#/agendamentos">Ver todos</a></div><div id="proxL">${prox.length ? prox.slice(0, 4).map((a) => cardAgend(a)).join("") : `<div class="vazio">${ico("cal")}<b>Nada marcado</b>Escolha um serviço acima para agendar.</div>`}</div></div>
            <div class="card"><div class="card__h"><h3>Fotos do dia</h3><a href="#/fotos">Ver tudo</a></div>${fotos.length ? `<div class="feed feed--mini">${fotos.slice(0, 2).map(postHTML).join("")}</div>` : `<div class="vazio">${ico("foto")}<b>Sem fotos ainda</b>Quando seu pet estiver com a gente, as fotos aparecem aqui.</div>`}</div>
          </div>
          <div class="pilha">
            <div class="card"><div class="card__h"><h3>Meus pets</h3><a href="#/pets">Gerenciar</a></div>${pets.map((p) => { const v = BF.statusVacina(p.v10); return `<div class="linha">${petImg(p)}<div class="linha__t"><b>${esc(p.nome)}</b><small>${esc(p.raca)} · ${BF.idade(p.nasc)}</small></div><span class="st" style="color:${v.c};background:${v.c}18">${ico("vacina")} ${v.t}</span></div>`; }).join("") || `<div class="vazio">${ico("pata")}<b>Cadastre seu pet</b><a class="b b--sm" href="#/pets?novo=1" style="margin-top:10px">Adicionar pet</a></div>`}</div>
            <div class="card"><div class="card__h"><h3>Pacote da creche</h3></div>${pk ? `<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-family:var(--display);font-size:34px">${pk.saldo}<small class="muted" style="font-size:15px;font-weight:500"> de ${pk.total} diárias</small></b><a class="lnk" href="#/agendar?tipo=creche">Usar</a></div><div class="barra"><i style="width:${pk.saldo / pk.total * 100}%"></i></div><p class="muted" style="font-size:12.5px;margin-top:8px">Comprado em ${fmtCurta(pk.compra)} · válido por 90 dias</p>` : `<p class="muted" style="font-size:14px">Leve 10 diárias por ${brl(SERVICOS.creche.pacote.preco)} e economize ${brl(SERVICOS.creche.periodos.integral.preco * 10 - SERVICOS.creche.pacote.preco)}.</p><a class="b b--soft b--sm" style="margin-top:12px" href="#/agendar?tipo=creche">Ver pacote</a>`}</div>
            <div class="card" style="background:linear-gradient(140deg,#fff3d6,#ffe8dc)"><h3 style="font-size:17px">Precisa de algo?</h3><p class="muted" style="font-size:14px;margin:4px 0 12px">A recepção responde pelo WhatsApp das 7h às 20h.</p><a class="b b--ink b--sm" target="_blank" rel="noopener" href="https://wa.me/${WA}">${ico("whats")}Chamar no WhatsApp</a></div>
          </div>
        </div>`;
      ligaAgend(v);
    },
  };

  /* ---------- fotos ---------- */
  function postHTML(f) {
    const p = petDe(f.petId);
    return `<article class="post"><div class="post__h">${petImg(p, "av av--sm")}<div><b>${esc(p.nome)}</b><small>por ${esc(f.autor)} · ${BF.desde(f.quando)}</small></div></div><img class="post__img" src="${u(f.img, 900)}" alt="Foto de ${esc(p.nome)}" loading="lazy" /><p>${esc(f.texto)}</p></article>`;
  }
  ROTAS.cliente.fotos = {
    titulo: "Fotos do dia",
    render(v) {
      const ids = meusPets().map((p) => p.id), f = db().fotos.filter((x) => ids.includes(x.petId)).sort((a, b) => b.quando.localeCompare(a.quando));
      v.innerHTML = `<div class="ola"><div><h2>Diário do seu pet <span class="serif">em fotos</span></h2><p>A equipe manda fotos e recados durante a estadia e a creche.</p></div></div>
        <div style="max-width:640px">${f.length ? `<div class="feed">${f.map(postHTML).join("")}</div>` : `<div class="card vazio">${ico("foto")}<b>Ainda sem fotos</b>Elas aparecem aqui quando seu pet estiver com a gente.</div>`}</div>`;
    },
  };

  /* ---------- meus agendamentos ---------- */
  ROTAS.cliente.agendamentos = {
    titulo: "Meus agendamentos",
    render(v, params) {
      const aba = params.aba || "proximos", H = hoje(), todos = meusAgend();
      const filtros = { proximos: (a) => !["cancelado", "concluido"].includes(a.status) && (a.tipo === "hotel" ? a.fim >= H : a.ini >= H), anteriores: (a) => a.status === "concluido" || (a.status !== "cancelado" && (a.tipo === "hotel" ? a.fim < H : a.ini < H)), cancelados: (a) => a.status === "cancelado" };
      const lista = todos.filter(filtros[aba]).sort((a, b) => aba === "proximos" ? a.ini.localeCompare(b.ini) : b.ini.localeCompare(a.ini));
      v.innerHTML = `<div class="barra-ferr"><div class="abas">${[["proximos", "Próximos"], ["anteriores", "Anteriores"], ["cancelados", "Cancelados"]].map(([k, n]) => `<button class="${k === aba ? "on" : ""}" data-aba="${k}">${n} <small>(${todos.filter(filtros[k]).length})</small></button>`).join("")}</div><a class="b b--sm" href="#/agendar" style="margin-left:auto">${ico("mais")}Novo agendamento</a></div>
        <div style="max-width:860px">${lista.length ? lista.map((a) => cardAgend(a)).join("") : `<div class="card vazio">${ico("cal")}<b>Nenhum agendamento aqui</b>${aba === "proximos" ? '<a class="b b--sm" href="#/agendar" style="margin-top:12px">Agendar agora</a>' : ""}</div>`}</div>`;
      $$("[data-aba]", v).forEach((b) => b.onclick = () => ir("agendamentos?aba=" + b.dataset.aba));
      ligaAgend(v);
    },
  };

  /* ---------- meus pets ---------- */
  const FOTOS_PET = ["1543466835-00a7907e9de1", "1587300003388-59208cc962cb", "1544568100-847a948585b9", "1608096299210-db7e38487075", "1625316708582-7c38734be31d", "1517849845537-4d257902454a", "1583511655857-d19b40a7a54e", "1591946614720-90a587da4a36", "1592194996308-7b43878e84a6", "1598133894008-61f7fdb8cc3a", "1600369671236-e74521d4b6ad", "1560743641-3914f2c45636"];
  function formPet(pet, donoId, aoSalvar) {
    const p = pet || { nome: "", especie: "Cão", raca: "", porte: "M", nasc: addDias(hoje(), -730), peso: "", foto: FOTOS_PET[0], v10: addDias(hoje(), 180), raiva: addDias(hoje(), 180), antipulgas: addDias(hoje(), 30), castrado: true, temperamento: "", alimentacao: "", obs: "" };
    let foto = p.foto;
    const c = modal(`${cabModal(pet ? `Editar ${esc(pet.nome)}` : "Novo pet", "Essas informações ajudam a equipe a cuidar do jeitinho certo.")}
      <form id="fPet" class="pilha" style="gap:12px" novalidate>
        <div class="f"><span>Foto</span><div class="chips" id="pFotos">${FOTOS_PET.map((id) => `<button type="button" data-f="${id}" style="border-radius:14px;padding:0;overflow:hidden;box-shadow:inset 0 0 0 3px ${id === foto ? "var(--orange)" : "transparent"}"><img src="${u(id, 120)}" alt="" style="width:52px;height:52px;object-fit:cover;opacity:${id === foto ? 1 : .75}" /></button>`).join("")}</div></div>
        <div class="grid2"><label class="f"><span>Nome</span><input class="in" id="pNome" value="${esc(p.nome)}" required /></label><label class="f"><span>Espécie</span><select class="in" id="pEsp">${["Cão", "Gato"].map((x) => `<option ${x === p.especie ? "selected" : ""}>${x}</option>`).join("")}</select></label></div>
        <div class="grid3"><label class="f"><span>Raça</span><input class="in" id="pRaca" value="${esc(p.raca)}" placeholder="SRD" /></label><label class="f"><span>Porte</span><select class="in" id="pPorte">${[["P", "Pequeno (até 10 kg)"], ["M", "Médio (10–25 kg)"], ["G", "Grande (25 kg+)"]].map(([k, n]) => `<option value="${k}" ${k === p.porte ? "selected" : ""}>${n}</option>`).join("")}</select></label><label class="f"><span>Peso (kg)</span><input class="in" id="pPeso" inputmode="decimal" value="${esc(p.peso)}" /></label></div>
        <div class="grid2"><label class="f"><span>Nascimento</span><input class="in" type="date" id="pNasc" value="${p.nasc}" max="${hoje()}" /></label><label class="f"><span>Castrado?</span><select class="in" id="pCast"><option value="1" ${p.castrado ? "selected" : ""}>Sim</option><option value="0" ${!p.castrado ? "selected" : ""}>Não</option></select></label></div>
        <div class="grid3"><label class="f"><span>Validade V10</span><input class="in" type="date" id="pV10" value="${p.v10}" /></label><label class="f"><span>Validade antirrábica</span><input class="in" type="date" id="pRaiva" value="${p.raiva}" /></label><label class="f"><span>Antipulgas até</span><input class="in" type="date" id="pPulgas" value="${p.antipulgas}" /></label></div>
        <label class="f"><span>Temperamento</span><input class="in" id="pTemp" value="${esc(p.temperamento)}" placeholder="Ex.: brincalhão, tímido com cães grandes" /></label>
        <label class="f"><span>Alimentação</span><input class="in" id="pAlim" value="${esc(p.alimentacao)}" placeholder="Ex.: ração própria, 150 g duas vezes ao dia" /></label>
        <label class="f"><span>Cuidados especiais, alergias e medicação</span><textarea class="in" id="pObs">${esc(p.obs)}</textarea></label>
        <p class="erro" id="pErro"></p>
        <div class="modal__f" style="margin-top:0">${pet && eu.papel === "cliente" ? `<button type="button" class="b b--perigo" id="pDel" style="margin-right:auto">${ico("lixo")}Remover</button>` : ""}<button type="button" class="b b--ghost" data-fecha>Cancelar</button><button class="b">${ico("check")}Salvar</button></div>
      </form>`, { grande: true });
    $$("#pFotos button", c).forEach((b) => b.onclick = () => { foto = b.dataset.f; $$("#pFotos button", c).forEach((x) => { const on = x === b; x.style.boxShadow = `inset 0 0 0 3px ${on ? "var(--orange)" : "transparent"}`; $("img", x).style.opacity = on ? 1 : .75; }); });
    const del = $("#pDel", c); if (del) del.onclick = async () => { fecharModal(); if (await confirmar(`Remover ${pet.nome}?`, "Os agendamentos anteriores continuam no histórico.", "Remover", true)) { db().pets = db().pets.filter((x) => x.id !== pet.id); salvar(); toast(`${pet.nome} removido`); render(); } };
    $("#fPet", c).onsubmit = (e) => {
      e.preventDefault();
      const nome = $("#pNome", c).value.trim(); if (!nome) { $("#pErro", c).textContent = "Informe o nome do pet."; return; }
      const dados = { nome, especie: $("#pEsp", c).value, raca: $("#pRaca", c).value.trim() || "SRD", porte: $("#pPorte", c).value, peso: $("#pPeso", c).value.trim(), nasc: $("#pNasc", c).value || p.nasc, castrado: $("#pCast", c).value === "1", v10: $("#pV10", c).value, raiva: $("#pRaiva", c).value, antipulgas: $("#pPulgas", c).value, temperamento: $("#pTemp", c).value.trim() || "Sociável", alimentacao: $("#pAlim", c).value.trim() || "Ração própria", obs: $("#pObs", c).value.trim(), foto };
      if (pet) Object.assign(pet, dados); else db().pets.push({ id: BF.uid("p_"), donoId, ...dados });
      salvar(); fecharModal(); toast(pet ? "Dados atualizados" : `${nome} cadastrado! 🐾`); aoSalvar ? aoSalvar() : render();
    };
  }
  ROTAS.cliente.pets = {
    titulo: "Meus pets",
    render(v, params) {
      const pets = meusPets();
      v.innerHTML = `<div class="pets">${pets.map((p) => { const v10 = BF.statusVacina(p.v10), rv = BF.statusVacina(p.raiva); return `
        <article class="pet"><div class="pet__img"><img src="${u(p.foto, 700)}" alt="${esc(p.nome)}" loading="lazy" />${v10.k !== "ok" || rv.k !== "ok" ? `<span class="st" style="color:${v10.k === "vencida" || rv.k === "vencida" ? "#c0392b" : "#b7791f"};background:#fff">${ico("vacina")} Vacina ${v10.k === "vencida" || rv.k === "vencida" ? "vencida" : "vencendo"}</span>` : ""}<div class="pet__nome vidro"><div><b>${esc(p.nome)}</b><small>${esc(p.raca)} · ${BF.idade(p.nasc)}</small></div><button class="ib" data-edit="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></div></div>
          <div class="pet__info"><div><span>Porte</span><b>${{ P: "Pequeno", M: "Médio", G: "Grande" }[p.porte]}${p.peso ? ` · ${esc(p.peso)} kg` : ""}</b></div><div><span>V10</span><b style="color:${v10.c}">${v10.t}</b></div><div><span>Antirrábica</span><b style="color:${rv.c}">${rv.t}</b></div><div><span>Temperamento</span><b>${esc(p.temperamento)}</b></div>${p.obs ? `<p class="muted" style="font-size:12.5px;border-top:1px dashed var(--line);padding-top:8px">${esc(p.obs)}</p>` : ""}<a class="b b--soft b--sm" href="#/agendar?pet=${p.id}">${ico("cal")}Agendar para ${esc(p.nome)}</a></div></article>`; }).join("")}
        <button class="pet pet--novo" id="novoPet"><div>${ico("mais")}<b style="display:block;font-family:var(--display);font-size:17px;color:var(--ink)">Adicionar pet</b>Cães e gatos</div></button></div>`;
      $("#novoPet").onclick = () => formPet(null, eu.id);
      $$("[data-edit]", v).forEach((b) => b.onclick = () => formPet(petDe(b.dataset.edit), eu.id));
      if (params.novo) { history.replaceState(null, "", "#/pets"); formPet(null, eu.id); }
    },
  };

  /* ---------- perfil ---------- */
  ROTAS.cliente.perfil = {
    titulo: "Meu perfil",
    render(v) {
      v.innerHTML = `<div class="cols"><div class="card"><div class="card__h"><h3>Dados pessoais</h3></div>
        <form id="fPerf" class="pilha" style="gap:12px"><label class="f"><span>Nome</span><input class="in" id="eNome" value="${esc(eu.nome)}" /></label><div class="grid2"><label class="f"><span>E-mail</span><input class="in" id="eEmail" type="email" value="${esc(eu.email)}" /></label><label class="f"><span>WhatsApp</span><input class="in" id="eTel" value="${esc(eu.tel)}" /></label></div><label class="f"><span>Endereço para o táxi pet</span><input class="in" id="eEnd" value="${esc(eu.endereco || "")}" /></label><div><button class="b">${ico("check")}Salvar alterações</button></div></form></div>
        <div class="pilha"><div class="card"><h3 style="font-size:17px">Segurança</h3><p class="muted" style="font-size:14px;margin:4px 0 12px">Troque sua senha de acesso.</p><form id="fSen" class="pilha" style="gap:10px"><input class="in" type="password" id="eSen" placeholder="Nova senha (mín. 6)" autocomplete="new-password" /><button class="b b--ghost b--sm">Atualizar senha</button></form></div>
        <div class="card"><h3 style="font-size:17px">Demonstração</h3><p class="muted" style="font-size:14px;margin:4px 0 12px">Os dados ficam só neste navegador. Restaure para voltar ao exemplo.</p><button class="b b--ghost b--sm" id="eReset">Restaurar dados de exemplo</button></div></div></div>`;
      $("#fPerf").onsubmit = (e) => { e.preventDefault(); eu.nome = $("#eNome").value.trim() || eu.nome; eu.email = $("#eEmail").value.trim() || eu.email; eu.tel = $("#eTel").value.trim(); eu.endereco = $("#eEnd").value.trim(); salvar(); toast("Perfil atualizado"); $(".sb__eu b").textContent = eu.nome.split(" ")[0]; };
      $("#fSen").onsubmit = (e) => { e.preventDefault(); const s = $("#eSen").value; if (s.length < 6) { toast("A senha precisa de 6 caracteres", "alerta"); return; } eu.senha = s; salvar(); $("#eSen").value = ""; toast("Senha atualizada"); };
      $("#eReset").onclick = resetDemo;
    },
  };
  async function resetDemo() { if (await confirmar("Restaurar dados de exemplo?", "Agendamentos, pets e pedidos criados neste navegador serão apagados.", "Restaurar", true)) { BF.resetar(); try { localStorage.removeItem(SESSAO); Object.keys(localStorage).filter((k) => k.startsWith("bf_carrinho")).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* */ } toast("Dados restaurados"); setTimeout(() => location.reload(), 600); } }

  /* =====================================================================
     ASSISTENTE DE AGENDAMENTO (cliente e equipe)
     ===================================================================== */
  function assistente(v, params, modoOp) {
    const D = db();
    const W = { passo: 1, tipo: params.tipo || null, donoId: modoOp ? params.cliente || null : eu.id, petId: params.pet || null, ini: null, fim: null, periodo: "integral", pacote: false, comprarPacote: false, opcao: "banho", prof: "auto", hora: null, extras: new Set(), pagamento: modoOp ? "unidade" : "pix", obs: "", mesCal: hoje().slice(0, 7) + "-01" };
    if (W.petId) { const p = petDe(W.petId); if (p) W.donoId = p.donoId; }
    const PASSOS = modoOp ? ["Serviço", "Cliente e pet", "Data e horário", "Extras", "Confirmação"] : ["Serviço", "Pet", "Data e horário", "Extras", "Pagamento"];
    if (W.tipo) W.passo = 2;
    if (W.tipo && W.petId) W.passo = 3;
    const petsDono = () => D.pets.filter((p) => p.donoId === W.donoId && (W.tipo !== "creche" && W.tipo !== "hotel" || p.especie === "Cão" || W.tipo === "hotel"));
    const pacote = () => D.pacotes.find((k) => k.donoId === W.donoId && k.tipo === "creche");
    function agendamentoRascunho() {
      const a = { tipo: W.tipo, petId: W.petId, ini: W.ini, fim: W.fim, periodo: W.periodo, pacote: W.pacote, opcao: W.opcao, extras: [...W.extras] };
      return a;
    }
    function valor() {
      if (!W.tipo || !W.petId || !W.ini || (W.tipo === "hotel" && !W.fim)) return null;
      let t = BF.calcularValor(agendamentoRascunho(), petDe(W.petId));
      if (W.comprarPacote) t += SERVICOS.creche.pacote.preco;
      return t;
    }
    function profEscolhido() {
      if (W.prof !== "auto") return W.prof;
      const o = SERVICOS.banho.opcoes.find((x) => x.id === W.opcao);
      const livre = PROFISSIONAIS.find((p) => BF.horariosBanho(W.ini, p.id, o.dur).some((h) => h.hora === W.hora && h.livre));
      return livre ? livre.id : null;
    }
    const valido = {
      1: () => !!W.tipo,
      2: () => !!W.petId && !!W.donoId,
      3: () => W.tipo === "hotel" ? !!(W.ini && W.fim && BF.difDias(W.ini, W.fim) >= 1 && BF.vagasHotel(W.ini, W.fim) > 0) : W.tipo === "creche" ? !!W.ini && BF.vagasCreche(W.ini) > 0 : !!(W.ini && W.hora && profEscolhido()),
      4: () => true,
      5: () => true,
    };
    function desenha() {
      const S = W.tipo && SERVICOS[W.tipo], p = W.petId && petDe(W.petId), val = valor();
      v.innerHTML = `
        <div class="passos">${PASSOS.map((n, i) => `<span class="${i + 1 === W.passo ? "on" : i + 1 < W.passo ? "ok" : ""}"><i>${i + 1 < W.passo ? "✓" : i + 1}</i>${n}</span>`).join("")}</div>
        <div class="wiz"><div class="card" id="wCorpo"></div>
          <aside class="card resumo"><h3>Resumo</h3>
            ${S ? `<div class="linha" style="padding-top:0"><span class="ag__ic" style="background:${S.cor}1f;color:${S.cor}">${ico(S.icone)}</span><div class="linha__t"><b>${S.nome}</b><small>${S.desc}</small></div></div>` : `<p class="muted" style="font-size:14px">Escolha um serviço para começar.</p>`}
            ${p ? `<div class="linha">${petImg(p)}<div class="linha__t"><b>${esc(p.nome)}</b><small>${esc(p.raca)} · porte ${p.porte}${modoOp ? " · " + esc(userDe(p.donoId).nome) : ""}</small></div></div>` : ""}
            ${W.ini ? `<div class="res-l"><span>${W.tipo === "hotel" ? "Check-in" : "Data"}</span><b>${fmtData(W.ini)}${W.hora ? " · " + W.hora : ""}</b></div>` : ""}
            ${W.fim ? `<div class="res-l"><span>Check-out</span><b>${fmtData(W.fim)}</b></div><div class="res-l"><span>Diárias</span><b>${BF.difDias(W.ini, W.fim)} × ${brl(SERVICOS.hotel.diaria[p.porte])}</b></div>` : ""}
            ${W.tipo === "creche" && W.ini ? `<div class="res-l"><span>Período</span><b>${SERVICOS.creche.periodos[W.periodo].nome}</b></div>${W.pacote ? `<div class="res-l"><span>Pacote</span><b>${W.comprarPacote ? `compra · ${brl(SERVICOS.creche.pacote.preco)}` : "usa 1 diária"}</b></div>` : ""}` : ""}
            ${W.tipo === "banho" && W.ini ? `<div class="res-l"><span>Serviço</span><b>${SERVICOS.banho.opcoes.find((x) => x.id === W.opcao).nome}</b></div>` : ""}
            ${[...W.extras].map((e) => `<div class="res-l"><span>+ ${nomeExtra(W.tipo, e)}</span><b></b></div>`).join("")}
            <div class="res-total"><span class="muted">Total</span><b>${val === null ? "—" : brl(val)}</b></div>
            ${W.tipo === "hotel" || W.tipo === "creche" ? `<p class="muted" style="font-size:12px;margin-top:10px">${ico("vacina")} Vacinas V10 e antirrábica em dia são obrigatórias para hospedagem e creche.</p>` : ""}
          </aside></div>`;
      const corpo = $("#wCorpo", v);
      ({ 1: passoServico, 2: passoPet, 3: passoData, 4: passoExtras, 5: passoFinal })[W.passo](corpo);
      if (W.passo < 5) {
        corpo.insertAdjacentHTML("beforeend", `<div class="nav-wiz">${W.passo > 1 ? `<button class="b b--ghost" id="wVolta">${ico("voltar")}Voltar</button>` : "<span></span>"}<button class="b" id="wSegue" ${valido[W.passo]() ? "" : "disabled"}>Continuar ${ico("seta")}</button></div>`);
        const vb = $("#wVolta", v); if (vb) vb.onclick = () => { W.passo--; desenha(); };
        $("#wSegue", v).onclick = () => { if (!valido[W.passo]()) return; W.passo++; desenha(); };
      }
    }
    const reDesenha = () => { const y = scrollY; desenha(); window.scrollTo({ top: y }); };
    function passoServico(c) {
      c.innerHTML = `<div class="secao-wiz"><h4>O que vamos agendar?</h4><div class="opcoes">${Object.entries(SERVICOS).map(([k, S]) => `<button class="opc ${W.tipo === k ? "on" : ""}" data-t="${k}"><span class="ag__ic" style="background:${S.cor}1f;color:${S.cor}">${ico(S.icone)}</span><b>${S.nome}</b><small>${S.desc}</small><strong>a partir de ${brl(k === "hotel" ? S.diaria.P : k === "creche" ? S.periodos.meio.preco : S.opcoes[0].preco.P)}${k === "hotel" ? "/diária" : ""}</strong></button>`).join("")}</div></div>`;
      $$("[data-t]", c).forEach((b) => b.onclick = () => { if (W.tipo !== b.dataset.t) { W.ini = W.fim = W.hora = null; W.extras.clear(); W.pacote = W.comprarPacote = false; } W.tipo = b.dataset.t; W.passo = 2; desenha(); });
    }
    function passoPet(c) {
      let html = "";
      if (modoOp) {
        const clientes = D.users.filter((x) => x.papel === "cliente").sort((a, b) => a.nome.localeCompare(b.nome));
        html += `<div class="secao-wiz"><h4>Cliente</h4><select class="in" id="wCli"><option value="">Selecione o tutor…</option>${clientes.map((x) => `<option value="${x.id}" ${x.id === W.donoId ? "selected" : ""}>${esc(x.nome)} · ${esc(x.tel)}</option>`).join("")}</select></div>`;
      }
      const lista = W.donoId ? D.pets.filter((p) => p.donoId === W.donoId) : [];
      html += `<div class="secao-wiz"><h4>Para qual pet?</h4>${W.donoId ? `<div class="opcoes">${lista.map((p) => { const ok = !(W.tipo === "creche" && p.especie === "Gato"); return `<button class="opc opc--pet ${W.petId === p.id ? "on" : ""}" data-p="${p.id}" ${ok ? "" : "disabled"}>${petImg(p, "av av--lg")}<span><b>${esc(p.nome)}</b><small style="display:block">${esc(p.raca)} · porte ${p.porte}</small>${!ok ? '<small style="display:block;color:var(--red)">Creche só para cães</small>' : BF.statusVacina(p.v10).k === "vencida" && W.tipo !== "banho" ? '<small style="display:block;color:var(--red)">V10 vencida</small>' : ""}</span></button>`; }).join("")}<button class="opc opc--pet" id="wNovoPet" style="border:2px dashed var(--line);box-shadow:none;justify-content:center">${ico("mais")}<b>Novo pet</b></button></div>` : '<p class="muted">Escolha o cliente primeiro.</p>'}</div>`;
      c.innerHTML = html;
      const cli = $("#wCli", c); if (cli) cli.onchange = () => { W.donoId = cli.value || null; W.petId = null; reDesenha(); };
      $$("[data-p]", c).forEach((b) => b.onclick = () => { W.petId = b.dataset.p; reDesenha(); });
      const np = $("#wNovoPet", c); if (np) np.onclick = () => formPet(null, W.donoId, () => { const ult = D.pets.filter((p) => p.donoId === W.donoId).pop(); W.petId = ult.id; reDesenha(); });
    }
    function calendario(c, modo) {
      const base = BF.dataObj(W.mesCal), y = base.getFullYear(), m = base.getMonth();
      const nomeMes = base.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const primeiro = new Date(y, m, 1).getDay(), dias = new Date(y, m + 1, 0).getDate(), H = hoje();
      let cel = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => `<span>${d}</span>`).join("") + "<i></i>".repeat(primeiro);
      for (let d = 1; d <= dias; d++) {
        const s = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        let livre = null, info = "";
        if (modo === "hotel") { livre = D.config.suites - BF.ocupacaoHotel(s); info = livre > 0 ? `${livre} livres` : "lotado"; }
        if (modo === "creche") { livre = BF.vagasCreche(s); info = livre > 0 ? `${livre} vagas` : "lotado"; }
        if (modo === "banho") { const o = SERVICOS.banho.opcoes.find((x) => x.id === W.opcao); const n = PROFISSIONAIS.reduce((t, p) => t + BF.horariosBanho(s, p.id, o.dur).filter((h) => h.livre).length, 0); livre = n; info = n ? `${n} horários` : "sem vaga"; }
        const passado = s < H, fechado = !BF.abertoNoDia(s, modo), maxD = s > BF.addDias(H, 120);
        const desab = passado || fechado || maxD || (modo === "hotel" ? (!W.ini || W.fim) && livre <= 0 && s !== W.fim : livre <= 0);
        let cls = "dia";
        if (s === H) cls += " hoje";
        if (modo === "hotel" && W.ini && W.fim && s > W.ini && s < W.fim) cls += " meio";
        if (s === W.ini) cls += " sel" + (modo === "hotel" && W.fim ? " ini" : "");
        if (s === W.fim) cls += " sel fim";
        if (livre !== null && livre <= 0) cls += " cheio";
        cel += `<button class="${cls}" data-d="${s}" ${desab ? "disabled" : ""} aria-label="${fmtData(s)}${info ? ", " + info : ""}">${d}${!passado && !fechado ? `<small>${info}</small>` : ""}</button>`;
      }
      c.insertAdjacentHTML("beforeend", `<div class="cal"><div class="cal__h"><button class="ib" id="cMenos" aria-label="Mês anterior" ${W.mesCal <= H.slice(0, 7) + "-01" ? "disabled" : ""}>${ico("voltar")}</button><b>${nomeMes}</b><button class="ib" id="cMais" aria-label="Próximo mês">${ico("seta")}</button></div><div class="cal__g">${cel}</div></div>`);
      $("#cMenos", c).onclick = () => { W.mesCal = BF.addDias(W.mesCal, -1).slice(0, 7) + "-01"; reDesenha(); };
      $("#cMais", c).onclick = () => { const b2 = BF.dataObj(W.mesCal); W.mesCal = `${b2.getFullYear() + (b2.getMonth() === 11 ? 1 : 0)}-${String(b2.getMonth() === 11 ? 1 : b2.getMonth() + 2).padStart(2, "0")}-01`; reDesenha(); };
      $$("[data-d]", c).forEach((b) => b.onclick = () => {
        const s = b.dataset.d;
        if (modo === "hotel") { if (!W.ini || W.fim || s <= W.ini) { W.ini = s; W.fim = null; } else { if (BF.vagasHotel(W.ini, s) <= 0) { toast("Não há suíte livre em todas as noites desse período", "alerta"); return; } W.fim = s; } }
        else { W.ini = s; W.hora = null; }
        reDesenha();
      });
    }
    function passoData(c) {
      const p = petDe(W.petId);
      if (W.tipo === "hotel") {
        c.innerHTML = `<div class="secao-wiz"><h4>Datas da hospedagem <small>${!W.ini ? "toque no dia do check-in" : !W.fim ? "agora o dia do check-out" : `${BF.difDias(W.ini, W.fim)} diárias · check-in a partir das 10h, check-out até as 18h`}</small></h4></div>`;
        calendario(c, "hotel");
      }
      if (W.tipo === "creche") {
        const pk = pacote();
        c.innerHTML = `<div class="secao-wiz"><h4>Período</h4><div class="chips">${Object.entries(SERVICOS.creche.periodos).map(([k, x]) => `<button class="chip ${W.periodo === k ? "on" : ""}" data-per="${k}">${x.nome} <small>${brl(x.preco)}</small></button>`).join("")}</div></div>
          <div class="secao-wiz"><h4>Forma de uso</h4><div class="chips"><button class="chip ${!W.pacote ? "on" : ""}" data-pk="0">Diária avulsa</button>${pk && pk.saldo > 0 ? `<button class="chip ${W.pacote && !W.comprarPacote ? "on" : ""}" data-pk="1">Usar pacote <small>${pk.saldo} restantes</small></button>` : ""}<button class="chip ${W.comprarPacote ? "on" : ""}" data-pk="2">Comprar pacote 10 diárias <small>${brl(SERVICOS.creche.pacote.preco)}</small></button></div></div>
          <div class="secao-wiz"><h4>Dia <small>das 7h às 19h · fechado aos domingos</small></h4></div>`;
        calendario(c, "creche");
        $$("[data-per]", c).forEach((b) => b.onclick = () => { W.periodo = b.dataset.per; reDesenha(); });
        $$("[data-pk]", c).forEach((b) => b.onclick = () => { const k = b.dataset.pk; W.pacote = k !== "0"; W.comprarPacote = k === "2"; reDesenha(); });
      }
      if (W.tipo === "banho") {
        const o = SERVICOS.banho.opcoes;
        c.innerHTML = `<div class="secao-wiz"><h4>Serviço</h4><div class="opcoes">${o.map((x) => `<button class="opc ${W.opcao === x.id ? "on" : ""}" data-op="${x.id}"><b>${x.nome}</b><small>cerca de ${x.dur} min</small><strong>${brl(x.preco[p.porte])}</strong></button>`).join("")}</div></div>
          <div class="secao-wiz"><h4>Profissional</h4><div class="chips"><button class="chip ${W.prof === "auto" ? "on" : ""}" data-pr="auto">Sem preferência</button>${PROFISSIONAIS.map((x) => `<button class="chip ${W.prof === x.id ? "on" : ""}" data-pr="${x.id}"><img src="${u(x.foto, 80)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover" />${x.nome.split(" ")[0]}</button>`).join("")}</div></div>
          <div class="secao-wiz"><h4>Dia</h4></div>`;
        calendario(c, "banho");
        if (W.ini) {
          const dur = o.find((x) => x.id === W.opcao).dur;
          const hs = W.prof === "auto" ? (() => { const m = {}; PROFISSIONAIS.forEach((pf) => BF.horariosBanho(W.ini, pf.id, dur).forEach((h) => { m[h.hora] = m[h.hora] || h.livre; })); return Object.entries(m).map(([hora, livre]) => ({ hora, livre })); })() : BF.horariosBanho(W.ini, W.prof, dur);
          c.insertAdjacentHTML("beforeend", `<div class="secao-wiz" style="margin-top:18px"><h4>Horário <small>${fmtData(W.ini)}</small></h4>${hs.some((h) => h.livre) ? `<div class="horas">${hs.map((h) => `<button class="chip ${W.hora === h.hora ? "on" : ""}" data-h="${h.hora}" ${h.livre ? "" : "disabled"}>${h.hora}</button>`).join("")}</div>` : '<p class="muted">Sem horários livres nesse dia. Tente outro profissional ou outra data.</p>'}</div>`);
          $$("[data-h]", c).forEach((b) => b.onclick = () => { W.hora = b.dataset.h; reDesenha(); });
        }
        $$("[data-op]", c).forEach((b) => b.onclick = () => { W.opcao = b.dataset.op; W.hora = null; reDesenha(); });
        $$("[data-pr]", c).forEach((b) => b.onclick = () => { W.prof = b.dataset.pr; W.hora = null; reDesenha(); });
      }
    }
    function passoExtras(c) {
      const S = SERVICOS[W.tipo], p = petDe(W.petId), dias = W.tipo === "hotel" ? BF.difDias(W.ini, W.fim) : 1;
      const vac = [BF.statusVacina(p.v10), BF.statusVacina(p.raiva)];
      c.innerHTML = `<div class="secao-wiz"><h4>Quer adicionar algo?</h4><div class="opcoes">${S.extras.map((e) => { const pr = e.preco === "banho" ? SERVICOS.banho.opcoes[0].preco[p.porte] : e.preco; return `<button class="opc ${W.extras.has(e.id) ? "on" : ""}" data-x="${e.id}"><b style="font-size:15px">${e.nome}</b><strong>${pr ? brl(pr) + (e.tipo === "dia" ? ` /dia · ${brl(pr * dias)}` : "") : "cortesia"}</strong></button>`; }).join("")}</div></div>
        <label class="f secao-wiz"><span>Recados para a equipe</span><textarea class="in" id="wObs" placeholder="${W.tipo === "banho" ? "Ex.: tosa mais curtinha nas patas" : "Ex.: horário da medicação, brinquedo favorito, como ele gosta de dormir"}">${esc(W.obs)}</textarea></label>
        ${(W.tipo === "hotel" || W.tipo === "creche") && vac.some((x) => x.k === "vencida") ? `<p style="padding:12px 14px;border-radius:14px;background:#fdeceb;color:#8e2a1f;font-size:13.5px">${ico("alerta")} A vacina de ${esc(p.nome)} está vencida. Você pode agendar, mas traga a carteirinha atualizada no check-in.</p>` : ""}`;
      $$("[data-x]", c).forEach((b) => b.onclick = () => { const k = b.dataset.x; W.extras.has(k) ? W.extras.delete(k) : W.extras.add(k); W.obs = $("#wObs", c).value; reDesenha(); });
      $("#wObs", c).oninput = (e) => { W.obs = e.target.value; };
    }
    function passoFinal(c) {
      const val = valor(), p = petDe(W.petId);
      c.innerHTML = `<div class="secao-wiz"><h4>${modoOp ? "Pagamento" : "Como prefere pagar?"}</h4><div class="opcoes">${[["pix", "Pix", "pix", "Aprovação na hora"], ["cartao", "Cartão de crédito", "cartao", "em até 3x sem juros"], ["unidade", "Pagar na unidade", "casa", "no check-in ou retirada"]].map(([k, n, i, d]) => `<button class="opc ${W.pagamento === k ? "on" : ""}" data-pg="${k}"><span class="ag__ic" style="background:var(--line2)">${ico(i)}</span><b style="font-size:15px">${n}</b><small>${d}</small></button>`).join("")}</div></div>
        <div id="pgArea"></div>
        <div class="nav-wiz"><button class="b b--ghost" id="wVolta">${ico("voltar")}Voltar</button><button class="b" id="wFim">${ico("check")}${modoOp ? "Criar agendamento" : W.pagamento === "pix" ? "Já paguei, confirmar" : "Confirmar agendamento"} · ${brl(val)}</button></div>
        <p class="demo-aviso">Ambiente de demonstração: nenhum pagamento é processado de verdade.</p>`;
      const area = $("#pgArea", c);
      if (W.pagamento === "pix") { const cod = `00020126580014BR.GOV.BCB.PIX0136bichofeliz-${Date.now().toString(36)}5204000053039865406${val.toFixed(2)}5802BR5913BICHO FELIZ6005COTIA62070503***6304`; area.innerHTML = `<div class="pix"><div class="pix__qr" aria-label="QR Code Pix">${qr(cod)}</div><div><b>Pague ${brl(val)} com Pix</b><p class="muted" style="font-size:13px">Escaneie o QR Code ou copie o código.</p><code>${cod}</code><button class="b b--ghost b--sm" id="pgCopia">Copiar código</button></div></div>`; $("#pgCopia", c).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(cod).catch(() => {}); toast("Código Pix copiado"); }; }
      if (W.pagamento === "cartao") area.innerHTML = `<div class="grid2"><label class="f"><span>Número do cartão</span><input class="in" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="cc-number" /></label><label class="f"><span>Nome impresso</span><input class="in" autocomplete="cc-name" /></label><label class="f"><span>Validade</span><input class="in" placeholder="MM/AA" autocomplete="cc-exp" /></label><label class="f"><span>Parcelas</span><select class="in"><option>1x de ${brl(val)}</option><option>2x de ${brl(val / 2)}</option><option>3x de ${brl(val / 3)}</option></select></label></div>`;
      if (W.pagamento === "unidade") area.innerHTML = `<p class="muted" style="font-size:14px">Aceitamos Pix, cartão e dinheiro na recepção.</p>`;
      $$("[data-pg]", c).forEach((b) => b.onclick = () => { W.pagamento = b.dataset.pg; reDesenha(); });
      $("#wVolta", c).onclick = () => { W.passo--; desenha(); };
      $("#wFim", c).onclick = () => {
        if (!valido[3]()) { toast("Esse horário acabou de ser ocupado. Escolha outro.", "alerta"); W.passo = 3; desenha(); return; }
        const a = { id: BF.uid("a"), ...agendamentoRascunho(), donoId: W.donoId, hora: W.tipo === "banho" ? W.hora : undefined, prof: W.tipo === "banho" ? profEscolhido() : undefined, obs: W.obs.trim(), pagamento: W.pagamento, pago: !modoOp && W.pagamento !== "unidade", criado: hoje(), suite: null };
        a.valor = BF.calcularValor(a, p);
        a.status = modoOp ? "confirmado" : W.tipo === "banho" ? "confirmado" : "pendente";
        if (W.tipo !== "hotel") delete a.fim;
        if (W.comprarPacote) { let pk = pacote(); if (!pk) { pk = { id: BF.uid("pk"), donoId: W.donoId, tipo: "creche", saldo: 0, total: 10, compra: hoje() }; D.pacotes.push(pk); } pk.saldo += 10; pk.total = 10; pk.compra = hoje(); }
        if (W.pacote) { const pk = pacote(); if (pk) pk.saldo = Math.max(0, pk.saldo - 1); }
        if (modoOp && a.tipo === "hotel") a.suite = suiteLivre(a);
        D.agend.push(a); salvar();
        const S = SERVICOS[a.tipo];
        v.innerHTML = `<div class="card sucesso" style="max-width:560px;margin:20px auto"><div class="sucesso__ic">${ico("check")}</div><h3>${a.status === "pendente" ? "Pedido enviado!" : "Agendamento confirmado!"}</h3><p class="muted" style="margin:8px 0 18px">${S.nome} de <b>${esc(p.nome)}</b> · ${descAgend(a)}.<br />${a.status === "pendente" ? "A equipe confirma a vaga em até 2 horas e avisa pelo WhatsApp." : modoOp ? "O tutor recebe a confirmação no WhatsApp." : "Te esperamos! Você recebe um lembrete na véspera."}</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${modoOp ? `<a class="b" href="#/agenda">Ver agenda</a><a class="b b--ghost" href="#/novo">Novo agendamento</a>` : `<a class="b" href="#/agendamentos">Meus agendamentos</a><button class="b b--ghost" id="sIcs">${ico("cal")}Adicionar à agenda</button>`}</div></div>`;
        const ics = $("#sIcs", v); if (ics) ics.onclick = () => baixarICS(a);
        toast(a.status === "pendente" ? "Pedido enviado para a equipe" : "Agendamento confirmado");
        atualizaBadges();
      };
    }
    desenha();
  }
  function qr(txt) { let h = 0; for (const ch of txt) h = (h * 31 + ch.charCodeAt(0)) >>> 0; let out = ""; for (let i = 0; i < 441; i++) { const x = i % 21, y = (i / 21) | 0; const olho = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13); let on; if (olho) { const ox = x > 13 ? x - 14 : x, oy = y > 13 ? y - 14 : y; on = ox === 0 || ox === 6 || oy === 0 || oy === 6 || (ox > 1 && ox < 5 && oy > 1 && oy < 5); } else { h = (h * 1103515245 + 12345) >>> 0; on = (h >> 16) & 1; } out += `<i class="${on ? "" : "o"}"></i>`; } return out; }
  ROTAS.cliente.agendar = { titulo: "Novo agendamento", sub: () => "Leva menos de um minuto", render: (v, p) => assistente(v, p, false) };

  /* =====================================================================
     LOJA (cliente)
     ===================================================================== */
  const SVG_PROD = {
    shampoo: `<svg viewBox="0 0 200 200"><defs><linearGradient id="sg1" x1="0" x2="1"><stop offset="0" stop-color="#ffd9c2"/><stop offset=".5" stop-color="#fff2e8"/><stop offset="1" stop-color="#f6c3a4"/></linearGradient></defs><rect width="200" height="200" fill="#f6eee2"/><ellipse cx="100" cy="176" rx="46" ry="8" fill="#000" opacity=".12"/><rect x="84" y="28" width="32" height="22" rx="5" fill="#1f1a14"/><rect x="92" y="18" width="16" height="14" rx="3" fill="#3a3128"/><path d="M64 62c0-8 6-14 14-14h44c8 0 14 6 14 14v104c0 6-4 10-10 10H74c-6 0-10-4-10-10Z" fill="url(#sg1)"/><rect x="72" y="86" width="56" height="58" rx="10" fill="#fff"/><circle cx="100" cy="104" r="9" fill="#e26a2c"/><text x="100" y="128" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="10" fill="#1f1a14">bicho feliz</text><text x="100" y="139" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7" fill="#6f6458">hipoalergênico</text><rect x="70" y="56" width="8" height="100" rx="4" fill="#fff" opacity=".45"/></svg>`,
    guia: `<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="#eef3fb"/><ellipse cx="100" cy="170" rx="56" ry="8" fill="#000" opacity=".1"/><rect x="54" y="62" width="92" height="74" rx="37" fill="#3d7be0"/><rect x="62" y="70" width="76" height="58" rx="29" fill="#5a93ef"/><circle cx="100" cy="99" r="14" fill="#1f1a14"/><circle cx="100" cy="99" r="6" fill="#ffcf3f"/><path d="M78 136c-6 20-4 34 6 36" fill="none" stroke="#1f1a14" stroke-width="12" stroke-linecap="round"/><path d="M146 99c26 0 36-10 40-26" fill="none" stroke="#e26a2c" stroke-width="5" stroke-linecap="round"/><circle cx="186" cy="68" r="7" fill="none" stroke="#8a7f73" stroke-width="3"/></svg>`,
    tapete: `<svg viewBox="0 0 200 200"><defs><linearGradient id="tg1" x1="0" x2="1"><stop offset="0" stop-color="#cfe8d8"/><stop offset=".5" stop-color="#e9f6ee"/><stop offset="1" stop-color="#bfe0cb"/></linearGradient></defs><rect width="200" height="200" fill="#f1f7f2"/><ellipse cx="100" cy="172" rx="60" ry="8" fill="#000" opacity=".1"/><path d="M40 52h120l-6 116H46Z" fill="url(#tg1)"/><path d="M40 52h120l-2 14H42Z" fill="#2f7d4f"/><rect x="58" y="82" width="84" height="56" rx="10" fill="#fff"/><text x="100" y="104" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="15" fill="#2f7d4f">30 un</text><text x="100" y="120" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="8" fill="#6f6458">tapete higiênico</text><text x="100" y="131" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="7" fill="#6f6458">60 × 60 cm</text></svg>`,
  };
  const prodImg = (pr) => pr.svg ? SVG_PROD[pr.svg] : `<img src="${u(pr.img, 500)}" alt="${esc(pr.nome)}" loading="lazy" />`;
  const chaveCarrinho = () => "bf_carrinho_" + eu.id;
  const lerCarrinho = () => { try { return JSON.parse(localStorage.getItem(chaveCarrinho()) || "{}"); } catch (e) { return {}; } };
  const gravarCarrinho = (c) => { try { localStorage.setItem(chaveCarrinho(), JSON.stringify(c)); } catch (e) { /* */ } };
  const totalCarrinho = (c) => Object.entries(c).reduce((t, [id, q]) => { const p = db().produtos.find((x) => x.id === id); return t + (p ? p.preco * q : 0); }, 0);
  ROTAS.cliente.loja = {
    titulo: "Lojinha",
    sub: () => "Retire na recepção ou leve junto no check-out",
    render(v, params) {
      const D = db(), cats = ["Todos", ...new Set(D.produtos.map((p) => p.cat))];
      let cat = params.cat || "Todos", busca = "";
      const aba = params.aba || "produtos";
      if (aba === "pedidos") {
        const ped = D.pedidos.filter((p) => p.donoId === eu.id).sort((a, b) => b.criado.localeCompare(a.criado));
        v.innerHTML = `<div class="abas"><button data-ab="produtos">Produtos</button><button class="on">Meus pedidos (${ped.length})</button></div><div style="max-width:800px">${ped.length ? ped.map((p) => `<div class="card" style="margin-bottom:12px"><div class="card__h"><div><h3>Pedido ${codigo(p.id)}</h3><small class="muted">${fmtData(p.criado)} · ${{ retirada: "Retirar na recepção", checkout: "Junto com o check-out", entrega: "Entrega em casa" }[p.entrega]}</small></div>${statusTag(p.status, BF.STATUS_PEDIDO)}</div>${p.itens.map((it) => { const pr = D.produtos.find((x) => x.id === it.prodId); return `<div class="linha"><span class="av" style="overflow:hidden">${pr ? prodImg(pr) : ""}</span><div class="linha__t"><b>${it.qtd}× ${esc(pr ? pr.nome : "Produto")}</b></div><b>${brl(it.preco * it.qtd)}</b></div>`; }).join("")}<div class="res-total"><span class="muted">Total</span><b style="font-size:22px">${brl(p.total)}</b></div></div>`).join("") : `<div class="card vazio">${ico("loja")}<b>Nenhum pedido ainda</b></div>`}</div>`;
        $("[data-ab]", v).onclick = () => ir("loja");
        return;
      }
      v.innerHTML = `<div class="barra-ferr"><div class="abas" style="margin:0"><button class="on">Produtos</button><button data-ab="pedidos">Meus pedidos</button></div><div class="busca">${ico("busca")}<input class="in" id="lBusca" placeholder="Buscar produto" /></div></div><div class="chips" id="lCats" style="margin-bottom:16px"></div><div class="prods" id="lGrade"></div>`;
      const grade = $("#lGrade", v);
      function desenha() {
        let car = lerCarrinho();
        $("#lCats", v).innerHTML = cats.map((c) => `<button class="chip ${c === cat ? "on" : ""}" data-c="${c}">${c}</button>`).join("");
        const lista = D.produtos.filter((p) => (cat === "Todos" || p.cat === cat) && (!busca || p.nome.toLowerCase().includes(busca)));
        grade.innerHTML = lista.length ? lista.map((p) => `<article class="prod"><div class="prod__img">${prodImg(p)}<span class="tag">${p.cat}</span>${p.estoque <= 5 && p.estoque > 0 ? `<span class="tag ult">últimas ${p.estoque}</span>` : ""}</div><div class="prod__b"><b>${esc(p.nome)}</b><small>${esc(p.desc)}</small><div class="prod__p"><strong>${brl(p.preco)}</strong>${p.estoque <= 0 ? '<span class="tag">Esgotado</span>' : car[p.id] ? `<span class="qtd"><button data-menos="${p.id}" aria-label="Menos">${ico("menos")}</button><output>${car[p.id]}</output><button data-mais="${p.id}" aria-label="Mais">${ico("mais")}</button></span>` : `<button class="b b--sm b--ink" data-add="${p.id}">${ico("carrinho")}Adicionar</button>`}</div></div></article>`).join("") : `<div class="card vazio" style="grid-column:1/-1">${ico("busca")}<b>Nada encontrado</b></div>`;
        $$("[data-c]", v).forEach((b) => b.onclick = () => { cat = b.dataset.c; desenha(); });
        const muda = (id, d) => { const c = lerCarrinho(), p = D.produtos.find((x) => x.id === id); c[id] = Math.max(0, Math.min(p.estoque, (c[id] || 0) + d)); if (!c[id]) delete c[id]; gravarCarrinho(c); desenha(); fab(true); };
        $$("[data-add]", v).forEach((b) => b.onclick = () => { muda(b.dataset.add, 1); toast("Adicionado ao carrinho", "carrinho"); });
        $$("[data-mais]", v).forEach((b) => b.onclick = () => muda(b.dataset.mais, 1));
        $$("[data-menos]", v).forEach((b) => b.onclick = () => muda(b.dataset.menos, -1));
        fab();
      }
      function fab(pula) {
        $$(".carrinho-fab").forEach((x) => x.remove());
        const c = lerCarrinho(), n = Object.values(c).reduce((a, b) => a + b, 0); if (!n) return;
        const b = document.createElement("button"); b.className = "carrinho-fab" + (pula ? " pula" : ""); b.innerHTML = `${ico("carrinho")}Carrinho · ${brl(totalCarrinho(c))} <em>${n}</em>`; b.onclick = gaveta; document.body.appendChild(b);
      }
      function gaveta() {
        const c = lerCarrinho(), itens = Object.entries(c);
        const ag = db().agend.find((a) => a.donoId === eu.id && ["confirmado", "andamento", "pendente"].includes(a.status) && (a.tipo === "hotel" ? a.fim >= hoje() : a.ini >= hoje()));
        let entrega = ag ? "checkout" : "retirada", pag = "pix";
        const g = document.createElement("div"); g.className = "gaveta"; g.setAttribute("role", "dialog");
        const desenhaG = () => {
          const sub = totalCarrinho(lerCarrinho()), frete = entrega === "entrega" ? 12 : 0;
          g.innerHTML = `<div class="gaveta__h"><h3>Seu carrinho</h3><button class="ib" id="gX" aria-label="Fechar">${ico("x")}</button></div>
            <div class="gaveta__c">${Object.entries(lerCarrinho()).map(([id, q]) => { const p = D.produtos.find((x) => x.id === id); return `<div class="linha"><span class="av" style="overflow:hidden">${prodImg(p)}</span><div class="linha__t"><b>${esc(p.nome)}</b><small>${brl(p.preco)} cada</small></div><span class="qtd"><button data-gm="${id}" aria-label="Menos">${ico("menos")}</button><output>${q}</output><button data-gp="${id}" aria-label="Mais">${ico("mais")}</button></span></div>`; }).join("") || `<div class="vazio">${ico("carrinho")}<b>Carrinho vazio</b></div>`}
              <div class="secao-wiz" style="margin-top:16px"><h4>Como você quer receber?</h4><div class="chips">${ag ? `<button class="chip ${entrega === "checkout" ? "on" : ""}" data-e="checkout">Junto com ${esc(petDe(ag.petId).nome)} (${fmtCurta(ag.tipo === "hotel" ? ag.fim : ag.ini)})</button>` : ""}<button class="chip ${entrega === "retirada" ? "on" : ""}" data-e="retirada">Retirar na recepção</button><button class="chip ${entrega === "entrega" ? "on" : ""}" data-e="entrega">Entrega em casa <small>+ R$ 12</small></button></div></div>
              <div class="secao-wiz"><h4>Pagamento</h4><div class="chips"><button class="chip ${pag === "pix" ? "on" : ""}" data-pg="pix">${ico("pix")}Pix</button><button class="chip ${pag === "cartao" ? "on" : ""}" data-pg="cartao">${ico("cartao")}Cartão</button><button class="chip ${pag === "unidade" ? "on" : ""}" data-pg="unidade">Na retirada</button></div></div></div>
            <div class="gaveta__f"><div class="res-l"><span>Subtotal</span><b>${brl(sub)}</b></div>${frete ? `<div class="res-l"><span>Entrega</span><b>${brl(frete)}</b></div>` : ""}<div class="res-total" style="margin:0"><span class="muted">Total</span><b>${brl(sub + frete)}</b></div><button class="b b--blk" id="gFim" ${sub ? "" : "disabled"}>${ico("check")}Finalizar pedido</button></div>`;
          $("#gX", g).onclick = () => { g.remove(); render(); };
          const muda = (id, d) => { const cc = lerCarrinho(), p = D.produtos.find((x) => x.id === id); cc[id] = Math.max(0, Math.min(p.estoque, (cc[id] || 0) + d)); if (!cc[id]) delete cc[id]; gravarCarrinho(cc); desenhaG(); };
          $$("[data-gm]", g).forEach((b) => b.onclick = () => muda(b.dataset.gm, -1));
          $$("[data-gp]", g).forEach((b) => b.onclick = () => muda(b.dataset.gp, 1));
          $$("[data-e]", g).forEach((b) => b.onclick = () => { entrega = b.dataset.e; desenhaG(); });
          $$("[data-pg]", g).forEach((b) => b.onclick = () => { pag = b.dataset.pg; desenhaG(); });
          $("#gFim", g).onclick = () => {
            const cc = lerCarrinho(), its = Object.entries(cc).map(([id, q]) => ({ prodId: id, qtd: q, preco: D.produtos.find((x) => x.id === id).preco }));
            its.forEach((it) => { const p = D.produtos.find((x) => x.id === it.prodId); p.estoque = Math.max(0, p.estoque - it.qtd); });
            const total = its.reduce((t, it) => t + it.preco * it.qtd, 0) + (entrega === "entrega" ? 12 : 0);
            D.pedidos.push({ id: BF.uid("pd"), donoId: eu.id, itens: its, total: Math.round(total * 100) / 100, entrega, status: "novo", criado: hoje(), pagamento: pag });
            salvar(); gravarCarrinho({}); g.remove(); toast("Pedido feito! Avisamos quando estiver separado."); ir("loja?aba=pedidos");
          };
        };
        desenhaG(); document.body.appendChild(g);
      }
      $("#lBusca", v).oninput = (e) => { busca = e.target.value.trim().toLowerCase(); desenha(); };
      $("[data-ab]", v).onclick = () => ir("loja?aba=pedidos");
      desenha();
    },
  };

  /* expõe o que a área da equipe usa */
  window.BFApp = { codigo, ROTAS, $, $$, esc, ico, toast, modal, fecharModal, cabModal, confirmar, statusTag, petDe, userDe, petImg, iniciais, icServ, descAgend, nomeExtra, cardAgend, ligaAgend, detalheAgend, assistente, formPet, postHTML, prodImg, render, ir, resetDemo, suiteLivre, get eu() { return eu; } };
  addEventListener("DOMContentLoaded", render);
})();
