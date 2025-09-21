/* recruit-new.js — v3.1
 * - 필드 순서/말머리/직군 칩
 * - 날짜/시간 모달 픽커
 * - Cloudinary 업로드(서명 기반)
 * - 기존 스키마 호환 payload
 */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const THUMB = CFG.thumb || { card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto" };

  const $id = s => document.getElementById(s);
  const say=(t,ok=false)=>{ const el=$id('recruitMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok',ok); };
  const headers=(json=true)=>{ const h={}; if(json) h["Content-Type"]="application/json"; const tok=localStorage.getItem("livee_token")||localStorage.getItem("liveeToken"); if(tok) h.Authorization=`Bearer ${tok}`; return h; };
  const withTransform = (url, t) => { try{ if(!url.includes('/upload/')) return url; const [h,tail]=url.split('/upload/'); return `${h}/upload/${t}/${tail}`; }catch{ return url; } };

  // ---------- DOM ----------
  const form        = $id("recruitForm");
  const brandNameEl = $id("brandName");
  const prefixEl    = $id("prefix");
  const titleEl     = $id("title");
  const descEl      = $id("desc");
  const categoryEl  = $id("category");
  const locationEl  = $id("location");

  const shootDateHidden = $id("shootDate");
  const shootDateBtn    = $id("shootDateBtn");
  const shootDateText   = $id("shootDateText");

  const deadlineHidden  = $id("deadline");
  const deadlineBtn     = $id("deadlineBtn");
  const deadlineText    = $id("deadlineText");

  const startHidden     = $id("startTime");
  const startBtn        = $id("startTimeBtn");
  const startText       = $id("startTimeText");

  const durationEl      = $id("duration");

  const payEl       = $id("pay");
  const negEl       = $id("negotiable");
  const fileEl      = $id("imageFile");
  const previewEl   = $id("preview");

  // ---------- 말머리 칩 ----------
  (function bindPrefixChips(){
    const wrap = document.getElementById('prefixChips');
    if(!wrap) return;
    wrap.addEventListener('click', (e)=>{
      const b = e.target.closest('.chip'); if(!b) return;
      wrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      prefixEl.value = b.dataset.v;
    });
  })();

  // ---------- 직군 → 본문 자동 헤더 ----------
  function selectedRoles(){
    return [...document.querySelectorAll('#roles input:checked')].map(i=>i.value);
  }

  // ---------- 날짜/시간 모달 ----------
  const pickerModal = $id('pickerModal');
  const pickerTitle = $id('pickerTitle');
  const pickerBody  = $id('pickerBody');
  const pickerOk    = $id('pickerOk');
  const pickerCancel= $id('pickerCancel');
  const pickerClose = $id('pickerClose');

  function openPicker(kind, initial){
    pickerModal.classList.add('show');
    pickerModal.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';

    if(kind==='date'){
      pickerTitle.textContent = '날짜 선택';
      pickerBody.innerHTML = `<input id="__date" type="date" class="input" value="${initial||''}" style="height:48px">`;
    }else if(kind==='time'){
      pickerTitle.textContent = '시간 선택';
      pickerBody.innerHTML = `<input id="__time" type="time" class="input" value="${initial||''}" step="60" style="height:48px">`;
    }
    return new Promise((resolve,reject)=>{
      function done(ok){
        pickerModal.classList.remove('show');
        pickerModal.setAttribute('aria-hidden','true');
        document.documentElement.style.overflow='';
        pickerOk.onclick = pickerCancel.onclick = pickerClose.onclick = null;
        if(!ok) return reject('cancel');
        const v = kind==='date' ? ($id('__date').value) : ($id('__time').value);
        resolve(v);
      }
      pickerOk.onclick = ()=> done(true);
      pickerCancel.onclick = pickerClose.onclick = ()=> done(false);
    });
  }

  shootDateBtn?.addEventListener('click', async ()=>{
    try{
      const v = await openPicker('date', shootDateHidden.value);
      if(v){ shootDateHidden.value = v; shootDateText.textContent = v; }
    }catch{}
  });
  deadlineBtn?.addEventListener('click', async ()=>{
    try{
      const v = await openPicker('date', deadlineHidden.value);
      if(v){ deadlineHidden.value = v; deadlineText.textContent = v; }
    }catch{}
  });
  startBtn?.addEventListener('click', async ()=>{
    try{
      const v = await openPicker('time', startHidden.value);
      if(v){ startHidden.value = v; startText.textContent = v; }
    }catch{}
  });

  // ---------- 이미지 업로드 ----------
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

  // 출연료 협의
  negEl?.addEventListener('change', ()=>{ if(negEl.checked){ payEl.value=''; payEl.disabled=true; } else { payEl.disabled=false; } });

  // ---------- 제출 ----------
  form?.addEventListener('submit', async ev=>{
    ev.preventDefault();

    const brandName = (brandNameEl?.value||'').trim();
    const prefix    = (prefixEl?.value||'').trim();
    const title     = (titleEl?.value||'').trim();
    const descRaw   = (descEl?.value||'').trim();
    const roles     = selectedRoles();

    if(!brandName){ say('브랜드명을 입력해주세요.'); return; }
    if(!prefix){ say('말머리를 선택/입력해주세요.'); return; }
    if(!title){ say('제목을 입력해주세요.'); return; }
    if(!categoryEl.value){ say('카테고리를 선택해주세요.'); return; }
    if(!shootDateHidden.value){ say('촬영일을 선택해주세요.'); return; }
    if(!deadlineHidden.value){ say('공고 마감일을 선택해주세요.'); return; }
    if(!startHidden.value){ say('시작 시간을 선택해주세요.'); return; }
    if(!durationEl.value){ say('촬영 시간을 입력해주세요.'); return; }

    // 본문 앞에 직군 요약 블록 자동 prepend
    const rolesBlock = roles.length ? `■ 모집 직군: ${roles.join(' · ')}\n\n` : '';
    const desc = rolesBlock + (descRaw || '');

    // 출연료 숫자
    let feeNum;
    if(!negEl.checked){
      const raw=String(payEl.value||'').replace(/,/g,'').trim();
      if(raw){
        const n=Number(raw);
        if(isNaN(n)||n<0){ say('출연료는 숫자로 입력해주세요.'); return; }
        feeNum = n;
      }
    }

    // 종료시각 계산 (시작+duration)
    function calcEnd(startHHmm, hoursFloat){
      const [H,M] = startHHmm.split(':').map(Number);
      const d = new Date(2000,0,1,H,M||0);
      d.setMinutes(d.getMinutes() + Math.round(Number(hoursFloat)*60));
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }
    const endTime = calcEnd(startHidden.value, durationEl.value);

    const coverImageUrl = previewEl?.dataset?.cover || '';
    const thumbnailUrl  = previewEl?.dataset?.thumb  || (coverImageUrl?withTransform(coverImageUrl,THUMB.card169):'');

    // Payload (구/신 스키마 호환)
    const payload = {
      type:"recruit",
      status:"published",
      title: `${prefix} ${title}`.trim(),
      category: categoryEl.value,
      brandName,
      brand: brandName,
      location: (locationEl.value||'').trim(),
      closeAt: `${deadlineHidden.value}T23:59:59.000Z`,
      ...(coverImageUrl?{coverImageUrl}:{}),
      ...(thumbnailUrl ?{thumbnailUrl }:{}),
      ...(desc?{descriptionHTML:desc}:{}),
      ...(feeNum!==undefined ? { fee: feeNum } : {}),
      feeNegotiable: !!negEl.checked,

      recruit:{
        recruitType:"product",
        brandName,
        location: (locationEl.value||'').trim(),
        shootDate: new Date(`${shootDateHidden.value}T00:00:00.000Z`),
        shootTime: `${startHidden.value}~${endTime}`,
        durationHours: Number(durationEl.value),
        roles, // 선택 직군 배열
        pay: feeNum,
        payNegotiable: !!negEl.checked,
        requirements: desc
      },

      // 메타(말머리/직군) - 조회용
      meta:{
        prefix,
        roles
      }
    };

    try{
      say('등록 중…');
      const res = await fetch(`${API_BASE}/recruit-test`,{ method:'POST', headers:headers(true), body:JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message || `등록 실패 (${res.status})`);
      alert('공고가 등록되었습니다.');
      location.href = 'recruit-board.html';
    }catch(err){ say(err.message||'네트워크 오류'); }
  });
})();