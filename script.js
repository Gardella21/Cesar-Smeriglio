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
  var charlaImg = document.querySelector('.charla img');
  var charla = document.querySelector('.charla');

  /* Aparición escalonada */
  var targets = [
    '.hero__text > *', '.hero__visual', '.trust',
    '.problema__head > *', '.panel', '.destacada',
    '.servicios__head > *', '.bloque__label', '.card',
    '.como__head > *', '.step',
    '.foto', '.sobre__body > *',
    '.trayectoria__col > h3', '.trayectoria__col > p', '.timeline-list li', '.edu-list li',
    '.charla', '.testi__head > *', '.testi',
    '.cta__text > *', '.contact-card'
  ];
  var seen = [];
  var items = [];
  document.querySelectorAll(targets.join(',')).forEach(function (el) {
    if (seen.indexOf(el) !== -1) return;
    seen.push(el);
    var parent = el.parentElement;
    parent.__n = (parent.__n || 0) + 1;
    el.style.setProperty('--d', Math.min(parent.__n - 1, 4) * 0.08 + 's');
    el.classList.add('reveal');
    items.push(el);
  });

  function done(el) {
    // Al terminar la aparición se libera la clase para no pisar las transiciones de hover
    var wait = 800 + parseFloat(el.style.getPropertyValue('--d')) * 1000;
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

  /* Progreso, sombra del header y parallax */
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.pageYOffset;
    var max = root.scrollHeight - window.innerHeight;
    if (progress && max > 0) progress.style.transform = 'scaleX(' + Math.min(y / max, 1) + ')';
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (charlaImg && charla) {
      var r = charla.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        var offset = (r.top + r.height / 2 - window.innerHeight / 2) * -0.08;
        charlaImg.style.setProperty('--py', Math.max(-22, Math.min(22, offset)) + 'px');
      }
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
