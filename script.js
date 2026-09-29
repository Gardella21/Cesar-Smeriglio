/* Header: transparente sobre la foto del hero mientras se está arriba */
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  function sync() { header.classList.toggle('is-top', window.pageYOffset < 24); }
  window.addEventListener('scroll', sync, { passive: true });
  sync();
})();

(function () {
  'use strict';

  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('menu');
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();
  if (!toggle || !menu) return;

  var desktop = window.matchMedia('(min-width: 900px)');
  var LABEL_OPEN = 'Abrir menú';
  var LABEL_CLOSE = 'Cerrar menú';

  var ICON_OPEN = '<path d="M4 7h16M4 12h16M4 17h16"/>';
  var ICON_CLOSE = '<path d="M6 6l12 12M18 6L6 18"/>';

  function focusables() {
    // Botón del menú (en el header) + enlaces y botón dentro del panel
    return [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll('a[href]')));
  }

  function setOpen(open, restoreFocus) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? LABEL_CLOSE : LABEL_OPEN);
    toggle.querySelector('svg').innerHTML = open ? ICON_CLOSE : ICON_OPEN;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = menu.querySelector('a[href]');
      if (first) first.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(menu.hidden, true);
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false, false);
  });

  document.addEventListener('keydown', function (e) {
    if (menu.hidden) return;
    if (e.key === 'Escape') {
      setOpen(false, true);
      return;
    }
    if (e.key === 'Tab') {
      var items = focusables();
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  desktop.addEventListener('change', function (e) {
    if (e.matches && !menu.hidden) setOpen(false, false);
  });
})();

/* Efectos de scroll: solo si la página marcó html.js (sin prefers-reduced-motion) */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('js')) return;

  var header = document.querySelector('.site-header');
  var progress = document.querySelector('.progress');

  /* Aparición escalonada */
  var targets = [
    '.problema__head > *', '.panel', '.destacada',
    '.servicios__head > *', '.bloque__label', '.card',
    '.como__head > *', '.step',
    '.foto', '.sobre__body > *',
    '.trayectoria__col > h3', '.trayectoria__col > p', '.timeline-list li', '.edu-list li',
    '.testi__head > *', '.testi',
    '.cta__text > *', '.contact-card'
  ];
  var seen = [];
  var items = [];
  document.querySelectorAll(targets.join(',')).forEach(function (el) {
    if (seen.indexOf(el) !== -1) return;
    seen.push(el);
    var parent = el.parentElement;
    parent.__n = (parent.__n || 0) + 1;
    el.style.setProperty('--d', Math.min(parent.__n - 1, 4) * 0.12 + 's');
    el.classList.add('reveal');
    items.push(el);
  });

  function done(el) {
    // Al terminar la aparición se libera la clase para no pisar las transiciones de hover
    var wait = 1100 + parseFloat(el.style.getPropertyValue('--d')) * 1000;
    setTimeout(function () { el.classList.remove('reveal'); }, wait);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        done(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });

    var tl = document.querySelector('.timeline');
    if (tl) {
      var io2 = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { tl.classList.add('in'); io2.disconnect(); }
      }, { threshold: 0.25 });
      io2.observe(tl);
    }
  } else {
    items.forEach(function (el) { el.classList.remove('reveal'); });
    var t = document.querySelector('.timeline');
    if (t) t.classList.add('in');
  }

  /* Progreso y sombra del header */
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.pageYOffset;
    var max = root.scrollHeight - window.innerHeight;
    if (progress && max > 0) progress.style.transform = 'scaleX(' + Math.min(y / max, 1) + ')';
    if (header) header.classList.toggle('is-scrolled', y > 8);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* Scroll suave con inercia (más lento que el nativo) y asentado del contenido al centro.
   Solo sin prefers-reduced-motion. La inercia solo con mouse; el asentado, con mouse y táctil. */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('js')) return;

  var fine = window.matchMedia('(pointer: fine)').matches;

  var WHEEL_FACTOR = 0.55; // cuánto avanza cada giro de rueda respecto del nativo
  var EASE = 0.075;        // cuanto más chico, más lento y largo el deslizamiento
  var SETTLE_DELAY = 220;  // ms sin mover el scroll antes de asentar
  var EDGE_GAP = 40;       // aire (px) al alinear secciones más altas que la pantalla

  var header = document.querySelector('.site-header');
  var current = window.pageYOffset;
  var target = current;
  var raf = 0;
  var settleTimer = 0;
  var touching = false;
  var gestureStart = null; // posición donde empezó el gesto de scroll actual

  function maxScroll() {
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }
  function clamp(v) {
    return Math.max(0, Math.min(maxScroll(), v));
  }
  function jump(y) {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  }
  function tick() {
    var diff = target - current;
    if (Math.abs(diff) < 0.4) {
      current = target;
      jump(current);
      raf = 0;
      return;
    }
    current += diff * EASE;
    jump(current);
    raf = requestAnimationFrame(tick);
  }
  function go(y) {
    target = clamp(y);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function move(y) {
    if (fine) go(y);
    else window.scrollTo({ top: clamp(y), left: 0, behavior: 'smooth' });
  }

  /* Bloques que se centran dentro de secciones más altas que la pantalla */
  var UNITS = {
    servicios: '.bloque',
    'sobre-cesar': '.sobre__grid, .trayectoria, .sobre__cierre'
  };

  /* Puntos de asentado: cada bloque de contenido centrado; si un bloque es más alto que la pantalla,
     se alinean sus bordes y entre ellos el scroll queda libre. */
  function snapData() {
    var vh = window.innerHeight;
    var headerH = header ? header.offsetHeight : 0;
    var avail = vh - headerH;
    var pts = [0, maxScroll()];
    var zones = [];

    function addBlock(top, bottom) {
      var h = bottom - top;
      if (h <= avail - EDGE_GAP * 2) {
        pts.push(top - headerH - (avail - h) / 2);
      } else {
        var lo = clamp(top - headerH - EDGE_GAP);
        var hi = clamp(bottom - vh + EDGE_GAP);
        pts.push(lo, hi);
        if (hi > lo) zones.push([lo, hi]);
      }
    }

    document.querySelectorAll('main > section[id]:not(#inicio)').forEach(function (sec) {
      var cs = getComputedStyle(sec);
      var r = sec.getBoundingClientRect();
      var top = r.top + window.pageYOffset + parseFloat(cs.paddingTop);
      var bottom = r.bottom + window.pageYOffset - parseFloat(cs.paddingBottom);
      var units = UNITS[sec.id] ? sec.querySelectorAll(UNITS[sec.id]) : [];
      if (!units.length) { addBlock(top, bottom); return; }
      pts.push(top - headerH - EDGE_GAP);   // arranque de la sección, con su título
      units.forEach(function (u) {
        var ur = u.getBoundingClientRect();
        addBlock(ur.top + window.pageYOffset, ur.bottom + window.pageYOffset);
      });
    });
    return { pts: pts.map(clamp), zones: zones };
  }

  function settle() {
    settleTimer = 0;
    if (raf) { scheduleSettle(); return; }   // esperar a que termine el deslizamiento
    var start = gestureStart;
    gestureStart = null;
    touching = false;
    if (document.body.style.overflow === 'hidden') return;
    var y = window.pageYOffset;
    if (start === null) start = y;
    var data = snapData();
    for (var i = 0; i < data.zones.length; i++) {
      if (y > data.zones[i][0] + 2 && y < data.zones[i][1] - 2) return;   // scroll libre dentro de la sección
    }
    var dir = y > start + 30 ? 1 : (y < start - 30 ? -1 : 0);
    var best = null;
    data.pts.forEach(function (p) {
      if (dir !== 0 && (p - start) * dir <= 2) return;                    // solo puntos hacia donde se scrolleó
      if (best === null || Math.abs(p - y) < Math.abs(best - y)) best = p;
    });
    if (best !== null && Math.abs(best - y) > 2) move(best);
  }
  function scheduleSettle() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, SETTLE_DELAY);
  }

  if (fine) {
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented) return;                 // zoom del navegador
      if (document.body.style.overflow === 'hidden') return;       // menú abierto
      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= window.innerHeight;
      e.preventDefault();
      if (gestureStart === null) gestureStart = raf ? target : window.pageYOffset;
      if (!raf) { current = window.pageYOffset; target = current; }
      go(target + delta * WHEEL_FACTOR);
      scheduleSettle();
    }, { passive: false });

    // Anclas internas con el mismo deslizamiento lento
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      var margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (!raf) current = window.pageYOffset;
      if (gestureStart === null) gestureStart = raf ? target : window.pageYOffset;
      go(el.getBoundingClientRect().top + window.pageYOffset - margin);
      history.pushState(null, '', id);
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      scheduleSettle();
    });
  } else {
    window.addEventListener('touchstart', function () {
      touching = true;
      if (gestureStart === null) gestureStart = window.pageYOffset;
    }, { passive: true });
  }

  // Si el scroll cambia por otro medio (teclado, barra, ancla nativa), se sincroniza sin asentar
  window.addEventListener('scroll', function () {
    if (!raf) { current = window.pageYOffset; target = current; }
    if (!fine && touching) scheduleSettle();
  }, { passive: true });
})();
