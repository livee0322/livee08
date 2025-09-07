/* Home main.js — Editorial v2 + Hero CTA + API 호환 */
(() => {
  const $ = (s, el=document) => el.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';
  const EP_NEWS       = EP.news       || '/news-test?status=published&limit=10';
  const FALLBACK_IMG  = CFG.placeholderThumb || (CFG.BASE_PATH ? `${CFG.BASE_PATH}/assets/default.jpg` : 'default.jpg');

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const money = v => v==null ? '' : Number(v).toLocaleString('ko-KR');
  const text  = v => (v==null ? '' : String(v));

  const pickThumb = (p) =>
    p?.mainThumbnailUrl || p?.thumbnailUrl || p?.mainThumbnail ||
    (Array.isArray(p?.subThumbnails) && p.subThumbnails[0]) ||
    (Array.isArray(p?.subImages) && p.subImages[0]) ||
    p?.coverImageUrl || p?.imageUrl || p?.thumbUrl || FALLBACK_IMG;

  async function getJSON(url){
    const r = await fetch(url, { headers:{'Accept':'application/json'} });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j;
  }
  const parseItems = j => (Array.isArray(j) ? j : (j.items || j.data?.items || j.docs || j.data?.docs || []));

  async function fetchRecruits(){
    try{
      const path = EP_RECRUITS.startsWith('/')?EP_RECRUITS:('/'+EP_RECRUITS);
      const arr = parseItems(await getJSON(`${API_BASE}${path}`));
      return arr.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        title: c.title || c.recruit?.title || '(제목 없음)',
        thumb: c.thumbnailUrl || c.coverImageUrl || pickThumb(c),
        closeAt: c.closeAt || c.recruit?.closeAt,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable
      }));
    }catch{ return []; }
  }
  async function fetchPortfolios(){
    try{
      const path = EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:('/'+EP_PORTFOLIOS);
      const arr = parseItems(await getJSON(`${API_BASE}${path}`));
      return arr.map((p,i)=>({
        id: p.id||p._id||`${i}`,
        nickname: text(p.nickname || p.displayName || p.name || '무명'),
        headline: text(p.headline || ''),
        thumb: pickThumb(p)
      }));
    }catch{ return []; }
  }
  async function fetchNews(recruitsFallback=[]){
    try{
      const path = EP_NEWS.startsWith('/')?EP_NEWS:('/'+EP_NEWS);
      const arr = parseItems(await getJSON(`${API_BASE}${path}`));
      if (arr.length) {
        return arr.map((n,i)=>({
          id: n.id||n._id||`${i}`,
          title: text(n.title || n.headline || '뉴스'),
          thumb: pickThumb(n),
          date: n.publishedAt || n.createdAt || n.updatedAt,
          summary: text(n.summary || n.excerpt || '')
        }));
      }
    }catch{}
    // 뉴스 없으면 공고 일부로 대체
    return recruitsFallback.slice(0,6).map((r,i)=>({
      id: r.id||`${i}`, title: r.title, thumb: r.thumb, date: r.closeAt, summary: '브랜드 소식'
    }));
  }

  /* ---------- Hero ---------- */
  function renderHero(el){
    el.innerHTML = `
      <article class="hero-card">
        <div class="hero-body">
          <div class="hero-meta">
            <span class="kicker">LIVEE</span>
            <span class="kicker">FOR CREATORS & BRANDS</span>
          </div>
          <h1 class="hero-title">쇼핑라이브, 쉽게 시작하세요</h1>
          <p class="hero-sub">연결 · 제안 · 계약 · 결제까지 한 번에</p>
        </div>
      </article>
    `;
  }

  /* Hero CTA mount (히어로 아래 2버튼) */
  function mountHeroCTA(){
    const anchor = document.getElementById('hero-cta-anchor') || document.querySelector('.hero-wrap');
    if (!anchor || document.getElementById('hero-cta')) return;
    const div = document.createElement('div');
    div.id = 'hero-cta';
    div.className = 'hero-cta';
    div.setAttribute('role','group');
    div.setAttribute('aria-label','빠른 실행');
    div.innerHTML = `
      <a class="btn btn--primary" href="recruit-new.html">
        <i class="ri-megaphone-line" aria-hidden="true"></i>공고 올리기
      </a>
      <a class="btn btn--ghost" href="portfolio-list.html">
        <i class="ri-user-3-line" aria-hidden="true"></i>쇼호스트 찾기
      </a>`;
    anchor.parentNode.insertBefore(div, anchor.nextSibling);
  }

  /* ---------- Templates ---------- */
  const tplLineupList = items => !items.length ? `
    <div class="ed-grid">
      <article class="card-ed"><div class="card-ed__body">
        <div class="card-ed__title">등록된 라이브가 없습니다</div>
        <div class="card-ed__meta">브랜드 공고를 등록해보세요</div>
      </div></article>
    </div>` : `
    <div class="ed-grid">
      ${items.map(r=>`
        <article class="card-ed" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
          <img class="card-ed__media" src="${r.thumb||FALLBACK_IMG}" alt="">
          <div class="card-ed__body">
            <div class="card-ed__eyebrow">브랜드</div>
            <div class="card-ed__title">${r.title}</div>
            <div class="card-ed__meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${
              r.payNegotiable ? '협의' : (r.pay ? `${money(r.pay)}원` : '출연료 미정')
            }</div>
          </div>
        </article>`).join('')}
    </div>`;

  const tplRecruitHScroll = items => !items.length ? `
    <div class="hscroll">
      <article class="card-mini">
        <div class="mini-thumb" style="background:#f3f4f6"></div>
        <div>
          <div class="mini-title">공고가 없습니다</div>
          <div class="mini-meta">새 공고를 등록해보세요</div>
        </div>
      </article>
    </div>` : `
    <div class="hscroll">
      ${items.map(r=>`
        <article class="card-mini" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
          <img class="mini-thumb" src="${r.thumb||FALLBACK_IMG}" alt="">
          <div>
            <div class="lv-brand">브랜드</div>
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${
              r.payNegotiable ? '협의' : (r.pay ? `${money(r.pay)}원` : '미정')
            }</div>
          </div>
        </article>`).join('')}
    </div>`;

  const tplNewsList = items => !items.length ? `
    <div class="ed-grid">
      <article class="card-ed"><div class="card-ed__body">
        <div class="card-ed__title">표시할 뉴스가 없습니다</div>
      </div></article>
    </div>` : `
    <div class="ed-grid">
      ${items.map(n=>`
        <article class="card-ed">
          <img class="card-ed__media" src="${n.thumb||FALLBACK_IMG}" alt="">
          <div class="card-ed__body">
            <div class="card-ed__title">${n.title}</div>
            <div class="card-ed__meta">${n.date ? fmtDate(n.date)+' · ' : ''}${n.summary || '소식'}</div>
          </div>
        </article>`).join('')}
    </div>`;

  const tplPortfolios = items => !items.length ? `
    <div class="ed-grid">
      <article class="card-ed"><div class="card-ed__body">
        <div class="card-ed__title">포트폴리오가 없습니다</div>
        <div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div>
      </div></article>
    </div>` : `
    <div class="ed-grid">
      ${items.slice(0,6).map(p=>`
        <article class="card-ed" onclick="location.href='portfolio-detail.html?id=${encodeURIComponent(p.id)}'">
          <img class="card-ed__media" src="${p.thumb||FALLBACK_IMG}" alt="">
          <div class="card-ed__body">
            <div class="card-ed__title">${p.nickname}</div>
            <div class="card-ed__meta">${p.headline || '소개가 없습니다'}</div>
          </div>
        </article>`).join('')}
    </div>`;

  function sectionBlock(title, moreHref, innerHTML){
    return `
      <div class="section">
        <div class="section-head">
          <h2>${title}</h2>
          <a class="more" href="${moreHref}">더보기</a>
        </div>
        ${innerHTML}
      </div>`;
  }

  async function render(){
    const root = $('#home');
    const heroRoot = $('#hero');

    const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);
    const news = await fetchNews(recruits);

    renderHero(heroRoot);
    mountHeroCTA();

    const lineupHTML   = tplLineupList(recruits.slice(0,6));
    const recommendHTML= tplRecruitHScroll(recruits.slice(0,8));
    const newsHTML     = tplNewsList(news.slice(0,6));
    const pfHTML       = tplPortfolios(portfolios);

    root.innerHTML = [
      sectionBlock('오늘의 라이브', 'recruit-list.html', lineupHTML),
      sectionBlock('추천 공고', 'recruit-list.html', recommendHTML),
      sectionBlock('뉴스', 'news.html', newsHTML),
      sectionBlock('쇼호스트 포트폴리오', 'portfolio-list.html', pfHTML),
    ].join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else { render(); }
})();