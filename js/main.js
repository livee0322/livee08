/* Livee Home - campaigns(recruit) 연동 렌더링
   - GET {API_BASE}{endpoints.recruits} (기본: type=recruit&status=published)
   - config.js 의 window.LIVEE_CONFIG 사용
*/
(() => {
  const $ = (sel) => document.querySelector(sel);

  // ==== config ====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';
  const EP = (CFG.endpoints || {});
  const EP_RECRUITS = EP.recruits || '/campaigns?type=recruit&status=published&limit=20';

  const DEFAULT_IMG = 'default.jpg';

  /* ===== 날짜/문자 포맷 ===== */
  const pad2 = (n) => String(n).padStart(2, '0');

  function fmtDayHM(dateISO, timeRange) {
    // dateISO: ...Z | timeRange: "HH:MM~HH:MM" or "HH:MM"
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    let hm = '';
    if (timeRange) hm = String(timeRange).split('~')[0]; // 시작시각만
    return `${day}일 ${hm || ''}`.trim();
  }

  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return '';
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function metaForLineup(item) {
    const pay = item.payNegotiable ? '협의 가능'
               : (item.pay ? `${Number(item.pay).toLocaleString('ko-KR')}원` : '모집중');
    const when = fmtDayHM(item.shootDate, item.shootTime);
    return `${pay} · ${when} 예정`;
  }

  /* ===== 서버 호출 ===== */
  async function fetchRecruits() {
    // config의 recruits 엔드포인트 사용
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `(${res.status})`);

      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];

      const items = list.map((c) => ({
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

    // 오늘의 라인업: 미래 촬영일 기준 상위 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
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

    const moreHref = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : './index.html#recruits';

    $('#app').innerHTML = `
      <!-- 오늘의 라이브 라인업 -->
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplLineup(upcoming)}
      </section>

      <!-- 추천 공고 -->
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplRecruits(recruits)}
      </section>

      <!-- 추천 인플루언서 -->
      <section class="section">
        <div class="section-head"><h2>추천 인플루언서</h2><a class="more" href="#">더보기</a></div>
        ${tplPortfoliosStatic()}
      </section>
    `;
  }

  renderHome();
})();