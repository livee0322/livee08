// js/config.js
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = s => (s || '').replace(/\/+$/, '');

  const cfg = {
    BASE_PATH: '/livee08',
    API_BASE:  'https://main-server-ekgr.onrender.com/api/v1',

    endpoints: {
      // ===== Recruit =====
      recruits:     '/recruit-test?status=published&limit=20',
      recruitBase:  '/recruit-test',

      // ===== Portfolio =====
      portfolios:   '/portfolio-test?status=published&limit=24',
      portfolioBase:'/portfolio-test',

      // ===== News =====
      news:         '/news-test?status=published&limit=10',
      newsBase:     '/news-test',

      // ===== Brand / Model / Shorts =====
      brand:        '/brand-test?status=published&limit=10',
      brandBase:    '/brand-test',

      model:        '/model-test?status=published&limit=24',
      modelBase:    '/model-test',

      shorts:       '/shorts-test?status=published&limit=60',
      shortsBase:   '/shorts-test',

      // Upload signature
      uploadsSignature: '/uploads/signature',

      // ===== Offers (제안) =====
      offersBase:   '/offers-test',
      // (편의용) 필요 시 사용
      offers:       '/offers-test?limit=20',
      offersInbox:  '/offers-test?box=received&limit=20',
      offersOutbox: '/offers-test?box=sent&limit=20',

      // ===== Sponsorship (협찬·홍보) — NEW =====
      sponsorship:      '/sponsorship-test?limit=20',
      sponsorshipBase:  '/sponsorship-test'
    },

    thumb: {
      square:   'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
      card169:  'c_fill,g_auto,w_640,h_360,f_auto,q_auto',
      cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
    },
    placeholderThumb: 'default.jpg'
  };

  cfg.API_BASE  = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();