/* portfolio-list.js — v2.2.0
 * - 모바일 1열 / PC 2열
 * - 카드 overflow 방지(thumb safe-fit)
 * - 검색/정렬 UI 통일
 * - 카드 클릭 안내 문구는 상단 한 번만
 * - 공개 플래그 뱃지 가로 스크롤
 * - 본문/썸네일 중앙 정렬
 * - FAB만 사용(기존 +버튼 제거), '더 보기' 없음
 * - 스크랩 토글(LocalStorage)
 */
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/, '');
  const EP  = (CFG.endpoints && (CFG.endpoints.portfolios || '/portfolio-test?status=published&limit=24'));
  const EP_BASE = (CFG.endpoints && (CFG.endpoints.portfolioBase || '/portfolio-test'));

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const qs = new URLSearchParams(location.search);
  const state = {
    items: [],
    sort: 'latest',
    key: (qs.get('q') || '').trim(),
  };

  const getToken = () =>
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const headers = { Accept: 'application/json' };

  // ----------- helpers -----------
  const fitThumb = (d) =>
    d.mainThumbnailUrl || d.mainThumbnail || d.coverImageUrl || d.coverImage ||
    (Array.isArray(d.subThumbnails) && d.subThumbnails[0]) ||
    (Array.isArray(d.subImages) && d.subImages[0]) || '';

  const bool = (v) => v === true;

  const buildBadges = (d) => {
    const arr = [];
    // 나이
    if (Number.isFinite(d.age) && bool(d.agePublic)) {
      arr.push(`<span class="pl-badge"><i class="ri-cake-3-line"></i>${d.age}세</span>`);
    }
    // 성별
    const g = d.demographics?.gender;
    if (g && bool(d.demographics?.genderPublic)) {
      const label = g === 'female' ? '여성' : g === 'male' ? '남성' : '기타';
      arr.push(`<span class="pl-badge"><i class="ri-user-3-line"></i>${label}</span>`);
    }
    // 키
    if (Number.isFinite(d.demographics?.height) && bool(d.demographics?.heightPublic)) {
      arr.push(`<span class="pl-badge"><i class="ri-ruler-line"></i>${d.demographics.height}cm</span>`);
    }
    // 사이즈
    if (bool(d.demographics?.sizePublic)) {
      const st = d.demographics?.sizeTop, sb = d.demographics?.sizeBottom, sh = d.demographics?.shoe;
      const line = [st && `Top ${st}`, sb && `Bottom ${sb}`, sh && `Shoes ${sh}`].filter(Boolean).join(' · ');
      if (line) arr.push(`<span class="pl-badge"><i class="ri-t-shirt-2-line"></i>${line}</span>`);
    }
    // 지역
    if (d.region?.city && bool(d.regionPublic)) {
      const city = d.region.city + (d.region.area ? ` ${d.region.area}` : '');
      arr.push(`<span class="pl-badge"><i class="ri-map-pin-2-line"></i>${city}</span>`);
    }
    // 경력
    if (Number.isFinite(d.careerYears) && bool(d.careerYearsPublic)) {
      arr.push(`<span class="pl-badge"><i class="ri-award-line"></i>경력 ${d.careerYears}y</span>`);
    }
    return arr.join('');
  };

  const clamp = (s, n = 80) => {
    s = (s || '').toString();
    return s.length > n ? (s.slice(0, n - 1) + '…') : s;
  };

  const scrapKey = 'livee_portfolio_scraps';
  const getScraps = () => {
    try { return JSON.parse(localStorage.getItem(scrapKey) || '[]'); } catch { return []; }
  };
  const setScraps = (ids) => localStorage.setItem(scrapKey, JSON.stringify(ids));
  const toggleScrap = (id, btn) => {
    const now = new Set(getScraps());
    if (now.has(id)) now.delete(id); else now.add(id);
    setScraps([...now]);
    btn.classList.toggle('on', now.has(id));
  };

  // ----------- render -----------
  function card(d) {
    const id = d.id || d._id;
    const thumbUrl = fitThumb(d);
    const name = d.nickname || d.displayName || d.name || '포트폴리오';
    const head = d.headline || d.oneLiner || '';

    const scraps = new Set(getScraps());
    const starred = scraps.has(id);

    return `
      <article class="pl-card" role="button" tabindex="0" data-id="${id}" aria-label="${name} 상세 보기">
        <div class="pl-thumb">${thumbUrl ? `<img alt="" src="${thumbUrl}">` : ''}</div>
        <div class="pl-body">
          <div class="pl-name">${name}</div>
          <div class="pl-head clamp">${clamp(head, 80)}</div>
          <div class="pl-badges">${buildBadges(d)}</div>
        </div>
        <button class="pl-scrap ${starred ? 'on' : ''}" aria-label="스크랩">
          <i class="${starred ? 'ri-star-fill' : 'ri-star-line'}"></i>
        </button>
      </article>
    `;
  }

  function render() {
    const list = $('#plList');
    const empty = $('#plEmpty');
    if (!state.items.length) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = state.items.map(card).join('');
  }

  // ----------- events -----------
  function wire() {
    // 카드 클릭 → 상세
    $('#plList').addEventListener('click', (e) => {
      const card = e.target.closest('.pl-card');
      if (!card) return;
      if (e.target.closest('.pl-scrap')) return; // 스크랩 버튼은 제외
      const id = card.dataset.id;
      location.href = `portfolio-detail.html?id=${encodeURIComponent(id)}`;
    });
    $('#plList').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.pl-card');
        if (!card) return;
        const id = card.dataset.id;
        location.href = `portfolio.html?id=${encodeURIComponent(id)}`;
      }
    });

    // 스크랩 토글
    $('#plList').addEventListener('click', (e) => {
      const btn = e.target.closest('.pl-scrap');
      if (!btn) return;
      const card = btn.closest('.pl-card');
      const id = card?.dataset.id;
      if (!id) return;
      const icon = btn.querySelector('i');
      toggleScrap(id, btn);
      icon.className = btn.classList.contains('on') ? 'ri-star-fill' : 'ri-star-line';
      e.stopPropagation();
    });

    // 검색
    const search = $('#plSearch');
    search.value = state.key || '';
    let st;
    search.addEventListener('input', () => {
      clearTimeout(st);
      st = setTimeout(() => {
        state.key = (search.value || '').trim();
        load();
      }, 200);
    });

    // 정렬 드롭다운
    const btn = $('#plSortBtn'), menu = $('#plSortMenu'), label = $('#plSortLabel');
    btn.addEventListener('click', () => {
      const open = !menu.hidden;
      menu.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
    });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('[role="option"]'); if (!li) return;
      state.sort = li.dataset.v;
      label.textContent = li.textContent.trim();
      menu.querySelectorAll('[role="option"]').forEach(x => x.setAttribute('aria-selected', String(x === li)));
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false');
      load();
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !e.target.closest('.pl-field.select')) { menu.hidden = true; btn.setAttribute('aria-expanded','false'); }
    });

    // FAB
    $('#fabNew').addEventListener('click', () => location.href = 'portfolio-new.html');
  }

  // ----------- load -----------
  async function load() {
    try {
      const base = EP.split('?')[0]; // 안전
      const q = new URLSearchParams({
        page: 1,
        limit: 40,
        status: 'published',
        sort: state.sort,
        key: state.key
      });
      const url = `${API}${base}?${q.toString()}`;
      const r = await fetch(url, { headers });
      const j = await r.json().catch(() => ({}));

      const items = j.items || j.data || j.docs || [];
      state.items = items;
      render();
    } catch (err) {
      console.warn('[portfolio load]', err);
      state.items = [];
      render();
      window.UI?.toast?.('목록을 불러오지 못했습니다');
    }
  }

  // boot
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => { wire(); load(); }, { once: true })
    : (wire(), load());
})();