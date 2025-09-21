/* byhen.js — v1.4 (강화된 로더)
   조회 우선순위: ?id → /:slug → ?q → 리스트 매칭 → localStorage(lastId)
*/
(function () {
  'use strict';

  // ----- Config -----
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');

  // ----- Utils -----
  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
  const alertFail=(msg, url, slug)=>alert(`브랜드 로드 실패: ${msg}\n\n시도한 경로: ${url||'-'}\nslug: ${slug||'-'}`);

  async function getJSON(url, opt={}) {
    const r = await fetch(url, { headers:{Accept:'application/json'}, ...opt });
    const j = await r.json().catch(()=>({}));
    if (!r.ok || j.ok === false) {
      const err = new Error(j.message || `HTTP_${r.status}`);
      err.status = r.status; err.url = url; err.body = j;
      throw err;
    }
    return j.data ?? j;
  }

  // ----- Data Load (robust) -----
  async function loadBrand() {
    const qs   = new URLSearchParams(location.search);
    const id   = (qs.get('id')||'').trim();
    const slug = (qs.get('slug') || 'byhen').trim().toLowerCase();
    const lastId = localStorage.getItem('byhen:lastId') || '';

    // 1) id 우선
    if (id) return await getJSON(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(id)}`);

    // 2) slug 단건
    try {
      return await getJSON(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(slug)}`);
    } catch (e1) {
      // 3) q 검색(텍스트 인덱스 지원 라우터)
      try {
        const s = await getJSON(`${API_BASE}${BRAND_BASE}?q=${encodeURIComponent(slug)}&limit=1`);
        const hit = (s.items || s || [])[0];
        if (hit) return hit;
      } catch(_) {}

      // 4) 리스트에서 slug 매칭
      try {
        const list = await getJSON(`${API_BASE}${BRAND_BASE}`);
        const found = (list.items || list || []).find(x => (x.slug||'').toLowerCase() === slug);
        if (found) return found;
      } catch(_) {}

      // 5) 마지막 저장 ID 폴백
      if (lastId) {
        try {
          return await getJSON(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(lastId)}`);
        } catch(_) {}
      }

      alertFail(e1.message, e1.url, slug);
      throw e1;
    }
  }

  // ----- Render -----
  function render(doc){
    // 호환 필드
    const D = {
      name: doc.name || 'BYHEN',
      thumbnail: doc.thumbnail || doc.mainThumbnailUrl || '',
      subThumbnails: Array.isArray(doc.subThumbnails) ? doc.subThumbnails
                    : (Array.isArray(doc.subImages) ? doc.subImages : []),
      gallery: Array.isArray(doc.gallery) ? doc.gallery : [],
      intro: doc.intro || '',
      description: doc.description || '',
      usageGuide: doc.usageGuide || doc.rules || '',
      priceInfo: doc.priceInfo || '',
      contact: { phone: doc.contact?.phone || '', email: doc.contact?.email || '', kakao: doc.contact?.kakao || '' },
      address: doc.address || '',
      mapLink: doc.map?.link || '',
      availableHours: doc.availableHours || '',
      timeslots: Array.isArray(doc.timeslots) ? doc.timeslots : (doc.availability?.timeslots||[]),
      availableDates: Array.isArray(doc.availableDates) ? doc.availableDates : (doc.availability?.availableDates||[]),
      closed: Array.isArray(doc.closed) ? doc.closed : (doc.availability?.closed||[]),
      booked: Array.isArray(doc.booked) ? doc.booked : (doc.availability?.booked||[])
    };

    // 썸네일
    const main = $('#mainThumb'); const subs = $('#subThumbs');
    if (main) main.src = D.thumbnail || '';
    if (subs) {
      subs.innerHTML = (D.subThumbnails||[]).map((u,i)=>`<img src="${u}" data-i="${i}" alt="sub-${i}">`).join('');
      const first = subs.querySelector('img'); if (first) first.classList.add('sel');
      subs.addEventListener('click', e=>{
        const im=e.target.closest('img'); if(!im) return;
        main.src = im.src; $$('#subThumbs img').forEach(x=>x.classList.toggle('sel', x===im));
      });
    }

    // 텍스트/연락
    $('#chips').innerHTML = [
      D.availableHours ? `<span class="chip"><i class="ri-time-line"></i>${D.availableHours}</span>` : '',
      (D.availableDates && D.availableDates.length) ? `<span class="chip"><i class="ri-calendar-event-line"></i>예약 가능 ${D.availableDates.length}일</span>` : ''
    ].join('');
    $('#intro')   && ($('#intro').textContent = D.intro || D.description || '-');
    $('#guide')   && ($('#guide').textContent = D.usageGuide || '-');
    $('#pricing') && ($('#pricing').textContent = D.priceInfo || '-');
    $('#address') && ($('#address').textContent = D.address || '-');
    $('#mapLink') && ($('#mapLink').innerHTML = D.mapLink ? `<a class="btn" href="${D.mapLink}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>` : '');
    $('#phone') && ($('#phone').textContent = D.contact.phone || '-');
    $('#email') && ($('#email').textContent = D.contact.email || '-');
    $('#kakao') && ($('#kakao').innerHTML   = D.contact.kakao ? `<a href="${D.contact.kakao}" target="_blank" rel="noopener">${D.contact.kakao}</a>` : '');
    $('#gallery') && ($('#gallery').innerHTML = (D.gallery||[]).map(u=>`<img src="${u}" alt="">`).join(''));

    // 캘린더 데이터 주입(이미 있는 렌더러 사용)
    window.__BRAND_CAL__ = { availableDates:D.availableDates, closed:D.closed, booked:D.booked, timeslots:D.timeslots };
    if (typeof renderCalendar === 'function') renderCalendar();
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      const doc = await loadBrand();
      render(doc);
    }catch(_e){}
  });
})();