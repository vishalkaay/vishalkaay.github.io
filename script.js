(() => {
  'use strict';

  const root = document.documentElement;
  const qs = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (!isMac) qsa('.mod-key').forEach((k) => { k.textContent = 'Ctrl '; });

  // ---------- Intro ----------
  qsa('.rise').forEach((el, i) => el.style.setProperty('--d', 80 + i * 90));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('loaded')));

  // ---------- Reveal on scroll ----------
  const reveals = qsa('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    // stagger siblings that enter together
    reveals.forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 70);
      io.observe(el);
    });
  }

  // ---------- Theme ----------
  const themeBtn = qs('#theme-toggle');
  const currentTheme = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const setTheme = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    themeBtn.setAttribute('aria-label', `Switch to ${t === 'dark' ? 'light' : 'dark'} theme`);
  };
  const toggleTheme = () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  themeBtn.addEventListener('click', toggleTheme);

  // ---------- Toast & copy ----------
  const toastEl = qs('.toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };
  const copyEmail = async (text, btn) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Email copied — talk soon');
      if (btn) { btn.classList.add('copied'); setTimeout(() => btn.classList.remove('copied'), 2000); }
    } catch (e) {
      location.href = `mailto:${text}`;
    }
  };
  qsa('[data-copy]').forEach((b) => b.addEventListener('click', () => copyEmail(b.dataset.copy, b)));

  // ---------- Header, progress, active section ----------
  const nav = qs('.nav');
  const bar = qs('.progress span');
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 20);
    nav.classList.toggle('hide', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  const navLinks = qsa('.nav-links a');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('current', a.getAttribute('href') === `#${e.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    qsa('main section[id]').forEach((s) => so.observe(s));
  }

  // ---------- Mobile menu ----------
  const menuBtn = qs('.menu-btn');
  const menu = qs('#mobile-menu');
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('path').setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M4 8h16M4 16h16');
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('locked', open);
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  qsa('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // ---------- Clock & year ----------
  const clock = qs('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick(); setInterval(tick, 15000);
  qs('#year').textContent = new Date().getFullYear();

  // ---------- Count-up ----------
  const counters = qsa('[data-count]');
  const runCount = (el) => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '';
    if (reduced) return;
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * e).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
    }), { threshold: .6 });
    counters.forEach((c) => co.observe(c));
  }

  // ---------- Canvas helpers ----------
  const visible = new WeakMap();
  const vo = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach((e) => {
    visible.set(e.target, e.isIntersecting);
    if (e.isIntersecting) e.target.closest('.card')?.classList.add('in');
  }), { rootMargin: '100px' }) : null;
  const fit = (canvas, scale = 1) => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2) * scale;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    return { w: canvas.width, h: canvas.height, dpr };
  };
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const hexToRgb = (hex) => {
    const m = hex.replace('#', '').match(/.{2}/g);
    return m ? m.map((x) => parseInt(x, 16)) : [232, 70, 28];
  };
  qsa('.card').forEach((c) => vo?.observe(c));

  // ---------- Hero oscilloscope ----------
  const scope = qs('#scope');
  if (scope) {
    const ctx = scope.getContext('2d');
    const modeLabel = qs('#scope-mode');
    let dims = fit(scope), mix = 0, target = 0, t = 0;
    vo?.observe(scope);
    addEventListener('resize', () => { dims = fit(scope); });
    const hero = qs('.hero');
    hero.addEventListener('pointermove', (e) => {
      target = Math.min(1, Math.max(0, e.clientX / innerWidth));
      modeLabel.textContent = target < .35 ? 'sine · 440 Hz' : target < .7 ? 'harmonics' : 'voice';
    });
    const draw = () => {
      const { w, h, dpr } = dims;
      mix += (target - mix) * .06;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += h / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const accent = cssVar('--accent') || '#ff6a3d';
      const lines = [[accent, 2.2 * dpr, 1], ['rgba(255,255,255,.18)', 1 * dpr, .6]];
      lines.forEach(([color, lw, amp], li) => {
        ctx.beginPath();
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
        for (let x = 0; x <= w; x += 2) {
          const u = x / w;
          const ph = u * Math.PI * 2 * 3 + t * (li ? 1.2 : 2);
          const clean = Math.sin(ph);
          const harm = Math.sin(ph) * .6 + Math.sin(ph * 2.01) * .3 + Math.sin(ph * 3.03) * .2;
          const env = Math.sin(u * Math.PI);
          const voice = (Math.sin(ph * .5) * .5 + Math.sin(ph * 2.7 + Math.sin(t)) * .35 + Math.sin(ph * 5.3) * .18) * (0.4 + env * .8);
          const v = mix < .5 ? clean + (harm - clean) * (mix * 2) : harm + (voice - harm) * ((mix - .5) * 2);
          const y = h / 2 + v * h * .28 * amp * (li ? 1 : env * .3 + .7) + (h * .06);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      t += .035;
    };
    const loop = () => { if (visible.get(scope) !== false) draw(); requestAnimationFrame(loop); };
    if (reduced) draw(); else loop();
  }

  // ---------- Poisson field (Green's function superposition) ----------
  qsa('canvas[data-field="poisson"]').forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.card');
    const S = 4; // downsample factor
    let W, H, img;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(1, Math.round(r.width / S));
      H = canvas.height = Math.max(1, Math.round(r.height / S));
      img = ctx.createImageData(W, H);
    };
    resize(); addEventListener('resize', resize);
    vo?.observe(canvas);
    const sources = [{ x: .25, y: .35, q: 1 }, { x: .72, y: .62, q: -1 }, { x: .5, y: .5, q: .8, mouse: true }];
    let mx = .5, my = .5, tt = 0;
    card.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height;
    });
    const render = () => {
      const dark = currentTheme() === 'dark';
      const [ar, ag, ab] = hexToRgb(cssVar('--accent'));
      const bg = dark ? [29, 29, 27] : [236, 232, 224];
      const cool = dark ? [123, 104, 238] : [90, 72, 200];
      const m = sources[2];
      m.x += (mx - m.x) * .08; m.y += (my - m.y) * .08;
      sources[0].x = .25 + Math.sin(tt) * .05; sources[1].y = .62 + Math.cos(tt * .8) * .06;
      const d = img.data;
      const aspect = W / H;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const u = i / W * aspect, v = j / H;
          let phi = 0;
          for (const s of sources) {
            const dx = u - s.x * aspect, dy = v - s.y;
            phi -= s.q * Math.log(Math.sqrt(dx * dx + dy * dy) + .02);
          }
          const val = Math.tanh(phi * .35);
          const contour = Math.abs(Math.sin(phi * 3.2)) < .08 ? .35 : 0;
          const c = val >= 0 ? [ar, ag, ab] : cool;
          const a = Math.min(1, Math.abs(val) * .9 + contour);
          const k = (j * W + i) * 4;
          d[k] = bg[0] + (c[0] - bg[0]) * a;
          d[k + 1] = bg[1] + (c[1] - bg[1]) * a;
          d[k + 2] = bg[2] + (c[2] - bg[2]) * a;
          d[k + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      tt += .02;
    };
    const loop = () => { if (visible.get(canvas)) render(); requestAnimationFrame(loop); };
    if (reduced) render(); else loop();
  });

  // ---------- Brownian particles ----------
  qsa('canvas[data-field="brownian"]').forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    let dims = fit(canvas);
    addEventListener('resize', () => { dims = fit(canvas); });
    vo?.observe(canvas);
    const N = 70;
    const ps = Array.from({ length: N }, (_, i) => ({ x: Math.random(), y: Math.random(), trail: [], tracer: i === 0 }));
    const step = () => {
      const { w, h, dpr } = dims;
      const ink = cssVar('--viz-ink');
      const accent = cssVar('--accent');
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += (Math.random() - .5) * .012; p.y += (Math.random() - .5) * .012 * (w / h);
        p.x = (p.x + 1) % 1; p.y = (p.y + 1) % 1; // periodic box
        if (p.tracer) {
          const last = p.trail[p.trail.length - 1];
          if (last && (Math.abs(last.x - p.x) > .5 || Math.abs(last.y - p.y) > .5)) p.trail.length = 0;
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 220) p.trail.shift();
          ctx.beginPath(); ctx.strokeStyle = accent; ctx.lineWidth = 1.4 * dpr; ctx.globalAlpha = .8;
          p.trail.forEach((q, k) => (k ? ctx.lineTo(q.x * w, q.y * h) : ctx.moveTo(q.x * w, q.y * h)));
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.fillStyle = p.tracer ? accent : ink;
        ctx.globalAlpha = p.tracer ? 1 : .32;
        ctx.arc(p.x * w, p.y * h, (p.tracer ? 4.5 : 2.6) * dpr, 0, Math.PI * 2);
        ctx.fill(); ctx.globalAlpha = 1;
      }
    };
    const loop = () => { if (visible.get(canvas)) step(); requestAnimationFrame(loop); };
    if (reduced) { for (let i = 0; i < 120; i++) step(); } else loop();
  });

  // ---------- Attention heatmap ----------
  qsa('[data-attn]').forEach((el) => {
    // TSS-centred attention with mark-specific profiles
    const profile = [1, .55, .35, .2, .7];
    const frag = document.createDocumentFragment();
    const cells = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 50; c++) {
        const i = document.createElement('i');
        const dist = Math.abs(c - 25) / 25;
        const a = Math.max(0, profile[r] * Math.exp(-dist * dist * 6) + (Math.random() - .5) * .18);
        i.style.setProperty('--a', a.toFixed(3));
        cells.push(i); frag.appendChild(i);
      }
    }
    el.appendChild(frag);
    if (!reduced) {
      setInterval(() => {
        if (!visible.get(el.closest('.card'))) return;
        for (let k = 0; k < 18; k++) {
          const i = cells[(Math.random() * cells.length) | 0];
          const idx = cells.indexOf(i), r = (idx / 50) | 0, c = idx % 50;
          const dist = Math.abs(c - 25) / 25;
          i.style.setProperty('--a', Math.max(0, profile[r] * Math.exp(-dist * dist * 6) + (Math.random() - .5) * .3).toFixed(3));
        }
      }, 500);
    }
  });

  // ---------- Practice heatmap ----------
  qsa('[data-heat]').forEach((el) => {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 112; k++) {
      const i = document.createElement('i');
      const week = (k / 7) | 0;
      const base = .15 + week / 16 * .6;
      const v = rnd() < .18 ? 0 : Math.min(1, base * (.4 + rnd()));
      i.style.setProperty('--a', v.toFixed(2));
      el.appendChild(i);
    }
  });

  // ---------- Card spotlight ----------
  qsa('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // ---------- Dialog helpers ----------
  const openDialog = (d) => { d.showModal(); document.body.classList.add('locked'); };
  qsa('dialog').forEach((d) => {
    d.addEventListener('close', () => { if (!qs('dialog[open]')) document.body.classList.remove('locked'); });
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    qsa('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
  });

  // ---------- Case studies ----------
  const sheet = qs('#case');
  const openCase = (card) => {
    qs('#case-kicker').textContent = qs('.card-kicker', card).textContent;
    qs('#case-title').textContent = qs('h3', card).textContent;
    qs('#case-tags').innerHTML = qs('.tags', card).innerHTML;
    qs('#case-body').innerHTML = qs('.case', card).innerHTML;
    openDialog(sheet);
    qs('.sheet-inner', sheet).scrollTop = 0;
  };
  qsa('.card').forEach((card) => {
    card.setAttribute('role', 'button');
    card.addEventListener('click', () => openCase(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(card); }
    });
  });

  // ---------- Filters ----------
  const chips = qsa('.chip');
  const bento = qs('.bento');
  const applyFilter = (f) => {
    chips.forEach((c) => { const on = c.dataset.filter === f; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
    bento.classList.toggle('filtered', f !== 'all');
    qsa('.card', bento).forEach((card) => {
      const show = f === 'all' || card.dataset.tags.split(' ').includes(f);
      card.hidden = !show;
      if (show) card.classList.add('in');
    });
  };
  chips.forEach((c) => c.addEventListener('click', () => applyFilter(c.dataset.filter)));

  // ---------- Music stage ----------
  const stage = qs('.stage');
  if (stage) {
    const img = qs('.stage-img', stage), title = qs('.stage-title', stage), sub = qs('.stage-sub', stage);
    const links = qsa('.tracks a');
    let current = links[0];
    const show = (a) => {
      if (a === current) return;
      current?.classList.remove('active');
      current = a; a.classList.add('active');
      stage.classList.add('playing');
      img.classList.add('swap');
      setTimeout(() => {
        img.src = a.dataset.thumb;
        title.textContent = a.dataset.title;
        sub.textContent = a.dataset.sub;
        img.classList.remove('swap');
      }, 180);
    };
    links.forEach((a) => {
      a.addEventListener('pointerenter', () => show(a));
      a.addEventListener('focus', () => show(a));
    });
    qs('.tracks').addEventListener('pointerleave', () => stage.classList.remove('playing'));
    links[0].classList.add('active');
  }

  // ---------- Frames: drag to scroll + lightbox ----------
  const reel = qs('.reel');
  const frames = qsa('.frame', reel);
  let dragMoved = false;
  if (reel) {
    let down = false, startX = 0, startScroll = 0;
    reel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; dragMoved = false; startX = e.clientX; startScroll = reel.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { dragMoved = true; reel.classList.add('dragging'); }
      reel.scrollLeft = startScroll - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      requestAnimationFrame(() => reel.classList.remove('dragging'));
    });
    reel.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.shiftKey) { reel.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
  }
  const lb = qs('#lightbox');
  const lbImg = qs('#lb-img'), lbCap = qs('#lb-cap');
  let lbIndex = 0;
  const showFrame = (i) => {
    lbIndex = (i + frames.length) % frames.length;
    const f = frames[lbIndex];
    const im = qs('img', f);
    lbImg.src = f.dataset.full; lbImg.alt = im.alt;
    lbCap.textContent = `${String(lbIndex + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')} — ${qs('.cap', f).lastChild.textContent.trim()}`;
  };
  frames.forEach((f, i) => f.addEventListener('click', (e) => {
    if (dragMoved) { e.preventDefault(); dragMoved = false; return; }
    showFrame(i); openDialog(lb);
  }));
  qs('.lb-prev').addEventListener('click', () => showFrame(lbIndex - 1));
  qs('.lb-next').addEventListener('click', () => showFrame(lbIndex + 1));
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showFrame(lbIndex - 1);
    if (e.key === 'ArrowRight') showFrame(lbIndex + 1);
  });

  // ---------- Command palette ----------
  const palette = qs('#palette');
  const pInput = qs('#palette-input');
  const pList = qs('#palette-list');
  const go = (hash) => () => { const el = qs(hash); el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
  const ext = (url) => () => window.open(url, '_blank', 'noopener');
  const commands = [
    { g: 'Navigate', label: 'Selected work', ic: '01', run: go('#work') },
    { g: 'Navigate', label: 'Open source', ic: '02', run: go('.oss') },
    { g: 'Navigate', label: 'About & education', ic: '03', run: go('#about') },
    { g: 'Navigate', label: 'Experience', ic: '04', run: go('#experience') },
    { g: 'Navigate', label: 'Music — Melody Diaries', ic: '05', run: go('#music') },
    { g: 'Navigate', label: 'Photos — off the clock', ic: '06', run: go('#frames') },
    { g: 'Navigate', label: 'Contact', ic: '07', run: go('#contact') },
    ...qsa('.card').map((card) => ({ g: 'Projects', label: qs('h3', card).textContent, hint: qs('.card-kicker', card).textContent.split('·')[0].trim(), ic: '◆', run: () => openCase(card) })),
    { g: 'Actions', label: 'Copy email address', ic: '@', run: () => copyEmail('vishalr23@iitk.ac.in') },
    { g: 'Actions', label: 'Toggle light / dark theme', ic: '◐', run: toggleTheme },
    { g: 'Actions', label: 'Open résumé (PDF)', ic: '↗', run: ext('assets/resume.pdf') },
    { g: 'Links', label: 'GitHub', hint: '@vishalkaay', ic: 'GH', run: ext('https://github.com/vishalkaay') },
    { g: 'Links', label: 'LinkedIn', hint: 'Vishal Raj', ic: 'in', run: ext('https://www.linkedin.com/in/vishal-raj-2a074823b/') },
    { g: 'Links', label: 'YouTube', hint: '@vishalr23', ic: '▶', run: ext('https://www.youtube.com/@vishalr23') },
    { g: 'Links', label: 'Instagram', hint: '@highonnotess', ic: 'IG', run: ext('https://www.instagram.com/highonnotess/') },
    { g: 'Links', label: 'X', hint: '@vishalkaaay', ic: 'X', run: ext('https://x.com/vishalkaaay') },
  ];
  let filtered = commands, sel = 0;
  const renderPalette = () => {
    const q = pInput.value.trim().toLowerCase();
    filtered = commands.filter((c) => !q || `${c.label} ${c.hint || ''} ${c.g}`.toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, filtered.length - 1));
    pList.innerHTML = '';
    if (!filtered.length) { pList.innerHTML = '<li class="empty">Nothing matches — try “music” or “GPU”.</li>'; return; }
    let group = '';
    filtered.forEach((c, i) => {
      if (c.g !== group) {
        group = c.g;
        const h = document.createElement('li'); h.className = 'group'; h.setAttribute('role', 'presentation'); h.textContent = group;
        pList.appendChild(h);
      }
      const li = document.createElement('li');
      li.setAttribute('role', 'option'); li.id = `cmd-${i}`;
      li.setAttribute('aria-selected', String(i === sel));
      li.innerHTML = `<span class="ic"></span><span class="lb"></span>${c.hint ? '<small></small>' : ''}`;
      li.querySelector('.ic').textContent = c.ic;
      li.querySelector('.lb').textContent = c.label;
      if (c.hint) li.querySelector('small').textContent = c.hint;
      li.addEventListener('click', () => runCmd(i));
      li.addEventListener('pointermove', () => { if (sel !== i) { sel = i; highlight(); } });
      pList.appendChild(li);
    });
    pInput.setAttribute('aria-activedescendant', `cmd-${sel}`);
  };
  const highlight = () => {
    qsa('[role="option"]', pList).forEach((li) => li.setAttribute('aria-selected', String(li.id === `cmd-${sel}`)));
    pInput.setAttribute('aria-activedescendant', `cmd-${sel}`);
    qs(`#cmd-${sel}`)?.scrollIntoView({ block: 'nearest' });
  };
  const runCmd = (i) => { const c = filtered[i]; if (!c) return; palette.close(); c.run(); };
  const openPalette = () => {
    if (palette.open) return;
    qsa('dialog[open]').forEach((d) => d.close());
    pInput.value = ''; sel = 0; renderPalette(); openDialog(palette); pInput.focus();
  };
  pInput.addEventListener('input', () => { sel = 0; renderPalette(); });
  pInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % filtered.length; highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; highlight(); }
    else if (e.key === 'Enter') { e.preventDefault(); runCmd(sel); }
  });
  qsa('[data-open-palette]').forEach((b) => b.addEventListener('click', openPalette));
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : openPalette(); return; }
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (!typing && !qs('dialog[open]') && e.key === '/') { e.preventDefault(); openPalette(); }
    if (e.key === 'Escape' && !menu.hidden) setMenu(false);
  });
})();
