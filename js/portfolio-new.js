/* Portfolio Create – FINAL (no legacy keys) */
(() => {
  const form = document.getElementById('pfForm');
  if (!form) return;

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'portfolio-test';
  const THUMB = {
    square:  "c_fill,g_auto,w_600,h_600,f_auto,q_auto",
    cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
  };

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  const $id = (s)=>document.getElementById(s);
  const say = (t, ok=false)=>{ const el=$id('pfMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok',ok); };
  const headers = (json=true)=>{ const h={}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']='Bearer '+TOKEN; return h; };

  // Cloudinary 표시용 URL(원본에 변환 없을 때만 변환 추가)
  const hasTransform=(u='')=>{ const i=u.indexOf('/upload/'); if(i<0) return false; const first=u.slice(i+8).split('/')[0]||''; return /^([a-zA-Z]+_[^/]+,?)+$/.test(first); };
  const displayUrl=(u,t)=>{ try{ if(!u||!/\/upload\//.test(u)) return u||''; if(hasTransform(u)) return u; const i=u.indexOf('/upload/'); return u.slice(0,i+8)+t+'/'+u.slice(i+8);}catch{ return u; } };

  const bind=(el,ev,fn,opt)=> el&&el.addEventListener(ev,fn,opt||false);
  const safeBind=(btn,input)=>{ if(!btn||!input) return; const go=e=>{e.preventDefault(); input.click();}; bind(btn,'click',go,{passive:false}); bind(btn,'keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); input.click();}}); };

  async function fetchMe(){
    if(!TOKEN) return null;
    const hdr={ 'Authorization':'Bearer '+TOKEN };
    for (const u of [`${API_BASE}/users/me`,`/api/auth/me`]){
      try{ const r=await fetch(u,{headers:hdr}); if(!r.ok) continue; const j=await r.json().catch(()=>null); if(j) return j.data||j.user||j; }catch{}
    }
    return null;
  }
  const hasRole=(me,role)=>{ const roles=Array.isArray(me?.roles)?me.roles:(me?.role?[me.role]:[]); return roles.includes(role)||roles.includes('admin'); };

  async function getSignature(){
    const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)});
    const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`); return j.data||j;
  }
  async function uploadImage(file){
    const {cloudName,apiKey,timestamp,signature}=await getSignature();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }

  const mainFile=$id('mainFile'), coverFile=$id('coverFile'), subsFile=$id('subsFile');
  const mainPrev=$id('mainPrev'), coverPrev=$id('coverPrev');
  const mainTrigger=$id('mainTrigger'), coverTrigger=$id('coverTrigger'), subsTrigger=$id('subsTrigger');

  const nickname=$id('nickname'), headline=$id('headline'), bio=$id('bio');
  const careerYears=$id('careerYears'), age=$id('age'), primaryLink=$id('primaryLink');
  const visibility=$id('visibility'), openToOffers=$id('openToOffers');
  const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
  const tagInput=$id('tagInput'), tagList=$id('tagList'), subsGrid=$id('subsGrid');

  const state={ id:new URLSearchParams(location.search).get('id')||'', mainThumbnailUrl:'', coverImageUrl:'', subThumbnails:[], tags:[], pending:0 };
  const bump=n=>{ state.pending=Math.max(0,state.pending+n); };

  function setPrev(kind,url){
    if(kind==='main' && mainPrev){ mainPrev.src=displayUrl(url,THUMB.square); mainPrev.style.display=''; }
    if(kind==='cover'&& coverPrev){ coverPrev.src=displayUrl(url,THUMB.cover169); coverPrev.style.display=''; }
  }

  safeBind(mainTrigger,mainFile); safeBind(coverTrigger,coverFile); safeBind(subsTrigger,subsFile);

  const okImg=f=>{ if(!/^image\//.test(f.type)) return false; if(f.size>8*1024*1024) return false; return true; };

  bind(mainFile,'change', async (e)=>{
    const f=e.target.files?.[0]; if(!f||!okImg(f)){ e.target.value=''; return; }
    const local=URL.createObjectURL(f); mainPrev.src=local; bump(+1);
    try{ const url=await uploadImage(f); state.mainThumbnailUrl=url; setPrev('main',url); say('메인 업로드 완료',true); }
    catch(err){ say('업로드 실패: '+err.message); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });

  bind(coverFile,'change', async (e)=>{
    const f=e.target.files?.[0]; if(!f||!okImg(f)){ e.target.value=''; return; }
    const local=URL.createObjectURL(f); coverPrev.src=local; bump(+1);
    try{ const url=await uploadImage(f); state.coverImageUrl=url; setPrev('cover',url); say('배경 업로드 완료',true); }
    catch(err){ say('업로드 실패: '+err.message); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });

  function drawSubs(){
    subsGrid.innerHTML = state.subThumbnails.map((u,i)=>`
      <div class="sub" style="position:relative">
        <img src="${displayUrl(u,THUMB.square)}" style="width:72px;height:72px;border-radius:10px;object-fit:cover;">
        <button type="button" class="rm" data-i="${i}" style="position:absolute;top:-6px;right:-6px">×</button>
      </div>`).join('');
  }
  bind(subsGrid,'click',e=>{ const b=e.target.closest('.rm'); if(!b) return; state.subThumbnails.splice(Number(b.dataset.i),1); drawSubs(); });
  bind(subsFile,'change', async (e)=>{
    const files=Array.from(e.target.files||[]); const remain=Math.max(0,5-state.subThumbnails.length);
    for(const f of files.slice(0,remain)){ if(!okImg(f)) continue; bump(+1);
      try{ const url=await uploadImage(f); state.subThumbnails.push(url); drawSubs(); }
      catch(err){ say('업로드 실패: '+err.message); }
      finally{ bump(-1); }
    }
    e.target.value='';
  });

  function addLinkRow(v={title:'',url:'',date:''}){
    const row=document.createElement('div');
    row.className='link-row';
    row.innerHTML=`
      <input class="input l-title" placeholder="제목" value="${v.title||''}">
      <div class="row">
        <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}">
        <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
        <button class="ic" type="button">✕</button>
      </div>`;
    linksWrap.appendChild(row);
  }
  bind(addLinkBtn,'click',()=>addLinkRow());
  bind(linksWrap,'click',e=>{ const b=e.target.closest('.ic'); if(!b) return; b.closest('.link-row')?.remove(); });

  const drawTags=()=>{ tagList.innerHTML = state.tags.map((t,i)=>`<span class="chip">${t}<button class="x" data-i="${i}">×</button></span>`).join(''); };
  bind(tagList,'click',e=>{ const x=e.target.closest('.x'); if(!x) return; state.tags.splice(Number(x.dataset.i),1); drawTags(); });
  bind(tagInput,'keydown',e=>{
    if(e.key==='Enter'||e.key===','){ e.preventDefault();
      const raw=(tagInput.value||'').trim().replace(/,$/,''); if(!raw) return;
      if(state.tags.length>=8){ say('태그는 최대 8개'); return; }
      if(state.tags.includes(raw)){ tagInput.value=''; return; }
      state.tags.push(raw); tagInput.value=''; drawTags();
    }
  });
  addLinkRow(); drawTags();

  function validate(isPublish){
    if(state.pending>0){ say('이미지 업로드 중입니다.'); return false; }
    if(isPublish){
      if(!nickname.value.trim()){ say('닉네임을 입력해주세요'); return false; }
      if(!headline.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
    }
    if(primaryLink.value && !/^https:\/\//.test(primaryLink.value.trim())){ say('대표 링크는 https:// 로 시작'); return false; }
    for(const row of Array.from(linksWrap.querySelectorAll('.link-row'))){
      const url=row.querySelector('.l-url')?.value.trim();
      if(url && !/^https:\/\//.test(url)){ say('라이브 URL은 https:// 로 시작'); return false; }
    }
    return true;
  }

  const strOrU=v=> (v && String(v).trim() ? String(v).trim() : undefined);
  function payload(status){
    const rows=Array.from(linksWrap.querySelectorAll('.link-row'));
    const links=rows.map(r=>({
      title:strOrU(r.querySelector('.l-title')?.value),
      url:  strOrU(r.querySelector('.l-url')?.value),
      date: strOrU(r.querySelector('.l-date')?.value),
    })).filter(x=>x.title||x.url);

    // 절대 레거시 키(name, displayName 등) 추가하지 않음
    return {
      type:'portfolio',
      status,
      visibility: visibility.value || 'public',

      nickname: strOrU(nickname.value),
      headline: strOrU(headline.value),
      bio:      strOrU(bio.value),

      mainThumbnailUrl: state.mainThumbnailUrl || undefined,
      coverImageUrl:    state.coverImageUrl || undefined,
      subThumbnails:    state.subThumbnails.filter(Boolean),

      careerYears: careerYears.value ? Number(careerYears.value) : undefined,
      age:         age.value ? Number(age.value) : undefined,

      primaryLink: strOrU(primaryLink.value),
      liveLinks: links,
      tags: state.tags,
      openToOffers: !!openToOffers.checked
    };
  }

  function formatServerError(data){
    try{
      const first=(Array.isArray(data?.details)&&data.details[0])||(Array.isArray(data?.errors)&&data.errors[0]);
      if(first){ const field=first.param||first.path||''; const map={ nickname:'닉네임을 입력해주세요.', headline:'한 줄 소개를 입력해주세요.', mainThumbnailUrl:'메인 썸네일을 업로드해주세요.' }; return map[field] || `[${field}] ${first.msg || 'invalid'}`; }
      if(data?.message && data.message!=='VALIDATION_FAILED') return data.message;
      if(data?.code && data.code!=='VALIDATION_FAILED') return data.code;
      return '유효성 오류';
    }catch{ return '유효성 오류'; }
  }

  async function submit(status){
    if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
    const isPublish=status==='published';
    if(!validate(isPublish)) return;

    try{
      say(isPublish?'발행 중…':'임시저장 중…');
      const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
      const method = state.id ? 'PUT' : 'POST';
      const res=await fetch(url,{ method, headers:headers(true), body:JSON.stringify(payload(status)) });
      const data=await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(formatServerError(data)||`HTTP_${res.status}`);
      say(isPublish?'발행되었습니다':'임시저장 완료',true);
      setTimeout(()=>location.href='mypage.html',400);
    }catch(err){
      say('저장 실패: '+(err.message||'네트워크 오류'));
    }
  }

  $id('saveDraftBtn')?.addEventListener('click',()=>submit('draft'));
  $id('publishBtn')?.addEventListener('click',()=>submit('published'));

  async function loadIfEdit(){
    if(!state.id) return;
    try{
      say('불러오는 중…');
      const r=await fetch(`${API_BASE}/${ENTITY}/${state.id}`,{headers:headers(false)});
      const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d=j.data||j;

      nickname.value=d.nickname||''; headline.value=d.headline||''; bio.value=d.bio||'';
      careerYears.value=d.careerYears||''; age.value=d.age||'';
      primaryLink.value=d.primaryLink||''; visibility.value=d.visibility||'public'; openToOffers.checked=d.openToOffers!==false;

      state.mainThumbnailUrl=d.mainThumbnailUrl||''; state.coverImageUrl=d.coverImageUrl||'';
      state.subThumbnails=Array.isArray(d.subThumbnails)?d.subThumbnails.slice(0,5):[]; state.tags=Array.isArray(d.tags)?d.tags.slice(0,8):[];

      if(state.mainThumbnailUrl) setPrev('main',state.mainThumbnailUrl);
      if(state.coverImageUrl) setPrev('cover',state.coverImageUrl);
      drawSubs(); // 태그는 간단 표시
      say('로드 완료',true);
    }catch(err){ say('불러오기 실패: '+err.message); }
  }

  (async ()=>{
    if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
    const me=await fetchMe(); if(!me){ location.href='login.html?returnTo='+here; return; }
    if(!hasRole(me,'showhost')){
      [...form.querySelectorAll('input,select,textarea,button')].forEach(el=>el.disabled=true);
      return;
    }
    await loadIfEdit();
  })();
})();