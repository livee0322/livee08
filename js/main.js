<!-- /js/main.js -->
/* Home main.js — v2.9.10 (brand/pay fix) */
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
  const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  const money = v => v==null ? '' : Number(v).toLocaleString('ko-KR');
  const text  = v => (v==null ? '' : String(v).trim());
  const pickThumb = (o) =>
    o?.mainThumbnailUrl || o?.thumbnailUrl ||
    (Array.isArray(o?.subThumbnails) && o.subThumbnails[0]) ||
    (Array.isArray(o?.subImages) && o.subImages[0]) ||
    o?.coverImageUrl || o?.imageUrl || o?.thumbUrl || FALLBACK_IMG;

  const coalesce = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');

  async function getJSON(url){
    const r = await fetch(url, { headers:{'Accept':'application/json'} });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j;
  }
  const parseItems = j => (Array.isArray(j) ? j : (j.items || j.data?.items || j.docs || j.data?.docs || []));

  // ====== Brand & Fee robust mapping (서버 스키마 불일치 흡수) ======
  const getBrandName = (c) => text(coalesce(
    c.brandName,
    c.brand,                         // 모델이 brand 스트링만 주는 경우
    c.recruit?.brandName,
    c.brand?.name,                   // 객체로 오는 경우
    c.owner?.brandName,
    c.user?.brandName
  )) || '브랜드';

  const getFee = (c) => {
    const raw = coalesce(c.fee, c.recruit?.pay, c.pay);
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const isFeeNegotiable = (c) => !!coalesce(c.feeNegotiable, c.recruit?.payNegotiable, c.payNegotiable);

  async function fetchRecruits(){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:'/'+EP_RECRUITS}`));
      return arr.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: getBrandName(c),
        title: text(coalesce(c.title, c.recruit?.title, '제목 없음')),
        thumb: pickThumb(c),
        closeAt: coalesce(c.closeAt, c.recruit?.closeAt),
        fee: getFee(c),
        feeNegotiable: isFeeNegotiable(c)
      }));
    }catch{ return []; }
  }

  async function fetchPortfolios(){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:'/'+EP_PORTFOLIOS}`));
      return arr.map((p,i)=>({
        id: p.id||p._id||`${i}`,
        nickname: text(p.nickname || p.displayName || p.name || '쇼호스트'),
        headline: text(p.headline || ''),
        thumb: pickThumb(p)
      }));
    }catch{ return []; }
  }

  async function fetchNews(fallback=[]){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_NEWS.startsWith('/')?EP_NEWS:'/'+EP_NEWS}`));
      if (arr.length) {
        return arr.map((n,i)=>({
          id: n.id||n._id||`${i}`,
          title: text(n.title || n.headline || '뉴스'),
          date: n.publishedAt || n.createdAt || n.updatedAt,
          summary: text(n.summary || n.excerpt || '')
        }));
      }
    }catch{}
    return fallback.slice(0,6).map((r,i)=>({ id: r.id||`${i}`, title: r.title, date: r.closeAt, summary: '브랜드 소식' }));
  }

  /* ===== 히어로(단일 이미지) — bannertest.jpg를 JS로 주입 ===== */
  function renderHero(el){
    const heroSrc = 'bannertest.jpg'; // 루트/동일폴더
    el.innerHTML = `
      <article class="hero-card">
        <div class="hero-media"></div>
        <div class="hero-body">
          <div class="hero-kicker">LIVEE</div>
          <h1 class="hero-title">신제품 론칭 LIVE</h1>
          <p class="hero-sub">브랜드와 호스트를 가장 빠르게</p>
        </div>
      </article>`;
    const media = el.querySelector('.hero-media');
    if (media) {
      media.style.backgroundImage =
        `linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,.08)), url('${heroSrc}')`;
    }
    const nav = document.querySelector('.hero-nav'); if (nav) nav.style.display = 'none';
  }

  /* ===== 템플릿 ===== */
  const feeText = (fee, nego) => nego ? '협의' : (fee!=null ? `${money(fee)}원` : '출연료 미정');

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
          <img class="card-ed__media" src="${r.thumb}" alt="" loading="lazy" decoding="async">
          <div class="card-ed__body">
            <div class="card-ed__eyebrow">${r.brandName || '브랜드'}</div>
            <div class="card-ed__title">${r.title}</div>
            <div class="card-ed__meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${feeText(r.fee, r.feeNegotiable)}</div>
          </div>
        </article>`).join('')}
    </div>`;

  const tplRecruitHScroll = items => !items.length ? `
    <div class="hscroll">
      <article class="card-mini" aria-disabled="true">
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
          <img class="mini-thumb" src="${r.thumb}" alt="" loading="lazy" decoding="async">
          <div>
            <div class="lv-brand">${r.brandName || '브랜드'}</div>
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${feeText(r.fee, r.feeNegotiable)}</div>
          </div>
          <button class="mini-bookmark" aria-label="북마크"><i class="ri-bookmark-line"></i></button>
        </article>`).join('')}
    </div>`;

  const tplNewsList = items => !items.length ? `
    <div class="news-list">
      <article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article>
    </div>` : `
    <div class="news-list">
      ${items.map(n=>`
        <article class="news-item" onclick="location.href='news.html#/${encodeURIComponent(n.id)}'">
          <div class="news-item__title">${n.title}</div>
          <div class="news-item__meta">${n.date ? fmtDate(n.date)+' · ' : ''}${n.summary || '소식'}</div>
        </article>`).join('')}
    </div>`;

  const tplPortfolios = items => !items.length ? `
    <div class="ed-grid">
      <article class="card-ed"><div class="card-ed__body">
        <div class="card-ed__title">포트폴리오가 없습니다</div>
        <div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div>
      </div></article>
    </div>` : `
    <div class="pf-hlist">
      ${items.slice(0,6).map(p=>`
        <article class="pf-hcard">
          <img class="pf-avatar" src="${p.thumb}" alt="" loading="lazy" decoding="async">
          <div class="pf-info">
            <div class="pf-name">${p.nickname}</div>
            <div class="pf-intro">${p.headline || '소개 준비 중'}</div>
            <div class="pf-actions">
              <a class="btn btn--sm btn--chip" href="outbox-proposals.html?to=${encodeURIComponent(p.id)}"><i class="ri-mail-send-line"></i> 제안하기</a>
              <a class="btn btn--sm btn--chip" href="portfolio-detail.html?id=${encodeURIComponent(p.id)}"><i class="ri-user-line"></i> 프로필 보기</a>
            </div>
          </div>
        </article>`).join('')}
    </div>`;

  const tplCtaBanner = () => `
    <div class="cta-banner" role="region" aria-label="상담 배너">
      <div class="cta-copy">
        <div class="cta-kicker">무료 상담</div>
        <div class="cta-title">지금 바로 라이브 커머스 시작해보세요</div>
        <div class="cta-sub">기획 · 섭외 · 계약 · 결제까지 도와드립니다</div>
      </div>
      <div class="cta-actions">
        <a class="btn" href="recruit-new.html"><i class="ri-megaphone-line"></i> 공고 올리기</a>
        <a class="btn" href="help.html#contact"><i class="ri-chat-1-line"></i> 빠른 문의</a>
      </div>
    </div>`;

  function sectionBlock(title, moreHref, innerHTML, secKey){
    return `
      <div class="section" data-sec="${secKey||''}">
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

    const lineupHTML   = tplLineupList(recruits.slice(0,6));
    const recommendHTML= tplRecruitHScroll(recruits.slice(0,8));
    const newsHTML     = tplNewsList(news.slice(0,8));
    const pfHTML       = tplPortfolios(portfolios);

    root.innerHTML = [
      sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고', 'recruit-list.html', lineupHTML, 'lineup'),
      sectionBlock('브랜드 <span class="hl">pick</span>', 'recruit-list.html', recommendHTML, 'recruits'),
      sectionBlock('<span class="hl">라이비</span> 뉴스', 'news.html', newsHTML, 'news'),
      sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?', 'portfolio-list.html', pfHTML, 'pf'),
      `<div class="section">${tplCtaBanner()}</div>`
    ].join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else { render(); }
})();