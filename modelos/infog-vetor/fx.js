/*
 * Vetor — camada de interações (scroll e cursor).
 * Tudo aqui é decorativo: sem este arquivo, ou com "reduzir movimento" ligado,
 * a página continua completa. Ideia central: a tipografia variável e a grade
 * suíça respondem ao visitante.
 *
 *  - Hero: as letras do título se alargam e engrossam perto do cursor
 *    (eixos de largura e peso da Archivo), sobre uma grade de 12 colunas.
 *  - Índices gigantes vazados em cada seção, que se esticam com a rolagem.
 *  - Cursor em "difference" que inverte o que passa por baixo.
 *  - Faixa de segmentos guiada pela velocidade e direção da rolagem.
 *  - Barra de progresso no cabeçalho e preenchimento que nasce do ponto
 *    onde o cursor entrou nos cartões.
 */
(() => {
  'use strict';

  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = window.matchMedia('(min-width: 1080px)');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  document.documentElement.classList.add('fx');

  const pointer = { x: -9999, y: -9999, inside: false };
  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });

  /* Hero: título elástico ------------------------------------------------ */

  const hero = $('.hero');
  const h1 = hero && $('h1', hero);
  if (h1 && fine) {
    const originalHTML = h1.innerHTML;
    const label = h1.textContent.replace(/\s+/g, ' ').trim();
    const BASE = { wdth: 112, wght: 800 };
    const MAX = { wdth: 125, wght: 900 };
    let chars = [];
    let built = false;

    // Palavras do título, marcando as que estão dentro do <mark>.
    const tokens = [];
    h1.childNodes.forEach((node) => {
      const marked = node.nodeName === 'MARK';
      node.textContent.split(/\s+/).filter(Boolean).forEach((word) => tokens.push({ word, marked }));
    });

    const wordHTML = (word) => `<span class="fx-word">${[...word].map((c) => `<span class="fx-ch">${c}</span>`).join('')}</span>`;

    // Monta o título em linhas fixas (as mesmas quebras do layout original),
    // para que letras mais largas nunca empurrem palavras para outra linha.
    const build = () => {
      h1.innerHTML = `<span class="sr-only">${label}</span><span class="fx-type" aria-hidden="true">${tokens.map((t) => wordHTML(t.word)).join(' ')}</span>`;
      const words = $$('.fx-word', h1);
      const lines = [];
      words.forEach((el, i) => {
        const top = Math.round(el.offsetTop);
        if (!lines.length || Math.abs(lines[lines.length - 1].top - top) > 4) lines.push({ top, items: [] });
        lines[lines.length - 1].items.push(tokens[i]);
      });
      const lineHTML = (items) => {
        let html = '';
        let inMark = false;
        items.forEach((t, i) => {
          if (t.marked && !inMark) {
            html += '<mark>';
            inMark = true;
          }
          if (!t.marked && inMark) {
            html += '</mark>';
            inMark = false;
          }
          html += (i ? ' ' : '') + wordHTML(t.word);
        });
        return html + (inMark ? '</mark>' : '');
      };
      $('.fx-type', h1).innerHTML = lines.map((l) => `<span class="fx-line">${lineHTML(l.items)}</span>`).join('');
      chars = $$('.fx-ch', h1).map((el) => ({ el, x: 0, y: 0, f: 0 }));
      measure();
      built = true;
    };

    const measure = () => {
      const box = h1.getBoundingClientRect();
      chars.forEach((c) => {
        const r = c.el.getBoundingClientRect();
        c.x = r.left - box.left + r.width / 2;
        c.y = r.top - box.top + r.height / 2;
      });
    };

    const restore = () => {
      h1.innerHTML = originalHTML;
      chars = [];
      built = false;
    };

    const sync = () => (wide.matches ? build() : restore());
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      // Volta ao original para medir as quebras de linha na nova largura.
      resizeTimer = setTimeout(() => {
        restore();
        sync();
      }, 150);
    });
    document.fonts.ready.then(sync);

    const SIGMA = 120;
    const tick = () => {
      if (built) {
        const box = h1.getBoundingClientRect();
        const active = pointer.inside && pointer.y > box.top - 160 && pointer.y < box.bottom + 160;
        chars.forEach((c) => {
          let target = 0;
          if (active) {
            const dx = pointer.x - box.left - c.x;
            const dy = (pointer.y - box.top - c.y) * 1.4;
            target = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
          }
          const next = lerp(c.f, target, 0.14);
          if (Math.abs(next - c.f) > 0.002 || (target === 0 && c.f !== 0 && next < 0.002)) {
            c.f = next < 0.002 ? 0 : next;
            c.el.style.fontStretch = `${(BASE.wdth + (MAX.wdth - BASE.wdth) * c.f).toFixed(1)}%`;
            c.el.style.fontWeight = Math.round(BASE.wght + (MAX.wght - BASE.wght) * c.f);
          }
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* Hero: grade suíça de 12 colunas ------------------------------------- */

  if (hero) {
    const grid = document.createElement('div');
    grid.className = 'fx-grid';
    grid.setAttribute('aria-hidden', 'true');
    grid.innerHTML = '<i></i>'.repeat(12);
    hero.prepend(grid);
  }

  /* Cursor "difference" -------------------------------------------------- */

  if (fine) {
    const dot = document.createElement('div');
    dot.className = 'fx-cursor';
    dot.setAttribute('aria-hidden', 'true');
    document.body.append(dot);
    const pos = { x: -100, y: -100, s: 1 };
    let scale = 1;
    document.addEventListener('pointerover', (event) => {
      const t = event.target;
      if (t.closest('input:not([type="radio"]):not([type="checkbox"]), textarea, select')) scale = 0.35;
      else if (t.closest('a[href], button, summary, label, [role="tab"]')) scale = 3.2;
      else scale = 1;
    });
    const tick = () => {
      pos.x = lerp(pos.x, pointer.x, 0.22);
      pos.y = lerp(pos.y, pointer.y, 0.22);
      pos.s = lerp(pos.s, scale, 0.18);
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${pos.s.toFixed(3)})`;
      dot.classList.toggle('is-hidden', !pointer.inside);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* Índices gigantes vazados por seção ----------------------------------- */

  const indices = [];
  $$('main > .section').forEach((section) => {
    const label = $('.section-head .num-label', section);
    const match = label && label.textContent.match(/^\s*(\d{2})/);
    const container = $(':scope > .container', section);
    // No FAQ a coluna da direita é ocupada pelas perguntas: sem índice ali.
    if (!match || !container || container.classList.contains('faq-layout')) return;
    const index = document.createElement('span');
    index.className = 'fx-index';
    index.setAttribute('aria-hidden', 'true');
    index.textContent = match[1];
    container.classList.add('fx-has-index');
    container.prepend(index);
    indices.push({ section, index });
  });

  /* Barra de progresso no cabeçalho -------------------------------------- */

  const header = $('.site-header');
  const bar = document.createElement('span');
  bar.className = 'fx-progress';
  bar.setAttribute('aria-hidden', 'true');
  header?.append(bar);

  /* Faixa de segmentos guiada pela rolagem -------------------------------- */

  const marquee = $('.marquee');
  const firstTrack = marquee && $('.marquee__track', marquee);
  let velocity = 0;
  let lastY = window.scrollY;
  let lastT = performance.now();

  if (marquee && firstTrack) {
    let x = 0;
    let running = false;
    let prev = 0;
    const frame = (now) => {
      if (!running) return;
      const dt = Math.min((now - prev) / 1000 || 0, 0.05);
      prev = now;
      velocity *= 0.92; // a velocidade da rolagem vai se dissipando
      const speed = 55 + velocity * 0.55;
      const width = firstTrack.offsetWidth;
      x -= speed * dt;
      if (x <= -width) x += width;
      if (x > 0) x -= width;
      const skew = clamp(-velocity * 0.006, -10, 10);
      marquee.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      requestAnimationFrame(frame);
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        prev = performance.now();
        requestAnimationFrame(frame);
      } else if (!entry.isIntersecting) running = false;
    }).observe(marquee.parentElement);
  }

  /* Rolagem: progresso, índices e velocidade ----------------------------- */

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;

    indices.forEach(({ section, index }) => {
      const r = section.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      index.style.fontStretch = `${(75 + p * 50).toFixed(1)}%`;
      index.style.translate = `0 ${((0.5 - p) * 90).toFixed(1)}px`;
    });

    const now = performance.now();
    const dy = window.scrollY - lastY;
    const dt = Math.max(now - lastT, 16);
    velocity = lerp(velocity, (dy / dt) * 1000, 0.35);
    lastY = window.scrollY;
    lastT = now;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Preenchimento que nasce do ponto de entrada do cursor ---------------- */

  if (fine) {
    $$('.reasons li, .case').forEach((card) => {
      const place = (event) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - r.left}px`);
        card.style.setProperty('--my', `${event.clientY - r.top}px`);
      };
      card.addEventListener('pointerenter', place);
      card.addEventListener('pointerleave', place);
    });
  }
})();
