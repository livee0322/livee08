<!-- /public/js/config.js — v2.12 (GH Pages + Render + Cloudinary unsigned fallback) -->
<script>
(function () {
  const prev = window.LIVEE_CONFIG || {};
  const trim = s => (s || "").replace(/\/$/, "");

  const cfg = {
    // GitHub Pages에서 서브폴더 배포 시 루트 경로
    BASE_PATH: "/livee08",

    // Render 메인 서버 API 루트
    API_BASE: "https://main-server-ekgr.onrender.com/api/v1",

    // 공통 플레이스홀더
    placeholderThumb: "default.jpg",

    // ---- 엔드포인트(모두 -test로 통일) ----
    endpoints: {
      // 리스트/상세 베이스
      recruits:      "/recruit-test?status=published&limit=20",
      recruitBase:   "/recruit-test",

      portfolios:    "/portfolio-test?status=published&limit=24",
      portfolioBase: "/portfolio-test",

      news:          "/news-test?status=published&limit=10",
      newsBase:      "/news-test",

      // 숏폼
      shorts:        "/shorts-test?status=published&limit=12",
      shortsMine:    "/shorts-test?mine=1&limit=60",

      // BYHEN 전용
      byhen:         "/byhen-test",

      // 업로드 서명(서버 서명 → 실패 시 unsigned 폴백)
      uploadsSignature: "/uploads/signature"
    },

    // ---- Cloudinary 이미지 변환 프리셋 ----
    thumb: {
      square:   "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
      card169:  "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
      cover169: "c_fill,g_auto,w_1280,h_720,f_auto,q_auto"
    },

    // ---- 업로드 설정: 서버 서명 우선, 실패(401/403/5xx) 시 unsigned 사용 ----
    uploads: {
      preferSigned: true, // /uploads/signature 먼저 시도
      unsigned: {
        cloudName: "YOUR_CLOUD_NAME",      // ← Cloudinary 대시보드 값으로 교체
        uploadPreset: "livee_unsigned",     // ← Unsigned preset 만들어서 입력
        folder: "livee"                     // (선택) 폴더명
      }
    }
  };

  cfg.API_BASE  = trim(cfg.API_BASE);
  cfg.BASE_PATH = trim(cfg.BASE_PATH);

  window.LIVEE_CONFIG = Object.assign({}, prev, cfg);
})();
</script>