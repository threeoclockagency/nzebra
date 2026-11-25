/* Site interactions, served from our own origin so the CSP can stay
   script-src 'self' with no 'unsafe-inline'. Plain JS, no dependencies. */
(function () {
  'use strict';

  // --- accessible mobile navigation (replaces webflow.js) ---
  var nav = document.getElementById('primary-nav');
  var btn = document.querySelector('.menu-button-2');
  if (nav && btn) {
    var isOpen = function () {
      return btn.getAttribute('aria-expanded') === 'true';
    };
    var open = function () {
      nav.setAttribute('data-nav-menu-open', '');
      btn.classList.add('w--open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Close menu');
      var sn = document.getElementById('site-nav');
      if (sn) sn.classList.remove('nav-hidden'); // keep visible while menu is open
    };
    var close = function () {
      nav.removeAttribute('data-nav-menu-open');
      btn.classList.remove('w--open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
    };
    btn.addEventListener('click', function () {
      isOpen() ? close() : open();
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        close();
        btn.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !btn.contains(e.target)) close();
    });
  }

  // --- sticky header: hide on scroll down, show on scroll up ---
  var siteNav = document.getElementById('site-nav');
  if (siteNav) {
    var lastY = window.scrollY;
    var ticking = false;
    var TOP = 80;
    var update = function () {
      var y = window.scrollY;
      var menuOpen = btn && btn.getAttribute('aria-expanded') === 'true';
      var focusInside = siteNav.contains(document.activeElement);
      if (y > 8) siteNav.classList.add('nav-solid');
      else siteNav.classList.remove('nav-solid');
      if (y <= TOP || menuOpen || focusInside) {
        siteNav.classList.remove('nav-hidden');
      } else if (y > lastY + 4) {
        siteNav.classList.add('nav-hidden');
      } else if (y < lastY - 4) {
        siteNav.classList.remove('nav-hidden');
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true },
    );
    siteNav.addEventListener('focusin', function () {
      siteNav.classList.remove('nav-hidden');
    });
    update();
  }

  // --- "Copy link" button on news articles ---
  var copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn && navigator.clipboard) {
    var status = document.querySelector('.copy-link-status');
    var timer;
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.href).then(
        function () {
          if (!status) return;
          status.textContent = 'Link copied';
          clearTimeout(timer);
          timer = setTimeout(function () {
            status.textContent = '';
          }, 3000);
        },
        function () {
          if (status) status.textContent = 'Could not copy link';
        },
      );
    });
  }

  // --- subtle scroll-in reveal (below-the-fold only, reduced-motion aware) ---
  var reveals = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reveals.length && !reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    reveals.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal--armed');
        io.observe(el);
      }
    });
  }

  // --- "Our solution" timeline: the dashed line draws in on scroll ---
  var bars = document.querySelectorAll('.uui-layout32_progress-bar');
  if (bars.length && !reduce && 'IntersectionObserver' in window) {
    var barIO = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-drawn');
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    bars.forEach(function (bar) {
      bar.classList.add('timeline-armed');
      barIO.observe(bar);
    });
  }
})();
