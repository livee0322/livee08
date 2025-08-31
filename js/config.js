// /js/config.js
window.LIVEE_CONFIG = {
  // ✅ 현재 Pages 레포 경로
  BASE_PATH: '/livee08',

  // 백엔드 API 서버
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

  // 리스트 엔드포인트(서버 라우터 규약과 일치)
  endpoints: {
    schedule: '/campaigns?type=recruit&status=published&limit=6',
    products: '/campaigns?type=product&status=published&limit=6',
    recruits: '/campaigns?type=recruit&status=published&limit=10'
  },

  // 탭 라벨
  ui: { tabs: ['숏클립','쇼핑라이브','뉴스','이벤트','서비스'] }
};