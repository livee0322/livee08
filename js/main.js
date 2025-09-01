<script>
// Livee Home (v2.5) — recruit-test 목록 연동 + 방어적 설정 + 디버깅 로그
(() => {
  // ===== config & shims =====
  const CFG = window.LIVEE_CONFIG || {};
  // 구버전 호환: window.API_BASE가 없으면 만들어 둠
  if (!window.API_BASE && CFG.API_BASE) window.API_BASE = CFG.API_BASE;

  const API_BASE = (CFG.API_BASE || window.API_BASE || '').replace(/\/$/, '');
  const EP       = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=20';

  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';

  // 절대경로 강제(없으면 100% 버그)
  const ABS_API_BASE = API_BASE || 'https://main-server-ekgr.onrender.com/api/v1';

  const $ = (s) => document.querySelector(s);

  // 기본 이미지(절대경로/외부플레이스홀더 중 택1)
  const DEFAULT_IMG = 'https://picsum.photos/seed/livee-default/112/112';

  const pad2 = (n) => String(n).padStart(2, '0');

  function fmtDayHM(dateISO, timeRange) {
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    let hm = '';
    if (timeRange) hm = String(timeRange).split('~')[0];
    return `${day}일 ${hm || ''}`.trim();
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

  // ===== API =====
  async function fetchRecruits() {
    // EP_RECRUITS가 '/...' 이든 'recruit-test?...' 이든 무조건 절대경로화
    const path = EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`;
    const url  = `${ABS_API_BASE}${path}`;

    console.log('[HOME] fetch recruits:', url);
    try {
      const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok || data.ok === false) {
        console.warn('[HOME] response status:', res.status, 'payload:', data);
        throw new Error(`HTTP_${res.status}`);
      }

      const list = (Array.isArray(data) && data)
        || data.items || data.data?.items
        || data.docs  || data.data?.docs || [];

      const items = list.map(c => ({
        id: c.id || c._id,
        title: c.title || c.recruit?.title || '',
        thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
        closeAt: c.closeAt || c.recruit?.deadline || '',
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime || c.recruit?.timeStart,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
      console.log('[HOME] recruits count:', items.length, items);
      return items;
    } catch (e) {
      console.error('[HOME] fetch recruits error:', e);
      return [];
    }
  }

  // ===== templates =====
  function tplLineup(items) {
    if (!items.length) {
      return `
        <div class="list-vert">
          <article class="item">
            <img class="thumb" src="${DEFAULT_IMG}" alt="">
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
                출연료 ${r.payNegotiable ? '협의 가능' : (r.pay ? `${Number(r.pay).toLocaleString('ko-KR')}원` : '미정')}
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
      { name:'최예나', years:5, intro:'뷰티 방송 전문', region:'서울' },
      { name:'김소라', years:3, intro:'테크/라이프 쇼호스트', region:'부산' },
    ];
    return `
      <div class="grid grid-2">
        ${samples.map(p=>`
          <article class="card">
            <img class="cover" src="${DEFAULT_IMG}" alt="포트폴리오 썸네일"
                 onerror="this.onerror=null;this.src='${DEFAULT_IMG}'"/>
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

    // 오늘의 라인업: 앞으로 시작할 상위 2개
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
      <section class="section">
        <div class="section-head">
          <h2>오늘의 라이브 라인업</h2>
          <a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplLineup(upcoming)}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>추천 공고</h2>
          <a class="more" href="${moreHref}">더보기</a>
        </div>
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
</script>