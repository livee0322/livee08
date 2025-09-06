/* Home main.js — Artbook Home (v2.7) */
(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';
  const FALLBACK_IMG = (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const money = (v)=> v==null ? '' : Number(v).toLocaleString('ko-KR');
  const fmt = v => (v==null ? '' : String(v));

  const pickThumb = (p) =>
    p.mainThumbnailUrl || p.mainThumbnail
    || (Array.isArray(p.subThumbnails) && p.subThumbnails[0])
    || (Array.isArray(p.subImages)     && p.subImages[0])
    || p.coverImageUrl || p.coverImage
    || FALLBACK_IMG;

  async function getJSON(url){
    const r = await fetch(url, { headers: { 'Accept':'application/json' } });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }
  const parseItems = j => (Array.isArray(j) ? j : (j.items || j.data?.items || j.docs || j.data?.docs || []));

  async function fetchRecruits(){
    try{
      const j = await getJSON(`${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:'/'+EP_RECRUITS}`);
      const arr = parseItems(j);
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
      const j = await getJSON(`${API_BASE}${EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:'/'+EP_PORTFOLIOS}`);
      const arr = parseItems(j);
      return arr.map((p,i)=>({
        id: p.id || p._id || `${i}`,
        nickname: fmt(p.nickname || p.displayName || p.name || '무명'),
        headline: fmt(p.headline || ''),
        careerYears: Number.isFinite(+p.careerYears) ? +p.careerYears : undefined,
        thumb: pickThumb(p),
      }));
    }catch{ return []; }
  }

  /* ===== Hero(커버) ===== */
  function renderHero(el, items){
    const item = items[0] || {
      title:'등록된 라이브가 없습니다',
      thumb:FALLBACK_IMG,
      brand:'Livee',
      closeAt:''
    };
    el.innerHTML = `
      <article class="hero-card" data-idx="0">
        <img class="hero-media" src="${item.thumb}" alt="">
        <div class="hero-grad"></div>
        <div class="hero-body">
          <div class="hero-meta">
            <span class="kicker">${item.brand.toUpperCase?.() || 'BRAND'}</span>
            ${item.closeAt ? `<span class="kicker">DEADLINE ${fmtDate(item.closeAt)}</span>` : ''}
          </div>
          <h1 class="hero-title">${item.title}</h1>
          <p class="hero-sub">쇼핑라이브 · 계약/결제까지 한 번에</p>
        </div>
      </article>
    `;
    // 커버 슬라이드 (수동)
    const prev = $('.hero-btn.prev'); const next = $('.hero-btn.next');
    if (!prev || !next) return;
    let idx = 0;
    prev.onclick = ()=> swap(-1);
    next.onclick = ()=> swap(+1);
    function swap(delta){
      if (!items.length) return;
      idx = (idx + delta + items.length) % items.length;
      const d = items[idx];
      const card = $('.hero-card', el);
      card.dataset.idx = String(idx);
      $('.hero-media', card).src = d.thumb || FALLBACK_IMG;
      $('.hero-title', card).textContent = d.title || '';
      const meta = $('.hero-meta', card);
      meta.innerHTML = `
        <span class="kicker">${(d.brand||'BRAND').toUpperCase()}</span>
        ${d.closeAt ? `<span class="kicker">DEADLINE ${fmtDate(d.closeAt)}</span>` : ''}
      `;
    }
  }

  /* ===== Editorial Grid ===== */

  const tplRecruitCard = (r, feature=false) => `
    <article class="card-ed ${feature ? 'card-ed--feature' : ''}" role="link" tabindex="0"
      onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
      <img class="card-ed__media" src="${r.thumb}" alt="">
      <div class="card-ed__body">
        <div class="card-ed__eyebrow">브랜드</div>
        <div class="card-ed__title">${r.title}</div>
        <div class="card-ed__meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${
          r.payNegotiable ? '<span class="badge-pay">협의</span>' :
          (r.pay ? `<span class="badge-pay">${money(r.pay)}원</span>` : '출연료 미정')
        }</div>
      </div>
    </article>
  `;

  const tplPortfolioCard = (p) => `
    <article class="card-ed" role="link" tabindex="0"
      onclick="location.href='portfolio-detail.html?id=${encodeURIComponent(p.id)}'">
      <img class="card-ed__media" src="${p.thumb}" alt="">
      <div class="card-ed__body">
        <div class="pf-nameRow">
          <div class="card-ed__title">${p.nickname}</div>
          ${ (p.careerYears||p.careerYears===0) ? `<span class="badge-years">${p.careerYears}y</span>` : '' }
        </div>
        <div class="card-ed__meta">${p.headline ? p.headline : '소개가 없습니다'}</div>
      </div>
    </article>
  `;

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
    const root = $('#home') || document.querySelector('main') || document.body;
    const heroRoot = $('#hero');
    const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);

    /* Hero */
    renderHero(heroRoot, recruits);

    /* Editorial: 오늘의 라이브(피처 1 + 일반 4) */
    const recs = recruits.slice(0,5);
    const recHTML = !recs.length ? `
      <div class="ed-grid">
        <article class="card-ed">
          <div class="card-ed__body">
            <div class="card-ed__title">등록된 라이브가 없습니다</div>
            <div class="card-ed__meta">브랜드 공고를 등록해보세요</div>
          </div>
        </article>
      </div>` : `
      <div class="ed-grid">
        ${recs.map((r,i)=> tplRecruitCard(r, i===0)).join('')}
      </div>`;

    /* Editorial: 포트폴리오(그리드 6) */
    const pfs = portfolios.slice(0,6);
    const pfHTML = !pfs.length ? `
      <div class="ed-grid">
        <article class="card-ed">
          <div class="card-ed__body">
            <div class="card-ed__title">포트폴리오가 없습니다</div>
            <div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div>
          </div>
        </article>
      </div>` : `
      <div class="ed-grid">
        ${pfs.map(p=> tplPortfolioCard(p)).join('')}
      </div>`;

    root.innerHTML = [
      sectionBlock('TODAY LINEUP', 'recruit-list.html', recHTML),
      sectionBlock('SPOTLIGHT PORTFOLIOS', 'portfolio-list.html', pfHTML),
    ].join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();