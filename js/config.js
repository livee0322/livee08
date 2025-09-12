// public/js/config.js — v2.12.1 (GH Pages + Render API, no upload fallback)
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = (s) => (s || "").replace(/\/$/, "");

  const cfg = {
    // GitHub Pages 서브폴더
    BASE_PATH: "/livee08",

    // Render API 절대 경로
    API_BASE: "https://main-server-ekgr.onrender.com/api/v1",

    // 모든 엔드포인트는 -test 사용
    endpoints: {
      recruits:      "/recruit-test?status=published&limit=20",
      recruitBase:   "/recruit-test",

      portfolios:    "/portfolio-test?status=published&limit=24",
      portfolioBase: "/portfolio-test",

      news:          "/news-test?status=published&limit=10",
      newsBase:      "/news-test",

      shorts:        "/shorts-test?status=published&limit=12",
      shortsMine:    "/shorts-test?mine=1&limit=60",

      // BYHEN 페이지/관리자용(서버 라우터: brands-test.js)
      byhen:         "/brands-test",

      // Cloudinary 서명 엔드포인트
      uploadsSignature: "/uploads/signature",
    },

    // Cloudinary 변환 규칙
    thumb: {
      square:   "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
      card169:  "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
      cover169: "c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
    },

    // 기본 썸네일
    placeholderThumb: "default.jpg",
  };

  cfg.API_BASE  = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();