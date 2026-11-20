(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Split text into chars ---------- */
  $$('[data-split]').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    let i = 0;
    for (const c of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--d', i++);
      s.textContent = c === ' ' ? ' ' : c;
      el.appendChild(s);
    }
  });
  $$('.hero__title .split')[1]?.style.setProperty('--base', '220ms');

  /* ---------- Word split for scroll-scrub paragraph ---------- */
  const scrub = $('#scrubText');
  const highlights = ['multilingual', 'calm,', 'organised', 'warmly,', 'completion', 'service'];
  if (scrub) {
    const words = scrub.textContent.trim().split(/\s+/);
    scrub.innerHTML = words.map(w => {
      const hl = highlights.some(h => w.toLowerCase().startsWith(h.replace(',', '')));
      return `<span class="w${hl ? ' hl' : ''}">${w}</span>`;
    }).join(' ');
  }
  const scrubWords = scrub ? $$('.w', scrub) : [];

  /* ---------- Loader ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), count = $('#loaderCount');
  const duration = reduce ? 200 : 2300;
  const t0 = performance.now();
  let imgReady = false;
  const img = $('.arch img');
  if (img.complete) imgReady = true; else img.addEventListener('load', () => imgReady = true, { once: true });
  setTimeout(() => imgReady = true, 4000);

  function tickLoader(now) {
    let p = Math.min(1, (now - t0) / duration);
    p = 1 - Math.pow(1 - p, 3);
    if (!imgReady) p = Math.min(p, .92);
    bar.style.width = (p * 100) + '%';
    count.textContent = Math.round(p * 100);
    if (p < 1) requestAnimationFrame(tickLoader);
    else setTimeout(finishLoader, 250);
  }
  requestAnimationFrame(tickLoader);

  function finishLoader() {
    loader.classList.add('done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('loaded');
    setTimeout(() => {
      $$('.hero [data-split]').forEach(el => el.classList.add('in'));
      $$('.hero .reveal-up').forEach((el, i) => { el.style.setProperty('--rd', (300 + i * 120) + 'ms'); el.classList.add('in'); });
    }, 350);
    setTimeout(() => loader.remove(), 1400);
  }

  /* ---------- Rotating role words ---------- */
  const roles = ['office operations.', 'client relations.', 'sales support.', 'front-desk welcome.', 'logistics & orders.', 'busy teams.'];
  const rot = $('#rotator');
  let ri = 0;
  setInterval(() => {
    const cur = rot.firstElementChild;
    cur.classList.add('w-out');
    setTimeout(() => {
      ri = (ri + 1) % roles.length;
      rot.innerHTML = `<span class="w-in">${roles[ri]}</span>`;
    }, 450);
  }, 2800);

  /* ---------- Starfield / gold dust ---------- */
  const cv = $('#stars'), ctx = cv.getContext('2d');
  let W, H, DPR, parts = [];
  const mouse = { x: -9999, y: -9999 };
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR;
    const n = Math.round(Math.min(140, (innerWidth * innerHeight) / 11000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .18 * DPR, vy: (-Math.random() * .25 - .05) * DPR,
      r: (Math.random() * 1.4 + .3) * DPR, a: Math.random() * .6 + .2, tw: Math.random() * Math.PI * 2,
      hue: Math.random() < .75 ? '232,196,138' : '217,139,139'
    }));
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', e => { mouse.x = e.clientX * DPR; mouse.y = e.clientY * DPR; }, { passive: true });
  let scrollY0 = scrollY;
  function drawStars() {
    ctx.clearRect(0, 0, W, H);
    const dy = (scrollY - scrollY0) * .15 * DPR; scrollY0 = scrollY;
    const R = 140 * DPR;
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy - dy; p.tw += .03;
      const dx = p.x - mouse.x, dyy = p.y - mouse.y, d = Math.hypot(dx, dyy);
      if (d < R) { p.x += dx / d * 1.2; p.y += dyy / d * 1.2; }
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      const a = p.a * (.6 + .4 * Math.sin(p.tw));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${a})`; ctx.fill();
    }
    // constellation lines near cursor
    ctx.lineWidth = .6 * DPR;
    for (let i = 0; i < parts.length; i++) {
      const a = parts[i];
      if (Math.hypot(a.x - mouse.x, a.y - mouse.y) > R * 1.6) continue;
      for (let j = i + 1; j < parts.length; j++) {
        const b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110 * DPR) {
          ctx.strokeStyle = `rgba(232,196,138,${(1 - d / (110 * DPR)) * .35})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawStars);
  }
  if (!reduce) drawStars();

  /* ---------- Custom cursor ---------- */
  if (fine) {
    const c = $('#cursor'), dot = $('#cursorDot');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; }, { passive: true });
    (function loop() {
      cx = lerp(cx, mx, .16); cy = lerp(cy, my, .16);
      c.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(loop);
    })();
    $$('a, button, .card, .tile, .rail span, .pills span').forEach(el => {
      el.addEventListener('pointerenter', () => c.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => c.classList.remove('is-hover'));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine) $$('.magnetic, .magnetic-soft').forEach(el => {
    const k = el.classList.contains('magnetic-soft') ? .12 : .35;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * k}px,${y * k}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- Portrait 3D tilt ---------- */
  const portrait = $('#portrait'), heroV = $('#heroVisual');
  if (fine && !reduce) {
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => {
      const r = heroV.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      portrait.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg)`;
      const pr = portrait.getBoundingClientRect();
      portrait.style.setProperty('--mx', ((e.clientX - pr.left) / pr.width * 100) + '%');
      portrait.style.setProperty('--my', ((e.clientY - pr.top) / pr.height * 100) + '%');
    });
    hero.addEventListener('pointerleave', () => { portrait.style.transform = ''; });
  }

  /* ---------- Card tilt + glare ---------- */
  if (fine && !reduce) $$('.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateY(${(x - .5) * 14}deg) rotateX(${(.5 - y) * 14}deg) translateY(-6px)`;
      card.style.setProperty('--gx', x * 100 + '%'); card.style.setProperty('--gy', y * 100 + '%');
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* ---------- Spotlight tiles & contact boxes ---------- */
  $$('.spot').forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--sx', e.clientX - r.left + 'px'); t.style.setProperty('--sy', e.clientY - r.top + 'px');
  }));
  $$('.cbox').forEach(b => b.addEventListener('pointerenter', e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty('--cx', ((e.clientX - r.left) / r.width * 100) + '%');
    b.style.setProperty('--cy', ((e.clientY - r.top) / r.height * 100) + '%');
  }));

  /* ---------- Copy email ---------- */
  const toast = $('#toast');
  $$('[data-copy]').forEach(a => a.addEventListener('click', () => {
    navigator.clipboard?.writeText(a.dataset.copy).then(() => {
      toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800);
    }).catch(() => {});
  }));

  /* ---------- Pills index ---------- */
  $$('#pills span').forEach((s, i) => s.style.setProperty('--i', i));

  /* ---------- Intersection reveals ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      if (el.classList.contains('lang')) {
        const lvl = +el.dataset.level, bar = $('.bar', el);
        bar.style.strokeDashoffset = 326.7 * (1 - lvl / 100);
      }
      $$('[data-count]', el).forEach(countUp);
      io.unobserve(el);
    });
  }, { threshold: .18, rootMargin: '0px 0px -8% 0px' });

  // stagger siblings
  const groups = new Map();
  $$('.reveal-up').forEach(el => {
    if (el.closest('.hero')) return;
    const p = el.parentElement;
    const i = groups.get(p) || 0; groups.set(p, i + 1);
    el.style.setProperty('--rd', Math.min(i, 6) * 110 + 'ms');
    io.observe(el);
  });
  $$('.job, .pills, .contact [data-split]').forEach(el => io.observe(el));

  function countUp(el) {
    const end = +el.dataset.count, t = performance.now(), dur = 1800;
    (function f(now) {
      const p = Math.min(1, (now - t) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e);
      if (p < 1) requestAnimationFrame(f);
    })(t);
  }

  /* ---------- Scroll-driven bits ---------- */
  const nav = $('#nav'), prog = $('#progress'), tl = $('#timeline'), tlFill = $('#timelineFill');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 40);
    if (!nav.classList.contains('open')) nav.classList.toggle('hide', y > lastY && y > 400);
    lastY = y;

    if (scrub) {
      const r = scrub.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
      const n = Math.round(p * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    if (tl) {
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height));
      tlFill.style.transform = `scaleY(${p})`;
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  if (reduce) scrubWords.forEach(w => w.classList.add('on'));

  /* ---------- Mobile menu ---------- */
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = '';
  }));
})();
