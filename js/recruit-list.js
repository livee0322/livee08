/* public/js/recruit-list.js — v3.0.0
 * - API_BASE/endpoint 구성 신뢰
 * - published 기본 필터
 * - 다양한 응답형 파싱
 * - 안전한 페이징/에러 처리
 * - AD 한 개 노출
 */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '').replace(/\/$/, '');
  const EP = (CFG.endpoints || {});
  const RECRUIT_BASE = (EP.recruitBase || '/recruit-test').replace(/^\/*/, '/'); // '/recruit-test'

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const HJSON = { Accept: 'application/json' }; // 공개 목록은 토큰 필요 없음
  function joinUrl(base, path) {
    return base + (path.startsWith('/') ? path : '/' + path);
  }
  function buildQS(params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    return sp.toString();
  }
  async function getJSON(url) {
    const r = await fetch(url, { headers: HJSON });
    let j = null;
    try { j = await r.json(); } catch {}
    if (!r.ok || (j && j.ok === false)) {
      const msg = (j && (j.message || j.error)) || ('HTTP_' + r.status);
      throw new Error(msg);
    }
    return j || {};
  }
  // 다양한 응답형 흡수
  function parseItems(j) {
    if (Array.isArray(j)) return j;
    if (Array.isArray(j.items)) return j.items;
    if (j.data) {
      if (Array.isArray(j.data.items)) return j.data.items;
      if (Array.isArray(j.data.docs))  return j.data.docs;
      if (Array.isArray(j.data))       return j.data;
    }
    if (Array.isArray(j.docs)) return j.docs;
    if (Array.isArray(j.results)) return j.results;
    return [];
  }
  function readTotal(j, itemsFallback = 0) {
    if (typeof j.total === 'number') return j.total;
    if (j.data && typeof j.data.total === 'number') return j.data.total;
    if (j.data && typeof j.data.count === 'number') return j.data.count;
    if (typeof j.count === 'number') return j.count;
    return itemsFallback; // 안전 fallback
  }

  const money = (n) => (n == null ? '' : Number(n).toLocaleString('ko-KR'));
  const pad2  = (n) => String(n).padStart(2, '0');
  const fmt   = (iso) => {
    if (!iso) return '미정';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const pickThumb = (o) =>
    o?.mainThumbnailUrl ||
    o?.thumbnailUrl ||
    (Array.isArray(o?.subThumbnails) && o.subThumbnails[0]) ||
    o?.coverImageUrl ||
    (CFG.placeholderThumb || 'default.jpg');

  // ---------- state ----------
  const urlq = new URLSearchParams(location.search);
  const state = {
    page: Number(urlq.get('page') || 1),
    limit: 10,
    sort: urlq.get('sort') || 'recent',
    query: urlq.get('query') || '',
    filters: {
      region: urlq.get('region') || '',
      district: urlq.get('district') || '',
      payMin: urlq.get('payMin') || '',
      payMax: urlq.get('payMax') || '',
      negotiable: urlq.get('negotiable') || '',
      closeIn: urlq.get('closeIn') || ''
    }
  };

  // ---------- bookmarks (local only) ----------
  const BM_KEY = 'livee_bookmarks';
  const loadBM = () => {
    try { return new Set(JSON.parse(localStorage.getItem(BM_KEY) || '[]')); }
    catch { return new Set(); }
  };
  const saveBM = (set) => localStorage.setItem(BM_KEY, JSON.stringify([...set]));
  let bm = loadBM();

  // ---------- query build ----------
  function buildQueryParams() {
    const f = state.filters;
    const p = {
      // 백엔드 차이를 흡수하기 위해 limit/skip 과 page 모두 제공
      limit: state.limit,
      skip: (state.page - 1) * state.limit,
      page: state.page,
      sort: state.sort,
      status: 'published' // 기본 공개 공고만
    };
    if (state.query) p.query = state.query;
    if (f.region) p.region = f.region;
    if (f.district) p.district = f.district;
    if (f.payMin) p.payMin = f.payMin;
    if (f.payMax) p.payMax = f.payMax;
    if (f.negotiable) p.negotiable = 1;
    if (f.closeIn) p.closeIn = f.closeIn;
    return p;
  }

  // ---------- fetch ----------
  async function fetchRecruits() {
    const url = joinUrl(API_BASE, RECRUIT_BASE) + '?' + buildQS(buildQueryParams());
    const j = await getJSON(url);
    const items = parseItems(j);
    const total = readTotal(j, items.length);
    return { items, total };
  }

  // ---------- AD pick ----------
  function pickTopAd(items) {
    if (!items || !items.length) return null;
    const i = Math.floor(Math.random() * items.length);
    const ad = { ...items[i], isAd: true };
    const rest = items.filter((_, idx) => idx !== i);
    return { ad, rest };
  }

  // ---------- templates ----------
  const listEl  = $('#rlList');
  const topAdEl = $('#rlTopAd');
  const pagerEl = $('#rlPager');
  const chipsEl = $('#rlChips');

  const feeText = (v, nego) => (nego ? '협의' : v != null ? `${money(v)}원` : '출연료 미정');

  function statusBadge(r) {
    const now = Date.now();
    const d = r.closeAt ? new Date(r.closeAt).getTime() : null;
    if (d && d < now) return `<span class="badge">마감</span>`;
    return `<span class="badge ok"><i class="ri-checkbox-circle-line"></i> 모집중</span>`;
  }

  function cardHTML(r) {
    const id = r.id || r._id;
    const bookmarked = bm.has(String(id));
    const thumb = pickThumb(r);
    const brand = r.brandName || (r.brand && r.brand.name) || '브랜드';
    const title = r.title || '제목 없음';
    const sum = r.summary || r.descriptionText || r.description || '요약 정보가 없습니다.';
    const fee = feeText(r.pay ?? r.fee, r.payNegotiable ?? r.feeNegotiable);

    return `
      <article class="card" data-id="${id}">
        <div class="card-head">
          <img class="thumb" src="${thumb}" alt="">
        </div>
        <div class="badges">${statusBadge(r)} <span class="badge">${brand}</span></div>
        <div class="title">${title}</div>
        <div class="summary">${sum}</div>
        <div class="meta">마감 ${fmt(r.closeAt)} · ${fee}</div>
        <div class="actions">
          <button class="btn small icon bm" aria-label="북마크">
            <i class="${bookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
          </button>
          <button class="btn small icon to" aria-label="상세보기">
            <i class="ri-external-link-line"></i> 상세보기
          </button>
          <button class="btn small pri apply" aria-label="지원하기">
            <i class="ri-send-plane-line"></i> 지원하기
          </button>
        </div>
      </article>
    `;
  }

  function adHTML(ad) {
    const thumb = pickThumb(ad);
    const fee = feeText(ad.pay ?? ad.fee, ad.payNegotiable ?? ad.feeNegotiable);
    return `
      <article class="adcard">
        <span class="ad-badge">AD</span>
        <img class="ad-thumb" src="${thumb}" alt="">
        <div class="ad-copy">
          <div class="ad-title">${ad.title || '스폰서 공고'}</div>
          <div class="ad-meta">${ad.brandName || '브랜드'} · ${fee} · 마감 ${fmt(ad.closeAt)}</div>
        </div>
        <div class="ad-cta">
          <a class="btn small pri" href="recruit-detail.html?id=${encodeURIComponent(ad.id || ad._id)}">바로 보기</a>
        </div>
      </article>
    `;
  }

  function renderChips() {
    const f = state.filters;
    const chips = [];
    const add = (k, v, fn) => {
      const id = 'chip_' + Math.random().toString(36).slice(2, 8);
      chips.push(`<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x" aria-label="${k} 제거">✕</button></span>`);
      queueMicrotask(() => {
        const x = document.getElementById(id);
        x && x.addEventListener('click', fn);
      });
    };

    if (state.query) add('검색', state.query, () => { state.query = ''; $('#rlQuery').value = ''; load(); });
    if (f.region) add('지역', f.region, () => { f.region = ''; load(); });
    if (f.district) add('구/군', f.district, () => { f.district = ''; load(); });
    if (f.payMin) add('최소', money(f.payMin), () => { f.payMin = ''; load(); });
    if (f.payMax) add('최대', money(f.payMax), () => { f.payMax = ''; load(); });
    if (f.negotiable) add('협의', '포함', () => { f.negotiable = ''; load(); });
    if (f.closeIn) add('마감', f.closeIn + '일 이내', () => { f.closeIn = ''; load(); });

    chipsEl.hidden = chips.length === 0;
    chipsEl.innerHTML = chips.join('');
  }

  function renderPager(total) {
    const pages = Math.max(1, Math.ceil(total / state.limit));
    const cur = Math.min(Math.max(1, state.page), pages);
    state.page = cur;

    const btn = (label, page, dis = false, on = false) =>
      `<button class="pbtn ${on ? 'on' : ''}" ${dis ? 'disabled' : ''} data-page="${page}">${label}</button>`;

    let html = '';
    html += btn('«', 1, cur === 1);
    html += btn('‹', Math.max(1, cur - 1), cur === 1);

    const span = 2;
    const s = Math.max(1, cur - span), e = Math.min(pages, cur + span);
    for (let i = s; i <= e; i++) html += btn(i, i, false, i === cur);

    html += btn('›', Math.min(pages, cur + 1), cur === pages);
    html += btn('»', pages, cur === pages);
    pagerEl.innerHTML = html;

    pagerEl.onclick = (e) => {
      const b = e.target.closest('.pbtn'); if (!b) return;
      const p = Number(b.dataset.page); if (!p || p === state.page) return;
      state.page = p;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // ---------- actions ----------
  function bindCardActions() {
    listEl.addEventListener('click', (e) => {
      const card = e.target.closest('.card'); if (!card) return;
      const id = card.getAttribute('data-id');

      if (e.target.closest('.to')) {
        location.href = 'recruit-detail.html?id=' + encodeURIComponent(id);
        return;
      }
      if (e.target.closest('.bm')) {
        const key = String(id);
        if (bm.has(key)) bm.delete(key); else bm.add(key);
        saveBM(bm);
        const icon = card.querySelector('.bm i');
        if (icon) icon.className = bm.has(key) ? 'ri-bookmark-fill' : 'ri-bookmark-line';
        UI.toast(bm.has(key) ? '북마크에 저장' : '북마크 해제');
        return;
      }
      if (e.target.closest('.apply')) {
        if (window.openApplyModal) window.openApplyModal(id);
        else UI.toast('지원 모달 준비중');
        return;
      }
    }, { passive: true });
  }

  function bindFilters() {
    $('#rlBtnFilter').onclick = () => UI.openDrawer('rlDrawer');
    $('#rlFilterClose').onclick = () => UI.closeDrawer('rlDrawer');

    $('#rlFilterReset').onclick = () => {
      state.filters = { region: '', district: '', payMin: '', payMax: '', negotiable: '', closeIn: '' };
      $('#fRegion').value = ''; $('#fDistrict').value = '';
      $('#fPayMin').value = ''; $('#fPayMax').value = '';
      $('#fNegotiable').checked = false; $('#fCloseIn').value = '';
      renderChips();
    };

    $('#rlFilterApply').onclick = () => {
      state.filters.region = $('#fRegion').value.trim();
      state.filters.district = $('#fDistrict').value.trim();
      state.filters.payMin = $('#fPayMin').value.trim();
      state.filters.payMax = $('#fPayMax').value.trim();
      state.filters.negotiable = $('#fNegotiable').checked ? 1 : '';
      state.filters.closeIn = $('#fCloseIn').value;
      state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      UI.closeDrawer('rlDrawer');
      load();
    };
  }

  function bindToolbar() {
    // 정렬
    $('#rlSort').value = state.sort;
    $('#rlSort').onchange = () => {
      state.sort = $('#rlSort').value;
      state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      load();
    };

    // 검색 (아이콘/엔터)
    const q = $('#rlQuery'); const go = $('#rlSearchGo');
    q.value = state.query || '';
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    go.addEventListener('click', doSearch);

    function doSearch() {
      state.query = q.value.trim();
      state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      load();
    }
  }

  // ---------- loader ----------
  async function load() {
    // 스켈레톤
    listEl.innerHTML = `<div class="card skeleton"></div><div class="card skeleton"></div><div class="card skeleton"></div>`;
    renderChips();

    try {
      const { items, total } = await fetchRecruits();
      $('#rlTotal').textContent = `총 ${total}건`;

      // AD
      topAdEl.hidden = true;
      let list = items;
      const picked = pickTopAd(items);
      if (picked) { topAdEl.innerHTML = adHTML(picked.ad); topAdEl.hidden = false; list = picked.rest; }

      listEl.innerHTML = list.length
        ? list.map(cardHTML).join('')
        : `<div class="card"><div class="title">표시할 공고가 없습니다</div><div class="summary">검색어나 필터를 조정해보세요.</div></div>`;

      renderPager(total);
    } catch (e) {
      console.warn('[recruit-list] fetch error:', e);
      $('#rlTotal').textContent = '총 0건';
      topAdEl.hidden = true;
      listEl.innerHTML =
        `<div class="card"><div class="title">데이터를 불러오지 못했습니다</div><div class="summary">잠시 후 다시 시도해주세요.</div></div>`;
      renderPager(1);
    }
  }

  // ---------- init ----------
  bindToolbar();
  bindFilters();
  bindCardActions();
  load();
})();