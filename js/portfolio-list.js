/* portfolio-list.js — v2.2.0
 * - 스키마: PortfolioTest (status, visibility, nickname, headline, mainThumbnailUrl, coverImageUrl, subThumbnails, tags, region, careerYears, createdBy, links)
 * - 카드 하단: ‘프로필 상세보기’ 링크 텍스트
 * - 목록이 1개 이상일 때 empty 영역 자동 숨김
 */
(() => {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP_LIST = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const PH = CFG.placeholderThumb || 'default.jpg';
  const qs = new URLSearchParams(location.search);
  let page = Number(qs.get('page') || 1);
  let q = qs.get('q') || '';
  let sort = qs.get('sort') || 'latest';
  let done = false;

  // 이미지 선택 우선순위
  const pickThumb = (d) =>
    d.mainThumbnailUrl ||
    d.coverImageUrl ||
    (Array.isArray(d.subThumbnails) && d.subThumbnails[0]) ||
    d.mainThumbnail ||
    PH;

  const card = (d) => {
    const id = d.id || d._id;
    const img = pickThumb(d);
    const name = d.nickname || d.displayName || d.name || '크리에이터';
    const headline = d.headline || '';
    const city = d.region?.city || '';
    const area = d.region?.area || '';
    const location = city ? (area ? `${city} ${area}` : city) : '';
    const tags = (d.tags || []).slice(0, 3).map((t) => `#${t}`).join(' ');
    const meta = [location, d.careerYears ? `경력 ${d.careerYears}y` : '', tags].filter(Boolean).join(' · ');

    return `
      <article class="card" data-id="${id}">
        <a href="portfolio.html?id=${encodeURIComponent(id)}" class="thumb" style="background-image:url('${img}')"></a>
        <div class="body">
          <a class="name" href="portfolio.html?id=${encodeURIComponent(id)}">${name}</a>
          ${headline ? `<div class="headline">${headline}</div>` : ''}
          ${meta ? `<div class="meta">${meta}</div>` : ''}
          <a class="link" href="portfolio.html?id=${encodeURIComponent(id)}" aria-label="프로필 상세보기">
            프로필 상세보기 <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </a>
        </div>
      </article>`;
  };

  async function load(append = true) {
    if (done) return;
    $('#plMore')?.setAttribute('disabled', 'disabled');

    try {
      const params = new URLSearchParams({
        page,
        limit: 24,
        status: 'published',
        visibility: 'public',
      });
      if (q) params.set('q', q);
      if (sort === 'offers') params.set('sort', 'offers');

      // 쿼리 키를 유지하여 서버 필터와 일치
      const base = EP_LIST.split('?')[0];
      const r = await fetch(`${API}${base}?${params.toString()}`);
      const j = await r.json().catch(() => ({}));
      const items = j.items || j.data || j.docs || [];

      // 비어있음 처리
      if (page === 1) {
        $('#plGrid').innerHTML = '';
        $('#plEmpty').hidden = items.length > 0; // 하나라도 있으면 감춤
      }
      if (!items.length) {
        done = true;
        $('#plMore')?.setAttribute('hidden', 'hidden');
        return;
      }

      const html = items.map(card).join('');
      if (append) $('#plGrid').insertAdjacentHTML('beforeend', html);

      // 개수/다음 페이지
      page += 1;
      $('#plMore')?.removeAttribute('hidden');
    } catch (e) {
      console.warn('[portfolio list] load error', e);
      UI?.toast?.('목록을 불러오지 못했습니다');
    } finally {
      $('#plMore')?.removeAttribute('disabled');
    }
  }

  // 컨트롤 바인딩
  function bindControls() {
    const s = $('#plSearch');
    const sel = $('#plSort');
    if (s) {
      s.value = q;
      s.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          q = (s.value || '').trim();
          page = 1; done = false;
          UI?.setQs?.({ q, sort, page: 1 });
          load(true);
        }
      });
    }
    if (sel) {
      sel.value = sort;
      sel.addEventListener('change', () => {
        sort = sel.value;
        page = 1; done = false;
        UI?.setQs?.({ q, sort, page: 1 });
        load(true);
      });
    }
    $('#plMore')?.addEventListener('click', () => load(true));
  }

  // 초기화
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();

  function init() {
    bindControls();
    load(true);
  }
})();