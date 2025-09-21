/* byhen-admin.js — v1.0.3
   - Cloudinary 서명 GET 호출 (+필드명 호환)
   - 업로드 안정화 / 오류 메시지 개선
   - /brand-test 스키마 저장(서버가 brands-test면 자동 폴백)
*/
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    let p = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(p) ? p : (location.origin + (p.startsWith('/') ? p : '/' + p));
  })();

  const BRAND_BASE = (CFG.endpoints?.byhen || '/brand-test').replace(/^\/+/, '');
  const BRAND_URL_PRIMARY   = `${API_BASE}/${BRAND_BASE.replace(/^brands-test$/,'brand-test')}`;
  const BRAND_URL_ALTERNATE = `${API_BASE}/brand-test`;

  const THUMB = CFG.thumb || {
    card169: 'c_fill,g_auto,w_640,h_360,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square:  'c_fill,g_auto,w_600,h_600,f_auto,q_auto'
  };

  // ------- DOM -------
  const $  = (s, el=document) => el.querySelector(s);
  const $id = (s) => document.getElementById(s);
  const say = (t, ok=false) => { const el=$id('admMsg'); el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };

  const form = $id('brandForm');
  const nameEl=$id('name'), slugEl=$id('slug');
  const introEl=$id('intro'), descEl=$id('description');
  const guideEl=$id('usageGuide'), priceEl=$id('priceInfo');

  const phoneEl=$id('phone'), emailEl=$id('email'), kakaoEl=$id('kakao');
  const addressEl=$id('address'), mapLinkEl=$id('mapLink');

  const availableHoursEl=$id('availableHours'), timeslotsEl=$id('timeslots'), availableDatesEl=$id('availableDates');
  const closedEl=$id('closed'), bookedEl=$id('booked');

  const thumbTrigger=$id('thumbTrigger'), thumbFile=$id('thumbFile'), thumbPrev=$id('thumbPrev');
  const subsTrigger=$id('subsTrigger'),  subsFile=$id('subsFile'),   subsGrid=$id('subsGrid');
  const galleryTrigger=$id('galleryTrigger'), galleryFile=$id('galleryFile'), galleryGrid=$id('galleryGrid');

  // 상태
  const state = {
    id: new URLSearchParams(location.search).get('id') || '',
    slugQuery: new URLSearchParams(location.search).get('slug') || '',
    uploading: 0,
    thumbnail: '',
    subThumbnails: [],
    gallery: []
  };
  const bump = (n)=>{ state.uploading=Math.max(0, state.uploading+n); };

  // ------- helpers -------
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h.Authorization=`Bearer ${TOKEN}`; return h; };
  const withTr = (url, t) => { try{ if(!/\/upload\//.test(url)) return url; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8); }catch{return url;} };
  const toArr = (v) => (String(v||'').trim()? String(v).split(',').map(s=>s.trim()).filter(Boolean):[]);

  async function getSignature(){
    const sigPath = (CFG.endpoints?.uploadsSignature || '/uploads/signature').replace(/^\/+/, '');
    const r = await fetch(`${API_BASE}/${sigPath}`, { headers: headers(false) }); // ✅ GET
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);

    const d = j.data || j;
    const cloudName = d.cloudName || d.cloud_name;
    const apiKey    = d.apiKey    || d.api_key;
    const timestamp = d.timestamp;
    const signature = d.signature;
    if(!cloudName || !apiKey || !timestamp || !signature){
      throw new Error('서명 응답 형식 오류(cloudName/apiKey/timestamp/signature)');
    }
    return { cloudName, apiKey, timestamp, signature };
  }

  async function uploadImage(file, kind='cover169'){
    if(!file) throw new Error('파일이 없습니다.');
    if(!/^image\//.test(file.type) || file.size>8*1024*1024) throw new Error('이미지(≤8MB)만 가능');

    const {cloudName,apiKey,timestamp,signature}=await getSignature();
    const fd=new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);

    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({}));

    if(!res.ok || !j.secure_url){
      // Cloudinary 표준 에러 메시지 노출
      throw new Error(j?.error?.message || `Cloudinary_${res.status}`);
    }
    const t = (kind==='square')?THUMB.square:(kind==='card169')?THUMB.card169:THUMB.cover169;
    return { cover:j.secure_url, thumb:withTr(j.secure_url,t) };
  }

  // ------- 이미지 트리거 -------
  thumbTrigger?.addEventListener('click', ()=> thumbFile?.click());
  subsTrigger?.addEventListener('click', ()=> subsFile?.click());
  galleryTrigger?.addEventListener('click', ()=> galleryFile?.click());

  function drawSubs(){
    subsGrid.innerHTML = state.subThumbnails.map((u,i)=>`
      <div class="sub"><img src="${u}" alt="sub-${i}" /><button class="rm" data-i="${i}" type="button" aria-label="삭제">×</button></div>
    `).join('');
  }
  subsGrid?.addEventListener('click', (e)=>{
    const b=e.target.closest('.rm'); if(!b) return;
    state.subThumbnails.splice(Number(b.dataset.i),1); drawSubs();
  });

  function drawGallery(){
    galleryGrid.innerHTML = state.gallery.map((u,i)=>`
      <div class="sub"><img src="${u}" alt="g-${i}" /><button class="rm" data-i="${i}" type="button" aria-label="삭제">×</button></div>
    `).join('');
  }
  galleryGrid?.addEventListener('click', (e)=>{
    const b=e.target.closest('.rm'); if(!b) return;
    state.gallery.splice(Number(b.dataset.i),1); drawGallery();
  });

  thumbFile?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const local=URL.createObjectURL(f); thumbPrev.src=local; thumbPrev.style.display='block'; bump(+1);
    try{
      say('메인 이미지 업로드 중…');
      const u=await uploadImage(f,'cover169');
      state.thumbnail = u.thumb;
      thumbPrev.src = state.thumbnail;
      say('업로드 완료',true);
    }catch(err){ console.error(err); say('메인 업로드 실패: '+(err.message||'오류')); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });

  subsFile?.addEventListener('change', async (e)=>{
    const files=[...(e.target.files||[])].slice(0, Math.max(0,5-state.subThumbnails.length));
    for(const f of files){
      bump(+1);
      try{
        const u=await uploadImage(f,'card169');
        state.subThumbnails.push(u.thumb);
        drawSubs();
      }catch(err){ console.error(err); say('서브 업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-1); }
    }
    e.target.value='';
  });

  galleryFile?.addEventListener('change', async (e)=>{
    const files=[...(e.target.files||[])];
    for(const f of files){
      bump(+1);
      try{
        const u=await uploadImage(f,'card169');
        state.gallery.push(u.thumb);
        drawGallery();
      }catch(err){ console.error(err); say('갤러리 업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-1); }
    }
    e.target.value='';
  });

  // ------- 동기화 -------
  nameEl?.addEventListener('input', ()=>{
    if(!slugEl.value || slugEl.dataset.autofill==='1'){
      slugEl.dataset.autofill='1';
      slugEl.value = (nameEl.value||'').toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    }
  });
  slugEl?.addEventListener('input', ()=>{ slugEl.dataset.autofill='0'; slugEl.value=slugEl.value.toLowerCase().trim().replace(/\s+/g,'-'); });

  // ------- payload & 저장 -------
  const toArr = (v) => (String(v||'').trim()? String(v).split(',').map(s=>s.trim()).filter(Boolean):[]);
  const buildPayload = (status='draft') => ({
    type:'brand',
    status,
    slug: (slugEl.value||'').toLowerCase().trim(),
    name: (nameEl.value||'').trim(),
    thumbnail: state.thumbnail || undefined,
    subThumbnails: state.subThumbnails,
    gallery: state.gallery,
    intro: (introEl.value||'').trim(),
    description: (descEl.value||'').trim(),
    usageGuide: (guideEl.value||'').trim(),
    priceInfo: (priceEl.value||'').trim(),
    contact: {
      phone:(phoneEl.value||'').trim(),
      email:(emailEl.value||'').trim(),
      kakao:(kakaoEl.value||'').trim()
    },
    address:(addressEl.value||'').trim(),
    map:{ link:(mapLinkEl.value||'').trim() },
    availableHours:(availableHoursEl.value||'').trim(),
    timeslots: toArr(timeslotsEl.value),
    availableDates: toArr(availableDatesEl.value),
    closed: toArr(closedEl.value),
    booked: toArr(bookedEl.value)
  });

  function validate(pub){
    if(state.uploading>0){ say('이미지 업로드 중입니다. 잠시만요…'); return false; }
    if(pub){
      if(!nameEl.value.trim()){ say('브랜드명을 입력하세요'); return false; }
      if(!slugEl.value.trim()){ say('슬러그를 입력하세요'); return false; }
      if(!state.thumbnail){ say('메인 썸네일을 업로드하세요'); return false; }
    }
    return true;
  }

  async function save(status='draft'){
    if(!validate(status==='published')) return;
    try{
      say(status==='published'?'발행 중…':'저장 중…');
      const url = state.id ? `${BRAND_URL_PRIMARY}/${state.id}` : `${BRAND_URL_PRIMARY}`;
      const method = state.id ? 'PUT' : 'POST';
      let res = await fetch(url,{method,headers:headers(true),body:JSON.stringify(buildPayload(status))});
      if(!res.ok && res.status===404 && BRAND_URL_PRIMARY!==BRAND_URL_ALTERNATE){
        res = await fetch(state.id?`${BRAND_URL_ALTERNATE}/${state.id}`:BRAND_URL_ALTERNATE,{method,headers:headers(true),body:JSON.stringify(buildPayload(status))});
      }
      const j=await res.json().catch(()=>({}));
      if(!res.ok || j.ok===false) throw new Error(j.message||`HTTP_${res.status}`);
      say(status==='published'?'발행되었습니다.':'저장되었습니다.', true);
      setTimeout(()=>location.href='byhen.html?slug='+(slugEl.value||'byhen'), 600);
    }catch(e){ console.error(e); say('저장 실패: '+(e.message||'오류')); }
  }

  $id('saveBtn')?.addEventListener('click', ()=> save('published'));
  $id('publishBtn')?.addEventListener('click', ()=> save('published'));
  $id('saveDraftBtn')?.addEventListener('click', ()=> save('draft'));

  // ------- 로드 -------
  (async function load(){
    try{
      if(!state.id && !state.slugQuery) return;
      say('불러오는 중…');
      const path = state.id ? `/${state.id}` : `/${(state.slugQuery||'').toLowerCase()}`;
      let r = await fetch(BRAND_URL_PRIMARY+path,{headers:headers(false)});
      if(!r.ok && r.status===404 && BRAND_URL_PRIMARY!==BRAND_URL_ALTERNATE){
        r = await fetch(BRAND_URL_ALTERNATE+path,{headers:headers(false)});
      }
      const j=await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d=j.data||j;

      state.id = d._id || state.id;
      nameEl.value = d.name||'';
      slugEl.value = d.slug||'';
      introEl.value = d.intro||'';
      descEl.value  = d.description||'';
      guideEl.value = d.usageGuide||'';
      priceEl.value = d.priceInfo||'';
      phoneEl.value = d.contact?.phone||'';
      emailEl.value = d.contact?.email||'';
      kakaoEl.value = d.contact?.kakao||'';
      addressEl.value = d.address||'';
      mapLinkEl.value = d.map?.link||'';
      availableHoursEl.value = d.availableHours||'';
      timeslotsEl.value = (d.timeslots||[]).join(',');
      availableDatesEl.value = (d.availableDates||[]).join(',');
      closedEl.value = (d.closed||[]).join(',');
      bookedEl.value = (d.booked||[]).join(',');

      state.thumbnail = d.thumbnail||'';
      state.subThumbnails = Array.isArray(d.subThumbnails)?d.subThumbnails:[];
      state.gallery = Array.isArray(d.gallery)?d.gallery:[];
      if(state.thumbnail){ thumbPrev.src=state.thumbnail; thumbPrev.style.display='block'; }
      drawSubs(); drawGallery();

      say('로드 완료',true);
    }catch(e){ console.error(e); say('불러오기 실패: '+(e.message||'오류')); }
  })();
})();