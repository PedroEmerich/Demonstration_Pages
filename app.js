(function () {
  const E = window.ESTUDIO || {};
  const MODELOS = window.MODELOS || [];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const capa = (m, tipo = "capa") => `modelos/${m.pasta}/${tipo}.jpg`;
  const linkVer = (m) => `ver.html?m=${encodeURIComponent(m.pasta)}`;
  const pagina = (m) => m.url || `modelos/${m.pasta}/index.html`;

  /* ---------- Dados do estúdio ---------- */
  const whatsUrl = (msg) =>
    `https://wa.me/${E.whatsapp}?text=${encodeURIComponent(msg || "Olá! Vi o catálogo de landing pages e gostaria de um orçamento.")}`;

  $$("[data-estudio='nome']").forEach((el) => (el.textContent = E.nome));
  $$("[data-whats]").forEach((el) => { el.href = whatsUrl(); el.target = "_blank"; el.rel = "noopener"; });
  $$("[data-email]").forEach((el) => (el.href = `mailto:${E.email}`));
  $$("[data-insta]").forEach((el) => (el.href = `https://instagram.com/${E.instagram}`));
  $$("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $$("[data-count-modelos]").forEach((el) => (el.textContent = String(MODELOS.length).padStart(2, "0")));
  if (E.nome) document.title = `${document.title} — ${E.nome}`;

  const nav = $(".nav");
  const onScroll = () => nav?.classList.toggle("is-scrolled", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Imagens do objeto da história (index) ---------- */
  $$(".morph img[data-modelo]").forEach((img) => {
    const m = MODELOS[+img.dataset.modelo % Math.max(MODELOS.length, 1)];
    if (!m) return;
    img.src = capa(m, img.dataset.tipo);
    const url = img.closest(".face")?.querySelector("[data-face-url]");
    if (url) url.textContent = `${m.pasta}.com.br`;
  });

  /* ---------- Vitrine em fileiras (index) ---------- */
  $$(".row__track").forEach((track, r) => {
    if (!MODELOS.length) return track.closest(".rows")?.remove();
    // segunda fileira começa em outro ponto para não repetir a primeira
    const base = MODELOS.map((_, i) => MODELOS[(i + r * Math.ceil(MODELOS.length / 2)) % MODELOS.length]);
    const tile = (m) => `
      <a class="tile" href="${linkVer(m)}" data-view>
        <img src="${esc(capa(m))}" alt="Prévia de ${esc(m.titulo)}" loading="lazy" data-titulo="${esc(m.titulo)}" data-cor="${esc(m.cor || "")}" />
        <div class="tile__info"><strong>${esc(m.titulo)}</strong><span>${esc(m.segmento || "")}</span></div>
      </a>`;
    // repete até ter largura suficiente e duplica para o loop infinito
    let lista = [...base];
    while (lista.length < 8) lista = lista.concat(base);
    track.innerHTML = lista.map(tile).join("") + lista.map(tile).join("");
    // capa ainda não gerada: mostra um bloco com o nome do modelo na cor dele
    $$("img", track).forEach((img) => img.addEventListener("error", () => {
      const ph = document.createElement("div");
      const c = img.dataset.cor || "#333";
      ph.className = "tile__ph";
      ph.style.cssText = `width:100%;height:100%;display:grid;place-items:center;padding:24px;text-align:center;font-weight:700;font-size:18px;line-height:1.25;color:#fff;background:radial-gradient(circle at 30% 20%,color-mix(in srgb,${c} 70%,#fff),${c} 60%,#000)`;
      ph.textContent = img.dataset.titulo;
      img.replaceWith(ph);
    }, { once: true }));
  });

  /* ---------- Catálogo (catalogo.html) ---------- */
  const grid = $("#grid");
  if (!grid) return;
  const empty = $("#empty");
  const filtersEl = $(".filters");
  const segmentos = ["Todos", ...new Set(MODELOS.map((m) => m.segmento).filter(Boolean))];
  let ativo = "Todos";

  function renderFiltros() {
    if (segmentos.length <= 2) { filtersEl.hidden = true; return; }
    filtersEl.innerHTML = segmentos.map((s) => {
      const n = s === "Todos" ? MODELOS.length : MODELOS.filter((m) => m.segmento === s).length;
      return `<button class="chip" role="tab" aria-selected="${s === ativo}" data-seg="${esc(s)}">${esc(s)}<small>${n}</small></button>`;
    }).join("");
  }
  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    ativo = b.dataset.seg;
    renderFiltros();
    renderGrid();
  });

  function card(m) {
    return `
      <a class="card" href="${linkVer(m)}" style="${m.cor ? `--c:${esc(m.cor)}` : ""}">
        <div class="thumb">
          <div class="thumb__bar"><i></i><i></i><i></i></div>
          <img src="${esc(m.capa || capa(m))}" alt="" loading="lazy" data-fallback="${esc(pagina(m))}" />
          <div class="thumb__hover"><span>Ver página completa →</span></div>
        </div>
        <div class="card__body">
          <div class="card__top">
            <span class="card__seg">${esc(m.segmento || "Modelo")}</span>
            ${m.novo ? `<span class="badge">Novo</span>` : ""}
          </div>
          <h3>${esc(m.titulo)}</h3>
          ${m.descricao ? `<p>${esc(m.descricao)}</p>` : ""}
          ${m.tags?.length ? `<div class="tags">${m.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
        </div>
      </a>`;
  }

  // Sem capa.jpg? usa a própria página em miniatura (iframe escalado)
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) e.target.style.setProperty("--s", e.contentRect.width / 1440);
  });
  function fallbackIframe(img) {
    const f = document.createElement("iframe");
    f.className = "thumb__frame";
    f.src = img.dataset.fallback;
    f.tabIndex = -1;
    f.setAttribute("scrolling", "no");
    const thumb = img.parentElement;
    img.replaceWith(f);
    ro.observe(thumb);
  }

  function renderGrid() {
    const lista = ativo === "Todos" ? MODELOS : MODELOS.filter((m) => m.segmento === ativo);
    grid.innerHTML = lista.map(card).join("");
    empty.hidden = MODELOS.length > 0;
    $$(".thumb img", grid).forEach((img) => {
      img.addEventListener("error", () => fallbackIframe(img), { once: true });
    });
  }

  renderFiltros();
  renderGrid();
})();
