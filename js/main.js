/* Livee Home - campaigns(recruit) 연동 렌더링
   - GET /api/v1/campaigns?type=recruit&status=published
   - config.js 의 window.API_BASE 사용 (없으면 /api/v1)
*/

(() => {
  const $ = (sel) => document.querySelector(sel);

  const API_BASE = (window.API_BASE || '/api/v1').replace(/\/$/, '');
  const DEFAULT_IMG = 'default.jpg';

  /* ===== 날짜/문자 포맷 ===== */
  const pad2 = (n) => String(n).padStart(2, '0');

  function fmtDayHM(dateISO, timeRange) {
    // dateISO: 2025-09-07T00:00:00.000Z | timeRange: "HH:MM~HH:MM" or "HH:MM"
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    let hm = '';
    if (timeRange) {
      hm = timeRange.split('~')[0]; // 시작시각만 노출
    }
    return `${day}일 ${hm || ''}`.trim();
  }

  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return '';
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function metaForLineup(item) {
    const pay = item.payNegotiable ? '협의 가능' : (item.pay ? `${Number(item.pay).toLocaleString('ko-KR')}원` : '모집중');
    const when = fmtDayHM(item.shootDate, item.shootTime);
    return `${pay} · ${when} 예정`;
  }

  /* ===== 서버 호출 ===== */
  async function fetchRecruits() {
    const url = `${API_BASE}/campaigns?type=recruit&status=published&limit=20`;
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `(${res.status})`);
      const items = (data.items || []).map((c) => ({
        id: c.id || c._id,
        title: c.title || '',
        thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
        closeAt: c.closeAt,
        // recruit block
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
      return items;
    } catch (e) {
      console.warn('fetchRecruits error:', e.message || e);
      return [];
    }
  }

  /* ===== 템플릿 ===== */
  function tplLineup(items) {
    if (!items.length) {
      return `
        <div class="list-vert">
          <article class="item"><img class="thumb" src="${DEFAULT_IMG}" alt="">
            <div style="min-width:0">
              <div class="title">등록된 라이브가 없습니다</div>
              <div class="meta one-line">새 공고를 등록해보세요</div>
            </div>
          </article>
        </div>`;
    }
    return `
      <div class="list-vert">
        ${items.map(it => `
          <article class="item">
            <img class="thumb" src="${it.thumb || DEFAULT_IMG}" alt="라이브 썸네일" onerror="this.src='${DEFAULT_IMG}'"/>
            <div style="min-width:0">
              <div class="title">${it.title}</div>
              <div class="meta one-line">${metaForLineup(it)}</div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function tplRecruits(items) {
    if (!items.length) {
      return `
        <div class="hscroll-mini">
          <article class="mini-card">
            <div class="mini-body">
              <div class="mini-title">추천 공고가 없습니다</div>
              <div class="mini-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
            </div>
            <img class="mini-thumb" src="${DEFAULT_IMG}" alt="" />
          </article>
        </div>`;
    }
    return `
      <div class="hscroll-mini">
        ${items.map(r => `
          <article class="mini-card">
            <div class="mini-body">
              <div class="mini-title">${r.title}</div>
              <div class="mini-meta">출연료 ${r.payNegotiable ? '협의 가능' : (r.pay ? `${Number(r.pay).toLocaleString('ko-KR')}원` : '미정')}
                · 마감 ${fmtDateYYYYMMDD(r.closeAt)}</div>
            </div>
            <img class="mini-thumb" src="${r.thumb || DEFAULT_IMG}" alt="공고 썸네일" onerror="this.src='${DEFAULT_IMG}'"/>
          </article>
        `).join('')}
      </div>
    `;
  }

  function tplPortfoliosStatic() {
    // 아직 백엔드 연동 전: 기존 샘플 그대로
    const samples = [
      { name:"최예나", years:5, intro:"뷰티 방송 전문", region:"서울" },
      { name:"김소라", years:3, intro:"테크/라이프 쇼호스트", region:"부산" },
      { name:"박민주", years:7, intro:"푸드 전문", region:"서울" },
      { name:"이지수", years:1, intro:"뷰티 쇼호스트", region:"대구" },
    ];
    return `
      <div class="grid grid-2">
        ${samples.map(p=>`
          <article class="card">
            <img class="cover" src="${DEFAULT_IMG}" alt="포트폴리오 썸네일"/>
            <div class="body">
              <div class="title">${p.name}</div>
              <div class="meta">경력 ${p.years}년 · ${p.intro} (${p.region})</div>
            </div>
          </article>
        `).join('')}
      </div>`;
  }

  /* ===== 렌더 ===== */
  async function renderHome() {
    const recruits = await fetchRecruits();

    // 오늘의 라인업: 촬영일이 미래(= 오늘 이후 또는 오늘이고 아직 시간이 남음)인 항목 중 상위 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
        // 비교용 시작 Date
        let start = new Date(r.shootDate);
        try {
          const startHM = (r.shootTime || '').split('~')[0] || '00:00';
          const [hh, mm] = startHM.split(':').map(Number);
          start.setHours(hh||0, mm||0, 0, 0);
        } catch {}
        return { ...r, _start: start };
      })
      .filter(r => r._start > now)
      .sort((a,b) => a._start - b._start)
      .slice(0, 2);

    $('#app').innerHTML = `
      <!-- 오늘의 라이브 라인업 -->
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="./index.html#recruits">더보기</a></div>
        ${tplLineup(upcoming)}
      </section>

      <!-- 추천 공고 -->
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="./index.html#recruits">더보기</a></div>
        ${tplRecruits(recruits)}
      </section>

      <!-- 추천 인플루언서 -->
      <section class="section">
        <div class="section-head"><h2>추천 인플루언서</h2><a class="more" href="#">더보기</a></div>
        ${tplPortfoliosStatic()}
      </section>
    `;
  }

  // kick
  renderHome();
})();