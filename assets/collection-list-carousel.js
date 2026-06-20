(function () {
  'use strict';

  var SWIPER_SELECTORS = [
    '.collection-list [data-cl-swiper]',
    '.wdt-testimonial [data-wdt-swiper]'
  ];

  function getInitKey(el) {
    if (el.hasAttribute('data-cl-swiper')) return 'clInit';
    if (el.hasAttribute('data-wdt-swiper')) return 'wdtInit';
    return 'clInit';
  }

  function destroyAll(root) {
    var scope = root || document;

    SWIPER_SELECTORS.forEach(function (selector) {
      scope.querySelectorAll(selector).forEach(function (el) {
        if (el.swiperInstance) {
          el.swiperInstance.destroy(true, true);
          el.swiperInstance = null;
        }
        delete el.dataset[getInitKey(el)];
      });
    });
  }

  function build(el) {
    var initKey = getInitKey(el);
    if (el.dataset[initKey] || !window.Swiper) return;

    var gap = parseInt(el.dataset.gap, 10) || 0;
    var nav = el.dataset.nav || 'navigation';
    var opts = {
      slidesPerView: parseInt(el.dataset.colsMobile, 10) || 2,
      spaceBetween: gap,
      watchOverflow: true,
      breakpoints: {
        750: {
          slidesPerView: parseInt(el.dataset.colsDesktop, 10) || 5,
          spaceBetween: gap
        }
      }
    };

    if (el.hasAttribute('data-wdt-swiper')) {
      opts.slideClass = 'wdt-card';
    }

    if (el.dataset.loop === 'true') opts.loop = true;

    var ap = parseFloat(el.dataset.autoplay) || 0;
    if (ap > 0) {
      opts.autoplay = {
        delay: ap * 1000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      };
    }

    if (nav === 'navigation' || nav === 'both') {
      opts.navigation = {
        nextEl: el.querySelector('.swiper-button-next'),
        prevEl: el.querySelector('.swiper-button-prev')
      };
    }

    if (nav === 'pagination' || nav === 'both') {
      opts.pagination = {
        el: el.querySelector('.swiper-pagination'),
        clickable: true
      };
    }

    el.swiperInstance = new window.Swiper(el, opts);
    el.dataset[initKey] = '1';
  }

  function initAll(root) {
    var scope = root || document;

    SWIPER_SELECTORS.forEach(function (selector) {
      scope.querySelectorAll(selector).forEach(build);
    });
  }

  function boot(root) {
    if (!window.Swiper) return;
    initAll(root);
  }

  function onReady() {
    boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.addEventListener('load', onReady);

  document.addEventListener('shopify:section:load', function (e) {
    boot(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    destroyAll(e.target);
  });

  document.addEventListener('shopify:section:select', function (e) {
    boot(e.target);
  });
})();
