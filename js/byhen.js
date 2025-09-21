/* byhen.js — v1.5
   우선순위: ?id → /brand-test/:slug → /brand-test?q= → /brand-test 리스트 매칭 → localStorage(lastId)
   저장된 문서가 'test' 같은 slug여도 ?id로 접근 가능.
*/
(function () {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const EP = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');

  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

  function fail(msg, url, slug){
    alert(`브랜드 로드 실패: ${msg}\n\n시도한 경로: ${url||'-'}\nslug: ${slug||'-'}`);
  }

  async function j(url){
    const r = await fetch(url, { headers:{Accept:'application/json'} });
    const k = await r.json().catch(()=>({}));
    if(!r.ok || k.ok===false){
      const e=new Error(k.message || `HTTP_${r.status}`); e.url=url; e.status=r.status; throw e;
    }
    return k.data ?? k;
  }

  async function load(){
    const qs = new URLSearchParams(location.search);
    const id = (qs.get('id')||'').trim();
    const slug = (qs.get('slug')||'byhen').trim().toLowerCase();
    const lastId = localStorage.getItem('byhen:lastId') || '';

    if(id){ return await j(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(id)}`); }

    try{
      return await j(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(slug)}`);
    }catch(e1){
      try{
        const s = await j(`${API_BASE}${BRAND_BASE}?q=${encodeURIComponent(slug)}&limit=1`);
        const hit = (s.items || s || [])[0];
        if(hit) return hit;
      }catch(_) {}

      try{
        const list = await j(`${API_BASE}${BRAND_BASE}`);
        const f = (list.items || list || []).find(v => (v.slug||'').toLowerCase()===slug);
        if(f) return f;
      }catch(_) {}

      if(lastId){
        try{ return await j(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(lastId)}`); }catch(_) {}
      }
      fail(e1.message, e1.url, slug);
      throw e1;
    }
  }

  function render(doc){
    const D = {
      name: doc.name || 'BYHEN',
      thumbnail: doc.thumbnail || '',
      subThumbnails: Array.isArray(doc.subThumbnails)?doc.subThumbnails:[],
      gallery: Array.isArray(doc.gallery)?doc.gallery:[],
      intro: doc.intro || doc.description || '',
      usageGuide: doc.usageGuide || '',
      priceInfo: doc.priceInfo || '',
      contact: { phone: doc.contact?.phone||'', email: doc.contact?.email||'', kakao: doc.contact?.kakao||'' },
      address: doc.address || '',
      mapLink: doc.map?.link || '',
      availableHours: doc.availableHours || '',
      timeslots: Array.isArray(doc.timeslots)?doc.timeslots:[],
      availableDates: Array.isArray(doc.availableDates)?doc.availableDates:[],
      closed: Array.isArray(doc.closed)?doc.closed:[],
      booked: Array.isArray(doc.booked)?doc.booked:[]
    };

    // 썸네일
    const main = $('#mainThumb'), subs = $('#subThumbs');
    if(main) main.src = D.thumbnail || '';
    if(subs){
      subs.innerHTML = (D.subThumbnails||[]).map((u,i)=>`<img src="${u}" data-i="${i}" alt="sub-${i}">`).join('');
      const first = subs.querySelector('img'); if(first) first.classList.add('sel');
      subs.addEventListener('click', e=>{
        const im=e.target.closest('img'); if(!im) return;
        main.src = im.src; $$('#subThumbs img').forEach(x=>x.classList.toggle('sel', x===im));
      });
    }

    // 기본 정보/연락/안내
    $('#chips')    && ($('#chips').innerHTML = [
      D.availableHours ? `<span class="chip"><i class="ri-time-line"></i>${D.availableHours}</span>` : '',
      (D.availableDates?.length ? `<span class="chip"><i class="ri-calendar-event-line"></i>예약 가능 ${D.availableDates.length}일</span>` : '')
    ].join(''));
    $('#intro')    && ($('#intro').textContent = D.intro || '-');
    $('#guide')    && ($('#guide').textContent = D.usageGuide || '-');
    $('#pricing')  && ($('#pricing').textContent = D.priceInfo || '-');
    $('#address')  && ($('#address').textContent = D.address || '-');
    $('#mapLink')  && ($('#mapLink').innerHTML = D.mapLink ? `<a class="btn" href="${D.mapLink}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>` : '');
    $('#phone')    && ($('#phone').textContent = D.contact.phone || '-');
    $('#email')    && ($('#email').textContent = D.contact.email || '-');
    $('#kakao')    && ($('#kakao').innerHTML   = D.contact.kakao ? `<a href="${D.contact.kakao}" target="_blank" rel="noopener">${D.contact.kakao}</a>` : '');
    $('#gallery')  && ($('#gallery').innerHTML = (D.gallery||[]).map(u=>`<img src="${u}" alt="">`).join(''));

    // 캘린더 데이터 제공(페이지의 렌더러가 사용)
    window.__BRAND_CAL__ = { availableDates:D.availableDates, closed:D.closed, booked:D.booked, timeslots:D.timeslots };
    if (typeof renderCalendar === 'function') renderCalendar();
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      const doc = await load();
      render(doc);
    }catch(_){}
  });
})();