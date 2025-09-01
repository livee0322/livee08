// TEST CONFIG (recruit-test 기준)
window.LIVEE_CONFIG = {
  // GitHub Pages 서브폴더
  BASE_PATH: '/livee08',

  // 백엔드 API 절대경로 (꼭 절대 URL)
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

  // 홈에서 사용할 리스트 엔드포인트
  endpoints: {
    // 오늘의 라인업/추천 공고 = 테스트 라우터 사용
    schedule: '/recruit-test?status=published&limit=6',
    recruits: '/recruit-test?status=published&limit=20',
    // 상품은 기존 campaigns 유지(필요 없으면 주석처리 가능)
    products: '/campaigns?type=product&status=published&limit=6',
  },

  // 이미지 미리보기 변환 프리셋 (Cloudinary URL일 때만 적용됨)
  thumb: {
    square: 'c_fill,g_auto,w_320,h_320,f_auto,q_auto',
    card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto'
  }
};