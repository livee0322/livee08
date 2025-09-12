// byhen.data.js — v1.0.0 (더미 데이터)
window.BYHEN_DATA = {
  id: "byhen",
  name: "BYHEN",
  tagline: "브랜드가 사랑하는 크리에이티브 스튜디오",
  location: "서울 성수동",
  hours: "10:00–19:00 (일·공휴일 휴무)",
  contact: { phone: "02-000-0000", kakaoUrl: "https://pf.kakao.com/_byhen_demo" },
  hero: {
    image: "img/byhen_hero.jpg",        // 없으면 배경색만 표시
    logo:  "img/byhen_logo.jpg"         // 원형 로고
  },
  pricing: [
    {
      id:"basic", name:"베이직", price: 350000, duration:"2h",
      includes:["스튜디오 1시간","라이트 세팅","컷 편집 10장"],
      options:[{name:"원본 전체", price:100000},{name:"메이크업", price:150000}]
    },
    {
      id:"premium", name:"프리미엄", price: 650000, duration:"4h",
      includes:["스튜디오 2시간","감독 1명","컷 편집 20장","숏폼 1개"],
      badge:"추천"
    },
    {
      id:"live", name:"쇼핑라이브 패키지", price: 1200000, duration:"5h",
      includes:["라이브 장비 풀셋","인제스트/송출","녹화본 제공"]
    }
  ],
  availability: {
    leadDays: 3, // 오늘+N 이후에만 예약 가능
    booked: ["2025-09-15","2025-09-20","2025-09-28"],
    closed : ["2025-09-22"],
    timeslots:["10:00","14:00","19:00"]
  },
  studioPhotos: [
    "img/studio1.jpg","img/studio2.jpg","img/studio3.jpg","img/studio4.jpg",
    "img/studio5.jpg","img/studio6.jpg"
  ],
  portfolioPhotos: ["img/pf1.jpg","img/pf2.jpg","img/pf3.jpg","img/pf4.jpg"],
  shorts: [
    // 필요한 만큼 추가
    { provider:"youtube", sourceUrl:"https://youtu.be/dQw4w9WgXcQ",
      thumbnailUrl:"https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      embedUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ" },
    { provider:"youtube", sourceUrl:"https://youtu.be/5NV6Rdv1a3I",
      thumbnailUrl:"https://img.youtube.com/vi/5NV6Rdv1a3I/hqdefault.jpg",
      embedUrl:"https://www.youtube.com/embed/5NV6Rdv1a3I" }
  ],
  faq: [
    { q:"예약금/잔금은 어떻게 결제하나요?", a:"예약금 20% 선결제, 잔금은 촬영 당일 카드/계좌 이체 가능합니다."},
    { q:"취소/환불 규정은?", a:"D-7 100%, D-3 50%, D-1 20%, 당일 취소 환불 불가."}
  ],
  policy: "원본 제공 및 저작권은 계약서 기준을 따릅니다."
};