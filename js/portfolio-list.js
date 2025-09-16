/* portfolio-list.js — v1.0.1 */
(() => {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';

  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
  const grid   = $('#plGrid');
  const empty  = $('#plEmpty');
  const search = $('#plSearch');
  const sort   = $('#plSort');

  let page=1, done=false, key='';

  function card(d){
    const id = d.id || d._id;
    const img = d.mainThumbnailUrl || d.coverImageUrl || CFG.placeholderThumb || 'default.jpg';
    const name = d.nickname || d.name || '크리에이터';
    const sub = d.headline || d.oneLiner || '';
    const tags = (d.tags||[]).slice(0,3).map(t=>`<span class="tag">#${t}</span>`).join('');
    return `
      <article class="pl-card">
        <div class="thumb" style="background-image:url('${img}')"></div>
        <div class="body">
          <strong class="name">${name}</strong>
          <div class="headline">${sub}</div>
          <div class="tags">${tags}</div>
          <a class="more" href="portfolio.html?id=${encodeURIComponent(id)}">프로필 상세보기 <i class="ri-arrow-right-s-line"></i></a>
        </div>
      </article>`;
  }

  async function load(reset=false){
    if(reset){ page=1; done=false; grid.innerHTML=''; }
    if(done) return;

    try{
      const q = new URLSearchParams({
        page, limit: 24,
        status: 'published',
        key, sort: sort?.value || 'latest'
      });
      const r = await fetch(`${API}${EP.split('?')[0]}?${q.toString()}`);
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];
      if(page===1){
        // 아이템이 하나라도 있으면 빈 상태 숨김
        if(empty) empty.hidden = items.length > 0;
      }
      if(items.length<1){ done=true; return; }
      grid.insertAdjacentHTML('beforeend', items.map(card).join(''));
      page++;
    }catch(e){
      console.warn('[portfolio list load]', e);
      if(page===1 && empty) empty.hidden = false;
    }
  }

  // 검색 & 정렬
  search?.addEventListener('input', () => {
    key = (search.value||'').trim();
    load(true);
  });
  sort?.addEventListener('change', () => load(true));

  // 초기 로드
  load(true);

  // 무한 스크롤 옵션(필요 시)
  // new IntersectionObserver(([e])=>{ if(e.isIntersecting) load(); }).observe(document.getElementById('plMoreSentinel'));
})();