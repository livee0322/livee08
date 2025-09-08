/* portfolio-new.js — polished UI + stable edit/publish (2025-09-09) */
(function(){
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'portfolio-test';
  const THUMB  = CFG.thumb || {
    square:   'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
  };
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here  = encodeURIComponent(location.pathname + location.search + location.hash);

  const $id = (s)=> document.getElementById(s);
  const say = (t, ok=false)=>{ const el=$id('pfMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };

  const headers = (json=true)=>{ const h={ Accept:'application/json' }; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{ return url; } };
  const stripHtml = (s='')=> String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const pickHeadline = (d)=> (d.headline && String(d.headline).trim()) || d.intro || d.introduction || d.oneLiner || d.summary || (d.bio?stripHtml(d.bio).slice(0,60):'') || '';

  // 상태
  const state = { id:'', mainThumbnailUrl:'', coverImageUrl:'', subThumbnails:[], tags:[], pending:0 };
  const bump = (n)=>{ state.pending=Math.max(0,state.pending+n); };

  // -------- Auth short-circuit ----------
  if (!TOKEN) {
    // 로그인 필요 시 로그인 페이지로
    // (원한다면 주석 처리)
    // location.href = 'login.html?returnTo='+here;
  }

  // DOM 준비
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  async function init(){
    const form = $id('pfForm'); if(!form) return;

    // 엘리먼트
    const mainFile=$id('mainFile'), coverFile=$id('coverFile'), subsFile=$id('subsFile');
    const mainPrev=$id('mainPrev'), coverPrev=$id('coverPrev');
    const mainTrig=$id('mainTrigger'), coverTrig=$id('coverTrigger'), subsTrig=$id('subsTrigger');

    const nickname=$id('nickname'), headline=$id('headline'), bio=$id('bio');
    const careerYears=$id('careerYears'), age=$id('age'), primaryLink=$id('primaryLink');
    const visibility=$id('visibility'), openToOffers=$id('openToOffers');

    const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
    const tagInput=$id('tagInput'), tagList=$id('tagList'), subsGrid=$id('subsGrid');

    const nicknamePreview=$id('nicknamePreview'), headlinePreview=$id('headlinePreview');

    // 미리보기 갱신
    function setPreview(kind, url){
      if(!url) return;
      if(kind==='main'){
        mainPrev.src = url; mainPrev.style.display='block';
        mainTrig?.classList.remove('is-empty');
      }
      if(kind==='cover'){
        coverPrev.src = url; coverPrev.style.display='block';
        coverTrig?.classList.remove('is-empty');
      }
    }

    // textarea 자동 높이
    const autoGrow = (el)=>{
      el.style.height = 'auto';
      el.style.height = Math.min(800, Math.max(180, el.scrollHeight)) + 'px';
    };
    bio?.addEventListener('input', ()=> autoGrow(bio));
    if (bio) setTimeout(()=>autoGrow(bio), 0);

    // 파일 트리거
    mainTrig?.addEventListener('click', e=>{ e.preventDefault(); mainFile?.click(); });
    coverTrig?.addEventListener('click', e=>{ e.preventDefault(); coverFile?.click(); });
    subsTrig?.addEventListener('click', e=>{ e.preventDefault(); subsFile?.click(); });

    // Cover / Avatar 업로드 (Cloudinary)
    async function getSignature(){
      const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)});
      const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      return j.data||j;
    }
    async function uploadImage(file){
      const {cloudName, apiKey, timestamp, signature} = await getSignature();
      const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
      const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
      const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`); return j.secure_url;
    }
    const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

    mainFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local = URL.createObjectURL(f); setPreview('main', local); bump(+1);
      try{ say('메인 이미지 업로드 중…'); const url=await uploadImage(f); state.mainThumbnailUrl=withTransform(url,THUMB.square); setPreview('main',state.mainThumbnailUrl); say('업로드 완료',true); }
      catch(err){ console.error('[main upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    coverFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local = URL.createObjectURL(f); setPreview('cover', local); bump(+1);
      try{ say('배경 이미지 업로드 중…'); const url=await uploadImage(f); state.coverImageUrl=withTransform(url,THUMB.cover169); setPreview('cover',state.coverImageUrl); say('업로드 완료',true); }
      catch(err){ console.error('[cover upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    // 서브 썸네일
    function drawSubs(){
      if(!subsGrid) return;
      const items = state.subThumbnails.map((u,i)=>`
        <div class="sub">
          <img src="${u}" alt="sub-${i}">
          <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
        </div>`).join('');
      subsGrid.innerHTML = items;
    }
    subsGrid?.addEventListener('click', e=>{
      const btn=e.target.closest('.rm'); if(!btn) return;
      state.subThumbnails.splice(Number(btn.dataset.i),1); drawSubs();
    });
    subsFile?.addEventListener('change', async e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      const remain=Math.max(0,5-state.subThumbnails.length);
      for(const f of files.slice(0,remain)){
        if(!isImgOk(f)) continue;
        const local=URL.createObjectURL(f); // 즉시 프리뷰 느낌은 Cloudinary 완료 후로 통일
        bump(+1);
        try{
          say('서브 이미지 업로드 중…');
          const url=await uploadImage(f);
          state.subThumbnails.push(withTransform(url,THUMB.square));
          drawSubs(); say('업로드 완료',true);
        }catch(err){
          console.error('[sub upload]',err); say('업로드 실패: '+(err.message||'오류'));
        }finally{ URL.revokeObjectURL(local); bump(-1); }
      }
      e.target.value='';
    });

    // 태그
    const tagState = state.tags;
    function drawTags(){
      tagList.innerHTML = tagState.map((t,i)=>`
        <span class="chip">${t}<button type="button" class="x" data-i="${i}" aria-label="태그 삭제">×</button></span>
      `).join('');
    }
    tagList?.addEventListener('click', e=>{
      const x = e.target.closest('.x'); if(!x) return;
      tagState.splice(Number(x.dataset.i), 1); drawTags();
    });
    tagInput?.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===','){
        e.preventDefault();
        const raw=(tagInput.value||'').trim().replace(/,$/,'');
        if(!raw) return;
        if(tagState.length>=8){ say('태그는 최대 8개'); return; }
        if(tagState.includes(raw)){ tagInput.value=''; return; }
        tagState.push(raw); tagInput.value=''; drawTags();
      }
    });

    // 링크
    function addLinkRow(v={title:'',url:'',date:''}){
      const row=document.createElement('div');
      row.className='link-row v';
      row.innerHTML = `
        <input class="input l-title" placeholder="제목" value="${v.title||''}">
        <div class="row">
          <input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}">
          <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
          <button class="ic" type="button" aria-label="삭제">✕</button>
        </div>`;
      linksWrap.appendChild(row);
    }
    addLinkBtn?.addEventListener('click', ()=> addLinkRow());
    linksWrap?.addEventListener('click', e=>{
      const b=e.target.closest('.ic'); if(!b) return; b.closest('.link-row')?.remove();
    });
    addLinkRow(); drawTags();

    // 닉네임/헤드라인 라이브 미리보기
    nickname?.addEventListener('input', ()=> nicknamePreview.textContent = nickname.value.trim()||'닉네임');
    headline?.addEventListener('input', ()=> headlinePreview.textContent = headline.value.trim()||'한 줄 소개');

    // 검증 + 페이로드
    const strOrU=(v)=> (v && String(v).trim()) ? String(v).trim() : undefined;
    function validate(pub){
      if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
      if(pub){
        if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
        if(!nickname?.value.trim()){ say('닉네임을 입력해주세요'); return false; }
        if(!headline?.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
      }
      if(primaryLink?.value && primaryLink.value.trim() && !/^https:\/\//.test(primaryLink.value.trim())){ say('대표 링크는 https:// 로 시작'); return false; }
      const rows=Array.from(linksWrap?.querySelectorAll('.link-row')||[]);
      for(const r of rows){ const u=r.querySelector('.l-url')?.value.trim(); if(u && !/^https:\/\//.test(u)){ say('라이브 URL은 https:// 로 시작'); return false; } }
      return true;
    }
    function collectPayload(status){
      const rows=Array.from(linksWrap?.querySelectorAll('.link-row')||[]);
      const links=rows.map(r=>({
        title:strOrU(r.querySelector('.l-title')?.value),
        url:strOrU(r.querySelector('.l-url')?.value),
        date:strOrU(r.querySelector('.l-date')?.value)
      })).filter(x=>x.title||x.url);

      return {
        type:'portfolio', status, visibility: visibility?.value || 'public',
        nickname: strOrU(nickname?.value),
        headline: strOrU(headline?.value),
        bio:      strOrU(bio?.value),
        mainThumbnailUrl: state.mainThumbnailUrl || undefined,
        coverImageUrl:    state.coverImageUrl || undefined,
        subThumbnails:    state.subThumbnails.filter(Boolean),
        careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
        age:         age?.value ? Number(age.value) : undefined,
        primaryLink: strOrU(primaryLink?.value),
        openToOffers: !!openToOffers?.checked,
        liveLinks: links,
        tags: state.tags
      };
    }
    function formatServerError(data){
      try{
        const first=(Array.isArray(data?.details)&&data.details[0])||(Array.isArray(data?.errors)&&data.errors[0]);
        if(first){ const map={nickname:'닉네임을 입력해주세요.', headline:'한 줄 소개를 입력해주세요.', mainThumbnailUrl:'메인 썸네일을 업로드해주세요.'}; const f=first.param||first.path||''; return map[f]||`[${f}] ${first.msg||'invalid'}`; }
        return data?.message || '유효성 오류';
      }catch{ return '유효성 오류'; }
    }

    async function submit(status){
      if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
      const pub=(status==='published');
      if(!validate(pub)) return;
      try{
        say(pub?'발행 중…':'임시저장 중…');
        const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(collectPayload(status)) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || data.ok===false) throw new Error(formatServerError(data) || `HTTP_${res.status}`);
        say(pub?'발행되었습니다':'임시저장 완료', true);
        setTimeout(()=> location.href='mypage.html', 450);
      }catch(err){ console.error('[submit error]',err); say('저장 실패: '+(err.message||'네트워크 오류')); }
    }

    // 버튼
    $id('publishBtn')?.addEventListener('click', e=>{ e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', e=>{ e.preventDefault(); submit('draft'); });

    // 수정모드 로딩
    state.id = new URLSearchParams(location.search).get('id') || '';
    if(state.id){
      try{
        say('불러오는 중…');
        const r = await fetch(`${API_BASE}/${ENTITY}/${state.id}`, { headers: headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
        const d = j.data || j;

        // 값 채우기
        nickname && (nickname.value = d.nickname || '');
        headline && (headline.value = pickHeadline(d));
        bio      && (bio.value      = d.bio || '');
        careerYears && (careerYears.value = d.careerYears || '');
        age      && (age.value      = d.age || '');
        visibility && (visibility.value = d.visibility || 'public');
        openToOffers && (openToOffers.checked = d.openToOffers !== false);

        // 프리뷰 + 상태
        state.mainThumbnailUrl = d.mainThumbnailUrl || '';
        state.coverImageUrl    = d.coverImageUrl || '';
        state.subThumbnails    = Array.isArray(d.subThumbnails)? d.subThumbnails.slice(0,5):[];
        state.tags             = Array.isArray(d.tags)? d.tags.slice(0,8):[];

        setPreview('main', state.mainThumbnailUrl);
        setPreview('cover', state.coverImageUrl);
        drawSubs(); drawTags();

        // 이름/헤드라인 미리보기
        nicknamePreview.textContent = nickname.value.trim() || '닉네임';
        headlinePreview.textContent = headline.value.trim() || '한 줄 소개';
        if (bio) autoGrow(bio);

        say('로드 완료', true);
      }catch(err){
        console.error('[load edit]', err);
        say('불러오기 실패: '+(err.message||'오류'));
      }
    }

    // 전역 디버그(선택)
    window.PF_APP = { state, submit };
  }
})();