/* byhen.js — v1.3
   - /brand-test/:idOrSlug 우선 조회
   - 404 시 /brand-test 리스트에서 slug 매칭 폴백
   - ?id= or ?slug= 지원 (기본 slug: 'byhen')
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
  const toast=(m)=>{const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(t._); t._=setTimeout(()=>t.classList.remove("show"),1600);};

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
    const id   = qs.get('id');
    const slug = (qs.get('slug') || 'byhen').trim().toLowerCase();

    // 1) id가 있으면 id로
    if (id) {
      try { return await getJSON(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(id)}`); }
      catch (e) {
        alert(`브랜드 로드 실패: ${e.message}\n\nURL: ${e.url||'-'}`);
        throw e;
      }
    }

    // 2) slug로 단건
    try {
      return await getJSON(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(slug)}`);
    } catch (e) {
      // 404면 리스트에서 한 번 더 (상태/정렬 무관)
      if (e.status === 404) {
        try {
          const list = await getJSON(`${API_BASE}${BRAND_BASE}`);
          const found = (list.items || list || []).find(x => (x.slug||'').toLowerCase() === slug);
          if (found) return found;
        } catch(_) { /* 리스트 실패는 아래 공통 오류 처리 */ }
      }
      alert(`브랜드 로드 실패: ${e.message}\n\n시도한 경로: ${e.url||'-'}\nslug: ${slug}`);
      throw e;
    }
  }

  // ----- Render -----
  function render(doc){
    // 필드 호환(예전 스키마 대비)
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
      contact: {
        phone: doc.contact?.phone || '',
        email: doc.contact?.email || '',
        kakao: doc.contact?.kakao || ''
      },
      address: doc.address || '',
      mapLink: doc.map?.link || '',
      availableHours: doc.availableHours || '',
      timeslots: Array.isArray(doc.timeslots) ? doc.timeslots : (doc.availability?.timeslots||[]),
      availableDates: Array.isArray(doc.availableDates) ? doc.availableDates : (doc.availability?.availableDates||[]),
      closed: Array.isArray(doc.closed) ? doc.closed : (doc.availability?.closed||[]),
      booked: Array.isArray(doc.booked) ? doc.booked : (doc.availability?.booked||[])
    };

    // 헤더 썸네일
    const main = $('#mainThumb');
    const subs = $('#subThumbs');
    if (main) main.src = D.thumbnail || '';
    if (subs) {
      subs.innerHTML = (D.subThumbnails||[]).map((u,i)=>`<img src="${u}" data-i="${i}" alt="sub-${i}">`).join('');
      const first = subs.querySelector('img'); if (first) first.classList.add('sel');
      subs.addEventListener('click', e=>{
        const im=e.target.closest('img'); if(!im) return;
        main.src = im.src; $$('#subThumbs img').forEach(x=>x.classList.toggle('sel', x===im));
      });
    }

    // chips/텍스트/연락처/주소
    $('#chips').innerHTML = [
      D.availableHours ? `<span class="chip"><i class="ri-time-line"></i>${D.availableHours}</span>` : '',
      (D.availableDates && D.availableDates.length) ? `<span class="chip"><i class="ri-calendar-event-line"></i>예약 가능 ${D.availableDates.length}일</span>` : ''
    ].join('');
    $('#intro')    && ($('#intro').textContent = D.intro || D.description || '-');
    $('#guide')    && ($('#guide').textContent = D.usageGuide || '-');
    $('#pricing')  && ($('#pricing').textContent = D.priceInfo || '-');
    $('#address')  && ($('#address').textContent = D.address || '-');
    $('#mapLink')  && ($('#mapLink').innerHTML = D.mapLink ? `<a class="btn" href="${D.mapLink}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>` : '');

    $('#phone') && ($('#phone').textContent = D.contact.phone || '-');
    $('#email') && ($('#email').textContent = D.contact.email || '-');
    $('#kakao') && ($('#kakao').innerHTML   = D.contact.kakao ? `<a href="${D.contact.kakao}" target="_blank" rel="noopener">${D.contact.kakao}</a>` : '-');

    // 갤러리
    $('#gallery') && ($('#gallery').innerHTML = (D.gallery||[]).map(u=>`<img src="${u}" alt="">`).join(''));

    // 캘린더
    window.__BRAND_CAL__ = {
      availableDates: D.availableDates,
      closed: D.closed,
      booked: D.booked,
      timeslots: D.timeslots
    };
    if (typeof renderCalendar === 'function') renderCalendar(); // 기존 함수 있으면 호출
  }

  // ----- Init -----
  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      const doc = await loadBrand();
      render(doc);
    }catch(_e){
      // 화면이 비어있지 않도록 최소 토스트
      toast('브랜드 로드 실패');
    }
  });
})();