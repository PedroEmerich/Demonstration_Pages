/*
 * Camada de interação da página.
 *
 * Tudo que se move passa por um único laço de requestAnimationFrame e por molas
 * integradas em passos fixos (1/240 s), então o movimento é igual a 60, 90 ou 144 Hz
 * e nunca "pula" quando a rolagem chega em degraus (roda do mouse). Os elementos são
 * movidos só com transform, sem transições CSS disputando com a animação, e as
 * medidas de layout ficam em cache (recalculadas só quando a página muda de tamanho).
 *
 * - Balança do hero: latão com física de mola; pende para o lado do cursor e leva um
 *   empurrão no clique. Luz quente e poeira acompanham.
 * - Cena "Seu problema pesa": os pesos caem com gravidade e quicam no prato; cada
 *   impacto mexe o travessão até a balança se equilibrar.
 * - Estante: livros sobem e se inclinam perto do cursor; o escolhido abre no artigo
 *   da lei com a página virando (funciona também com "reduzir movimento", sem animar).
 * - Linha do tempo da ANS desenhada pela rolagem, retrato com moldura que inclina,
 *   botões magnéticos, cursor dourado e barra de progresso de leitura.
 *
 * Sem este arquivo a página continua completa: a balança aparece equilibrada e todos
 * os artigos ficam visíveis.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const STEP = 1 / 240;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  // Aproxima um valor do alvo de forma independente da taxa de quadros.
  const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

  // Só escreve no DOM quando o valor muda (evita recálculo de estilo à toa).
  const written = new WeakMap();
  const setStyle = (el, prop, value) => {
    let cache = written.get(el);
    if (!cache) written.set(el, (cache = {}));
    if (cache[prop] === value) return;
    cache[prop] = value;
    el.style[prop] = value;
  };

  /* Mola amortecida, integrada em passos fixos (Euler semi-implícito). */
  class Spring {
    constructor(value = 0, stiffness = 170, damping = 26) {
      this.value = value;
      this.target = value;
      this.velocity = 0;
      this.stiffness = stiffness;
      this.damping = damping;
    }

    update(h) {
      const acceleration = this.stiffness * (this.target - this.value) - this.damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
      return acceleration;
    }

    step(dt) {
      for (let left = dt; left > 1e-6; left -= STEP) this.update(Math.min(STEP, left));
      return this.value;
    }

    get resting() {
      return Math.abs(this.velocity) < 0.005 && Math.abs(this.target - this.value) < 0.005;
    }
  }

  root.classList.add('fx');
  // Layout de celular: livro em folha que sobe de baixo, barra fixa de ações e carrossel de áreas.
  const phone = window.matchMedia('(max-width: 699px)');
  initReader();
  initMobileBar();
  initAreaCarousel();

  if (reduceMotion) return;
  root.classList.add('fx-motion');

  /* Laço único de animação e cache de layout ------------------------------ */

  const tasks = new Set();
  const layoutFns = [];
  const layout = { vh: window.innerHeight, headerH: 0, maxScroll: 1 };
  const header = document.querySelector('[data-header]');

  const runLayout = () => {
    layout.vh = window.innerHeight;
    layout.headerH = header ? header.offsetHeight : 0;
    layout.maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    layoutFns.forEach((fn) => fn());
  };
  let layoutQueued = false;
  const queueLayout = () => {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => {
      layoutQueued = false;
      runLayout();
    });
  };
  const onLayout = (fn) => layoutFns.push(fn);

  // Roda a tarefa só enquanto o elemento está perto da tela.
  const whenVisible = (el, task, onEnter) => {
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onEnter?.();
            tasks.add(task);
          } else {
            tasks.delete(task);
          }
        });
      },
      { rootMargin: '20% 0px' }
    ).observe(el);
  };

  /* Balança: travessão com mola e pratos que balançam como pêndulos ------- */

  // A balança é feita de camadas <svg> do mesmo tamanho (viewBox 400 × 400). O travessão
  // gira em torno do ponto de apoio; cada prato acompanha a ponta do travessão por
  // translate e só gira o próprio balanço. Tudo em transform: nada é repintado.
  const PIVOT = { x: 200, y: 86 };
  const HOOK_Y = 98;
  const HOOK_X = { left: 44, right: 356 };

  const createScale = (container, stiffness, damping) => {
    const beam = container.querySelector('[data-beam]');
    const pans = Array.from(container.querySelectorAll('[data-pan]:not([data-weight])'));
    const arm = new Spring(0, stiffness, damping);
    const swing = new Spring(0, 26, 2.1);
    const offsets = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };

    const scale = {
      arm,
      kick(deltaVelocity) {
        arm.velocity += deltaVelocity;
      },
      snap(angle) {
        arm.value = arm.target = angle;
        arm.velocity = swing.value = swing.velocity = 0;
      },
      // Transform de uma camada presa ao prato (o prato em si ou um peso que cai nele).
      panTransform(side, drop = 0) {
        const { x, y } = offsets[side];
        const base = `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) rotate(${swing.value.toFixed(3)}deg)`;
        return drop ? `${base} translate(0, ${(drop / 4).toFixed(3)}%)` : base;
      },
      step(dt) {
        for (let left = dt; left > 1e-6; left -= STEP) {
          const h = Math.min(STEP, left);
          const acceleration = arm.update(h);
          // Os pratos têm inércia: quando o travessão acelera, eles ficam para trás e balançam.
          swing.velocity -= acceleration * 0.55 * h;
          swing.update(h);
        }
        swing.value = clamp(swing.value, -16, 16);

        const angle = (arm.value * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        Object.keys(offsets).forEach((side) => {
          const vx = HOOK_X[side] - PIVOT.x;
          const vy = HOOK_Y - PIVOT.y;
          // deslocamento do gancho, em % do tamanho da camada (400 unidades = 100%)
          offsets[side].x = (vx * cos - vy * sin - vx) / 4;
          offsets[side].y = (vx * sin + vy * cos - vy) / 4;
        });

        setStyle(beam, 'transform', `rotate(${arm.value.toFixed(3)}deg)`);
        pans.forEach((pan) => setStyle(pan, 'transform', scale.panTransform(pan.dataset.pan)));
      },
    };
    return scale;
  };

  initProgress();
  initHero();
  initBalance();
  initShelfMotion();
  initTimeline();
  initPortrait();
  initMagnetic();
  initCursor();

  window.addEventListener('resize', queueLayout);
  window.addEventListener('load', queueLayout);
  document.fonts?.ready.then(queueLayout);
  new ResizeObserver(queueLayout).observe(document.body);
  runLayout();

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    tasks.forEach((task) => task(dt, now));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* Barra de progresso de leitura ----------------------------------------- */

  function initProgress() {
    const bar = document.querySelector('[data-progress]');
    if (!bar) return;
    let value = 0;
    tasks.add((dt) => {
      value = damp(value, clamp(window.scrollY / layout.maxScroll, 0, 1), 14, dt);
      setStyle(bar, 'transform', `scaleX(${value.toFixed(4)})`);
    });
  }

  /* Hero: balança, luz e paralaxe ----------------------------------------- */

  function initHero() {
    const hero = document.querySelector('[data-hero]');
    const balance = hero?.querySelector('[data-scale="hero"]');
    if (!hero || !balance) return;

    const scale = createScale(balance, 40, 5.2);
    const light = hero.querySelector('[data-hero-light]');
    const copy = hero.querySelector('[data-hero-copy]');
    const stage = hero.querySelector('[data-hero-scale]');
    const box = { left: 0, top: 0, width: 1, height: 1, center: 0 };
    let pointer = null;
    let parallax = window.scrollY;

    onLayout(() => {
      const rect = hero.getBoundingClientRect();
      box.left = rect.left;
      box.top = rect.top + window.scrollY;
      box.width = rect.width;
      box.height = rect.height;
      const balanceRect = balance.getBoundingClientRect();
      box.center = balanceRect.left + balanceRect.width / 2;
    });

    const lightPos = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.34 };

    if (finePointer) {
      hero.addEventListener('pointermove', (event) => {
        pointer = { x: event.clientX, y: event.clientY };
      });
      hero.addEventListener('pointerleave', () => {
        pointer = null;
      });
      // Um clique "empurra" a balança para o lado oposto ao que ela pende.
      stage.addEventListener('pointerdown', () => scale.kick(scale.arm.value >= 0 ? -80 : 80));
    }

    whenVisible(hero, (dt, now) => {
      if (pointer) {
        const offset = (pointer.x - box.center) / (window.innerWidth / 2);
        scale.arm.target = clamp(offset, -1, 1) * 12;
      } else {
        // Sem cursor, a balança "respira", oscilando de leve.
        scale.arm.target = Math.sin(now / 1600) * 3.2;
      }
      scale.step(dt);

      const scrolled = window.scrollY;
      const targetX = pointer ? pointer.x - box.left : box.width * 0.72;
      const targetY = pointer ? pointer.y - (box.top - scrolled) : box.height * 0.34;
      lightPos.x = damp(lightPos.x, targetX, 4.5, dt);
      lightPos.y = damp(lightPos.y, targetY, 4.5, dt);
      setStyle(light, 'transform', `translate3d(${lightPos.x.toFixed(1)}px, ${lightPos.y.toFixed(1)}px, 0)`);

      // Paralaxe: o texto sobe mais devagar e some aos poucos; a balança fica um pouco atrás.
      parallax = damp(parallax, scrolled, 14, dt);
      const y = Math.max(0, parallax);
      setStyle(copy, 'transform', `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`);
      setStyle(copy, 'opacity', clamp(1 - y / (box.height * 0.95), 0, 1).toFixed(3));
      setStyle(stage, 'transform', `translate3d(0, ${(y * 0.07).toFixed(1)}px, 0)`);
    });
  }

  /* Cena de rolagem: pesos com gravidade equilibram a balança -------------- */

  function initBalance() {
    const scene = document.querySelector('[data-balance]');
    const balance = scene?.querySelector('[data-scale="scene"]');
    if (!scene || !balance) return;

    const scale = createScale(balance, 34, 5.4);
    const steps = Array.from(scene.querySelectorAll('[data-balance-step]'));
    const meter = scene.querySelector('[data-balance-meter]');
    const THRESHOLDS = [0.2, 0.44, 0.68];
    const MAX_TILT = -15; // negativo: o prato esquerdo (o problema) fica embaixo
    const GRAVITY = 2400;
    const START = -300; // altura de onde o peso cai, em unidades do viewBox
    const weights = Array.from(balance.querySelectorAll('[data-weight]')).map((el) => ({ el, y: START, v: 0, placed: false, landed: false }));

    let top = 0;
    let travel = 1;
    let progress = 0;
    let landed = 0;
    let active = -1;
    let balanced = null;

    onLayout(() => {
      top = scene.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, scene.offsetHeight - layout.vh + layout.headerH);
    });
    const rawProgress = () => clamp((window.scrollY - (top - layout.headerH)) / travel, 0, 1);
    const targetAngle = () => MAX_TILT * (1 - landed / weights.length);

    const render = () => {
      weights.forEach((w) => {
        setStyle(w.el, 'transform', scale.panTransform('right', w.y));
        setStyle(w.el, 'opacity', clamp((w.y - START) / 90, 0, 1).toFixed(3));
      });
    };

    // Ao entrar na tela (inclusive vindo de baixo), os pesos já passados aparecem no lugar.
    const enter = () => {
      progress = rawProgress();
      landed = 0;
      weights.forEach((w, i) => {
        w.placed = w.landed = progress >= THRESHOLDS[i];
        w.y = w.placed ? 0 : START;
        w.v = 0;
        if (w.landed) landed += 1;
      });
      scale.snap(targetAngle());
      render();
    };

    whenVisible(
      scene,
      (dt) => {
        progress = damp(progress, rawProgress(), 7, dt);

        weights.forEach((w, i) => {
          const want = w.placed ? progress >= THRESHOLDS[i] - 0.025 : progress >= THRESHOLDS[i];
          if (want && !w.placed) {
            w.placed = true;
            w.v = 0;
          } else if (!want && w.placed) {
            w.placed = false;
            if (w.landed) {
              w.landed = false;
              landed -= 1;
              scale.kick(-12); // tirar o peso alivia o prato direito
            }
          }
        });

        for (let left = dt; left > 1e-6; left -= STEP) {
          const h = Math.min(STEP, left);
          weights.forEach((w) => {
            if (w.placed) {
              if (w.y >= 0 && w.v === 0) return;
              w.v += GRAVITY * h;
              w.y += w.v * h;
              if (w.y >= 0) {
                w.y = 0;
                // Impacto proporcional à velocidade: o prato direito desce um pouco a cada quique.
                scale.kick(24 * (w.v / 1200));
                if (!w.landed) {
                  w.landed = true;
                  landed += 1;
                }
                w.v = w.v > 140 ? -w.v * 0.26 : 0;
              }
            } else {
              w.v = 0;
              w.y = damp(w.y, START, 8, h);
            }
          });
        }

        scale.arm.target = targetAngle();
        scale.step(dt);
        render();

        const current = THRESHOLDS.filter((t) => progress >= t).length;
        if (current !== active) {
          active = current;
          steps.forEach((step, i) => {
            step.classList.toggle('is-active', i === current);
            step.classList.toggle('is-done', i < current);
          });
        }

        const isBalanced = landed === weights.length && Math.abs(scale.arm.value) < 0.7 && Math.abs(scale.arm.velocity) < 4;
        if (isBalanced !== balanced) {
          balanced = isBalanced;
          balance.classList.toggle('is-balanced', isBalanced);
        }

        if (meter) setStyle(meter, 'transform', `scaleX(${progress.toFixed(4)})`);
      },
      enter
    );
  }

  /* Estante: livros com mola que reagem ao cursor ------------------------- */

  function initShelfMotion() {
    const shelf = document.querySelector('[data-shelf]');
    if (!shelf) return;
    const niche = shelf.querySelector('.shelf__niche') || shelf;
    const books = Array.from(shelf.querySelectorAll('[data-book]')).map((el) => ({
      el,
      lift: new Spring(0, 240, 22),
      tilt: new Spring(0, 240, 22),
      center: 0,
      focused: false,
    }));
    let pointerX = null;

    // offsetLeft não é afetado pelo transform dos livros, então a medida é estável.
    const measure = () => {
      const base = niche.getBoundingClientRect().left + niche.clientLeft;
      books.forEach((book) => {
        book.center = base + book.el.offsetLeft + book.el.offsetWidth / 2;
      });
    };
    onLayout(measure);

    if (finePointer) {
      shelf.addEventListener('pointerenter', measure);
      shelf.addEventListener('pointermove', (event) => {
        pointerX = event.clientX;
      });
      shelf.addEventListener('pointerleave', () => {
        pointerX = null;
      });
    }
    books.forEach((book) => {
      book.el.addEventListener('focus', () => (book.focused = true));
      book.el.addEventListener('blur', () => (book.focused = false));
      // Ao ser escolhido, o livro dá um pequeno salto antes de assentar.
      book.el.addEventListener('click', () => {
        book.lift.velocity += 260;
      });
    });

    whenVisible(shelf, (dt) => {
      books.forEach((book) => {
        const pressed = book.el.getAttribute('aria-pressed') === 'true';
        let near = 0;
        let side = 0;
        if (pointerX !== null) {
          const offset = pointerX - book.center;
          near = Math.max(0, 1 - Math.abs(offset) / 150);
          side = clamp(offset / 150, -1, 1);
        }
        const ease = near * near * (3 - 2 * near);
        book.lift.target = pressed ? 30 + ease * 4 : Math.max(book.focused ? 12 : 0, ease * 18);
        book.tilt.target = pressed ? 0 : -side * ease * 4;
        book.lift.step(dt);
        book.tilt.step(dt);
        setStyle(book.el, 'transform', `translate3d(0, ${(-book.lift.value).toFixed(2)}px, 0) rotate(${book.tilt.value.toFixed(3)}deg)`);
      });
    });
  }

  /* Linha do tempo da ANS desenhada pela rolagem --------------------------- */

  function initTimeline() {
    const wrap = document.querySelector('[data-timeline]');
    const fill = wrap?.querySelector('[data-timeline-fill]');
    if (!wrap || !fill) return;
    const track = fill.parentElement;
    const nodes = Array.from(wrap.querySelectorAll('[data-timeline-node]'));
    let horizontal = false;
    let trackTop = 0;
    let length = 1;
    let marks = [];
    let value = 0;
    let reached = -1;

    // offsetTop/offsetLeft ignoram o transform da revelação, então as marcas ficam no lugar certo.
    onLayout(() => {
      horizontal = track.offsetWidth > track.offsetHeight;
      trackTop = track.getBoundingClientRect().top + window.scrollY;
      length = Math.max(1, horizontal ? track.offsetWidth : track.offsetHeight);
      marks = nodes.map((node) =>
        horizontal ? (node.offsetLeft + 24 - track.offsetLeft) / length : (node.offsetTop + 34 - track.offsetTop) / length
      );
    });

    whenVisible(wrap, (dt) => {
      const topOnScreen = trackTop - window.scrollY;
      const target = horizontal
        ? clamp((layout.vh * 0.8 - topOnScreen) / (layout.vh * 0.45), 0, 1)
        : clamp((layout.vh * 0.62 - topOnScreen) / length, 0, 1);
      value = damp(value, target, 6, dt);
      setStyle(fill, 'transform', `${horizontal ? 'scaleX' : 'scaleY'}(${value.toFixed(4)})`);

      const count = marks.filter((mark) => value >= mark - 0.004).length;
      if (count !== reached) {
        reached = count;
        nodes.forEach((node, i) => node.classList.toggle('is-reached', i < count));
      }
    });
  }

  /* Retrato: moldura que inclina com o cursor e monograma com paralaxe ---- */

  function initPortrait() {
    const figure = document.querySelector('[data-portrait]');
    const frame = figure?.querySelector('[data-portrait-frame]');
    if (!figure || !frame) return;
    const art = figure.querySelector('[data-portrait-art]');
    const sheen = figure.querySelector('[data-portrait-sheen]');
    const rx = new Spring(0, 110, 14);
    const ry = new Spring(0, 110, 14);
    let rect = null;
    let pointer = null;
    let center = 0;
    let offset = 0;

    onLayout(() => {
      const r = figure.getBoundingClientRect();
      center = r.top + window.scrollY + r.height / 2;
    });

    if (finePointer) {
      frame.addEventListener('pointerenter', () => {
        rect = frame.getBoundingClientRect();
      });
      frame.addEventListener('pointermove', (event) => {
        if (!rect) rect = frame.getBoundingClientRect();
        pointer = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
      });
      frame.addEventListener('pointerleave', () => {
        pointer = null;
        rect = null;
      });
    }

    whenVisible(figure, (dt) => {
      rx.target = pointer ? -pointer.y * 9 : 0;
      ry.target = pointer ? pointer.x * 11 : 0;
      rx.step(dt);
      ry.step(dt);
      setStyle(frame, 'transform', `perspective(1100px) rotateX(${rx.value.toFixed(3)}deg) rotateY(${ry.value.toFixed(3)}deg)`);
      if (sheen) setStyle(sheen, 'transform', `translate3d(${(-35 + ry.value * 6).toFixed(2)}%, 0, 0)`);

      offset = damp(offset, center - (window.scrollY + layout.vh / 2), 9, dt);
      if (art) setStyle(art, 'transform', `translate3d(0, ${clamp(offset * -0.07, -26, 26).toFixed(2)}px, 0)`);
    });
  }

  /* Botões magnéticos ------------------------------------------------------ */

  function initMagnetic() {
    if (!finePointer) return;
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const x = new Spring(0, 220, 18);
      const y = new Spring(0, 220, 18);
      let rect = null;

      el.addEventListener('pointerenter', () => {
        const r = el.getBoundingClientRect();
        rect = { cx: r.left + r.width / 2 - x.value, cy: r.top + r.height / 2 - y.value };
      });
      el.addEventListener('pointermove', (event) => {
        if (!rect) return;
        x.target = clamp((event.clientX - rect.cx) * 0.28, -10, 10);
        y.target = clamp((event.clientY - rect.cy) * 0.4, -7, 7);
      });
      el.addEventListener('pointerleave', () => {
        rect = null;
        x.target = 0;
        y.target = 0;
      });

      tasks.add((dt) => {
        if (!rect && x.resting && y.resting) return;
        x.step(dt);
        y.step(dt);
        setStyle(el, 'transform', `translate3d(${x.value.toFixed(2)}px, ${y.value.toFixed(2)}px, 0)`);
      });
    });
  }

  /* Cursor dourado que segue o mouse --------------------------------------- */

  function initCursor() {
    if (!finePointer) return;
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="cursor__ring"></span><span class="cursor__label">Abrir</span>';
    document.body.append(el);

    const pos = { x: -100, y: -100, tx: -100, ty: -100 };
    let visible = false;
    let mode = '';

    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType !== 'mouse') return;
        pos.tx = event.clientX;
        pos.ty = event.clientY;
        if (!visible) {
          visible = true;
          pos.x = pos.tx;
          pos.y = pos.ty;
          el.classList.add('is-visible');
        }
      },
      { passive: true }
    );
    document.documentElement.addEventListener('mouseleave', () => {
      visible = false;
      el.classList.remove('is-visible');
    });
    window.addEventListener('pointerdown', () => el.classList.add('is-down'));
    window.addEventListener('pointerup', () => el.classList.remove('is-down'));

    document.addEventListener('pointerover', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      let next = '';
      if (target?.closest('input, textarea, select')) next = 'text';
      else if (target?.closest('[data-book]')) next = 'book';
      else if (target?.closest('a, button, label, summary, [role="tab"], [data-hero-scale]')) next = 'link';
      if (next === mode) return;
      if (mode) el.classList.remove(`is-${mode}`);
      if (next) el.classList.add(`is-${next}`);
      mode = next;
    });

    tasks.add((dt) => {
      if (!visible) return;
      pos.x = damp(pos.x, pos.tx, 22, dt);
      pos.y = damp(pos.y, pos.ty, 22, dt);
      setStyle(el, 'transform', `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`);
    });
  }

  /* Barra fixa do celular: aparece depois do topo e some perto do formulário */

  function initMobileBar() {
    const bar = document.querySelector('[data-mobile-bar]');
    const heroActions = document.querySelector('.hero__actions');
    const contact = document.getElementById('contato');
    if (!bar || !heroActions || !contact) return;
    const seen = { hero: true, contact: false };
    const update = () => bar.classList.toggle('is-visible', !seen.hero && !seen.contact);
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        seen[entry.target === contact ? 'contact' : 'hero'] = entry.isIntersecting;
      });
      update();
    }).observe(heroActions);
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        seen.contact = entry.isIntersecting;
      });
      update();
    }, { rootMargin: '0px 0px -35% 0px' }).observe(contact);
  }

  /* Áreas no celular: cartões que deslizam para o lado, com pontos ---------- */

  function initAreaCarousel() {
    const track = document.querySelector('.tabs__panels');
    const dots = document.querySelector('[data-tabs-dots]');
    if (!track || !dots) return;
    const panels = Array.from(track.querySelectorAll('[role="tabpanel"]'));
    const buttons = panels.map((panel, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.tabIndex = -1;
      dot.className = 'tabs__dot';
      dot.addEventListener('click', () => {
        track.scrollTo({ left: panels[i].offsetLeft - track.offsetLeft - (track.clientWidth - panels[i].offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      dots.append(dot);
      return dot;
    });
    let active = -1;
    const update = () => {
      if (!phone.matches) return;
      const center = track.scrollLeft + track.clientWidth / 2;
      let index = 0;
      panels.forEach((panel, i) => {
        const panelCenter = panel.offsetLeft - track.offsetLeft + panel.offsetWidth / 2;
        const best = panels[index].offsetLeft - track.offsetLeft + panels[index].offsetWidth / 2;
        if (Math.abs(panelCenter - center) < Math.abs(best - center)) index = i;
      });
      if (index === active) return;
      active = index;
      buttons.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    };
    track.addEventListener('scroll', update, { passive: true });
    phone.addEventListener('change', update);
    update();
  }

  /* Leitor: o livro escolhido abre com a página virando ------------------- */

  function initReader() {
    const shelf = document.querySelector('[data-shelf]');
    const reader = document.querySelector('[data-reader]');
    if (!shelf || !reader) return;

    const books = Array.from(shelf.querySelectorAll('[data-book]'));
    const pages = books.map((book) => document.getElementById(book.dataset.book));
    const left = reader.querySelector('[data-reader-left]');
    const leaf = reader.querySelector('[data-reader-leaf]');
    const front = leaf?.querySelector('[data-leaf-front]');
    const back = leaf?.querySelector('[data-leaf-back]');
    const backdrop = document.querySelector('[data-reader-backdrop]');
    const closeButton = reader.querySelector('[data-reader-close]');
    const bar = reader.querySelector('.reader__bar');
    const TURN = 950;
    let current = Math.max(0, books.findIndex((book) => book.getAttribute('aria-pressed') === 'true'));
    let timer = 0;
    let opener = null;

    /* No celular o livro abre numa folha que sobe da parte de baixo da tela. */
    const sheetOpen = () => reader.classList.contains('is-open');
    const openSheet = (book) => {
      opener = book;
      reader.setAttribute('role', 'dialog');
      reader.setAttribute('aria-modal', 'true');
      backdrop.hidden = false;
      void backdrop.offsetWidth;
      reader.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('sheet-open');
      reader.scrollTop = 0;
      closeButton?.focus({ preventScroll: true });
    };
    const closeSheet = () => {
      if (!sheetOpen()) return;
      reader.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('sheet-open');
      reader.removeAttribute('role');
      reader.removeAttribute('aria-modal');
      reader.style.removeProperty('transform');
      window.setTimeout(() => {
        if (!sheetOpen()) backdrop.hidden = true;
      }, 450);
      opener?.focus({ preventScroll: true });
    };
    closeButton?.addEventListener('click', closeSheet);
    backdrop?.addEventListener('click', closeSheet);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSheet();
    });
    phone.addEventListener('change', () => {
      if (!phone.matches) closeSheet();
    });

    // Arrastar a barra da folha para baixo fecha o livro, como num aplicativo.
    if (bar) {
      let startY = null;
      let dragged = 0;
      bar.addEventListener('pointerdown', (event) => {
        if (!sheetOpen() || event.target.closest('button')) return;
        startY = event.clientY;
        dragged = 0;
        reader.classList.add('is-dragging');
        bar.setPointerCapture(event.pointerId);
      });
      bar.addEventListener('pointermove', (event) => {
        if (startY === null) return;
        dragged = Math.max(0, event.clientY - startY);
        reader.style.transform = `translate3d(0, ${dragged}px, 0)`;
      });
      const release = () => {
        if (startY === null) return;
        startY = null;
        reader.classList.remove('is-dragging');
        reader.style.removeProperty('transform');
        if (dragged > 90) closeSheet();
      };
      bar.addEventListener('pointerup', release);
      bar.addEventListener('pointercancel', release);
    }

    // Página da esquerda: ornamento, nome do livro e artigo (cópia do cabeçalho do artigo).
    const frontispiece = (index) => {
      const ornament = document.createElement('span');
      ornament.className = 'reader__ornament';
      ornament.textContent = '§';
      const hint = document.createElement('p');
      hint.className = 'reader__hint';
      hint.textContent = 'Escolha outro livro na estante para folhear.';
      return [ornament, pages[index].querySelector('.book-page__head').cloneNode(true), hint];
    };
    left?.replaceChildren(...frontispiece(current));

    const settle = () => {
      clearTimeout(timer);
      timer = 0;
      reader.classList.remove('is-turning');
      if (leaf) leaf.hidden = true;
      left?.replaceChildren(...frontispiece(current));
    };

    const open = (index) => {
      const asSheet = phone.matches;
      if (asSheet) openSheet(books[index]);
      if (index === current) return;
      if (timer) settle(); // termina na hora uma virada que ainda estava acontecendo
      const previous = current;
      current = index;
      books.forEach((book, i) => book.setAttribute('aria-pressed', String(i === index)));

      if (!reduceMotion && !asSheet && leaf && front && back) {
        // Frente da folha = página que sai; verso = frontispício do livro que entra.
        const copy = document.createElement('div');
        copy.className = 'book-page';
        copy.append(...Array.from(pages[previous].children, (node) => node.cloneNode(true)));
        front.replaceChildren(copy);
        back.replaceChildren(...frontispiece(index));
        leaf.hidden = false;
        reader.classList.remove('is-turning');
        void leaf.offsetWidth; // reinicia a animação
        reader.classList.add('is-turning');
        timer = window.setTimeout(settle, TURN);
      } else {
        left?.replaceChildren(...frontispiece(index));
      }
      pages.forEach((page, i) => {
        page.hidden = i !== index;
      });

      // Se o livro aberto estiver fora da tela, traz a página para perto da estante.
      const rect = reader.getBoundingClientRect();
      if (!asSheet && (rect.top > window.innerHeight - 160 || rect.bottom < 0)) {
        reader.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      }
    };

    books.forEach((book, i) => book.addEventListener('click', () => open(i)));
  }
})();
