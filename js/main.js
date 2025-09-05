/* Home — v2.6.4
   - portfolio-test: 필드 스캐너로 썸네일/닉네임/경력/한줄소개 안정화
   - fallback 이미지는 항상 사이트 루트의 /default.jpg
*/
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=50';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=24';

  // ── 이미지 유틸 & 플레이스홀더(루트 고정) ──
  const ROOT = (CFG.BASE_PATH || '').replace(/\/$/, '');
  const PLACEHOLDER = `${ROOT}/default.jpg`;
  const THUMB = CFG.thumb || {
    card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
    square:  "c_fill,g_auto,w_320,h_320,f_auto,q_auto",
  };
  const injectCloud = (url, t) => {
    try{
      if (!url) return PLACEHOLDER;
      if (!/\/upload\//.test(url)) return url;               // 클라우디너리 아니면 그대로
      const i = url.indexOf('/upload/');
      const next = url.slice(i+8).split('/')[0] || '';
      if (/^([a-z]+_[^/]+,?)+$/.test(next)) return url;      // 이미 변환 있음
      return url.slice(0,i+8) + t + '/' + url.slice(i+8);
    }catch{ return PLACEHOLDER; }
  };
  const thumbOr = (src) => src || PLACEHOLDER;

  // ── 공통 포맷터 ──
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

  // ── Recruit: 브랜드명 ──
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

  // ── Portfolio: 닉네임/소개/경력/썸네일 스캐너 ──
  const pickNickname = (p = {}) => {
    const direct = [
      p.nickname, p.displayName, p.name,
      p.user?.nickname, p.createdBy?.nickname, p.realName
    ].find(v => typeof v === 'string' && v.trim());
    return (direct || '쇼호스트').trim();
  };

  const pickHeadline = (p = {}) => {
    // 한 줄 소개 후보들 → 없으면 bio/description 요약
    const direct = [
      p.headline, p.oneLine, p.oneliner, p.tagline, p.summary, p.title
    ].find(v => typeof v === 'string' && v.trim());
    if (direct) return direct.trim();

    const long = [p.bio, p.description, p.about].find(v => typeof v === 'string' && v.trim());
    if (long) {
      const s = long.replace(/\s+/g,' ').trim();
      return s.length > 60 ? s.slice(0,60) + '…' : s;
    }
    return ''; // 비우면 UI에서 '소개가 없습니다' 출력
  };

  const pickCareerYears = (p = {}) => {
    const raw = p.careerYears ?? p.career?.years ?? p.years;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const pickThumb = (p = {}) => {
    const cand = [
      p.mainThumbnailUrl, p.mainThumbnail,
      p.coverImageUrl, p.coverImage,
      Array.isArray(p.subThumbnails) ? p.subThumbnails[0] : '',
      Array.isArray(p.subImages)     ? p.subImages[0]     : ''
    ].find(v => typeof v === 'string' && v.trim());
    if (!cand) return PLACEHOLDER;
    return injectCloud(cand, THUMB.card169);
  };

  // ── 라인업 시간 ──
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

  // ── 데이터 로드 ──
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
        headline: pickHeadline(p),
        careerYears: pickCareerYears(p),
        thumb: pickThumb(p),
        createdAt: p.createdAt || p._createdAt || null
      }));
    }catch(e){
      console.warn('[HOME] fetch portfolios error:', e);
      return [];
    }
  }

  // ── 메타 & 템플릿 ──
  const metaLineup  = it => fmtDateHM(it._start || it.shootDate || it.closeAt, it.shootTime);
  const metaRecruit = it => {
    const pay = it.payNegotiable ? '협의 가능' : (it.pay ? `${money(it.pay)}원` : '미정');
    return `${it.closeAt ? `마감 ${fmtDate(it.closeAt)}` : '마감일 미정'} · 출연료 ${pay}`;
  };

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
          <img class="thumb" src="${thumbOr(injectCloud(it.thumb, THUMB.card169))}" alt="" loading="lazy"
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
          <img class="mini-thumb" src="${thumbOr(injectCloud(r.thumb, THUMB.card169))}" alt="" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'"/>
          <div class="mini-body">
            <div class="lv-brand">${r.brandName}</div>
            <div class="lv-title">${r.title}</div>
            <div class="lv-meta">${metaRecruit(r)}</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  // ★ 포트폴리오 카드: 썸네일/닉네임/(경력)/한줄소개
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
          <img class="mini-thumb" src="${thumbOr(p.thumb)}" alt="" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'"/>
          <div class="mini-body">
            <div class="lv-brand">${p.name}${Number.isFinite(p.careerYears) ? ` · 경력 ${p.careerYears}년` : ''}</div>
            <div class="lv-title">${p.headline || '소개가 없습니다'}</div>
            <div class="lv-meta"></div>
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