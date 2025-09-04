/* Portfolio Create – v2.9 (FB UI + mobile-safe pickers + client compress) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const THUMB = CFG.thumb || {
    square: "c_fill,g_auto,w_600,h_600,f_auto,q_auto",
    cover169: "c_fill,g_auto,w_1280,h_720,f_auto,q_auto"
  };
  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') ||
    '';

  const $id = (s)=>document.getElementById(s);
  const msg = $id('pfMsg');

  // triggers / inputs / previews
  const mainTrigger  = $id('mainTrigger');
  const coverTrigger = $id('coverTrigger');
  const subsTrigger  = $id('subsTrigger');

  const mainFile = $id('mainFile');
  const coverFile= $id('coverFile');
  const subsFile = $id('subsFile');

  const mainPrev = $id('mainPrev');
  const coverPrev= $id('coverPrev');

  const nickname = $id('nickname'), headline = $id('headline'), bio = $id('bio');
  const realName = $id('realName'), realNamePublic = $id('realNamePublic');
  const age = $id('age'), agePublic = $id('agePublic');
  const careerYears = $id('careerYears'), primaryLink = $id('primaryLink');
  const visibility = $id('visibility'), openToOffers = $id('openToOffers');
  const linksWrap = $id('linksWrap'), addLinkBtn = $id('addLinkBtn');
  const tagInput = $id('tagInput'), tagList = $id('tagList');
  const namePreview = $id('namePreview'), headlinePreview = $id('headlinePreview');
  const subsGrid = $id('subsGrid');

  const state = {
    mainThumbnailUrl: '',
    coverImageUrl: '',
    subThumbnails: [],
    tags: []
  };

  // utils
  const say = (t, ok=false) => {
    if (!msg) return;
    msg.textContent = t;
    msg.classList.add('show');
    msg.classList.toggle('ok', ok);
  };
  const headers = (json=true) => {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };
  const withTransform = (url, t) => {
    try{
      if(!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0,i+8) + t + '/' + url.slice(i+8);
    }catch{ return url; }
  };
  const toggleEmpty = (btn, img) => {
    if(!btn || !img) return;
    btn.classList.toggle('is-empty', !img.getAttribute('src'));
  };

  // compress (<=1600px, quality .85) — 실패 시 원본 반환
  async function compressImage(file, max=1600, mime='image/jpeg', quality=0.85){
    try{
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max/Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width*scale), h = Math.round(bmp.height*scale);
      const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
      const ctx = canvas.getContext('2d'); ctx.drawImage(bmp,0,0,w,h);
      const blob = await new Promise(res=>canvas.toBlob(res, mime, quality));
      return blob || file;
    }catch{ return file; }
  }

  // cloudinary signed upload
  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadToCloudinary(file){
    const { cloudName, apiKey, timestamp, signature } = await getSignature();
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
  const isImgOk = (f)=>{
    if(!/^image\//.test(f.type)) { say('이미지 파일만 업로드 가능'); return false; }
    if(f.size>12*1024*1024){ say('이미지는 12MB 이하'); return false; } // 여유 조금
    return true;
  };

  // name/headline live preview
  const syncName = ()=> { if(namePreview) namePreview.textContent = (nickname?.value?.trim() || '닉네임'); };
  const syncHead = ()=> { if(headlinePreview) headlinePreview.textContent = (headline?.value?.trim() || ''); };
  nickname?.addEventListener('input', syncName);
  headline?.addEventListener('input', syncHead);
  syncName(); syncHead();

  // triggers
  mainTrigger ?.addEventListener('click', ()=> mainFile ?.click());
  coverTrigger?.addEventListener('click', ()=> coverFile?.click());
  subsTrigger ?.addEventListener('click', ()=> subsFile ?.click());

  // main upload
  mainFile?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)) { e.target.value=''; return; }
    const local = URL.createObjectURL(f);
    mainPrev.src = local; toggleEmpty(mainTrigger, mainPrev);
    try{
      say('메인 이미지 업로드 중…');
      const small = await compressImage(f);
      const url = await uploadToCloudinary(small);
      state.mainThumbnailUrl = withTransform(url, THUMB.square);
      mainPrev.src = state.mainThumbnailUrl;
      say('업로드 완료', true);
    }catch(err){
      console.error('[main upload error]', err);
      say('업로드 실패: '+err.message);
    }finally{
      URL.revokeObjectURL(local);
      toggleEmpty(mainTrigger, mainPrev);
    }
  });

  // cover upload
  coverFile?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)) { e.target.value=''; return; }
    const local = URL.createObjectURL(f);
    coverPrev.src = local; toggleEmpty(coverTrigger, coverPrev);
    try{
      say('배경 이미지 업로드 중…');
      const small = await compressImage(f, 1920);
      const url = await uploadToCloudinary(small);
      state.coverImageUrl = withTransform(url, THUMB.cover169);
      coverPrev.src = state.coverImageUrl;
      say('업로드 완료', true);
    }catch(err){
      console.error('[cover upload error]', err);
      say('업로드 실패: '+err.message);
    }finally{
      URL.revokeObjectURL(local);
      toggleEmpty(coverTrigger, coverPrev);
    }
  });

  // sub images
  function drawSubs(){
    if(!subsGrid) return;
    subsGrid.innerHTML = state.subThumbnails.map((u,i)=>`
      <div class="sub">
        <img src="${u}" alt="sub-${i}"/>
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>
    `).join('');
  }
  subsGrid?.addEventListener('click', e=>{
    const btn=e.target.closest('.rm'); if(!btn) return;
    const i=Number(btn.dataset.i);
    state.subThumbnails.splice(i,1);
    drawSubs();
  });
  subsFile?.addEventListener('change', async e=>{
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    const remain = Math.max(0, 5 - state.subThumbnails.length);
    const chosen = files.slice(0, remain);
    for(const f of chosen){
      if(!isImgOk(f)) continue;
      const local = URL.createObjectURL(f);
      // 임시 타일
      const tmp = document.createElement('div');
      tmp.className='sub';
      tmp.innerHTML = `<img src="${local}" alt="uploading"/>`;
      subsGrid?.appendChild(tmp);

      try{
        say('서브 이미지 업로드 중…');
        const small = await compressImage(f);
        const url = await uploadToCloudinary(small);
        const finalUrl = withTransform(url, THUMB.square);
        state.subThumbnails.push(finalUrl);
        drawSubs();
        say('업로드 완료', true);
      }catch(err){
        console.error('[sub upload error]', err);
        say('업로드 실패: '+err.message);
        tmp.remove();
      }finally{
        URL.revokeObjectURL(local);
      }
    }
    e.target.value='';
  });

  // links & tags
  function addLinkRow(v={title:'',url:'',date:''}){
    const row = document.createElement('div');
    row.className='link-row';
    row.innerHTML = `
      <input class="input l-title" placeholder="제목(예: ◯◯몰 뷰티 라이브)" value="${v.title||''}"/>
      <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}"/>
      <input class="input l-date" type="date" value="${v.date||''}"/>
      <button class="ic" type="button" aria-label="삭제">✕</button>
    `;
    linksWrap?.appendChild(row);
  }
  addLinkBtn?.addEventListener('click', ()=> addLinkRow());
  linksWrap?.addEventListener('click', e=>{
    const b=e.target.closest('.ic'); if(!b) return;
    b.closest('.link-row')?.remove();
  });

  function drawTags(){
    if(!tagList) return;
    tagList.innerHTML = state.tags.map((t,i)=>`
      <span class="chip">${t}<button type="button" class="x" data-i="${i}">×</button></span>
    `).join('');
  }
  tagList?.addEventListener('click', e=>{
    const x=e.target.closest('.x'); if(!x) return;
    const i=Number(x.dataset.i); state.tags.splice(i,1); drawTags();
  });
  tagInput?.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===','){
      e.preventDefault();
      const raw = tagInput.value.trim().replace(/,$/,'');
      if(!raw) return;
      if(state.tags.length>=8){ say('태그는 최대 8개'); return; }
      if(state.tags.includes(raw)) { tagInput.value=''; return; }
      state.tags.push(raw);
      tagInput.value=''; drawTags();
    }
  });

  // validate & submit (옵션 B 백엔드)
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
    const rows = Array.from(linksWrap?.querySelectorAll('.link-row')||[]);
    for(const row of rows){
      const url = row.querySelector('.l-url')?.value.trim();
      if(url && !/^https:\/\//.test(url)){ say('라이브 URL은 https:// 로 시작해야 합니다'); return false; }
    }
    return true;
  }
  function collectPayload(status){
    const links = Array.from(linksWrap?.querySelectorAll('.link-row')||[]).map(row=>({
      title: row.querySelector('.l-title')?.value.trim() || '',
      url:   row.querySelector('.l-url')?.value.trim() || '',
      date:  row.querySelector('.l-date')?.value || undefined
    })).filter(x=>x.title || x.url);

    return {
      type: 'portfolio',
      status,
      visibility: visibility.value,
      nickname: nickname.value.trim(),
      headline: headline.value.trim(),
      mainThumbnailUrl: state.mainThumbnailUrl || '',
      subThumbnails: state.subThumbnails,
      coverImageUrl: state.coverImageUrl || '',
      realName: realName.value.trim() || '',
      realNamePublic: !!realNamePublic.checked,
      careerYears: careerYears.value ? Number(careerYears.value) : undefined,
      age: age.value ? Number(age.value) : undefined,
      agePublic: !!agePublic.checked,
      primaryLink: primaryLink.value.trim() || '',
      liveLinks: links,
      bio: bio.value.trim(),
      tags: state.tags,
      openToOffers: !!openToOffers.checked
    };
  }
  async function submit(status){
    if(!TOKEN){ say('로그인이 필요합니다'); return; }
    const isPublish = status==='published';
    if(!validate(isPublish)) return;
    const payload = collectPayload(status);
    try{
      say(isPublish ? '발행 중…' : '임시저장 중…');
      const res = await fetch(`${API_BASE}/portfolio-test`, {
        method:'POST', headers: headers(true), body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message || `HTTP_${res.status}`);
      say(isPublish ? '발행되었습니다' : '임시저장 완료', true);
      setTimeout(()=> location.href='mypage.html', 400);
    }catch(err){
      console.error('[submit error]', err);
      say('저장 실패: '+err.message);
    }
  }
  $id('saveDraftBtn')?.addEventListener('click', ()=> submit('draft'));
  $id('publishBtn')?.addEventListener('click', ()=> submit('published'));

  // 초기 상태 표시
  toggleEmpty(mainTrigger, mainPrev);
  toggleEmpty(coverTrigger, coverPrev);
})();