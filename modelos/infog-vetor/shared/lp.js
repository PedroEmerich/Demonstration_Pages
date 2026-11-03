/*
 * Comportamentos compartilhados pelas landing pages do Catálogo Devs.
 * Cada recurso é ativado por atributos data-* no HTML: o que a página não usa não roda.
 * Sem dependências nem build — funciona até abrindo o arquivo direto no navegador.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  // O <head> de cada página já marca "js" e desfaz a marca se este arquivo não carregar.
  window.lpReady = true;
  root.classList.add('js');

  /* Rastreamento --------------------------------------------------------- */

  // Eventos para GTM / GA4 / Google Ads. Sem tag instalada, o dataLayer só acumula.
  const track = (event, data = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...data });
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="wa.me/"]');
    if (link) track('whatsapp_click', { link_location: link.dataset.track || 'pagina' });
  });

  /* Parâmetros de campanha ------------------------------------------------ */

  const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];

  // Guarda os parâmetros do anúncio que trouxe o visitante para enviá-los junto com o lead.
  const campaign = (() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = {};
    CAMPAIGN_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) fromUrl[key] = value;
    });
    try {
      if (Object.keys(fromUrl).length) {
        sessionStorage.setItem('lp-campaign', JSON.stringify(fromUrl));
        return fromUrl;
      }
      return JSON.parse(sessionStorage.getItem('lp-campaign')) || {};
    } catch (error) {
      return fromUrl; // armazenamento bloqueado: usa só o que veio na URL
    }
  })();

  /* Cabeçalho e menu mobile ---------------------------------------------- */

  const header = document.querySelector('[data-header]');
  if (header) {
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 16);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (navToggle && nav) {
    const isOpen = () => navToggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    };

    navToggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        navToggle.focus();
      }
    });
    // Ao voltar para o layout desktop, o menu mobile não pode continuar travando a rolagem.
    window.addEventListener('resize', () => {
      if (isOpen() && getComputedStyle(navToggle).display === 'none') setOpen(false);
    });
  }

  /* Revelação ao rolar e contadores -------------------------------------- */

  const formatNumber = (value, decimals) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const { prefix = '', suffix = '' } = el.dataset;
    const start = performance.now();
    const duration = 1600;
    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      el.textContent = `${prefix}${formatNumber(target * eased, decimals)}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const revealables = $$('[data-reveal], [data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          entry.target.classList.add('is-visible');
          if (entry.target.dataset.count) animateCount(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealables.forEach((el) => observer.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-visible'));
  }

  /* Máscara de telefone --------------------------------------------------- */

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2); // colou com +55
    digits = digits.slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  $$('input[data-mask="phone"]').forEach((input) => {
    input.addEventListener('input', () => {
      input.value = formatPhone(input.value);
    });
  });

  /* Formulários de lead --------------------------------------------------- */

  const cleanLabel = (text) =>
    text
      .replace(/\*/g, '')
      .replace(/\(opcional\)/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[?:]$/, ''); // "Do que você precisa?" vira "Do que você precisa: …" no resumo

  const labelFor = (field) => {
    if (field.dataset.label) return field.dataset.label;
    if (field.type === 'radio' || field.type === 'checkbox') {
      const legend = field.closest('fieldset')?.querySelector('legend');
      if (legend) return cleanLabel(legend.textContent);
    }
    return cleanLabel(field.labels?.[0]?.textContent || field.name);
  };

  // Resumo legível do que foi preenchido, usado na mensagem pronta do WhatsApp.
  const summarize = (form) => {
    const groups = new Map();
    Array.from(form.elements).forEach((field) => {
      if (!field.name || field.disabled || ['hidden', 'submit', 'button', 'fieldset'].includes(field.type)) return;
      if ((field.type === 'radio' || field.type === 'checkbox') && !field.checked) return;
      if (field.tagName === 'SELECT' && !field.value) return;
      const value = (field.tagName === 'SELECT' ? field.selectedOptions[0].textContent : field.value).trim();
      if (!value) return;
      if (!groups.has(field.name)) groups.set(field.name, { label: labelFor(field), values: [] });
      groups.get(field.name).values.push(value);
    });
    return Array.from(groups.values()).map(({ label, values }) => `${label}: ${values.join(', ')}`);
  };

  const whatsappLink = (text) =>
    `https://wa.me/${document.body.dataset.whatsapp || ''}?text=${encodeURIComponent(text)}`;

  const validationMessage = (field) => {
    const { validity } = field;
    if (validity.valueMissing) {
      if (field.type === 'radio') return 'Escolha uma das opções.';
      if (field.tagName === 'SELECT') return 'Selecione uma opção.';
      return 'Preencha este campo.';
    }
    // O navegador aceita "nome@empresa" sem domínio completo; para lead, exigimos o ".com", ".com.br" etc.
    if (field.type === 'email' && field.value && (validity.typeMismatch || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(field.value))) {
      return 'Informe um e-mail válido, como nome@empresa.com.br.';
    }
    if (field.dataset.mask === 'phone' && field.value && field.value.replace(/\D/g, '').length < 10) {
      return 'Informe o número com DDD.';
    }
    if (!validity.valid) return field.title || 'Confira este campo.';
    return '';
  };

  // Mantém dicas que já estavam em aria-describedby e acrescenta a mensagem de erro.
  const describe = (field, errorId) => {
    if (!('baseDescribedby' in field.dataset)) field.dataset.baseDescribedby = field.getAttribute('aria-describedby') || '';
    const ids = [field.dataset.baseDescribedby, errorId].filter(Boolean).join(' ');
    if (ids) field.setAttribute('aria-describedby', ids);
    else field.removeAttribute('aria-describedby');
  };

  const showError = (field, message) => {
    const group = field.type === 'radio' ? $$(`input[name="${CSS.escape(field.name)}"]`, field.form) : [field];
    const holder = (field.type === 'radio' && field.closest('fieldset')) || field.closest('.field') || field.parentElement;
    let error = holder.querySelector(':scope > .field-error');

    if (!message) {
      error?.remove();
      group.forEach((el) => {
        el.removeAttribute('aria-invalid');
        describe(el, '');
      });
      return true;
    }

    if (!error) {
      error = document.createElement('p');
      error.className = 'field-error';
      error.id = `${field.form.id}-${field.name}-erro`;
      holder.append(error);
    }
    error.textContent = message;
    group.forEach((el) => {
      el.setAttribute('aria-invalid', 'true');
      describe(el, error.id);
    });
    return false;
  };

  const validatable = (scope) =>
    $$('input, select, textarea', scope).filter((field) => field.willValidate && field.type !== 'hidden');

  // Valida os campos, mostra as mensagens e leva o foco ao primeiro problema.
  const validate = (fields) => {
    let firstInvalid = null;
    const seenGroups = new Set();
    fields.forEach((field) => {
      if (field.type === 'radio') {
        if (seenGroups.has(field.name)) return;
        seenGroups.add(field.name);
      }
      if (!showError(field, validationMessage(field)) && !firstInvalid) firstInvalid = field;
    });
    firstInvalid?.focus();
    return !firstInvalid;
  };

  const initLeadForm = (form, index) => {
    form.id ||= `formulario-${index + 1}`;
    form.noValidate = true;
    const submitButton = form.querySelector('[type="submit"]');
    const steps = $$('[data-step]', form);
    let currentStep = 0;

    // Parâmetros de campanha e página de origem viajam como campos ocultos.
    Object.entries({ ...campaign, pagina: window.location.href.split(/[?#]/)[0] }).forEach(([name, value]) => {
      let input = form.querySelector(`input[type="hidden"][name="${CSS.escape(name)}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.append(input);
      }
      input.value = value;
    });

    const revalidate = (event) => {
      if (event.target.getAttribute('aria-invalid') === 'true') showError(event.target, validationMessage(event.target));
    };
    form.addEventListener('input', revalidate);
    form.addEventListener('change', revalidate);
    form.addEventListener('focusout', (event) => {
      const field = event.target;
      if (field.matches('input, select, textarea') && field.willValidate && field.value && field.type !== 'radio') {
        showError(field, validationMessage(field));
      }
    });

    /* Formulário em etapas (data-step) */
    const progress = form.querySelector('[data-step-progress]');
    const status = form.querySelector('[data-step-status]');
    const showStep = (index, moveFocus = true) => {
      currentStep = index;
      steps.forEach((step, i) => step.classList.toggle('is-current', i === index));
      progress?.style.setProperty('--progress', `${((index + 1) / steps.length) * 100}%`);
      if (status) status.textContent = `Etapa ${index + 1} de ${steps.length}`;
      if (moveFocus) steps[index].querySelector('input, select, textarea')?.focus();
    };
    const nextStep = () => {
      if (validate(validatable(steps[currentStep]))) showStep(currentStep + 1);
    };
    if (steps.length) {
      form.addEventListener('click', (event) => {
        if (event.target.closest('[data-step-next]')) {
          event.preventDefault();
          nextStep();
        } else if (event.target.closest('[data-step-prev]')) {
          event.preventDefault();
          showStep(currentStep - 1);
        }
      });
      showStep(0, false);
    }

    const showStatus = (message) => {
      let box = form.querySelector('.form-status');
      if (!box) {
        box = document.createElement('p');
        box.className = 'form-status';
        box.setAttribute('role', 'alert');
        form.append(box);
      }
      box.textContent = message;
    };

    const setBusy = (busy) => {
      if (!submitButton) return;
      submitButton.disabled = busy;
      submitButton.classList.toggle('is-busy', busy);
    };

    const showSuccess = (lines) => {
      let success = form.querySelector('[data-form-success]');
      if (!success) {
        success = document.createElement('div');
        success.setAttribute('data-form-success', '');
        success.className = 'form-success';
        success.textContent = 'Recebemos seus dados! Em breve entraremos em contato.';
        form.append(success);
      }
      const firstName = (form.elements.nome?.value || '').trim().split(/\s+/)[0];
      const intro = form.dataset.waIntro || 'Olá! Acabei de preencher o formulário no site.';
      $$('[data-success-name]', success).forEach((el) => {
        el.textContent = firstName ? `, ${firstName}` : '';
      });
      $$('[data-success-whatsapp]', success).forEach((link) => {
        link.href = whatsappLink([intro, '', ...lines].join('\n'));
      });
      success.tabIndex = -1;
      success.hidden = false;
      form.classList.add('is-sent');
      success.focus();
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (steps.length && currentStep < steps.length - 1) {
        nextStep(); // Enter numa etapa intermediária avança em vez de enviar.
        return;
      }
      if (!validate(validatable(form))) return;

      const lines = summarize(form);
      const endpoint = form.getAttribute('action');
      if (endpoint) {
        setBusy(true);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
          showStatus('Não conseguimos enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.');
          return;
        } finally {
          setBusy(false);
        }
      }
      track('generate_lead', { form_id: form.id, ...campaign });
      showSuccess(lines);
    });
  };

  $$('form[data-lead-form]').forEach(initLeadForm);

  /* Atalhos que preenchem o formulário ----------------------------------- */

  const setFieldValue = (form, name, value) => {
    $$(`[name="${CSS.escape(name)}"]`, form).forEach((field) => {
      if (field.type === 'radio' || field.type === 'checkbox') {
        field.checked = field.value === value;
      } else if (field.tagName === 'SELECT') {
        const option = Array.from(field.options).find((opt) => opt.value === value || opt.textContent.trim() === value);
        if (option) field.value = option.value;
      } else {
        field.value = value;
      }
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  // Ex.: <a href="#contato" data-prefill="plano=Profissional"> escolhe o plano antes de rolar até o formulário.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-prefill]');
    if (!trigger) return;
    const form = document.querySelector(trigger.dataset.prefillForm || 'form[data-lead-form]');
    if (!form) return;
    new URLSearchParams(trigger.dataset.prefill).forEach((value, name) => setFieldValue(form, name, value));
  });

  /* Abas acessíveis (role="tablist") ------------------------------------- */

  $$('[data-tabs]').forEach((container) => {
    const tabs = $$('[role="tab"]', container);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    const select = (index, moveFocus) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (moveFocus) tabs[index].focus();
    };
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key in keys) next = (i + keys[event.key] + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        select(next, true);
      });
    });
    select(Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true')), false);
  });

  /* Autodiagnóstico de risco (data-risk) --------------------------------- */

  $$('[data-risk]').forEach((quiz) => {
    const boxes = $$('input[type="checkbox"]', quiz);
    const weight = (box) => Number(box.dataset.weight || 1);
    const total = boxes.reduce((sum, box) => sum + weight(box), 0);
    const levels = $$('[data-risk-level]', quiz);
    const bar = quiz.querySelector('[data-risk-bar]');
    const count = quiz.querySelector('[data-risk-count]');
    const cta = quiz.querySelector('[data-risk-cta]');

    const update = () => {
      const checked = boxes.filter((box) => box.checked);
      const percent = total ? Math.round((checked.reduce((sum, box) => sum + weight(box), 0) / total) * 100) : 0;
      // Nível ativo: o de maior limite que a pontuação alcançou.
      const active = levels.reduce(
        (best, level) => (percent >= Number(level.dataset.riskLevel) ? level : best),
        levels[0]
      );
      levels.forEach((level) => {
        level.hidden = level !== active;
      });
      quiz.dataset.riskState = active.dataset.riskName || '';
      bar?.style.setProperty('--risk', `${percent}%`);
      if (count) count.textContent = `${checked.length} de ${boxes.length}`;
      if (cta) {
        const items = checked.map((box) => `- ${box.dataset.label || box.closest('label').textContent.trim()}`);
        const text = checked.length
          ? [`Fiz o autodiagnóstico no site (resultado: ${active.dataset.riskLabel}). Itens marcados:`, ...items].join('\n')
          : 'Fiz o autodiagnóstico no site e quero validar a segurança da minha infraestrutura.';
        cta.dataset.prefill = new URLSearchParams({ mensagem: text }).toString();
      }
    };
    quiz.addEventListener('change', update);
    update();
  });

  /* Ano atual no rodapé --------------------------------------------------- */

  $$('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
