/* Livee Home - recruit-test 연동 렌더링 (디버그 로그 포함)
   - GET {API_BASE}/recruit-test?status=published&limit=20
   - window.LIVEE_CONFIG 사용
*/
(() => {
  const $ = (s) => document.querySelector(s);

  // ==== config ====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';

  // 기본 이미지(절대경로) + data URI 폴백
  const DEFAULT_IMG =
    (BASE_PATH ? `${BASE_PATH}/assets/default.jpg` : '/assets/default.jpg');

  const FALLBACK_DATA =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#f1f3f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#adb5bd" font-size="14">no image</text></svg>');

  const safeImg = (src) => (src ? src : (DEFAULT_IMG || FALLBACK_DATA));

  /* ===== 포맷터 ===== */
  const pad2 = (n) => String(n).padStart(2, '0');
  function fmtDayHM(dateISO, timeRange) {
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    const hm = String(timeRange || '').split('~')[0] || '';
    return `${day}일 ${hm}`.trim();
  }
  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return '';
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  function metaForLineup(item) {
    const pay = item.payNegotiable ? '협의 가능'
      : (item.pay ? `${Number(item.pay).toLocaleString('ko-KR')}원` : '모집중');
    const when = fmtDayHM(item.shootDate, item.shootTime);
    return `${pay} · ${when} 예정`;
  }

  /* ===== 서버 호출 ===== */
  async function fetchRecruits() {
    // ⚠️ recruit-test 라우터 사용
    const url = `${API_BASE}/recruit-test?status=published&limit=20`;
    console.info('[HOME] fetch recruits:', url);
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      console.info('[HOME] response status:', res.status, 'payload:', data);
      if (!res.ok || data.ok === false) throw new Error(`HTTP_${res.status}`);

      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];

      const items = list.map(c => ({
        id: c.id || c._id,
        title: c.title || '',
        thumb: c.thumbnailUrl || c.coverImageUrl || '',
        closeAt: c.closeAt,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
      console.info('[HOME] mapped items:', items);
      return items;
    } catch (e) {
      console.warn('[HOME] fetch recruits error:', e.message || e);
      return [];
    }
  }

  /* ===== 템플릿 ===== */
  function tplLineup(items) {
    if (!items.length) {
      return `
        <div class="list-vert">
          <article class="item">
            <img class="thumb" src="${safeImg('')}" alt="">
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
            <img class="thumb"
                 src="${safeImg(it.thumb)}"
                 alt="라이브 썸네일"
                 onerror="this.onerror=null;this.src='${FALLBACK_DATA}'"/>
            <div style="min-width:0">
              <div class="title">${it.title}</div>
              <div class="meta one-line">${metaForLineup(it)}</div>
            </div>
          </article>
        `).join('')}
      </div>`;
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
            <img class="mini-thumb" src="${safeImg('')}" alt="" />
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
            <img class="mini-thumb"
                 src="${safeImg(r.thumb)}"
                 alt="공고 썸네일"
                 onerror="this.onerror=null;this.src='${FALLBACK_DATA}'"/>
          </article>
        `).join('')}
      </div>`;
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
            <img class="cover" src="${safeImg('')}" alt="포트폴리오 썸네일"
                 onerror="this.onerror=null;this.src='${FALLBACK_DATA}'"/>
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

    // 오늘의 라인업: 촬영 시작 시각 기준 미래 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
        let start = new Date(r.shootDate);
        const startHM = (r.shootTime || '').split('~')[0] || '00:00';
        const [hh, mm] = startHM.split(':').map(Number);
        start.setHours(hh||0, mm||0, 0, 0);
        return { ...r, _start: start };
      })
      .filter(r => r._start > now)
      .sort((a,b) => a._start - b._start)
      .slice(0, 2);

    const moreHref = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : './index.html#recruits';

    $('#app').innerHTML = `
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplLineup(upcoming)}
      </section>

      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplRecruits(recruits)}
      </section>

      <section class="section">
        <div class="section-head"><h2>추천 인플루언서</h2><a class="more" href="#">더보기</a></div>
        ${tplPortfoliosStatic()}
      </section>
    `;
  }

  renderHome();
})();