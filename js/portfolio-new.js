/* Portfolio Create – Livee v2.6 (Cloudinary + /portfolio-test) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENDPOINT = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';

  const THUMB = (CFG.thumb || {
    square:  "c_fill,g_auto,w_600,h_600,f_auto,q_auto",
    cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto"
  });

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken')  || '';

  // ---------- el refs ----------
  const $id = s => document.getElementById(s);
  const form = $id('pfForm');
  const msg  = $id('pfMsg');

  // media inputs / previews
  const mainFile = $id('mainFile'), mainPrev = $id('mainPrev');
  const coverFile = $id('coverFile'), coverPrev = $id('coverPrev');
  const subsFile  = $id('subsFile'),  subsGrid  = $id('subsGrid');

  // text inputs
  const nickname = $id('nickname'), headline = $id('headline'), bio = $id('bio');
  const realName = $id('realName'), realNamePublic = $id('realNamePublic');
  const age = $id('age'), agePublic = $id('agePublic');
  const careerYears = $id('careerYears'), primaryLink = $id('primaryLink');
  const visibility = $id('visibility'), openToOffers = $id('openToOffers');

  const linksWrap = $id('linksWrap'), addLinkBtn = $id('addLinkBtn');
  const tagInput = $id('tagInput'), tagList = $id('tagList');

  // ---------- state ----------
  const state = {
    mainThumbnailUrl: "",
    coverImageUrl: "",
    subThumbnails: [],    // string[]
    tags: []              // string[]
  };

  // ---------- utils ----------
  const say = (t, ok=false) => {
    if(!msg) return;
    msg.textContent=t;
    msg.classList.add('show');
    msg.classList.toggle('ok', ok);
  };
  const headers = (json=true)=>{
    const h={};
    if(json) h['Content-Type']='application/json';
    if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`;
    return h;
  };
  const withTransform = (url, t) => {
    try{
      if(!url || !url.includes('/upload/')) return url || '';
      const [h,tail]=url.split('/upload/');
      return `${h}/upload/${t}/${tail}`;
    }catch{ return url; }
  };

  // 빈 값/잘못된 값 제거
  const compact = (obj) => {
    const out = Array.isArray(obj) ? [] : {};
    if (Array.isArray(obj)) {
      for (const v of obj) {
        if (v === undefined || v === null || v === "" || Number.isNaN(v)) continue;
        if (typeof v === 'object') {
          const c = compact(v);
          if (Array.isArray(c) ? c.length : Object.keys(c).length) out.push(c);
        } else out.push(v);
      }
    } else {
      for (const [k,v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === "" || Number.isNaN(v)) continue;
        if (typeof v === 'object') {
          const c = compact(v);
          const keep = Array.isArray(c) ? c.length : Object.keys(c).length;
          if (keep) out[k]=c;
        } else out[k]=v;
      }
    }
    return out;
  };

  // ---------- Cloudinary ----------
  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
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
    if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }
  function isImgOk(f){
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; }
    if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; }
    return true;
  }

  // ---------- media handlers ----------
  mainFile?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)) { e.target.value=''; return; }
    try{
      say('메인 이미지 업로드 중…');
      const url=await uploadImage(f);
      state.mainThumbnailUrl = withTransform(url, THUMB.square);
      mainPrev.src = state.mainThumbnailUrl;
      say('업로드 완료', true);
    }catch(err){ say('업로드 실패: '+err.message); }
  });

  coverFile?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!isImgOk(f)) { e.target.value=''; return; }
    try{
      say('배경 이미지 업로드 중…');
      const url=await uploadImage(f);
      state.coverImageUrl = withTransform(url, THUMB.cover169 || THUMB.card169);
      coverPrev.src = state.coverImageUrl;
      say('업로드 완료', true);
    }catch(err){ say('업로드 실패: '+err.message); }
  });

  subsFile?.addEventListener('change', async e=>{
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    const remain = Math.max(0, 5 - state.subThumbnails.length);
    const chosen = files.slice(0, remain);
    for(const f of chosen){
      if(!isImgOk(f)) continue;
      try{
        say('서브 이미지 업로드 중…');
        const url=await uploadImage(f);
        state.subThumbnails.push(withTransform(url, THUMB.square));
        drawSubs();
        say('업로드 완료', true);
      }catch(err){ say('업로드 실패: '+err.message); }
    }
    e.target.value='';
  });
  function drawSubs(){
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

  // ---------- live links ----------
  function addLinkRow(v={title:'',url:'',date:''}){
    const row = document.createElement('div');
    row.className='link-row';
    row.innerHTML = `
      <input class="input l-title" placeholder="제목(예: ◯◯몰 뷰티 라이브)" value="${v.title||''}"/>
      <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}"/>
      <input class="input l-date" type="date" value="${v.date||''}"/>
      <button class="ic" type="button" aria-label="삭제">✕</button>
    `;
    linksWrap.appendChild(row);
  }
  addLinkBtn?.addEventListener('click', ()=> addLinkRow());
  linksWrap?.addEventListener('click', e=>{
    const b=e.target.closest('.ic'); if(!b) return;
    const row=b.closest('.link-row'); row?.remove();
  });

  // ---------- tags ----------
  function drawTags(){
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
      tagInput.value='';
      drawTags();
    }
  });

  // ---------- validation ----------
  function validate(isPublish){
    if(isPublish){
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
      if(!nickname.value.trim()){ say('닉네임을 입력해주세요'); return false; }
      if(!headline.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
      // 상세 소개는 길이 제한 없음 (요청 반영)
      if(!bio.value.trim()){ say('상세 소개를 입력해주세요'); return false; }
    }
    // URL 형식 검증(있을 때만)
    const urlOk = (u)=>!u || /^https:\/\//.test(u.trim());
    if(!urlOk(primaryLink.value)){ say('대표 링크는 https:// 로 시작해야 합니다'); return false; }
    const rows = Array.from(linksWrap.querySelectorAll('.link-row'));
    for(const row of rows){
      const u = row.querySelector('.l-url').value.trim();
      if(u && !urlOk(u)){ say('라이브 URL은 https:// 로 시작해야 합니다'); return false; }
    }
    return true;
  }

  // ---------- payload ----------
  function toISODateOrEmpty(s){
    const v = (s||'').trim();
    if(!v) return '';
    // yyyy-mm-dd -> yyyy-mm-ddT00:00:00.000Z
    const d = new Date(`${v}T00:00:00.000Z`);
    return isNaN(d) ? '' : d.toISOString();
  }

  function collectPayload(status){
    const links = Array.from(linksWrap.querySelectorAll('.link-row')).map(row=>{
      const t = row.querySelector('.l-title').value.trim();
      const u = row.querySelector('.l-url').value.trim();
      const d = row.querySelector('.l-date').value;
      return { title:t, url:u, date: toISODateOrEmpty(d) || undefined };
    }).filter(x=>x.title || x.url);

    const cy = careerYears.value.trim();
    const ageVal = age.value.trim();

    const payloadRaw = {
      type: 'portfolio',
      status,
      visibility: visibility.value || 'public',
      mainThumbnailUrl: state.mainThumbnailUrl,
      coverImageUrl: state.coverImageUrl,
      subThumbnails: state.subThumbnails,

      nickname: nickname.value.trim(),
      headline: headline.value.trim(),
      bio: bio.value.trim(),

      realName: realName.value.trim() || undefined,
      realNamePublic: !!realNamePublic.checked,
      age: ageVal ? Number(ageVal) : undefined,
      agePublic: !!agePublic.checked,
      careerYears: cy ? Number(cy) : undefined,

      primaryLink: primaryLink.value.trim() || undefined,
      liveLinks: links,
      tags: state.tags,
      openToOffers: !!openToOffers.checked
    };

    // 잘못된 숫자/빈값 제거
    return compact(payloadRaw);
  }

  // ---------- submit ----------
  async function submit(status){
    if(!TOKEN){ say('로그인이 필요합니다'); return; }
    const isPublish = status==='published';
    if(!validate(isPublish)) return;

    const payload = collectPayload(status);

    try{
      say(isPublish ? '발행 중…' : '임시저장 중…');
      const url = `${API_BASE}${ENDPOINT.startsWith('/')?ENDPOINT:`/${ENDPOINT}`}`;
      const res = await fetch(url, { method:'POST', headers: headers(true), body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message || `HTTP_${res.status}`);
      say(isPublish ? '발행되었습니다' : '임시저장 완료', true);
      setTimeout(()=> location.href='mypage.html', 400);
    }catch(err){
      say('저장 실패: '+err.message);
    }
  }

  // ---------- buttons ----------
  $id('saveDraftBtn')?.addEventListener('click', ()=> submit('draft'));
  $id('publishBtn')?.addEventListener('click', ()=> submit('published'));

  // 초기 한 줄 링크 필드 1개 제공
  addLinkRow();
})();