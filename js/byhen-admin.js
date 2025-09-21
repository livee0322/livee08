/* byhen-admin.js — v1.2.0
   - Cloudinary 서버 서명(/uploads/signature)로 업로드
   - 업로드 완료 시 입력창에 URL 주입 + 미리보기 반영
   - 서버 저장 실패 시 LocalStorage로 폴백
*/
(function () {
  'use strict';

  // ---- CFG / endpoints ----
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = Object.assign({ byhen: '/brands-test', uploadsSignature: '/uploads/signature' }, CFG.endpoints || {});
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const HEAD = (json = true) => {
    const h = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
    return h;
  };

  const THUMB = {
    cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square:   'c_fill,g_auto,w_600,h_600,f_auto,q_auto'
  };

  // ---- DOM ----
  const $ = (s, el = document) => el.querySelector(s);
  const toast = (m) => {
    const t = $('#toast'); if (!t) return;
    t.textContent = m; t.classList.add('show');
    clearTimeout(t.__to); t.__to = setTimeout(() => t.classList.remove('show'), 1400);
  };

  const heroBtn = $('#pickHero'), heroFile = $('#fileHero'), heroPrev = $('#prevHero'), heroUrl = $('#thumb');
  const subsBtn = $('#pickSubs'), subsFile = $('#fileSubs'), subsPrev = $('#subsPrev'), subsTA = $('#subThumbs');
  const galBtn = $('#pickGallery'), galFile = $('#fileGallery'), galPrev = $('#galleryPrev'), galTA = $('#gallery');
  $('#save')?.addEventListener('click', save);

  heroBtn?.addEventListener('click', () => heroFile?.click());
  subsBtn?.addEventListener('click', () => subsFile?.click());
  galBtn?.addEventListener('click',  () => galFile?.click());

  heroFile?.addEventListener('change', (e) => handleOneUpload(e, heroPrev, heroUrl, THUMB.cover169));
  subsFile?.addEventListener('change', (e) => handleMultiUpload(e, subsPrev, subsTA, THUMB.square));
  galFile?.addEventListener('change',  (e) => handleMultiUpload(e, galPrev, galTA,  THUMB.cover169));

  function withTransform(url, t) {
    try {
      if (!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0, i + 8) + t + '/' + url.slice(i + 8);
    } catch { return url; }
  }
  function isImgOk(f) {
    if (!/^image\//.test(f.type)) { toast('이미지 파일만 업로드'); return false; }
    if (f.size > 8 * 1024 * 1024) { toast('이미지는 8MB 이하'); return false; }
    return true;
  }

  async function getSignature() {
    const r = await fetch(API_BASE + EP.uploadsSignature, { headers: HEAD(false) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file, variant) {
    const { cloudName, apiKey, timestamp, signature } = await getSignature();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return variant ? withTransform(j.secure_url, variant) : j.secure_url;
  }

  async function handleOneUpload(e, imgPrev, inputEl, variant) {
    const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
    const local = URL.createObjectURL(f); imgPrev && (imgPrev.src = local);
    toast('업로드 중…');
    try {
      const url = await uploadImage(f, variant);
      if (imgPrev) imgPrev.src = url;
      if (inputEl) inputEl.value = url;
      toast('업로드 완료');
    } catch (err) {
      console.error('[upload]', err); toast('업로드 실패');
    } finally {
      URL.revokeObjectURL(local); e.target.value = '';
    }
  }

  async function handleMultiUpload(e, gridPrev, taEl, variant) {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    toast('업로드 중…');
    const urls = [];
    for (const f of files) {
      if (!isImgOk(f)) continue;
      try {
        const url = await uploadImage(f, variant);
        urls.push(url);
      } catch (err) {
        console.warn('[multi upload]', err);
      }
    }
    if (urls.length) {
      // textarea 병합(줄바꿈)
      if (taEl) {
        const cur = (taEl.value || '').trim();
        taEl.value = (cur ? cur + '\n' : '') + urls.join('\n');
      }
      // 프리뷰 그리드
      if (gridPrev) {
        const all = (taEl?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        drawThumbGrid(gridPrev, all);
      }
      toast(`${urls.length}건 업로드 완료`);
    } else {
      toast('업로드 실패/취소');
    }
    e.target.value = '';
  }

  function drawThumbGrid(el, urls) {
    if (!el) return;
    el.innerHTML = urls.map((u, i) => `
      <div class="it">
        <img src="${u}" alt="thumb-${i}">
      </div>`).join('');
  }

  // ---- Save ----
  function readForm() {
    const toArrLines = v => (v || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const toArrCSV = v => (v || '').split(',').map(s => s.trim()).filter(Boolean);
    const slug = $('#slug').value.trim() || 'byhen';
    return {
      slug,
      name: $('#name').value.trim() || 'BYHEN',
      thumbnail: $('#thumb').value.trim(),
      subThumbnails: toArrLines($('#subThumbs').value),
      availableHours: $('#hours').value.trim(),
      timeslots: toArrCSV($('#timeslots').value),
      availableDates: toArrCSV($('#availableDates').value),
      contact: { phone: $('#phone').value.trim(), email: $('#email').value.trim(), kakao: $('#kakao').value.trim() },
      intro: $('#intro').value,
      usageGuide: $('#guide').value,
      priceInfo: $('#pricing').value,
      address: $('#address').value.trim(),
      map: { link: $('#mapLink').value.trim() },
      gallery: toArrLines($('#gallery').value),
      closed: [], booked: []
    };
  }

  async function save() {
    const data = readForm();
    // 서버 스키마 맞추기(테스트 라우터용)
    const payload = {
      slug: data.slug,
      type: 'brand',
      status: 'published',
      name: data.name,
      hours: data.availableHours,
      hero: { image: data.thumbnail, logo: '' },
      contact: { phone: data.contact.phone, email: data.contact.email, kakaoUrl: data.contact.kakao },
      links: { map: data.map.link },
      studioPhotos: data.subThumbnails,
      portfolioPhotos: data.gallery,
      pricing: parsePricing(data.priceInfo),
      availability: {
        leadDays: 0,
        timeslots: data.timeslots,
        booked: data.booked,
        closed: data.closed
      },
      faq: [],
      policy: '',
      shorts: [],
      // 추가 필드
      tagline: '',
      location: data.address,
      description: data.intro,
      // 안내는 policy로 보내거나 description 하단에 병합 가능
      // 여기서는 policy에 저장
      policyAppend: data.usageGuide
    };

    try {
      // POST upsert (slug 기준) → /brands-test
      const res = await fetch(API_BASE + (CFG.endpoints?.byhen || '/brands-test'), {
        method: 'POST',
        headers: HEAD(true),
        body: JSON.stringify(payload)
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
      toast('서버 저장 완료');
    } catch (e) {
      console.warn('[save:local fallback]', e);
      localStorage.setItem('brand:' + data.slug, JSON.stringify(data));
      toast('서버 실패 → 로컬에 저장됨');
    }
  }

  function parsePricing(text) {
    // 줄마다 "이름 | 금액 | 소요시간 | 포함사항(,)" 형태를 느슨히 파싱
    // 예: 베이직 | 350000 | 2h | 스튜디오 1시간, 라이트 세팅, 컷 편집 10장
    const lines = (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return lines.map(line => {
      const p = line.split('|').map(s => s.trim());
      return {
        name: p[0] || '',
        price: p[1] ? Number(p[1].replace(/[^\d]/g, '')) : 0,
        duration: p[2] || '',
        includes: p[3] ? p[3].split(',').map(s => s.trim()).filter(Boolean) : []
      };
    }).filter(x => x.name);
  }

  // ---- Init: draw previews from textareas if any ----
  (function initPreviews() {
    const subs = ($('#subThumbs').value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    drawThumbGrid($('#subsPrev'), subs);
    const gal = ($('#gallery').value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    drawThumbGrid($('#galleryPrev'), gal);
  })();
})();
