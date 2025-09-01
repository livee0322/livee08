/* Livee Home (TEST+Fallback)
 * 1) GET {API_BASE}/recruit-test?status=published
 * 2) 404 또는 빈 리스트면  GET {API_BASE}/campaigns?type=recruit&status=published 로 폴백
 */
(() => {
  const $ = (s) => document.querySelector(s);

  // ==== config ====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';

  const EP = CFG.endpoints || {};
  const EP_PRIMARY   = EP.recruits || '/recruit-test?status=published&limit=20';
  const EP_FALLBACK  = '/campaigns?type=recruit&status=published&limit=20';

  // 안전 썸네일
  const pic = (seed, w=640, h=360) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
  const thumbOr = (src, seed='lv') => src || pic(seed);

  // utils
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

  // fetch helper
  async function callList(path) {
    const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    console.debug('[HOME] fetch:', url);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    let data;
    try { data = await res.json(); } catch { data = {}; }

    console.debug('[HOME] status:', res.status, 'payload:', data);
    const list =
      (Array.isArray(data) && data) ||
      data.items || data.data?.items ||
      data.docs  || data.data?.docs  || [];

    return { res, list, url, raw: data };
  }

  async function fetchRecruits() {
    // 1차: /recruit-test
    let { res, list, url, raw } = await callList(EP_PRIMARY);
    let source = 'primary';
    // 404 또는 리스트가 비어있으면 폴백
    if (res.status === 404 || list.length === 0) {
      console.warn('[HOME] primary empty/404. fallback to /campaigns');
      ({ res, list, url, raw } = await callList(EP_FALLBACK));
      source = 'fallback';
    }

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

    return { items, meta: { status: res.status, url, source, count: items.length }, raw };
  }

  // templates
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

  function tplDebug(meta) {
    // 테스트용: 화면 맨 아래 작은 디버그 박스
    const m = meta || {};
    return `
      <div style="margin:12px 0;padding:8px;border:1px dashed #ccc;border-radius:8px;font-size:12px;color:#555;word-break:break-all">
        <div><b>endpoint</b>: ${m.url || '-'}</div>
        <div><b>status</b>: ${m.status ?? '-'}</div>
        <div><b>source</b>: ${m.source || '-'}</div>
        <div><b>count</b>: ${m.count ?? '-'}</div>
      </div>
    `;
  }

  // render
  async function renderHome() {
    const { items: recruits, meta } = await fetchRecruits();

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
        <div class="grid grid-2">
          <article class="card">
            <img class="cover" src="${pic('pf-1')}" alt="포트폴리오 썸네일"/>
            <div class="body"><div class="title">최예나</div><div class="meta">경력 5년 · 뷰티 방송 전문 (서울)</div></div>
          </article>
          <article class="card">
            <img class="cover" src="${pic('pf-2')}" alt="포트폴리오 썸네일"/>
            <div class="body"><div class="title">김소라</div><div class="meta">경력 3년 · 테크/라이프 쇼호스트 (부산)</div></div>
          </article>
        </div>
      </section>

      ${tplDebug(meta)}
    `;
  }

  renderHome();
})();