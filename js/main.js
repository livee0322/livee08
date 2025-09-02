/* /* Home — recruit-test v2.5 (hotfix: lineup fallback + brandname variants)
   - 라인업: shootDate 없거나 time 비어도 closeAt/createdAt으로 대체
   - 브랜드명: brandname(소문자), recruit.brandname 등 모든 변형 흡수
*/
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=50';

  const thumbOr = (src, seed='lv') =>
    src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

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

  /* ── 브랜드명 추출: 모든 변형 흡수 (brandName/brandname, 상/하위) ── */
  const pickBrandName = (c = {}) => {
    const cand = [
      c.recruit?.brandName,
      c.recruit?.brandname,          // 소문자 변형
      c.brandName,
      c.brandname,                   // 소문자 변형
      (typeof c.brand === 'string' ? c.brand : ''),
      c.brand?.brandName, c.brand?.name,
      c.owner?.brandName, c.owner?.name,
      c.createdBy?.brandName, c.createdBy?.name,
      c.user?.brandName, c.user?.companyName
    ].filter(Boolean).map(s => String(s).trim());
    const found = cand.find(s => s && s !== '브랜드');
    return found || '브랜드';
  };

  /* ── 시간 유틸: shootDate 없으면 closeAt→createdAt 순으로 대체 ── */
  const parseStartDate = (shootDate, shootTime, fallbackISO) => {
    let d = shootDate ? new Date(shootDate) : (fallbackISO ? new Date(fallbackISO) : null);
    if (!d || isNaN(d)) return null;
    const hm = (shootTime || '').split('~')[0] || '';
    const m = hm.match(/(\d{1,2})(?::?(\d{2}))?/); // '14:30' 또는 '1430'
    const hh = m ? Number(m[1] || 0) : 0;
    const mm = m ? Number(m[2] || 0) : 0;
    d.setHours(hh||0, mm||0, 0, 0);
    return d;
  };
  const isSameLocalDay = (a, b=new Date()) =>
    a && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

  /* ── 데이터 가져오기 ── */
  async function fetchRecruits(){
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/') ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    try{
      const res = await fetch(url, { headers:{'Accept':'application/json'} });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      return list.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: pickBrandName(c),
        title: c.title || c.recruit?.title || '(제목 없음)',
        thumb: c.thumbnailUrl || c.coverImageUrl || '',
        closeAt: c.closeAt,
        createdAt: c.createdAt || c._createdAt || c.meta?.createdAt || null,
        shootDate: c.recruit?.shootDate,             // 있을 수도 없을 수도
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable
      }));
    }catch(e){
      console.warn('[HOME] fetch recruits error:', e);
      return [];
    }
  }

  const metaLineup  = it => fmtDateHM(it._start || it.shootDate || it.closeAt, it.shootTime);
  const metaRecruit = it => {
    const pay = it.payNegotiable ? '협의 가능' : (it.pay ? `${money(it.pay)}원` : '미정');
    return `${it.closeAt ? `마감 ${fmtDate(it.closeAt)}` : '마감일 미정'} · 출연료 ${pay}`;
  };

  /* ── 템플릿: 브랜드(파란 작게) → 제목 → 메타 ── */
  function tplLineup(items){
    if(!items.length){
      return `<div class="list-vert"><article class="item">
        <img class="thumb" src="${thumbOr('', 'lineup-empty')}" alt=""/>
        <div class="item-body">
          <div class="lv-brand">라이브</div>
          <div class="lv-title">등록된 라이브가 없습니다</div>
          <div class="lv-when">새 공고를 등록해보세요</div>
        </div></article></div>`;
    }
    return `<div class="list-vert">${
      items.map(it=>`
        <article class="item">
          <img class="thumb" src="${thumbOr(it.thumb,it.id)}" alt=""
               onerror="this.src='${thumbOr('', 'lineup-fallback')}'"/>
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
        <img class="mini-thumb" src="${thumbOr('', 'recruits-empty')}" alt=""/>
        <div class="mini-body">
          <div class="lv-brand">라이브</div>
          <div class="lv-title">추천 공고가 없습니다</div>
          <div class="lv-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
        </div></article></div>`;
    }
    return `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${thumbOr(r.thumb,r.id)}" alt=""
               onerror="this.src='${thumbOr('', 'recruits-fallback')}'"/>
          <div class="mini-body">
            <div class="lv-brand">${r.brandName}</div>
            <div class="lv-title">${r.title}</div>
            <div class="lv-meta">${metaRecruit(r)}</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  /* ── 마운트 자동 ── */
  function ensureMount() {
    let root = $('#home') || $('#app') || document.querySelector('main');
    if (!root) {
      root = document.createElement('div');
      root.id = 'home';
      document.body.appendChild(root);
    }
    return root;
  }

  /* ── 렌더링 ── */
  async function render(){
    const root = ensureMount();
    const all = await fetchRecruits();

    // 각 항목에 _start 계산: shootDate → closeAt → createdAt
    const withStart = all.map(r => ({
      ...r,
      _start: parseStartDate(r.shootDate, r.shootTime, r.closeAt || r.createdAt)
    })).filter(r => r._start instanceof Date && !isNaN(r._start));

    // 1) 오늘의 라이브(오늘 먼저, 없으면 가까운 미래)
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

    // 2) 추천 공고(최신 생성순)
    const latest = [...all]
      .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
      .slice(0, 10);

    root.innerHTML = `
      <div class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplLineup(todayList)}
      </div>

      <div class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplRecruits(latest)}
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();