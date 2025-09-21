/* byhen-admin.js — v4.0 (초심플)
   - 무조건 프론트에서 끝냄: Cloudinary unsigned 있으면 사용, 없으면 base64(DataURL)로 저장
   - 서버 저장/수정에 Authorization 안 붙임(비로그인 동작)
   - HTML id는 기존과 동일: thumbTrigger/thumbFile/thumbPrev, subsTrigger/subsFile/subsGrid,
                            galleryTrigger/galleryFile/galleryGrid, publishBtn/saveDraftBtn/saveBtn
*/
(function () {
  'use strict';

  // ---------- Config ----------
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');

  // Cloudinary unsigned(선택)
  const UNSIGNED = (CFG.cloudinaryUnsigned || CFG.cloudinary || {});
  const CLOUD_NAME    = UNSIGNED.cloudName || UNSIGNED.name || '';           // 예: 'demo'
  const UPLOAD_PRESET = UNSIGNED.uploadPreset || UNSIGNED.unsignedPreset || UNSIGNED.preset || ''; // 예: 'unsigned_public'

  // 썸네일 변환(Cloudinary일 때만 적용)
  const THUMB = {
    main:   CFG.thumb?.cover169 || 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square: CFG.thumb?.square   || 'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
  };
  const withTr=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{return url||'';} };

  // ---------- Helpers ----------
  const $  = (s, el=document)=>el.querySelector(s);
  const say=(m,ok=false)=>{ const n=$('#admMsg'); if(!n) return; n.textContent=m; n.classList.add('show'); n.classList.toggle('ok',!!ok); };

  // 파일 → base64(DataURL) (Cloudinary 미설정 시 폴백)
  function fileToDataURL(file){
    return new Promise((res,rej)=>{
      const fr=new FileReader();
      fr.onload=()=>res(fr.result);
      fr.onerror=rej;
      fr.readAsDataURL(file);
    });
  }

  // Cloudinary unsigned 업로드(설정돼 있을 때만 시도)
  async function uploadUnsigned(file){
    if(!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('UNSIGNED_NOT_CONFIGURED');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const r = await fetch(url, { method:'POST', body:fd });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${r.status}`);
    return j.secure_url;
  }

  // 최종 업로드: Cloudinary unsigned → 실패/미설정이면 base64
  async function uploadImage(file, transform){
    if(!file) throw new Error('파일 없음');
    if(!/^image\//.test(file.type)) throw new Error('이미지 파일만 업로드 가능합니다');
    if(file.size > 10*1024*1024) throw new Error('최대 10MB까지 업로드 가능합니다');

    try{
      const url = await uploadUnsigned(file);           // 설정된 경우 Cloudinary 사용
      return transform ? withTr(url, transform) : url;
    }catch(e){
      // 설정이 없거나 업로드 실패 → DataURL로 저장(서버/권한 필요없음)
      const dataUrl = await fileToDataURL(file);
      return dataUrl; // transform은 Cloudinary에만 의미 있으니 그대로 반환
    }
  }

  // ---------- State ----------
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

  // ---------- DOM ----------
  const el={};
  function cacheDom(){
    el.name=$('#name'); el.slug=$('#slug');

    el.thumbPrev=$('#thumbPrev'); el.thumbFile=$('#thumbFile'); el.thumbTrigger=$('#thumbTrigger');
    el.subsFile=$('#subsFile'); el.subsTrigger=$('#subsTrigger'); el.subsGrid=$('#subsGrid');

    el.intro=$('#intro'); el.description=$('#description');
    el.usageGuide=$('#usageGuide'); el.priceInfo=$('#priceInfo');

    el.phone=$('#phone'); el.email=$('#email'); el.kakao=$('#kakao');
    el.address=$('#address'); el.mapLink=$('#mapLink');

    el.galleryFile=$('#galleryFile'); el.galleryTrigger=$('#galleryTrigger'); el.galleryGrid=$('#galleryGrid');

    el.availableHours=$('#availableHours'); el.timeslots=$('#timeslots');
    el.availableDates=$('#availableDates'); el.closed=$('#closed'); el.booked=$('#booked');

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

  // ---------- Bind ----------
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
        const u=await uploadImage(f, THUMB.main);
        state.doc.thumbnail = u;
        el.thumbPrev.src = u;
        say('메인 업로드 완료',true);
      }catch(err){ say('메인 업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-1); URL.revokeObjectURL(local); e.target.value=''; }
    });

    el.subsFile?.addEventListener('change', async e=>{
      const files=[...(e.target.files||[])].slice(0, 5 - state.doc.subThumbnails.length);
      for(const f of files){
        bump(+1);
        try{
          const u=await uploadImage(f, THUMB.square);
          state.doc.subThumbnails.push(u);
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
          const u=await uploadImage(f, THUMB.square);
          state.doc.gallery.push(u);
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

    el.saveDraftBtn?.addEventListener('click', e=>{e.preventDefault(); submit('draft');});
    el.saveBtn?.addEventListener('click',      e=>{e.preventDefault(); submit('published');});
    el.publishBtn?.addEventListener('click',   e=>{e.preventDefault(); submit('published');});
  }

  // ---------- Load (edit) ----------
  async function loadIfEdit(){
    if(!state.id) return;
    try{
      say('불러오는 중…');
      const r=await fetch(`${API_BASE}${BRAND_BASE}/${state.id}`,{headers:{Accept:'application/json'}});
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
      $('#name').value=state.doc.name; $('#slug').value=state.doc.slug;
      if(state.doc.thumbnail){ el.thumbPrev.src=state.doc.thumbnail; el.thumbPrev.style.display='block'; }
      drawSubs(); drawGallery();
      $('#intro').value=state.doc.intro; $('#description').value=state.doc.description;
      $('#usageGuide').value=state.doc.usageGuide; $('#priceInfo').value=state.doc.priceInfo;
      $('#phone').value=state.doc.contact.phone; $('#email').value=state.doc.contact.email; $('#kakao').value=state.doc.contact.kakao;
      $('#address').value=state.doc.address; $('#mapLink').value=state.doc.map.link;
      $('#availableHours').value=state.doc.availableHours;
      $('#timeslots').value=(state.doc.timeslots||[]).join(', ');
      $('#availableDates').value=(state.doc.availableDates||[]).join(', ');
      $('#closed').value=(state.doc.closed||[]).join(', ');
      $('#booked').value=(state.doc.booked||[]).join(', ');
      say('로드 완료',true);
    }catch(e){ say('불러오기 실패: '+(e.message||'오류')); }
  }

  // ---------- Save ----------
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
    if(state.uploads>0){ say('이미지 업로드 중입니다. 잠시 후 시도'); return; }
    const doc=collect(status);
    if(!doc.name) return say('브랜드명을 입력하세요');
    if(!doc.slug) return say('슬러그를 입력하세요');

    try{
      say(status==='published'?'발행 중…':'저장 중…');
      const url = state.id ? `${API_BASE}${BRAND_BASE}/${state.id}` : `${API_BASE}${BRAND_BASE}`;
      const method = state.id ? 'PUT' : 'POST';
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(doc)});
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