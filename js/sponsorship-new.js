/* js/sponsorship-new.js — v1.0.1
   - 422 대응: 서버가 받을 수 있게 키 알리아스 동시 전송(fee/pay, sponsorType/typeOfSponsorship 등)
   - 숫자/URL 보정, 빈 값 제거(compact)
   - 실패 시 서버 에러 전문 노출
*/
(() => {
  'use strict';

  const CFG  = window.LIVEE_CONFIG || {};
  const API  = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP   = CFG.endpoints || {};
  const BASE = (CFG.BASE_PATH || '').replace(/\/+$/,'');

  // 공용 UI
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬 공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'campaigns' });
  }catch(_){}

  const $ = (s,el=document)=>el.querySelector(s);

  // --- ELs
  const form  = $('#spForm');
  const msgEl = $('#spMsg');

  const brandEl = $('#brandName');
  const titleEl = $('#title');
  const typeEl  = $('#spType');
  const feeEl   = $('#fee');
  const negoEl  = $('#negotiable');
  const descEl  = $('#desc');

  const prodName = $('#productName');
  const prodUrl  = $('#productUrl');
  const thumbUrl = $('#thumbUrl');

  const upBtn   = $('#btnUpload');
  const fileEl  = $('#thumbFile');
  const preview = $('#thumbPreview');

  // --- helpers
  const say = (t, ok=false)=>{
    msgEl.textContent = String(t || '');
    msgEl.classList.add('show');
    msgEl.classList.toggle('ok', !!ok);
  };
  const headers = (json=true)=>{
    const h = { Accept:'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    const tok = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken');
    if (tok) h.Authorization = 'Bearer ' + tok;
    return h;
  };
  const toNumber = (v)=>{
    if (v==null || v==='') return undefined;
    const n = Number(String(v).replace(/[^\d.-]/g,''));
    return Number.isFinite(n) ? n : undefined;
  };
  const fixUrl = (s)=>{
    const v = String(s||'').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^www\./i.test(v)) return 'https://' + v;
    return v; // 테스트버전: 더 이상 검증/수정하지 않음
  };
  const compact = (obj)=>{
    const out = {};
    Object.entries(obj||{}).forEach(([k,v])=>{
      if (v===undefined || v===null || (typeof v==='string' && v.trim()==='')) return;
      out[k] = v;
    });
    return out;
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
    if (!f) return;
    if (!/^image\//.test(f.type)){ say('이미지 파일만 업로드할 수 있어요.'); e.target.value=''; return; }
    if (f.size > 8*1024*1024){ say('이미지는 8MB 이하만 업로드 가능해요.'); e.target.value=''; return; }

    try{
      say('이미지 업로드 준비 중…');
      const sigRes = await fetch(`${API}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) });
      let sig; try{ sig = await sigRes.json(); }
      catch{ const txt = await sigRes.text(); throw new Error('서명(JSON 아님): ' + txt.slice(0,120)); }
      const { cloudName, apiKey, timestamp, signature } = sig.data || sig;
      if (!cloudName || !signature) throw new Error('서명 정보 부족');

      say('이미지 업로드 중…');
      const fd = new FormData();
      fd.append('file', f);
      fd.append('api_key', apiKey);
      fd.append('timestamp', timestamp);
      fd.append('signature', signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
      const up = await upRes.json().catch(async()=>{
        const txt = await upRes.text(); throw new Error('Cloudinary 응답 파싱 실패: ' + txt.slice(0,120));
      });
      if (!up.secure_url) throw new Error('업로드 실패');
      const url = up.secure_url;

      preview.innerHTML = `<img src="${url}" alt="썸네일">`;
      if (thumbUrl) thumbUrl.value = url;
      say('이미지 업로드 완료', true);
    }catch(err){
      say('업로드 실패: ' + (err.message || '오류'));
    }finally{
      e.target.value='';
    }
  });

  // 제출
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    // 숫자/URL 보정
    const feeNum = toNumber(feeEl?.value);
    const pUrl   = fixUrl(prodUrl?.value || '');
    const tUrl   = (thumbUrl?.value || '').trim();

    // 서버 호환을 위해 키를 넓게 전송(알리아스 포함)
    const payload = compact({
      type: 'sponsorship',
      status: 'published',

      // 기본
      title: (titleEl?.value||'').trim(),
      brandName: (brandEl?.value||'').trim(),

      // 유형(서버에서 sponsorType 또는 typeOfSponsorship 과 같이 쓸 수 있음)
      sponsorType: typeEl?.value || '',
      typeOfSponsorship: typeEl?.value || '',

      // 금액(서버가 fee 또는 pay 를 인식할 수 있도록 동시에 보냄)
      fee: feeNum,
      pay: feeNum,
      feeNegotiable: !!negoEl?.checked,
      payNegotiable: !!negoEl?.checked,

      descriptionHTML: descEl?.value || '',

      // 상품 블록(이름/링크/이미지)
      product: compact({
        name: (prodName?.value || '').trim(),
        url: pUrl,
        imageUrl: tUrl,
        thumb: tUrl
      }),

      // 썸네일을 상단 키로도 제공(서버가 cover/thumbnail를 쓰는 경우 대비)
      coverImageUrl: tUrl || undefined,
      thumbnailUrl:  tUrl || undefined
    });

    // 디버그: 실제 전송 URL 로그
    const postUrl = `${API}${EP.sponsorshipBase || '/sponsorship-test'}`;
    // console.log('[POST]', postUrl, payload);

    try{
      say('등록 중…');
      const r = await fetch(postUrl, {
        method:'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });

      let respText = '';
      let data = null;
      try{ data = await r.clone().json(); }
      catch{ respText = await r.text(); }

      if (!r.ok || (data && data.ok === false)) {
        // express-validator 422 대응: 상세 메시지 표시
        const msg =
          (data && (data.message || data.code)) ||
          respText ||
          `HTTP_${r.status}`;
        const details = (data && data.errors ? ' ' + JSON.stringify(data.errors) : '');
        throw new Error(msg + details);
      }

      say('등록 완료!', true);
      alert('협찬 공고가 등록되었습니다.');
      location.href = `${BASE}/sponsorship.html`;
    }catch(err){
      say('등록 실패: ' + (err.message || '오류'));
    }
  });

  // 취소
  $('#btnCancel')?.addEventListener('click', ()=>{
    history.length>1 ? history.back() : (location.href = `${BASE}/index.html`);
  });
})();