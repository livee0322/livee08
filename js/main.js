// Home main.js — v2.7 Clean
(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=10';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=8';
  const FALLBACK_IMG  = (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const money = v => v==null ? '' : Number(v).toLocaleString('ko-KR');

  async function getJSON(url){
    const r = await fetch(url, { headers:{'Accept':'application/json'} });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j;
  }
  const parseItems = j => (Array.isArray(j)? j : (j.items || j.data?.items || j.docs || j.data?.docs || []));

  async function fetchRecruits(){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_RECRUITS}`));
      return arr.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        title: c.title || '(제목 없음)',
        thumb: c.thumbnailUrl || c.coverImageUrl || FALLBACK_IMG,
        closeAt: c.closeAt,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable
      }));
    }catch{ return []; }
  }
  async function fetchPortfolios(){
    try{
      const arr = parseItems(await getJSON(`${API_BASE}${EP_PORTFOLIOS}`));
      return arr.map((p,i)=>({
        id: p.id||p._id||`${i}`,
        nickname: p.nickname || p.displayName || '무명',
        headline: p.headline || '',
        thumb: p.mainThumbnailUrl || p.coverImageUrl || FALLBACK_IMG
      }));
    }catch{ return []; }
  }

  const tplRecruits = items => !items.length ? `<div class="list-vert">
      <article class="item"><img class="thumb" src="${FALLBACK_IMG}" alt="">
        <div><div class="lv-title">공고 없음</div><div class="lv-meta">새 공고를 등록해보세요</div></div>
      </article></div>` :
    `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
          <img class="mini-thumb" src="${r.thumb}" alt="">
          <div>
            <div class="lv-brand">브랜드</div>
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · ${
              r.payNegotiable ? '협의' : (r.pay ? money(r.pay)+'원' : '미정')
            }</div>
          </div>
        </article>`).join('')
    }</div>`;

  const tplPortfolios = items => !items.length ? `<div class="pf-grid">
      <article class="pf-card"><div class="pf-thumb"></div>
        <div class="pf-body"><div class="pf-name">포트폴리오 없음</div></div>
      </article></div>` :
    `<div class="pf-grid">${
      items.map(p=>`
        <article class="pf-card" onclick="location.href='portfolio-detail.html?id=${encodeURIComponent(p.id)}'">
          <img class="pf-thumb" src="${p.thumb}" alt="">
          <div class="pf-body">
            <div class="pf-nameRow">
              <div class="pf-name">${p.nickname}</div>
            </div>
            <div class="pf-intro">${p.headline||'<span class="hl muted">소개 없음</span>'}</div>
          </div>
        </article>`).join('')
    }</div>`;

  async function render(){
    const root = $('#home');
    const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);
    root.innerHTML = `
      <div class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="recruit-list.html">더보기</a></div>
        ${tplRecruits(recruits.slice(0,6))}
      </div>
      <div class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="recruit-list.html">더보기</a></div>
        ${tplRecruits(recruits.slice(0,6))}
      </div>
      <div class="section">
        <div class="section-head"><h2>추천 포트폴리오</h2><a class="more" href="portfolio-list.html">더보기</a></div>
        ${tplPortfolios(portfolios.slice(0,8))}
      </div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else { render(); }
})();