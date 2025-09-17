
// byhen.data.js — v1.2.0 (BrandPage 스키마와 1:1)
window.BYHEN_DATA = {
  slug: "byhen",
  name: "BYHEN",
  tagline: "브랜드가 사랑하는 크리에이티브 스튜디오",
  location: "서울 성수동",
  hours: "10:00–19:00 (일·공휴일 휴무)",
  contact: {
    phone: "02-000-0000",
    kakaoUrl: "https://pf.kakao.com/_byhen_demo",
    email: ""
  },
  tags: ["제품", "뷰티", "패션", "촬영대행"],

  hero: {
    images: ["img/studio1.jpg","img/studio2.jpg","img/studio3.jpg","img/studio4.jpg"]
    // image: "img/byhen_hero.jpg" // 단일만 있을 때도 사용 가능
  },

  rating: { avg: 4.8, count: 45 },

  description:
    "한 공간에서 다양한 컨셉 촬영이 가능한 성수동 스튜디오입니다.\n" +
    "제품/룩북/프로필/숏폼 등 상업 촬영에 최적화되어 있어요.",
  rules:
    "예약금 20% 선결제, 촬영 3일 전 50% 환불, 1일 전 20%, 당일 환불 불가.\n" +
    "* 실내 흡연/반려동물 동반/강한 접착류 사용은 제한됩니다.",

  map: {
    embedUrl: "",                                  // 카카오/네이버/구글 임베드
    staticImage: "img/map_placeholder.jpg",        // 정적 이미지
    link: "https://map.naver.com/"                 // 외부 지도 링크
  },

  availability: {
    leadDays: 3,
    booked: ["2025-09-15","2025-09-20","2025-09-28"], // YYYY-MM-DD
    closed : ["2025-09-22"],
    timeslots:["10:30","13:00","15:00","17:30","19:00"] // 원하는 시간대
  },

  pricing: [
    { id:"basic", name:"베이직", price:350000, duration:"2h",
      includes:["스튜디오 1시간","라이트 세팅","컷 편집 10장"],
      options:[{name:"원본 전체", price:100000},{name:"메이크업", price:150000}] },
    { id:"premium", name:"프리미엄", price:650000, duration:"4h",
      includes:["스튜디오 2시간","감독 1명","컷 편집 20장","숏폼 1개"], badge:"추천" }
  ],

  studioPhotos: ["img/studio5.jpg","img/studio6.jpg"],
  portfolioPhotos: ["img/pf1.jpg","img/pf2.jpg"],

  shorts: [
    { provider:"youtube",
      sourceUrl:"https://youtu.be/dQw4w9WgXcQ",
      thumbnailUrl:"https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      embedUrl:"https://www.youtube.com/embed/dQw4w9WgXcQ" }
  ]
};
