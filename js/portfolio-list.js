/* portfolio-list.js — v2.1.0
 * - 빈 상태 문구: 아이템 있으면 자동 숨김
 * - 썸네일 보강: main/cover/subs(0) 순서 + 과거 필드 fallback + placeholder
 * - 카드 하단 '프로필 상세보기' 링크
 */
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP_LIST = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';
  const PLACEHOLDER = CFG.placeholderThumb || 'default.jpg';

  const $ = (s,el=document)=>el.querySelector(s);

  let page = 1, key='', sort='latest', done=false;

  function pickThumb(d){
    // 최신 필드 우선 → 과거 호환 필드 → placeholder
    const fromArray = (a)=>Array.isArray(a) && a.length ? a[0] : '';
    return (
      d.mainThumbnailUrl || d.coverImageUrl || fromArray(d.subThumbnails) ||
      d.mainThumbnail    || d.coverImage    || fromArray(d.subImages) ||
      PLACEHOLDER
    );
  }

  function card(d){
    const id = d.id || d._id;
    const img = pickThumb(d);
    const name = d.nickname || d.displayName || d.name || '포트폴리오';
    const sub  = d.headline || d.oneLiner || '';
    const loc  = d.region?.city ? d.region.city + (d.region.area? ' · '+d.region.area : '') : '';
    const exp  = (d.careerYears? `경력 ${d.careerYears}y` : '');
    const meta = [loc, exp].filter(Boolean).join(' · ');

    return `
      <article class="pl-card">
        <a class="pl-thumb" href="portfolio.html?id=${encodeURIComponent(id)}" style="background-image:url('${img}')"></a>
        <div class="pl-body">
          <div class="pl-name">${name}</div>
          ${sub ? `<div class="pl-sub">${sub}</div>` : ''}
          ${meta ? `<div class="pl-meta">${meta}</div>` : ''}
          <a class="pl-link" href="portfolio.html?id=${encodeURIComponent(id)}" aria-label="${name} 프로필 상세보기">
            프로필 상세보기 <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </a>
        </div>
      </article>`;
  }

  function setEmptyVisibility(hasItems){
    const empty = $('#plEmpty');
    if (!empty) return;
    empty.hidden = hasItems;     // 아이템 있으면 숨김(true)
  }

  async function load(append=true){
    if(done) return;
    $('#plMore')?.setAttribute('disabled','disabled');

    try{
      const base = EP_LIST.split('?')[0];
      const q = new URLSearchParams({
        page, key, sort, status:'published', limit: 24
      });
      const res = await fetch(`${API}${base}?${q.toString()}`);
      const j = await res.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];
      if(!items.length){ done = true; }

      const html = items.map(card).join('');
      if(append) $('#plGrid').insertAdjacentHTML('beforeend', html);

      // 빈 상태 처리
      const gridHas = $('#plGrid').children.length > 0;
      setEmptyVisibility(gridHas);

      page += 1;
    }catch(e){
      console.warn('[portfolio list] load error', e);
      UI?.toast?.('목록을 불러오지 못했습니다');
      // 실패 시에도 현재 그리드 유무로 empty 상태 갱신
      setEmptyVisibility($('#plGrid').children.length > 0);
    }finally{
      $('#plMore')?.removeAttribute('disabled');
    }
  }

  // 검색/정렬 바인딩
  $('#plSearch')?.addEventListener('input', UI.debounce?.(e=>{
    key = (e.target.value||'').trim();
    page=1; done=false;
    $('#plGrid').innerHTML='';
    load(true);
  }, 300) || (e=>{
    key = (e.target.value||'').trim();
    page=1; done=false;
    $('#plGrid').innerHTML='';
    load(true);
  }));

  $('#plSort')?.addEventListener('change', e=>{
    sort = e.target.value || 'latest';
    page=1; done=false;
    $('#plGrid').innerHTML='';
    load(true);
  });

  $('#plMore')?.addEventListener('click', ()=>load(true));

  // 초기 로드
  load(true);
})();