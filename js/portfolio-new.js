/* Portfolio Create & Edit – v2.9 (option-B backend) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const THUMB = CFG.thumb || {
    square:  "c_fill,g_auto,w_600,h_600,f_auto,q_auto",
    cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
  };
  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const EDIT_ID = new URLSearchParams(location.search).get('id') || '';

  // ---- elems
  const $id = (s)=>document.getElementById(s);
  const msg  = $id('pfMsg');
  const mainFile=$id('mainFile'), mainPrev=$id('mainPrev');
  const coverFile=$id('coverFile'), coverPrev=$id('coverPrev');
  const subsFile=$id('subsFile'), subsGrid=$id('subsGrid');

  const nickname=$id('nickname'), headline=$id('headline'), bio=$id('bio');
  const realName=$id('realName'), realNamePublic=$id('realNamePublic');
  const age=$id('age'), agePublic=$id('agePublic');
  const careerYears=$id('careerYears'), primaryLink=$id('primaryLink');
  const visibility=$id('visibility'), openToOffers=$id('openToOffers');
  const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
  const tagInput=$id('tagInput'), tagList=$id('tagList');

  const saveBtn=$id('saveDraftBtn'), pubBtn=$id('publishBtn');

  const state = {
    mainThumbnailUrl: '',
    coverImageUrl: '',
    subThumbnails: [],
    tags: []
  };

  // ---- utils
  const say=(t,ok=false)=>{ if(!msg) return; msg.textContent=t; msg.classList.add('show'); msg.classList.toggle('ok',ok); };
  const headers=(json=true)=>{ const h={}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };

  const isCloudinary=(u)=>/https?:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(u||'');
  const hasTransform=(u)=>{
    if (!isCloudinary(u)) return false;
    const tail=u.split('/upload/')[1]||'';
    const first=tail.split('/')[0]||'';
    return /^([a-z]+_[^/]+,?)+$/.test(first);
  };
  const withTransform=(url,t)=>{
    try{
      if(!url || !/\/upload\//.test(url)) return url||'';
      if (hasTransform(url)) return url; // 이미 변환 있으면 그대로
      const i=url.indexOf('/upload/');
      return url.slice(0,i+8)+t+'/'+url.slice(i+8);
    }catch{ return url; }
  };

  async function getSignature(){
    const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data||j;
  }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature}=await getSignature();
    const fd=new FormData();
    fd.append('file',file);
    fd.append('api_key',apiKey);
    fd.append('timestamp',timestamp);
    fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({}));
    if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }
  const isImgOk=(f)=>{
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; }
    if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; }
    return true;
  };

  // ---- live links / tags
  function addLinkRow(v={title:'',url:'',date:''}){
    const row=document.createElement('div');
    row.className='link-row';
    row.innerHTML=`
      <input class="input l-title" placeholder="제목(예: ◯◯몰 뷰티 라이브)" value="${v.title||''}">
      <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}">
      <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
      <button class="ic" type="button" aria-label="삭제">✕</button>`;
    linksWrap?.appendChild(row);
  }
  addLinkBtn?.addEventListener('click',()=>addLinkRow());
  linksWrap?.addEventListener('click',(e)=>{
    const b=e.target.closest('.ic'); if(!b) return;
    b.closest('.link-row')?.remove();
  });

  function drawTags(){
    if(!tagList) return;
    tagList.innerHTML=state.tags.map((t,i)=>`<span class="chip">${t}<button type="button" class="x" data-i="${i}">×</button></span>`).join('');
  }
  tagList?.addEventListener('click',(e)=>{
    const x=e.target.closest('.x'); if(!x) return;
    const i=Number(x.dataset.i); state.tags.splice(i,1); drawTags();
  });
  tagInput?.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'||e.key===','){
      e.preventDefault();
      const raw=tagInput.value.trim().replace(/,$/,'');
      if(!raw) return;
      if(state.tags.length>=8){ say('태그는 최대 8개'); return; }
      if(state.tags.includes(raw)){ tagInput.value=''; return; }
      state.tags.push(raw); tagInput.value=''; drawTags();
    }
  });

  // ---- subs grid
  function drawSubs(){
    if(!subsGrid) return;
    subsGrid.innerHTML=state.subThumbnails.map((u,i)=>`
      <div class="sub">
        <img src="${u}" alt="sub-${i}">
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>`).join('');
  }
  subsGrid?.addEventListener('click',(e)=>{
    const btn=e.target.closest('.rm'); if(!btn) return;
    const i=Number(btn.dataset.i); state.subThumbnails.splice(i,1); drawSubs();
  });

  // ---- file inputs
  mainFile?.addEventListener('change',async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)){ e.target.value=''; return; }
    const local=URL.createObjectURL(f);
    mainPrev.src=local;
    try{
      say('메인 이미지 업로드 중…');
      const url=await uploadImage(f);
      state.mainThumbnailUrl=withTransform(url,THUMB.square);
      mainPrev.src=state.mainThumbnailUrl;
      URL.revokeObjectURL(local);
      say('업로드 완료',true);
    }catch(err){ console.error(err); say('업로드 실패: '+err.message); }
  });

  coverFile?.addEventListener('change',async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)){ e.target.value=''; return; }
    const local=URL.createObjectURL(f);
    coverPrev.src=local;
    try{
      say('배경 이미지 업로드 중…');
      const url=await uploadImage(f);
      state.coverImageUrl=withTransform(url,THUMB.cover169);
      coverPrev.src=state.coverImageUrl;
      URL.revokeObjectURL(local);
      say('업로드 완료',true);
    }catch(err){ console.error(err); say('업로드 실패: '+err.message); }
  });

  subsFile?.addEventListener('change',async (e)=>{
    const files=Array.from(e.target.files||[]); if(!files.length) return;
    const remain=Math.max(0,5-state.subThumbnails.length);
    const chosen=files.slice(0,remain);
    for(const f of chosen){
      if(!isImgOk(f)) continue;
      const tmp=document.createElement('div');
      tmp.className='sub';
      const local=URL.createObjectURL(f);
      tmp.innerHTML=`<img src="${local}" alt="uploading">`;
      subsGrid?.appendChild(tmp);
      try{
        say('서브 이미지 업로드 중…');
        const url=await uploadImage(f);
        const u=withTransform(url,THUMB.square);
        state.subThumbnails.push(u);
        drawSubs(); URL.revokeObjectURL(local);
        say('업로드 완료',true);
      }catch(err){ console.error(err); say('업로드 실패: '+err.message); tmp.remove(); }
    }
    e.target.value='';
  });

  // ---- validate & payload
  function validate(isPublish){
    if(isPublish){
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
      if(!nickname.value.trim()){ say('닉네임을 입력해주세요'); return false; }
      if(!headline.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
      if(!bio.value.trim()){ say('상세 소개를 입력해주세요'); return false; }
    }
    if(primaryLink.value && !/^https:\/\//.test(primaryLink.value.trim())){
      say('대표 링크는 https:// 로 시작해야 합니다'); return false;
    }
    const rows=Array.from(linksWrap?.querySelectorAll('.link-row')||[]);
    for(const row of rows){
      const url=row.querySelector('.l-url')?.value.trim();
      if(url && !/^https:\/\//.test(url)){ say('라이브 URL은 https:// 로 시작해야 합니다'); return false; }
    }
    return true;
  }

  function collectPayload(status){
    const links=Array.from(linksWrap?.querySelectorAll('.link-row')||[]).map(row=>({
      title: row.querySelector('.l-title')?.value.trim() || '',
      url:   row.querySelector('.l-url')?.value.trim()   || '',
      date:  row.querySelector('.l-date')?.value || undefined,
    })).filter(x=>x.title||x.url);

    return {
      type:'portfolio',
      status,
      visibility: visibility.value,
      mainThumbnailUrl: state.mainThumbnailUrl || '',
      coverImageUrl:    state.coverImageUrl    || '',
      subThumbnails:    state.subThumbnails,

      nickname: nickname.value.trim(),
      headline: headline.value.trim(),
      realName: realName.value.trim() || '',
      realNamePublic: !!realNamePublic.checked,

      careerYears: careerYears.value ? Number(careerYears.value) : undefined,
      age:         age.value ? Number(age.value) : undefined,
      agePublic:   !!agePublic.checked,

      primaryLink: primaryLink.value.trim() || '',
      liveLinks:   links,
      bio:         bio.value.trim(),
      tags:        state.tags,
      openToOffers: !!openToOffers.checked,
    };
  }

  async function submit(status){
    if(!TOKEN){ say('로그인이 필요합니다'); return; }
    const isPublish = status==='published';
    if(!validate(isPublish)) return;

    const payload=collectPayload(status);
    const url = EDIT_ID
      ? `${API_BASE}/portfolio-test/${encodeURIComponent(EDIT_ID)}`
      : `${API_BASE}/portfolio-test`;
    const method = EDIT_ID ? 'PUT' : 'POST';

    try{
      say(isPublish ? (EDIT_ID ? '수정 반영 중…' : '발행 중…') : '임시저장 중…');
      const res=await fetch(url,{method,headers:headers(true),body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);
      say(EDIT_ID ? '수정 완료' : (isPublish ? '발행되었습니다' : '임시저장 완료'), true);
      setTimeout(()=> location.href='myportfolio.html', 400);
    }catch(err){
      console.error('[submit error]', err);
      say('저장 실패: '+err.message);
    }
  }

  // ---- edit mode: load existing
  async function loadExisting(id){
    try{
      const res=await fetch(`${API_BASE}/portfolio-test/${encodeURIComponent(id)}`,{headers:headers(false)});
      const j=await res.json().catch(()=>({}));
      if(!res.ok || j.ok===false) throw new Error(j.message||`HTTP_${res.status}`);
      const p = j.data || j;

      // state & previews
      state.mainThumbnailUrl = p.mainThumbnailUrl || '';
      state.coverImageUrl    = p.coverImageUrl    || '';
      state.subThumbnails    = Array.isArray(p.subThumbnails) ? p.subThumbnails.slice(0,5) : [];
      state.tags             = Array.isArray(p.tags) ? p.tags.slice(0,8) : [];

      if (state.mainThumbnailUrl) mainPrev.src = state.mainThumbnailUrl;
      if (state.coverImageUrl)    coverPrev.src = state.coverImageUrl;
      drawSubs(); drawTags();

      // fields
      nickname.value = p.nickname || '';
      headline.value = p.headline || '';
      realName.value = p.realName || '';
      realNamePublic.checked = !!p.realNamePublic;
      age.value = p.age ?? '';
      agePublic.checked = !!p.agePublic;
      careerYears.value = p.careerYears ?? '';
      primaryLink.value = p.primaryLink || '';
      bio.value = p.bio || '';
      visibility.value = p.visibility || 'public';
      openToOffers.checked = !!p.openToOffers;

      // links
      linksWrap.innerHTML='';
      (Array.isArray(p.liveLinks)?p.liveLinks:[]).forEach(l=> addLinkRow({
        title:l.title||'', url:l.url||'', date:l.date?String(l.date).slice(0,10):''
      }));

      // 버튼 라벨
      if (saveBtn) saveBtn.textContent = '임시 저장';
      if (pubBtn)  pubBtn.textContent  = '수정 완료';
      document.title = '포트폴리오 수정 - Livee';
    }catch(err){
      console.error('[edit:load]', err);
      say('기존 데이터를 불러오지 못했습니다: '+err.message);
    }
  }

  // start
  document.addEventListener('DOMContentLoaded', async ()=>{
    addLinkRow(); // 기본 1행
    if (EDIT_ID) await loadExisting(EDIT_ID);

    $id('saveDraftBtn')?.addEventListener('click', ()=> submit('draft'));
    $id('publishBtn')?.addEventListener('click', ()=> submit('published'));
  });
})();