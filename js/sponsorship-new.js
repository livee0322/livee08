/* js/sponsorship-new.js — v1.2.0
   - 필수/패턴 검증 제거(테스트 용)
   - 모바일 레이아웃 안정 / 버튼 래핑
   - Cloudinary 업로드 + 미리보기
   - URL 자동 보정(https:// prefix)
   - 서버 VALIDATION_FAILED 상세 표시
*/
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const BASE = (CFG.BASE_PATH || '').replace(/\/+$/,'');
  const THUMB = CFG.thumb || { card169:'c_fill,g_auto,w_640,h_360,f_auto,q_auto' };

  const $ = (s, el=document)=>el.querySelector(s);

  // 공용 UI 장착
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬 공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'recruits' });
  }catch(_){}

  // refs
  const form  = $('#spForm');     const msgEl = $('#spMsg');
  const brandNameEl = $('#brandName'); const titleEl = $('#title'); const typeEl = $('#stype');
  const feeEl = $('#fee'); const negoEl = $('#negotiable'); const prodOnlyEl = $('#productOnly');
  const descEl = $('#desc'); const pNameEl = $('#pname'); const pLinkEl = $('#plink');
  const pThumbUrlEl = $('#thumbUrl'); const fileEl = $('#file'); const btnPick = $('#btnPick');
  const previewImg = $('#preview'); const thumbPh = $('#thumbPh');

  const say=(t,ok=false,err=false)=>{ if(!msgEl) return; msgEl.textContent=t; msgEl.classList.add('show'); msgEl.classList.toggle('ok',ok); msgEl.classList.toggle('err',err); };

  const headers=(json=true)=>{ const h={}; if(json) h['Content-Type']='application/json';
    const tok=localStorage.getItem('livee_token')||localStorage.getItem('liveeToken'); if(tok) h.Authorization=`Bearer ${tok}`; return h; };

  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const [a,b]=url.split('/upload/'); return `${a}/upload/${t}/${b}`; }catch{ return url; } };
  const normUrl=(u)=>{ u=String(u||'').trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u; return u; };

  // 원고료 enable/disable
  function syncFee(){ const off = negoEl.checked || prodOnlyEl.checked; feeEl.disabled = off; if(off) feeEl.value=''; }
  negoEl?.addEventListener('change', syncFee); prodOnlyEl?.addEventListener('change', syncFee); syncFee();

  // 업로더
  btnPick?.addEventListener('click', ()=>fileEl?.click());
  pThumbUrlEl?.addEventListener('change', ()=> renderThumb(pThumbUrlEl.value.trim()));
  fileEl?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능합니다.',false,true); e.target.value=''; return; }
    if(f.size>8*1024*1024){ say('이미지는 8MB 이하만 가능합니다.',false,true); e.target.value=''; return; }
    try{
      say('이미지 업로드 중…');
      const sig = await fetch(`${API}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) }).then(r=>r.json());
      const { cloudName, apiKey, timestamp, signature } = sig.data || sig;
      const fd=new FormData(); fd.append('file',f); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{ method:'POST', body:fd }).then(r=>r.json());
      if(!up?.secure_url) throw new Error('업로드 실패');
      const cover = up.secure_url; const thumb = withTransform(cover, THUMB.card169);
      pThumbUrlEl.value = cover;
      renderThumb(thumb);
      say('이미지 업로드 완료',true,false);
    }catch(err){ say('업로드 실패: '+(err.message||'오류'),false,true); }
    finally{ fileEl.value=''; }
  });

  function renderThumb(url){
    if(!url){ previewImg.style.display='none'; thumbPh.style.display='grid'; previewImg.removeAttribute('src'); return; }
    previewImg.src=url; previewImg.onload=()=>{ previewImg.style.display='block'; thumbPh.style.display='none'; };
    previewImg.onerror=()=>{ previewImg.style.display='none'; thumbPh.style.display='grid'; };
  }

  // 제출(검증 최소화)
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    const feeRaw = String(feeEl.value||'').replace(/[^\d]/g,'').trim();
    const feeNum = (!negoEl.checked && !prodOnlyEl.checked && feeRaw) ? Number(feeRaw) : null;

    const payload = {
      type: 'sponsorship',
      title: (titleEl.value||'').trim(),
      brandName: (brandNameEl.value||'').trim(),
      sType: typeEl.value || 'shipping_gift',
      fee: Number.isFinite(feeNum) ? feeNum : null,
      feeNegotiable: !!negoEl.checked,
      productOnly:  !!prodOnlyEl.checked,
      descriptionHTML: (descEl.value||'').trim(),
      product: {
        name: (pNameEl.value||'').trim(),
        url:  normUrl(pLinkEl.value||''),
        imageUrl: (pThumbUrlEl.value||'').trim()
      }
    };

    try{
      say('등록 중…');
      const r = await fetch(`${API}${EP.sponsorshipBase || '/sponsorship-test'}`, {
        method:'POST', headers: headers(true), body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false){
        // 서버 validation 상세 표시
        const errs = (j.errors||[]).map(e=>`${e.path||e.param||''}: ${e.msg||e.message||'오류'}`).join(' / ');
        throw new Error(j.message || errs || `HTTP_${r.status}`);
      }
      say('등록 완료!', true, false);
      setTimeout(()=>{ location.href = `${BASE}/sponsorship.html`; }, 300);
    }catch(err){
      say('등록 실패: ' + (err.message||'오류') + '  ', false, true);
    }
  });

  $('#btnCancel')?.addEventListener('click', ()=>{
    history.length>1 ? history.back() : (location.href = `${BASE}/sponsorship.html`);
  });
})();