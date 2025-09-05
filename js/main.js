/* Home — v2.6.1
   - recruit-test + portfolio-test
   - 절대경로/데이터URI 폴백으로 이미지 깨짐 방지
*/
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits      || '/recruit-test?status=published&limit=50';
  const EP_PORTFOLIOS = EP.portfolios    || '/portfolio-test?status=published&limit=24';

  const resolveAsset = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p) || /^data:/i.test(p)) return p;
    const base = (CFG.BASE_PATH || '').replace(/\/$/, '');
    return `${base}/${String(p).replace(/^\/+/, '')}`;
  };
  const PLACEHOLDER_DATA =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
         <rect width="100%" height="100%" fill="#e9eef3"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               fill="#8a97a6" font-family="sans-serif" font-size="18">이미지 없음</text>
       </svg>`
    );
  const PLACEHOLDER = resolveAsset(CFG.placeholderThumb || 'assets/default.jpg') || PLACEHOLDER_DATA;

  const thumbOr = (src, seed='lv') => src || PLACEHOLDER;

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

  // 브랜드명(Recruit)
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

    const scan = (obj, depth=0) => {
      if (!obj || typeof obj !== 'object' || depth > 2) return '';
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string' && /brand/i.test(k) && v.trim()) return v.trim();
        if (v && typeof v === 'object') {
          const t = scan(v, depth+1);
          if (t) return t;
        }
      }
      return '';
    };
    const found = scan(c);
    return found && found !== '브랜드' ? found : '브랜드';
  };

  // 닉네임(Portfolio)
  const pickNickname = (p = {}) => {
    const direct = [
      p.nickname, p.displayName, p.name,
      p.user?.nickname, p.createdBy?.nickname,
      p.realName
    ].find(v => typeof v === 'string' && v.trim());
    return (direct || '쇼호스트').trim();
  };

  // 라인업 시간 계산
  const parseStartDate = (shootDate, shootTime, fallbackISO) => {
    let d = shootDate ? new Date(shootDate) : (fallbackISO ? new Date(fallbackISO) : null);
    if (!d || isNaN(d)) return null;
    const hm = (shootTime || '').split('~')[0] || '';
    const m = hm.match(/(\d{1,2})(?::?(\d{2}))?/);
    const hh = m ? Number(m[1] || 0) : 0;
    const mm = m ? Number(m[2] || 0) : 0;
    d.setHours(hh||0, mm||0, 0, 0);
    return d;
  };
  const isSameLocalDay = (a, b=new Date()) =>
    a && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

  async function fetchJSON(url){
    const res = await fetch(url, { headers:{'Accept':'application/json'} });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);
    return data;
  }

  async function fetchRecruits(){
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    try{
      const data = await fetchJSON(url);
      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      return list.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: pickBrandName(c),
        title: c.title || c.recruit?.title || '(제목 없음)',
        thumb: c.thumbnailUrl || c.coverImageUrl || '',
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

  async function fetchPortfolios(){
    const url = `${API_BASE}${EP_PORTFOLIOS.startsWith('/') ? EP_PORTFOLIOS : `/${EP_PORTFOLIOS}`}`;
    try{
      const data = await fetchJSON(url);
      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      return list.map((p,i)=>({
        id: p.id || p._id || `${i}`,
        name: pickNickname(p),
        headline: p.headline || '',
        thumb: p.mainThumbnailUrl || p.coverImageUrl || '',
        tags: Array.isArray(p.tags) ? p.tags.slice(0,3) : [],
        createdAt: p.createdAt || p._createdAt || null
      }));
    }catch(e){
      console.warn('[HOME] fetch portfolios error:', e);
      return [];
    }
  }

  const metaLineup  = it => fmtDateHM(it._start || it.shootDate || it.closeAt, it.shootTime);
  const metaRecruit = it => {
    const pay = it.payNegotiable ? '협의 가능' : (it.pay ? `${money(it.pay)}원` : '미정');
    return `${it.closeAt ? `마감 ${fmtDate(it.closeAt)}` : '마감일 미정'} · 출연료 ${pay}`;
  };
  const metaPortfolio = it => (it.tags.length ? `#${it.tags.join(' #')}` : '태그 없음');

  function tplLineup(items){
    if(!items.length){
      return `<div class="list-vert"><article class="item">
        <img class="thumb" src="${PLACEHOLDER}" alt=""/>
        <div class="item-body">
          <div class="lv-brand">라이브</div>
          <div class="lv-title">등록된 라이브가 없습니다</div>
          <div class="lv-when">새 공고를 등록해보세요</div>
        </div></article></div>`;
    }
    return `<div class="list-vert">${
      items.map(it=>`
        <article class="item">
          <img class="thumb" src="${thumbOr(it.thumb,it.id)}" alt="" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'"/>
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
        <img class="mini-thumb" src="${PLACEHOLDER}" alt=""/>
        <div class="mini-body">
          <div class="lv-brand">라이브</div>
          <div class="lv-title">추천 공고가 없습니다</div>
          <div class="lv-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
        </div></article></div>`;
    }
    return `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${thumbOr(r.thumb,r.id)}" alt="" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'"/>
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
      return `<div class="hscroll"><article class="card-mini">
        <img class="mini-thumb" src="${PLACEHOLDER}" alt=""/>
        <div class="mini-body">
          <div class="lv-brand">포트폴리오</div>
          <div class="lv-title">추천 포트폴리오가 없습니다</div>
          <div class="lv-meta">등록된 포트폴리오가 보이면 여기에 표시됩니다</div>
        </div></article></div>`;
    }
    return `<div class="hscroll">${
      items.map(p=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${thumbOr(p.thumb,p.id)}" alt="" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'"/>
          <div class="mini-body">
            <div class="lv-brand">${p.name}</div>
            <div class="lv-title">${p.headline || '소개가 없습니다'}</div>
            <div class="lv-meta">${metaPortfolio(p)}</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

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
    try {
      const [recruitsAll, pfsAll] = await Promise.all([fetchRecruits(), fetchPortfolios()]);

      const withStart = recruitsAll.map(r => ({
        ...r,
        _start: parseStartDate(r.shootDate, r.shootTime, r.closeAt || r.createdAt)
      })).filter(r => r._start instanceof Date && !isNaN(r._start));

      const now = new Date();
      let todayList = withStart
        .filter(r => isSameLocalDay(r._start, now))
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
        .slice(0, 10);

      const featuredPF = [...pfsAll]
        .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
        .slice(0, 12);

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
          <div class="section-head"><h2>추천 포트폴리오</h2><a class="more" href="index.html#portfolios">더보기</a></div>
          ${tplPortfolios(featuredPF)}
        </div>
      `;
    } catch (e) {
      console.error('[HOME] render error:', e);
      // 폴백 섹션도 비어 보이지 않게
      const emptyLine = tplLineup([]), emptyRec = tplRecruits([]), emptyPf = tplPortfolios([]);
      ensureMount().innerHTML = `
        <div class="section"><div class="section-head"><h2>오늘의 라이브 라인업</h2></div>${emptyLine}</div>
        <div class="section"><div class="section-head"><h2>추천 공고</h2></div>${emptyRec}</div>
        <div class="section"><div class="section-head"><h2>추천 포트폴리오</h2></div>${emptyPf}</div>
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();