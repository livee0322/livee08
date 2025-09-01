/* Home – recruit-test 목록 렌더 */
(() => {
  const $ = (s)=>document.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=20';

  const DEFAULT_IMG = 'default.jpg';
  const pad2 = (n)=>String(n).padStart(2,'0');

  const fmtDayHM=(dateISO,timeRange)=>{
    const d = new Date(dateISO||''); if(isNaN(d)) return '';
    const day=d.getDate(); const hm=(timeRange||'').split('~')[0]||'';
    return `${day}일 ${hm}`.trim();
  };
  const fmtYYYYMMDD=(iso)=>{
    const d=new Date(iso); if(isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const metaLine=(it)=>{
    const pay = it.payNegotiable ? '협의 가능' : (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '모집중');
    return `${pay} · ${fmtDayHM(it.shootDate,it.shootTime)} 예정`;
  };

  async function fetchRecruits(){
    const url = `${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:`/${EP_RECRUITS}`}`;
    try{
      const r=await fetch(url); const j=await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const arr = j.items || j.data?.items || j.docs || [];
      return arr.map(c=>({
        id: c.id||c._id,
        title: c.title||'',
        thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
        closeAt: c.closeAt,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
    }catch(e){
      console.warn('[fetchRecruits]',e.message);
      return [];
    }
  }

  const tplLineup=(items)=> items.length?`
    <div class="list-vert">
      ${items.map(it=>`
        <article class="item">
          <img class="thumb" src="${it.thumb||DEFAULT_IMG}" alt="" onerror="this.src='${DEFAULT_IMG}'"/>
          <div style="min-width:0">
            <div class="title">${it.title}</div>
            <div class="meta one-line">${metaLine(it)}</div>
          </div>
        </article>`).join('')}
    </div>`:`
    <div class="list-vert">
      <article class="item"><img class="thumb" src="${DEFAULT_IMG}" alt="">
        <div style="min-width:0">
          <div class="title">등록된 라이브가 없습니다</div>
          <div class="meta one-line">새 공고를 등록해보세요</div>
        </div>
      </article>
    </div>`;

  const tplRecruits=(items)=> items.length?`
    <div class="hscroll-mini">
      ${items.map(r=>`
        <article class="mini-card">
          <div class="mini-body">
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">출연료 ${r.payNegotiable?'협의 가능':(r.pay?`${Number(r.pay).toLocaleString('ko-KR')}원`:'미정')}
              · 마감 ${fmtYYYYMMDD(r.closeAt)}</div>
          </div>
          <img class="mini-thumb" src="${r.thumb||DEFAULT_IMG}" alt="" onerror="this.src='${DEFAULT_IMG}'"/>
        </article>`).join('')}
    </div>`:`
    <div class="hscroll-mini">
      <article class="mini-card">
        <div class="mini-body">
          <div class="mini-title">추천 공고가 없습니다</div>
          <div class="mini-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
        </div>
        <img class="mini-thumb" src="${DEFAULT_IMG}" alt=""/>
      </article>
    </div>`;

  function tplPortfoliosStatic(){
    const samples=[
      { name:'최예나', years:5, intro:'뷰티 방송 전문', region:'서울' },
      { name:'김소라', years:3, intro:'테크/라이프 쇼호스트', region:'부산' },
      { name:'박민주', years:7, intro:'푸드 전문', region:'서울' },
      { name:'이지수', years:1, intro:'뷰티 쇼호스트', region:'대구' },
    ];
    return `<div class="grid grid-2">
      ${samples.map(p=>`
        <article class="card">
          <img class="cover" src="${DEFAULT_IMG}" alt=""/>
          <div class="body">
            <div class="title">${p.name}</div>
            <div class="meta">경력 ${p.years}년 · ${p.intro} (${p.region})</div>
          </div>
        </article>`).join('')}
    </div>`;
  }

  async function renderHome(){
    const recruits = await fetchRecruits();
    const now = new Date();
    const upcoming = recruits
      .filter(r=>r.shootDate)
      .map(r=>{
        let s=new Date(r.shootDate);
        const hm=(r.shootTime||'').split('~')[0]||'00:00';
        const [h,m]=(hm.split(':').map(Number));
        s.setHours(h||0,m||0,0,0);
        return {...r,_start:s};
      })
      .filter(r=>r._start>now)
      .sort((a,b)=>a._start-b._start)
      .slice(0,2);

    const more = BASE_PATH?`${BASE_PATH}/index.html#recruits`:'./index.html#recruits';
    $('#app').innerHTML = `
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="${more}">더보기</a></div>
        ${tplLineup(upcoming)}
      </section>
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="${more}">더보기</a></div>
        ${tplRecruits(recruits)}
      </section>
      <section class="section">
        <div class="section-head"><h2>추천 인플루언서</h2><a class="more" href="#">더보기</a></div>
        ${tplPortfoliosStatic()}
      </section>`;
  }

  renderHome();
})();