// /js/config.js
window.LIVEE_CONFIG = {
  BASE_PATH: '/livee08',                            // GitHub Pages 루트
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

  // 서버 라우터와 1:1 매칭 (recruit는 테스트 라우터를 사용)
  endpoints: {
    schedule: '/recruit-test?status=published&limit=6',
    products: '/campaigns?type=product&status=published&limit=6',
    recruits: '/recruit-test?status=published&limit=20'
  },

  // 썸네일 변환 프리셋(클라에서 미리보기용)
  thumb: {
    square: 'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
    card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto'
  }
};