/* recruit-list.js — v3.0.0 (config 기반, -test 기본 + 안전 폴백, 레이스 방지) */
(function () {
  'use strict';

  // ---- helpers ----
  const $ = (s, el = document) => el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const RECRUIT_BASE = EP.recruitBase || '/recruit-test'; // 쿼리 전용 베이스
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const HJSON = (json = true) => {
    const h = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };
  async function getJSON(url, signal) {
    const r = await fetch(url, { headers: HJSON(false), signal });
    let j = null;
    try {
      j = await r.json();
    } catch {}
    if (!r.ok || (j && j.ok === false))
      throw new Error((j && j.message) || 'HTTP_' + r.status);
    return j || {};
  }
  const parseItems = (j) =>
    Array.isArray(j) ? j : j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || [];
  const readTotal = (j) => j.total ?? (j.data && (j.data.total ?? j.data.count)) ?? 0;
  const money = (n) => (n == null ? '' : Number(n).toLocaleString('ko-KR'));
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (iso) => {
    if (!iso) return '미정';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const pickThumb = (o) =>
    o?.mainThumbnailUrl ||
    o?.thumbnailUrl ||
    (Array.isArray(o?.subThumbnails) && o.subThumbnails[0]) ||
    o?.coverImageUrl ||
    o?.imageUrl ||
    o?.thumbUrl ||
    (CFG.placeholderThumb || 'default.jpg');
  const getId = (o) => o?.id || o?._id;

  // ---- state ----
  const q0 = new URLSearchParams(location.search);
  const state = {
    page: Number(q0.get('page') || 1),
    limit: 10,
    sort: q0.get('sort') || 'recent', // recent | deadline | popular
    query: q0.get('query') || '',
    filters: {
      region: q0.get('region') || '',
      district: q0.get('district') || '',
      payMin: q0.get('payMin') || '',
      payMax: q0.get('payMax') || '',
      negotiable: q0.get('negotiable') || '',
      closeIn: q0.get('closeIn') || '',
    },
  };

  // ---- bookmarks (local) ----
  const BM_KEY = 'livee_bookmarks';
  const loadBM = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(BM_KEY) || '[]'));
    } catch {
      return new Set();
    }
  };
  const saveBM = (set) => localStorage.setItem(BM_KEY, JSON.stringify([...set]));
  let bm = loadBM();

  // ---- sort mapping ----
  const sortToServer = (s) => {
    if (s === 'deadline') return 'closeAt'; // asc(기본 오름차순 가정)
    if (s === 'popular') return '-applicationsCount';
    return '-createdAt';
  };

  // ---- query build ----
  function buildQuery() {
    const p = new URLSearchParams();
    p.set('limit', state.limit);
    p.set('skip', (state.page - 1) * state.limit);
    p.set('sort', sortToServer(state.sort));
    // published 기본
    p.set('status', 'published');
    if (state.query) p.set('query', state.query);
    const f = state.filters;
    if (f.region) p.set('region', f.region);
    if (f.district) p.set('district', f.district);
    if (f.payMin) p.set('payMin', f.payMin);
    if (f.payMax) p.set('payMax', f.payMax);
    if (f.negotiable) p.set('negotiable', 1);
    if (f.closeIn) p.set('closeIn', f.closeIn);
    return p.toString();
  }

  // ---- fetch (config 베이스 + 안전 폴백) ----
  async function fetchRecruits(signal) {
    const qs = buildQuery();
    const urlA = `${API_BASE}${RECRUIT_BASE}?${qs}`;
    try {
      const j = await getJSON(urlA, signal);
      return { items: parseItems(j), total: readTotal(j) };
    } catch (e) {
      // (옵션) -test → non-test 폴백
      const non = RECRUIT_BASE.replace('-test', '');
      if (non !== RECRUIT_BASE) {
        const urlB = `${API_BASE}${non}?${qs}`;
        const j = await getJSON(urlB, signal);
        return { items: parseItems(j), total: readTotal(j) };
      }
      throw e;
    }
  }

  // ---- AD ----
  function pickTopAd(items) {
    if (!items || !items.length) return null;
    const idx = Math.floor(Math.random() * items.length);
    const ad = { ...items[idx], isAd: true, adLabel: 'AD 스폰서' };
    const rest = items.filter((_, i) => i !== idx);
    return { ad, rest };
  }

  // ---- render ----
  const listEl = $('#rlList');
  const topAdEl = $('#rlTopAd');
  const pagerEl = $('#rlPager');
  const chipsEl = $('#rlChips');
  const totalEl = $('#rlTotal');

  const feeText = (v, nego) => (nego ? '협의' : v != null ? money(v) + '원' : '출연료 미정');
  function statusBadge(r) {
    const now = Date.now();
    const d = r.closeAt ? new Date(r.closeAt).getTime() : null;
    if (d && d < now) return `<span class="badge">마감</span>`;
    return `<span class="badge ok"><i class="ri-checkbox-circle-line"></i> 모집중</span>`;
  }

  function cardHTML(r) {
    const id = getId(r);
    const thumb = pickThumb(r);
    const fee = feeText(r.pay ?? r.fee, r.payNegotiable ?? r.feeNegotiable);
    const title = r.title || '제목 없음';
    const sum = strip(r.summary || r.description || r.descriptionText || r.descriptionHTML || '요약 정보가 없습니다.');
    const brand = r.brandName || '브랜드';
    const bookmarked = bm.has(String(id));

    return `
      <article class="card" data-id="${id}">
        <div class="card-head"><img class="thumb" src="${thumb}" alt=""></div>
        <div class="badges">${statusBadge(r)} <span class="badge">${brand}</span></div>
        <div class="title">${title}</div>
        <div class="summary">${sum}</div>
        <div class="meta">마감 ${fmt(r.closeAt)} · ${fee}</div>
        <div class="actions">
          <button class="btn small icon bm" aria-label="북마크">
            <i class="${bookmarked ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i> 북마크
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
    const id = getId(ad);
    const thumb = pickThumb(ad);
    const fee = feeText(ad.pay ?? ad.fee, ad.payNegotiable ?? ad.feeNegotiable);
    return `
      <article class="adcard">
        <span class="ad-badge">AD</span>
        <img class="ad-thumb" src="${thumb}" alt="">
        <div>
          <div class="ad-title">${ad.title || '스폰서 공고'}</div>
          <div class="ad-meta">${ad.brandName || '브랜드'} · ${fee} · 마감 ${fmt(ad.closeAt)}</div>
        </div>
        <div class="ad-cta">
          <a class="btn small pri" href="recruit-detail.html?id=${encodeURIComponent(id)}">바로 보기</a>
        </div>
      </article>
    `;
  }

  function renderChips() {
    const f = state.filters;
    const chips = [];
    if (state.query) chips.push(chip('검색', state.query, () => { state.query = ''; $('#rlQuery').value = ''; load(); }));
    if (f.region) chips.push(chip('지역', f.region, () => { f.region = ''; load(); }));
    if (f.district) chips.push(chip('구/군', f.district, () => { f.district = ''; load(); }));
    if (f.payMin) chips.push(chip('최소', money(f.payMin), () => { f.payMin = ''; load(); }));
    if (f.payMax) chips.push(chip('최대', money(f.payMax), () => { f.payMax = ''; load(); }));
    if (f.negotiable) chips.push(chip('협의', '포함', () => { f.negotiable = ''; load(); }));
    if (f.closeIn) chips.push(chip('마감', f.closeIn + '일 이내', () => { f.closeIn = ''; load(); }));

    if (chips.length) { chipsEl.innerHTML = chips.join(''); chipsEl.hidden = false; }
    else { chipsEl.hidden = true; chipsEl.innerHTML = ''; }

    function chip(k, v, onX) {
      const id = 'chip_' + Math.random().toString(36).slice(2, 8);
      queueMicrotask(() => {
        const x = document.getElementById(id);
        x && x.addEventListener('click', onX);
      });
      return `<span class="chip"><b>${k}</b> ${v} <button id="${id}" class="x" aria-label="${k} 제거">✕</button></span>`;
    }
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
    const s = Math.max(1, cur - span),
      e = Math.min(pages, cur + span);
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

  // ---- actions ----
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
        else {
          if (!TOKEN) { location.href = 'login.html?returnTo=' + encodeURIComponent(location.pathname + location.search); return; }
          UI.toast('지원 모달 준비중');
        }
      }
    }, { passive: true });
  }

  function bindFilters() {
    $('#rlBtnFilter')?.addEventListener('click', () => UI.openDrawer('rlDrawer'));
    $('#rlFilterClose')?.addEventListener('click', () => UI.closeDrawer('rlDrawer'));

    $('#rlFilterReset')?.addEventListener('click', () => {
      state.filters = { region: '', district: '', payMin: '', payMax: '', negotiable: '', closeIn: '' };
      $('#fRegion') && ($('#fRegion').value = '');
      $('#fDistrict') && ($('#fDistrict').value = '');
      $('#fPayMin') && ($('#fPayMin').value = '');
      $('#fPayMax') && ($('#fPayMax').value = '');
      $('#fNegotiable') && ($('#fNegotiable').checked = false);
      $('#fCloseIn') && ($('#fCloseIn').value = '');
      renderChips();
    });

    $('#rlFilterApply')?.addEventListener('click', () => {
      state.filters.region = $('#fRegion')?.value.trim() || '';
      state.filters.district = $('#fDistrict')?.value.trim() || '';
      state.filters.payMin = $('#fPayMin')?.value.trim() || '';
      state.filters.payMax = $('#fPayMax')?.value.trim() || '';
      state.filters.negotiable = $('#fNegotiable')?.checked ? 1 : '';
      state.filters.closeIn = $('#fCloseIn')?.value || '';
      state.page = 1;
      UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
      UI.closeDrawer('rlDrawer');
      load();
    });
  }

  function bindToolbar() {
    const sortSel = $('#rlSort');
    const qInput = $('#rlQuery');
    const sBtn = $('#rlBtnSearch');

    if (sortSel) {
      sortSel.value = state.sort;
      sortSel.onchange = () => {
        state.sort = sortSel.value;
        state.page = 1;
        UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
        load();
      };
    }
    if (qInput) {
      qInput.value = state.query;
      const doSearch = () => {
        state.query = qInput.value.trim();
        state.page = 1;
        UI.setQs({ ...state.filters, query: state.query, sort: state.sort, page: state.page });
        load();
      };
      sBtn && (sBtn.onclick = doSearch);
      qInput.addEventListener('keydown', (e) => e.key === 'Enter' && doSearch());
    }
  }

  // ---- main loader (Abort race safe) ----
  let inflight = null;
  async function load() {
    // 스켈레톤
    if (listEl) listEl.innerHTML = `<div class="card skeleton"></div><div class="card skeleton"></div><div class="card skeleton"></div>`;
    renderChips();
    totalEl && (totalEl.textContent = '');

    if (inflight) inflight.abort();
    inflight = new AbortController();
    const { signal } = inflight;

    try {
      const { items, total } = await fetchRecruits(signal);
      totalEl && (totalEl.textContent = `총 ${total}건`);

      // AD
      let list = items;
      if (topAdEl) {
        topAdEl.hidden = true;
        const picked = pickTopAd(items);
        if (picked) {
          topAdEl.innerHTML = adHTML(picked.ad);
          topAdEl.hidden = false;
          list = picked.rest;
        }
      }

      listEl.innerHTML =
        (list && list.length ? list.map(cardHTML).join('') : `<div class="card"><div class="title">표시할 공고가 없습니다</div><div class="summary">검색어나 필터를 조정해보세요.</div></div>`);
      renderPager(total);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.warn('[recruit-list] load error', e);
      listEl.innerHTML = `<div class="card"><div class="title">데이터를 불러오지 못했습니다</div><div class="summary">잠시 후 다시 시도해주세요.</div></div>`;
      renderPager(1);
    } finally {
      inflight = null;
    }
  }

  // ---- init ----
  bindToolbar();
  bindFilters();
  bindCardActions();
  load();
})();