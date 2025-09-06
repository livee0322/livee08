/* Home main.js — 요구사항 반영 버전 */
(() => {
  const $ = (s, el=document) => el.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';
  const FALLBACK_IMG  = (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const money = v => v==null ? '' : Number(v).toLocaleString('ko-KR');
  const text = v => (v==null ? '' : String(v));

  const pickThumb = (p) =>
    p.mainThumbnailUrl || p.mainThumbnail
    || (Array.isArray(p.subThumbnails) && p.subThumbnails[0])
    || (Array.isArray(p.subImages)     && p.subImages[0])
    || p.coverImageUrl || p.coverImage
    || FALLBACK_IMG;

  async function getJSON(url){
    const r = await fetch(url, { headers:{'Accept':'application/json'} });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }
  const parseItems = j => (Array.isArray(j) ? j : (j.items || j.data?.items || j.docs || j.data?.docs || []));

  async function fetchRecruits(){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:'/'+EP_RECRUITS}`));
      return arr.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        title: c.title || c.recruit?.title || '(제목 없음)',
        thumb: c.thumbnailUrl || c.coverImageUrl || FALLBACK_IMG,
        closeAt: c.closeAt,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
        brand: c.brandName || c.recruit?.brandName || '브랜드'
      }));
    }catch{ return []; }
  }

  async function fetchPortfolios(){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:'/'+EP_PORTFOLIOS}`));
      return arr.map((p,i)=>({
        id: p.id||p._id||`${i}`,
        nickname: text(p.nickname || p.displayName || p.name || '무명'),
        headline: text(p.headline || ''),
        thumb: pickThumb(p)
      }));
    }catch{ return []; }
  }

  /* ========== Hero ========== */
  function renderHero(el, firstRecruit){
    const title = firstRecruit?.title || '쇼핑라이브, 쉽게 시작하세요';
    const brand = (firstRecruit?.brand || 'Livee').toUpperCase();
    const deadline = firstRecruit?.closeAt ? `DEADLINE ${fmtDate(firstRecruit.closeAt)}` : '';
    el.innerHTML = `
      <article class="hero-card">
        <div class="hero-body">
          <div class="hero-meta">
            <span class="kicker">${brand}</span>
            ${deadline ? `<span class="kicker">${deadline}</span>` : ''}
          </div>
          <h1 class="hero-title">${title}</h1>
          <p class="hero-sub">연결 · 제안 · 계약 · 결제까지 한 번에</p>
        </div>
      </article>
    `;
    // 좌우 버튼 동작은 유지(이미지는 안 씀)
    const prev=$('.hero-btn.prev'), next=$('.hero-btn.next');
    if(prev) prev.onclick = ()=>{};
    if(next) next.onclick = ()=>{};
  }

  /* ========== Section Templates ========== */

  // 1) TODAY LINEUP: 리스트(정사각 썸네일 + 옆 본문)
  const tplLineupList = (items) => !items.length ? `
    <div class="ed-grid">
      <article class="card-ed"><div class="card-ed__body">
        <div class="card-ed__title">등록된 라이브가 없습니다</div>
        <div class="card-ed__meta">브랜드 공고를 등록해보세요</div>
      </div></article>
    </div>` : `
    <div class="ed-grid">
      ${items.map(r=>`
        <article class="card-ed" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
          <img class="card-ed__media" src="${r.thumb}" alt="">
          <div class="card-ed__body">
            <div class="card-ed__eyebrow">브랜드</div>
            <div class="card-ed__title">${r.title}</div>
            <div class="card-ed__meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${
              r.payNegotiable ? '협의' : (r.pay ? `${money(r.pay)}원` : '출연료 미정')
            }</div>
          </div>
        </article>
      `).join('')}
    </div>`;

  // 2) 추천 공고: 가로 스크롤 카드
  const tplRecruitHScroll = (items) => !items.length ? `
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
          <img class="mini-thumb" src="${r.thumb}" alt="">
          <div>
            <div class="lv-brand">브랜드</div>
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${
              r.payNegotiable ? '협의' : (r.pay ? `${money(r.pay)}원` : '미정')
            }</div>
            <!-- 필요하면 버튼 사용: <span class="btn-primary">지원하기</span> -->
          </div>
        </article>
      `).join('')}
    </div>`;

  // 3) 포트폴리오: 기본 그리드 (썸네일은 CSS에서 정사각 처리)
  const tplPortfolios = (items) => !items.length ? `
    <div class="ed-grid">
      <article class="card-ed"><div class="card-ed__body">
        <div class="card-ed__title">포트폴리오가 없습니다</div>
        <div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div>
      </div></article>
    </div>` : `
    <div class="ed-grid">
      ${items.slice(0,6).map(p=>`
        <article class="card-ed" onclick="location.href='portfolio-detail.html?id=${encodeURIComponent(p.id)}'">
          <img class="card-ed__media" src="${p.thumb}" alt="">
          <div class="card-ed__body">
            <div class="card-ed__title">${p.nickname}</div>
            <div class="card-ed__meta">${p.headline || '소개가 없습니다'}</div>
          </div>
        </article>
      `).join('')}
    </div>`;

  function sectionBlock(title, moreHref, innerHTML){
    return `
      <div class="section">
        <div class="section-head">
          <span class="kicker">${title}</span>
          <a class="more" href="${moreHref}">더보기</a>
        </div>
        ${innerHTML}
      </div>
    `;
  }

  async function render(){
    const root = $('#home');
    const heroRoot = $('#hero');
    const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);

    /* Hero */
    renderHero(heroRoot, recruits[0]);

    /* Sections */
    const lineup = tplLineupList(recruits.slice(0,6));
    const hscroll = tplRecruitHScroll(recruits.slice(0,8));
    const pfGrid = tplPortfolios(portfolios);

    root.innerHTML = [
      sectionBlock('TODAY LINEUP', 'recruit-list.html', lineup),
      sectionBlock('추천 공고', 'recruit-list.html', hscroll),
      sectionBlock('SPOTLIGHT PORTFOLIOS', 'portfolio-list.html', pfGrid),
    ].join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else { render(); }
})();