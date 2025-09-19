/* recruit-board.js — v3.2.0
 * - board형 리스트(썸네일 좌/콘텐츠 우)
 * - 액션 버튼 하단 정렬
 * - 텍스트 2줄 클램프
 * - 필터 드로어 오버플로우 없음
 */
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

  const joinUrl = (b, p) => b + (p.startsWith('/') ? p : '/' + p);
  const qs = (obj) => {
    const sp = new URLSearchParams();
    Object.entries(obj).forEach(([k,v]) => { if(v!=='' && v!=null) sp.set(k, v); });
    return sp.toString();
  };
  async function getJSON(url){
    const r = await fetch(url, { headers:HJSON });
    let j=null; try{ j=await r.json(); }catch{}
    if(!r.ok || (j && j.ok===false)) throw new Error((j && (j.message||j.error))||('HTTP_'+r.status));
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
  const readTotal = (j, fallback=0)=>{
    if(typeof j.total==='number') return j.total;
    if(j.data && typeof j.data.total==='number') return j.data.total;
    if(j.data && typeof j.data.count==='number') return j.data.count;
    if(typeof j.count==='number') return j.count;
    return fallback;
  };

  const money = (n)=> n==null ? '' : Number(n).toLocaleString('ko-KR');
  const pad2  = (n)=> String(n).padStart(2,'0');
  const dateYMD = (v)=>{
    if(!v) return '미정';
    const d=new Date(v); if(isNaN(d)) return String(v).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const pickThumb = (o)=>
    o?.mainThumbnailUrl ||
    o?.thumbnailUrl ||
    (Array.isArray(o?.subThumbnails) && o.subThumbnails[0]) ||
    o?.coverImageUrl ||
    (CFG.placeholderThumb || 'default.jpg');

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
  const buildParams = ()=>{
    const f=state.filters;
    const p = {
      limit: state.limit,
      skip: (state.page-1)*state.limit,
      page: state.page,
      sort: state.sort,
      status: 'published'
    };
    if(state.query) p.query = state.query;
    if(f.region) p.region = f.region;
    if(f.district) p.district = f.district;
    if(f.payMin) p.payMin = f.payMin;
    if(f.payMax) p.payMax = f.payMax;
    if(f.negotiable) p.negotiable = 1;
    if(f.closeIn) p.closeIn = f.closeIn;
    return p;
  };

  // ---------- fetch ----------
  async function fetchList(){
    const url = joinUrl(API_BASE, RECRUIT_BASE) + '?' + qs(buildParams());
    const j = await getJSON(url);
    const items = parseItems(j);
    const total = readTotal(j, items.length);
    return { items, total };
  }

  // ---------- AD pick ----------
  function pickTopAd(items){
    if(!items || !items.length) return null;
    const idx = Math.floor(Math.random()*items.length);
    const ad  = { ...items[idx], isAd:true };
    const rest= items.filter((_,i)=>i!==idx);
    return { ad, rest };
  }

  // ---------- templates ----------
  const listEl  = $('#rbList');
  const topAdEl = $('#rbTopAd');
  const pagerEl = $('#rbPager');
  const chipsEl = $('#rbChips');

  const feeText = (v, nego)=> nego ? '협의' : (v!=null ? `${money(v)}원` : '출연료 미정');
  const statusBadge = (r)=>{
    const now=Date.now(), d=r.closeAt?new Date(r.closeAt).getTime():null;
    return d && d<now ? `<span class="badge">마감</span>` :
                        `<span class="badge ok">모집중</span>`;
  };

  function cardHTML(r){
    const id = r.id || r._id;
    const thumb = pickThumb(r);
    const brand = r.brandName || (r.brand && r.brand.name) || '브랜드';
    const title = r.title || '제목 없음';
    const sum   = r.summary || r.descriptionText || r.description || '';
    const fee   = feeText(r.pay ?? r.fee, r.payNegotiable ?? r.feeNegotiable);

    return `
      <article class="item" data-id="${id}">
        <a class="thumb" href="recruit-detail.html?id=${encodeURIComponent(id)}" aria-label="상세보기">
          <img src="${thumb}" alt="">
        </a>

        <div class="content">
          <div class="row-top">
            ${statusBadge(r)}
            <span class="brand">${brand}</span>
          </div>

          <a class="title" href="recruit-detail.html?id=${encodeURIComponent(id)}">${title}</a>
          ${sum ? `<div class="sum">${sum}</div>` : ``}

          <div class="meta">
            <span>마감 ${dateYMD(r.closeAt)}</span>
            <span>· ${fee}</span>
          </div>

          <div class="actions">
            <button class="btn small icon bm" aria-label="공고 저장"><i class="ri-bookmark-line"></i></button>
            <a class="btn small icon ghost to" href="recruit-detail.html?id=${encodeURIComponent(id)}" aria-label="상세보기"><i class="ri-external-link-line"></i></a>
            <a class="btn small pri apply" href="recruit-detail.html?id=${encodeURIComponent(id)}#apply" aria-label="지원하기"><i class="ri-send-plane-line"></i> 지원</a>
          </div>
        </div>
      </article>
    `;
  }

  function adHTML(ad){
    const thumb = pickThumb(ad);
    const fee = (ad.pay ?? ad.fee);
    const nego = (ad.payNegotiable ?? ad.feeNegotiable);
    return `
      <article class="item ad">
        <div class="thumb"><img src="${thumb}" alt=""></div>
        <div class="content">
          <div class="row-top">
            <span class="badge-ad">AD</span>
            <span class="brand">${ad.brandName || '브랜드'}</span>
          </div>
          <div class="title">${ad.title || '스폰서 공고'}</div>
          <div class="sum">${ad.summary || '스폰서 캠페인 안내'}</div>
          <div class="meta">
            <span>${nego ? '협의' : (fee!=null ? (Number(fee).toLocaleString('ko-KR')+'원') : '출연료 미정')}</span>
            <span>· 마감 ${dateYMD(ad.closeAt)}</span>
          </div>
          <div class="actions">
            <a class="act-cta" href="recruit-detail.html?id=${encodeURIComponent(ad.id||ad._id)}">바로<br>지원</a>
          </div>
        </div>
      </article>
    `;
  }

  // ---------- chips ----------
  function renderChips(){
    const f=state.filters, chips=[];
    const add=(k,v,fn)=>{
      const id='chip_'+Math.random().toString(36).slice(2,8);
      chips.push(`<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x" aria-label="${k} 제거">✕</button></span>`);
      queueMicrotask(()=>{ const x=document.getElementById(id); x && x.addEventListener('click', fn); });
    };
    if(state.query) add('검색', state.query, ()=>{ state.query=''; $('#rbQuery').value=''; load(); });
    if(f.region) add('지역', f.region, ()=>{ f.region=''; load(); });
    if(f.district) add('구/군', f.district, ()=>{ f.district=''; load(); });
    if(f.payMin) add('최소', money(f.payMin), ()=>{ f.payMin=''; load(); });
    if(f.payMax) add('최대', money(f.payMax), ()=>{ f.payMax=''; load(); });
    if(f.negotiable) add('협의', '포함', ()=>{ f.negotiable=''; load(); });
    if(f.closeIn) add('마감', f.closeIn+'일', ()=>{ f.closeIn=''; load(); });

    chipsEl.hidden = chips.length===0;
    chipsEl.innerHTML = chips.join('');
  }

  // ---------- pager ----------
  function renderPager(total){
    const pages=Math.max(1, Math.ceil(total/state.limit));
    const cur=Math.min(Math.max(1,state.page), pages);
    state.page=cur;
    const btn=(t,p,dis=false,on=false)=>`<button class="pbtn ${on?'on':''}" ${dis?'disabled':''} data-page="${p}">${t}</button>`;
    let html='';
    html+=btn('«',1,cur===1); html+=btn('‹',Math.max(1,cur-1),cur===1);
    const span=2, s=Math.max(1,cur-span), e=Math.min(pages,cur+span);
    for(let i=s;i<=e;i++) html+=btn(i,i,false,i===cur);
    html+=btn('›',Math.min(pages,cur+1),cur===pages); html+=btn('»',pages,cur===pages);
    pagerEl.innerHTML=html;
    pagerEl.onclick=(e)=>{
      const b=e.target.closest('.pbtn'); if(!b) return;
      const p=Number(b.dataset.page); if(!p || p===state.page) return;
      state.page=p; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page }); load();
      window.scrollTo({ top:0, behavior:'smooth' });
    };
  }

  // ---------- binds ----------
  function bindToolbar(){
    $('#rbSort').value=state.sort;
    $('#rbSort').onchange=()=>{ state.sort=$('#rbSort').value; state.page=1; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page }); load(); };

    const q=$('#rbQuery'), go=$('#rbSearchGo');
    q.value=state.query||'';
    const doSearch=()=>{ state.query=q.value.trim(); state.page=1; UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page }); load(); };
    q.addEventListener('keydown',(e)=>{ if(e.key==='Enter') doSearch(); });
    go.addEventListener('click', doSearch);
  }

  function bindFilters(){
    $('#rbBtnFilter').onclick=()=> UI.openDrawer('rbDrawer');
    $('#rbFilterClose').onclick=()=> UI.closeDrawer('rbDrawer');

    $('#rbFilterReset').onclick=()=>{
      state.filters={ region:'',district:'',payMin:'',payMax:'',negotiable:'',closeIn:'' };
      $('#fRegion').value=''; $('#fDistrict').value=''; $('#fPayMin').value=''; $('#fPayMax').value='';
      $('#fNegotiable').checked=false; $('#fCloseIn').value='';
      renderChips();
    };

    $('#rbFilterApply').onclick=()=>{
      state.filters.region   = $('#fRegion').value.trim();
      state.filters.district = $('#fDistrict').value.trim();
      state.filters.payMin   = $('#fPayMin').value.trim();
      state.filters.payMax   = $('#fPayMax').value.trim();
      state.filters.negotiable = $('#fNegotiable').checked ? 1 : '';
      state.filters.closeIn  = $('#fCloseIn').value;
      state.page=1;
      UI.setQs({ ...state.filters, query:state.query, sort:state.sort, page:state.page });
      UI.closeDrawer('rbDrawer');
      load();
    };
  }

  // ---------- loader ----------
  async function load(){
    listEl.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
    renderChips();

    try{
      const { items, total } = await fetchList();
      $('#rbTotal').textContent = `총 ${total}건`;

      topAdEl.hidden=true;
      let list=items;
      const picked=pickTopAd(items);
      if(picked){ topAdEl.innerHTML=adHTML(picked.ad); topAdEl.hidden=false; list=picked.rest; }

      listEl.innerHTML = list.length ? list.map(cardHTML).join('') :
        `<div class="item"><div class="content"><div class="title">표시할 공고가 없습니다</div><div class="sum">검색어나 필터를 조정해보세요.</div></div></div>`;

      // 북마크 토글(로컬)
      listEl.addEventListener('click', (e)=>{
        const btn=e.target.closest('.bm'); if(!btn) return;
        const card=e.target.closest('.item'); if(!card) return;
        const icon=btn.querySelector('i');
        const filled = icon.classList.contains('ri-bookmark-fill');
        icon.className = filled ? 'ri-bookmark-line' : 'ri-bookmark-fill';
        UI.toast(filled ? '북마크 해제' : '북마크 저장');
      }, { once:true, passive:true });

      renderPager(total);
    }catch(e){
      console.warn('[recruit-board] error', e);
      $('#rbTotal').textContent='총 0건';
      topAdEl.hidden=true;
      listEl.innerHTML = `<div class="item"><div class="content"><div class="title">데이터를 불러오지 못했습니다</div><div class="sum">잠시 후 다시 시도해주세요.</div></div></div>`;
      renderPager(1);
    }
  }

  // ---------- init ----------
  bindToolbar();
  bindFilters();
  load();
})();