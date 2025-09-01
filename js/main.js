/* Home — recruit-test 기반 렌더 */
(() => {
  const $ = s => document.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=20';

  const thumbOr = (src, seed='lv') =>
    src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return ''; const d=new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const fmtDayHM = (dateISO, timeRange) => {
    const d = new Date(dateISO||''); if (isNaN(d)) return '';
    const hm = (timeRange||'').split('~')[0] || ''; return `${d.getDate()}일 ${hm}`.trim();
  };

  async function fetchRecruits(){
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:`/${EP_RECRUITS}`}`;
    try{
      const res = await fetch(url, { headers:{'Accept':'application/json'} });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      return list.map((c,i)=>({
        id:c.id||c._id||`${i}`,
        title:c.title||c.recruit?.title||'(제목 없음)',
        thumb:c.thumbnailUrl||c.coverImageUrl||'',
        closeAt:c.closeAt,
        shootDate:c.recruit?.shootDate,
        shootTime:c.recruit?.shootTime,
        pay:c.recruit?.pay,
        payNegotiable:!!c.recruit?.payNegotiable
      }));
    }catch(e){
      console.warn('[HOME] fetch recruits error:', e);
      return [];
    }
  }

  const metaForLineup = it => {
    const pay = it.payNegotiable ? '협의 가능' :
      (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '모집중');
    return `${pay} · ${fmtDayHM(it.shootDate, it.shootTime)} 예정`;
  };

  function tplLineup(items){
    if(!items.length){
      return `<div class="list-vert"><article class="item">
        <img class="thumb" src="${thumbOr('', 'lineup-empty')}" alt=""/>
        <div><div class="title">등록된 라이브가 없습니다</div>
        <div class="meta">새 공고를 등록해보세요</div></div></article></div>`;
    }
    return `<div class="list-vert">${
      items.map(it=>`
        <article class="item">
          <img class="thumb" src="${thumbOr(it.thumb,it.id)}" alt="" onerror="this.src='${thumbOr('', 'lineup-fallback')}'"/>
          <div style="min-width:0">
            <div class="title">${it.title}</div>
            <div class="meta">${metaForLineup(it)}</div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  function tplRecruits(items){
    if(!items.length){
      return `<div class="hscroll"><article class="card-mini">
        <img class="mini-thumb" src="${thumbOr('', 'recruits-empty')}" alt=""/>
        <div><div class="mini-title">추천 공고가 없습니다</div>
        <div class="mini-meta">최신 공고가 올라오면 여기에 표시됩니다</div></div>
      </article></div>`;
    }
    return `<div class="hscroll">${
      items.map(r=>`
        <article class="card-mini">
          <img class="mini-thumb" src="${thumbOr(r.thumb,r.id)}" alt="" onerror="this.src='${thumbOr('', 'recruits-fallback')}'"/>
          <div class="mini-body">
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">
              출연료 ${r.payNegotiable?'협의 가능':(r.pay?`${Number(r.pay).toLocaleString('ko-KR')}원`:'미정')}
               · 마감 ${fmtDate(r.closeAt)}
            </div>
          </div>
        </article>`).join('')
    }</div>`;
  }

  async function render(){
    const root = $('#home');
    const recruits = await fetchRecruits();

    // 오늘의 라인업(미래 기준 상위 2개)
    const now = new Date();
    const upcoming = recruits
      .filter(r=>r.shootDate)
      .map(r=>{
        const start=new Date(r.shootDate);
        const hm=(r.shootTime||'').split('~')[0]||'00:00';
        const [h,m]=hm.split(':').map(Number); start.setHours(h||0,m||0,0,0);
        return {...r,_start:start};
      })
      .filter(r=>r._start>now)
      .sort((a,b)=>a._start-b._start)
      .slice(0,2);

    root.innerHTML = `
      <div class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplLineup(upcoming)}
      </div>

      <div class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="index.html#recruits">더보기</a></div>
        ${tplRecruits(recruits)}
      </div>
    `;
  }

  render();
})();