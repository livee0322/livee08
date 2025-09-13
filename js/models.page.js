/* models.page.js — v1.0.0 (모델 리스트 + 검색/정렬 + 더보기) */
(function () {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const EP = CFG.endpoints || {};
  const LIST_EP = EP.models || '/models-test?status=published&limit=24';
  const BASE_EP = EP.modelBase || '/models-test';
  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s,el=document)=>el.querySelector(s);
  const say = (t)=>{ const m=$('#mdlMsg'); if(!m) return; m.textContent=t; m.style.display = t? 'block':'none'; };

  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{ return url; } };
  const starIcons = (n=0)=> {
    const x=Math.max(0, Math.min(5, Math.round(n*2)/2)); // 0.5 step
    const full=Math.floor(x), half=(x-full)>=0.5?1:0, empty=5-full-half;
    return `${'★'.repeat(full)}${half? '☆' : ''}${'☆'.repeat(empty)}`; // (접근성용 텍스트)
  };
  const starElems = (n=0)=>{
    const x=Math.max(0, Math.min(5, Math.round(n*2)/2));
    const full=Math.floor(x), half=(x-full)>=0.5?1:0, empty=5-full-half;
    return `${'<i class="ri-star-fill"></i>'.repeat(full)}${half?'<i class="ri-star-half-fill"></i>':''}${'<i class="ri-star-line"></i>'.repeat(empty)}`;
  };

  let state = { q:'', sort:'recent', next:null, items:[] };

  function buildListUrl({append=false}={}){
    // 서버가 cursor/skip을 지원하지 않을 수 있으므로 가장 보편적인 쿼리만 사용
    let url = API_BASE + (LIST_EP.startsWith('/')? LIST_EP : '/'+LIST_EP);
    const qs = new URLSearchParams();

    // 검색어
    if(state.q) qs.set('q', state.q);
    // 정렬 힌트
    if(state.sort==='rating') qs.set('sort', 'rating');
    if(state.sort==='name')   qs.set('sort', 'name');

    const glue = url.includes('?') ? '&' : '?';
    url += (qs.toString()? glue+qs.toString() : '');

    // 페이지네이션(선택적)
    if(append && state.next){
      const g2 = url.includes('?') ? '&' : '?';
      url += g2 + 'cursor=' + encodeURIComponent(state.next);
    }
    return url;
  }

  async function fetchList({append=false}={}){
    say(append? '더 불러오는 중…' : '불러오는 중…');
    try{
      const r = await fetch(buildListUrl({append}), { headers:{Accept:'application/json'} });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);

      // items & cursor
      const items = j.items || j.data || j.docs || [];
      state.next = j.next || j.nextCursor || null;

      state.items = append ? state.items.concat(items) : items;
      renderList();
      $('#mdlLoadMore').hidden = !state.next;
      say('');
    }catch(e){
      console.error('[models load]', e);
      if(!append) state.items = [];
      renderList();
      say('목록을 불러오지 못했습니다.');
    }
  }

  function getThumb(it){
    const t = it.mainThumbnailUrl || it.avatar || (Array.isArray(it.subThumbnails)&&it.subThumbnails[0]) || (it.photos&&it.photos[0]) || '';
    return t || PH;
  }
  function getName(it){ return it.nickname || it.name || '—'; }
  function getHeadline(it){ return it.headline || it.oneLiner || it.intro || ''; }
  function getRating(it){
    // 다양한 스키마 대응
    return it.ratingAvg ?? it.averageRating ?? it.avgRating ?? (Array.isArray(it.reviews)? (it.reviews.reduce((a,b)=>a+(b.rating||0),0)/(it.reviews.length||1)) : 0);
  }
  function getRegion(it){
    const c=it.region?.city || '', a=it.region?.area || '';
    return [c,a].filter(Boolean).join(' ');
  }

  function renderList(){
    const grid = $('#mdlGrid');
    if(!state.items.length){
      grid.innerHTML = `<div class="notice">표시할 모델이 없습니다.</div>`;
      return;
    }
    grid.innerHTML = state.items.map(it=>{
      const thumb = getThumb(it);
      const rate  = getRating(it) || 0;
      const tags  = (it.tags||[]).slice(0,4).map(t=>`<span class="chip">#${t}</span>`).join('');
      const reg   = getRegion(it);
      return `
        <article class="card">
          <a class="ghost-link" href="model-new.html?id=${encodeURIComponent(it.id||it._id||'')}">
            <div class="thumb">
              <img src="${thumb}" alt="">
              <div class="badges">
                ${reg?`<span class="chip"><i class="ri-map-pin-2-line"></i> ${reg}</span>`:''}
                ${it.openToOffers!==false?`<span class="chip" style="border-color:#154; color:#a7f3d0;"><i class="ri-door-open-line"></i> 제안가능</span>`:''}
              </div>
            </div>
            <div class="body">
              <div class="name">${getName(it)}</div>
              <div class="meta">
                <span class="stars" title="${starIcons(rate)}">${starElems(rate)}</span>
                ${it.age?`<span class="chip">${it.age}세</span>`:''}
                ${it.demographics?.height?`<span class="chip">${it.demographics.height}cm</span>`:''}
              </div>
              ${tags?`<div class="tags">${tags}</div>`:''}
              ${getHeadline(it)?`<div class="meta" style="color:var(--sub)">${getHeadline(it)}</div>`:''}
              <div class="foot">
                <span style="color:var(--ok)"><i class="ri-calendar-line"></i> 예약 가능일 표기</span>
                <span class="chip"><i class="ri-external-link-line"></i></span>
              </div>
            </div>
          </a>
        </article>`;
    }).join('');
  }

  // events
  document.addEventListener('DOMContentLoaded', ()=>{
    // 초기 로드
    fetchList();

    // 검색 즉시 반영(디바운스 간단화)
    let t=null;
    $('#mdlSearch').addEventListener('input', (e)=>{
      state.q = e.target.value.trim();
      clearTimeout(t); t=setTimeout(()=>fetchList(), 250);
    });

    $('#mdlSort').addEventListener('change', (e)=>{
      state.sort = e.target.value;
      fetchList();
    });

    $('#mdlLoadMore').addEventListener('click', ()=> fetchList({append:true}));
  });
})();