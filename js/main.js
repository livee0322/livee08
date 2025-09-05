/* main.js — Home v2.7 (recruits + portfolios) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  /* ===== Config ===== */
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';

  /* ===== Image helpers ===== */
  const FALLBACK_IMG =
    (CFG.BASE_PATH ? `${CFG.BASE_PATH.replace(/\/$/, '')}/default.jpg` : 'default.jpg');

  const withFallback = (url) => (url && String(url).trim()) || FALLBACK_IMG;

  /* ===== Date / money ===== */
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const fmtDateHM = (dateISO, timeRange) => {
    if (!dateISO) return '';
    const d = new Date(dateISO); if (isNaN(d)) return '';
    const hmStart = (timeRange || '').split('~')[0] || '';
    return `${fmtDate(d.toISOString())}${hmStart ? ` ${hmStart}` : ''}`.trim();
  };
  const money = v => (v==null || v==='') ? '' : Number(v).toLocaleString('ko-KR');

  /* ===== Brand name (for recruits) ===== */
  const pickBrandName = (c = {}) => {
    const direct = [
      c.brandName, c.brandname,
      c.recruit?.brandName, c.recruit?.brandname, c.recruit?.brand,
      (typeof c.brand === 'string' ? c.brand : ''),
      c.brand?.brandName, c.brand?.name,
      c.owner?.brandName, c.owner?.name,
      c.createdBy?.brandName, c.createdBy?.name,
      c.user?.brandName, c.user?.companyName
    ].find(v => typeof v === 'string' && v.trim());
    if (direct && direct.trim() !== '브랜드') return direct.trim();
    return '브랜드';
  };

  /* ===== API ===== */
  async function fetchJSON(url){
    const res = await fetch(url, { headers:{ 'Accept':'application/json' } });
    const j = await res.json().catch(()=> ({}));
    if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
    return j;
  }

  // Recruits (for "오늘의 라이브 라인업" + "추천 공고")
  async function fetchRecruits(){
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    try{
      const j = await fetchJSON(url);
      const list = (Array.isArray(j)&&j) || j.items || j.data?.items || j.docs || j.data?.docs || [];
      return list.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: pickBrandName(c),
        title: c.title || c.recruit?.title || '(제목 없음)',
        thumb: withFallback(c.thumbnailUrl || c.coverImageUrl),
        closeAt: c.closeAt,
        createdAt: c.createdAt || c._createdAt || c.meta?.createdAt || null,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable
      }));
    }catch(e){
      console.warn('[HOME] fetch recruits error:', e);
      return [];
    }
  }

  // Portfolios (server returns unified schema: id, nickname, headline, careerYears, mainThumbnailUrl)
  async function fetchPortfolios(){
    const url = `${API_BASE}${EP_PORTFOLIOS.startsWith('/') ? EP_PORTFOLIOS : `/${EP_PORTFOLIOS}`}`;
    try{
      const j = await fetchJSON(url);
      const arr = (Array.isArray(j)&&j) || j.items || j.data?.items || j.docs || j.data?.docs || [];
      return arr.map((p,i)=>({
        id: p.id || p._id || `${i}`,
        name: p.nickname || p.displayName || p.name || '무명',
        headline: p.headline || '',
        careerYears: Number.isFinite(+p.careerYears) ? +p.careerYears : undefined,
        thumb: withFallback(p.mainThumbnailUrl || p.mainThumbnail || (Array.isArray(p.subThumbnails)&&p.subThumbnails[0])),
      }));
    }catch(e){
      console.warn('[HOME] fetch portfolios error:', e);
      return [];
    }
  }

  /* ===== Templating ===== */
  const metaLineup  = it => fmtDateHM(it.shootDate || it.closeAt, it.shootTime);
  const metaRecruit = it => {
    const pay = it.payNegotiable ? '협의 가능' : (it.pay ? `${money(it.pay)}원` : '미정');
    return `${it.closeAt ? `마감 ${fmtDate(it.closeAt)}` : '마감일 미정'} · 출연료 ${pay}`;
  };

  function tplLineup(items){
    if(!items.length){
      return `<div class="list-vert"><article class="item">
        <img class="thumb" src="${FALLBACK_IMG}" alt=""/>
        <div class="item-body">
          <div class="lv-brand">라이브</div>
          <div class="lv-title">등록된 라이브가 없습니다</div>
          <div class="lv-when">새 공고를 등록해보세요</div>
        </div></article></div>`;
    }
    return `<div class="list-vert">${
      items.map(it=>`
        <article class="item">
          <img class="thumb" src="${withFallback(it.thumb)}" alt="" onerror="this.src='${FALLBACK_IMG}'"/>
          <div class="item-body">
            <div class="lv-brand">${it.brandName}</div>
            <div class="lv-title">${it.title}</div>
            <div class="lv-when">${metaLineup(it)}</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  function tplRecruits(items){
    if(!items.length){
      return `<div class="hscroll"><article class="card-mini">
        <img class="mini-thumb" src="${FALLBACK_IMG}" alt=""/>
        <div class="mini-body">
          <div class="lv-brand">라이브</div>
          <div class="lv-title">추천 공고가 없습니다</div>
          <div class="lv-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
        </div></article></div>`;
    }
    return `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${withFallback(r.thumb)}" alt="" onerror="this.src='${FALLBACK_IMG}'"/>
          <div class="mini-body">
            <div class="lv-brand">${r.brandName}</div>
            <div class="lv-title">${r.title}</div>
            <div class="lv-meta">${metaRecruit(r)}</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  function tplPortfolios(items){
    if(!items.length){
      return `<div class="pgrid"><article class="p-card">
        <div class="p-thumbWrap"><img class="p-thumb" src="${FALLBACK_IMG}" alt=""></div>
        <div class="p-body">
          <div class="p-name">포트폴리오 없음</div>
          <div class="p-headline">등록된 포트폴리오가 없어요</div>
        </div>
      </article></div>`;
    }
    return `<div class="pgrid">${
      items.map(p=>{
        const sub = p.headline && p.headline.trim() ? p.headline.trim() : '소개가 없습니다';
        const yrs = Number.isFinite(p.careerYears) ? `<span class="p-career">${p.careerYears}년</span>` : '';
        return `<article class="p-card" data-id="${p.id}">
          <a class="p-thumbWrap" href="portfolio-view.html?id=${encodeURIComponent(p.id)}" aria-label="${p.name}">
            <img class="p-thumb" src="${withFallback(p.thumb)}" alt="" onerror="this.src='${FALLBACK_IMG}'"/>
          </a>
          <div class="p-body">
            <div class="p-name">${p.name}${yrs}</div>
            <div class="p-headline">${sub}</div>
          </div>
        </article>`;
      }).join('')
    }</div>`;
  }

  /* ===== Mount & render ===== */
  function ensureMount() {
    let root = $('#home') || $('#app') || document.querySelector('main');
    if (!root) {
      root = document.createElement('div');
      root.id = 'home';
      document.body.appendChild(root);
    }
    return root;
  }

  async function render(){
    const root = ensureMount();

    // fetch in parallel
    const [recruitsAll, portfolios] = await Promise.all([
      fetchRecruits(),
      fetchPortfolios()
    ]);

    // lineup: today or next upcoming (simple)
    const now = new Date();
    const withStart = recruitsAll.map(r => {
      const d = r.shootDate ? new Date(r.shootDate) : (r.closeAt ? new Date(r.closeAt) : null);
      return { ...r, _start: d && !isNaN(d) ? d : null };
    }).filter(r => r._start);

    let todayList = withStart
      .filter(r => {
        const a=r._start,b=now;
        return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
      })
      .sort((a,b)=> a._start - b._start)
      .slice(0,5);

    if (!todayList.length) {
      todayList = withStart
        .filter(r => r._start > now)
        .sort((a,b)=> a._start - b._start)
        .slice(0,5);
    }

    const latestRecruits = [...recruitsAll]
      .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
      .slice(0, 8);

    root.innerHTML = `
      <div class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplLineup(todayList)}
      </div>

      <div class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplRecruits(latestRecruits)}
      </div>

      <div class="section">
        <div class="section-head"><h2>추천 포트폴리오</h2><a class="more" href="library.html#portfolios">더보기</a></div>
        ${tplPortfolios(portfolios)}
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();