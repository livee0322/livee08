/* Livee Home (TEST) — recruit-test 기반
 * - GET {API_BASE}/recruit-test?status=published
 * - 권한/토큰 불필요, 절대경로 사용
 */
(() => {
  const $ = (s) => document.querySelector(s);

  // ===== config =====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';

  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=20';

  // 안전한 썸네일(없으면 picsum)
  const thumbOr = (src, seed='lv') =>
    src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

  // ===== utils =====
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const fmtDayHM = (dateISO, timeRange) => {
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    const hm  = (timeRange || '').split('~')[0] || '';
    return `${day}일 ${hm}`.trim();
  };

  // ===== fetch =====
  async function fetchRecruits() {
    // 절대 URL 보장
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    console.debug('[HOME] fetch recruits:', url);

    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));

      console.debug('[HOME] response status:', res.status, 'payload:', data);

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `HTTP_${res.status}`);
      }

      // 다양한 포맷 호환
      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];

      // 표준화
      const items = list.map((c, i) => ({
        id: c.id || c._id || `${i}`,
        title: c.title || c.recruit?.title || '(제목 없음)',
        thumb: c.thumbnailUrl || c.coverImageUrl || '',
        closeAt: c.closeAt,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));

      console.debug('[HOME] normalized recruits:', items);
      return items;
    } catch (err) {
      console.warn('[HOME] fetch recruits error:', err);
      return [];
    }
  }

  // ===== templates =====
  const metaForLineup = (it) => {
    const pay = it.payNegotiable ? '협의 가능'
              : (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '모집중');
    const when = fmtDayHM(it.shootDate, it.shootTime);
    return `${pay} · ${when} 예정`;
  };

  function tplLineup(items) {
    if (!items.length) {
      return `
        <div class="list-vert">
          <article class="item">
            <img class="thumb" src="${thumbOr('', 'lineup-empty')}" alt=""/>
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
                 src="${thumbOr(it.thumb, it.id)}"
                 alt="라이브 썸네일"
                 onerror="this.src='${thumbOr('', 'lineup-fallback')}'"/>
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
            <img class="mini-thumb" src="${thumbOr('', 'recruits-empty')}" alt="" />
          </article>
        </div>`;
    }
    return `
      <div class="hscroll-mini">
        ${items.map(r => `
          <article class="mini-card">
            <div class="mini-body">
              <div class="mini-title">${r.title}</div>
              <div class="mini-meta">
                출연료 ${r.payNegotiable ? '협의 가능' : (r.pay ? `${Number(r.pay).toLocaleString('ko-KR')}원` : '미정')}
                · 마감 ${fmtDate(r.closeAt)}
              </div>
            </div>
            <img class="mini-thumb"
                 src="${thumbOr(r.thumb, r.id)}"
                 alt="공고 썸네일"
                 onerror="this.src='${thumbOr('', 'recruits-fallback')}'"/>
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
            <img class="cover" src="${thumbOr('', `pf-${p.name}`)}" alt="포트폴리오 썸네일"/>
            <div class="body">
              <div class="title">${p.name}</div>
              <div class="meta">경력 ${p.years}년 · ${p.intro} (${p.region})</div>
            </div>
          </article>
        `).join('')}
      </div>`;
  }

  // ===== render =====
  async function renderHome() {
    const recruits = await fetchRecruits();

    // 오늘의 라인업: 미래(= 지금 이후) 시작 기준 상위 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
        const start = new Date(r.shootDate);
        const hm = (r.shootTime || '').split('~')[0] || '00:00';
        const [h, m] = hm.split(':').map(Number);
        start.setHours(h||0, m||0, 0, 0);
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