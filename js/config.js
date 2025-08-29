// /js/config.js
window.LIVEE_CONFIG = {
  BASE_PATH: '/alpa', // 내부 링크는 상대경로로 처리하므로 여기 값은 API 외 용도로는 사용 안함
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',
  CLOUDINARY: {
    cloudName: 'dis1og9uq',
    uploadPreset: 'livee_unsigned',
    uploadApi: 'https://api.cloudinary.com/v1_1/dis1og9uq/image/upload'
  },
  thumb: {
    square: 'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
    card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto'
  }
};