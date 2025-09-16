/* portfolio-list.js — v1.0.0 (명함형 카드 렌더) */
(function(){
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const EP_LIST = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';
  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const qs = (o)=>Object.entries(o).filter(([,v])=>v!==undefined&&v!=='').map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  let page = 1, key='', sort='latest', done=false;

  function card(d){
    const id = d.id || d._id;
    const img = d.mainThumbnailUrl || d.coverImageUrl || PH;
    const name = d.nickname || d.displayName || d.name || '크리에이터';
    const headline = d.headline || d.intro || d.summary || '';
    const region = d.region?.city ? `${d.region.city}${d.region.area?(' · '+d.region.area):''}` : '';
    const meta = [region, d.careerYears?`경력 ${d.careerYears}y`:null].filter(Boolean).join(' · ');
    const tags = (Array.isArray(d.tags)? d.tags.slice(0,3):[]).map(t=>`<span class="pl-tag">#${t}</span>`).join('');

    return `
      <article class="pl-card" data-id="${id}">
        <div class="pl-thumb"><img src="${img}" alt=""></div>
        <div class="pl-body">
          <div class="pl-name">${name}</div>
          <div class="pl-actions">
            <a class="btn ghost" href="portfolio.html?id=${encodeURIComponent(id)}"><i class="ri-user-line"></i> 프로필</a>
            <a class="btn link" href="portfolio.html?id=${encodeURIComponent(id)}">프로필 상세보기<i class="ri-arrow-right-s-line" aria-hidden="true"></i></a>
          </div>
          <div class="pl-headline">${headline}</div>
          <div class="pl-meta">${meta}</div>
          <div class="pl-tags">${tags}</div>
        </div>
      </article>`;
  }

  async function load(append=true){
    if(done) return;
    $('#plMore')?.setAttribute('disabled','disabled');
    try{
      const base = EP_LIST.split('?')[0];
      const q = qs({ page, key, sort, status:'published', limit: 20 });
      const r = await fetch(`${API}${base}?${q}`);
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];
      if(page===1 && items.length===0){
        $('#plGrid').innerHTML='';
        $('#plEmpty').hidden = false;
        $('.more-wrap').style.display='none';
        return;
      }
      $('#plEmpty').hidden = true;
      if(items.length<1){ done=true; $('.more-wrap').style.display='none'; }
      const html = items.map(card).join('');
      if(append) $('#plGrid').insertAdjacentHTML('beforeend', html);
      page += 1;
    }catch(e){
      console.warn('[portfolio list load]', e);
    }finally{
      $('#plMore')?.removeAttribute('disabled');
    }
  }

  // 검색/정렬
  $('#plSearch')?.addEventListener('input', debounce(()=>{
    key = ($('#plSearch').value||'').trim();
    page=1; done=false; $('#plGrid').innerHTML=''; $('.more-wrap').style.display='';
    load(true);
  }, 250));
  $('#plSort')?.addEventListener('change', ()=>{
    sort = $('#plSort').value || 'latest';
    page=1; done=false; $('#plGrid').innerHTML=''; $('.more-wrap').style.display='';
    load(true);
  });

  $('#plMore')?.addEventListener('click',()=>load(true));

  // 초기 로드
  load(true);

  function debounce(fn, ms){
    let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
  }
})();