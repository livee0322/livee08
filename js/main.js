(() => {
  const $ = (s) => document.querySelector(s);

  const state = {
    schedule: [
      { title:"추리예능, 여고추리반 출시 기념 라이브 방송", brand:"예나", promo:"예나 안경 할인 최대 50%", start:"2025-08-30T18:30:00" },
      { title:"예나 컴백 기념 라이브 방송", brand:"예나", promo:"예나 안경 할인 최대 50%", start:"2025-08-30T19:30:00" }
    ],
    recruits: [
      { title:"여고추리반 라이브", fee:300000, due:"2025-09-07" },
      { title:"뷰티 콜라보", fee:250000, due:"2025-09-15" }
    ],
    portfolios: [
      { name:"최예나", years:5, intro:"뷰티 방송 전문", region:"서울" },
      { name:"김소라", years:3, intro:"테크/라이프 쇼호스트", region:"부산" }
    ]
  };

  function renderHome(){
    return `
      <!-- 오늘의 라이브 라인업 -->
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more">더보기</a></div>
        <div class="list-vert">
          ${state.schedule.map(it=>`
            <article class="item">
              <img class="thumb" src="default.jpg" alt="라이브 썸네일" />
              <div>
                <div class="title">${it.title}</div>
                <div class="meta">${it.promo}</div>
              </div>
              <div style="margin-left:auto;color:#3b5ddd;font-weight:700">
                ${new Date(it.start).getDate()}일 
                ${new Date(it.start).getHours()}:${String(new Date(it.start).getMinutes()).padStart(2,'0')} 예정
              </div>
            </article>`).join('')}
        </div>
      </section>

      <!-- 추천 공고 -->
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more">더보기</a></div>
        <div class="grid grid-2">
          ${state.recruits.map(r=>`
            <article class="card">
              <img class="cover" src="default.jpg" alt="공고 썸네일" />
              <div class="body">
                <div class="title">${r.title}</div>
                <div class="meta">출연료 ${r.fee.toLocaleString()}원 · 마감 ${r.due}</div>
              </div>
            </article>`).join('')}
        </div>
      </section>

      <!-- 추천 인플루언서 -->
      <section class="section">
        <div class="section-head"><h2>추천 인플루언서</h2><a class="more">더보기</a></div>
        <div class="grid grid-2">
          ${state.portfolios.map(p=>`
            <article class="card">
              <img class="cover" src="default.jpg" alt="포트폴리오 썸네일" />
              <div class="body">
                <div class="title">${p.name}</div>
                <div class="meta">경력 ${p.years}년 · ${p.intro} (${p.region})</div>
              </div>
            </article>`).join('')}
        </div>
      </section>
    `;
  }

  // 초기 화면 로드
  $('#app').innerHTML = renderHome();
})();