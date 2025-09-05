/* Home main.js — v2.7 (portfolio 썸네일/한줄소개 보장) */
(() => {
  const $ = (s, el=document) => el.querySelector(s);
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
        payNegotiable: !!c.recruit?.payNegotiable
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

  const money = (v)=> v==null ? '' : Number(v).toLocaleString('ko-KR');

  const tplRecruits = (items)=> !items.length ? `
    <div class="list-vert">
      <article class="item">
        <img class="thumb" src="${FALLBACK_IMG}" alt="">
        <div>
          <div class="lv-brand">라이브</div>
          <div class="lv-title">등록된 라이브가 없습니다</div>
          <div class="lv-when">새 공고를 등록해보세요</div>
        </div>
      </article>
    </div>` : `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${r.thumb}" alt="">
          <div>
            <div class="lv-brand">브랜드</div>
            <div class="lv-title">${r.title}</div>
            <div class="lv-meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · 출연료 ${
              r.payNegotiable ? '협의 가능' : (r.pay ? `${money(r.pay)}원` : '미정')
            }</div>
          </div>
        </article>`).join('')
    }</div>`;

  const tplPortfolios = (items)=> !items.length ? `
    <div class="pf-grid2">
      <article class="pf-card">
        <div class="pf-thumbWrap"><img class="pf-thumb" src="${FALLBACK_IMG}" alt=""></div>
        <div class="pf-name">포트폴리오가 없습니다</div>
        <div class="pf-meta"><span class="hl muted">첫 포트폴리오를 등록해보세요</span></div>
      </article>
    </div>` : `<div class="pf-grid2">${
      items.map(p=>`
        <article class="pf-card" onclick="location.href='portfolio-view.html?id=${encodeURIComponent(p.id)}'">
          <div class="pf-thumbWrap"><img class="pf-thumb" src="${p.thumb}" alt=""></div>
          <div class="pf-name">${p.nickname}</div>
          <div class="pf-meta">${
            (p.careerYears || p.careerYears===0)
              ? `<span class="badge-years">${p.careerYears}년</span>` : ''
          }${p.headline ? `<span class="hl">${p.headline}</span>` : `<span class="hl muted">소개가 없습니다</span>`}
          </div>
        </article>`).join('')
    }</div>`;

  function injectOnce(){
    if($('#_home_inject')) return;
    const css = document.createElement('style');
    css.id='_home_inject';
    css.textContent = `
      .hscroll{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 2px;scroll-snap-type:x mandatory}
      .hscroll::-webkit-scrollbar{display:none}
      .card-mini{flex:0 0 85%;display:grid;grid-template-columns:96px 1fr;gap:10px;border:1px solid var(--border);background:#fff;border-radius:16px;padding:10px;scroll-snap-align:center}
      .mini-thumb{width:96px;height:96px;border-radius:12px;object-fit:cover;background:#eee}
      .pf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .pf-card{border:1px solid var(--border);border-radius:16px;background:#fff;overflow:hidden;cursor:pointer}
      .pf-thumbWrap{aspect-ratio:16/9;background:#f3f4f6}
      .pf-thumb{width:100%;height:100%;object-fit:cover}
      .pf-name{font-weight:700;padding:10px 12px 4px}
      .pf-meta{padding:0 12px 12px;font-size:13px;color:#374151;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .pf-meta .hl.muted{color:#9CA3AF}
      .badge-years{font-size:12px;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:2px 8px}
    `;
    document.head.appendChild(css);
  }

  async function render(){
    injectOnce();
    const root = $('#home') || document.querySelector('main') || document.body;
    const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);
    root.innerHTML = `
      <div class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplRecruits(recruits.slice(0,6))}
      </div>
      <div class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplRecruits(recruits.slice(0,6))}
      </div>
      <div class="section">
        <div class="section-head"><h2>추천 포트폴리오</h2><a class="more" href="portfolio-list.html">더보기</a></div>
        ${tplPortfolios(portfolios.slice(0,12))}
      </div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();