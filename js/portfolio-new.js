<!-- /js/portfolio-new.js — v2.12 (headline load fix) -->
<script>
(() => {
  const form = document.getElementById('pfForm');
  if (!form) return;

  // ── config
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'portfolio-test';
  const THUMB = CFG.thumb || {
    square:   'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
  };
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  // ── utils
  const $id = (s)=> document.getElementById(s);
  const $field = (id)=> document.getElementById(id) || document.querySelector(`[name="${id}"]`);
  const say = (t, ok=false) => { const box = $id('pfMsg'); if(!box) return; box.textContent=t; box.classList.add('show'); box.classList.toggle('ok',ok); };
  const headers = (json=true)=>{ const h={ Accept:'application/json' }; if(json) h['Content-Type']='application/json'; if(TOKEN) h.Authorization=`Bearer ${TOKEN}`; return h; };
  const withTransform = (url, t) => { try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{ return url; } };
  const bind = (el, type, fn, opts)=> el && el.addEventListener(type, fn, opts||false);
  const safeBind = (btn, input)=>{ if(!btn||!input) return; const open=e=>{e.preventDefault();input.click();}; bind(btn,'click',open,{passive:false}); bind(btn,'keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}}); bind(btn,'pointerdown',e=>{ if(e.pointerType==='touch'){e.preventDefault();input.click();}}, {passive:false}); };
  const strOrU = (v)=> (v && String(v).trim() ? String(v).trim() : undefined);
  const stripHtml = (html='') => String(html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const pickHeadline = (d)=>
    (d?.headline && String(d.headline).trim()) ||
    d?.intro || d?.introduction || d?.oneLiner || d?.summary ||
    (d?.bio ? stripHtml(d.bio).slice(0,60) : '') || '';

  // ── auth
  async function fetchMe(){
    if(!TOKEN) return null;
    const h={ Authorization:'Bearer '+TOKEN };
    for(const url of [`${API_BASE}/users/me`, `/api/auth/me`]){
      try{ const r=await fetch(url,{headers:h}); if(!r.ok) continue; const j=await r.json().catch(()=>null); if(!j) continue; return j.data||j.user||j; }catch(_){}
    } return null;
  }
  const hasRole = (me, role)=>{ const roles = Array.isArray(me?.roles)?me.roles:(me?.role?[me.role]:[]); return roles.includes(role)||roles.includes('admin'); };

  // ── uploads
  async function getSignature(){ const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)}); const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`); return j.data||j; }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature}=await getSignature();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`); return j.secure_url;
  }
  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){say('이미지 파일만 업로드 가능');return false;} if(f.size>8*1024*1024){say('이미지는 8MB 이하');return false;} return true; };

  // ── elements
  const mainFile=$id('mainFile'), coverFile=$id('coverFile'), subsFile=$id('subsFile');
  const mainPrev=$id('mainPrev'), coverPrev=$id('coverPrev');
  const mainTrigger=$id('mainTrigger'), coverTrigger=$id('coverTrigger'), subsTrigger=$id('subsTrigger');

  const nickname=$field('nickname');
  const headlineEl=$field('headline');   // ← id 또는 name 둘 다 지원
  const bio=$field('bio');
  const realName=$field('realName'), realNamePublic=$field('realNamePublic');
  const age=$field('age'), agePublic=$field('agePublic');
  const careerYears=$field('careerYears');
  const primaryLink=$field('primaryLink');
  const visibility=$field('visibility'); const openToOffers=$field('openToOffers');

  const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
  const tagInput=$id('tagInput'), tagList=$id('tagList');
  const subsGrid=$id('subsGrid');

  // ── state
  const state={ id:new URLSearchParams(location.search).get('id')||'', mainThumbnailUrl:'', coverImageUrl:'', subThumbnails:[], tags:[], pending:0 };
  const bump=(n)=>{ state.pending=Math.max(0,state.pending+n); };

  // ── previews
  function setPreview(kind,url){ if(!url) return; if(kind==='main'&&mainPrev){ mainPrev.src=url; mainPrev.style.display=''; mainTrigger?.classList?.remove('is-empty'); } if(kind==='cover'&&coverPrev){ coverPrev.src=url; coverPrev.style.display=''; coverTrigger?.classList?.remove('is-empty'); } }
  safeBind(mainTrigger,mainFile); safeBind(coverTrigger,coverFile); safeBind(subsTrigger,subsFile);

  // ── upload handlers
  bind(mainFile,'change',async(e)=>{ const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){e.target.value='';return;} const local=URL.createObjectURL(f); setPreview('main',local); bump(+1);
    try{ say('메인 이미지 업로드 중…'); const url=await uploadImage(f); state.mainThumbnailUrl=withTransform(url,THUMB.square); setPreview('main',state.mainThumbnailUrl); say('업로드 완료',true); }
    catch(err){ console.error('[main upload]',err); say('업로드 실패: '+(err.message||'오류')); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });
  bind(coverFile,'change',async(e)=>{ const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){e.target.value='';return;} const local=URL.createObjectURL(f); setPreview('cover',local); bump(+1);
    try{ say('배경 이미지 업로드 중…'); const url=await uploadImage(f); state.coverImageUrl=withTransform(url,THUMB.cover169); setPreview('cover',state.coverImageUrl); say('업로드 완료',true); }
    catch(err){ console.error('[cover upload]',err); say('업로드 실패: '+(err.message||'오류')); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });

  function drawSubs(){
    if(!subsGrid) return;
    const items=state.subThumbnails.map((u,i)=>`<div class="sub"><img src="${u}" alt="sub-${i}"><button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button></div>`).join('');
    subsGrid.innerHTML=`${items}<button type="button" class="pf-addThumb" id="subsTrigger2" aria-label="서브 이미지 추가">+</button>`;
    safeBind(document.getElementById('subsTrigger2'), subsFile);
  }
  bind(subsGrid,'click',(e)=>{ const btn=e.target.closest('.rm'); if(!btn) return; state.subThumbnails.splice(Number(btn.dataset.i),1); drawSubs(); });
  bind(subsFile,'change',async(e)=>{ const files=Array.from(e.target.files||[]); if(!files.length) return; const remain=Math.max(0,5-state.subThumbnails.length); const chosen=files.slice(0,remain);
    for(const f of chosen){ if(!isImgOk(f)) continue; const local=URL.createObjectURL(f); const tmp=document.createElement('div'); tmp.className='sub'; tmp.innerHTML=`<img src="${local}" alt="uploading">`; subsGrid?.appendChild(tmp);
      bump(+1);
      try{ say('서브 이미지 업로드 중…'); const url=await uploadImage(f); const finalUrl=withTransform(url,THUMB.square); state.subThumbnails.push(finalUrl); drawSubs(); say('업로드 완료',true); }
      catch(err){ console.error('[sub upload]',err); say('업로드 실패: '+(err.message||'오류')); tmp.remove(); }
      finally{ URL.revokeObjectURL(local); bump(-1); }
    }
    e.target.value='';
  });

  // ── tags & links
  function addLinkRow(v={title:'',url:'',date:''}){ const row=document.createElement('div'); row.className='link-row v'; row.innerHTML=`
      <input class="input l-title" placeholder="제목(예: ◯◯몰 뷰티 라이브)" value="${v.title||''}">
      <div class="row">
        <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}">
        <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
        <button class="ic" type="button" aria-label="삭제">✕</button>
      </div>`; linksWrap?.appendChild(row);
  }
  bind(addLinkBtn,'click',()=> addLinkRow());
  bind(linksWrap,'click',(e)=>{ const b=e.target.closest('.ic'); if(!b) return; b.closest('.link-row')?.remove(); });

  const tagState=state.tags;
  function drawTags(){ if(!tagList) return; tagList.innerHTML = tagState.map((t,i)=>`<span class="chip">${t}<button type="button" class="x" data-i="${i}">×</button></span>`).join(''); }
  bind(tagList,'click',(e)=>{ const x=e.target.closest('.x'); if(!x) return; tagState.splice(Number(x.dataset.i),1); drawTags(); });
  bind(tagInput,'keydown',(e)=>{ if(e.key==='Enter'||e.key===','){ e.preventDefault(); const raw=(tagInput.value||'').trim().replace(/,$/,''); if(!raw) return; if(tagState.length>=8){ say('태그는 최대 8개'); return; } if(tagState.includes(raw)){ tagInput.value=''; return; } tagState.push(raw); tagInput.value=''; drawTags(); }});
  addLinkRow(); drawTags();

  // ── validate & payload
  function validate(isPublish){
    if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
    if(isPublish){
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
      if(!nickname?.value.trim()){ say('닉네임을 입력해주세요'); return false; }
      if(!headlineEl?.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
    }
    if(primaryLink?.value && primaryLink.value.trim() && !/^https:\/\//.test(primaryLink.value.trim())){ say('대표 링크는 https:// 로 시작해야 합니다'); return false; }
    const rows = Array.from(linksWrap?.querySelectorAll('.link-row')||[]);
    for(const row of rows){ const url=row.querySelector('.l-url')?.value.trim(); if(url && !/^https:\/\//.test(url)){ say('라이브 URL은 https:// 로 시작해야 합니다'); return false; } }
    return true;
  }

  function collectPayload(status){
    const rows = Array.from(linksWrap?.querySelectorAll('.link-row')||[]);
    const links = rows.map(row=>({ title:strOrU(row.querySelector('.l-title')?.value), url:strOrU(row.querySelector('.l-url')?.value), date:strOrU(row.querySelector('.l-date')?.value) })).filter(x=>x.title||x.url);
    return {
      type:'portfolio', status, visibility: visibility?.value || 'public',
      nickname: strOrU(nickname?.value),
      headline: strOrU(headlineEl?.value),     // ← 저장은 headline에
      bio:      strOrU(bio?.value),
      mainThumbnailUrl: state.mainThumbnailUrl || undefined,
      coverImageUrl:    state.coverImageUrl || undefined,
      subThumbnails:    state.subThumbnails?.filter(Boolean) || [],
      realName: strOrU(realName?.value), realNamePublic: !!realNamePublic?.checked,
      careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
      age: age?.value ? Number(age.value) : undefined, agePublic: !!agePublic?.checked,
      primaryLink: strOrU(primaryLink?.value), liveLinks: links, tags: state.tags,
      openToOffers: !!openToOffers?.checked
    };
  }

  function formatServerError(data){
    try{
      if(!data) return '유효성 오류';
      const first=(Array.isArray(data.details)&&data.details[0])||(Array.isArray(data.errors)&&data.errors[0]);
      if(first){ const field=first.param||first.path||''; const map={ nickname:'닉네임을 입력해주세요.', headline:'한 줄 소개를 입력해주세요.', bio:'상세 소개 형식을 확인해주세요.', mainThumbnailUrl:'메인 썸네일을 업로드해주세요.', visibility:'공개 범위를 확인해주세요.', subThumbnails:'서브 썸네일은 최대 5장까지 가능합니다.', tags:'태그는 최대 8개까지 가능합니다.', primaryLink:'대표 링크 형식을 확인해주세요.', name:'닉네임을 입력해주세요.' }; return map[field] || `[${field}] ${first.msg || 'invalid'}`; }
      if(data.message && data.message!=='VALIDATION_FAILED') return data.message;
      if(data.code && data.code!=='VALIDATION_FAILED') return data.code;
      return '유효성 오류';
    }catch{ return '유효성 오류'; }
  }

  async function submit(status){
    if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
    const isPublish = status==='published';
    if(!validate(isPublish)) return;
    const payload = collectPayload(status);
    try{
      say(isPublish ? '발행 중…' : '임시저장 중…');
      const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
      const method = state.id ? 'PUT' : 'POST';
      const res = await fetch(url,{ method, headers:headers(true), body:JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false){ console.log('[server error raw]',data); throw new Error(formatServerError(data) || `HTTP_${res.status}`); }
      say(isPublish ? '발행되었습니다' : '임시저장 완료', true);
      setTimeout(()=> location.href='mypage.html', 400);
    }catch(err){ console.error('[submit error]',err); say('저장 실패: '+(err.message||'네트워크 오류')); }
  }
  bind($id('saveDraftBtn'),'click',()=> submit('draft'));
  bind($id('publishBtn'),'click', ()=> submit('published'));

  // ── load when editing (headline 폴백 적용)
  async function loadIfEdit(){
    if(!state.id) return;
    try{
      say('불러오는 중…');
      const r = await fetch(`${API_BASE}/${ENTITY}/${state.id}`, { headers: headers(false) });
      const j = await r.json().catch(()=>({})); if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d = j.data || j;

      if(nickname) nickname.value = d.nickname || '';
      if(headlineEl) headlineEl.value = pickHeadline(d);   // ← 핵심
      if(bio) bio.value = d.bio || '';
      if(realName) realName.value = d.realName || '';
      if(realNamePublic) realNamePublic.checked = !!d.realNamePublic;
      if(age) age.value = d.age || '';
      if(agePublic) agePublic.checked = !!d.agePublic;
      if(careerYears) careerYears.value = d.careerYears || '';
      if(primaryLink) primaryLink.value = d.primaryLink || '';
      if(visibility) visibility.value = d.visibility || 'public';
      if(openToOffers) openToOffers.checked = d.openToOffers !== false;

      state.mainThumbnailUrl = d.mainThumbnailUrl || '';
      state.coverImageUrl    = d.coverImageUrl || '';
      state.subThumbnails    = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0,5) : [];
      state.tags             = Array.isArray(d.tags) ? d.tags.slice(0,8) : [];

      setPreview('main', state.mainThumbnailUrl);
      setPreview('cover', state.coverImageUrl);
      drawSubs(); drawTags();

      // 디버깅 로그(원인 파악용)
      console.log('[pf load]', { raw_headline:d.headline, effective: pickHeadline(d) });

      say('로드 완료', true);
    }catch(err){ console.error('[load edit]',err); say('불러오기 실패: '+(err.message||'오류')); }
  }

  // ── boot
  (async ()=>{
    if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
    const me = await fetchMe(); if(!me){ location.href='login.html?returnTo='+here; return; }
    if(!hasRole(me,'showhost')){ [...form.querySelectorAll('input,select,textarea,button')].forEach(el=> el.disabled = true); const guard=document.getElementById('pfGuard'); guard?.classList.add('show'); return; }
    await loadIfEdit();
  })();
})();
</script>