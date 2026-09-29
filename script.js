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
