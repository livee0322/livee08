// js/config.js
window.LIVEE_CONFIG = {
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

  // 👉 실제 백엔드 경로에 맞게 필요시 바꿔줘
  endpoints: {
    schedule: '/schedules?date={DATE}&limit=6',   // 예시: /lives or /schedules
    products: '/products?limit=6&onLive=true',    // 예시: /products
    recruits: '/recruits?limit=6&status=open'     // 실제로 쓰는 /recruits 유지
  },

  CLOUDINARY: {
    cloudName: 'dis1og9uq',
    uploadPreset: 'livee_unsigned',
    uploadApi: 'https://api.cloudinary.com/v1_1/dis1og9uq/image/upload'
  },

  thumb: {
    square: 'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
    card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto'
  },

  ui: {
    // 상단/하단 탭 간단 랜더링 텍스트
    tabs: ['숏클립','쇼핑라이브','뉴스서비스','이벤트']
  }
};