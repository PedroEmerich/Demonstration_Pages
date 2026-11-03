/* ==========================================================================
   Creass — Reumatologia e Especialidades Médicas
   Interações da landing page (JavaScript puro, sem dependências)
   ========================================================================== */
(() => {
  'use strict';

  // Dados editáveis da clínica
  const CONFIG = {
    whatsapp: '5511933771629',
    timeZone: 'America/Sao_Paulo',
    // Minutos desde 00:00 → [abre, fecha]. 0 = domingo … 6 = sábado
    hours: {
      1: [8 * 60, 17 * 60],
      2: [8 * 60, 17 * 60],
      3: [8 * 60, 17 * 60],
      4: [8 * 60, 17 * 60],
      5: [8 * 60 + 30, 17 * 60]
    }
  };

  const root = document.documentElement;
  const body = document.body;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const state = {
    y: window.scrollY,
    vy: 0,
    vw: window.innerWidth,
    vh: window.innerHeight,
    mx: window.innerWidth / 2,
    my: window.innerHeight / 2,
    pointer: false
  };

  /* ---------- Loop de animação e medições ---------- */
  const tickers = [];
  const resizers = [];
  const onTick = fn => tickers.push(fn);
  const onResize = fn => resizers.push(fn);

  let lastTime = performance.now();
  let prevY = state.y;
  function loop(now) {
    const dt = Math.min(64, now - lastTime);
    lastTime = now;
    state.y = window.scrollY;
    state.vy = lerp(state.vy, state.y - prevY, 0.2);
    prevY = state.y;
    for (let i = 0; i < tickers.length; i++) tickers[i](now, dt);
    requestAnimationFrame(loop);
  }

  function measure() {
    state.vw = window.innerWidth;
    state.vh = window.innerHeight;
    state.y = window.scrollY;
    for (let i = 0; i < resizers.length; i++) resizers[i]();
  }
  let measureRaf = 0;
  const requestMeasure = () => {
    cancelAnimationFrame(measureRaf);
    measureRaf = requestAnimationFrame(measure);
  };

  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[creass] ${name}:`, err); }
  };

  const nextFrame = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

  /* ---------- Texto dividido em palavras (títulos) ---------- */
  function splitWords(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    let index = 0;
    const walk = (src, dest) => {
      src.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split(/(\s+)/).forEach((part, i) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              dest.appendChild(document.createTextNode(' '));
              return;
            }
            const word = document.createElement('span');
            word.className = 'w';
            word.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.className = 'w-i';
            inner.textContent = part;
            inner.style.setProperty('--i', index++);
            word.appendChild(inner);
            // Pontuação colada a um elemento (ex.: "<em>integrado</em>,") não pode quebrar de linha sozinha
            const prev = dest.lastChild;
            if (i === 0 && prev && prev.nodeType === Node.ELEMENT_NODE && prev.tagName !== 'BR') {
              const glue = document.createElement('span');
              glue.className = 'nw';
              dest.replaceChild(glue, prev);
              glue.append(prev, word);
            } else {
              dest.appendChild(word);
            }
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'BR') {
            dest.appendChild(document.createElement('br'));
            return;
          }
          const clone = node.cloneNode(false);
          dest.appendChild(clone);
          walk(node, clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('aria-label', label);
  }

  /* ---------- Abertura ---------- */
  function revealHero() {
    root.classList.add('is-ready');
    nextFrame(() => $$('[data-split="hero"]').forEach(el => el.classList.add('is-in')));
  }

  function initIntro() {
    const intro = $('.intro');
    if (!intro || reduce || root.classList.contains('intro-skip')) {
      root.classList.add('intro-gone');
      revealHero();
      return;
    }
    try { sessionStorage.setItem('creass:intro', '1'); } catch (e) { /* sem storage */ }

    const counter = $('[data-intro-count]', intro);
    const start = performance.now();
    const duration = 1300;
    const step = now => {
      const t = clamp((now - start) / duration);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      if (counter) counter.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      root.classList.add('intro-out');
      setTimeout(revealHero, 380);
      setTimeout(() => root.classList.add('intro-gone'), 1300);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Revelações ao rolar ---------- */
  function initReveal() {
    $$('[data-stagger]').forEach(group => {
      $$(':scope > [data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', i * 90));
    });

    const targets = $$('[data-reveal], [data-split]:not([data-split="hero"]), [data-wordmark]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    targets.forEach(el => io.observe(el));
  }

  /* ---------- Tema por seção + indicador lateral ---------- */
  function initTheme() {
    const sections = $$('main [data-theme], footer[data-theme]');
    const meta = $('meta[name="theme-color"]');
    const hudIdx = $('[data-hud-idx]');
    const hudName = $('[data-hud-name]');
    const colors = { light: '#F7F2EE', rose: '#F6E4E3', dark: '#2A2A2A', wine: '#7E0F17' };
    const active = new Set();
    let current = null;

    const apply = el => {
      if (!el || el === current) return;
      current = el;
      const theme = el.dataset.theme;
      if (body.dataset.theme !== theme) {
        body.dataset.theme = theme;
        if (meta) meta.setAttribute('content', colors[theme] || colors.light);
      }
      if (hudIdx && el.dataset.hud) {
        hudIdx.textContent = el.dataset.hud;
        hudName.textContent = el.dataset.hudName || '';
      }
    };

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      apply([...active].pop());
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    sections.forEach(el => io.observe(el));
  }

  /* ---------- Header e menu ---------- */
  function initHeader() {
    const header = $('.header');
    const btn = $('.menu-btn');
    const menu = $('#menu');
    let lastY = state.y;
    let hidden = false;
    let scrolled = false;
    let open = false;

    $$('.nav__link').forEach(link => {
      const text = link.textContent.trim();
      const span = document.createElement('span');
      span.textContent = text;
      span.dataset.text = text;
      link.textContent = '';
      link.appendChild(span);
    });

    onTick(() => {
      const y = state.y;
      const isScrolled = y > 24;
      if (isScrolled !== scrolled) {
        scrolled = isScrolled;
        header.classList.toggle('is-scrolled', scrolled);
      }
      if (Math.abs(y - lastY) > 8) {
        const hide = y > lastY && y > state.vh * 0.6 && !open;
        if (hide !== hidden) {
          hidden = hide;
          header.classList.toggle('is-hidden', hidden);
        }
        lastY = y;
      }
    });

    if (!btn || !menu) return;
    menu.hidden = false;

    const setOpen = value => {
      open = value;
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      if (open) {
        header.classList.remove('is-hidden');
        hidden = false;
        setTimeout(() => $('.menu__link', menu)?.focus({ preventScroll: true }), 350);
      }
    };

    btn.addEventListener('click', () => setOpen(!open));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        btn.focus();
      }
    });
    matchMedia('(min-width: 1024px)').addEventListener?.('change', e => {
      if (e.matches && open) setOpen(false);
    });
  }

  /* ---------- Cursor personalizado ---------- */
  function initCursor() {
    if (!fine) return;
    const cursor = $('.cursor');
    if (!cursor) return;
    const ring = $('.cursor__ring', cursor);
    const dot = $('.cursor__dot', cursor);
    const labelLayer = $('.cursor-label');
    const label = $('span', labelLayer);
    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');

    let rx = state.mx;
    let ry = state.my;
    let shown = false;
    const interactive = 'a, button, summary, label, [data-cursor]';

    window.addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      state.mx = e.clientX;
      state.my = e.clientY;
      state.pointer = true;
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!shown) {
        shown = true;
        rx = e.clientX;
        ry = e.clientY;
        cursor.classList.remove('is-hidden');
        labelLayer.classList.remove('is-hidden');
      }
    }, { passive: true });

    document.addEventListener('mouseout', e => {
      if (!e.relatedTarget) {
        shown = false;
        state.pointer = false;
        cursor.classList.add('is-hidden');
        labelLayer.classList.add('is-hidden');
      }
    });

    document.addEventListener('pointerover', e => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const native = target.closest('input[type="text"], input[type="email"], input[type="tel"], textarea, iframe');
      cursor.classList.toggle('is-native', Boolean(native));
      labelLayer.classList.toggle('is-hidden', Boolean(native));
      const hit = target.closest(interactive);
      const text = hit?.closest('[data-cursor]')?.dataset.cursor;
      if (text) {
        label.textContent = text;
        labelLayer.classList.add('is-on');
        cursor.classList.add('has-label');
        cursor.classList.remove('is-hover');
      } else {
        labelLayer.classList.remove('is-on');
        cursor.classList.remove('has-label');
        cursor.classList.toggle('is-hover', Boolean(hit));
      }
    });

    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));

    onTick(() => {
      if (!shown) return;
      const k = reduce ? 1 : 0.2;
      rx = lerp(rx, state.mx, k);
      ry = lerp(ry, state.my, k);
      const t = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      ring.style.transform = t;
      labelLayer.style.transform = t;
    });
  }

  /* ---------- Botões magnéticos e preenchimento a partir do ponteiro ---------- */
  function initButtons() {
    $$('.btn').forEach(btn => {
      const setOrigin = e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--fx', `${e.clientX - r.left}px`);
        btn.style.setProperty('--fy', `${e.clientY - r.top}px`);
      };
      btn.addEventListener('pointerenter', setOrigin);
      btn.addEventListener('pointerleave', setOrigin);
    });

    if (!fine || reduce) return;
    $$('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      const inner = $('.btn__label', el);
      let tx = 0;
      let ty = 0;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - tx;
        const cy = r.top + r.height / 2 - ty;
        tx = (e.clientX - cx) * strength;
        ty = (e.clientY - cy) * strength;
        el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
        if (inner) inner.style.transform = `translate3d(${(tx * 0.4).toFixed(2)}px, ${(ty * 0.4).toFixed(2)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => {
        tx = 0;
        ty = 0;
        el.style.transform = '';
        if (inner) inner.style.transform = '';
      });
    });
  }

  /* ---------- Faixa contínua que reage à velocidade da rolagem ---------- */
  function initMarquee() {
    const el = $('.marquee');
    if (!el) return;
    const track = $('.marquee__track', el);
    let x = 0, half = 0, dir = -1, skew = 0, visible = true;

    onResize(() => { half = track.scrollWidth / 2; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(el);
    }
    if (reduce) return;

    onTick((now, dt) => {
      if (!visible || !half) return;
      const v = state.vy;
      if (Math.abs(v) > 0.6) dir = v > 0 ? -1 : 1;
      const speed = (0.5 + Math.min(Math.abs(v) * 0.4, 16)) * (dt / 16.67);
      x += speed * dir;
      if (x <= -half) x += half;
      else if (x > 0) x -= half;
      skew = lerp(skew, clamp(-v * 0.3, -8, 8), 0.12);
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    });
  }

  /* ---------- Manifesto: palavras acendem conforme a rolagem ---------- */
  function initManifesto() {
    const el = $('[data-words]');
    if (!el) return;
    const words = [];
    const walk = (src, dest) => {
      src.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              dest.appendChild(document.createTextNode(' '));
              return;
            }
            const span = document.createElement('span');
            span.className = 'mw';
            span.textContent = part;
            dest.appendChild(span);
            words.push(span);
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const clone = node.cloneNode(false);
          dest.appendChild(clone);
          walk(node, clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);

    if (reduce) return;
    let top = 0, height = 0, last = -1;
    onResize(() => {
      const r = el.getBoundingClientRect();
      top = r.top + state.y;
      height = r.height;
      last = -1;
    });
    onTick(() => {
      const start = top - state.vh * 0.82;
      const end = top + height - state.vh * 0.42;
      const p = clamp((state.y - start) / (end - start));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const n = words.length;
      const soft = 6;
      for (let i = 0; i < n; i++) {
        const o = clamp((p * (n + soft) - i) / soft);
        words[i].style.opacity = (0.16 + o * 0.84).toFixed(3);
      }
    });
  }

  /* ---------- Contadores estilo odômetro ---------- */
  function initOdometers() {
    $$('[data-odometer]').forEach(el => {
      const text = el.textContent.trim();
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      const vis = document.createElement('span');
      vis.className = 'odo';
      vis.setAttribute('aria-hidden', 'true');
      let k = 0;
      for (const ch of text) {
        if (/\d/.test(ch)) {
          const col = document.createElement('span');
          col.className = 'odo__col';
          const strip = document.createElement('span');
          strip.className = 'odo__strip';
          for (let r = 0; r < 20; r++) {
            const d = document.createElement('span');
            d.textContent = String(r % 10);
            strip.appendChild(d);
          }
          strip.style.setProperty('--t', 10 + Number(ch));
          strip.style.setProperty('--k', k++);
          col.appendChild(strip);
          vis.appendChild(col);
        } else {
          const sym = document.createElement('span');
          sym.className = 'odo__sym';
          sym.textContent = ch;
          vis.appendChild(sym);
        }
      }
      el.textContent = '';
      el.append(sr, vis);
    });
  }

  /* ---------- Cards: holofote e linhas que acendem perto do cursor ---------- */
  function initCards() {
    const grid = $('.cards');
    if (!grid || !fine) return;
    const cards = $$('.card', grid);
    grid.addEventListener('pointermove', e => {
      const r = grid.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      for (const card of cards) {
        card.style.setProperty('--x', `${x - card.offsetLeft}px`);
        card.style.setProperty('--y', `${y - card.offsetTop}px`);
      }
    });
    grid.addEventListener('pointerenter', () => grid.classList.add('is-active'));
    grid.addEventListener('pointerleave', () => grid.classList.remove('is-active'));
  }

  /* ---------- Especialidades: preenchimento a partir da direção de entrada ---------- */
  function initSpecs() {
    $$('.spec').forEach(el => {
      const update = (e, enter) => {
        const r = el.getBoundingClientRect();
        const fromTop = e.clientY < r.top + r.height / 2;
        el.style.setProperty('--origin', fromTop ? '0%' : '100%');
        el.classList.toggle('is-hover', enter);
      };
      el.addEventListener('pointerenter', e => update(e, true));
      el.addEventListener('pointerleave', e => update(e, false));
    });
  }

  /* ---------- Jornada: rolagem horizontal fixada ---------- */
  function initJourney() {
    const section = $('.journey');
    if (!section) return;
    const track = $('.journey__track', section);
    const bar = $('.journey__bar i', section);
    const current = $('[data-journey-current]', section);
    const steps = $$('.step', section);
    const mq = matchMedia('(min-width: 900px) and (min-height: 560px)');
    let enabled = false, top = 0, dist = 0, active = -1, inside = false;

    const setActive = i => {
      if (i === active) return;
      active = i;
      steps.forEach((step, k) => step.classList.toggle('is-active', k === i));
      if (current) current.textContent = String(i + 1).padStart(2, '0');
    };

    onResize(() => {
      enabled = mq.matches && !reduce;
      root.classList.toggle('journey-pinned', enabled);
      if (!enabled) {
        section.style.height = '';
        track.style.transform = '';
        steps.forEach(step => step.classList.add('is-active'));
        active = -1;
        inside = false;
        root.classList.remove('in-journey');
        return;
      }
      dist = Math.max(0, track.scrollWidth - state.vw);
      section.style.height = `${Math.round(state.vh + dist)}px`;
      top = section.getBoundingClientRect().top + state.y;
      active = -1;
    });

    onTick(() => {
      if (!enabled) return;
      const p = clamp((state.y - top) / (dist || 1));
      track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      setActive(Math.round(p * (steps.length - 1)));
      // Esconde o HUD lateral enquanto os cards atravessam a tela de ponta a ponta
      const isInside = state.y > top - state.vh * 0.3 && state.y < top + dist + state.vh * 0.3;
      if (isInside !== inside) {
        inside = isInside;
        root.classList.toggle('in-journey', inside);
      }
    });
  }

  /* ---------- Médica: mostrador que gira com a rolagem e inclina com o cursor ---------- */
  function initDial() {
    const dial = $('.dial');
    if (!dial) return;
    const ticks = $('.dial__ticks', dial);
    const outer = $('.dial__outer', dial);
    const mid = $('.dial__mid', dial);
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const major = i % 10 === 0;
      const r1 = 170;
      const r2 = major ? 184 : 177;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', (200 + Math.cos(a) * r1).toFixed(2));
      line.setAttribute('y1', (200 + Math.sin(a) * r1).toFixed(2));
      line.setAttribute('x2', (200 + Math.cos(a) * r2).toFixed(2));
      line.setAttribute('y2', (200 + Math.sin(a) * r2).toFixed(2));
      if (major) line.classList.add('is-major');
      ticks.appendChild(line);
    }
    if (reduce) return;

    let top = 0, height = 0, cxDoc = 0, cyDoc = 0, visible = false, rx = 0, ry = 0;
    onResize(() => {
      const r = dial.getBoundingClientRect();
      top = r.top + state.y;
      height = r.height;
      cxDoc = r.left + r.width / 2;
      cyDoc = top + height / 2;
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(dial);
    }
    onTick(now => {
      if (!visible) return;
      const p = (state.y + state.vh - top) / (state.vh + height);
      ticks.style.transform = `rotate(${(p * 80).toFixed(2)}deg)`;
      outer.style.transform = `rotate(${(-p * 50).toFixed(2)}deg)`;
      mid.style.transform = `rotate(${(now * 0.012 + p * 120).toFixed(2)}deg)`;
      if (fine) {
        const dx = (state.mx - cxDoc) / state.vw;
        const dy = (state.my - (cyDoc - state.y)) / state.vh;
        rx = lerp(rx, clamp(-dy * 16, -12, 12), 0.06);
        ry = lerp(ry, clamp(dx * 16, -12, 12), 0.06);
        dial.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      }
    });
  }

  /* ---------- FAQ com abertura suave ---------- */
  function initFaq() {
    $$('.qa').forEach(item => {
      const summary = $('summary', item);
      const content = $('.qa__a', item);
      if (item.open) item.classList.add('is-open');
      let anim = null;

      summary.addEventListener('click', e => {
        e.preventDefault();
        if (anim) {
          anim.cancel();
          anim = null;
        }
        if (item.classList.contains('is-open')) {
          item.classList.remove('is-open');
          if (reduce || !content.animate) {
            item.open = false;
            requestMeasure();
            return;
          }
          const h = content.offsetHeight;
          anim = content.animate(
            [{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
            { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)' }
          );
          anim.onfinish = () => {
            item.open = false;
            anim = null;
            requestMeasure();
          };
        } else {
          item.open = true;
          item.classList.add('is-open');
          if (reduce || !content.animate) {
            requestMeasure();
            return;
          }
          const h = content.offsetHeight;
          anim = content.animate(
            [{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }],
            { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)' }
          );
          anim.onfinish = () => {
            anim = null;
            requestMeasure();
          };
        }
      });
    });
  }

  /* ---------- Agendamento pelo WhatsApp ---------- */
  function initBooking() {
    const form = $('[data-booking]');
    if (!form) return;
    const convField = $('[data-convenio]', form);
    const fields = form.elements;

    form.addEventListener('change', () => {
      if (convField) convField.hidden = fields.atendimento.value !== 'convenio';
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const nome = fields.nome.value.trim();
      const especialidade = fields.especialidade.value || 'Reumatologia';
      const periodo = fields.periodo.value;
      const atendimento = fields.atendimento.value;
      const convenio = fields.convenio.value.trim();

      const parts = ['Olá!'];
      if (nome) parts.push(`Meu nome é ${nome}.`);
      const pref = periodo === 'manha' ? ', de preferência pela manhã' : periodo === 'tarde' ? ', de preferência à tarde' : '';
      parts.push(`Gostaria de agendar uma consulta de ${especialidade} na Creass${pref}.`);
      if (atendimento === 'convenio') parts.push(convenio ? `Atendimento pelo convênio ${convenio}.` : 'Atendimento por convênio.');
      if (atendimento === 'particular') parts.push('Atendimento particular.');

      const link = document.createElement('a');
      link.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(parts.join(' '))}`;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  /* ---------- Horário de funcionamento (fuso de São Paulo) e relógio ---------- */
  function initStatus() {
    const targets = $$('[data-status]');
    const clock = $('[data-clock]');
    const DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fmt = m => {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return mm ? `${h}h${String(mm).padStart(2, '0')}` : `${h}h`;
    };

    let formatter;
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CONFIG.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
    } catch (e) {
      return;
    }

    const now = () => {
      const parts = formatter.formatToParts(new Date());
      const get = type => parts.find(p => p.type === type)?.value;
      const h = Number(get('hour')) % 24;
      const m = Number(get('minute'));
      return { day: WEEK.indexOf(get('weekday')), mins: h * 60 + m, h, m };
    };

    const compute = ({ day, mins }) => {
      const today = CONFIG.hours[day];
      if (today && mins >= today[0] && mins < today[1]) {
        return { open: true, text: `Aberto agora · até ${fmt(today[1])}` };
      }
      for (let k = 0; k < 8; k++) {
        const d = (day + k) % 7;
        const h = CONFIG.hours[d];
        if (!h || (k === 0 && mins >= h[0])) continue;
        const when = k === 0 ? 'hoje' : k === 1 ? 'amanhã' : DAYS[d];
        return { open: false, text: `Fechado · abre ${when} às ${fmt(h[0])}` };
      }
      return { open: false, text: 'Fechado no momento' };
    };

    const update = () => {
      const t = now();
      if (t.day < 0) return;
      const s = compute(t);
      targets.forEach(el => {
        el.classList.toggle('is-open', s.open);
        const text = $('[data-status-text]', el);
        if (text) text.textContent = s.text;
      });
      if (clock) clock.textContent = `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
    };
    update();
    setInterval(update, 30000);
  }

  /* ---------- Assinatura do rodapé: letras ficam itálicas perto do cursor ---------- */
  function initWordmark() {
    const el = $('[data-wordmark]');
    if (!el) return;
    const text = el.textContent.trim();
    el.textContent = '';
    const letters = [...text].map((ch, i) => {
      const lt = document.createElement('span');
      lt.className = 'lt';
      lt.style.setProperty('--i', i);
      const r = document.createElement('span');
      r.className = 'lt__r';
      r.textContent = ch;
      const it = document.createElement('span');
      it.className = 'lt__i';
      it.textContent = ch;
      lt.append(r, it);
      el.appendChild(lt);
      return { lt, r, it, f: 0, shown: -1, cx: 0, cy: 0, w: 1 };
    });
    if (!fine || reduce) return;

    let visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(el);
    }
    onTick(() => {
      if (!visible) return;
      // Posições lidas a cada quadro: as letras sobem durante a revelação
      for (const L of letters) {
        const b = L.lt.getBoundingClientRect();
        L.cx = b.left + b.width / 2;
        L.cy = b.top + b.height / 2;
        L.w = b.width || 1;
      }
      for (const L of letters) {
        const dx = state.mx - L.cx;
        const dy = (state.my - L.cy) * 0.6;
        const d = Math.sqrt(dx * dx + dy * dy);
        // Curva suave e curta: cada letra fica quase sempre inteira (romana ou itálica)
        const near = state.pointer ? clamp((1 - d / (L.w * 1.4) - 0.3) / 0.4) : 0;
        const target = near * near * (3 - 2 * near);
        L.f = lerp(L.f, target, 0.14);
        if (Math.abs(L.f - L.shown) > 0.003) {
          L.shown = L.f;
          L.r.style.opacity = (1 - L.f).toFixed(3);
          L.it.style.opacity = L.f.toFixed(3);
        }
      }
    });
  }

  /* ---------- Barra de progresso, HUD e WhatsApp flutuante ---------- */
  function initChrome() {
    const progress = $('.progress');
    const hudBar = $('.hud__bar i');
    const wa = $('.wa-float');
    const footer = $('.footer');
    const hero = $('.hero');
    let max = 1, waOn = false, hudOn = false, footerTop = Infinity, heroEnd = 0;

    onResize(() => {
      max = Math.max(1, document.documentElement.scrollHeight - state.vh);
      if (footer) footerTop = footer.getBoundingClientRect().top + state.y;
      // O hero fica fixo enquanto a coluna descomprime; HUD e botão flutuante entram depois dele
      if (hero) heroEnd = hero.getBoundingClientRect().bottom + state.y - state.vh;
    });
    onTick(() => {
      const p = clamp(state.y / max);
      const scale = `scaleX(${p.toFixed(4)})`;
      if (progress) progress.style.transform = scale;
      if (hudBar) hudBar.style.transform = scale;
      const past = state.y > heroEnd + state.vh * 0.3;
      // O botão flutuante some quando o rodapé (com seu próprio CTA) entra na tela
      const showWa = past && state.y + state.vh < footerTop + state.vh * 0.35;
      if (showWa !== waOn) {
        waOn = showWa;
        wa?.classList.toggle('is-visible', showWa);
      }
      if (past !== hudOn) {
        hudOn = past;
        root.classList.toggle('hud-on', past);
      }
    });
  }

  /* ---------- Inicialização ---------- */
  safe('split', () => $$('[data-split]').forEach(splitWords));
  safe('odometer', initOdometers);
  safe('header', initHeader);
  safe('journey', initJourney);
  safe('theme', initTheme);
  safe('reveal', initReveal);
  safe('marquee', initMarquee);
  safe('manifesto', initManifesto);
  safe('cursor', initCursor);
  safe('buttons', initButtons);
  safe('cards', initCards);
  safe('specs', initSpecs);
  safe('dial', initDial);
  safe('faq', initFaq);
  safe('booking', initBooking);
  safe('status', initStatus);
  safe('wordmark', initWordmark);
  safe('chrome', initChrome);
  safe('year', () => $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); }));

  measure();
  requestAnimationFrame(loop);
  safe('intro', initIntro);

  window.addEventListener('resize', requestMeasure);
  window.addEventListener('load', requestMeasure);
  document.fonts?.ready?.then(requestMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(requestMeasure).observe(body);
})();
