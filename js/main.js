/* Livee Home - recruit-test 연동
   - GET {API_BASE}/recruit-test?status=published
*/
(() => {
  const $ = (sel) => document.querySelector(sel);

  // ===== config =====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';

  // 기본 이미지(절대경로/외부 URL 권장: GitHub Pages 경로 헷갈림 방지)
  const DEFAULT_IMG = 'https://placehold.co/112x112?text=Livee';

  // ===== util =====
  const pad2 = (n) => String(n).padStart(2, '0');
  const safe = (v, d) => (v == null ? d : v);

  function fmtDayHM(dateISO, timeRange) {
    const d = new Date(dateISO || '');
    if (isNaN(d)) return '';
    const day = d.getDate();
    const hm = (String(timeRange || '').split('~')[0] || '').trim();
    return `${day}일 ${hm}`.trim();
  }
  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return '';
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  function lineupMeta(it) {
    const pay = it.payNegotiable ? '협의 가능'
               : (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '모집중');
    const when = fmtDayHM(it.shootDate, it.shootTime);
    return `${pay} · ${when} 예정`;
  }

  // ===== fetch recruits =====
  async function fetchRecruits() {
    const url = `${API_BASE}/recruit-test?status=published&limit=20`;
    console.log('[HOME] fetch recruits:', url);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json().catch(()=>({}));
      console.log('[HOME] response status:', res.status, 'payload:', data);

      if (!res.ok || data.ok === false) throw new Error(data.message || `HTTP_${res.status}`);

      const list = (data.items || data.data?.items || data.docs || []);
      const mapped = list.map((c) => ({
        id: c.id || c._id,
        title: safe(c.title, ''),
        thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
        closeAt: c.closeAt,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
      console.log('[HOME] mapped items:', mapped);
      return mapped;
    } catch (err) {
      console.warn('[HOME] fetch recruits error:', err);
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
                 onerror="this.src='${DEFAULT_IMG}'" />
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
                 onerror="this.src='${DEFAULT_IMG}'" />
          </article>
        `).join('')}
      </div>`;
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
            <img class="cover" src="${DEFAULT_IMG}" alt="포트폴리오 썸네일" />
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

    // 가까운 일정 2개만
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
        const d = new Date(r.shootDate);
        const [hh,mm] = String(r.shootTime||'00:00').split('~')[0].split(':').map(Number);
        d.setHours(hh||0, mm||0, 0, 0);
        return { ...r, _start: d };
      })
      .filter(r => r._start > now)
      .sort((a,b) => a._start - b._start)
      .slice(0,2);

    const more = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : './index.html#recruits';

    $('#app').innerHTML = `
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="${more}">더보기</a></div>
        ${tplLineup(upcoming)}
      </section>
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="${more}">더보기</a></div>
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