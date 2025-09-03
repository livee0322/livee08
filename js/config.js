// TEST CONFIG (recruit-test & portfolio-test)
window.LIVEE_CONFIG = {
  BASE_PATH: '/livee08',
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

  endpoints: {
    // 홈 섹션
    schedule: '/recruit-test?status=published&limit=6',
    recruits: '/recruit-test?status=published&limit=20',
    products: '/campaigns?type=product&status=published&limit=6',

    // 포트폴리오(테스트 라우터)
    portfolios: '/portfolio-test?status=published&limit=24', // 리스트용
    portfolioBase: '/portfolio-test'                         // 단건용 (/:id)
  },

  thumb: {
    square:  'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
    card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
  }
};