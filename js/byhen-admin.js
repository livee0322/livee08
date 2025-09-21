/* byhen-admin.js — v3.4 (토큰 보유 시에만 등록/발행 허용)
   - HTML ids: thumbTrigger/thumbFile/thumbPrev, subsTrigger/subsFile/subsGrid,
               galleryTrigger/galleryFile/galleryGrid, publishBtn/saveDraftBtn/saveBtn
*/
(function () {
  'use strict';

  // ----- Config -----
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');
  const SIGN_EP    = (EP.uploadsSignature || '/uploads/signature').replace(/^\/*/, '/');

  // 로그인 토큰
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // 공통 헤더
  const headers = (json=true) => {
    const h = { Accept:'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
    return h;
  };

  const THUMB = {
    main:   CFG.thumb?.cover169 || 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square: CFG.thumb?.square   || 'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
  };

  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
  const say=(m,ok=false)=>{ const n=$('#admMsg'); if(!n) return; n.textContent=m; n.classList.add('show'); n.classList.toggle('ok',!!ok); };
  const withTr=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{return url||'';} };

  // ----- Uploads (Unsigned 우선, Signed 폴백 / 서명 요청엔 토큰 포함) -----
  function getUnsignedCfg(){
    const c = CFG.cloudinaryUnsigned || CFG.cloudinary || {};
    return { cloudName: c.cloudName || c.name, uploadPreset: c.uploadPreset || c.unsignedPreset || c.preset };
  }
  async function uploadUnsigned(file){
    const u = getUnsignedCfg();
    if(!u.cloudName || !u.uploadPreset){ const e=new Error('UNSIGNED_NOT_CONFIGURED'); e.code='UNSIGNED_NOT_CONFIGURED'; throw e; }
    const fd=new FormData(); fd.append('file',file); fd.append('upload_preset',u.uploadPreset);
    const url=`https://api.cloudinary.com/v1_1/${u.cloudName}/image/upload`;
    const r=await fetch(url,{method:'POST',body:fd}); const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${r.status}`);
    return j.secure_url;
  }
  async function getSignature(){
    const r=await fetch(API_BASE+SIGN_EP,{headers:headers(false)}); // <-- 토큰 포함
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.ok===false){ const e=new Error(j.message||`HTTP_${r.status}`); e.status=r.status; throw e; }
    const d=j.data||j; ['cloudName','apiKey','timestamp','signature'].forEach(k=>{ if(!d[k]) throw new Error('Invalid signature payload'); });
    return d;
  }
  async function uploadSigned(file){
    const s=await getSignature();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',s.apiKey); fd.append('timestamp',s.timestamp); fd.append('signature',s.signature);
    const url=`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`;
    const r=await fetch(url,{method:'POST',body:fd}); const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${r.status}`);
    return j.secure_url;
  }
  async function uploadImage(file){
    if(!file) throw new Error('no file'); if(!/^image\//.test(file.type)) throw new Error('이미지 파일만'); if(file.size>10*1024*1024) throw new Error('최대 10MB');

    // 토큰이 있으면 signed 먼저 시도, 없으면 unsigned 먼저
    const trySignedFirst = !!TOKEN;
    if (trySignedFirst) {
      try { return await uploadSigned(file); }
      catch(e1){ try { return await uploadUnsigned(file); } catch(e2){ throw new Error(e1.message || e2.message || '업로드 실패'); } }
    } else {
      try { return await uploadUnsigned(file); }
      catch(eu){ try { return await uploadSigned(file); } catch(es){ throw new Error(eu.message || es.message || '업로드 실패'); } }
    }
  }

  // ----- State -----
  const qs=new URLSearchParams(location.search);
  const state={
    id: qs.get('id') || '',
    uploads:0,
    doc:{
      type:'brand', status:'draft',
      name:'', slug:'',
      thumbnail:'', subThumbnails:[], gallery:[],
      intro:'', description:'', usageGuide:'', priceInfo:'',
      contact:{phone:'',email:'',kakao:''},
      address:'', map:{link:''},
      availableHours:'', timeslots:[], availableDates:[], closed:[], booked:[]
    }
  };
  const bump=(n)=>{ state.uploads=Math.max(0,state.uploads+n); };

  // ----- DOM -----
  const el={};
  function cacheDom(){
    el.name=$('#name'); el.slug=$('#slug');
    el.thumbPrev=$('#thumbPrev'); el.thumbFile=$('#thumbFile'); el.thumbTrigger=$('#thumbTrigger');
    el.subsFile=$('#subsFile'); el.subsTrigger=$('#subsTrigger'); el.subsGrid=$('#subsGrid');
    el.intro=$('#intro'); el.description=$('#description'); el.usageGuide=$('#usageGuide'); el.priceInfo=$('#priceInfo');
    el.phone=$('#phone'); el.email=$('#email'); el.kakao=$('#kakao');
    el.address=$('#address'); el.mapLink=$('#mapLink');
    el.galleryFile=$('#galleryFile'); el.galleryTrigger=$('#galleryTrigger'); el.galleryGrid=$('#galleryGrid');
    el.availableHours=$('#availableHours'); el.timeslots=$('#timeslots'); el.availableDates=$('#availableDates'); el.closed=$('#closed'); el.booked=$('#booked');
    el.publishBtn=$('#publishBtn'); el.saveDraftBtn=$('#saveDraftBtn'); el.saveBtn=$('#saveBtn');
  }

  function drawSubs(){
    el.subsGrid.innerHTML = state.doc.subThumbnails.map((u,i)=>`
      <div class="thumb"><img src="${u}" alt="sub-${i}"><button type="button" class="rm" data-i="${i}">×</button></div>
    `).join('');
  }
  function drawGallery(){
    el.galleryGrid.innerHTML = state.doc.gallery.map((u,i)=>`
      <div class="thumb"><img src="${u}" alt="gal-${i}"><button type="button" class="rm" data-i="${i}">×</button></div>
    `).join('');
  }

  // ----- 로그인 요구 -----
  function requireLogin(){
    const base = (CFG.BASE_PATH || '').replace(/\/+$/,'');
    const ret  = location.pathname + location.search;
    const loginUrl = `${base ? base : ''}/login.html?returnTo=${encodeURIComponent(ret)}`;
    location.href = loginUrl;
  }

  // ----- Bind -----
  function bind(){
    el.thumbTrigger?.addEventListener('click',()=>el.thumbFile?.click());
    el.subsTrigger?.addEventListener('click',()=>el.subsFile?.click());
    el.galleryTrigger?.addEventListener('click',()=>el.galleryFile?.click());

    el.thumbFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return;
      const local=URL.createObjectURL(f); el.thumbPrev.src=local; el.thumbPrev.style.display='block';
      bump(+1);
      try{
        say('메인 업로드 중…');
        const u=await uploadImage(f);
        state.doc.thumbnail = withTr(u, THUMB.main);
        el.thumbPrev.src = state.doc.thumbnail;
        say('메인 업로드 완료',true);
      }catch(err){ say('메인 업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-1); URL.revokeObjectURL(local); e.target.value=''; }
    });

    el.subsFile?.addEventListener('change', async e=>{
      const files=[...(e.target.files||[])].slice(0, 5 - state.doc.subThumbnails.length);
      for(const f of files){
        bump(+1);
        try{
          const u=await uploadImage(f);
          state.doc.subThumbnails.push(withTr(u, THUMB.square));
          drawSubs();
        }catch(err){ say('서브 업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });
    el.subsGrid?.addEventListener('click', e=>{
      const b=e.target.closest('.rm'); if(!b) return;
      state.doc.subThumbnails.splice(Number(b.dataset.i),1); drawSubs();
    });

    el.galleryFile?.addEventListener('change', async e=>{
      const files=[...(e.target.files||[])];
      for(const f of files){
        bump(+1);
        try{
          const u=await uploadImage(f);
          state.doc.gallery.push(withTr(u, THUMB.square));
          drawGallery();
        }catch(err){ say('갤러리 업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });
    el.galleryGrid?.addEventListener('click', e=>{
      const b=e.target.closest('.rm'); if(!b) return;
      state.doc.gallery.splice(Number(b.dataset.i),1); drawGallery();
    });

    // 저장/발행은 토큰 필수
    const guard = (fn) => (e)=>{ e.preventDefault(); if(!TOKEN){ say('로그인이 필요합니다.'); return requireLogin(); } fn(); };
    el.saveDraftBtn?.addEventListener('click', guard(()=>submit('draft')));
    el.saveBtn?.addEventListener('click',      guard(()=>submit('published')));
    el.publishBtn?.addEventListener('click',   guard(()=>submit('published')));
  }

  // ----- Load (edit) -----
  async function loadIfEdit(){
    if(!state.id) return;
    try{
      say('불러오는 중…');
      const r=await fetch(`${API_BASE}${BRAND_BASE}/${state.id}`,{headers:headers(false)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d=j.data||j;

      Object.assign(state.doc, {
        status:d.status||'draft', name:d.name||'', slug:d.slug||'',
        thumbnail:d.thumbnail||'', subThumbnails:Array.isArray(d.subThumbnails)?d.subThumbnails:[],
        gallery:Array.isArray(d.gallery)?d.gallery:[],
        intro:d.intro||'', description:d.description||'', usageGuide:d.usageGuide||'', priceInfo:d.priceInfo||'',
        contact:{ phone:d.contact?.phone||'', email:d.contact?.email||'', kakao:d.contact?.kakao||'' },
        address:d.address||'', map:{link:d.map?.link||''},
        availableHours:d.availableHours||'',
        timeslots:Array.isArray(d.timeslots)?d.timeslots:[],
        availableDates:Array.isArray(d.availableDates)?d.availableDates:[],
        closed:Array.isArray(d.closed)?d.closed:[],
        booked:Array.isArray(d.booked)?d.booked:[]
      });

      // fill
      el.name.value=state.doc.name; el.slug.value=state.doc.slug;
      if(state.doc.thumbnail){ el.thumbPrev.src=state.doc.thumbnail; el.thumbPrev.style.display='block'; }
      drawSubs(); drawGallery();
      el.intro.value=state.doc.intro; el.description.value=state.doc.description;
      el.usageGuide.value=state.doc.usageGuide; el.priceInfo.value=state.doc.priceInfo;
      el.phone.value=state.doc.contact.phone; el.email.value=state.doc.contact.email; el.kakao.value=state.doc.contact.kakao;
      el.address.value=state.doc.address; el.mapLink.value=state.doc.map.link;
      el.availableHours.value=state.doc.availableHours;
      el.timeslots.value=(state.doc.timeslots||[]).join(', ');
      el.availableDates.value=(state.doc.availableDates||[]).join(', ');
      el.closed.value=(state.doc.closed||[]).join(', ');
      el.booked.value=(state.doc.booked||[]).join(', ');
      say('로드 완료',true);
    }catch(e){ say('불러오기 실패: '+(e.message||'오류')); }
  }

  // ----- Save (토큰 필수, Authorization 헤더 첨부) -----
  function collect(status){
    const csv = (v='') => v.split(',').map(s=>s.trim()).filter(Boolean);
    const d=state.doc;
    d.status=status||'draft';
    d.name=$('#name').value.trim();
    d.slug=$('#slug').value.trim().toLowerCase();
    d.intro=$('#intro').value.trim();
    d.description=$('#description').value.trim();
    d.usageGuide=$('#usageGuide').value.trim();
    d.priceInfo=$('#priceInfo').value.trim();
    d.contact={ phone:$('#phone').value.trim(), email:$('#email').value.trim(), kakao:$('#kakao').value.trim() };
    d.address=$('#address').value.trim();
    d.map={ link:$('#mapLink').value.trim() };
    d.availableHours=$('#availableHours').value.trim();
    d.timeslots=csv($('#timeslots').value);
    d.availableDates=csv($('#availableDates').value);
    d.closed=csv($('#closed').value);
    d.booked=csv($('#booked').value);
    return d;
  }

  async function submit(status){
    if(!TOKEN){ say('로그인이 필요합니다.'); return requireLogin(); }
    if(state.uploads>0){ say('이미지 업로드 중입니다. 잠시 후 시도'); return; }
    const doc=collect(status);
    if(!doc.name) return say('브랜드명을 입력하세요');
    if(!doc.slug) return say('슬러그를 입력하세요');

    try{
      say(status==='published'?'발행 중…':'저장 중…');
      const url = state.id ? `${API_BASE}${BRAND_BASE}/${state.id}` : `${API_BASE}${BRAND_BASE}`;
      const method = state.id ? 'PUT' : 'POST';
      const r=await fetch(url,{method,headers:headers(true),body:JSON.stringify(doc)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      say('완료되었습니다',true);

      const saved=j.data||j; const newId=saved._id;
      if(newId){ localStorage.setItem('byhen:lastId', newId); localStorage.setItem('byhen:lastSlug', saved.slug || doc.slug); }
      if(!state.id && newId){ location.replace(location.pathname+'?id='+encodeURIComponent(newId)); }
    }catch(e){ say('저장 실패: '+(e.message||'오류')); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ cacheDom(); bind(); loadIfEdit(); });
})();