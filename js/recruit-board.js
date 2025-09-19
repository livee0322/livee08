/* public/js/recruit-board.js — v3.1.0 (board layout)
   기존 recruit-list.js 기반. DOM id/class만 보드형에 맞춰 수정. */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '').replace(/\/$/, '');
  const EP = (CFG.endpoints || {});
  const RECRUIT_BASE = (EP.recruitBase || '/recruit-test').replace(/^\/*/, '/');

  const HJSON = { Accept: 'application/json' };
  const joinUrl = (b,p)=> b + (p.startsWith('/')? p : '/'+p);
  const qs = (o)=> { const sp=new URLSearchParams(); Object.entries(o).forEach(([k,v])=>{ if(v!==''&&v!=null) sp.set(k,v); }); return sp.toString(); };
  async function getJSON(url){
    const r = await fetch(url, { headers:HJSON });
    let j=null; try{ j=await r.json(); }catch{}
    if(!r.ok || (j && j.ok===false)) throw new Error((j && (j.message||j.error)) || ('HTTP_'+r.status));
    return j||{};
  }
  const parseItems = (j)=>{
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
  };
  const readTotal = (j,l=0)=>{
    if(typeof j.total==='number') return j.total;
    if(j.data && typeof j.data.total==='number') return j.data.total;
    if(j.data && typeof j.data.count==='number') return j.data.count;
    if(typeof j.count==='number') return j.count;
    return l;
  };

  const money = (n)=> (n==null? '' : Number(n).toLocaleString('ko-KR'));
  const pad2  = (n)=> String(n).padStart(2,'0');
  const fmt   = (iso)=>{
    if(!iso) return '미정';
    const d=new Date(iso); if(isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const pickThumb = (o)=>
    o?.mainThumbnailUrl || o?.thumbnailUrl ||
    (Array.isArray(o?.subThumbnails) && o.subThumbnails[0]) ||
    o?.coverImageUrl || (CFG.placeholderThumb || 'default.jpg');

  // ---------- state ----------
  const urlq = new URLSearchParams(location.search);
  const state = {
    page: Number(urlq.get('page') || 1),
    limit: 10,
    sort: urlq.get('sort') || 'recent',
    query: urlq.get('query') || '',
    filters: {
      region: urlq.get('region') || '',
      district: urlq.get('district') || '',
      payMin: urlq.get('payMin') || '',
      payMax: urlq.get('payMax') || '',
      negotiable: urlq.get('negotiable') || '',
      closeIn: urlq.get('closeIn') || ''
    }
  };

  // ---------- query ----------
  function buildParams(){
    const f=state.filters;
    const p={ limit:state.limit, skip:(state.page-1)*state.limit, page:state.page, sort:state.sort, status:'published' };
    if(state.query) p.query=state.query;
    if(f.region) p.region=f.region;
    if(f.district) p.district=f.district;
    if(f.payMin) p.payMin=f.payMin;
    if(f.payMax) p.payMax=f.payMax;
    if(f.negotiable) p.negotiable=1;
    if(f.closeIn) p.closeIn=f.closeIn;
    return p;
  }
  async function fetchRecruits(){
    const url = joinUrl(API_BASE, RECRUIT_BASE) + '?' + qs(buildParams());
    const j = await getJSON(url);
    return { items:parseItems(j), total:readTotal(j) };
  }

  // ---------- elements ----------
  const listEl  = $('#rbList');
  const topAdEl = $('#rbTopAd');
  const pagerEl = $('#rbPager');
  const chipsEl = $('#rbChips');

  // ---------- templates ----------
  const feeText = (v, nego)=> nego ? '협의' : (v!=null ? (money(v)+'원') : '미정');

  function statusBadge(r){
    const now = Date.now();
    const d = r.closeAt ? new Date(r.closeAt).getTime() : null;
    if(d && d < now) return `<span class="badge closed">마감</span>`;
    return `<span class="badge ok">모집중</span>`;
  }

  function rowHTML(r){
    const id = r.id || r._id;
    const brand = r.brandName || (r.brand && r.brand.name) || '브랜드';
    const title = r.title || '제목 없음';
    const sum   = r.summary || r.descriptionText || r.description || '';
    const fee   = feeText(r.pay ?? r.fee, r.payNegotiable ?? r.feeNegotiable);
    const region = r.region || r.location || '-';
    const period = r.closeAt ? `~ ${fmt(r.closeAt)}` : '기간 미정';

    return `
    <div class="rb-row" data-id="${id}">
      <div class="c c-type"><span class="badge">쇼핑라이브</span></div>
      <div class="c c-title">
        <div class="rb-title">${title}</div>
        ${sum ? `<small class="sum">${sum}</small>`:''}
      </div>
      <div class="c c-brand"><div class="rb-meta">${brand}</div></div>
      <div class="c c-loc"><div class="rb-meta">${region}</div><div class="rb-meta">${period}</div></div>
      <div class="c c-fee"><span class="money ${fee==='미정'?'mut':''}">${fee}</span></div>
      <div class="c c-status">${statusBadge(r)}</div>
      <div class="c c-act">
        <button class="btn icon to" title="상세"><i class="ri-external-link-line"></i></button>
        <button class="btn pri apply"><i class="ri-send-plane-line"></i> 지원</button>
      </div>
    </div>`;
  }

  function adRowHTML(ad){
    const brand = ad.brandName || '브랜드';
    return `
    <div class="rb-row ad">
      <div class="c c-type"><span class="badge warn">스폰서</span></div>
      <div class="c c-title">
        <div class="rb-title">${ad.title || '스폰서 공고'}</div>
        <small class="sum">${brand} · 마감 ${fmt(ad.closeAt)}</small>
      </div>
      <div class="c c-brand"><div class="rb-meta">${brand}</div></div>
      <div class="c c-loc"><div class="rb-meta">—</div><div class="rb-meta">—</div></div>
      <div class="c c-fee"><span class="money">${feeText(ad.pay ?? ad.fee, ad.payNegotiable ?? ad.feeNegotiable)}</span></div>
      <div class="c c-status"><span class="badge ok">모집중</span></div>
      <div class="c c-act">
        <a class="btn pri" href="recruit-detail.html?id=${encodeURIComponent(ad.id||ad._id)}">바로 지원</a>
      </div>
    </div>`;
  }

  // ---------- chips / pager ----------
  function renderChips(){
    const f=state.filters; const chips=[];
    const add=(k,v,fn)=>{
      const id='chip_'+Math.random().toString(36).slice(2,8);
      chips.push(`<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x">✕</button></span>`);
      queueMicrotask(()=>{ const x=document.getElementById(id); x && x.addEventListener('click', fn); });
    };
    if(state.query) add('검색', state.query, ()=>{ state.query=''; $('#rbQuery').value=''; load(); });
    if(f.region) add('지역', f.region, ()=>{ f.region=''; load(); });
    if(f.district) add('구/군', f.district, ()=>{ f.district=''; load(); });
    if(f.payMin) add('최소', money(f.payMin), ()=>{ f.payMin=''; load(); });
    if(f.payMax) add('최대', money(f.payMax), ()=>{ f.payMax=''; load(); });
    if(f.negotiable) add('협의','포함', ()=>{ f.negotiable=''; load(); });
    if(f.closeIn) add('마감', f.closeIn+'일 이내', ()=>{ f.closeIn=''; load(); });

    chipsEl.hidden = chips.length===0;
    chipsEl.innerHTML = chips.join('');
  }

  function renderPager(total){
    const pages = Math.max(1, Math.ceil(total/state.limit));
    const cur = Math.min(Math.max(1, state.page), pages); state.page=cur;
    const btn=(label,page,dis=false,on=false)=>`<button class="pbtn ${on?'on':''}" ${dis?'disabled':''} data-page="${page}">${label}</button>`;
    let html=''; html+=btn('«',1,cur===1); html+=btn('‹',Math.max(1,cur-1),cur===1);
    const span=2, s=Math.max(1,cur-span), e=Math.min(pages,cur+span);
    for(let i=s;i<=e;i++) html+=btn(i,i,false,i===cur);
    html+=btn('›',Math.min(pages,cur+1),cur===pages)+btn('»',pages,cur===pages);
    pagerEl.innerHTML=html;
    pagerEl.onclick=(e)=>{ const b=e.target.closest('.pbtn'); if(!b) return; const p=Number(b.dataset.page); if(!p || p===state.page) return; state.page=p; UI.setQs({...state.filters,query:state.query,sort:state.sort,page:state.page}); load(); window.scrollTo({top:0,behavior:'smooth'}); };
  }

  // ---------- actions ----------
  function bindRowActions(){
    listEl.addEventListener('click',(e)=>{
      const row=e.target.closest('.rb-row'); if(!row) return;
      const id=row.getAttribute('data-id');
      if(e.target.closest('.to')){ location.href = 'recruit-detail.html?id=' + encodeURIComponent(id); return; }
      if(e.target.closest('.apply')){ if(window.openApplyModal) window.openApplyModal(id); else UI.toast('지원 모달 준비중'); return; }
    },{passive:true});
  }

  function bindFilters(){
    $('#rbBtnFilter').onclick = ()=> UI.openDrawer('rbDrawer');
    $('#rbFilterClose').onclick = ()=> UI.closeDrawer('rbDrawer');

    $('#rbFilterReset').onclick = ()=>{
      state.filters={region:'',district:'',payMin:'',payMax:'',negotiable:'',closeIn:''};
      $('#fRegion').value=''; $('#fDistrict').value='';
      $('#fPayMin').value=''; $('#fPayMax').value='';
      $('#fNegotiable').checked=false; $('#fCloseIn').value='';
      renderChips();
    };

    $('#rbFilterApply').onclick = ()=>{
      state.filters.region = $('#fRegion').value.trim();
      state.filters.district = $('#fDistrict').value.trim();
      state.filters.payMin = $('#fPayMin').value.trim();
      state.filters.payMax = $('#fPayMax').value.trim();
      state.filters.negotiable = $('#fNegotiable').checked ? 1 : '';
      state.filters.closeIn = $('#fCloseIn').value;
      state.page=1;
      UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page});
      UI.closeDrawer('rbDrawer'); load();
    };
  }

  function bindToolbar(){
    $('#rbSort').value = state.sort;
    $('#rbSort').onchange = ()=>{
      state.sort = $('#rbSort').value; state.page=1;
      UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page});
      load();
    };
    const q=$('#rbQuery'), go=$('#rbSearchGo');
    q.value = state.query || '';
    q.addEventListener('keydown',(e)=>{ if(e.key==='Enter') doSearch(); });
    go.addEventListener('click', doSearch);
    function doSearch(){ state.query=q.value.trim(); state.page=1; UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page}); load(); }
  }

  // ---------- load ----------
  async function load(){
    // skeleton 3줄
    listEl.innerHTML = `<div class="skel"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
                        <div class="skel"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
                        <div class="skel"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>`;
    renderChips();

    try{
      const { items, total } = await fetchRecruits();
      $('#rbTotal').textContent = `총 ${total}건`;

      // AD 1개
      topAdEl.hidden = true;
      let list = items;
      if (items && items.length){
        const i = Math.floor(Math.random()*items.length);
        topAdEl.innerHTML = `<div class="adbox"><div class="tit">${items[i].title || '스폰서 공고'}</div><div class="meta">${items[i].brandName || '브랜드'} · 마감 ${fmt(items[i].closeAt)}</div></div>`;
        topAdEl.hidden = false;
        list = items.filter((_,idx)=> idx!==i);
      }

      listEl.innerHTML = list.length ? list.map(rowHTML).join('') :
        `<div class="rb-row"><div class="c" style="grid-column:1/-1;padding:16px">표시할 공고가 없습니다. 검색어나 필터를 조정해보세요.</div></div>`;

      renderPager(total);
    }catch(e){
      console.warn('[recruit-board] fetch error:', e);
      $('#rbTotal').textContent = '총 0건';
      topAdEl.hidden = true;
      listEl.innerHTML = `<div class="rb-row"><div class="c" style="grid-column:1/-1;padding:16px">데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div></div>`;
      renderPager(1);
    }
  }

  // ---------- init ----------
  bindToolbar();
  bindFilters();
  bindRowActions();
  load();
})();