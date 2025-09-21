/* byhen-admin.js — v2.4 (robust bindings + upload fix + schema aligned) */
(function () {
  'use strict';

  // ---------- Config ----------
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const EP = CFG.endpoints || {};
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');
  const SIGN_EP = (EP.uploadsSignature || '/uploads/signature').replace(/^\/*/, '/');

  // Cloudinary 변환 프리셋
  const THUMB = {
    main:  CFG.thumb?.cover169 || 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square:CFG.thumb?.square   || 'c_fill,g_auto,w_600,h_600,f_auto,q_auto'
  };

  // ---------- DOM Helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  const toast = (msg, ok=false) => {
    let t = document.getElementById('__toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '__toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:12px;font-weight:800;z-index:9999;transition:opacity .2s;opacity:0;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = ok ? '#065f46' : '#111827';
    t.style.opacity = '1';
    clearTimeout(t._to);
    t._to = setTimeout(() => (t.style.opacity = '0'), 1400);
  };

  // 파일 input/미리보기/그리드
  const el = {};
  function cacheDom() {
    el.id            = new URLSearchParams(location.search).get('id') || '';
    el.name          = $('#name');
    el.slug          = $('#slug');
    el.status        = $('#status'); // 선택값이 있으면 사용

    el.mainFile      = $('#mainFile');
    el.mainPrev      = $('#mainPrev');

    el.subsFile      = $('#subsFile');
    el.subsGrid      = $('#subsGrid');

    el.galFile       = $('#galFile');
    el.galGrid       = $('#galGrid');

    el.hours         = $('#hours');
    el.timeslots     = $('#timeslots');
    el.availDates    = $('#availDates');

    el.phone         = $('#phone');
    el.email         = $('#email');
    el.kakao         = $('#kakao');

    el.address       = $('#address');
    el.intro         = $('#intro');
    el.guide         = $('#guide');
    el.pricing       = $('#pricing');

    el.publishBtn    = $('#publishBtn');
    el.saveBtn       = $('#saveDraftBtn');

    // 트리거(여러 형태 지원)
    el.mainTrig      = $('#mainTrigger');
    el.subsTrig      = $('#subsTrigger');
    el.galTrig       = $('#galTrigger');
  }

  // ---------- Cloudinary upload ----------
  const withTr = (url, t) => {
    try {
      if (!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0, i + 8) + t + '/' + url.slice(i + 8);
    } catch { return url || ''; }
  };

  async function getSignature() {
    const r = await fetch(API_BASE + SIGN_EP, { headers: { Accept: 'application/json' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    const d = j.data || j;
    if (!d.cloudName || !d.apiKey || !d.signature || !d.timestamp) {
      throw new Error('Invalid signature payload');
    }
    return d;
  }

  async function uploadImage(file) {
    if (!file) throw new Error('no file');
    if (!/^image\//.test(file.type)) throw new Error('이미지 파일만 업로드');
    if (file.size > 10 * 1024 * 1024) throw new Error('최대 10MB');

    const sig = await getSignature();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.apiKey);
    fd.append('timestamp', sig.timestamp);
    fd.append('signature', sig.signature);

    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
    const res = await fetch(url, { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.secure_url) throw new Error(j.error?.message || '업로드 실패');
    return j.secure_url;
  }

  // ---------- State ----------
  const state = {
    uploads: 0,
    doc: {
      // Brand schema
      type: 'brand',
      status: 'draft',
      name: '',
      slug: '',
      thumbnail: '',
      subThumbnails: [],
      gallery: [],
      intro: '',
      usageGuide: '',
      priceInfo: '',
      address: '',
      availableHours: '',
      timeslots: [],         // ['10:00','14:00']
      availableDates: [],    // ['2025-09-22']
      contact: { phone: '', email: '', kakao: '' }
    }
  };
  const bump = (n) => { state.uploads = Math.max(0, state.uploads + n); };

  // ---------- UI Bindings ----------
  function bindPickers() {
    // 트리거 → 파일 input 클릭
    document.body.addEventListener('click', (e) => {
      const trg = e.target.closest('[data-pick], #mainTrigger, #subsTrigger, #galTrigger');
      if (!trg) return;
      const key = trg.getAttribute('data-pick') ||
                  (trg.id === 'mainTrigger' ? 'main' : trg.id === 'subsTrigger' ? 'subs' :
                   trg.id === 'galTrigger' ? 'gal' : '');
      if (!key) return;
      ({ main: el.mainFile, subs: el.subsFile, gal: el.galFile }[key])?.click();
    });

    // 메인 썸네일 업로드
    on(el.mainFile, 'change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const local = URL.createObjectURL(f);
      el.mainPrev.src = local; el.mainPrev.style.display = 'block';
      bump(+1);
      try {
        toast('메인 업로드 중…');
        const u = await uploadImage(f);
        state.doc.thumbnail = withTr(u, THUMB.main);
        el.mainPrev.src = state.doc.thumbnail;
        toast('메인 업로드 완료', true);
      } catch (err) {
        toast('메인 업로드 실패: ' + (err.message || '오류'));
      } finally {
        bump(-1);
        URL.revokeObjectURL(local);
        e.target.value = '';
      }
    });

    // 서브 썸네일 여러 장
    on(el.subsFile, 'change', async (e) => {
      const files = [...(e.target.files || [])].slice(0, 5 - state.doc.subThumbnails.length);
      for (const f of files) {
        if (!/^image\//.test(f.type)) continue;
        bump(+1);
        try {
          const u = await uploadImage(f);
          state.doc.subThumbnails.push(withTr(u, THUMB.square));
          drawSubs();
        } catch (err) {
          toast('서브 업로드 실패: ' + (err.message || '오류'));
        } finally { bump(-1); }
      }
      e.target.value = '';
    });

    // 서브 삭제
    on(el.subsGrid, 'click', (e) => {
      const b = e.target.closest('.rm'); if (!b) return;
      const i = Number(b.dataset.i);
      state.doc.subThumbnails.splice(i, 1);
      drawSubs();
    });

    // 갤러리 여러 장
    on(el.galFile, 'change', async (e) => {
      const files = [...(e.target.files || [])];
      for (const f of files) {
        if (!/^image\//.test(f.type)) continue;
        bump(+1);
        try {
          const u = await uploadImage(f);
          state.doc.gallery.push(withTr(u, THUMB.square));
          drawGallery();
        } catch (err) {
          toast('갤러리 업로드 실패: ' + (err.message || '오류'));
        } finally { bump(-1); }
      }
      e.target.value = '';
    });

    // 갤러리 삭제
    on(el.galGrid, 'click', (e) => {
      const b = e.target.closest('.rm'); if (!b) return;
      const i = Number(b.dataset.i);
      state.doc.gallery.splice(i, 1);
      drawGallery();
    });
  }

  function drawSubs() {
    if (!el.subsGrid) return;
    el.subsGrid.innerHTML = state.doc.subThumbnails.map((u, i) => `
      <div class="thumb"><img src="${u}" alt="sub-${i}"><button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button></div>
    `).join('');
  }

  function drawGallery() {
    if (!el.galGrid) return;
    el.galGrid.innerHTML = state.doc.gallery.map((u, i) => `
      <div class="thumb"><img src="${u}" alt="gal-${i}"><button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button></div>
    `).join('');
  }

  // ---------- Load / Fill ----------
  async function loadIfEdit() {
    if (!el.id) return;
    try {
      const r = await fetch(`${API_BASE}${BRAND_BASE}/${el.id}`, { headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      const d = j.data || j;

      // fill state
      Object.assign(state.doc, {
        status: d.status || 'draft',
        name: d.name || '',
        slug: d.slug || '',
        thumbnail: d.thumbnail || '',
        subThumbnails: Array.isArray(d.subThumbnails) ? d.subThumbnails : [],
        gallery: Array.isArray(d.gallery) ? d.gallery : [],
        intro: d.intro || '',
        usageGuide: d.usageGuide || '',
        priceInfo: d.priceInfo || '',
        address: d.address || '',
        availableHours: d.availableHours || '',
        timeslots: Array.isArray(d.timeslots) ? d.timeslots : [],
        availableDates: Array.isArray(d.availableDates) ? d.availableDates : [],
        contact: {
          phone: d.contact?.phone || '',
          email: d.contact?.email || '',
          kakao: d.contact?.kakao || ''
        }
      });

      // fill UI
      if (el.status) el.status.value = state.doc.status;
      if (el.name)   el.name.value   = state.doc.name;
      if (el.slug)   el.slug.value   = state.doc.slug;

      if (state.doc.thumbnail) { el.mainPrev.src = state.doc.thumbnail; el.mainPrev.style.display = 'block'; }
      drawSubs(); drawGallery();

      el.hours.value      = state.doc.availableHours || '';
      el.timeslots.value  = (state.doc.timeslots || []).join(', ');
      el.availDates.value = (state.doc.availableDates || []).join(', ');

      el.phone.value  = state.doc.contact.phone || '';
      el.email.value  = state.doc.contact.email || '';
      el.kakao.value  = state.doc.contact.kakao || '';

      el.address.value = state.doc.address || '';
      el.intro.value   = state.doc.intro || '';
      el.guide.value   = state.doc.usageGuide || '';
      el.pricing.value = state.doc.priceInfo || '';

    } catch (e) {
      toast('불러오기 실패: ' + (e.message || '오류'));
    }
  }

  // ---------- Save ----------
  function collect(status) {
    // 기본
    state.doc.name = el.name?.value?.trim() || '';
    state.doc.slug = (el.slug?.value || '').toLowerCase().trim();
    state.doc.status = status || (el.status?.value || 'draft');

    // 가능 시간/타임/가능일
    state.doc.availableHours = el.hours?.value?.trim() || '';
    state.doc.timeslots = (el.timeslots?.value || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    state.doc.availableDates = (el.availDates?.value || '')
      .split(',').map(s => s.trim()).filter(Boolean);

    // 연락/주소/텍스트
    state.doc.contact = {
      phone: el.phone?.value?.trim() || '',
      email: el.email?.value?.trim() || '',
      kakao: el.kakao?.value?.trim() || ''
    };
    state.doc.address    = el.address?.value?.trim() || '';
    state.doc.intro      = el.intro?.value?.trim() || '';
    state.doc.usageGuide = el.guide?.value?.trim() || '';
    state.doc.priceInfo  = el.pricing?.value?.trim() || '';

    return state.doc;
  }

  async function submit(status) {
    if (state.uploads > 0) { toast('이미지 업로드 중입니다. 잠시 후 시도'); return; }
    const doc = collect(status);

    if (!doc.name) return toast('브랜드명을 입력하세요');
    if (!doc.slug) return toast('슬러그를 입력하세요');

    try {
      const url = el.id ? `${API_BASE}${BRAND_BASE}/${el.id}` : `${API_BASE}${BRAND_BASE}`;
      const method = el.id ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(doc)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      toast(el.id ? '수정 완료' : '등록 완료', true);
      if (!el.id) {
        // 신규 생성 시 id 갱신
        const newId = (j.data || j)._id;
        if (newId) location.replace(location.pathname + '?id=' + encodeURIComponent(newId));
      }
    } catch (e) {
      toast('저장 실패: ' + (e.message || '오류'));
    }
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindPickers();
    loadIfEdit();

    on(el.publishBtn, 'click', (e) => { e.preventDefault(); submit('published'); });
    on(el.saveBtn,    'click', (e) => { e.preventDefault(); submit('draft'); });

    // 혹시 트리거 버튼이 없을 때도 대비: data-pick 사용 권장
    if (el.mainTrig) el.mainTrig.setAttribute('data-pick', 'main');
    if (el.subsTrig) el.subsTrig.setAttribute('data-pick', 'subs');
    if (el.galTrig)  el.galTrig.setAttribute('data-pick', 'gal');
  });
})();