/* portfolio-list.js — v2.2.0 (명함형 카드 + 우하단 상세링크 + 스크랩 + 공개필드 배지) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP_LIST = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';
  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let page = 1, done = false, key = '', sort = 'latest';

  /* ----- 즐겨찾기(localStorage) ----- */
  const FKEY = 'livee_portfolio_favs';
  const getFavs = () => {
    try { return new Set(JSON.parse(localStorage.getItem(FKEY) || '[]')); }
    catch { return new Set(); }
  };
  const setFavs = (set) => localStorage.setItem(FKEY, JSON.stringify([...set]));
  const favs = getFavs();

  /* ----- 카드 렌더 ----- */
  function publicFacets(d) {
    const b = [];
    // 스키마 공개 플래그 반영
    if (d.demographics?.gender && d.demographics?.genderPublic) {
      const map = { female:'여성', male:'남성', other:'기타', '':'기타' };
      b.push(`성별 ${map[d.demographics.gender] || d.demographics.gender}`);
    }
    if (typeof d.age === 'number' && d.agePublic) b.push(`나이 ${d.age}`);
    if (typeof d.careerYears === 'number' && d.careerYearsPublic) b.push(`경력 ${d.careerYears}y`);
    if (typeof d.demographics?.height === 'number' && d.demographics?.heightPublic) b.push(`키 ${d.demographics.height}cm`);
    if (d.regionPublic && d.region?.city) b.push(`지역 ${d.region.city}${d.region.area ? ' ' + d.region.area : ''}`);
    return b;
  }

  function card(d) {
    const id = d.id || d._id;
    const img = d.mainThumbnailUrl || d.mainThumbnail || d.coverImageUrl || d.coverImage || PH;
    const name = d.nickname || d.displayName || d.name || '크리에이터';
    const sub = d.headline || '';
    const facets = publicFacets(d).slice(0, 3); // 너무 길면 3개까지만

    return `
      <article class="pl-card" data-id="${id}">
        <a class="pl-thumb" href="portfolio.html?id=${encodeURIComponent(id)}" aria-label="${name} 프로필">
          <img src="${img}" alt="">
        </a>

        <div class="pl-body">
          <div class="pl-name">${name}</div>
          ${sub ? `<div class="pl-headline">${sub}</div>` : ''}
          ${facets.length ? `<div class="pl-facets">${facets.map(v=>`<span class="pl-badge">${v}</span>`).join('')}</div>` : ''}
        </div>

        <button class="pl-fav ${favs.has(String(id)) ? 'on':''}" data-id="${id}" aria-label="스크랩">
          <i class="${favs.has(String(id)) ? 'ri-star-fill':'ri-star-line'}"></i>
        </button>

        <a class="pl-detail" href="portfolio.html?id=${encodeURIComponent(id)}">
          프로필 상세보기 <i class="ri-arrow-right-s-line"></i>
        </a>
      </article>`;
  }

  /* ----- 목록 로드 ----- */
  async function load(append = true) {
    if (done) return;
    $('#plMore')?.setAttribute('disabled', 'disabled');

    try {
      const qp = new URLSearchParams({
        page, key, sort, status: 'published', limit: 24,
      });
      const url = `${API}${EP_LIST.split('?')[0]}?${qp.toString()}`;
      const r = await fetch(url);
      const j = await r.json().catch(()=> ({}));
      const items = j.items || j.data || j.docs || [];

      if (append) $('#plGrid').insertAdjacentHTML('beforeend', items.map(card).join(''));
      if (!$('#plGrid').children.length) $('#plEmpty').hidden = false;
      else $('#plEmpty').hidden = true;

      if (items.length < 1) { done = true; $('.more-wrap')?.classList.add('hide'); }
      page += 1;

      // 스크랩 토글 핸들러 바인딩
      $$('.pl-fav').forEach(btn=>{
        btn.onclick = () => {
          const id = String(btn.dataset.id);
          if (favs.has(id)) { favs.delete(id); btn.classList.remove('on'); btn.querySelector('i').className='ri-star-line'; }
          else { favs.add(id); btn.classList.add('on'); btn.querySelector('i').className='ri-star-fill'; }
          setFavs(favs);
        };
      });
    } catch (e) {
      console.warn('[portfolio load]', e);
      UI?.toast?.('목록을 불러오지 못했습니다');
    } finally {
      $('#plMore')?.removeAttribute('disabled');
    }
  }

  /* ----- 검색/정렬 ----- */
  $('#plSearch')?.addEventListener('input', (e)=>{
    key = (e.target.value||'').trim();
    page = 1; done = false; $('#plGrid').innerHTML = ''; $('.more-wrap')?.classList.remove('hide'); load(true);
  });
  $('#plSort')?.addEventListener('change', (e)=>{
    sort = e.target.value || 'latest';
    page = 1; done = false; $('#plGrid').innerHTML = ''; $('.more-wrap')?.classList.remove('hide'); load(true);
  });
  $('#plMore')?.addEventListener('click', ()=> load(true));

  /* ----- 초기 로드 ----- */
  load(true);
})();