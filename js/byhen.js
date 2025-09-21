/* byhen.js — v2.0 (slug→최근 발행 폴백) */
(function () {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');

  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const alertMsg = (m)=> alert(m);

  const qs = new URLSearchParams(location.search);
  const SLUG = (qs.get('slug') || localStorage.getItem('byhen:lastSlug') || 'byhen').toLowerCase();

  // ---- 렌더 함수(이전 코드 그대로 사용 가능) ----
  function renderAll(D){
    $("#mainThumb").src = D.thumbnail || '';
    const subs = (D.subThumbnails||[]).map((s,i)=>`<img src="${s}" data-i="${i}">`).join('');
    $("#subThumbs").innerHTML = subs;
    $("#subThumbs").onclick = (e)=>{ const im=e.target.closest('img'); if(!im) return; $("#mainThumb").src=im.src; $$("#subThumbs img").forEach(x=>x.classList.toggle('sel',x===im)); };
    const first = $("#subThumbs img"); first && first.classList.add('sel');

    $("#chips").innerHTML = [
      D.availableHours ? `<span class="chip"><i class="ri-time-line"></i>${D.availableHours}</span>` : '',
      Array.isArray(D.availableDates)&&D.availableDates.length ? `<span class="chip"><i class="ri-calendar-event-line"></i>예약 가능일 ${D.availableDates.length}일</span>` : ''
    ].join('');

    $("#intro").textContent   = D.intro || '-';
    $("#guide").textContent   = D.usageGuide || '-';
    $("#pricing").textContent = D.priceInfo || '-';
    $("#address").textContent = D.address || '-';

    $("#phone").textContent = D.contact?.phone || '-';
    $("#email").textContent = D.contact?.email || '-';
    $("#kakao").innerHTML   = D.contact?.kakao ? `<a href="${D.contact.kakao}" target="_blank" rel="noopener">${D.contact.kakao}</a>` : '-';
    $("#mapLink").innerHTML = D.map?.link ? `<a class="btn" href="${D.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>` : '';

    $("#gallery").innerHTML = (D.gallery||[]).map(s=>`<img src="${s}" alt="">`).join('');
    // 캘린더는 기존 코드 재사용(생략)
  }

  async function fetchJSON(url){
    const r=await fetch(url,{headers:{Accept:'application/json'}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) { const err=new Error(j.message||`HTTP_${r.status}`); err.status=r.status; throw err; }
    return j.data || j;
  }

  async function loadBrand(){
    try{
      // 1) 우선 slug 시도
      const one = await fetchJSON(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(SLUG)}`);
      renderAll(one);
    }catch(e1){
      // 2) 404면 최근 발행 1개 폴백
      if(e1.status===404){
        try{
          const list = await fetchJSON(`${API_BASE}${BRAND_BASE}?status=published&limit=1`);
        const item = list.items?.[0] || list[0];
          if(item){ renderAll(item); return; }
        }catch(e2){}
      }
      alertMsg(`브랜드 로드 실패: ${e1.message||'오류'}\n시도한 경로: ${API_BASE}${BRAND_BASE}/${SLUG}\nslug: ${SLUG}`);
    }
  }

  document.addEventListener('DOMContentLoaded', loadBrand);
})();