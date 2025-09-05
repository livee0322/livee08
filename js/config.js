// public/js/config.js
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = (s) => (s || "").replace(/\/$/, "");

  const cfg = {
    BASE_PATH: "/livee08",
    API_BASE: "https://main-server-ekgr.onrender.com/api/v1",
    endpoints: {
      portfolios: "/portfolio-test?status=published&limit=24",
      portfolioBase: "/portfolio-test",
    },
    thumb: {
      square:  "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
      card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
      cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
    },
    placeholderThumb: "assets/default.jpg",
  };

  cfg.API_BASE = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();