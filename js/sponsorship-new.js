/* js/sponsorship-new.js — v1.0.0 (create; brand-only) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP  = CFG.endpoints || {};
  const BASE = (EP.sponsorshipBase || '/sponsorship-test').replace(/^\/*/,'/');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬 공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'home' });
  }catch(_){}

  const f = $('spForm'), msg = $('spMsg');

  const feeEl=$('fee'), nego=$('feeNegotiable'), prodOnly=$('productOnly');
  function syncFeeState(){
    const dis = nego.checked || prodOnly.checked;
    feeEl.disabled = dis; if(dis) feeEl.value='';
  }
  nego?.addEventListener('change', syncFeeState);
  prodOnly?.addEventListener('change', syncFeeState);
  syncFeeState();

  f?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!TOKEN){ alert('로그인이 필요합니다.'); location.href='login.html'; return; }

    const payload = {
      type: $('type').value,
      title: $('title').value.trim(),
      brandName: $('brandName').value.trim(),
      descriptionHTML: $('desc').value.trim(),
      fee: feeEl.value? Number(feeEl.value) : undefined,
      feeNegotiable: !!nego.checked,
      productOnly: !!prodOnly.checked,
      closeAt: $('closeAt').value ? `${$('closeAt').value}T23:59:59.000Z` : undefined,
      product: {
        name: $('pName').value.trim() || undefined,
        url: $('pUrl').value.trim() || undefined,
        thumb: $('pThumb').value.trim() || undefined,
        price: $('pPrice').value ? Number($('pPrice').value) : undefined
      }
    };

    if(!payload.title || !payload.brandName || !payload.type || !payload.closeAt){
      say('필수 항목을 확인해주세요.'); return;
    }

    try{
      say('등록 중…');
      const r = await fetch(`${API}${BASE}`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json', ...(TOKEN?{Authorization:`Bearer ${TOKEN}`}:{})},
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      alert('등록되었습니다.');
      location.href = 'sponsorship.html';
    }catch(err){
      say('등록 실패: ' + (err.message||'오류'));
    }
  });

  function say(t){ msg.style.display='block'; msg.textContent=t; }
})();