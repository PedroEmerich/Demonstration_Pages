/* Camada de vidro: brilho no cursor, luz das seções escuras e assinatura do rodapé */
(() => {
  const fino = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cards = document.querySelectorAll(".tabs__panel, .deadlines li, .checklist__result, .form-card");
  cards.forEach((c) => {
    const b = document.createElement("span"); b.className = "vidro-brilho"; b.setAttribute("aria-hidden", "true"); c.prepend(b);
    if (fino) c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); });
  });
  const escuras = document.querySelectorAll(".section--dark, .site-footer");
  if (fino && !reduz) addEventListener("pointermove", (e) => {
    escuras.forEach((s) => { const r = s.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; s.style.setProperty("--lx", ((e.clientX - r.left) / r.width) * 60 + 20 + "%"); s.style.setProperty("--ly", ((e.clientY - r.top) / r.height) * 60 + 20 + "%"); });
  }, { passive: true });
  const marca = document.querySelector(".vidro-marca");
  if (!marca) return;
  const enche = () => {
    const r = marca.getBoundingClientRect(), y = scrollY;
    if (r.top < innerHeight) { const ini = y + r.top - innerHeight, fim = document.documentElement.scrollHeight - innerHeight; marca.style.setProperty("--fill", Math.min(1, Math.max(0, (y - ini) / Math.max(1, fim - ini))) * 100 + "%"); }
  };
  addEventListener("scroll", enche, { passive: true }); enche();
})();
