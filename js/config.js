// config.js — Livee (TEST env)
// 기존 recruit-test / portfolio-test 라우터에 맞춘 엔드포인트 & 썸네일 프리셋
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = (s) => (s || "").replace(/\/$/, "");

  const cfg = {
    // 배포 경로 & API 엔드포인트 루트
    BASE_PATH: "/livee08",
    API_BASE: "https://main-server-ekgr.onrender.com/api/v1",

    // 페이지/섹션에서 재사용할 리스트/단건 엔드포인트
    endpoints: {
      // 홈 섹션
      schedule: "/recruit-test?status=published&limit=6",
      recruits: "/recruit-test?status=published&limit=20",
      products: "/campaigns?type=product&status=published&limit=6",

      // 포트폴리오(테스트 라우터)
      portfolios: "/portfolio-test?status=published&limit=24", // 리스트
      portfolioBase: "/portfolio-test",                       // 단건(:id)
    },

    // Cloudinary 변환 프리셋 (우리 스크립트들이 참조)
    thumb: {
      square:  "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
      card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
      cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
    },

    // 썸네일 없을 때 대체 이미지
    placeholderThumb: "assets/default.jpg",
  };

  // 정규화(꼬리 슬래시 제거)
  cfg.API_BASE = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  // 이전 값이 있으면 보존하되, 위 설정으로 덮어씀
  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();