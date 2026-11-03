/*
 * Bastião — camada de interações (scroll e cursor).
 * Tudo aqui é decorativo: sem este arquivo, ou com "reduzir movimento" ligado,
 * a página continua completa. Ideia central: o cursor é o firewall.
 *
 *  - Hero: campo de rede em canvas; ameaças vindas das bordas são bloqueadas
 *    por um escudo que segue o cursor (sem mouse, o escudo protege o terminal).
 *  - Retícula de mira que "trava" nos elementos clicáveis.
 *  - Trilho de varredura com o progresso da página e a seção atual.
 *  - Títulos que se decriptam ao entrar na tela.
 *  - Luz que acompanha o cursor nos cartões, terminal com inclinação 3D,
 *    botões magnéticos e diagrama que se energiza conforme a rolagem.
 */
(() => {
  'use strict';

  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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

  /* Hero: perímetro de rede --------------------------------------------- */

  const hero = $('.hero');
  const terminal = $('.terminal');
  if (hero) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-field';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);

    const hud = document.createElement('p');
    hud.className = 'fx-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = '<i></i>ips://perímetro ativo · <b>0</b> ameaças bloqueadas';
    hero.append(hud);
    const hudCount = $('b', hud);

    const ctx = canvas.getContext('2d');
    const GRID = 48; // mesmo passo da grade de fundo do hero
    const GREEN = '232, 181, 58'; // dourado do tema
    const RED = '244, 63, 94';
    let w = 0;
    let h = 0;
    let dpr = 1;
    let running = false;
    let last = 0;
    let spawnIn = 0.6;
    let blocked = 0;
    let flash = 0;
    const shield = { x: 0, y: 0, r: 120, ready: false };
    const threats = [];
    const sparks = [];

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      shield.r = clamp(w * 0.09, 70, 130);
    };

    // Alvo do escudo: o cursor dentro do hero ou, sem cursor, o centro do terminal.
    const shieldTarget = () => {
      const rect = hero.getBoundingClientRect();
      if (fine && pointer.inside && pointer.y >= rect.top && pointer.y <= rect.bottom) {
        return { x: pointer.x - rect.left, y: pointer.y - rect.top };
      }
      if (terminal) {
        const t = terminal.getBoundingClientRect();
        return { x: t.left - rect.left + t.width / 2, y: t.top - rect.top + t.height / 2 };
      }
      return { x: w * 0.7, y: h * 0.45 };
    };

    const spawn = () => {
      const edge = Math.floor(Math.random() * 4);
      const x = edge === 1 ? w + 10 : edge === 3 ? -10 : Math.random() * w;
      const y = edge === 0 ? -10 : edge === 2 ? h + 10 : Math.random() * h;
      threats.push({ x, y, speed: 70 + Math.random() * 60, trail: [] });
    };

    const burst = (x, y) => {
      for (let i = 0; i < 9; i += 1) {
        const angle = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
        const speed = 50 + Math.random() * 70;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
      }
      blocked += 1;
      flash = 1;
      hudCount.textContent = blocked;
    };

    const frame = (now) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000 || 0, 0.05);
      last = now;

      const target = shieldTarget();
      if (!shield.ready) {
        Object.assign(shield, target, { ready: true });
      }
      shield.x = lerp(shield.x, target.x, 0.12);
      shield.y = lerp(shield.y, target.y, 0.12);

      spawnIn -= dt;
      if (spawnIn <= 0 && threats.length < 12) {
        spawn();
        spawnIn = 0.45 + Math.random() * 0.7;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Pontos da grade acendem perto do escudo, como um radar local.
      const reach = shield.r * 2.4;
      const x0 = Math.max(0, Math.floor((shield.x - reach) / GRID));
      const x1 = Math.floor((shield.x + reach) / GRID);
      const y0 = Math.max(0, Math.floor((shield.y - reach) / GRID));
      const y1 = Math.floor((shield.y + reach) / GRID);
      for (let gx = x0; gx <= x1; gx += 1) {
        for (let gy = y0; gy <= y1; gy += 1) {
          const px = gx * GRID;
          const py = gy * GRID;
          const d = Math.hypot(px - shield.x, py - shield.y);
          if (d > reach) continue;
          const a = (1 - d / reach) ** 2;
          ctx.fillStyle = `rgba(${GREEN}, ${0.08 + a * 0.75})`;
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        }
      }

      // Escudo: anel tracejado girando + marcas de mira.
      const spin = now / 2600;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = `rgba(${GREEN}, ${0.35 + flash * 0.5})`;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.arc(shield.x, shield.y, shield.r, spin, spin + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(${GREEN}, 0.55)`;
      for (let i = 0; i < 4; i += 1) {
        const angle = -spin * 1.6 + (Math.PI / 2) * i;
        ctx.beginPath();
        ctx.arc(shield.x, shield.y, shield.r + 7, angle - 0.18, angle + 0.18);
        ctx.stroke();
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(${GREEN}, ${flash * 0.07})`;
        ctx.beginPath();
        ctx.arc(shield.x, shield.y, shield.r, 0, Math.PI * 2);
        ctx.fill();
        flash = Math.max(0, flash - dt * 2.5);
      }

      // Ameaças: seguem em direção ao escudo e são bloqueadas na borda dele.
      for (let i = threats.length - 1; i >= 0; i -= 1) {
        const t = threats[i];
        const dx = shield.x - t.x;
        const dy = shield.y - t.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= shield.r) {
          burst(t.x, t.y);
          threats.splice(i, 1);
          continue;
        }
        t.x += (dx / dist) * t.speed * dt;
        t.y += (dy / dist) * t.speed * dt;
        t.trail.unshift({ x: t.x, y: t.y });
        if (t.trail.length > 14) t.trail.pop();
        ctx.beginPath();
        t.trail.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = `rgba(${RED}, 0.35)`;
        ctx.stroke();
        ctx.fillStyle = `rgba(${RED}, 0.95)`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.life -= dt * 1.8;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        ctx.fillStyle = `rgba(${GREEN}, ${s.life})`;
        ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
      }

      requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
    };

    resize();
    new ResizeObserver(resize).observe(hero);
    let heroVisible = false;
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible && !document.hidden) start();
      else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (heroVisible) start();
    });
  }

  /* Retícula que trava nos alvos clicáveis ------------------------------ */

  if (fine) {
    const reticle = document.createElement('div');
    reticle.className = 'fx-reticle';
    reticle.setAttribute('aria-hidden', 'true');
    reticle.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
    document.body.append(reticle);

    const TARGETS = 'a[href], button, summary, label, select, input, textarea, [role="tab"]';
    const box = { x: -100, y: -100, w: 26, h: 26 };
    let locked = null;

    document.addEventListener('pointerover', (event) => {
      locked = event.target.closest(TARGETS);
      reticle.classList.toggle('is-locked', Boolean(locked));
    });

    const tick = () => {
      let tx;
      let ty;
      let tw;
      let th;
      if (locked && locked.isConnected) {
        const r = locked.getBoundingClientRect();
        tx = r.left - 6;
        ty = r.top - 6;
        tw = r.width + 12;
        th = r.height + 12;
      } else {
        tw = 26;
        th = 26;
        tx = pointer.x - tw / 2;
        ty = pointer.y - th / 2;
      }
      const t = locked ? 0.28 : 0.35;
      box.x = lerp(box.x, tx, t);
      box.y = lerp(box.y, ty, t);
      box.w = lerp(box.w, tw, t);
      box.h = lerp(box.h, th, t);
      reticle.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
      reticle.style.width = `${box.w}px`;
      reticle.style.height = `${box.h}px`;
      reticle.classList.toggle('is-hidden', !pointer.inside);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* Trilho de varredura: progresso da página e seção atual --------------- */

  const sections = $$('main > section');
  const rail = document.createElement('div');
  rail.className = 'fx-rail';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<span class="fx-rail__pct">000%</span><span class="fx-rail__track"><i></i></span><span class="fx-rail__label">00 início</span>';
  document.body.append(rail);
  const railFill = $('.fx-rail__track i', rail);
  const railPct = $('.fx-rail__pct', rail);
  const railLabel = $('.fx-rail__label', rail);

  const labelOf = (section) => {
    if (section.id === 'topo') return '00 início';
    const label = $('.mono-label', section);
    return label ? label.textContent.replace(/\s+/g, ' ').trim().split(' · ')[0] : null;
  };

  /* Diagrama energizado pela rolagem ------------------------------------ */

  const diagram = $('.diagram');
  const diagramNodes = diagram ? $$('.diagram__node', diagram) : [];
  if (diagram) {
    // Uma cópia contínua de cada rota, desenhada por cima da linha tracejada.
    const links = $('.diagram__links', diagram);
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    glow.setAttribute('class', 'fx-energy');
    $$('path', links).forEach((path) => {
      const copy = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      copy.setAttribute('d', path.getAttribute('d'));
      copy.setAttribute('pathLength', '1');
      if (path.classList.contains('diagram__threat')) copy.setAttribute('class', 'is-threat');
      glow.append(copy);
    });
    links.after(glow);
  }
  // Ordem em que os nós acendem: entradas, firewall, destinos.
  const NODE_AT = [0.2, 0.2, 0.45, 0.75, 0.75];

  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const max = doc.scrollHeight - vh;
    const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    railFill.style.transform = `scaleY(${progress})`;
    railPct.textContent = `${String(Math.round(progress * 100)).padStart(3, '0')}%`;

    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top < vh * 0.45 && labelOf(section)) current = section;
    });
    const label = labelOf(current);
    if (label && railLabel.textContent !== label) railLabel.textContent = label;

    if (diagram) {
      const r = diagram.getBoundingClientRect();
      const draw = clamp((vh * 0.9 - r.top) / (r.height * 0.9), 0, 1);
      diagram.style.setProperty('--draw', draw.toFixed(3));
      diagramNodes.forEach((node, i) => node.classList.toggle('is-on', draw >= (NODE_AT[i] ?? 1)));
      diagram.classList.toggle('is-live', draw >= 0.98);
    }

    if (terminal && !fine) {
      // Sem mouse, o terminal só ganha uma leve paralaxe na rolagem.
      terminal.style.setProperty('--py', `${clamp(window.scrollY * -0.06, -40, 0)}px`);
    }
  };
  const requestScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);
  onScroll();

  /* Títulos que se decriptam --------------------------------------------- */

  const GLYPHS = '01<>/{}[]#$%&*+=_ABCDEFXZ';
  const decrypt = (el) => {
    const original = el.textContent;
    el.setAttribute('aria-label', original);
    el.style.minHeight = `${el.offsetHeight}px`;
    const duration = 900;
    const start = performance.now();
    const step = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const solved = Math.floor(original.length * p);
      let out = original.slice(0, solved);
      for (let i = solved; i < original.length; i += 1) {
        const ch = original[i];
        out += ch === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else {
        el.textContent = original;
        el.removeAttribute('aria-label');
        el.style.minHeight = '';
      }
    };
    requestAnimationFrame(step);
  };
  const headingObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        decrypt(entry.target);
      });
    },
    { threshold: 0.9 },
  );
  $$('.section-head h2, .arch__copy h2, .contact h2').forEach((h2) => {
    if (h2.children.length === 0) headingObserver.observe(h2);
  });

  /* Só com mouse: luz nos cartões, terminal 3D e botões magnéticos -------- */

  if (fine) {
    const SPOT = '.service, .case, .flow > li, .quiz__item, .voice, .faq details';
    document.addEventListener(
      'pointermove',
      (event) => {
        const card = event.target.closest && event.target.closest(SPOT);
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - r.left}px`);
        card.style.setProperty('--my', `${event.clientY - r.top}px`);
      },
      { passive: true },
    );

    if (terminal && hero) {
      hero.addEventListener('pointermove', (event) => {
        const r = terminal.getBoundingClientRect();
        const nx = clamp((event.clientX - (r.left + r.width / 2)) / (r.width * 1.5), -1, 1);
        const ny = clamp((event.clientY - (r.top + r.height / 2)) / (r.height * 1.5), -1, 1);
        terminal.style.setProperty('--rx', `${(-ny * 6).toFixed(2)}deg`);
        terminal.style.setProperty('--ry', `${(nx * 8).toFixed(2)}deg`);
      });
      hero.addEventListener('pointerleave', () => {
        terminal.style.setProperty('--rx', '0deg');
        terminal.style.setProperty('--ry', '0deg');
      });
    }

    $$('.btn--accent').forEach((btn) => {
      btn.addEventListener('pointermove', (event) => {
        const r = btn.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        btn.style.setProperty('--tx', `${(dx * 0.18).toFixed(1)}px`);
        btn.style.setProperty('--ty', `${(dy * 0.3).toFixed(1)}px`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });
  }
})();
