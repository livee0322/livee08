/* public/js/influencer-list.js — v1.3.0
 * 히어로 + (여/남) 가로스크롤 + 썸네일 월 + 검색/필터/정렬/페이지
 * 공통 UI(ui.js), 설정(config.js) 의존
 */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const PORT_BASE = (EP.portfolioBase || '/portfolio-test').replace(/^\/*/, '/');

  const HJSON = { Accept: 'application/json' };
  const money = (n) => (n == null ? '' : Number(n).toLocaleString('ko-KR'));
  const pad2  = (n) => String(n).padStart(2, '0');
  const fmt   = (iso) => {
    if (!iso) return '미정';
    const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const pick1x1 = (p) =>
    p?.mainThumbnailUrl || p?.thumbnailUrl ||
    (Array.isArray(p?.subThumbnails) && p.subThumbnails[0]) ||
    (CFG.placeholderThumb || 'default.jpg');

  const joinUrl=(b,p)=> b + (p.startsWith('/')?p:'/'+p);
  const buildQS=(o)=>{ const sp=new URLSearchParams(); Object.entries(o).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') sp.set(k,v); }); return sp.toString(); };
  async function getJSON(url){
    const r = await fetch(url,{headers:HJSON}); let j=null; try{ j=await r.json(); }catch{}
    if(!r.ok || (j&&j.ok===false)) throw new Error((j&&(j.message||j.error))||('HTTP_'+r.status));
    return j||{};
  }
  function parseItems(j){
    if(Array.isArray(j)) return j;
    if(Array.isArray(j.items)) return j.items;
    if(j.data){
      if(Array.isArray(j.data.items)) return j.data.items;
      if(Array.isArray(j.data.docs))  return j.data.docs;
      if(Array.isArray(j.data))       return j.data;
    }
    if(Array.isArray(j.docs)) return j.docs;
    if(Array.isArray(j.results)) return j.results;
    return [];
  }
  function readTotal(j, fb=0){
    if(typeof j.total==='number') return j.total;
    if(j.data && typeof j.data.total==='number') return j.data.total;
    if(j.data && typeof j.data.count==='number') return j.data.count;
    if(typeof j.count==='number') return j.count;
    return fb;
  }

  // ---------- state ----------
  const urlq = new URLSearchParams(location.search);
  const state = {
    page  : Number(urlq.get('page') || 1),
    limit : 12,
    sort  : urlq.get('sort') || 'recommended',
    query : urlq.get('query') || '',
    filters:{
      category : urlq.get('category') || '',
      channel  : urlq.get('channel')  || '',
      region   : urlq.get('region')   || '',
      followersMin : urlq.get('followersMin') || '',
      payMin   : urlq.get('payMin')   || '',
      payMax   : urlq.get('payMax')   || '',
      negotiable : urlq.get('negotiable') || '',
      verified   : urlq.get('verified')   || ''
    }
  };

  // bookmarks
  const BM_KEY='livee_bm_portfolio';
  const loadBM=()=>{ try{ return new Set(JSON.parse(localStorage.getItem(BM_KEY)||'[]')); }catch{ return new Set(); } };
  const saveBM=(s)=> localStorage.setItem(BM_KEY, JSON.stringify([...s]));
  let bm = loadBM();

  // fetch
  function buildQueryParams(){
    const f=state.filters;
    const p={ status:'published', limit:state.limit, skip:(state.page-1)*state.limit, page:state.page, sort:state.sort };
    if(state.query) p.query=state.query;
    if(f.category) p.category=f.category;
    if(f.channel)  p.channel=f.channel;
    if(f.region)   p.region=f.region;
    if(f.followersMin) p.followersMin=f.followersMin;
    if(f.payMin)   p.payMin=f.payMin;
    if(f.payMax)   p.payMax=f.payMax;
    if(f.negotiable) p.negotiable=1;
    if(f.verified)   p.verified=1;
    return p;
  }
  async function fetchPortfolios(){
    const url = joinUrl(API_BASE, PORT_BASE) + '?' + buildQS(buildQueryParams());
    const j = await getJSON(url);
    const items = parseItems(j);
    const total = readTotal(j, items.length);
    return { items, total };
  }

  // dom
  const heroEl = $('#ilHero');
  const curatedWrap = $('#ilCurated');
  const rowFemale = $('#ilRowFemale');
  const rowMale   = $('#ilRowMale');
  const wallEl    = $('#ilWall');
  const gridEl    = $('#ilGrid');
  const pagerEl   = $('#ilPager');
  const chipsEl   = $('#ilChips');

  // utils: gender guess
  const textOf=(p)=>[
    p.gender, p.modelGender, (p.categories||[]).join(' '),
    (p.tags||[]).join(' '), p.headline, p.tagline
  ].filter(Boolean).join(' ').toLowerCase();
  function isFemale(p){
    const g=(p.gender||p.modelGender||'').toLowerCase();
    if(g) return /^f|female|여|woman|girl/.test(g);
    return /(female|woman|girl|여성|여자)/.test(textOf(p));
  }
  function isMale(p){
    const g=(p.gender||p.modelGender||'').toLowerCase();
    if(g) return /^m|male|남/.test(g);
    return /(male|man|boy|남성|남자)/.test(textOf(p));
  }

  // hero
  function heroHTML(p){
    const id=p.id||p._id, thumb=pick1x1(p);
    const name = p.nickname || p.displayName || '인플루언서';
    const line = p.headline || p.tagline || '소개 문구가 없습니다.';
    const meta = [
      (p.region||''),
      (p.followers!=null ? `팔로워 ${Number(p.followers).toLocaleString('ko-KR')}` : ''),
      (p.verified ? 'Verified' : '')
    ].filter(Boolean).join(' · ');
    return `
      <article class="hero">
        <div class="photo"><img src="${thumb}" alt=""></div>
        <div class="head">
          ${p.isAd?'<span class="ad-badge">AD</span>':''}
          <div class="name">${name}</div>
          <div class="line">${line}</div>
          <div class="meta">${meta || '&nbsp;'}</div>
          <div class="actions">
            <button class="btn icon bm" data-id="${id}" aria-label="북마크"><i class="${bm.has(String(id))?'ri-bookmark-fill':'ri-bookmark-line'}"></i></button>
            <a class="btn" href="portfolio-detail.html?id=${encodeURIComponent(id)}"><i class="ri-user-line"></i> 상세보기</a>
            <a class="btn pri" href="outbox-proposals.html?to=${encodeURIComponent(id)}"><i class="ri-send-plane-line"></i> 제안하기</a>
          </div>
        </div>
      </article>`;
  }

  // curated renderers
  const hcell = (p)=> {
    const id=p.id||p._id, thumb=pick1x1(p);
    const name=p.nickname||p.displayName||'';
    return `<a class="hcell" href="portfolio-detail.html?id=${encodeURIComponent(id)}" aria-label="${name}">
      <img loading="lazy" src="${thumb}" alt="">
      <span class="cap">${name}</span>
    </a>`;
  };
  const wcell = (p)=>{
    const id=p.id||p._id, thumb=pick1x1(p);
    return `<a class="wcell" href="portfolio-detail.html?id=${encodeURIComponent(id)}"><img loading="lazy" src="${thumb}" alt=""></a>`;
  };

  function renderCurated(all){
    // 검색/필터/쿼리 활성화 시엔 감춤 (결과 집중)
    const hasActive = !!(state.query ||
      Object.values(state.filters).some(v=>v && String(v).length>0));
    if(hasActive){ curatedWrap.hidden = true; return; }
    curatedWrap.hidden = false;

    // 분류 + fallback
    const females = all.filter(isFemale).slice(0, 12);
    const males   = all.filter(isMale).slice(0, 12);
    const forWall = all.slice(0, 24); // 최신 24 썸네일

    rowFemale.innerHTML = (females.length ? females : all.slice(0,12)).map(hcell).join('');
    rowMale.innerHTML   = (males.length ? males : all.slice(0,12)).map(hcell).join('');
    wallEl.innerHTML    = forWall.map(wcell).join('');

    // 더보기(간단히 쿼리 세팅)
    const setAndGo=(q)=>{ UI.setQs({ ...state.filters, ...q, page:1 }); location.reload(); };
    $('#seeFemale').onclick = ()=> setAndGo({ query:'female', sort:'popular' });
    $('#seeMale').onclick   = ()=> setAndGo({ query:'male', sort:'popular' });
    $('#seeWall').onclick   = ()=> window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'});
  }

  // 카드(검색결과)
  function cardHTML(p){
    const id=p.id||p._id, bookmarked=bm.has(String(id));
    const thumb=pick1x1(p);
    const name=p.nickname||p.displayName||'인플루언서';
    const line=p.headline||p.tagline||'한줄 소개가 없습니다.';
    const cats=(p.categories||[]).slice(0,2); const left=(p.categories||[]).length-cats.length;
    const fee=(p.pay??p.fee), nego=(p.payNegotiable??p.feeNegotiable);
    const meta=[ (p.region||''), (nego?'협의':(fee!=null?(money(fee)+'원'):'출연료 미정')) ].filter(Boolean).join(' · ');

    return `
      <article class="card" data-id="${id}">
        <div class="head"><img class="thumb" src="${thumb}" alt=""></div>
        <div class="title">${name}</div>
        <div class="sub">${line}</div>
        <div class="chips">${cats.map(c=>`<span class="chip">${c}</span>`).join('')}${left>0?`<span class="chip">+${left}</span>`:''}</div>
        <div class="meta">${meta}</div>
        <div class="actions">
          <button class="btn small icon bm" aria-label="북마크"><i class="${bookmarked?'ri-bookmark-fill':'ri-bookmark-line'}"></i></button>
          <a class="btn small" href="portfolio-detail.html?id=${encodeURIComponent(id)}"><i class="ri-external-link-line"></i> 상세보기</a>
          <a class="btn small pri" href="outbox-proposals.html?to=${encodeURIComponent(id)}"><i class="ri-send-plane-line"></i> 제안하기</a>
        </div>
      </article>`;
  }

  function renderChips(){
    const f=state.filters; const chips=[];
    const chip=(k,v,fn)=>{ const id='chip_'+Math.random().toString(36).slice(2,8); chips.push(`<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x" aria-label="${k} 제거">✕</button></span>`); queueMicrotask(()=>{ const x=document.getElementById(id); x&&x.addEventListener('click',fn); }); };
    if(state.query) chip('검색', state.query, ()=>{ state.query=''; $('#ilQuery').value=''; load(); });
    if(f.category)  chip('카테고리', f.category, ()=>{ f.category=''; load(); });
    if(f.channel)   chip('채널', f.channel, ()=>{ f.channel=''; load(); });
    if(f.region)    chip('지역', f.region, ()=>{ f.region=''; load(); });
    if(f.followersMin) chip('팔로워', '≥ '+Number(f.followersMin).toLocaleString('ko-KR'), ()=>{ f.followersMin=''; load(); });
    if(f.payMin)    chip('최소', money(f.payMin), ()=>{ f.payMin=''; load(); });
    if(f.payMax)    chip('최대', money(f.payMax), ()=>{ f.payMax=''; load(); });
    if(f.negotiable)chip('협의','포함',()=>{ f.negotiable=''; load(); });
    if(f.verified)  chip('검증','Verified',()=>{ f.verified=''; load(); });

    chipsEl.hidden = chips.length===0;
    chipsEl.innerHTML = chips.join('');
  }

  function renderPager(total){
    const pages=Math.max(1, Math.ceil(total/state.limit));
    const cur=Math.min(Math.max(1,state.page), pages); state.page=cur;
    const btn=(t,p,dis=false,on=false)=>`<button class="pbtn ${on?'on':''}" ${dis?'disabled':''} data-page="${p}">${t}</button>`;
    let html=''; html+=btn('«',1,cur===1); html+=btn('‹',Math.max(1,cur-1),cur===1);
    const span=2,s=Math.max(1,cur-span),e=Math.min(pages,cur+span); for(let i=s;i<=e;i++) html+=btn(i,i,false,i===cur);
    html+=btn('›',Math.min(pages,cur+1),cur===pages); html+=btn('»',pages,cur===pages);
    pagerEl.innerHTML=html;
    pagerEl.onclick=(e)=>{ const b=e.target.closest('.pbtn'); if(!b) return; const p=Number(b.dataset.page); if(!p||p===state.page) return; state.page=p; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page }); load(); window.scrollTo({top:0,behavior:'smooth'}); };
  }

  // actions
  function bindToolbar(){
    $('#ilSort').value=state.sort;
    $('#ilSort').onchange=()=>{ state.sort=$('#ilSort').value; state.page=1; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page }); load(); };

    const q=$('#ilQuery'), go=$('#ilSearchGo');
    q.value=state.query||''; q.addEventListener('keydown',(e)=>{ if(e.key==='Enter') doSearch(); }); go.addEventListener('click',doSearch);
    function doSearch(){ state.query=q.value.trim(); state.page=1; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page }); load(); }
  }

  function bindFilters(){
    $('#ilBtnFilter').onclick = ()=> UI.openDrawer('ilDrawer');
    $('#ilFilterClose').onclick= ()=> UI.closeDrawer('ilDrawer');

    $('#ilFilterReset').onclick=()=>{
      state.filters={ category:'',channel:'',region:'',followersMin:'',payMin:'',payMax:'',negotiable:'',verified:'' };
      $('#fCat').value=''; $('#fChannel').value=''; $('#fRegion').value=''; $('#fFollowersMin').value=''; $('#fPayMin').value=''; $('#fPayMax').value=''; $('#fNegotiable').checked=false; $('#fVerified').checked=false;
      renderChips();
    };

    $('#ilFilterApply').onclick=()=>{
      state.filters.category=$('#fCat').value.trim();
      state.filters.channel=$('#fChannel').value.trim();
      state.filters.region=$('#fRegion').value.trim();
      state.filters.followersMin=$('#fFollowersMin').value.trim();
      state.filters.payMin=$('#fPayMin').value.trim();
      state.filters.payMax=$('#fPayMax').value.trim();
      state.filters.negotiable=$('#fNegotiable').checked?1:'';
      state.filters.verified=$('#fVerified').checked?1:'';
      state.page=1; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page });
      UI.closeDrawer('ilDrawer'); load();
    };
  }

  function bindBookmarks(){
    heroEl.addEventListener('click',(e)=>{
      const b=e.target.closest('.bm'); if(!b) return;
      const id=b.getAttribute('data-id'); if(!id) return;
      if(bm.has(id)) bm.delete(id); else bm.add(id); saveBM(bm);
      const i=b.querySelector('i'); if(i) i.className=bm.has(id)?'ri-bookmark-fill':'ri-bookmark-line';
      UI.toast(bm.has(id)?'북마크에 저장':'북마크 해제');
    }, {passive:true});

    gridEl.addEventListener('click',(e)=>{
      const card=e.target.closest('.card'); if(!card) return;
      const id=card.getAttribute('data-id');
      if(e.target.closest('.bm')){
        const key=String(id); if(bm.has(key)) bm.delete(key); else bm.add(key); saveBM(bm);
        const i=card.querySelector('.bm i'); if(i) i.className=bm.has(key)?'ri-bookmark-fill':'ri-bookmark-line';
        UI.toast(bm.has(key)?'북마크에 저장':'북마크 해제'); return;
      }
    }, {passive:true});
  }

  // load
  async function load(){
    // 스켈레톤
    heroEl.hidden=false; heroEl.innerHTML=`<article class="hero skeleton"></article>`;
    curatedWrap.hidden=true; rowFemale.innerHTML=''; rowMale.innerHTML=''; wallEl.innerHTML='';
    gridEl.innerHTML=`<div class="card skeleton"></div><div class="card skeleton"></div><div class="card skeleton"></div>`;
    renderChips();

    try{
      const { items, total } = await fetchPortfolios();
      $('#ilTotal').textContent = `총 ${total}건`;

      // 히어로(AD 한 명)
      if(items.length){
        const i=Math.floor(Math.random()*items.length);
        const hero={ ...items[i], isAd:true }; heroEl.innerHTML=heroHTML(hero); heroEl.hidden=false;
      }else heroEl.hidden=true;

      // 커스텀 섹션(검색/필터 없을 때 노출)
      renderCurated(items);

      // 결과 그리드(카드형): 현재 페이지 아이템
      gridEl.innerHTML = items.length
        ? items.map(cardHTML).join('')
        : `<div class="card"><div class="title">표시할 포트폴리오가 없습니다</div><div class="sub">검색어나 필터를 조정해보세요.</div></div>`;

      renderPager(total);
    }catch(e){
      console.warn('[influencer] fetch error:', e);
      $('#ilTotal').textContent='총 0건';
      heroEl.hidden=true; curatedWrap.hidden=true;
      gridEl.innerHTML = `<div class="card"><div class="title">데이터를 불러오지 못했습니다</div><div class="sub">잠시 후 다시 시도해주세요.</div></div>`;
      renderPager(1);
    }
  }

  // init
  bindToolbar();
  bindFilters();
  bindBookmarks();
  load();
})();