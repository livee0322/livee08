/* model-new.page.js — v1.0.0 (서명 업로드 + 포트폴리오형 모델 등록) */
(function () {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const EP = CFG.endpoints || {};
  const ENTITY = (EP.modelBase || '/models-test').replace(/\/$/,'');
  const SHORTS_EP = EP.shorts || '/shorts-test?mine=1&limit=60';
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const THUMB = {
    square: 'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
  };

  const $id = (s)=>document.getElementById(s);
  const say = (t, ok=false)=>{ const el=$id('mdlMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.style.color = ok?'#86efac':'#ffadad'; };
  const headers=(json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{return url;} };
  const bump=(n)=>{ state.pending=Math.max(0, state.pending+n); };

  // shorts utils
  const ytId=(u='')=>(u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)||[])[1]||'';
  const detectProvider=(url='')=>/youtu\.?be|youtube\.com/.test(url)?'youtube':/instagram\.com/.test(url)?'instagram':/tiktok\.com/.test(url)?'tiktok':'etc';
  const thumbUrl=(p,u)=>p==='youtube'&&ytId(u)?`https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg`: '';

  const state = {
    id:'',
    mainThumbnailUrl:'',
    coverImageUrl:'',
    subThumbnails:[],
    tags:[],
    shortsSel:new Set(),
    pending:0
  };

  // Cloudinary 서명 업로드
  async function getSignature(){
    const r = await fetch(`${API_BASE}${EP.uploadsSignature || '/uploads/signature'}`, { headers:headers(false) });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
    const j = await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return j.secure_url;
  }
  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

  // init
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  function setPreview(kind,url){
    if(!url) return;
    if(kind==='main'){ $id('mainPrev').src=url; }
    if(kind==='cover'){ $id('coverPrev').src=url; }
  }

  async function init(){
    // triggers
    $id('mainTrigger')?.addEventListener('click', ()=> $id('mainFile')?.click());
    $id('coverTrigger')?.addEventListener('click', ()=> $id('coverFile')?.click());
    $id('subsTrigger')?.addEventListener('click', ()=> $id('subsFile')?.click());

    $id('mainFile')?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); setPreview('main', local); bump(+1);
      try{ say('메인 업로드 중…'); const url=withTransform(await uploadImage(f), THUMB.square); state.mainThumbnailUrl=url; setPreview('main', url); say('업로드 완료',true); }
      catch(err){ console.error('[main upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); e.target.value=''; bump(-1); }
    });

    $id('coverFile')?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); setPreview('cover', local); bump(+1);
      try{ say('커버 업로드 중…'); const url=withTransform(await uploadImage(f), THUMB.cover169); state.coverImageUrl=url; setPreview('cover', url); say('업로드 완료',true); }
      catch(err){ console.error('[cover upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); e.target.value=''; bump(-1); }
    });

    function drawSubs(){
      const grid=$id('subsGrid');
      grid.innerHTML = state.subThumbnails.map((u,i)=>`
        <div class="sub">
          <img src="${u}" alt="sub-${i}">
          <button type="button" class="rm" data-i="${i}">×</button>
        </div>`).join('');
    }
    $id('subsGrid')?.addEventListener('click', (e)=>{
      const b=e.target.closest('.rm'); if(!b) return;
      state.subThumbnails.splice(Number(b.dataset.i),1);
      drawSubs();
    });
    $id('subsFile')?.addEventListener('change', async e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      for(const f of files){
        if(!isImgOk(f)) continue;
        bump(+1);
        try{
          const url=withTransform(await uploadImage(f), THUMB.square);
          state.subThumbnails.push(url);
          drawSubs(); say('업로드 완료',true);
        }catch(err){ console.warn('[subs upload]',err); say('업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });

    // tags
    const tagState = state.tags;
    function drawTags(){ $id('tagList').innerHTML = tagState.map((t,i)=>`<span class="chip">${t}<button class="x" data-i="${i}">×</button></span>`).join(''); }
    $id('tagList')?.addEventListener('click', (e)=>{ const x=e.target.closest('.x'); if(!x) return; tagState.splice(Number(x.dataset.i),1); drawTags(); });
    $id('tagInput')?.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'||e.key===','){ e.preventDefault(); const raw=(e.target.value||'').trim().replace(/,$/,''); if(!raw) return;
        if(tagState.length>=12){ say('태그는 최대 12개'); return; }
        if(!tagState.includes(raw)) tagState.push(raw);
        e.target.value=''; drawTags();
      }
    });

    // shorts
    $id('shortsRefresh')?.addEventListener('click', fetchMyShorts);

    // buttons
    $id('publishBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); submit('draft'); });

    // edit mode
    state.id = new URLSearchParams(location.search).get('id') || '';
    if(state.id) await loadExisting();
  }

  async function fetchMyShorts(){
    const grid=$id('shortsGrid'); grid.innerHTML='<div class="chip">불러오는 중…</div>';
    try{
      const r=await fetch(API_BASE + (SHORTS_EP.startsWith('/')? SHORTS_EP: '/'+SHORTS_EP), { headers:headers(false) });
      const j=await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const items=j.items||j.data||j.docs||[];
      if(!items.length){ grid.innerHTML='<div class="chip">등록된 쇼츠 없음</div>'; return; }
      grid.innerHTML = items.map(it=>{
        const id=it.id||it._id; const p=it.provider||detectProvider(it.sourceUrl||''); const t=it.thumbnailUrl||thumbUrl(p, it.sourceUrl||'');
        const on = state.shortsSel.has(String(id));
        return `<button type="button" class="sc ${on?'on':''}" data-id="${id}"><img src="${t||'default.jpg'}" alt=""><i class="ri-check-fill"></i></button>`;
      }).join('');
      grid.addEventListener('click', (e)=>{
        const b=e.target.closest('.sc'); if(!b) return;
        const id=b.dataset.id; if(state.shortsSel.has(id)){ state.shortsSel.delete(id); b.classList.remove('on'); } else { state.shortsSel.add(id); b.classList.add('on'); }
      }, { once:true });
    }catch(err){
      console.warn('[shorts load]', err); grid.innerHTML='<div class="chip">불러오기 실패</div>';
    }
  }

  function strOrU(v){ return (v && String(v).trim()) ? String(v).trim() : undefined; }

  function collectPayload(status){
    // socials
    const links = {
      website: strOrU($id('linkWebsite')?.value),
      instagram: strOrU($id('linkInstagram')?.value),
      youtube: strOrU($id('linkYouTube')?.value),
      tiktok: strOrU($id('linkTikTok')?.value),
    };
    // demographics
    const demo = {
      gender: strOrU($id('gender')?.value),
      height: $id('height')?.value ? Number($id('height').value) : undefined,
      weight: $id('weight')?.value ? Number($id('weight').value) : undefined,
      sizeTop: strOrU($id('sizeTop')?.value),
      sizeBottom: strOrU($id('sizeBottom')?.value),
      shoe: strOrU($id('shoe')?.value),
      sizePublic: !!$id('sizePublic')?.checked,
    };
    const region = { city: strOrU($id('regionCity')?.value), area: strOrU($id('regionArea')?.value), country:'KR' };

    return {
      type:'model',
      status,
      visibility: $id('visibility')?.value || 'public',
      nickname: strOrU($id('nickname')?.value),
      headline: strOrU($id('headline')?.value),
      bio: strOrU($id('bio')?.value),
      mainThumbnailUrl: state.mainThumbnailUrl || undefined,
      coverImageUrl: state.coverImageUrl || undefined,
      subThumbnails: state.subThumbnails.filter(Boolean),
      age: $id('age')?.value ? Number($id('age').value) : undefined,
      primaryLink: strOrU($id('primaryLink')?.value),
      openToOffers: !!$id('openToOffers')?.checked,
      tags: state.tags,
      region, demographics: demo, links,
      shorts: Array.from(state.shortsSel)
    };
  }

  function validate(pub){
    if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
    if(pub){
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
      if(!($id('nickname')?.value||'').trim()){ say('이름/닉네임을 입력해주세요'); return false; }
      if(!($id('headline')?.value||'').trim()){ say('한 줄 소개를 입력해주세요'); return false; }
    }
    const pl=$id('primaryLink')?.value?.trim();
    if(pl && !/^https:\/\//.test(pl)){ say('대표 링크는 https:// 로 시작'); return false; }
    return true;
  }

  async function submit(status){
    const pub = (status==='published');
    if(!validate(pub)) return;
    try{
      say(pub?'발행 중…':'임시저장 중…');
      const url = state.id ? `${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}` : `${API_BASE}${ENTITY}`;
      const method = state.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(collectPayload(status)) });
      const j = await res.json().catch(()=>({}));
      if(!res.ok || j.ok===false) throw new Error(j.message || `HTTP_${res.status}`);
      state.id = j.data?.id || j.id || state.id;
      say(pub?'발행되었습니다':'임시저장 완료', true);
    }catch(err){
      console.error('[model save]', err);
      say('저장 실패: '+(err.message||'네트워크 오류'));
    }
  }

  async function loadExisting(){
    try{
      say('불러오는 중…');
      const r = await fetch(`${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}`, { headers:headers(false) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d = j.data || j;

      // fill
      $id('nickname').value = d.nickname || d.name || '';
      $id('headline').value = d.headline || d.oneLiner || '';
      $id('bio').value      = d.bio || '';
      $id('visibility').value = d.visibility || 'public';
      $id('openToOffers').checked = d.openToOffers !== false;
      $id('primaryLink').value = d.primaryLink || '';
      $id('age').value = d.age || '';

      // region/demo/social
      $id('regionCity').value = d.region?.city || '';
      $id('regionArea').value = d.region?.area || '';
      $id('gender').value = d.demographics?.gender || '';
      $id('height').value = d.demographics?.height || '';
      $id('weight').value = d.demographics?.weight || '';
      $id('sizeTop').value = d.demographics?.sizeTop || '';
      $id('sizeBottom').value = d.demographics?.sizeBottom || '';
      $id('shoe').value = d.demographics?.shoe || '';
      $id('sizePublic').checked = !!d.demographics?.sizePublic;

      $id('linkWebsite').value = d.links?.website || '';
      $id('linkInstagram').value = d.links?.instagram || '';
      $id('linkYouTube').value = d.links?.youtube || '';
      $id('linkTikTok').value = d.links?.tiktok || '';

      // images
      state.mainThumbnailUrl = d.mainThumbnailUrl || '';
      state.coverImageUrl    = d.coverImageUrl || '';
      state.subThumbnails    = Array.isArray(d.subThumbnails)? d.subThumbnails.slice(0,30) : [];
      setPreview('main', state.mainThumbnailUrl);
      setPreview('cover', state.coverImageUrl);
      // tags
      state.tags = Array.isArray(d.tags)? d.tags.slice(0,12) : [];
      // shorts
      (Array.isArray(d.shorts)? d.shorts : []).forEach(id=>state.shortsSel.add(String(id)));

      // draw
      document.getElementById('tagList').innerHTML = state.tags.map((t,i)=>`<span class="chip">${t}<button class="x" data-i="${i}">×</button></span>`).join('');
      (function drawSubs(){
        const grid=$id('subsGrid');
        grid.innerHTML = state.subThumbnails.map((u,i)=>`
          <div class="sub">
            <img src="${u}" alt="sub-${i}">
            <button type="button" class="rm" data-i="${i}">×</button>
          </div>`).join('');
      })();

      say('로드 완료', true);
    }catch(err){
      console.error('[model load]', err);
      say('불러오기 실패: '+(err.message||'오류'));
    }
  }
})();
