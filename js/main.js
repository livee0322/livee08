/* Home main.js — v2.6 (simplified, unified schema)
   - portfolios: /portfolio-test?status=published&limit=12
   - thumbnail pick: mainThumbnailUrl → subThumbnails[0] → coverImageUrl → default.jpg
   - card: thumb / nickname / (careerYears) / headline
*/
(() => {
  const $ = (s, el=document) => el.querySelector(s);

  // ---- config -------------------------------------------------------------
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';

  // 루트의 default.jpg 사용
  const FALLBACK_IMG = (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  // ---- utils --------------------------------------------------------------
  const fmt = (v) => (v==null || v==='') ? '' : String(v);
  const money = (v) => (v==null || v==='') ? '' : Number(v).toLocaleString('ko-KR');
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const parseList = (j) => (Array.isArray(j) && j)
                        || j.items || j.data?.items || j.docs || j.data?.docs || [];

  const pickThumb = (p) =>
    p.mainThumbnailUrl
    || (Array.isArray(p.subThumbnails) && p.subThumbnails[0])
    || p.coverImageUrl
    || FALLBACK_IMG;

  // ---- fetchers -----------------------------------------------------------
  async function getJSON(url){
    const r = await fetch(url, { headers: { 'Accept':'application/json' } });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }

  async function fetchRecruits(){
    try{
      const j = await getJSON(`${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:'/'+EP_RECRUITS}`);
      const arr = parseList(j);
      return arr.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: c.brandName || c.recruit?.brandName || '라이브',
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
      const arr = parseList(j);
      return arr.map((p,i)=>({
        id: p.id || p._id || `${i}`,
        nickname: fmt(p.nickname) || fmt(p.displayName) || fmt(p.name) || '무명',
        careerYears: Number.isFinite(+p.careerYears) ? +p.careerYears : undefined,
        headline: fmt(p.headline) || '',
        thumb: pickThumb(p),
      }));
    }catch{ return []; }
  }

  // ---- templates ----------------------------------------------------------
  const tplRecruitsEmpty = `
    <div class="list-vert">
      <article class="item" style="display:grid;grid-template-columns:84px 1fr;gap:12px;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;background:#fff;">
        <img class="thumb" src="${FALLBACK_IMG}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:12px;background:#eee;"/>
        <div>
          <div class="lv-brand" style="color:#2563eb;font-weight:600;font-size:12px;">라이브</div>
          <div class="lv-title" style="font-weight:700;margin-top:2px;">등록된 라이브가 없습니다</div>
          <div class="lv-when" style="font-size:13px;color:var(--sub);margin-top:4px;">새 공고를 등록해보세요</div>
        </div>
      </article>
    </div>`;

  function tplRecruits(items){
    if(!items.length) return tplRecruitsEmpty;
    return `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${r.thumb}" alt=""/>
          <div class="mini-body">
            <div class="lv-brand">브랜드</div>
            <div class="lv-title">${r.title}</div>
            <div class="lv-meta">마감 ${r.closeAt ? fmtDate(r.closeAt) : '미정'} · 출연료 ${
              r.payNegotiable ? '협의 가능' : (r.pay ? `${money(r.pay)}원` : '미정')
            }</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  function tplPortfolios(items){
    if(!items.length){
      return `<div class="pf-grid2">
        <article class="pf-card">
          <div class="pf-thumbWrap"><img class="pf-thumb" src="${FALLBACK_IMG}" alt=""></div>
          <div class="pf-name">포트폴리오가 없습니다</div>
          <div class="pf-meta">첫 포트폴리오를 등록해보세요</div>
        </article>
      </div>`;
    }
    return `<div class="pf-grid2">${
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
  }

  // ---- minimal styles for portfolio grid (safe if main.css already has) ---
  function injectOnce(){
    if($('#_home_inject')) return;
    const css = document.createElement('style');
    css.id = '_home_inject';
    css.textContent = `
      .hscroll{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 2px;scroll-snap-type:x mandatory}
      .hscroll::-webkit-scrollbar{display:none}
      .card-mini{flex:0 0 85%;display:grid;grid-template-columns:96px 1fr;gap:10px;
        border:1px solid var(--border);background:#fff;border-radius:var(--radius-md);padding:10px;scroll-snap-align:center}
      .card-mini .mini-thumb{width:96px;height:96px;border-radius:12px;object-fit:cover;background:#eee}
      .pf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .pf-card{border:1px solid var(--border);border-radius:16px;background:#fff;overflow:hidden;cursor:pointer}
      .pf-thumbWrap{aspect-ratio:16/9;background:#f2f3f5}
      .pf-thumb{width:100%;height:100%;object-fit:cover;display:block}
      .pf-name{font-weight:700;padding:10px 12px 4px}
      .pf-meta{padding:0 12px 12px;font-size:13px;color:#374151;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .pf-meta .hl.muted{color:#9CA3AF}
      .badge-years{font-size:12px;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:2px 8px}
    `;
    document.head.appendChild(css);
  }

  // ---- render --------------------------------------------------------------
  function ensureMount(){
    return $('#home') || document.querySelector('main') || document.body;
  }

  async function render(){
    injectOnce();
    const root = ensureMount();

    // 데이터 병렬 로딩
    const [recruits, portfolios] = await Promise.all([
      fetchRecruits(),
      fetchPortfolios()
    ]);

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
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();