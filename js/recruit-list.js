/* recruit-list.js — v1.3.1 (search icon inside + bookmark icon-only) */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const RECRUIT_BASE = (EP.recruitBase || '/recruit-test').replace(/\/?$/, '');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const HJSON=(json=true)=>{const h={Accept:'application/json'}; if(json)h['Content-Type']='application/json'; if(TOKEN)h['Authorization']=`Bearer ${TOKEN}`; return h;};
  async function getJSON(url){const r=await fetch(url,{headers:HJSON(false)}); let j=null; try{j=await r.json();}catch{} if(!r.ok||(j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{};}
  const parseItems=j=>Array.isArray(j)?j:(j.items||(j.data&&(j.data.items||j.data.docs))||j.docs||[]);
  const readTotal=j=>j.total||(j.data&&(j.data.total||j.data.count))||parseItems(j).length;
  const money=n=>n==null?'':Number(n).toLocaleString('ko-KR');
  const pad=n=>String(n).padStart(2,'0');
  const fmt=iso=>{if(!iso)return'미정'; const d=new Date(iso); if(isNaN(d))return String(iso).slice(0,10); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const pickThumb=o=>o?.mainThumbnailUrl||o?.thumbnailUrl||(Array.isArray(o?.subThumbnails)&&o.subThumbnails[0])||o?.coverImageUrl||(CFG.placeholderThumb||'default.jpg');

  // state
  const Q=new URLSearchParams(location.search);
  const state={ page:Number(Q.get('page')||1), limit:10, sort:Q.get('sort')||'recent', query:Q.get('query')||'', filters:{
    region:Q.get('region')||'', district:Q.get('district')||'', payMin:Q.get('payMin')||'', payMax:Q.get('payMax')||'', negotiable:Q.get('negotiable')||'', closeIn:Q.get('closeIn')||''}};

  // bookmarks
  const BM_KEY='livee_bookmarks';
  const loadBM=()=>{try{return new Set(JSON.parse(localStorage.getItem(BM_KEY)||'[]'));}catch{return new Set();}};
  const saveBM=(set)=>localStorage.setItem(BM_KEY,JSON.stringify([...set]));
  let bm=loadBM();

  function buildQuery(){const p=new URLSearchParams(); p.set('limit',state.limit); p.set('skip',(state.page-1)*state.limit); p.set('sort',state.sort); p.set('status','published'); if(state.query)p.set('query',state.query);
    const f=state.filters; if(f.region)p.set('region',f.region); if(f.district)p.set('district',f.district); if(f.payMin)p.set('payMin',f.payMin); if(f.payMax)p.set('payMax',f.payMax); if(f.negotiable)p.set('negotiable',1); if(f.closeIn)p.set('closeIn',f.closeIn); return p.toString(); }

  async function fetchRecruits(){ const j=await getJSON(`${API_BASE}${RECRUIT_BASE}?${buildQuery()}`); return {items:parseItems(j), total:readTotal(j)}; }

  const AD_MIN=2;
  function pickTopAd(items){ if(!items||items.length<AD_MIN) return null; const idx=Math.floor(Math.random()*items.length); return { ad:{...items[idx],isAd:true}, rest:items.filter((_,i)=>i!==idx)}; }

  const listEl=$('#rlList'), topAdEl=$('#rlTopAd'), pagerEl=$('#rlPager'), chipsEl=$('#rlChips');

  const feeText=(v,nego)=> nego?'협의':(v!=null?(money(v)+'원'):'출연료 미정');
  const statusBadge=(r)=>{const now=Date.now(); const d=r.closeAt?new Date(r.closeAt).getTime():null; return (d&&d<now)?`<span class="badge">마감</span>`:`<span class="badge ok"><i class="ri-checkbox-circle-line"></i> 모집중</span>`;}

  // --- 북마크: 아이콘만 ---
  function cardHTML(r){
    const thumb=pickThumb(r);
    const fee=feeText(r.pay??r.fee, r.payNegotiable??r.feeNegotiable);
    const id=r.id||r._id;
    const bookmarked=bm.has(String(id));
    const title=r.title||'제목 없음';
    const sum=r.summary||r.descriptionText||r.description||'요약 정보가 없습니다.';
    const brand=r.brandName||'브랜드';
    return `
      <article class="card" data-id="${id}">
        <div class="card-head"><img class="thumb" src="${thumb}" alt=""></div>
        <div class="badges">${statusBadge(r)} <span class="badge">${brand}</span></div>
        <div class="title">${title}</div>
        <div class="summary">${sum}</div>
        <div class="meta">마감 ${fmt(r.closeAt)} · ${fee}</div>
        <div class="actions">
          <button class="btn small icon-only bm" aria-label="북마크"><i class="${bookmarked?'ri-bookmark-fill':'ri-bookmark-line'}"></i></button>
          <button class="btn small icon to" aria-label="상세보기"><i class="ri-external-link-line"></i> 상세보기</button>
          <button class="btn small pri apply" aria-label="지원하기"><i class="ri-send-plane-line"></i> 지원하기</button>
        </div>
      </article>`;
  }

  function adHTML(ad){
    const thumb=pickThumb(ad); const fee=feeText(ad.pay??ad.fee, ad.payNegotiable??ad.feeNegotiable);
    return `<article class="adcard"><span class="ad-badge">AD</span><img class="ad-thumb" src="${thumb}" alt="">
      <div class="ad-copy"><div class="ad-title">${ad.title||'스폰서 공고'}</div><div class="ad-meta">${ad.brandName||'브랜드'} · ${fee} · 마감 ${fmt(ad.closeAt)}</div></div>
      <div class="ad-cta"><a class="btn small pri" href="recruit-detail.html?id=${encodeURIComponent(ad.id||ad._id)}">바로 보기</a></div></article>`;
  }

  function renderChips(){
    const f=state.filters, chips=[];
    const moneyKR=(v)=>Number(v).toLocaleString('ko-KR');
    const chip=(k,v,onX)=>{const id='chip_'+Math.random().toString(36).slice(2,8); queueMicrotask(()=>{document.getElementById(id)?.addEventListener('click',onX);}); return `<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x" aria-label="${k} 제거">✕</button></span>`;};
    if(state.query) chips.push(chip('검색',state.query,()=>{state.query=''; $('#rlQuery').value=''; load();}));
    if(f.region) chips.push(chip('지역',f.region,()=>{f.region=''; load();}));
    if(f.district) chips.push(chip('구/군',f.district,()=>{f.district=''; load();}));
    if(f.payMin) chips.push(chip('최소',moneyKR(f.payMin),()=>{f.payMin=''; load();}));
    if(f.payMax) chips.push(chip('최대',moneyKR(f.payMax),()=>{f.payMax=''; load();}));
    if(f.negotiable) chips.push(chip('협의','포함',()=>{f.negotiable=''; load();}));
    if(f.closeIn) chips.push(chip('마감',f.closeIn+'일 이내',()=>{f.closeIn=''; load();}));
    chipsEl.hidden=!chips.length; chipsEl.innerHTML=chips.join('');
  }

  function renderPager(total){
    const pages=Math.max(1,Math.ceil(total/state.limit)); const cur=state.page;
    const btn=(label,page,dis=false,on=false)=>`<button class="pbtn ${on?'on':''}" ${dis?'disabled':''} data-page="${page}">${label}</button>`;
    let html=''; html+=btn('«',1,cur===1); html+=btn('‹',Math.max(1,cur-1),cur===1);
    const span=2, s=Math.max(1,cur-span), e=Math.min(pages,cur+span);
    for(let i=s;i<=e;i++) html+=btn(i,i,false,i===cur);
    html+=btn('›',Math.min(pages,cur+1),cur===pages); html+=btn('»',pages,cur===pages);
    $('#rlPager').innerHTML=html;
    $('#rlPager').onclick=(e)=>{const b=e.target.closest('.pbtn'); if(!b) return; const p=Number(b.dataset.page); if(!p||p===state.page) return;
      state.page=p; UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page}); load(); window.scrollTo({top:0,behavior:'smooth'});};
  }

  // actions
  function bindCardActions(){
    listEl.addEventListener('click',(e)=>{
      const card=e.target.closest('.card'); if(!card) return; const id=card.getAttribute('data-id');
      if(e.target.closest('.to')){ location.href='recruit-detail.html?id='+encodeURIComponent(id); return; }
      if(e.target.closest('.bm')){ const key=String(id); if(bm.has(key)) bm.delete(key); else bm.add(key); saveBM(bm);
        const icon=card.querySelector('.bm i'); if(icon) icon.className=bm.has(key)?'ri-bookmark-fill':'ri-bookmark-line';
        UI.toast(bm.has(key)?'북마크에 저장':'북마크 해제'); return; }
      if(e.target.closest('.apply')){ if(window.openApplyModal){ window.openApplyModal(id); }
        else{ if(!TOKEN){ location.href='login.html?returnTo='+encodeURIComponent(location.pathname+location.search); return; } UI.toast('지원 모달 준비중'); } return; }
    }, {passive:true});
  }

  // filter drawer (동일)
  function bindFilters(){
    $('#rlBtnFilter').onclick=()=>UI.openDrawer('rlDrawer');
    $('#rlFilterClose').onclick=()=>UI.closeDrawer('rlDrawer');
    $('#rlFilterReset').onclick=()=>{ state.filters={region:'',district:'',payMin:'',payMax:'',negotiable:'',closeIn:''};
      $('#fRegion').value=''; $('#fDistrict').value=''; $('#fPayMin').value=''; $('#fPayMax').value=''; $('#fNegotiable').checked=false; $('#fCloseIn').value=''; renderChips(); };
    $('#rlFilterApply').onclick=()=>{ state.filters.region=$('#fRegion').value.trim(); state.filters.district=$('#fDistrict').value.trim();
      state.filters.payMin=$('#fPayMin').value.trim(); state.filters.payMax=$('#fPayMax').value.trim(); state.filters.negotiable=$('#fNegotiable').checked?1:'';
      state.filters.closeIn=$('#fCloseIn').value; state.page=1; UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page}); UI.closeDrawer('rlDrawer'); load(); };
  }

  // toolbar (검색 아이콘/엔터)
  function bindToolbar(){
    $('#rlSort').value=state.sort;
    $('#rlSort').onchange=()=>{ state.sort=$('#rlSort').value; state.page=1; UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page}); load(); };

    $('#rlQuery').value=state.query;
    const run=()=>{ state.query=$('#rlQuery').value.trim(); state.page=1; UI.setQs({...state.filters, query:state.query, sort:state.sort, page:state.page}); load(); };
    $('#rlSearchGo')?.addEventListener('click', run);
    $('#rlQuery').addEventListener('keydown', (e)=>{ if(e.key==='Enter') run(); });
  }

  async function load(){
    listEl.innerHTML=`<div class="card skeleton"></div><div class="card skeleton"></div><div class="card skeleton"></div>`;
    renderChips();
    try{
      const {items,total}=await fetchRecruits();
      $('#rlTotal').textContent=`총 ${total}건`;
      topAdEl.hidden=true;
      let list=items; const picked=pickTopAd(items);
      if(picked){ topAdEl.innerHTML=adHTML(picked.ad); topAdEl.hidden=false; list=picked.rest; }
      listEl.innerHTML = list.map(cardHTML).join('') || `<div class="card"><div class="title">표시할 공고가 없습니다</div><div class="summary">검색어나 필터를 조정해보세요.</div></div>`;
      renderPager(total);
    }catch(e){
      console.warn('[recruit-list] load error:', e);
      listEl.innerHTML=`<div class="card"><div class="title">데이터를 불러오지 못했습니다</div><div class="summary">잠시 후 다시 시도해주세요.</div></div>`;
      renderPager(1);
    }
  }

  const listEl=$('#rlList');
  const topAdEl=$('#rlTopAd');

  bindToolbar();
  bindFilters();
  bindCardActions();
  load();
})();