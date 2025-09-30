/* js/sponsorship-new.js — v1.0.0 (test-simple)
   - 검증 최소화(필수/URL 체크 없음)
   - Cloudinary 업로드(서명 API 사용) + 미리보기
   - '협의' 체크 시 금액 입력 비활성화
*/
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP  = CFG.endpoints || {};
  const BASE_PATH = (CFG.BASE_PATH || '').replace(/\/+$/,'');

  // 헤더/탭바
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬 공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'campaigns' });
  }catch(_){}

  // el
  const $ = (s,el=document)=>el.querySelector(s);
  const form     = $('#spForm');
  const msgEl    = $('#spMsg');

  const brandEl  = $('#brandName');
  const titleEl  = $('#title');
  const typeEl   = $('#spType');
  const feeEl    = $('#fee');
  const negoEl   = $('#negotiable');
  const descEl   = $('#desc');

  const prodName = $('#productName');
  const prodUrl  = $('#productUrl');
  const thumbUrl = $('#thumbUrl');

  const upBtn    = $('#btnUpload');
  const fileEl   = $('#thumbFile');
  const preview  = $('#thumbPreview');

  const say = (t, ok=false)=>{
    msgEl.textContent = String(t||'');
    msgEl.classList.add('show');
    msgEl.classList.toggle('ok', !!ok);
  };

  const headers = (json=true)=>{
    const h={ Accept:'application/json' };
    if (json) h['Content-Type']='application/json';
    const tok = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken');
    if (tok) h.Authorization = 'Bearer ' + tok;
    return h;
  };

  // 협의 스위치
  negoEl?.addEventListener('change', ()=>{
    if (negoEl.checked){ feeEl.value=''; feeEl.disabled = true; }
    else { feeEl.disabled = false; }
  });

  // 업로드 버튼 → 파일선택
  upBtn?.addEventListener('click', (e)=>{ e.preventDefault(); fileEl?.click(); });

  // Cloudinary 업로드
  fileEl?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드할 수 있어요.'); e.target.value=''; return; }
    if(f.size > 8*1024*1024){ say('이미지는 8MB 이하만 업로드 가능해요.'); e.target.value=''; return; }

    try{
      say('이미지 업로드 준비 중…');
      const sigRes = await fetch(`${API}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) });
      let sig;
      try { sig = await sigRes.json(); }
      catch { throw new Error('서명 응답이 JSON이 아닙니다. 로그인/권한을 확인하세요.'); }
      const { cloudName, apiKey, timestamp, signature } = sig.data || sig;
      if(!cloudName || !signature) throw new Error('서명 정보가 부족합니다');

      say('이미지 업로드 중…');
      const fd = new FormData();
      fd.append('file', f);
      fd.append('api_key', apiKey);
      fd.append('timestamp', timestamp);
      fd.append('signature', signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
      const up = await upRes.json().catch(async()=>{
        const txt = await upRes.text(); throw new Error(`Cloudinary 응답 파싱 실패: ${txt.slice(0,120)}`);
      });
      if(!up.secure_url) throw new Error('업로드 실패');

      const url = up.secure_url;
      if (preview){
        preview.innerHTML = `<img src="${url}" alt="썸네일">`;
      }
      if (thumbUrl) thumbUrl.value = url;
      say('이미지 업로드 완료', true);
    }catch(err){
      say('업로드 실패: ' + (err.message || '오류'));
    }finally{
      e.target.value = '';
    }
  });

  // 제출
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    // 테스트 버전: 변환/검증 최소화 (그대로 보냄)
    const payload = {
      type: 'sponsorship',
      status: 'published',
      brandName: brandEl?.value || '',
      title: titleEl?.value || '',
      sponsorType: typeEl?.value || '',
      fee: feeEl?.value || null,
      feeNegotiable: !!negoEl?.checked,
      descriptionHTML: descEl?.value || '',
      product: {
        name: prodName?.value || '',
        url: prodUrl?.value || '',
        thumb: thumbUrl?.value || ''
      }
    };

    try{
      say('등록 중…');
      const r = await fetch(`${API}${EP.sponsorshipBase || '/sponsorship-test'}`, {
        method:'POST', headers: headers(true), body: JSON.stringify(payload)
      });
      let j;
      try { j = await r.json(); }
      catch {
        const txt = await r.text();
        throw new Error(`서버 응답이 JSON이 아닙니다: ${String(txt).slice(0,140)}`);
      }
      if (!r.ok || j.ok === false) throw new Error(j.message || `등록 실패 (${r.status})`);
      say('등록 완료!', true);
      alert('협찬 공고가 등록되었습니다.');
      location.href = `${BASE_PATH}/sponsorship.html`;
    }catch(err){
      say('등록 실패: ' + (err.message || '오류'));
    }
  });

  // 취소
  $('#btnCancel')?.addEventListener('click', ()=>{
    history.length > 1 ? history.back() : (location.href = `${BASE_PATH}/index.html`);
  });
})();