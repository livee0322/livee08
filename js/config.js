// public/js/config.js
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = (s) => (s || "").replace(/\/$/, "");

  const cfg = {
    BASE_PATH: "/livee08",  // GitHub Pages 기준 경로
    API_BASE: "https://main-server-ekgr.onrender.com/api/v1",

    // 모든 엔드포인트를 -test 버전으로 통일
    endpoints: {
      recruits: "/recruit-test?status=published&limit=20",
      recruitBase: "/recruit-test",

      portfolios: "/portfolio-test?status=published&limit=24",
      portfolioBase: "/portfolio-test",

      news: "/news-test?status=published&limit=10",
      newsBase: "/news-test",
    },

    // Cloudinary 변환 규칙
    thumb: {
      square:  "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
      card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
      cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
    },

    // 기본 썸네일
    placeholderThumb: "assets/default.jpg",
  };

  cfg.API_BASE = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();