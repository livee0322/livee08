/* js/recruit-new.js — v3.2.0 (Recruit-test 스키마 정합) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const THUMB = CFG.thumb || { card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto" };

  const $id = (s) => document.getElementById(s);
  const form=$id("recruitForm"), msgEl=$id("recruitMsg");

  const brandNameEl=$id("brandName"), prefixEl=$id("prefix"), titleEl=$id("title");
  const contentEl=$id("content"), categoryEl=$id("category"), locationEl=$id("location");

  const shootDate=$id("shootDate"), deadline=$id("deadline");
  const shootHours=$id("shootHours"), startTime=$id("startTime"), endTime=$id("endTime");

  const payEl=$id("pay"), negEl=$id("negotiable");
  const fileEl=$id("imageFile"), previewEl=$id("preview");

  const say=(t,ok=false)=>{ if(!msgEl) return; msgEl.textContent=t; msgEl.classList.add('show'); msgEl.classList.toggle('ok',ok); };
  const headers=(json=true)=>{ const h={}; if(json) h["Content-Type"]="application/json";
    const tok=localStorage.getItem("livee_token")||localStorage.getItem("liveeToken");
    if(tok) h.Authorization=`Bearer ${tok}`; return h; };
  const withTransform=(url,t)=>{ try{ if(!url||!url.includes('/upload/')) return url||''; const [a,b]=url.split('/upload/'); return `${a}/upload/${t}/${b}`; }catch{ return url; } };

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

  negEl?.addEventListener('change', ()=>{
    if(negEl.checked){ payEl.value=''; payEl.disabled = true; } else { payEl.disabled = false; }
  });

  document.addEventListener('click', (e)=>{
    const b=e.target.closest('[data-open]'); if(!b) return;
    const [, id] = String(b.dataset.open).split(':'); const t=$id(id); if(!t) return;
    e.preventDefault(); t.showPicker ? t.showPicker() : t.focus();
  });

  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    const brandName = (brandNameEl?.value||'').trim();
    const titleRaw  = (titleEl?.value||'').trim();
    if(!brandName) return say('브랜드명을 입력해주세요.');
    if(!titleRaw)  return say('제목을 입력해주세요.');
    if(!categoryEl.value) return say('카테고리를 선택해주세요.');
    if(!shootDate.value)  return say('촬영일을 선택해주세요.');
    if(!deadline.value)   return say('공고 마감일을 선택해주세요.');
    if(!shootHours.value) return say('촬영 시간을 입력해주세요.');
    if(!startTime.value || !endTime.value) return say('시작/종료 시간을 입력해주세요.');

    const prefix = (prefixEl?.value||'').trim();
    let title = titleRaw;
    if(prefix && !/^\[.+\]/.test(titleRaw)) title = `[${prefix}] ${titleRaw}`;

    const roles = Array.from(document.querySelectorAll('.roles input[type="checkbox"]:checked')).map(i=>i.value);

    let feeNum;
    if(!negEl.checked){
      const n = Number(String(payEl.value||'').replace(/,/g,'').trim());
      if(!Number.isFinite(n) || n<0) return say('출연료는 숫자로 입력해주세요.');
      feeNum = n;
    }

    const coverImageUrl = previewEl?.dataset?.cover || '';
    const thumbnailUrl  = previewEl?.dataset?.thumb  || (coverImageUrl?withTransform(coverImageUrl,THUMB.card169):'');

    const payload = {
      type:'recruit',
      status:'published',
      title,
      category: categoryEl.value,
      brandName,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(coverImageUrl?{coverImageUrl}:{}),
      ...(thumbnailUrl ?{thumbnailUrl }:{}),
      descriptionHTML: (contentEl?.value||'').trim(),
      roles,

      // 상위 요약(목록 카드에서 사용)
      ...(feeNum!==undefined ? { fee: feeNum } : {}),
      feeNegotiable: !!negEl.checked,

      // 상세
      recruit: {
        recruitType: 'product',
        brandName,
        location: (locationEl.value||'').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        durationHours: Number(shootHours.value),
        pay: feeNum,
        payNegotiable: !!negEl.checked,
        requirements: (contentEl?.value||'').trim()
      }
    };

    try{
      say('등록 중…');
      const r = await fetch(`${API_BASE}/recruit-test`, { method:'POST', headers:headers(true), body:JSON.stringify(payload) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `등록 실패 (${r.status})`);
      alert('공고가 등록되었습니다.');
      location.href = 'recruit-board.html';
    }catch(err){ say(err.message||'네트워크 오류'); }
  });
})();