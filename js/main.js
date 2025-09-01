/* Livee08 Home - recruit 리스트 렌더링 (v2.5)
   - GET {API_BASE}{endpoints.recruits}
   - window.LIVEE_CONFIG 사용
*/
(() => {
  const $ = (sel) => document.querySelector(sel);

  // ===== config =====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/campaigns?type=recruit&status=published&limit=20';

  const DEFAULT_IMG = `${BASE_PATH || '.'}/default.jpg`; // 기본 썸네일

  const pad2 = (n) => String(n).padStart(2, '0');
  const n2 = (v) => (isFinite(v) ? Number(v).toLocaleString('ko-KR') : '');

  function fmtDayHM(dateISO, timeRange) {
    if (!dateISO) return '';
    const d = new Date(dateISO);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const hm = (String(timeRange || '').split('~')[0] || '').trim();
    return `${day}일 ${hm}`.trim();
  }
  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return '';
    const d = new Date(dateISO);
    if (Number.isNaN(d.getTime())) return String(dateISO).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function metaForLineup(it) {
    const payTxt = it.payNegotiable
      ? '협의 가능'
      : (it.pay ? `${n2(it.pay)}원` : '모집중');
    const when = fmtDayHM(it.shootDate, it.shootTime);
    return `${payTxt} · ${when} 예정`;
  }

  async function fetchRecruits() {
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    console.debug('[main] GET', url);
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        console.warn('[main] fetch error:', res.status, data);
        return [];
      }
      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];
      // 서버 DTO ↔︎ 프론트 표준화
      const items = list.map((c) => ({
        id: c.id || c._id,
        title: c.title || '',
        thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
        closeAt: c.closeAt,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
      console.debug('[main] recruits:', items);
      return items;
    } catch (e) {
      console.warn('[main] network fail:', e);
      return [];
    }
  }

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
            <img class="thumb" src="${it.thumb || DEFAULT_IMG}" alt="라이브 썸네일"
                 onerror="this.onerror=null;this.src='${DEFAULT_IMG}'"/>
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
              <div class="mini-meta">
                출연료 ${r.payNegotiable ? '협의 가능' : (r.pay ? `${n2(r.pay)}원` : '미정')}
                · 마감 ${fmtDateYYYYMMDD(r.closeAt)}
              </div>
            </div>
            <img class="mini-thumb" src="${r.thumb || DEFAULT_IMG}" alt="공고 썸네일"
                 onerror="this.onerror=null;this.src='${DEFAULT_IMG}'"/>
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

  async function renderHome() {
    const recruits = await fetchRecruits();

    // 오늘 이후(또는 오늘 나중 시간)인 항목 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
        const start = new Date(r.shootDate);
        const startHM = (r.shootTime || '').split('~')[0] || '00:00';
        const [hh, mm] = startHM.split(':').map(Number);
        start.setHours(hh || 0, mm || 0, 0, 0);
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