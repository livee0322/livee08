(() => {
  const $ = (s) => document.querySelector(s);
  const state = {
    schedule: [
      { title:"가을 시즌 라이브", brand:"ACME", start:"2025-09-01T18:30:00" },
      { title:"신상 런칭 라이브", brand:"Cosmo", start:"2025-09-01T20:00:00" }
    ],
    recruits: [
      { title:"여고추리반 라이브", fee:300000, due:"2025-09-07" },
      { title:"뷰티 콜라보", fee:250000, due:"2025-09-15" }
    ],
    portfolios: [
      { name:"최예나", years:5, region:"서울", intro:"뷰티 전문 5년차" },
      { name:"김소라", years:3, region:"부산", intro:"테크/라이프 쇼호스트" }
    ]
  };

  function renderHome(){
    return `
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 일정</h2></div>
        <div class="list-vert">
          ${state.schedule.map(it=>`
            <article class="item">
              <div class="thumb"></div>
              <div>
                <div><b>${it.title}</b></div>
                <div class="meta">${it.brand} · ${new Date(it.start).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            </article>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>추천 공고</h2></div>
        <div class="grid grid-2">
          ${state.recruits.map(r=>`
            <article class="card">
              <div class="cover"></div>
              <div class="body">
                <b>${r.title}</b><br/>
                출연료 ${r.fee.toLocaleString()}원 · 마감 ${r.due}
              </div>
            </article>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>포트폴리오</h2></div>
        <div class="grid grid-2">
          ${state.portfolios.map(p=>`
            <article class="card">
              <div class="cover"></div>
              <div class="body">
                <b>${p.name}</b><br/>
                ${p.intro} (${p.region})
              </div>
            </article>`).join('')}
        </div>
      </section>
    `;
  }

  // 초기 화면
  $('#app').innerHTML = renderHome();
})();