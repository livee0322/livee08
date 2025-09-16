/* portfolio-list.js — v1.0.3 (명함 레이아웃 / 빈상태 토글 정확화 / 썸네일 안전참조) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  // 리스트/단건 엔드포인트 (테스트 스키마: PortfolioTest)
  const EP_LIST = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';
  const PLACE = CFG.placeholderThumb || 'default.jpg';

  const $ = (s, el = document) => el.querySelector(s);

  let page = 1, key = '', sort = 'latest', done = false;

  function firstThumb(d) {
    // 안전한 썸네일 선택 우선순위
    return (
      d.mainThumbnailUrl ||
      d.mainThumbnail ||
      (Array.isArray(d.subThumbnails) && d.subThumbnails[0]) ||
      d.coverImageUrl ||
      (Array.isArray(d.subImages) && d.subImages[0]) ||
      PLACE
    );
  }

  function cardHTML(d) {
    const id = d.id || d._id;
    const img = firstThumb(d);
    const name = d.nickname || d.displayName || d.name || '포트폴리오';
    const sub  = d.headline || '';
    const region = d.region?.city ? `${d.region.city}${d.region.area ? ' · '+d.region.area : ''}` : '';
    const career = d.careerYears ? `경력 ${d.careerYears}y` : '';
    const meta = [region, career].filter(Boolean).join(' · ');

    return `
      <article class="pl-card" data-id="${id}">
        <div class="pl-thumb" style="background-image:url('${img}')"></div>
        <div class="pl-body">
          <div class="pl-name">${name}</div>
          <div class="pl-sub">${sub}</div>
          ${meta ? `<div class="pl-meta">${meta}</div>` : ''}
          <div class="pl-link">
            <a href="portfolio.html?id=${encodeURIComponent(id)}" aria-label="${name} 프로필 상세보기">
              프로필 상세보기 <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function toggleEmpty(hasAny) {
    $('#plEmpty').hidden = !!hasAny;
  }

  async function load(append = true) {
    if (done) return;
    $('#plMore')?.setAttribute('disabled', 'disabled');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '12',
        status: 'published',
        key,
        sort
      });
      const urlBase = EP_LIST.split('?')[0]; // 안전: 고정 쿼리 제거
      const r = await fetch(`${API}${urlBase}?${q.toString()}`);
      const j = await r.json().catch(() => ({}));
      const items = j.items || j.data || j.docs || [];
      const total = Number(j.total ?? j.count ?? (append ? $('#plGrid').children.length + items.length : items.length));

      if (!append) $('#plGrid').innerHTML = '';
      if (items.length) {
        $('#plGrid').insertAdjacentHTML('beforeend', items.map(cardHTML).join(''));
      }

      // 빈 상태 정확히 토글
      const hasAny = total > 0 || $('#plGrid').children.length > 0;
      toggleEmpty(hasAny);

      if (items.length < 1) {
        done = true;
        $('#plMore')?.setAttribute('hidden', 'hidden');
      } else {
        page += 1;
        $('#plMore')?.removeAttribute('hidden');
      }
    } catch (e) {
      console.warn('[portfolio load]', e);
      UI?.toast?.('목록을 불러오지 못했습니다');
    } finally {
      $('#plMore')?.removeAttribute('disabled');
    }
  }

  // 이벤트
  $('#plMore')?.addEventListener('click', () => load(true));
  $('#plSearch')?.addEventListener('input', (e) => {
    key = (e.target.value || '').trim();
    page = 1; done = false;
    load(false);
  });
  $('#plSort')?.addEventListener('change', (e) => {
    sort = e.target.value || 'latest';
    page = 1; done = false;
    load(false);
  });

  // 초기 로드
  load(true);
})();