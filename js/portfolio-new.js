/* Portfolio Create – v2.9.4
   - unified schema (nickname/headline/bio/mainThumbnailUrl)
   - robust image pickers (overlay/capture delegation)
   - clear validation + server 422 details surfaced
   - fetchMe() 후보 정리: /api/v1/users/me, /api/auth/me (404 소음 제거)
*/
(() => {
  const form = document.getElementById('pfForm');
  if (!form) return;

  /* ---------- config ---------- */
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const THUMB = CFG.thumb || {
    square:  "c_fill,g_auto,w_600,h_600,f_auto,q_auto",
    cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto",
  };
  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  /* ---------- utils ---------- */
  const $id = (s)=>document.getElementById(s);
  const say = (t, ok=false) => {
    const box = $id('pfMsg'); if (!box) return;
    box.textContent = t;
    box.classList.add('show');
    box.classList.toggle('ok', ok);
  };
  const headers = (json=true)=>{
    const h={};
    if(json) h['Content-Type']='application/json';
    if(TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };
  const withTransform = (url, t) => {
    try{
      if(!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0,i+8) + t + '/' + url.slice(i+8);
    }catch{ return url; }
  };
  const safeBind = (el, fn)=>{
    if(!el) return;
    el.addEventListener('click', (e)=>{ e.preventDefault(); fn(); }, { passive:false });
  };

  /* ---------- auth / guard ---------- */
  const guard = {
    root: $id('pfGuard'),
    title: $id('pfGuardTitle'),
    desc: $id('pfGuardDesc'),
    action: $id('pfGuardAction'),
    close: $id('pfGuardClose'),
    show(kind){
      if(!this.root) return;
      if(kind==='login'){
        this.title.textContent = '로그인이 필요합니다';
        this.desc.textContent = '로그인 후 이용해 주세요.';
        this.action.textContent = '로그인하기';
        this.action.href = 'login.html?returnTo=' + encodeURIComponent(location.href);
      }else{
        this.title.textContent = '쇼호스트 권한이 필요합니다';
        this.desc.textContent = '쇼호스트 인증 후 이용하실 수 있어요.';
        this.action.textContent = '권한 문의';
        this.action.href = 'help.html#host';
      }
      this.root.classList.add('show');
    },
    hide(){ this.root?.classList.remove('show'); }
  };
  guard.close?.addEventListener('click', ()=> guard.hide());

  async function fetchMe(){
    if(!TOKEN) return null;
    const headersMe = { 'Authorization':'Bearer '+TOKEN };

    // ✅ 실제 존재하는 후보만 시도
    const candidates = [
      `${API_BASE}/users/me`, // 신규
      `/api/auth/me`,         // 레거시 고정 경로
    ];

    for (const url of candidates){
      try{
        const r = await fetch(url, { headers: headersMe });
        if(!r.ok) continue;
        const j = await r.json().catch(()=>null);
        if(!j) continue;
        return j.data || j.user || j;
      }catch(_){}
    }
    return null;
  }
  function hasRole(me, role){
    if(!me) return false;
    const roles = Array.isArray(me.roles) ? me.roles : (me.role ? [me.role] : []);
    return roles.includes(role) || roles.includes('admin');
  }

  /* ---------- image upload ---------- */
  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd=new FormData();
    fd.append('file',file);
    fd.append('api_key',apiKey);
    fd.append('timestamp',timestamp);
    fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return j.secure_url;
  }
  const isImgOk = (f)=>{
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; }
    if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; }
    return true;
  };

  /* ---------- inputs / elements (single declaration) ---------- */
  const mainFile  = $id('mainFile');
  const coverFile = $id('coverFile');
  const subsFile  = $id('subsFile');

  const mainImgEl  = $id('mainPrev');
  const coverImgEl = $id('coverPrev');

  const mainTrigger  = $id('mainTrigger');
  const coverTrigger = $id('coverTrigger');
  const subsTrigger  = $id('subsTrigger');

  const nickname     = $id('nickname');
  const headline     = $id('headline');
  const bio          = $id('bio');
  const realName     = $id('realName');
  const realNamePublic = $id('realNamePublic');
  const age          = $id('age');
  const agePublic    = $id('agePublic');
  const careerYears  = $id('careerYears');
  const primaryLink  = $id('primaryLink');
  const visibility   = $id('visibility');
  const openToOffers = $id('openToOffers');

  const linksWrap    = $id('linksWrap');
  const addLinkBtn   = $id('addLinkBtn');

  const tagInput     = $id('tagInput');
  const tagList      = $id('tagList');

  const subsGrid     = $id('subsGrid');
  const namePreview  = $id('namePreview');
  const headlinePreview = $id('headlinePreview');

  /* ---------- state ---------- */
  const state = {
    id: new URLSearchParams(location.search).get('id') || '',
    mainThumbnailUrl: '',
    coverImageUrl: '',
    subThumbnails: [],
    tags: [],
    pending: 0
  };
  const bump = (n)=>{ state.pending = Math.max(0, state.pending + n); };

  /* ---------- previews ---------- */
  function setPreview(kind, url){
    if(!url) return;
    if(kind==='main' && mainImgEl){
      mainImgEl.src = url; mainImgEl.style.display = ''; mainImgEl.removeAttribute?.('hidden');
      mainTrigger?.classList.remove('is-empty');
    }
    if(kind==='cover' && coverImgEl){
      coverImgEl.src = url; coverImgEl.style.display = ''; coverImgEl.removeAttribute?.('hidden');
      coverTrigger?.classList.remove('is-empty');
    }
  }

  /* ---------- pickers (with delegation for overlays) ---------- */
  safeBind(mainTrigger,  ()=> mainFile?.click());
  safeBind(coverTrigger, ()=> coverFile?.click());
  safeBind(subsTrigger,  ()=> subsFile?.click());

  document.addEventListener('click', (e) => {
    const el = e.target.closest('#mainTrigger, #coverTrigger, #subsTrigger, #subsTrigger2');
    if (!el) return;
    e.preventDefault();
    if (el.id === 'mainTrigger')  return mainFile?.click();
    if (el.id === 'coverTrigger') return coverFile?.click();
    if (el.id === 'subsTrigger' || el.id === 'subsTrigger2') return subsFile?.click();
  }, true);

  /* ---------- live previews (nickname/headline) ---------- */
  function syncName(){ if(namePreview && nickname) namePreview.textContent = nickname.value.trim() || '닉네임'; }
  function syncHeadline(){ if(headlinePreview && headline) headlinePreview.textContent = headline.value.trim() || ''; }
  nickname?.addEventListener('input', syncName);
  headline?.addEventListener('input', syncHeadline);
  syncName(); syncHeadline();

  /* ---------- uploads ---------- */
  mainFile?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)){ e.target.value=''; return; }
    const local = URL.createObjectURL(f);
    setPreview('main', local);
    bump(+1);
    try{
      say('메인 이미지 업로드 중…');
      const url = await uploadImage(f);
      state.mainThumbnailUrl = withTransform(url, THUMB.square);
      setPreview('main', state.mainThumbnailUrl);
      say('업로드 완료', true);
    }catch(err){
      console.error('[main upload]', err);
      say('업로드 실패: '+err.message);
    }finally{
      URL.revokeObjectURL(local);
      bump(-1);
      e.target.value='';
    }
  });

  coverFile?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)){ e.target.value=''; return; }
    const local = URL.createObjectURL(f);
    setPreview('cover', local);
    bump(+1);
    try{
      say('배경 이미지 업로드 중…');
      const url = await uploadImage(f);
      state.coverImageUrl = withTransform(url, THUMB.cover169);
      setPreview('cover', state.coverImageUrl);
      say('업로드 완료', true);
    }catch(err){
      console.error('[cover upload]', err);
      say('업로드 실패: '+err.message);
    }finally{
      URL.revokeObjectURL(local);
      bump(-1);
      e.target.value='';
    }
  });

  function drawSubs(){
    if(!subsGrid) return;
    const items = state.subThumbnails.map((u,i)=>`
      <div class="sub">
        <img src="${u}" alt="sub-${i}"/>
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>
    `).join('');
    subsGrid.innerHTML = `
      ${items}
      <button type="button" class="pf-addThumb" id="subsTrigger2" aria-label="서브 이미지 추가">
        <i class="ri-image-add-line"></i>
      </button>`;
  }
  subsGrid?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.rm'); if(!btn) return;
    const i = Number(btn.dataset.i);
    state.subThumbnails.splice(i,1);
    drawSubs();
  });
  subsFile?.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files || []);
    if(!files.length) return;
    const remain = Math.max(0, 5 - state.subThumbnails.length);
    const chosen = files.slice(0, remain);
    for(const f of chosen){
      if(!isImgOk(f)) continue;
      const local = URL.createObjectURL(f);

      // 임시 카드 (업로드 대기 표시)
      const tmp = document.createElement('div');
      tmp.className = 'sub';
      tmp.innerHTML = `<img src="${local}" alt="uploading"/>`;
      subsGrid?.appendChild(tmp);

      bump(+1);
      try{
        say('서브 이미지 업로드 중…');
        const url = await uploadImage(f);
        const finalUrl = withTransform(url, THUMB.square);
        state.subThumbnails.push(finalUrl);
        drawSubs();
        say('업로드 완료', true);
      }catch(err){
        console.error('[sub upload]', err);
        say('업로드 실패: '+err.message);
        tmp.remove();
      }finally{
        URL.revokeObjectURL(local);
        bump(-1);
      }
    }
    e.target.value='';
  });

  /* ---------- live links & tags ---------- */
  function addLinkRow(v={title:'',url:'',date:''}){
    const row = document.createElement('div');
    row.className='link-row v';
    row.innerHTML = `
      <input class="input l-title" placeholder="제목(예: ◯◯몰 뷰티 라이브)" value="${v.title||''}"/>
      <div class="row">
        <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}"/>
        <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}"/>
        <button class="ic" type="button" aria-label="삭제">✕</button>
      </div>
    `;
    linksWrap?.appendChild(row);
  }
  addLinkBtn?.addEventListener('click', ()=> addLinkRow());
  linksWrap?.addEventListener('click', (e)=>{
    const b=e.target.closest('.ic'); if(!b) return;
    b.closest('.link-row')?.remove();
  });

  const tagState = state.tags;
  function drawTags(){
    if(!tagList) return;
    tagList.innerHTML = tagState.map((t,i)=>`
      <span class="chip">${t}<button type="button" class="x" data-i="${i}">×</button></span>
    `).join('');
  }
  tagList?.addEventListener('click', (e)=>{
    const x=e.target.closest('.x'); if(!x) return;
    tagState.splice(Number(x.dataset.i),1);
    drawTags();
  });
  tagInput?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' || e.key===','){
      e.preventDefault();
      const raw = tagInput.value.trim().replace(/,$/,'');
      if(!raw) return;
      if(tagState.length>=8){ say('태그는 최대 8개'); return; }
      if(tagState.includes(raw)){ tagInput.value=''; return; }
      tagState.push(raw); tagInput.value=''; drawTags();
    }
  });
  addLinkRow(); drawTags();

  /* ---------- validate & payload ---------- */
  function validate(isPublish){
    if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
    if(isPublish){
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
      if(!nickname?.value.trim()){ say('닉네임을 입력해주세요'); return false; }
      if(!headline?.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
      if(!bio?.value.trim() || bio.value.trim().length<50){ say('상세 소개를 50자 이상 입력해주세요'); return false; }
    }
    if(primaryLink?.value && !/^https:\/\//.test(primaryLink.value.trim())){
      say('대표 링크는 https:// 로 시작해야 합니다'); return false;
    }
    const rows = Array.from(linksWrap?.querySelectorAll('.link-row') || []);
    for(const row of rows){
      const url = row.querySelector('.l-url')?.value.trim();
      if(url && !/^https:\/\//.test(url)){ say('라이브 URL은 https:// 로 시작해야 합니다'); return false; }
    }
    return true;
  }

  function collectPayload(status){
    const rows = Array.from(linksWrap?.querySelectorAll('.link-row') || []);
    const links = rows.map(row=>({
      title: row.querySelector('.l-title')?.value.trim() || '',
      url:   row.querySelector('.l-url')?.value.trim() || '',
      date:  row.querySelector('.l-date')?.value || undefined
    })).filter(x=>x.title || x.url);

    return {
      type: 'portfolio',
      status,
      visibility: visibility?.value || 'public',
      nickname: nickname?.value.trim() || '',
      headline: headline?.value.trim() || '',
      mainThumbnailUrl: state.mainThumbnailUrl || '',
      subThumbnails: state.subThumbnails,
      coverImageUrl: state.coverImageUrl || '',
      realName: realName?.value.trim() || '',
      realNamePublic: !!realNamePublic?.checked,
      careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
      age: age?.value ? Number(age.value) : undefined,
      agePublic: !!agePublic?.checked,
      primaryLink: primaryLink?.value.trim() || '',
      liveLinks: links,
      bio: bio?.value.trim() || '',
      tags: state.tags,
      openToOffers: !!openToOffers?.checked
    };
  }

  // 구버전 호환 필드 동시 전송
  function compatPayload(p){
    return {
      ...p,
      displayName: p.nickname,
      mainThumbnail: p.mainThumbnailUrl,
      coverImage: p.coverImageUrl,
      subImages: p.subThumbnails,
    };
  }

  function formatServerError(data){
    if(!data) return '유효성 오류';
    if(Array.isArray(data.details) && data.details.length){
      const d = data.details[0];
      const field = d.param || d.field || '';
      const map = {
        nickname: '닉네임을 확인해주세요.',
        displayName: '닉네임(표시명)을 확인해주세요.',
        headline: '한 줄 소개를 확인해주세요.',
        bio: '상세 소개를 50자 이상 입력해주세요.',
        mainThumbnailUrl: '메인 썸네일을 업로드해주세요.',
        mainThumbnail: '메인 썸네일을 업로드해주세요.',
        visibility: '공개 범위를 확인해주세요.',
        tags: '태그는 최대 8개까지 가능합니다.',
        subThumbnails: '서브 썸네일은 최대 5장까지 가능합니다.',
        liveLinks: '라이브 링크 형식을 확인해주세요.',
      };
      if(map[field]) return map[field];
      if(d.msg) return String(d.msg).slice(0, 60);
    }
    if(data.message && data.message !== 'VALIDATION_FAILED') return data.message;
    return '유효성 오류';
  }

  /* ---------- submit ---------- */
  async function submit(status){
    if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
    const isPublish = status==='published';
    if(!validate(isPublish)) return;

    const payload = compatPayload(collectPayload(status));

    try{
      say(isPublish ? '발행 중…' : '임시저장 중…');
      const url = state.id ? `${API_BASE}/portfolio-test/${state.id}` : `${API_BASE}/portfolio-test`;
      const method = state.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(payload) });
      const data = await res.json().catch(()=> ({}));

      if(!res.ok || data.ok === false){
        throw new Error(formatServerError(data) || `HTTP_${res.status}`);
      }

      say(isPublish ? '발행되었습니다' : '임시저장 완료', true);
      setTimeout(()=> location.href='mypage.html', 400);
    }catch(err){
      console.error('[submit error]', err);
      say('저장 실패: ' + (err.message || '네트워크 오류'));
    }
  }

  $id('saveDraftBtn')?.addEventListener('click', ()=> submit('draft'));
  $id('publishBtn')?.addEventListener('click', ()=> submit('published'));

  /* ---------- load for edit ---------- */
  async function loadIfEdit(){
    if(!state.id) return;
    try{
      say('불러오는 중…');
      const r = await fetch(`${API_BASE}/portfolio-test/${state.id}`, { headers: headers(false) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      const d = j.data || j;

      nickname.value = d.nickname || '';
      headline.value = d.headline || '';
      bio.value = d.bio || '';
      realName.value = d.realName || '';
      realNamePublic.checked = !!d.realNamePublic;
      age.value = d.age || '';
      agePublic.checked = !!d.agePublic;
      careerYears.value = d.careerYears || '';
      primaryLink.value = d.primaryLink || '';
      visibility.value = d.visibility || 'public';
      openToOffers.checked = d.openToOffers !== false;

      state.mainThumbnailUrl = d.mainThumbnailUrl || '';
      state.coverImageUrl = d.coverImageUrl || '';
      state.subThumbnails = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0,5) : [];
      state.tags = Array.isArray(d.tags) ? d.tags.slice(0,8) : [];

      setPreview('main', state.mainThumbnailUrl);
      setPreview('cover', state.coverImageUrl);
      drawSubs(); drawTags();
      syncName(); syncHeadline();
      say('로드 완료', true);
    }catch(err){
      console.error('[load edit]', err);
      say('불러오기 실패: '+err.message);
    }
  }

  /* ---------- boot ---------- */
  (async ()=>{
    if(!TOKEN){ location.href = 'login.html?returnTo='+here; return; }
    const me = await fetchMe();
    if(!me){ location.href = 'login.html?returnTo='+here; return; }
    if(!hasRole(me, 'showhost')){
      [...form.querySelectorAll('input,select,textarea,button')].forEach(el=> el.disabled = true);
      guard.show('host'); return;
    }
    await loadIfEdit();
  })();
})();