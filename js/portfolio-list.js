/* portfolio-list.js — v2.2.0
   - 모바일 1열 / 데스크탑 2열
   - 카드 우하단 "프로필 상세보기" 옅은 회색
   - 공개 플래그(agePublic, genderPublic, regionPublic, careerYearsPublic, demographics.sizePublic 등) 노출
   - 목록이 1개 이상이면 빈상태 숨김
   - FAB만 사용 (별도 “더보기” 버튼 제거)
*/
(() => {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP   = CFG.endpoints || {};
  const LIST = (EP.portfolios || '/portfolio-test?status=published&limit=24');
  const BASE = (EP.portfolioBase || '/portfolio-test');

  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));

  const withT = (url, t) => {
    try {
      if (!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0, i + 8) + t + '/' + url.slice(i + 8);
    } catch { return url; }
  };

  const THUMB = {
    square: 'c_fill,g_auto,w_480,h_480,f_auto,q_auto'
  };

  let page = 1;
  let key  = '';
  let sort = 'latest';
  let busy = false;
  let done = false;

  function metaChips(d){
    const chips = [];
    // 나이
    if (d.age && d.agePublic) chips.push(`<span class="meta-chip"><i class="ri-cake-2-line"></i>${d.age}세</span>`);
    // 성별
    const g = d.demographics?.gender || '';
    if (g && d.demographics?.genderPublic) {
      const map = { female:'여성', male:'남성', other:'기타' };
      chips.push(`<span class="meta-chip"><i class="ri-user-2-line"></i>${map[g] || g}</span>`);
    }
    // 키
    if (d.demographics?.height && d.demographics?.heightPublic) {
      chips.push(`<span class="meta-chip"><i class="ri-ruler-line"></i>${d.demographics.height}cm</span>`);
    }
    // 사이즈 공개
    if (d.demographics?.sizePublic && (d.demographics.sizeTop || d.demographics.sizeBottom)) {
      const st = d.demographics.sizeTop ? `상 ${d.demographics.sizeTop}` : '';
      const sb = d.demographics.sizeBottom ? `하 ${d.demographics.sizeBottom}` : '';
      chips.push(`<span class="meta-chip"><i class="ri-t-shirt-air-line"></i>${[st,sb].filter(Boolean).join(' · ')}</span>`);
    }
    // 지역
    if (d.region?.city && d.regionPublic) {
      const area = d.region.area ? ` ${d.region.area}` : '';
      chips.push(`<span class="meta-chip"><i class="ri-map-pin-line"></i>${d.region.city}${area}</span>`);
    }
    // 경력
    if (typeof d.careerYears === 'number' && d.careerYearsPublic) {
      chips.push(`<span class="meta-chip"><i class="ri-briefcase-3-line"></i>${d.careerYears}y</span>`);
    }
    return chips.join('');
  }

  function card(d){
    const id   = d.id || d._id;
    const name = d.nickname || d.displayName || d.name || '포트폴리오';
    const sub  = d.headline || '';
    const img  = withT((d.mainThumbnailUrl || d.coverImageUrl || d.mainThumbnail || d.coverImage || CFG.placeholderThumb || 'default.jpg'), THUMB.square);

    return `
      <article class="pl-card" data-id="${id}">
        <button class="scrap" type="button" aria-label="스크랩"><i class="ri-star-line"></i></button>
        <img class="pl-thumb" src="${img}" alt="">
        <div class="pl-body">
          <h3 class="pl-name">${name}</h3>
          <p class="pl-sub">${sub}</p>
          <div class="pl-meta">${metaChips(d)}</div>
          <div class="pl-actions">
            <a class="pl-link" href="portfolio.html?id=${encodeURIComponent(id)}">프로필 상세보기 <i class="ri-arrow-right-s-line"></i></a>
          </div>
        </div>
      </article>`;
  }

  async function load(append=true){
    if (busy || done) return; busy = true;
    try{
      const q = new URLSearchParams({ page, key, sort, status:'published', limit: 20 });
      const url = `${API}${LIST.split('?')[0]}?${q.toString()}`;
      const r = await fetch(url);
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];
      if (!items.length && page === 1){
        $('#plEmpty')?.removeAttribute('hidden');
        $('#plGrid').innerHTML = '';
        done = true;
        return;
      }
      if (items.length < 1) { done = true; }
      $('#plEmpty')?.setAttribute('hidden','hidden');
      const html = items.map(card).join('');
      if (append) $('#plGrid').insertAdjacentHTML('beforeend', html);
      page++;
    }catch(e){
      console.warn('[portfolio list]', e);
      UI?.toast?.('목록을 불러오지 못했습니다');
    }finally{ busy = false; }
  }

  function bindControls(){
    $('#plForm')?.addEventListener('submit', (e)=>e.preventDefault());
    $('#plSearch')?.addEventListener('input', e=>{
      key = (e.target.value||'').trim();
      page = 1; done = false;
      $('#plGrid').innerHTML = '';
      load(true);
    });
    $('#plSort')?.addEventListener('change', e=>{
      sort = e.target.value || 'latest';
      page = 1; done = false;
      $('#plGrid').innerHTML = '';
      load(true);
    });

    // 스크랩 토글 (로컬 UI)
    $('#plGrid')?.addEventListener('click', (e)=>{
      const b = e.target.closest('.scrap'); if(!b) return;
      b.classList.toggle('on');
      const i = b.querySelector('i');
      i.className = b.classList.contains('on') ? 'ri-star-fill' : 'ri-star-line';
    });

    // FAB
    $('#fabNew')?.addEventListener('click', ()=>{ location.href = 'portfolio-new.html'; });
  }

  // init
  document.addEventListener('DOMContentLoaded', ()=>{
    bindControls();
    load(true);
  });
})();