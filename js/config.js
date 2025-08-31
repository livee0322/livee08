// /js/config.js
window.LIVEE_CONFIG = {
  BASE_PATH: '/alpa',
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',
  endpoints: {
    // 오늘의 일정은 recruit + published 로 맞추기
    schedule: '/campaigns?type=recruit&status=published&limit=6',
    products: '/campaigns?type=product&status=published&limit=6',
    recruits: '/campaigns?type=recruit&status=published&limit=10'
  },
  ui: { tabs: ['숏클립','쇼핑라이브','뉴스','이벤트','서비스'] }
};