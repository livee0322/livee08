
/* byhen-admin.page.js — v2.2.0 (offline-friendly)
   - 비로그인/데모/서버 장애에서도 업로드·저장 가능
   - Cloudinary: signed → unsigned(CFG) → unsigned(Cloudinary demo) 3단계 폴백
*/
(function () {
  'use strict';
  if (window.__BYHEN_ADMIN_LOADED__) return;
  window.__BYHEN_ADMIN_LOADED__ = true;

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const ENTITY = ('/' + (EP.byhen || 'byhen-test')).replace(/\/{2,}/g, '/');

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const DEMO = !!CFG.demo || /github\.io$/i.test(location.hostname) || !TOKEN; // 로그인 없어도 데모 취급
  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  const CLD = CFG.cloudinary || {}; // { cloudName, uploadPreset }

  const THUMB = {
    square:   'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169: 'c_fill,g_auto,w_1600,h_900,f_auto,q_auto',
    gallery:  'c_fill,g_auto,w_800,h_800,f_auto,q_auto',
    logo:     'c_fill,g_auto,w_512,h_512,f_auto,q_auto',
  };

  const $ = (s, el=document)=>el.querySelector(s);
  const on = (el, ev, fn)=>el && el.addEventListener(ev, fn);
  const $pick = (...ids)=>ids.map(id=>document.getElementById(id)).find(Boolean);
  const say = (t, ok=false)=>{ const el=$pick('bhMsg','adMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };

  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8); }catch{ return url; } };

  const state = { id:'', heroImageUrl:'', logoUrl:'', studioPhotos:[], portfolioPhotos:[], pending:0 };
  const bump = (n)=>{ state.pending=Math.max(0, state.pending+n); };

  // -------- Cloudinary Upload (3단계 폴백) --------
  async function getSignature(){
    // 데모/비로그인/서버다운 상황에서는 서명 건너뜀
    if (DEMO) throw new Error('SKIP_SIGNATURE_DEMO');
    const res = await fetch(`${API_BASE}/uploads/signature`, { method:'POST', headers:headers(false) }).catch(()=>null);
    if(!res) throw new Error('HTTP_FETCH_FAIL');
    const j = await res.json().catch(()=> ({}));
    if(!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
    return j.data || j;
  }

  async function uploadUnsignedWith(cloudName, uploadPreset, file){
    if(!cloudName || !uploadPreset) throw new Error('NO_UNSIGNED_PRESET');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', uploadPreset);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
    const j = await r.json().catch(()=> ({}));
    if(!r.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${r.status}`);
    return j.secure_url;
  }

  async function uploadImage(file){
    // 1) 시그니처 시도
    try{
      const sig = await getSignature();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.apiKey);
      fd.append('timestamp', sig.timestamp);
      fd.append('signature', sig.signature);
      const u = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
      const r = await fetch(u, { method:'POST', body:fd });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${r.status}`);
      return j.secure_url;
    }catch(e1){
      console.warn('[upload signed failed] → try unsigned CFG', e1?.message||e1);
      // 2) CFG 기반 unsigned
      try{
        return await uploadUnsignedWith(CLD.cloudName, CLD.uploadPreset, file);
      }catch(e2){
        console.warn('[upload unsigned CFG failed] → try unsigned DEMO', e2?.message||e2);
        // 3) Cloudinary DEMO preset 폴백
        // 공식 문서 예시: cloudName=demo, uploadPreset=docs_upload_example_us_preset
        return await uploadUnsignedWith('demo', 'docs_upload_example_us_preset', file);
      }
    }
  }

  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  async function init(){
    // 기본정보
    const name       = $pick('bhName','name');
    const tagline    = $pick('bhTagline','tagline');
    const locationEl = $pick('bhLocation','location');
    const hours      = $pick('bhHours','hours');
    const phone      = $pick('bhPhone','phone');
    const kakao      = $pick('bhKakao','kakaoUrl');
    const website    = $pick('bhWebsite','website');
    const mapUrl     = $pick('bhMapUrl','map');

    // 히어로/로고
    const heroTrig=$pick('heroTrigger','upHeroImage'), heroFile=$pick('heroFile','fileHeroImage'), heroPrev=$pick('heroPrev','prevHeroImage');
    const logoTrig=$pick('logoTrigger','upHeroLogo'),  logoFile=$pick('logoFile','fileHeroLogo'),  logoPrev=$pick('logoPrev','prevHeroLogo');

    // 갤러리
    const studioTrig=$pick('studioTrigger','upStudio'), studioFile=$pick('studioFile','fileStudio'), studioGrid=$pick('studioGrid');
    const pfTrig=$pick('pfTrigger','upPortfolio'),      pfFile=$pick('pfFile','filePortfolio'),    pfGrid=$pick('pfGrid');

    // 가격
    const pricingWrap=$pick('pricingWrap','plans'), addPlanBtn=$pick('addPlanBtn','addPlan');

    // 예약
    const leadDays=$pick('leadDays'), timeslots=$pick('timeslots');
    const bookedWrap=$pick('bookedWrap'), addBookedBtn=$pick('addBookedBtn');
    const closedWrap=$pick('closedWrap'), addClosedBtn=$pick('addClosedBtn');

    // FAQ/정책
    const faqWrap=$pick('faqWrap','faqList'), addFaqBtn=$pick('addFaqBtn','addFaq'), policy=$pick('policy');

    // 숏폼
    const shortsWrap=$pick('shortsWrap','shortsList'), addShortBtn=$pick('addShortBtn','addShort'), shortUrlInp=$pick('shortUrl');

    // 액션
    const saveBtn=$pick('saveDraftBtn','adSave'), pubBtn=$pick('publishBtn');

    // 트리거
    on(heroTrig,'click',()=>heroFile?.click());
    on(logoTrig,'click',()=>logoFile?.click());
    on(studioTrig,'click',()=>studioFile?.click());
    on(pfTrig,'click',()=>pfFile?.click());

    // 업로드 - 단일
    heroFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); if(heroPrev) heroPrev.src=local; bump(+1);
      try{ say('배경 이미지 업로드 중…'); const url=await uploadImage(f); state.heroImageUrl=withTransform(url,THUMB.cover169); if(heroPrev) heroPrev.src=state.heroImageUrl; say('업로드 완료',true); }
      catch(err){ console.error('[hero upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    logoFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); if(logoPrev) logoPrev.src=local; bump(+1);
      try{ say('로고 업로드 중…'); const url=await uploadImage(f); state.logoUrl=withTransform(url,THUMB.logo); if(logoPrev) logoPrev.src=state.logoUrl; say('업로드 완료',true); }
      catch(err){ console.error('[logo upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    // 업로드 - 멀티
    function drawGrid(gridEl, arr){
      if(!gridEl) return;
      gridEl.innerHTML = arr.map((u,i)=>`
        <div class="sub">
          <img src="${u}" alt="img-${i}">
          <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
        </div>`).join('') || '<div class="note">이미지를 추가하세요</div>';
    }
    studioGrid?.addEventListener('click', e=>{ const b=e.target.closest('.rm'); if(!b) return; state.studioPhotos.splice(Number(b.dataset.i),1); drawGrid(studioGrid,state.studioPhotos); });
    pfGrid?.addEventListener('click', e=>{ const b=e.target.closest('.rm'); if(!b) return; state.portfolioPhotos.splice(Number(b.dataset.i),1); drawGrid(pfGrid,state.portfolioPhotos); });

    async function addFilesTo(arr, files, label, grid){
      const list = Array.from(files||[]);
      for(const f of list){
        if(!isImgOk(f)) continue;
        bump(+1);
        try{ say(`${label} 업로드 중…`); const url=withTransform(await uploadImage(f), THUMB.gallery); arr.push(url); drawGrid(grid, arr); say('업로드 완료',true); }
        catch(err){ console.error(`[${label} upload]`,err); say('업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
    }
    studioFile?.addEventListener('change', e=>{ addFilesTo(state.studioPhotos, e.target.files, '스튜디오 이미지', studioGrid); e.target.value=''; });
    pfFile?.addEventListener('change',     e=>{ addFilesTo(state.portfolioPhotos, e.target.files, '포트폴리오 이미지', pfGrid); e.target.value=''; });

    // 가격
    function addPlanRow(p={name:'',price:'',duration:'',includes:[],options:[]}){
      const row=document.createElement('div'); row.className='plan-row';
      row.innerHTML=`
        <div class="grid">
          <input class="input p-name" placeholder="상품명" value="${p.name||''}">
          <input class="input p-price" type="number" min="0" placeholder="가격(원)" value="${p.price||''}">
          <input class="input p-dur" placeholder="소요시간" value="${p.duration||''}">
          <button type="button" class="ic rm" aria-label="삭제">✕</button>
        </div>
        <div class="grid">
          <input class="input p-inc" placeholder="포함사항(쉼표)" value="${(p.includes||[]).join(', ')}">
          <input class="input p-opt" placeholder="옵션 예) 추가컷+30000, 헤어+50000" value="${(p.options||[]).map(o=>`${o.name}+${o.price||0}`).join(', ')}">
        </div>`;
      pricingWrap?.appendChild(row);
      on(row.querySelector('.rm'),'click',()=>row.remove());
    }
    on(addPlanBtn,'click',()=>addPlanRow());

    function collectPlans(){
      const rows=[...pricingWrap?.querySelectorAll('.plan-row')||[]];
      return rows.map(r=>{
        const name=r.querySelector('.p-name')?.value?.trim()||'';
        const price=Number(r.querySelector('.p-price')?.value||0);
        const duration=r.querySelector('.p-dur')?.value?.trim()||'';
        const includes=(r.querySelector('.p-inc')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const options=(r.querySelector('.p-opt')?.value||'').split(',').map(s=>s.trim()).filter(Boolean)
          .map(s=>{ const m=s.split('+'); return { name:(m[0]||'').trim(), price:Number(m[1]||0) }; }).filter(o=>o.name);
        return { name, price, duration, includes, options };
      }).filter(p=>p.name);
    }

    // 예약
    function addDateRow(wrap,val=''){
      if(!wrap) return;
      const row=document.createElement('div'); row.className='date-row';
      row.innerHTML=`<input type="date" class="input d" value="${val?String(val).slice(0,10):''}">
                     <button type="button" class="ic rm" aria-label="삭제">✕</button>`;
      wrap.appendChild(row);
      on(row.querySelector('.rm'),'click',()=>row.remove());
    }
    on(addBookedBtn,'click',()=>addDateRow(bookedWrap));
    on(addClosedBtn,'click',()=>addDateRow(closedWrap));
    const collectDates=(wrap)=>[...wrap?.querySelectorAll('.d')||[]].map(i=>i.value).filter(Boolean);
    const parseSlots=()=> (timeslots?.value||'').split(',').map(s=>s.trim()).filter(Boolean);

    // FAQ
    function addFaqRow(f={q:'',a:''}){
      const row=document.createElement('div'); row.className='faq-row';
      row.innerHTML=`
        <input class="input f-q" placeholder="질문" value="${f.q||''}">
        <textarea class="input f-a" rows="3" placeholder="답변">${f.a||''}</textarea>
        <div class="row-end"><button type="button" class="ic rm" aria-label="삭제">✕</button></div>`;
      faqWrap?.appendChild(row);
      on(row.querySelector('.rm'),'click',()=>row.remove());
    }
    on(addFaqBtn,'click',()=>addFaqRow());
    const collectFaq=()=> ([...faqWrap?.querySelectorAll('.faq-row')||[]]
      .map(r=>({ q:r.querySelector('.f-q')?.value?.trim()||'', a:r.querySelector('.f-a')?.value?.trim()||'' }))
      .filter(x=>x.q&&x.a));

    // 숏폼
    function addShortRow(url=''){
      const row=document.createElement('div'); row.className='short-row';
      row.innerHTML=`
        <div class="l-prev"><img alt=""></div>
        <div class="l-body">
          <input class="input s-url" type="url" placeholder="YouTube/Instagram/TikTok 링크" value="${url||''}">
          <button class="ic rm" type="button" aria-label="삭제">✕</button>
        </div>`;
      shortsWrap?.appendChild(row);
      const input=row.querySelector('.s-url'); const img=row.querySelector('.l-prev img');
      const ytId=(u='')=>(u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)||[])[1]||'';
      const thumb=(u='')=> ytId(u) ? `https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg` : '';
      const update=()=>{ const u=input.value.trim(); img.src = u ? thumb(u) : ''; };
      on(input,'input',update); on(row.querySelector('.rm'),'click',()=>row.remove()); update();
    }
    on(addShortBtn,'click',()=>addShortRow(shortUrlInp?.value||''));

    const collectShorts=()=> ([...shortsWrap?.querySelectorAll('.short-row')||[]]
      .map(r=>({ sourceUrl: r.querySelector('.s-url')?.value?.trim() || '' }))
      .filter(s=>s.sourceUrl));

    // 로드
    state.id = new URLSearchParams(location.search).get('id') || '';
    await loadExisting();

    async function loadExisting(){
      try{
        say('불러오는 중…');
        const tryFetch = async (path)=>{
          try{ const r=await fetch(path,{headers:headers(false)}); const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`); return j.data||j; }
          catch(e){ console.warn('[load fail]', path, e?.message||e); return null; }
        };
        let data=null;
        if(state.id) data=await tryFetch(`${API_BASE}${ENTITY}/${state.id}`);
        if(!data){ const j=await tryFetch(`${API_BASE}${ENTITY}?slug=byhen&limit=1`); const arr=(j&&(j.items||j.docs||j.data||[]))||[]; data=Array.isArray(arr)&&arr[0]?arr[0]:null; }
        if(!data){ const j=await tryFetch(`${API_BASE}${ENTITY}?limit=1`); const arr=(j&&(j.items||j.docs||j.data||[]))||[]; data=Array.isArray(arr)&&arr[0]?arr[0]:null; }
        if(!data){ const saved=localStorage.getItem('byhen_admin_draft'); if(saved) data=JSON.parse(saved); }

        if(!data){ say('새 페이지 작성 중', true); return; }

        name && (name.value = data.name||'');
        tagline && (tagline.value = data.tagline||'');
        locationEl && (locationEl.value = data.location||'');
        hours && (hours.value = data.hours||'');
        phone && (phone.value = data.contact?.phone||'');
        kakao && (kakao.value = data.contact?.kakaoUrl||'');
        website && (website.value = data.links?.website||'');
        mapUrl && (mapUrl.value = data.links?.map||'');

        state.heroImageUrl = data.hero?.image || '';
        state.logoUrl      = data.hero?.logo  || '';
        if(heroPrev && state.heroImageUrl) heroPrev.src=state.heroImageUrl;
        if(logoPrev && state.logoUrl)      logoPrev.src=state.logoUrl;

        state.studioPhotos    = Array.isArray(data.studioPhotos)? data.studioPhotos.slice(0,60) : [];
        state.portfolioPhotos = Array.isArray(data.portfolioPhotos)? data.portfolioPhotos.slice(0,120) : [];
        drawGrid(studioGrid, state.studioPhotos);
        drawGrid(pfGrid, state.portfolioPhotos);

        (Array.isArray(data.pricing)?data.pricing:[]).forEach(addPlanRow);
        leadDays && (leadDays.value = data.availability?.leadDays ?? 0);
        timeslots && (timeslots.value = (data.availability?.timeslots||[]).join(', '));
        (data.availability?.booked||[]).forEach(d=>addDateRow(bookedWrap,d));
        (data.availability?.closed||[]).forEach(d=>addDateRow(closedWrap,d));

        (Array.isArray(data.faq)?data.faq:[]).forEach(addFaqRow);
        policy && (policy.value = data.policy || '');
        (Array.isArray(data.shorts)?data.shorts:[]).forEach(s=>addShortRow(s.sourceUrl||''));

        say('로드 완료', true);
      }catch(err){
        console.error('[byhen load fatal]', err);
        say('불러오기 실패: '+(err.message||'오류'));
      }
    }

    // 검증/저장
    function validate(){ if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; } if(!name?.value?.trim()){ say('브랜드명을 입력해주세요'); return false; } return true; }

    function collectPayload(status){
      const contact={ phone:phone?.value?.trim()||undefined, kakaoUrl:kakao?.value?.trim()||undefined };
      const links={ website:website?.value?.trim()||undefined, map:mapUrl?.value?.trim()||undefined };
      const availability={ leadDays:Number(leadDays?.value||0), timeslots:parseSlots(), booked:collectDates(bookedWrap), closed:collectDates(closedWrap) };
      return {
        slug:'byhen', type:'brand', status,
        name:name?.value?.trim()||undefined,
        tagline:tagline?.value?.trim()||undefined,
        location:locationEl?.value?.trim()||undefined,
        hours:hours?.value?.trim()||undefined,
        hero:{ image:state.heroImageUrl||undefined, logo:state.logoUrl||undefined },
        contact, links,
        studioPhotos:state.studioPhotos, portfolioPhotos:state.portfolioPhotos,
        pricing:collectPlans(), availability,
        faq:collectFaq(), policy:policy?.value||'',
        shorts:collectShorts()
      };
    }

    async function submit(status){
      if(!validate()) return;
      const payload = collectPayload(status);

      // 데모/비로그인/서버 불가 → 로컬 저장
      const localSave=(msg='로컬에 저장했습니다(데모/오프라인).')=>{ localStorage.setItem('byhen_admin_draft', JSON.stringify(payload)); say(msg, true); };

      if (DEMO) return localSave();

      try{
        say(status==='published'?'발행 중…':'임시저장 중…');
        const url = state.id ? `${API_BASE}${ENTITY}/${state.id}` : `${API_BASE}${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(payload) });
        const data = await res.json().catch(()=> ({}));
        if(!res.ok || data.ok===false) throw new Error(data.message || `HTTP_${res.status}`);
        say(status==='published'?'발행되었습니다':'임시저장 완료', true);
        setTimeout(()=>location.href='byhen.html', 500);
      }catch(e){
        console.warn('[save failed → local]', e);
        localSave('서버 오류로 로컬에 저장했습니다.');
      }
    }

    on(saveBtn,'click', (e)=>{ e.preventDefault(); submit('draft'); });
    on(pubBtn, 'click', (e)=>{ e.preventDefault(); submit('published'); });

    // 디버그
    window.BYHEN_ADMIN = { state, submit };
  }
})();
