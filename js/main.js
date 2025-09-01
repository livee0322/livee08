/* Home recruits loader with verbose logging and fallback to /campaigns */
(() => {
  const log = (...a)=>console.log("[home]",...a);
  const warn = (...a)=>console.warn("[home]",...a);

  const $ = (s)=>document.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  let BASE_PATH = CFG.BASE_PATH || "";
  if (BASE_PATH && !BASE_PATH.startsWith("/")) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === "/") BASE_PATH = "";

  const DEFAULT_IMG = "default.jpg";

  async function fetchJson(url){
    log("GET →", url);
    const r = await fetch(url);
    const j = await r.json().catch(()=>({}));
    log("res:", r.status, j);
    return { r, j };
  }

  function normalizeItems(j){
    const list =
      (Array.isArray(j) && j) ||
      j.items || j.data?.items ||
      j.docs  || j.data?.docs  || [];
    return list.map(c=>({
      id: c.id || c._id,
      title: c.title || "",
      thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
      closeAt: c.closeAt,
      shootDate: c.recruit?.shootDate,
      shootTime: c.recruit?.shootTime,
      pay: c.recruit?.pay,
      payNegotiable: !!c.recruit?.payNegotiable,
      status: c.status
    }));
  }

  async function getRecruits(){
    // 1) /recruit-test
    let { r, j } = await fetchJson(`${API_BASE}/recruit-test?status=published&limit=20`);
    if (r.ok && j && j.ok !== false){
      return normalizeItems(j);
    }
    warn("recruit-test failed, fallback to /campaigns…");
    // 2) /campaigns
    ({ r, j } = await fetchJson(`${API_BASE}/campaigns?type=recruit&status=published&limit=20`));
    if (r.ok && j && j.ok !== false){
      return normalizeItems(j);
    }
    return [];
  }

  const pad2 = (n)=>String(n).padStart(2,'0');
  function fmtDateYYYYMMDD(dateISO){
    if (!dateISO) return "";
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  function metaForLineup(item){
    const pay = item.payNegotiable ? "협의 가능" : (item.pay ? `${Number(item.pay).toLocaleString("ko-KR")}원` : "모집중");
    const d = new Date(item.shootDate||"");
    let hm="";
    if (item.shootTime) hm = String(item.shootTime).split("~")[0];
    return `${pay} · ${isNaN(d)? "" : d.getDate()+"일"} ${hm||""} 예정`.trim();
  }

  function tplLineup(items){
    if (!items.length){
      return `<div class="list-vert">
        <article class="item"><img class="thumb" src="${DEFAULT_IMG}" alt="">
          <div style="min-width:0"><div class="title">등록된 라이브가 없습니다</div>
          <div class="meta one-line">새 공고를 등록해보세요</div></div>
        </article></div>`;
    }
    return `<div class="list-vert">${
      items.map(it=>`
        <article class="item">
          <img class="thumb" src="${it.thumb||DEFAULT_IMG}" alt="썸네일" onerror="this.src='${DEFAULT_IMG}'"/>
          <div style="min-width:0">
            <div class="title">${it.title}</div>
            <div class="meta one-line">${metaForLineup(it)}</div>
          </div>
        </article>`).join("")
    }</div>`;
  }

  function tplRecruits(items){
    if (!items.length){
      return `<div class="hscroll-mini">
        <article class="mini-card">
          <div class="mini-body">
            <div class="mini-title">추천 공고가 없습니다</div>
            <div class="mini-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
          </div>
          <img class="mini-thumb" src="${DEFAULT_IMG}" alt=""/>
        </article></div>`;
    }
    return `<div class="hscroll-mini">${
      items.map(r=>`
        <article class="mini-card">
          <div class="mini-body">
            <div class="mini-title">${r.title}</div>
            <div class="mini-meta">출연료 ${r.payNegotiable?'협의 가능':(r.pay?`${Number(r.pay).toLocaleString('ko-KR')}원`:'미정')}
              · 마감 ${fmtDateYYYYMMDD(r.closeAt)}</div>
          </div>
          <img class="mini-thumb" src="${r.thumb||DEFAULT_IMG}" alt="공고 썸네일" onerror="this.src='${DEFAULT_IMG}'"/>
        </article>`).join("")
    }</div>`;
  }

  async function render(){
    const recruits = await getRecruits();
    log("normalized recruits:", recruits);

    // 오늘 이후로 시작하는 것 중 2개
    const now = new Date();
    const upcoming = recruits
      .filter(r=>r.shootDate)
      .map(r=>{
        let s = new Date(r.shootDate);
        try{
          const hm=(r.shootTime||"").split("~")[0]||"00:00";
          const [hh,mm]=hm.split(":").map(Number);
          s.setHours(hh||0,mm||0,0,0);
        }catch{}
        return {...r, _start:s};
      })
      .filter(r=>r._start>now)
      .sort((a,b)=>a._start-b._start)
      .slice(0,2);

    const moreHref = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : "./index.html#recruits";

    $('#app').innerHTML = `
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplLineup(upcoming)}
      </section>
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplRecruits(recruits)}
      </section>
    `;
  }

  log("CFG", CFG, "API_BASE", API_BASE, "BASE_PATH", BASE_PATH);
  render();
})();