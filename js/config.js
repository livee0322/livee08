/* config.js — v3.2 (routes aligned to byhen / byhen-admin, Brand-test.js model, brand-test.js router) */
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = s => (s || '').replace(/\/$/, '');

  const cfg = {
    // GitHub Pages 등 서브 폴더 배포 시 사용
    BASE_PATH: '/livee08',

    // 서버 베이스 URL
    API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

    // ===== Endpoints (모두 단수 · 파일명 일치) =====
    endpoints: {
      // Recruit
      recruits: '/recruit-test?status=published&limit=20',
      recruitBase: '/recruit-test',

      // Portfolio
      portfolios: '/portfolio-test?status=published&limit=24',
      portfolioBase: '/portfolio-test',

      // News
      news: '/news-test?status=published&limit=10',
      newsBase: '/news-test',

      // BRAND (byhen / byhen-admin ↔ brand-test.js router, Brand-test.js model)
      brand: '/brand-test?status=published&limit=10',
      brandBase: '/brand-test',

      // Model
      model: '/model-test?status=published&limit=24',   // 공개 리스트
      modelBase: '/model-test',                         // 단건 CRUD

      // Shorts
      shorts: '/shorts-test?status=published&limit=60',
      shortsBase: '/shorts-test',

      // Uploads
      uploadsSignature: '/uploads/signature'
    },

    // 이미지 변환 프리셋 (Cloudinary 등)
    thumb: {
      square:   'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
      card169:  'c_fill,g_auto,w_640,h_360,f_auto,q_auto',
      cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
    },

    // 썸네일 없을 때 대체 이미지
    placeholderThumb: 'default.jpg'
  };

  cfg.API_BASE  = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();

// 누구나 업로드 허용(서버 사인 없이)
window.LIVEE_CONFIG = Object.assign({}, window.LIVEE_CONFIG, {
  cloudinaryUnsigned: {
    cloudName: "YOUR_CLOUD_NAME",
    uploadPreset: "YOUR_UNSIGNED_PRESET" // unsigned preset
  }
});