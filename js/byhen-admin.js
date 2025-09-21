/* byhen-admin.js — v3.0
   - HTML id 매칭: thumbTrigger/thumbFile/thumbPrev, subsTrigger/subsFile/subsGrid, galleryTrigger/galleryFile/galleryGrid
   - Cloudinary 서명 응답( {ok:true,data:{...}} 또는 루트 ) 모두 지원
   - 업로드 즉시 미리보기, 삭제, 드래프트/발행 저장
   - Brand 스키마 일치
*/
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
  const SIGN_EP    = (EP.uploadsSignature || '/uploads/signature').replace(/^\/*/, '/');

  // Cloudinary 변환 프리셋
  const THUMB = {
    main:   CFG.thumb?.cover169 || 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square: CFG.thumb?.square   || 'c_fill,g_auto,w_600,h_600,f_auto,q_auto'
  };

  // ---------- Helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const say = (msg, ok = false) => {
    const box = $('#admMsg');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
    box.classList.toggle('ok', !!ok);
  };

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
    // {ok:true,data:{cloudName,apiKey,timestamp,signature}} 또는 루트
    const d = j.data || j;
    const need = ['cloudName','apiKey','timestamp','signature'];
    if (!need.every(k => d && d[k])) throw new Error('Invalid signature payload');
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
  const qs = new URLSearchParams(location.search);
  const state = {
    id: qs.get('id') || '',
    uploads: 0,
    doc: {
      // Brand 스키마
      type: 'brand',
      status: 'draft',
      name: '',
      slug: '',
      thumbnail: '',
      subThumbnails: [],
      gallery: [],
      intro: '',
      description: '',
      usageGuide: '',
      priceInfo: '',
      contact: { phone: '', email: '', kakao: '' },
      address: '',
      map: { link: '' },
      availableHours: '',
      timeslots: [],
      availableDates: [],
      closed: [],
      booked: []
    }
  };
  const bump = (n) => { state.uploads = Math.max(0, state.uploads + n); };

  // ---------- DOM Cache ----------
  const el = {};
  function cacheDom() {
    el.form   = $('#brandForm');
    el.name   = $('#name');
    el.slug   = $('#slug');

    // 메인 썸네일
    el.thumbPrev    = $('#thumbPrev');
    el.thumbFile    = $('#thumbFile');
    el.thumbTrigger = $('#thumbTrigger');

    // 서브 썸네일
    el.subsFile     = $('#subsFile');
    el.subsTrigger  = $('#subsTrigger');
    el.subsGrid     = $('#subsGrid');

    // 소개/안내/금액
    el.intro        = $('#intro');
    el.description  = $('#description');
    el.usageGuide   = $('#usageGuide');
    el.priceInfo    = $('#priceInfo');

    // 연락/주소/지도
    el.phone        = $('#phone');
    el.email        = $('#email');
    el.kakao        = $('#kakao');
    el.address      = $('#address');
    el.mapLink      = $('#mapLink');

    // 갤러리
    el.galleryFile     = $('#galleryFile');
    el.galleryTrigger  = $('#galleryTrigger');
    el.galleryGrid     = $('#galleryGrid');

    // 스케줄
    el.availableHours  = $('#availableHours');
    el.timeslots       = $('#timeslots');
    el.availableDates  = $('#availableDates');
    el.closed          = $('#closed');
    el.booked          = $('#booked');

    // 버튼
    el.publishBtn   = $('#publishBtn');
    el.saveDraftBtn = $('#saveDraftBtn');
    el.saveBtn      = $('#saveBtn');
  }

  // ---------- Drawers ----------
  function drawSubs() {
    if (!el.subsGrid) return;
    el.subsGrid.innerHTML = state.doc.subThumbnails.map((u, i) => `
      <div class="thumb">
        <img src="${u}" alt="sub-${i}">
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>
    `).join('');
  }
  function drawGallery() {
    if (!el.galleryGrid) return;
    el.galleryGrid.innerHTML = state.doc.gallery.map((u, i) => `
      <div class="thumb">
        <img src="${u}" alt="gal-${i}">
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>
    `).join('');
  }

  // ---------- Bindings ----------
  function bindEvents() {
    // triggers → input.click()
    el.thumbTrigger?.addEventListener('click', () => el.thumbFile?.click());
    el.subsTrigger?.addEventListener('click',  () => el.subsFile?.click());
    el.galleryTrigger?.addEventListener('click', () => el.galleryFile?.click());

    // main thumbnail upload
    el.thumbFile?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const local = URL.createObjectURL(f);
      el.thumbPrev.src = local; el.thumbPrev.style.display = 'block';
      bump(+1);
      try {
        say('메인 업로드 중…');
        const u = await uploadImage(f);
        state.doc.thumbnail = withTr(u, THUMB.main);
        el.thumbPrev.src = state.doc.thumbnail;
        say('메인 업로드 완료', true);
      } catch (err) {
        say('메인 업로드 실패: ' + (err.message || '오류'));
      } finally {
        bump(-1);
        URL.revokeObjectURL(local);
        e.target.value = '';
      }
    });

    // subs upload (multi)
    el.subsFile?.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])].slice(0, 5 - state.doc.subThumbnails.length);
      for (const f of files) {
        if (!/^image\//.test(f.type)) continue;
        bump(+1);
        try {
          const u = await uploadImage(f);
          state.doc.subThumbnails.push(withTr(u, THUMB.square));
          drawSubs();
        } catch (err) { say('서브 업로드 실패: ' + (err.message || '오류')); }
        finally { bump(-1); }
      }
      e.target.value = '';
    });

    // subs delete
    el.subsGrid?.addEventListener('click', (e) => {
      const b = e.target.closest('.rm'); if (!b) return;
      state.doc.subThumbnails.splice(Number(b.dataset.i), 1);
      drawSubs();
    });

    // gallery upload (multi)
    el.galleryFile?.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])];
      for (const f of files) {
        if (!/^image\//.test(f.type)) continue;
        bump(+1);
        try {
          const u = await uploadImage(f);
          state.doc.gallery.push(withTr(u, THUMB.square));
          drawGallery();
        } catch (err) { say('갤러리 업로드 실패: ' + (err.message || '오류')); }
        finally { bump(-1); }
      }
      e.target.value = '';
    });

    // gallery delete
    el.galleryGrid?.addEventListener('click', (e) => {
      const b = e.target.closest('.rm'); if (!b) return;
      state.doc.gallery.splice(Number(b.dataset.i), 1);
      drawGallery();
    });

    // save/publish
    el.saveDraftBtn?.addEventListener('click', (e) => { e.preventDefault(); submit('draft'); });
    el.saveBtn?.addEventListener('click',      (e) => { e.preventDefault(); submit('published'); });
    el.publishBtn?.addEventListener('click',   (e) => { e.preventDefault(); submit('published'); });
  }

  // ---------- Load existing (edit) ----------
  async function loadIfEdit() {
    if (!state.id) return;
    try {
      say('불러오는 중…');
      const r = await fetch(`${API_BASE}${BRAND_BASE}/${state.id}`, { headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      const d = j.data || j;

      // merge
      Object.assign(state.doc, {
        status: d.status || 'draft',
        name: d.name || '',
        slug: d.slug || '',
        thumbnail: d.thumbnail || '',
        subThumbnails: Array.isArray(d.subThumbnails) ? d.subThumbnails : [],
        gallery: Array.isArray(d.gallery) ? d.gallery : [],
        intro: d.intro || '',
        description: d.description || '',
        usageGuide: d.usageGuide || '',
        priceInfo: d.priceInfo || '',
        contact: {
          phone: d.contact?.phone || '',
          email: d.contact?.email || '',
          kakao: d.contact?.kakao || ''
        },
        address: d.address || '',
        map: { link: d.map?.link || '' },
        availableHours: d.availableHours || '',
        timeslots: Array.isArray(d.timeslots) ? d.timeslots : [],
        availableDates: Array.isArray(d.availableDates) ? d.availableDates : [],
        closed: Array.isArray(d.closed) ? d.closed : [],
        booked: Array.isArray(d.booked) ? d.booked : []
      });

      // fill UI
      el.name.value   = state.doc.name;
      el.slug.value   = state.doc.slug;
      if (state.doc.thumbnail) { el.thumbPrev.src = state.doc.thumbnail; el.thumbPrev.style.display = 'block'; }
      drawSubs(); drawGallery();
      el.intro.value        = state.doc.intro || '';
      el.description.value  = state.doc.description || '';
      el.usageGuide.value   = state.doc.usageGuide || '';
      el.priceInfo.value    = state.doc.priceInfo || '';
      el.phone.value        = state.doc.contact.phone || '';
      el.email.value        = state.doc.contact.email || '';
      el.kakao.value        = state.doc.contact.kakao || '';
      el.address.value      = state.doc.address || '';
      el.mapLink.value      = state.doc.map.link || '';
      el.availableHours.value = state.doc.availableHours || '';
      el.timeslots.value      = (state.doc.timeslots || []).join(', ');
      el.availableDates.value = (state.doc.availableDates || []).join(', ');
      el.closed.value         = (state.doc.closed || []).join(', ');
      el.booked.value         = (state.doc.booked || []).join(', ');
      say('로드 완료', true);
    } catch (e) {
      say('불러오기 실패: ' + (e.message || '오류'));
    }
  }

  // ---------- Collect & Save ----------
  function collect(status) {
    const doc = state.doc;

    doc.status = status || 'draft';
    doc.name   = el.name.value.trim();
    doc.slug   = el.slug.value.trim().toLowerCase();

    doc.intro        = el.intro.value.trim();
    doc.description  = el.description.value.trim();
    doc.usageGuide   = el.usageGuide.value.trim();
    doc.priceInfo    = el.priceInfo.value.trim();

    doc.contact = {
      phone: el.phone.value.trim(),
      email: el.email.value.trim(),
      kakao: el.kakao.value.trim()
    };
    doc.address = el.address.value.trim();
    doc.map = { link: el.mapLink.value.trim() };

    const csv = (v) => v.split(',').map(s => s.trim()).filter(Boolean);
    doc.availableHours = el.availableHours.value.trim();
    doc.timeslots      = csv(el.timeslots.value);
    doc.availableDates = csv(el.availableDates.value);
    doc.closed         = csv(el.closed.value);
    doc.booked         = csv(el.booked.value);

    return doc;
  }

  async function submit(status) {
    if (state.uploads > 0) { say('이미지 업로드 중입니다. 잠시 후 시도'); return; }
    const doc = collect(status);

    if (!doc.name) return say('브랜드명을 입력하세요');
    if (!doc.slug) return say('슬러그를 입력하세요');

    try {
      say(status === 'published' ? '발행 중…' : '저장 중…');
      const url = state.id ? `${API_BASE}${BRAND_BASE}/${state.id}` : `${API_BASE}${BRAND_BASE}`;
      const method = state.id ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(doc)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      say('완료되었습니다', true);

      if (!state.id) {
        const newId = (j.data || j)._id;
        if (newId) location.replace(location.pathname + '?id=' + encodeURIComponent(newId));
      }
    } catch (e) {
      say('저장 실패: ' + (e.message || '오류'));
    }
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    loadIfEdit();
  });
})();