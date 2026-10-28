/* TF. — shared behaviour: theme, header, reveal, hero effects */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- header ---- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    var bar = document.querySelector('.progress');
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---- reveal on scroll (also covers items injected later) ---- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  window.tfReveal = function (scope) {
    (scope || document).querySelectorAll('.reveal:not(.in)').forEach(function (el, i) {
      if (!io) { el.classList.add('in'); return; }
      io.observe(el);
    });
  };
  window.tfReveal();

  /* ---- hero effects ---- */
  var hero = document.querySelector('.hero');
  if (hero && !reduce) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      hero.style.setProperty('--mx', (nx * 100) + '%');
      hero.style.setProperty('--my', (ny * 100) + '%');
      tx = (nx - .5) * -16; ty = (ny - .5) * -10;
      if (!raf) raf = requestAnimationFrame(step);
    });
    function step() {
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      hero.style.setProperty('--px', cx.toFixed(2));
      hero.style.setProperty('--py', cy.toFixed(2));
      raf = (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05) ? requestAnimationFrame(step) : null;
    }
  }

  /* rain */
  var canvas = document.getElementById('rain');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d'), W, H, drops = [], running = true;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(W / 9);
      drops = [];
      for (var i = 0; i < n; i++) drops.push(spawn(true));
    }
    function spawn(anywhere) {
      return { x: Math.random() * (W + 200) - 100, y: anywhere ? Math.random() * H : -20, l: 10 + Math.random() * 18, v: 9 + Math.random() * 9, a: .08 + Math.random() * .22 };
    }
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        ctx.strokeStyle = 'rgba(190,215,245,' + d.a + ')';
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .22, d.y + d.l); ctx.stroke();
        d.y += d.v; d.x -= d.v * .22;
        if (d.y > H) drops[i] = spawn(false);
      }
      requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) draw(); });
    draw();
  }

  /* terminal typing line */
  var term = document.querySelector('[data-typed]');
  if (term) {
    var lines = JSON.parse(term.dataset.typed), li = 0, ci = 0, del = false;
    var out = term.querySelector('.out');
    if (reduce) { out.textContent = lines[0]; }
    else (function tick() {
      var s = lines[li];
      if (!del) { ci++; out.textContent = s.slice(0, ci); if (ci === s.length) { del = true; return setTimeout(tick, 2200); } return setTimeout(tick, 55 + Math.random() * 45); }
      ci--; out.textContent = s.slice(0, ci);
      if (ci === 0) { del = false; li = (li + 1) % lines.length; return setTimeout(tick, 400); }
      setTimeout(tick, 22);
    })();
  }
})();
