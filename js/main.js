/* Sai Infra Services — one-page site behaviour
   Parallax, scroll reveals, section rail, tabs, gallery + lightbox, contact form. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Hero headline: split into words for the mask reveal ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text
      .split(/\s+/)
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--d:${i * 70}ms">${w}</span></span>`)
      .join(' ');
  });

  

  /* ---------- Mobile menu ---------- */
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const links = $$('#navLinks a');

  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${open ? 'close' : 'menu'}"/></svg>`;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Section rail (built from the main nav) ---------- */
  const order = links.map((a) => a.getAttribute('href').slice(1));
  const sections = order.map((id) => document.getElementById(id));
  const rail = $('.rail');
  const fill = document.createElement('span');
  fill.className = 'rail__fill';
  rail.appendChild(fill);
  const nodes = links.map((a, i) => {
    const n = document.createElement('a');
    n.href = a.getAttribute('href');
    n.className = 'rail__node';
    n.style.setProperty('--y', `${(i / (links.length - 1)) * 100}%`);
    n.innerHTML = `<span>${a.textContent}</span>`;
    n.setAttribute('aria-label', a.textContent);
    rail.appendChild(n);
    return n;
  });

  /* ---------- Parallax + scroll state (single rAF loop) ---------- */
  const heroBg = $('[data-hero="bg"]');
  const heroWires = $('.hero__wires');
  const heroBody = $('[data-hero="content"]');
  const parallax = $$('[data-speed]').map((el) => ({
    el,
    host: el.parentElement,
    speed: parseFloat(el.dataset.speed) || 0.1,
  }));

  let tops = [];
  const measure = () => {
    const y = window.scrollY;
    tops = sections.map((s) => s.getBoundingClientRect().top + y);
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    nav.classList.toggle('is-solid', y > 40);

    /* Section rail + active nav link */
    const probe = y + vh * 0.35;
    let idx = 0;
    for (let i = 0; i < tops.length; i++) if (probe >= tops[i]) idx = i;
    if (y + vh >= document.documentElement.scrollHeight - 4) idx = tops.length - 1;
    const last = tops.length - 1;
    const next = idx < last ? tops[idx + 1] : document.documentElement.scrollHeight;
    const frac = idx < last ? clamp((probe - tops[idx]) / (next - tops[idx]), 0, 1) : 1;
    const p = clamp((idx + (idx < last ? frac : 0)) / last, 0, 1);
    rail.style.setProperty('--p', p.toFixed(4));
    nodes.forEach((n, i) => {
      n.classList.toggle('is-passed', i <= idx);
      n.classList.toggle('is-active', i === idx);
    });
    links.forEach((a, i) => a.classList.toggle('is-active', i === idx));

    if (reduce) return;

    /* Hero layers move at different speeds */
    if (y < vh * 1.3) {
      if (heroBg) heroBg.style.transform = `translate3d(0, ${(y * 0.32).toFixed(1)}px, 0) scale(1.04)`;
      if (heroWires) heroWires.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
      if (heroBody) {
        heroBody.style.transform = `translate3d(0, ${(y * -0.08).toFixed(1)}px, 0)`;
        heroBody.style.opacity = clamp(1 - y / (vh * 0.85), 0, 1).toFixed(3);
      }
    }

    /* Images inside frames drift against the scroll */
    for (const it of parallax) {
      const r = it.host.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      const center = r.top + r.height / 2 - vh / 2;
      const limit = r.height * 0.14;
      const shift = clamp(-center * it.speed, -limit, limit);
      it.el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    }
  };
  const requestUpdate = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { measure(); requestUpdate(); });
  window.addEventListener('load', () => { measure(); requestUpdate(); });
  measure();
  update();

  /* ---------- Scroll reveals ---------- */
  $$('.svc-grid, .mission__grid, .str-grid, .proj, .faq__list').forEach((group) => {
    $$('.reveal', group).forEach((el, i) => el.style.setProperty('--i', i));
  });

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-in'); revealObserver.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;
  $$('.reveal').forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add('is-in')));

  /* ---------- Count-up numbers ---------- */
  const countEls = $$('[data-count]');
  const runCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (reduce) { el.textContent = target; return; }
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const t = clamp((now - start) / dur, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); countObserver.unobserve(e.target); } });
    }, { threshold: 0.6 });
    countEls.forEach((el) => { el.textContent = '0'; countObserver.observe(el); });
  }

  /* ---------- Service tabs ---------- */
  const tabs = $$('[role="tab"]');
  const panels = $$('[role="tabpanel"]');
  const activate = (id, focus = false) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach((p) => { p.hidden = p.id !== `panel-${id}`; });
    requestUpdate();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activate(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); activate(tabs[j].dataset.tab, true); }
    });
  });
  $$('[data-open-tab]').forEach((b) => b.addEventListener('click', () => {
    activate(b.dataset.openTab);
    $('#serviceDetail').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));

  /* ---------- Gallery filter ---------- */
  const shots = $$('.shot');
  const chips = $$('.chip');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    shots.forEach((s) => {
      const show = f === 'all' || s.dataset.cat.split(' ').includes(f);
      const wasHidden = s.hidden;
      s.hidden = !show;
      s.classList.remove('is-showing');
      if (show && wasHidden) { void s.offsetWidth; s.classList.add('is-showing'); }
    });
    requestUpdate();
  }));

  /* ---------- Lightbox ---------- */
  const dlg = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCap');
  let visible = [];
  let cur = 0;

  const show = (i) => {
    cur = (i + visible.length) % visible.length;
    const s = visible[cur];
    const img = $('img', s);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = s.dataset.cap || '';
  };
  shots.forEach((s) => s.addEventListener('click', () => {
    visible = shots.filter((x) => !x.hidden);
    show(visible.indexOf(s));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }));
  $('#lbClose').addEventListener('click', () => dlg.close());
  $('#lbPrev').addEventListener('click', () => show(cur - 1));
  $('#lbNext').addEventListener('click', () => show(cur + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  /* ---------- FAQ accordion ---------- */
  const faqItems = $$('.faq-item');
  faqItems.forEach((item) => {
    const btn = $('.faq-q', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      // one answer open at a time
      faqItems.forEach((other) => {
        const on = other === item ? open : false;
        other.classList.toggle('is-open', on);
        $('.faq-q', other).setAttribute('aria-expanded', String(on));
      });
    });
  });

  /* ---------- Client carousel ----------
     Add more logos in index.html and this picks them up automatically:
     arrows appear only when there are more logos than fit on screen. */
  const viewport = $('#carouselViewport');
  if (viewport) {
    const box = $('#clientCarousel');
    const controls = $('#carouselControls');
    const prev = $('#carPrev');
    const next = $('#carNext');
    const playBtn = $('#carPlay');
    const track = viewport.firstElementChild;
    const behavior = reduce ? 'auto' : 'smooth';
    let playing = !reduce;
    let hovering = false;
    let inView = false;

    const overflows = () => viewport.scrollWidth > viewport.clientWidth + 4;
    const atStart = () => viewport.scrollLeft <= 4;
    const atEnd = () => viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 4;
    const step = () => {
      const first = $('.logo', track);
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? first.getBoundingClientRect().width + gap : viewport.clientWidth * 0.8;
    };
    const go = (dir) => {
      if (dir > 0 && atEnd()) viewport.scrollTo({ left: 0, behavior });
      else if (dir < 0 && atStart()) viewport.scrollTo({ left: viewport.scrollWidth, behavior });
      else viewport.scrollBy({ left: dir * step(), behavior });
    };
    const setPlaying = (on) => {
      playing = on;
      playBtn.setAttribute('aria-label', on ? 'Pause automatic scrolling' : 'Start automatic scrolling');
      playBtn.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${on ? 'pause' : 'play'}"/></svg>`;
    };
    const refresh = () => { controls.hidden = !overflows(); };

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    playBtn.addEventListener('click', () => setPlaying(!playing));
    box.addEventListener('mouseenter', () => { hovering = true; });
    box.addEventListener('mouseleave', () => { hovering = false; });
    box.addEventListener('focusin', () => { hovering = true; });
    box.addEventListener('focusout', () => { hovering = false; });
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { threshold: 0.3 }).observe(box);
    } else { inView = true; }
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(viewport);
    window.addEventListener('load', refresh);
    refresh();
    setPlaying(playing);

    setInterval(() => {
      if (playing && !hovering && inView && !document.hidden && overflows()) go(1);
    }, 3600);
  }
})();
