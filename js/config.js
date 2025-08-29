// /js/config.js
// GitHub Pages에서 사용할 절대경로(API 서버 도메인 고정)
window.LIVEE_CONFIG = {
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',
  endpoints: {
    // 라우터 검증과 일치(allowed: product|recruit, status: draft|scheduled|published|closed)
    schedule: '/campaigns?status=scheduled&limit=6',
    products: '/campaigns?type=product&status=published&limit=6',
    recruits: '/campaigns?type=recruit&status=published&limit=6'
  },
  ui: { tabs: ['숏클립','쇼핑라이브','뉴스서비스','이벤트'] }
};