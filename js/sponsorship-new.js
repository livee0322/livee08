/* js/sponsorship-new.js — v1.2.0
   - 필수검증 최소화(테스트용)
   - Cloudinary 업로드(서명 API 사용) + 미리보기
   - '협의' 체크 시 금액 입력 비활성화
   - URL 자동 보정(https://)
*/
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP  = CFG.endpoints || {};
  const BASE_PATH = (CFG.BASE_PATH || '').replace(/\/+$/,'');

  // 헤더/탭바 장착
  try {
    window.LIVEE_UI?.mountHeader?.({ title: '협찬 공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active: null });
    window.LIVEE_UI?.mountTabbar?.({ active: 'campaigns' });
  } catch(_) {}

  // el helpers
  const $ = (s,el=document)=>el.querySelector(s);
  const form     = $('#spForm') || document.forms?.[0];
  const msgEl    = $('#spMsg');

  const brandEl  = $('#brandName');
  const titleEl  = $('#title');
  const typeEl   = $('#spType');        // 배송형/반납형/체험후기형
  const feeEl    = $('#fee');
  const negoEl   = $('#negotiable');

  const descEl   = $('#desc');

  const prodName = $('#productName');
  const prodUrl  = $('#productUrl');
  const thumbUrl = $('#thumbUrl');

  const upBtn    = $('#btnUpload');
  const fileEl   = $('#thumbFile');
  const preview  = $('#thumbPreview');  // <img> or <div> 내부에 <img> 삽입

  const say = (t, ok=false) => {
    if (!msgEl) return;
    msgEl.textContent = String(t || '');
    msgEl.classList.add('show');
    msgEl.classList.toggle('ok', !!ok);
  };

  const headers = (json=true)=>{
    const h={};
    if(json) h['Content-Type']='application/json';
    h['Accept'] = 'application/json';
    const tok = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken');
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    return h;
  };

  const normalizeUrl = (u='')=>{
    const s=String(u||'').trim();
    if(!s) return '';
    if(/^https?:\/\//i.test(s)) return s;
    return 'https://' + s.replace(/^\/+/, '');
  };

  // --- 협의 스위치 ---
  negoEl?.addEventListener('change', ()=>{
    if (negoEl.checked){ feeEl.value=''; feeEl.disabled=true; }
    else { feeEl.disabled=false; }
  });

  // --- URL 자동 보정 ---
  prodUrl?.addEventListener('blur', ()=>{
    prodUrl.value = normalizeUrl(prodUrl.value);
  });

  // --- 업로드 버튼 → 파일 선택 ---
  upBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    fileEl?.click();
  });

  // --- Cloudinary 업로드 ---
  fileEl?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드할 수 있어요.'); e.target.value=''; return; }
    if(f.size > 8*1024*1024){ say('이미지는 최대 8MB까지 업로드 가능합니다.'); e.target.value=''; return; }

    try{
      say('이미지 업로드 준비 중…');
      // 1) 서명 받아오기
      const sigRes = await fetch(`${API}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) });
      let sig;
      try { sig = await sigRes.json(); }
      catch {
        const txt = await sigRes.text();
        throw new Error(`서명 응답이 JSON이 아닙니다(${sigRes.status}): ${txt.slice(0,120)}`);
      }
      const { cloudName, apiKey, timestamp, signature } = sig.data || sig;
      if(!cloudName || !signature) throw new Error('서명 정보가 누락되었습니다');

      // 2) Cloudinary 업로드
      say('이미지 업로드 중…');
      const fd = new FormData();
      fd.append('file', f);
      fd.append('api_key', apiKey);
      fd.append('timestamp', timestamp);
      fd.append('signature', signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
      let up;
      try { up = await upRes.json(); }
      catch {
        const txt = await upRes.text();
        throw new Error(`Cloudinary 응답 파싱 실패(${upRes.status}): ${txt.slice(0,120)}`);
      }
      if(!up.secure_url) throw new Error('업로드 실패');

      // 3) 미리보기/필드 업데이트
      const url = up.secure_url;
      thumbUrl && (thumbUrl.value = url);

      if (preview) {
        if (preview.tagName.toLowerCase()==='img'){
          preview.src = url;
        } else {
          preview.innerHTML = `<img src="${url}" alt="썸네일 미리보기" style="width:100%;height:auto;display:block;border-radius:12px">`;
        }
      }
      say('이미지 업로드 완료', true);
    }catch(err){
      say('업로드 실패: ' + (err.message || '오류'));
    }finally{
      // 파일 input 초기화(같은 파일 다시 선택 가능하게)
      e.target.value = '';
    }
  });

  // --- 제출 ---
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    // 테스트 단계: 필수 검증 최소화. 숫자 변환만 가볍게.
    let feeNum = undefined;
    if (!negoEl?.checked) {
      const raw = String(feeEl?.value || '').replace(/,/g,'').trim();
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) feeNum = n;
      }
    }

    const payload = {
      type: 'sponsorship',
      status: 'published',
      brandName: (brandEl?.value || '').trim(),
      title: (titleEl?.value || '').trim(),
      sponsorType: (typeEl?.value || '').trim(),         // 'delivery' | 'return' | 'review' 등 서버 스키마에 맞춤
      fee: feeNum,
      feeNegotiable: !!negoEl?.checked,
      descriptionHTML: (descEl?.value || '').trim(),
      product: {
        name: (prodName?.value || '').trim() || undefined,
        url: normalizeUrl(prodUrl?.value || '') || undefined,
        thumb: (thumbUrl?.value || '').trim() || undefined
      }
    };

    try{
      say('등록 중…');
      const r = await fetch(`${API}${EP.sponsorshipBase || '/sponsorship-test'}`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      let j;
      try { j = await r.json(); }
      catch {
        const txt = await r.text();
        throw new Error(`서버 응답이 JSON이 아닙니다(${r.status}): ${txt.slice(0,140)}`);
      }
      if (!r.ok || j.ok === false) throw new Error(j.message || `VALIDATION_FAILED (${r.status})`);
      say('등록 완료!', true);
      alert('협찬 공고가 등록되었습니다.');
      // 목록으로 이동(페이지 파일명은 상황에 맞게 조정)
      location.href = `${BASE_PATH}/sponsorship.html`;
    }catch(err){
      say('등록 실패: ' + (err.message || '오류'));
    }
  });

  // --- 취소 버튼: 뒤로가기 ---
  $('#btnCancel')?.addEventListener('click', (e)=>{
    e.preventDefault();
    history.length > 1 ? history.back() : (location.href = `${BASE_PATH}/index.html`);
  });
})();