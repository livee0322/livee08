/* recruit-board.js — v1.0.0
 * - 파일명/셀렉터 recruit-board로 통일
 * - 보드(게시판)형 목록 + 작은 정사각 썸네일(좌)
 * - 고정 사이드 드로어(필터가 아래로 내려가지 않음)
 * - 다양한 백엔드 응답형 파싱 + 안전한 페이징
 */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '').replace(/\/$/, '');
  const EP = (CFG.endpoints || {});
  const RECRUIT_BASE = (EP.recruitBase || '/recruit-test').replace(/^\/*/, '/'); // '/recruit-test'
  const HJSON = { Accept: 'application/json' };

  const money = (n) => (n == null ? '' : Number(n).toLocaleString('ko-KR'));
  const pad2  = (n) => String(n).padStart(2, '0');
  const fmt   = (iso) => {
    if (!iso) return '미정';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };

  function joinUrl(base, path){ return base + (path.startsWith('/') ? path : '/' + path); }
  function qs(params){
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{ if(v!=='' && v!=null) sp.set(k, v); });
    return sp.toString();
  }
  async function getJSON(url){
    const r = await fetch(url, { headers: HJSON });
    let j = null; try{ j = await r.json(); }catch{}
    if(!r.ok || (j && j.ok===false)) throw new Error((j && (j.message||j.error)) || ('HTTP_'+r.status));
    return j || {};
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
  function readTotal(j, fallback=0){
    if(typeof j.total==='number') return j.total;
    if(j.data && typeof j.data.total==='number') return j.data.total;
    if(j.data && typeof j.data.count==='number') return j.data.count;
    if(typeof j.count==='number') return j.count;
    return fallback;
  }
  const pickThumb = (o) =>
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

  // ---------- elements ----------
  const listEl  = $('#rbList');
  const pagerEl = $('#rbPager');
  const chipsEl = $('#rbChips');
  const topAdEl = $('#rbTopAd');

  // ---------- query ----------
  function buildParams(){
    const f = state.filters;
    const p = {
      limit: state.limit,
      skip: (state.page - 1) * state.limit,
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
  }

  async function fetchRecruits(){
    const url = joinUrl(API_BASE, RECRUIT_BASE) + '?' + qs(buildParams());
    const j = await getJSON(url);
    const items = parseItems(j);
    const total = readTotal(j, items.length);
    return { items, total };
  }

  // ---------- templates ----------
  function statusBadge(r){
    const now = Date.now();
    const d = r.closeAt ? new Date(r.closeAt).getTime() : null;
    if(d && d < now) return `<span class="badge">마감</span>`;
    return `<span class="badge ok">모집중</span>`;
  }
  function rowHTML(r){
    const id = r.id || r._id;
    const thumb = pickThumb(r);
    const brand = r.brandName || (r.brand && r.brand.name) || '브랜드';
    const title = r.title || '제목 없음';
    const fee   = r.pay ?? r.fee;
    const nego  = (r.payNegotiable ?? r.feeNegotiable);

    return `
      <article class="rb-row" data-id="${id}">
        <img class="rb-thumb" src="${thumb}" alt="">
        <div class="rb-main">
          <div class="rb-title">${title}</div>
          <div class="rb-meta">
            ${statusBadge(r)}
            <span>${brand}</span>
            <span>마감 ${fmt(r.closeAt)}</span>
            <span>${nego ? '출연료 협의' : (fee!=null ? (money(fee)+'원') : '출연료 미정')}</span>
          </div>
        </div>
        <div class="rb-actions">
          <button class="btn small icon to" aria-label="상세보기"><i class="ri-external-link-line"></i></button>
          <button class="btn small pri apply"><i class="ri-send-plane-line"></i><span class="txt"> 지원</span></button>
        </div>
      </article>
    `;
  }
  function adHTML(ad){
    const fee = ad.pay ?? ad.fee;
    const nego = (ad.payNegotiable ?? ad.feeNegotiable);
    return `
      <div class="card-ad">
        <img class="ad-thumb" src="${pickThumb(ad)}" alt="">
        <div class="ad-main">
          <div><span class="ad-badge">AD</span> ${ad.title || '스폰서 공고'}</div>
          <div class="rb-meta" style="margin-top:2px">${ad.brandName || '브랜드'} · ${nego ? '협의' : (fee!=null ? (money(fee)+'원') : '출연료 미정')} · 마감 ${fmt(ad.closeAt)}</div>
        </div>
        <a class="btn small pri" href="recruit-detail.html?id=${encodeURIComponent(ad.id||ad._id)}">바로 지원</a>
      </div>
    `;
  }

  function renderChips(){
    const f = state.filters;
    const chips = [];
    const add = (k, v, fn) => {
      const id = 'chip_' + Math.random().toString(36).slice(2, 8);
      chips.push(`<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x" aria-label="${k} 제거">✕</button></span>`);
      queueMicrotask(() => { const x = document.getElementById(id); x && x.addEventListener('click', fn); });
    };
    if(state.query) add('검색', state.query, ()=>{ state.query=''; $('#rbQuery').value=''; load(); });
    if(f.region) add('지역', f.region, ()=>{ f.region=''; load(); });
    if(f.district) add('구/군', f.district, ()=>{ f.district=''; load(); });
    if(f.payMin) add('최소', money(f.payMin), ()=>{ f.payMin=''; load(); });
    if(f.payMax) add('최대', money(f.payMax), ()=>{ f.payMax=''; load(); });
    if(f.negotiable) add('협의', '포함', ()=>{ f.negotiable=''; load(); });
    if(f.closeIn) add('마감', f.closeIn+'일 이내', ()=>{ f.closeIn=''; load(); });

    chipsEl.hidden = chips.length===0;
    chipsEl.innerHTML = chips.join('');
  }

  function renderPager(total){
    const pages = Math.max(1, Math.ceil(total / state.limit));
    const cur = Math.min(Math.max(1, state.page), pages);
    state.page = cur;

    const btn = (label, page, dis=false, on=false) =>
      `<button class="pbtn ${on?'on':''}" ${dis?'disabled':''} data-page="${page}">${label}</button>`;

    let html = '';
    html += btn('«', 1, cur===1);
    html += btn('‹', Math.max(1, cur-1), cur===1);
    const span = 2, s = Math.max(1, cur-span), e = Math.min(pages, cur+span);
    for(let i=s;i<=e;i++) html += btn(i, i, false, i===cur);
    html += btn('›', Math.min(pages, cur+1), cur===pages);
    html += btn('»', pages, cur===pages);
    pagerEl.innerHTML = html;

    pagerEl.onclick = (e)=>{
      const b = e.target.closest('.pbtn'); if(!b) return;
      const p = Number(b.dataset.page); if(!p || p===state.page) return;
      state.page = p;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // ---------- actions ----------
  function bindActions(){
    // 정렬
    $('#rbSort').value = state.sort;
    $('#rbSort').onchange = ()=>{
      state.sort = $('#rbSort').value; state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      load();
    };

    // 검색
    const q = $('#rbQuery'), go = $('#rbSearchGo');
    q.value = state.query || '';
    q.addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });
    go.addEventListener('click', doSearch);
    function doSearch(){
      state.query = q.value.trim(); state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      load();
    }

    // 카드 버튼
    listEl.addEventListener('click', (e)=>{
      const row = e.target.closest('.rb-row'); if(!row) return;
      const id = row.getAttribute('data-id');
      if(e.target.closest('.to')){
        location.href = 'recruit-detail.html?id=' + encodeURIComponent(id);
        return;
      }
      if(e.target.closest('.apply')){
        if (window.openApplyModal) window.openApplyModal(id);
        else UI.toast('지원 모달 준비중');
        return;
      }
    });

    // 필터 드로어
    $('#rbBtnFilter').onclick = ()=> openDrawer();
    $('#rbFilterClose').onclick = ()=> closeDrawer();
    $('.rb-drawer').addEventListener('click', (e)=>{ if(e.target.classList.contains('rb-drawer')) closeDrawer(); });

    $('#rbFilterReset').onclick = ()=>{
      state.filters = { region:'', district:'', payMin:'', payMax:'', negotiable:'', closeIn:'' };
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
      state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      closeDrawer(); load();
    };
  }
  function openDrawer(){ $('#rbDrawer').classList.add('show'); document.body.style.overflow='hidden'; }
  function closeDrawer(){ $('#rbDrawer').classList.remove('show'); document.body.style.overflow=''; }

  // ---------- load ----------
  async function load(){
    // skeletons
    listEl.innerHTML = `<div class="rb-skel"></div><div class="rb-skel"></div><div class="rb-skel"></div>`;
    renderChips();

    try{
      const { items, total } = await fetchRecruits();
      $('#rbTotal').textContent = `총 ${total}건`;

      // AD pick (1개 랜덤)
      topAdEl.hidden = true;
      let list = items;
      if(items && items.length){
        const i = Math.floor(Math.random()*items.length);
        const ad = { ...items[i], isAd:true };
        topAdEl.innerHTML = adHTML(ad);
        topAdEl.hidden = false;
        list = items.filter((_,idx)=> idx!==i);
      }

      listEl.innerHTML = list.length ? list.map(rowHTML).join('')
        : `<div class="rb-row"><div></div><div class="rb-main"><div class="rb-title">표시할 공고가 없습니다</div><div class="rb-meta">검색어나 필터를 조정해보세요.</div></div><div></div></div>`;

      renderPager(total);
    }catch(err){
      console.warn('[recruit-board] fetch error:', err);
      $('#rbTotal').textContent = '총 0건';
      topAdEl.hidden = true;
      listEl.innerHTML = `<div class="rb-row"><div></div><div class="rb-main"><div class="rb-title">데이터를 불러오지 못했습니다</div><div class="rb-meta">잠시 후 다시 시도해주세요.</div></div><div></div></div>`;
      renderPager(1);
    }
  }

  // ---------- init ----------
  bindActions();
  load();
})();