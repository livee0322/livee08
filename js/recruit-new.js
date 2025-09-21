/* js/recruit-new.js — v3.1.0 (말머리 드롭다운, 직군, 시간/순서 개편) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const THUMB = CFG.thumb || { card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto" };

  const $id = (s) => document.getElementById(s);
  const form        = $id("recruitForm");
  const msgEl       = $id("recruitMsg");

  const brandNameEl = $id("brandName");
  const prefixEl    = $id("prefix");
  const titleEl     = $id("title");
  const contentEl   = $id("content");
  const categoryEl  = $id("category");
  const locationEl  = $id("location");

  const shootDate   = $id("shootDate");
  const deadline    = $id("deadline");
  const shootHours  = $id("shootHours");
  const startTime   = $id("startTime");
  const endTime     = $id("endTime");

  const payEl       = $id("pay");
  const negEl       = $id("negotiable");

  const fileEl      = $id("imageFile");
  const previewEl   = $id("preview");

  const say=(t,ok=false)=>{ if(!msgEl) return; msgEl.textContent=t; msgEl.classList.add('show'); msgEl.classList.toggle('ok',ok); };

  const headers=(json=true)=>{
    const h={};
    if(json) h["Content-Type"]="application/json";
    const tok=localStorage.getItem("livee_token")||localStorage.getItem("liveeToken");
    if(tok) h.Authorization=`Bearer ${tok}`;
    return h;
  };

  const withTransform = (url, t) => {
    try{
      if(!url || !url.includes('/upload/')) return url || '';
      const [head, tail] = url.split('/upload/');
      return `${head}/upload/${t}/${tail}`;
    }catch{ return url; }
  };

  // ---------- (선택) 이미지 업로드 ----------
  fileEl?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)) { say('이미지 파일만 업로드'); e.target.value=''; return; }
    if(f.size>8*1024*1024) { say('이미지는 8MB 이하로'); e.target.value=''; return; }
    try{
      say('이미지 업로드 중…');
      const sig = await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)}).then(r=>r.json());
      const {cloudName, apiKey, timestamp, signature} = sig.data||sig;
      const fd=new FormData();
      fd.append('file',f); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd}).then(r=>r.json());
      if(!up.secure_url) throw new Error('업로드 실패');
      const cover=up.secure_url; const thumb=withTransform(cover, THUMB.card169);
      previewEl.src=thumb; previewEl.dataset.cover=cover; previewEl.dataset.thumb=thumb;
      say('이미지 업로드 완료', true);
    }catch(err){
      previewEl.removeAttribute('src'); delete previewEl.dataset.cover; delete previewEl.dataset.thumb;
      say('업로드 실패: '+(err.message||'오류'));
    }
  });

  // 출연료 협의 스위치
  negEl?.addEventListener('change', ()=>{
    if(negEl.checked){ payEl.value=''; payEl.disabled = true; }
    else{ payEl.disabled = false; }
  });

  // 날짜/시간 버튼 → 네이티브 인풋 포커스(간단 모달 대체)
  document.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-open]'); if(!b) return;
    const [kind, id] = String(b.dataset.open).split(':');
    const target = $id(id); if(!target) return;
    e.preventDefault();
    target.showPicker ? target.showPicker() : target.focus();
  });

  // ---------- 제출 ----------
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    // 필수 검증
    const brandName = (brandNameEl?.value||'').trim();
    const titleRaw  = (titleEl?.value||'').trim();
    if(!brandName){ say('브랜드명을 입력해주세요.'); return; }
    if(!titleRaw){ say('제목을 입력해주세요.'); return; }
    if(!categoryEl.value){ say('카테고리를 선택해주세요.'); return; }
    if(!shootDate.value){ say('촬영일을 선택해주세요.'); return; }
    if(!deadline.value){ say('공고 마감일을 선택해주세요.'); return; }
    if(!shootHours.value){ say('촬영 시간을 입력해주세요.'); return; }
    if(!startTime.value || !endTime.value){ say('시작/종료 시간을 입력해주세요.'); return; }

    // 말머리(선택) → 제목 앞에 붙이기(이미 있는 경우 중복 방지)
    const prefix = prefixEl.value.trim();
    let title = titleRaw;
    if(prefix && !/^\[.+\]/.test(titleRaw)) title = `[${prefix}] ${titleRaw}`;

    // 모집 직군 수집
    const roles = Array.from(document.querySelectorAll('.roles input[type="checkbox"]:checked'))
                  .map(i=>i.value);

    // 출연료
    let feeNum;
    if(!negEl.checked){
      const raw=String(payEl.value||'').replace(/,/g,'').trim();
      if(raw){
        const n=Number(raw);
        if(isNaN(n)||n<0){ say('출연료는 숫자로 입력해주세요.'); return; }
        feeNum = n;
      }
    }

    const coverImageUrl = previewEl?.dataset?.cover || '';
    const thumbnailUrl  = previewEl?.dataset?.thumb  || (coverImageUrl?withTransform(coverImageUrl,THUMB.card169):'');

    // 페이로드(스키마 흡수형)
    const payload = {
      type:"recruit",
      status:"published",
      title,
      category: categoryEl.value,
      brandName,
      brand: brandName, // 구 스키마 호환
      closeAt: `${deadline.value}T23:59:59.000Z`,

      ...(coverImageUrl?{coverImageUrl}:{}),
      ...(thumbnailUrl ?{thumbnailUrl }:{}),

      descriptionHTML: (contentEl?.value||'').trim(),
      roles,                 // 추가: 모집 직군(커스텀 필드)

      ...(feeNum!==undefined ? { fee: feeNum } : {}),
      feeNegotiable: !!negEl.checked,

      recruit:{
        recruitType:"product",
        brandName,
        location: (locationEl.value||'').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,  // 시간대 표기
        durationHours: Number(shootHours.value),           // 추가: 총 촬영시간
        pay: feeNum,
        payNegotiable: !!negEl.checked,
        requirements: (contentEl?.value||'').trim()
      }
    };

    try{
      say('등록 중…');
      const res = await fetch(`${API_BASE}/recruit-test`,{
        method:'POST', headers:headers(true), body:JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message || `등록 실패 (${res.status})`);
      alert('공고가 등록되었습니다.');
      location.href = 'recruit-board.html';
    }catch(err){
      say(err.message||'네트워크 오류');
    }
  });
})();