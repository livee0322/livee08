<!-- main.js -->
<script>
/* Livee Home – recruit-test 연동 (published만 표시)
   - GET {API_BASE}/recruit-test?status=published&limit=20
*/
(() => {
  const $ = (s) => document.querySelector(s);

  // ==== config ====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';

  // 디폴트 썸네일(네트워크 404 방지용)
  const DEFAULT_IMG = 'https://picsum.photos/seed/livee-default/120/120';

  /* ===== 날짜/문자 포맷 ===== */
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDateYYYYMMDD = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const fmtLineupMeta = (item) => {
    const pay = item.payNegotiable ? '협의 가능'
      : (item.pay ? `${Number(item.pay).toLocaleString('ko-KR')}원` : '모집중');
    let when = '';
    if (item.shootDate) {
      const d = new Date(item.shootDate);
      if (!isNaN(d)) {
        const day = d.getDate();
        const hm = String(item.shootTime || '').split('~')[0] || '';
        when = `${day}일 ${hm}`.trim();
      }
    }
    return `${pay} · ${when} 예정`;
  };

  /* ===== 서버 호출 ===== */
  async function fetchRecruits() {
    const url = `${API_BASE}/recruit-test?status=published&limit=20`;
    console.log('[HOME] fetch recruits:', url);
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      console.log('[HOME] response status:', res.status, 'payload:', data);
      if (!res.ok || data.ok === false) throw new Error(`HTTP_${res.status}`);

      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];

      return list.map(c => ({
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
    } catch (e) {
      console.warn('[HOME] fetch recruits error:', e);
      return [];
    }
  }

  /* ===== 템플릿 ===== */
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
                 onerror="this.onerror=null;this.src='${DEFAULT_IMG}'">
            <div style="min-width:0">
              <div class="title">${it.title}</div>
              <div class="meta one-line">${fmtLineupMeta(it)}</div>
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
                · 마감 ${fmtDateYYYYMMDD(r.closeAt)}
              </div>
            </div>
            <img class="mini-thumb" src="${r.thumb || DEFAULT_IMG}" alt="공고 썸네일"
                 onerror="this.onerror=null;this.src='${DEFAULT_IMG}'">
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
            <img class="cover" src="${DEFAULT_IMG}" alt="포트폴리오 썸네일">
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

    // 오늘의 라인업: 미래 촬영 시작시간 기준 상위 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r => r.shootDate)
      .map(r => {
        const start = new Date(r.shootDate);
        const hm = String(r.shootTime || '').split('~')[0] || '00:00';
        const [hh, mm] = hm.split(':').map(Number);
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
</script>