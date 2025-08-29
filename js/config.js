// /js/config.js
// 백엔드 index.js의 BASE_PATH(/api/v1)와 동일하게
window.LIVEE_CONFIG = {
  API_BASE: '/api/v1',
  endpoints: {
    // 일정(오늘 라이브 라인업): type 필터 없이 'scheduled'만 조회
    schedule: '/campaigns?status=scheduled&limit=6',

    // 라이브 상품: type=product + 공개된 것만
    products: '/campaigns?type=product&status=published&limit=6',

    // 추천 공고: type=recruit + 공개된 것만
    recruits: '/campaigns?type=recruit&status=published&limit=6'
  },
  ui: { tabs: ['숏클립','쇼핑라이브','뉴스서비스','이벤트'] }
};