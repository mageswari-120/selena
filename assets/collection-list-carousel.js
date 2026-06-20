(function () {
  'use strict';

  var loadState = 0;
  var pending = [];

  function destroyAll(root) {
    (root || document).querySelectorAll('.collection-list [data-cl-swiper]').forEach(function (el) {
      if (el.swiperInstance) {
        el.swiperInstance.destroy(true, true);
        el.swiperInstance = null;
      }
      delete el.dataset.clInit;
    });
  }

  function build(el) {
    if (el.dataset.clInit || !window.Swiper) return;

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
    el.dataset.clInit = '1';
  }

  function initAll(root) {
    (root || document).querySelectorAll('.collection-list [data-cl-swiper]').forEach(build);
  }

  function ensureSwiper(src, cb) {
    if (window.Swiper) {
      loadState = 2;
      cb();
      return;
    }

    pending.push(cb);
    if (loadState === 1) return;

    loadState = 1;
    var sc = document.createElement('script');
    sc.src = src;
    sc.onload = function () {
      loadState = 2;
      pending.forEach(function (fn) { fn(); });
      pending = [];
    };
    sc.onerror = function () {
      loadState = 0;
      pending = [];
      console.error('[collection-list] Failed to load Swiper from', src);
    };
    document.head.appendChild(sc);
  }

  function waitForSwiper(src, cb) {
    if (window.Swiper) {
      cb();
      return;
    }

    var tries = 0;
    var timer = setInterval(function () {
      if (window.Swiper) {
        clearInterval(timer);
        cb();
        return;
      }
      if (++tries >= 40) {
        clearInterval(timer);
        ensureSwiper(src, cb);
      }
    }, 50);
  }

  function boot(root) {
    var first = (root || document).querySelector('.collection-list [data-cl-swiper]');
    if (!first) return;

    waitForSwiper(first.dataset.swiperJs, function () {
      initAll(root);
    });
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
