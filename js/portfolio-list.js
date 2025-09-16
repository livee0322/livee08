/* portfolio-list.js — v1.2.0
   - 카드 간격/중앙정렬
   - 안내 문구는 상단 1회만
   - 모바일 1열/PC 2열 반응형은 CSS 그리드로 처리
   - 공개 플래그 필드 pill 수평 스크롤
*/
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  // 엔드포인트(단수) 확인
  const EP_LIST = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';

  const $ = (s, el=document) => el.querySelector(s);

  // 공개 표시 helper
  function publicPills(d){
    const pills = [];
    const dm = d.demographics || {};
    if (d.agePublic && typeof d.age === 'number') pills.push(`<span class="pl-pill"><i class="ri-cake-3-line"></i>${d.age}세</span>`);
    if (dm.genderPublic && dm.gender) {
      const g = dm.gender === 'female' ? '여성' : dm.gender === 'male' ? '남성' : '기타';
      pills.push(`<span class="pl-pill"><i class="ri-user-3-line"></i>${g}</span>`);
    }
    if (dm.heightPublic && dm.height) pills.push(`<span class="pl-pill"><i class="ri-ruler-line"></i>${dm.height}cm</span>`);
    if (dm.sizePublic) {
      const arr = [dm.sizeTop && `상의 ${dm.sizeTop}`, dm.sizeBottom && `하의 ${dm.sizeBottom}`, dm.shoe && `신발 ${dm.shoe}`].filter(Boolean);
      if (arr.length) pills.push(`<span class="pl-pill"><i class="ri-t-shirt-line"></i>${arr.join(' / ')}</span>`);
    }
    if (d.regionPublic && d.region?.city) {
      const r = d.region.area ? `${d.region.city} ${d.region.area}` : d.region.city;
      pills.push(`<span class="pl-pill"><i class="ri-map-pin-line"></i>${r}</span>`);
    }
    return pills.length ? `<div class="pl-public">${pills.join('')}</div>` : '';
  }

  function card(d){
    const id = d.id || d._id;
    const img = d.mainThumbnailUrl || d.mainThumbnail || d.coverImageUrl || d.coverImage || '';
    const name = d.nickname || d.displayName || d.name || '포트폴리오';
    const head = d.headline || d.bio || '';

    return `
      <article class="pl-card" data-id="${id}" role="button" tabindex="0" aria-label="${name} 상세로 이동">
        <div class="pl-thumb">
          ${img ? `<img src="${img}" alt="${name}">` : `<i class="ri-image-2-line" style="font-size:28px;color:#94a3b8"></i>`}
        </div>
        <div class="pl-body">
          <div class="pl-name">${name}</div>
          <div class="pl-head">${head}</div>
          ${publicPills(d)}
        </div>
        <div class="pl-go"><i class="ri-arrow-right-s-line"></i></div>
      </article>`;
  }

  async function load(){
    try{
      const search = $('#plSearch').value.trim();
      const sort = $('#plSort').value;
      const q = new URLSearchParams({
        status:'published',
        limit: 24,
        key: search || '',
        sort: sort
      });
      const r = await fetch(`${API}${EP_LIST.split('?')[0]}?${q.toString()}`);
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];

      $('#plGrid').innerHTML = items.map(card).join('');
      const has = items.length > 0;
      $('#plEmpty').hidden = has;

      // 카드 클릭 이동
      $('#plGrid').addEventListener('click', (e)=>{
        const art = e.target.closest('.pl-card'); if(!art) return;
        location.href = `portfolio.html?id=${encodeURIComponent(art.dataset.id)}`;
      }, { once:true });

    }catch(e){
      console.warn('[portfolio load]', e);
      UI.toast('목록을 불러오지 못했습니다');
      $('#plEmpty').hidden = false;
    }
  }

  // 검색/정렬 바인딩
  document.addEventListener('DOMContentLoaded', ()=>{
    $('#plSearch')?.addEventListener('input', debounce(load, 200));
    $('#plSort')?.addEventListener('change', load);
    load();
  });

  function debounce(fn, ms){
    let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
  }
})();