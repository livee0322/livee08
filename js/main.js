/* Livee Home - Recruit 목록 불러오기(강화판)
   - 우선순위: /recruit-test → /campaigns?type=recruit
   - status=published 결과가 비면, status 필터 없이 재시도
   - 풍부한 콘솔 디버깅 로그 포함 (window.LIVEE_CONFIG.debug=true 일 때)
*/
(() => {
  const $ = (s) => document.querySelector(s);

  // ===== config =====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';
  const DEBUG = !!CFG.debug;

  const DEFAULT_IMG = `${BASE_PATH || ''}/default.jpg`;

  const EP = CFG.endpoints || {};
  // 사용자가 넣은 recruits 우선 사용, 없으면 campaigns published
  const FALLBACKS = [
    EP.recruits || '/recruit-test?limit=20',
    '/campaigns?type=recruit&status=published&limit=20',
    '/recruit-test?limit=20',                        // status 없는 버전
    '/campaigns?type=recruit&limit=20'               // status 없는 버전
  ];

  // ===== util =====
  const log = (...a) => DEBUG && console.log('[home]', ...a);
  const warn = (...a) => DEBUG && console.warn('[home]', ...a);

  const pad2 = (n) => String(n).padStart(2, '0');
  function fmtYYYYMMDD(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  function fmtDayHM(dateISO, timeRange) {
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    let hm = '';
    if (timeRange) hm = String(timeRange).split('~')[0];
    return `${day}일 ${hm || ''}`.trim();
  }
  function lineupMeta(it) {
    const pay = it.payNegotiable ? '협의 가능'
              : (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '모집중');
    const when = fmtDayHM(it.shootDate, it.shootTime);
    return `${pay} · ${when} 예정`;
  }

  // ===== fetch with fallbacks =====
  async function fetchWithFallbacks() {
    for (const path of FALLBACKS) {
      const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
      try {
        log('fetch try:', url);
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          warn('fetch fail:', url, res.status, data?.message);
          continue;
        }
        // 다양한 형태 방어적으로 파싱
        const list =
          (Array.isArray(data) && data) ||
          data.items || data.data?.items ||
          data.docs  || data.data?.docs || [];
        log('fetch ok:', url, 'count=', list.length);

        if (list.length) {
          // 공통 필드로 변환
          const items = list.map((c) => ({
            id: c.id || c._id,
            title: c.title || c.recruit?.title || '',
            thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
            closeAt: c.closeAt,
            shootDate: c.recruit?.shootDate,
            shootTime: c.recruit?.shootTime,
            pay: c.recruit?.pay,
            payNegotiable: !!c.recruit?.payNegotiable,
            status: c.status
          }));
          return { items, used: url };
        }
      } catch (e) {
        warn('fetch error:', path, e.message || e);
      }
    }
    return { items: [], used: '' };
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
              <div class="meta one-line">${lineupMeta(it)}</div>
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
            <img class="mini-thumb" src="${DEFAULT_IMG}" alt="">
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
                · 마감 ${fmtYYYYMMDD(r.closeAt)}
                ${r.status ? ` · <span style="opacity:.7">${r.status}</span>` : ''}
              </div>
            </div>
            <img class="mini-thumb" src="${r.thumb || DEFAULT_IMG}" alt="공고 썸네일"
                 onerror="this.onerror=null;this.src='${DEFAULT_IMG}'"/>
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
            <img class="cover" src="${DEFAULT_IMG}" alt="포트폴리오 썸네일"/>
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
    const { items, used } = await fetchWithFallbacks();
    log('used endpoint:', used);

    // “오늘의 라인업” = 오늘/미래 시작 시간 기준 상위 2개
    const now = new Date();
    const upcoming = items
      .filter(r => r.shootDate)
      .map(r => {
        let start = new Date(r.shootDate);
        try {
          const hm = (r.shootTime || '').split('~')[0] || '00:00';
          const [hh, mm] = hm.split(':').map(Number);
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
          <h2>오늘의 라이브 라인업</h2><a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplLineup(upcoming)}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>추천 공고</h2><a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplRecruits(items)}
      </section>

      <section class="section">
        <div class="section-head"><h2>추천 인플루언서</h2><a class="more" href="#">더보기</a></div>
        ${tplPortfoliosStatic()}
      </section>
    `;
  }

  renderHome();
})();