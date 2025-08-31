(() => {
  const $ = (s) => document.querySelector(s);

  const state = {
    schedule: [
      { title:"추리예능, 여고추리반 출시 기념 라이브 방송", promo:"예나 안경 할인 최대 50%", start:"2025-08-30T18:30:00" },
      { title:"예나 컴백 기념 라이브 방송", promo:"예나 안경 할인 최대 50%", start:"2025-08-30T19:30:00" }
    ],
    recruits: [
      { title:"여고추리반 출시 기념 라이브 방송", fee:300000, due:"2025-09-07" },
      { title:"뷰티 콜라보 라이브", fee:250000, due:"2025-09-15" },
      { title:"가을 시즌 기획 라이브", fee:200000, due:"2025-09-21" }
    ],
    portfolios: [
      { name:"최예나", years:5, intro:"뷰티 방송 전문", region:"서울" },
      { name:"김소라", years:3, intro:"테크/라이프 쇼호스트", region:"부산" }
    ]
  };

  const pad = (n) => String(n).padStart(2,'0');
  const money = (n) => (n||0).toLocaleString('ko-KR') + '원';

  function timeParts(iso){
    const d = new Date(iso);
    return {
      day: d.getDate(),
      hm: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  }

  function renderHome(){
    return `
      <!-- 오늘의 라이브 라인업 -->
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more">더보기</a></div>
        <div class="list-vert">
          ${state.schedule.map(it=>{
            const t = timeParts(it.start);
            return `
              <article class="item">
                <img class="thumb" src="default.jpg" alt="라이브 썸네일" />
                <div>
                  <div class="title">${it.title}</div>
                  <div class="meta">${it.promo}</div>
                </div>
                <div class="time-badge">
                  <span class="d">${t.day}일</span>
                  <span class="hm">${t.hm}</span>
                  <span class="lbl">예정</span>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>

      <!-- 추천 공고 : 가로 스크롤 미니 카드 -->
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more">더보기</a></div>
        <div class="hscroll-mini">
          ${state.recruits.map(r=>`
            <article class="mini-card">
              <div class="mini-body">
                <div class="mini-title">${r.title}</div>
                <div class="mini-meta">출연료 ${money(r.fee)} · 마감 ${r.due}</div>
              </div>
              <img class="mini-thumb" src="default.jpg" alt="공고 썸네일" />
            </article>
          `).join('')}
        </div>
      </section>

      <!-- 추천 인플루언서: 기존 카드 그리드 유지 -->
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
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  $('#app').innerHTML = renderHome();
})();