// 백엔드 index.js의 BASE_PATH(/api/v1)와 맞춤
window.LIVEE_CONFIG = {
  API_BASE: '/api/v1',
  endpoints: {
    // 통합 campaigns 라우터 활용
    schedule: '/campaigns?type=live&limit=6',
    products: '/campaigns?type=product&limit=6',
    recruits: '/campaigns?type=recruit&status=open&limit=6'
  },
  ui: { tabs: ['숏클립','쇼핑라이브','뉴스서비스','이벤트'] }
};

// 다른 도메인에서 API를 쓴다면 위 API_BASE를 'https://main-server-ekgr.onrender.com/api/v1' 로 바꿔주세요.