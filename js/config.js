// js/config.js
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = s => (s || '').replace(/\/+$/, '');

  const cfg = {
    BASE_PATH: '/livee08',
    API_BASE:  'https://main-server-ekgr.onrender.com/api/v1',

    endpoints: {
      recruits: '/recruit-test?status=published&limit=20',
      recruitBase: '/recruit-test',

      portfolios: '/portfolio-test?status=published&limit=24',
      portfolioBase: '/portfolio-test',

      news: '/news-test?status=published&limit=10',
      newsBase: '/news-test',

      // BRAND (router: routes/brand-test.js, model: models/Brand-test.js)
      brand: '/brand-test?status=published&limit=10',
      brandBase: '/brand-test',

      // MODEL
      model: '/model-test?status=published&limit=24',
      modelBase: '/model-test',

      // SHORTS
      shorts: '/shorts-test?status=published&limit=60',
      shortsBase: '/shorts-test',

      // Upload signature (서명 업로드 엔드포인트)
      uploadsSignature: '/uploads/signature',

      // ===== OFFERS (proposals) =====
      // inbox-proposals.js 는 offersBase 만 사용합니다.
      offersBase: '/offers-test',
      // 편의용(원하면 리스트 불러올 때 사용 가능)
      offers: '/offers-test?limit=20',
      offersInbox: '/offers-test?inbox=1&limit=20',
      offersOutbox: '/offers-test?outbox=1&limit=20'
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