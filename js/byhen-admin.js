/* byhen-admin.js — v1.0.0
   - 같은 스키마(Brand)로 생성/수정
   - Cloudinary 업로드(/uploads/signature) + 미리보기
   - 폼 id는 byhen-admin.html 분리본과 동일 가정
*/
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = (CFG.endpoints || {});
  const BRANDS_BASE = (EP.byhen || '/brands-test').replace(/^\/*/, '/'); // '/brands-test'

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const $  = (s, el=document) => el.querySelector(s);
  const $id= (s) => document.getElementById(s);
  const say=(t,ok=false)=>{ const el=$id('admMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok',ok); };

  // --- 이미지 업로드 헬퍼 ---
  const THUMB = {
    square:  'c_fill,g_auto,w_640,h_640,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
  };
  const withTr=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{return url;} };
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h.Authorization=`Bearer ${TOKEN}`; return h; };

  async function getSignature(){
    const r=await fetch(`${API_BASE}${(EP.uploadsSignature||'/uploads/signature')}`,{headers:headers(false)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data||j;
  }
  async function uploadImage(file){
    const {cloudName,apiKey,timestamp,signature}=await getSignature();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }

  // --- 요소 참조(샘플: 필요한 항목만) ---
  const f = {
    slug:           $id('slug'),
    name:           $id('name'),
    intro:          $id('intro'),
    usageGuide:     $id('usageGuide'),
    priceInfo:      $id('priceInfo'),
    address:        $id('address'),
    phone:          $id('phone'),
    email:          $id('email'),
    kakao:          $id('kakao'),
    mapLink:        $id('mapLink'),
    availableHours: $id('availableHours'),
    timeslots:      $id('timeslots'),   // 콤마(,) 구분 입력
    availableDates: $id('availableDates'), // YYYY-MM-DD 콤마 구분
    closed:         $id('closedDates'),
    booked:         $id('bookedDates'),

    // 이미지
    mainFile: $id('mainFile'),
    subsFile: $id('subsFile'),
    mainPrev: $id('mainPrev'),
    subsGrid: $id('subsGrid'),

    // 버튼
    saveDraft:  $id('saveDraftBtn'),
    publishBtn: $id('publishBtn'),
  };

  const state = {
    id: '',
    thumbnail: '',
    subThumbnails: []
  };

  // --- 프리뷰 그리기 ---
  function drawSubs(){
    if(!f.subsGrid) return;
    f.subsGrid.innerHTML = state.subThumbnails.map((u,i)=>`
      <div class="sub"><img src="${u}" alt="sub-${i}"><button type="button" class="rm" data-i="${i}">×</button></div>
    `).join('');
  }
  f.subsGrid?.addEventListener('click', e=>{
    const b=e.target.closest('.rm'); if(!b) return;
    state.subThumbnails.splice(Number(b.dataset.i),1);
    drawSubs();
  });

  // --- 업로드 바인딩 ---
  f.mainFile?.addEventListener('change', async e=>{
    const file = e.target.files?.[0]; if(!file) return;
    try{
      say('메인 이미지 업로드 중…');
      const url = await uploadImage(file);
      state.thumbnail = withTr(url, THUMB.cover169);
      if(f.mainPrev){ f.mainPrev.src = state.thumbnail; f.mainPrev.style.display='block'; }
      say('메인 이미지 업로드 완료', true);
    }catch(err){ console.error(err); say('업로드 실패: '+(err.message||'오류')); }
    finally{ e.target.value=''; }
  });

  f.subsFile?.addEventListener('change', async e=>{
    const files = [...(e.target.files||[])].slice(0, Math.max(0, 8 - state.subThumbnails.length));
    for(const file of files){
      try{
        say('서브 이미지 업로드 중…');
        const url = await uploadImage(file);
        state.subThumbnails.push(withTr(url, THUMB.square));
        drawSubs();
        say('서브 이미지 업로드 완료', true);
      }catch(err){ console.error(err); say('업로드 실패: '+(err.message||'오류')); }
    }
    e.target.value='';
  });

  // --- 페이로드 구성(공용 스키마) ---
  const arr=(el)=> (el?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  function payload(status='draft'){
    return {
      type:'brand',
      status,
      slug: (f.slug?.value || '').trim().toLowerCase(),
      name: (f.name?.value || '').trim(),
      thumbnail: state.thumbnail || undefined,
      subThumbnails: state.subThumbnails,

      intro:      (f.intro?.value || '').trim(),
      usageGuide: (f.usageGuide?.value || '').trim(),
      priceInfo:  (f.priceInfo?.value || '').trim(),
      address:    (f.address?.value || '').trim(),

      contact: {
        phone: (f.phone?.value || '').trim() || undefined,
        email: (f.email?.value || '').trim() || undefined,
        kakao: (f.kakao?.value || '').trim() || undefined
      },
      map: { link: (f.mapLink?.value || '').trim() || undefined },

      gallery: state.subThumbnails.slice(0, 12), // 필요 시 별도 입력도 가능
      schedule: {
        availableHours: (f.availableHours?.value || '').trim() || undefined,
        timeslots:      arr(f.timeslots),
        availableDates: arr(f.availableDates),
        closed:         arr(f.closed),
        booked:         arr(f.booked)
      }
    };
  }

  function validate(pub=false){
    if(pub){
      if(!f.slug?.value.trim()) { say('슬러그를 입력하세요'); return false; }
      if(!f.name?.value.trim()) { say('브랜드명을 입력하세요'); return false; }
      if(!state.thumbnail){ say('메인 썸네일을 업로드하세요'); return false; }
    }
    return true;
  }

  async function submit(status){
    if(!validate(status==='published')) return;
    try{
      say(status==='published'?'발행 중…':'임시저장 중…');
      const body = JSON.stringify(payload(status));
      const url  = state.id ? `${API_BASE}${BRANDS_BASE}/${state.id}` : `${API_BASE}${BRANDS_BASE}`;
      const method = state.id ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: headers(true), body });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      say('저장 완료', true);
    }catch(err){ console.error(err); say('저장 실패: '+(err.message||'오류')); }
  }

  f.saveDraft?.addEventListener('click', (e)=>{ e.preventDefault(); submit('draft'); });
  f.publishBtn?.addEventListener('click', (e)=>{ e.preventDefault(); submit('published'); });

  // --- edit 모드(쿼리 id 또는 slug) ---
  (async function init(){
    const qs = new URLSearchParams(location.search);
    const id  = qs.get('id');
    const slug= qs.get('slug');

    if(!id && !slug) return; // create 모드

    try{
      say('불러오는 중…');
      const key = id || slug;
      const url = id ? `${API_BASE}${BRANDS_BASE}/${id}` : `${API_BASE}${BRANDS_BASE}/${encodeURIComponent(slug)}`;
      const r = await fetch(url, { headers: headers(false) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d = j.data || j;

      state.id = d._id || d.id || '';
      state.thumbnail = d.thumbnail || '';
      state.subThumbnails = Array.isArray(d.subThumbnails) ? d.subThumbnails : [];

      // fill
      f.slug && (f.slug.value = d.slug || '');
      f.name && (f.name.value = d.name || '');
      if(f.mainPrev && state.thumbnail){ f.mainPrev.src = state.thumbnail; f.mainPrev.style.display='block'; }
      drawSubs();

      f.intro && (f.intro.value = d.intro || '');
      f.usageGuide && (f.usageGuide.value = d.usageGuide || '');
      f.priceInfo && (f.priceInfo.value = d.priceInfo || '');
      f.address && (f.address.value = d.address || '');

      f.phone && (f.phone.value = d.contact?.phone || '');
      f.email && (f.email.value = d.contact?.email || '');
      f.kakao && (f.kakao.value = d.contact?.kakao || '');
      f.mapLink && (f.mapLink.value = d.map?.link || '');

      f.availableHours && (f.availableHours.value = d.schedule?.availableHours || '');
      f.timeslots && (f.timeslots.value = (d.schedule?.timeslots||[]).join(', '));
      f.availableDates && (f.availableDates.value = (d.schedule?.availableDates||[]).join(', '));
      f.closed && (f.closed.value = (d.schedule?.closed||[]).join(', '));
      f.booked && (f.booked.value = (d.schedule?.booked||[]).join(', '));

      say('로드 완료', true);
    }catch(err){ console.error(err); say('불러오기 실패: '+(err.message||'오류')); }
  })();
})();