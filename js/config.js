// /livee08/js/config.js
window.LIVEE_CONFIG = {
  BASE_PATH: '/livee08',
  API_BASE: 'https://main-server-ekgr.onrender.com/api/v1',

  // 기본 엔드포인트
  endpoints: {
    // ⚠️ 서버 저장 상태가 draft/scheduled일 수도 있으니, 홈 리스트는 상태 필터를 빼거나(권장)
    // recruit-test 라우터를 우선 시도하도록 구성
    recruits: '/recruit-test?limit=20',
    // 필요시 campaigns도 사용 가능: '/campaigns?type=recruit&limit=20'
    schedule: '/campaigns?type=recruit&status=published&limit=6',
    products: '/campaigns?type=product&status=published&limit=6'
  },

  // 디버그 스위치 (콘솔 로깅 on/off)
  debug: true
};