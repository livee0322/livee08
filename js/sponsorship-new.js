/* js/sponsorship-new.js — v1.1.0
   - 반응형 폼 + Cloudinary 업로드(서명 엔드포인트 사용)
   - '협의/제품만 제공' 선택 시 원고료 비활성
   - 등록 성공 시 목록으로 이동(sponsorship.html)
*/
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const BASE = (CFG.BASE_PATH || '').replace(/\/+$/,'');
  const THUMB = CFG.thumb || { card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto' };

  const $ = (s, el=document)=>el.querySelector(s);

  // 공용 헤더/탭
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬 공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active:'live' });
    window.LIVEE_UI?.mountTabbar?.({ active:'recruits' });
  }catch(_){}

  // el refs
  const form        = $('#spForm');
  const msgEl       = $('#spMsg');

  const brandNameEl = $('#brandName');
  const titleEl     = $('#title');
  const typeEl      = $('#stype');

  const feeEl       = $('#fee');
  const negoEl      = $('#negotiable');
  const prodOnlyEl  = $('#productOnly');

  const descEl      = $('#desc');

  const pNameEl     = $('#pname');
  const pLinkEl     = $('#plink');
  const pThumbUrlEl = $('#thumbUrl');
  const fileEl      = $('#file');
  const btnPick     = $('#btnPick');
  const previewImg  = $('#preview');
  const thumbPh     = $('#thumbPh');

  const say = (t, ok=false, err=false) => {
    if(!msgEl) return;
    msgEl.textContent = t;
    msgEl.classList.add('show');
    msgEl.classList.toggle('ok', ok);
    msgEl.classList.toggle('err', err);
  };

  const headers = (json=true) => {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    const tok = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken');
    if (tok) h.Authorization = `Bearer ${tok}`;
    return h;
  };

  const withTransform = (url, t) => {
    try{
      if(!url || !/\/upload\//.test(url)) return url || '';
      const [head, tail] = url.split('/upload/');
      return `${head}/upload/${t}/${tail}`;
    }catch{ return url; }
  };

  // ===== 원고료 입력 enable/disable =====
  function syncFeeState(){
    const off = negoEl.checked || prodOnlyEl.checked;
    feeEl.disabled = off;
    if (off) feeEl.value = '';
  }
  negoEl?.addEventListener('change', syncFeeState);
  prodOnlyEl?.addEventListener('change', syncFeeState);
  syncFeeState();

  // ===== 이미지 업로더 =====
  btnPick?.addEventListener('click', ()=> fileEl?.click());
  pThumbUrlEl?.addEventListener('change', ()=>{
    const url = pThumbUrlEl.value.trim();
    if (url) renderThumb(url);
  });

  fileEl?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    if (!/^image\//.test(f.type)) { say('이미지 파일만 업로드 가능합니다.', false, true); e.target.value=''; return; }
    if (f.size > 8*1024*1024) { say('이미지 용량은 8MB 이하만 가능합니다.', false, true); e.target.value=''; return; }
    try{
      say('이미지 업로드 중…');
      const sig = await fetch(`${API}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) })
        .then(r=>r.json());
      const { cloudName, apiKey, timestamp, signature } = sig.data || sig;

      const fd = new FormData();
      fd.append('file', f);
      fd.append('api_key', apiKey);
      fd.append('timestamp', timestamp);
      fd.append('signature', signature);

      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method:'POST', body: fd
      }).then(r=>r.json());
      if (!up?.secure_url) throw new Error('업로드 실패');

      const cover = up.secure_url;
      const thumb = withTransform(cover, THUMB.card169);
      pThumbUrlEl.value = cover; // 원본 저장(백엔드에서 thumb 파생 가능)
      renderThumb(thumb);
      say('이미지 업로드 완료', true, false);
    }catch(err){
      say('업로드 실패: ' + (err.message || '오류'), false, true);
    }finally{
      fileEl.value = '';
    }
  });

  function renderThumb(url){
    if (!url) {
      previewImg.style.display='none'; thumbPh.style.display='grid';
      previewImg.removeAttribute('src');
      return;
    }
    previewImg.src = url;
    previewImg.onload = ()=>{ previewImg.style.display='block'; thumbPh.style.display='none'; };
    previewImg.onerror = ()=>{ previewImg.style.display='none'; thumbPh.style.display='grid'; };
  }

  // ===== 제출 =====
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    const brandName = (brandNameEl.value||'').trim();
    const title     = (titleEl.value||'').trim();
    if (!brandName) { say('브랜드명을 입력해주세요.', false, true); return; }
    if (!title)     { say('제목을 입력해주세요.', false, true); return; }

    let feeNum = null;
    if (!negoEl.checked && !prodOnlyEl.checked) {
      const raw = String(feeEl.value||'').replace(/[^\d]/g,'').trim();
      if (raw) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) { say('원고료는 숫자로 입력해주세요.', false, true); return; }
        feeNum = n;
      }
    }

    const payload = {
      type: 'sponsorship',
      title,
      brandName,
      sType: typeEl.value,                // shipping_gift | rental_return | experience_review
      fee: feeNum,                        // null 가능
      feeNegotiable: !!negoEl.checked,
      productOnly:  !!prodOnlyEl.checked,
      descriptionHTML: (descEl.value||'').trim(),
      product: {
        name: (pNameEl.value||'').trim(),
        url:  (pLinkEl.value||'').trim(),
        imageUrl: (pThumbUrlEl.value||'').trim()
      }
    };

    try{
      say('등록 중…');
      const r = await fetch(`${API}${EP.sponsorshipBase || '/sponsorship-test'}`, {
        method:'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      say('등록 완료!', true, false);
      // 목록으로 이동
      setTimeout(()=>{ location.href = `${BASE}/sponsorship.html`; }, 300);
    }catch(err){
      say('등록 실패: ' + (err.message||'오류'), false, true);
    }
  });

  $('#btnCancel')?.addEventListener('click', ()=>{
    history.length > 1 ? history.back() : (location.href = `${BASE}/sponsorship.html`);
  });
})();