/* Home — recruit-test 기반 (브랜드명 + 가까운 5개 라인업) v2.5 필드명 일치판 — recruit-new.js(payload)와 스키마 맞춤

소스 기준: /recruit-test (status=published)

필드 매핑: closeAt, recruit.shootDate, recruit.shootTime, recruit.pay, recruit.payNegotiable

섹션: 오늘의 라이브 라인업(가까운 5건), 추천 공고(가로 스크롤) */ (() => { const $ = (s) => document.querySelector(s);


const CFG = window.LIVEE_CONFIG || {}; const API_BASE = (CFG.API_BASE || '/api/v1').replace(//$/, ''); const EP = CFG.endpoints || {}; const EP_RECRUITS = EP.recruits || '/recruit-test?status=published&limit=50';

const thumbOr = (src, seed='lv') => src || https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360;

const pad2 = (n) => String(n).padStart(2,'0'); const fmtDate = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10); return ${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}; }; const fmtDateHM = (dateISO, timeRange) => { if (!dateISO) return ''; const d = new Date(dateISO); if (isNaN(d)) return ''; const hmStart = (timeRange || '').split('~')[0] || ''; return ${fmtDate(d.toISOString())}${hmStart? ${hmStart}:''}.trim(); }; const money = (v) => (v==null || v==='') ? '' : Number(v).toLocaleString('ko-KR');

const pickBrandName = (c) => c.brandName || c.brand?.name || c.owner?.brandName || c.owner?.name || c.user?.companyName || c.user?.brandName || '브랜드';

async function fetchRecruits(){ const url = ${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:/${EP_RECRUITS}}; try{ const res  = await fetch(url, { headers:{ 'Accept':'application/json' } }); const data = await res.json().catch(()=>({})); if(!res.ok || data.ok===false) throw new Error(data.message||HTTP_${res.status});

const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
  return list.map((c,i)=>({
    id: c.id||c._id||`${i}`,
    brandName: pickBrandName(c),
    title: c.title || c.recruit?.title || '(제목 없음)',
    thumb: c.thumbnailUrl || c.coverImageUrl || '',
    closeAt: c.closeAt, // recruit-new.js payload의 closeAt과 일치
    shootDate: c.recruit?.shootDate, // Date ISO 문자열
    shootTime: c.recruit?.shootTime, // 'HH:mm~HH:mm'
    pay: c.recruit?.pay,
    payNegotiable: !!c.recruit?.payNegotiable
  }));
}catch(e){
  console.warn('[HOME] fetch recruits error:', e);
  return [];
}

}

const metaLineup  = (it) => fmtDateHM(it.shootDate, it.shootTime); const metaRecruit = (it) => { const payStr = it.payNegotiable ? '협의 가능' : (it.pay ? ${money(it.pay)}원 : '미정'); const close  = it.closeAt ? 마감 ${fmtDate(it.closeAt)} : '마감일 미정'; return ${close} · 출연료 ${payStr}; };

function tplLineup(items){ if(!items.length){ return <div class="list-vert"><article class="item"> <img class="thumb" src="${thumbOr('', 'lineup-empty')}" alt=""/> <div class="item-body"> <div class="title"><span class="brand">라이브</span> · 등록된 라이브가 없습니다</div> <div class="meta">새 공고를 등록해보세요</div> </div></article></div>; } return <div class="list-vert">${ items.map(it=> <article class="item"> <img class="thumb" src="${thumbOr(it.thumb,it.id)}" alt=""
onerror="this.src='${thumbOr('', 'lineup-fallback')}'"/> <div class="item-body"> <div class="title"><span class="brand">${it.brandName}</span> · ${it.title}</div> <div class="meta">${metaLineup(it)}</div> </div> </article>).join('') }</div>; }

function tplRecruits(items){ if(!items.length){ return <div class="hscroll"><article class="card-mini"> <img class="mini-thumb" src="${thumbOr('', 'recruits-empty')}" alt=""/> <div class="mini-body"> <div class="mini-title"><span class="brand">라이브</span> · 추천 공고가 없습니다</div> <div class="mini-meta">최신 공고가 올라오면 여기에 표시됩니다</div> </div></article></div>; } return <div class="hscroll">${ items.map(r=> <article class="card-mini"> <img class="mini-thumb" src="${thumbOr(r.thumb,r.id)}" alt=""
onerror="this.src='${thumbOr('', 'recruits-fallback')}'"/> <div class="mini-body"> <div class="mini-title"><span class="brand">${r.brandName}</span> · ${r.title}</div> <div class="mini-meta">${metaRecruit(r)}</div> </div> </article>).join('') }</div>; }

async function render(){ const root = $('#home'); if(!root) return; const recruits = await fetchRecruits();

// 가까운 5개(미래 기준)
const now = new Date();
const upcoming = recruits
  .filter(r=>r.shootDate)
  .map(r=>{
    const start = new Date(r.shootDate);
    const hm = (r.shootTime||'').split('~')[0]||'00:00';
    const [h,m] = hm.split(':').map(Number);
    start.setHours(h||0,m||0,0,0);
    return {...r,_start:start};
  })
  .filter(r=>r._start>now)
  .sort((a,b)=>a._start-b._start)
  .slice(0,5);

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

render(); })();

