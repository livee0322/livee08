<!-- /js/recruit-new.js — v2.6 (brand/pay 강제 동기화) -->
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const THUMB = CFG.thumb || { card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto" };

  const $id = s => document.getElementById(s);
  const form        = $id("recruitForm");
  const brandNameEl = $id("brandName");
  const titleEl     = $id("title");
  const descEl      = $id("desc");
  const categoryEl  = $id("category");
  const locationEl  = $id("location");
  const shootDate   = $id("shootDate");
  const startTime   = $id("startTime");
  const endTime     = $id("endTime");
  const deadline    = $id("deadline");
  const payEl       = $id("pay");
  const negEl       = $id("negotiable");
  const fileEl      = $id("imageFile");
  const previewEl   = $id("preview");
  const msgEl       = $id("recruitMsg");

  const say=(t,ok=false)=>{ if(!msgEl) return; msgEl.textContent=t; msgEl.classList.add('show'); msgEl.classList.toggle('ok',ok); };
  const headers=(json=true)=>{ const h={}; if(json) h["Content-Type"]="application/json"; const tok=localStorage.getItem("livee_token")||localStorage.getItem("liveeToken"); if(tok) h.Authorization=`Bearer ${tok}`; return h; };

  const withTransform = (url, t) => { try{ if(!url.includes('/upload/')) return url; const [h,tail]=url.split('/upload/'); return `${h}/upload/${t}/${tail}`; }catch{ return url; } };

  fileEl?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)) { say('이미지 파일만 업로드'); e.target.value=''; return; }
    if(f.size>8*1024*1024) { say('이미지는 8MB 이하로'); e.target.value=''; return; }
    try{
      say('이미지 업로드 중…');
      const sig = await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)}).then(r=>r.json());
      const {cloudName, apiKey, timestamp, signature} = sig.data||sig;
      const fd=new FormData(); fd.append('file',f); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd}).then(r=>r.json());
      if(!up.secure_url) throw new Error('업로드 실패');
      const cover=up.secure_url; const thumb=withTransform(cover, THUMB.card169);
      previewEl.src=thumb; previewEl.dataset.cover=cover; previewEl.dataset.thumb=thumb;
      say('이미지 업로드 완료', true);
    }catch(err){ previewEl.removeAttribute('src'); delete previewEl.dataset.cover; delete previewEl.dataset.thumb; say('업로드 실패: '+(err.message||'오류')); }
  });

  negEl?.addEventListener('change', ()=>{ if(negEl.checked){ payEl.value=''; payEl.disabled=true; } else { payEl.disabled=false; } });

  form?.addEventListener('submit', async ev=>{
    ev.preventDefault();

    const brandName = (brandNameEl?.value||'').trim();          // ★ 반드시 채워서 전송
    const title     = (titleEl?.value||'').trim();
    const desc      = (descEl?.value||'').trim();
    if(!brandName) { say('브랜드명을 입력해주세요.'); return; }
    if(!title)     { say('제목을 입력해주세요.'); return; }
    if(!categoryEl.value){ say('카테고리를 선택해주세요.'); return; }
    if(!shootDate.value || !startTime.value || !endTime.value){ say('촬영일/시간을 입력해주세요.'); return; }
    if(!deadline.value){ say('마감일을 선택해주세요.'); return; }

    // 출연료 숫자 파싱 (협의 체크 시 undefined)
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

    // ★ 스키마 차이 흡수: top-level + nested 모두 세팅
    const payload = {
      type:"recruit",
      status:"published",
      title,
      category: categoryEl.value,
      brandName,                      // v2 라우터
      brand: brandName,               // 구 스키마 호환
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(coverImageUrl?{coverImageUrl}:{}),
      ...(thumbnailUrl ?{thumbnailUrl }:{}),
      ...(desc?{descriptionHTML:desc}:{}),

      // top-level fee도 같이 전송 (일부 모델/조회기에 사용)
      ...(feeNum!==undefined ? { fee: feeNum } : {}),
      feeNegotiable: !!negEl.checked,

      recruit:{
        recruitType:"product",
        brandName,                    // nested에도 동기화
        location: (locationEl.value||'').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        pay: feeNum,                  // nested pay 세팅
        payNegotiable: !!negEl.checked,
        requirements: desc
      }
    };

    try{
      say('등록 중…');
      const res = await fetch(`${API_BASE}/recruit-test`,{ method:'POST', headers:headers(true), body:JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message || `등록 실패 (${res.status})`);
      alert('공고가 등록되었습니다.');
      location.href = 'index.html#recruits';
    }catch(err){ say(err.message||'네트워크 오류'); }
  });
})();