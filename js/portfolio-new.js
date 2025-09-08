/* portfolio-new.js — v2.14 (stable)
   - 수정모드 로드 안정화
   - PUT 시 status 유지(서버 패치와 세트)
   - headline(id|name) 모두 인식
   - 폴백 로직 서버와 동일
*/
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

  const $id   = (s)=> document.getElementById(s);
  const $name = (s)=> document.querySelector(`[name="${s}"]`);
  const $pick = (idOrName)=> $id(idOrName) || $name(idOrName);

  const say = (t, ok=false)=>{ const el=$id('pfMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };
  const headers = (json=true)=>{ const h={ Accept:'application/json' }; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{ return url; } };
  const stripHtml = (s='')=> String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const pickHeadline = (d)=> (d.headline && String(d.headline).trim()) || d.intro || d.introduction || d.oneLiner || d.summary || (d.bio?stripHtml(d.bio).slice(0,60):'') || '';

  // 상태
  const state = { id:'', mainThumbnailUrl:'', coverImageUrl:'', subThumbnails:[], tags:[], pending:0 };
  const bump =(n)=>{ state.pending=Math.max(0,state.pending+n); };

  // 업로드
  async function getSignature(){ const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)}); const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`); return j.data||j; }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`); return j.secure_url;
  }
  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

  // DOM 준비
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  async function init(){
    const form = $id('pfForm'); if(!form) return;

    // 요소
    const mainFile=$id('mainFile'), coverFile=$id('coverFile'), subsFile=$id('subsFile');
    const mainPrev=$id('mainPrev'), coverPrev=$id('coverPrev');
    const mainTrig=$id('mainTrigger'), coverTrig=$id('coverTrigger'), subsTrig=$id('subsTrigger');

    const nickname=$pick('nickname');
    const headline=$pick('headline'); // id 또는 name
    const bio     =$pick('bio');

    const realName=$pick('realName'), realNamePublic=$pick('realNamePublic');
    const age=$pick('age'), agePublic=$pick('agePublic');
    const careerYears=$pick('careerYears'), primaryLink=$pick('primaryLink');
    const visibility=$pick('visibility'), openToOffers=$pick('openToOffers');

    const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
    const tagInput=$id('tagInput'), tagList=$id('tagList');
    const subsGrid=$id('subsGrid');

    // 파일 트리거
    const bindOpen=(btn,input)=> btn&&input&&btn.addEventListener('click',e=>{e.preventDefault(); input.click();});
    bindOpen(mainTrig, mainFile); bindOpen(coverTrig, coverFile); bindOpen(subsTrig, subsFile);

    const setPreview=(k,u)=>{ if(!u) return; if(k==='main'&&mainPrev){mainPrev.src=u; mainPrev.style.display='';} if(k==='cover'&&coverPrev){coverPrev.src=u; coverPrev.style.display='';} };

    mainFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); setPreview('main',local); bump(+1);
      try{ say('메인 이미지 업로드 중…'); const url=await uploadImage(f); state.mainThumbnailUrl=withTransform(url,THUMB.square); setPreview('main',state.mainThumbnailUrl); say('업로드 완료',true); }
      catch(err){ console.error('[main upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    coverFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); setPreview('cover',local); bump(+1);
      try{ say('배경 이미지 업로드 중…'); const url=await uploadImage(f); state.coverImageUrl=withTransform(url,THUMB.cover169); setPreview('cover',state.coverImageUrl); say('업로드 완료',true); }
      catch(err){ console.error('[cover upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    function drawSubs(){
      if(!subsGrid) return;
      const items=state.subThumbnails.map((u,i)=>`
        <div class="sub"><img src="${u}" alt="sub-${i}"><button type="button" class="rm" data-i="${i}">×</button></div>`).join('');
      subsGrid.innerHTML = `${items}<button type="button" class="pf-addThumb" id="subsTrigger2">+</button>`;
      $id('subsTrigger2')?.addEventListener('click', e=>{ e.preventDefault(); subsFile?.click(); });
    }
    subsGrid?.addEventListener('click', e=>{
      const btn=e.target.closest('.rm'); if(!btn) return;
      state.subThumbnails.splice(Number(btn.dataset.i),1); drawSubs();
    });
    subsFile?.addEventListener('change', async e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      const remain=Math.max(0,5-state.subThumbnails.length);
      for(const f of files.slice(0,remain)){
        if(!isImgOk(f)) continue; const local=URL.createObjectURL(f);
        const tmp=document.createElement('div'); tmp.className='sub'; tmp.innerHTML=`<img src="${local}">`; subsGrid?.appendChild(tmp);
        bump(+1);
        try{ say('서브 이미지 업로드 중…'); const url=await uploadImage(f); state.subThumbnails.push(withTransform(url,THUMB.square)); drawSubs(); say('업로드 완료',true); }
        catch(err){ console.error('[sub upload]',err); say('업로드 실패: '+(err.message||'오류')); tmp.remove(); }
        finally{ URL.revokeObjectURL(local); bump(-1); }
      }
      e.target.value='';
    });

    // 태그/링크
    const tagState=state.tags;
    const drawTags=()=>{ if(!tagList) return; tagList.innerHTML=tagState.map((t,i)=>`<span class="chip">${t}<button class="x" data-i="${i}">×</button></span>`).join(''); };
    tagList?.addEventListener('click', e=>{ const x=e.target.closest('.x'); if(!x) return; tagState.splice(Number(x.dataset.i),1); drawTags(); });
    tagInput?.addEventListener('keydown', e=>{
      if(e.key==='Enter'||e.key===','){ e.preventDefault(); const raw=(tagInput.value||'').trim().replace(/,$/,''); if(!raw) return;
        if(tagState.length>=8){ say('태그는 최대 8개'); return; } if(tagState.includes(raw)){ tagInput.value=''; return; }
        tagState.push(raw); tagInput.value=''; drawTags();
      }
    });
    function addLinkRow(v={title:'',url:'',date:''}){ const row=document.createElement('div'); row.className='link-row v'; row.innerHTML=`
      <input class="input l-title" placeholder="제목" value="${v.title||''}">
      <div class="row"><input class="input l-url" type="url" placeholder="https://..." value="${v.url||''}">
      <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
      <button class="ic" type="button">✕</button></div>`; linksWrap?.appendChild(row);
    }
    addLinkBtn?.addEventListener('click', ()=> addLinkRow());
    linksWrap?.addEventListener('click', e=>{ const b=e.target.closest('.ic'); if(!b) return; b.closest('.link-row')?.remove(); });
    addLinkRow(); drawTags();

    // 검증/페이로드
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
      const links=rows.map(r=>({ title:strOrU(r.querySelector('.l-title')?.value), url:strOrU(r.querySelector('.l-url')?.value), date:strOrU(r.querySelector('.l-date')?.value) })).filter(x=>x.title||x.url);
      return {
        type:'portfolio', status, visibility: visibility?.value || 'public',
        nickname: strOrU(nickname?.value), headline: strOrU(headline?.value), bio: strOrU(bio?.value),
        mainThumbnailUrl: state.mainThumbnailUrl || undefined, coverImageUrl: state.coverImageUrl || undefined,
        subThumbnails: state.subThumbnails.filter(Boolean),
        realName: strOrU(realName?.value), realNamePublic: !!realNamePublic?.checked,
        careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
        age: age?.value ? Number(age.value) : undefined, agePublic: !!agePublic?.checked,
        primaryLink: strOrU(primaryLink?.value), liveLinks: links, tags: state.tags, openToOffers: !!openToOffers?.checked
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
      const pub = status==='published';
      if(!validate(pub)) return;
      try{
        say(pub?'발행 중…':'임시저장 중…');
        const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(collectPayload(status)) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || data.ok===false) throw new Error(formatServerError(data) || `HTTP_${res.status}`);
        say(pub?'발행되었습니다':'임시저장 완료', true);
        setTimeout(()=> location.href='mypage.html', 400);
      }catch(err){ console.error('[submit error]',err); say('저장 실패: '+(err.message||'네트워크 오류')); }
    }

    // 버튼
    ($id('publishBtn') || form.querySelector('[data-action="publish"]'))?.addEventListener('click', e=>{ e.preventDefault(); submit('published'); });
    ($id('saveDraftBtn') || form.querySelector('[data-action="draft"]'))?.addEventListener('click',   e=>{ e.preventDefault(); submit('draft'); });

    // 수정 모드 로딩
    state.id = new URLSearchParams(location.search).get('id') || '';
    if(state.id){
      try{
        say('불러오는 중…');
        const r = await fetch(`${API_BASE}/${ENTITY}/${state.id}`, { headers: headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
        const d = j.data || j;

        if(nickname) nickname.value = d.nickname || '';
        if(headline) headline.value = pickHeadline(d);     // 폴백 일치
        if(bio)      bio.value      = d.bio || '';
        if(realName) realName.value = d.realName || '';
        if(realNamePublic) realNamePublic.checked = !!d.realNamePublic;
        if(age)      age.value      = d.age || '';
        if(agePublic) agePublic.checked = !!d.agePublic;
        if(careerYears) careerYears.value = d.careerYears || '';
        if(primaryLink) primaryLink.value = d.primaryLink || '';
        if(visibility) visibility.value   = d.visibility || 'public';
        if(openToOffers) openToOffers.checked = d.openToOffers !== false;

        state.mainThumbnailUrl = d.mainThumbnailUrl || '';
        state.coverImageUrl    = d.coverImageUrl || '';
        state.subThumbnails    = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0,5) : [];
        state.tags             = Array.isArray(d.tags) ? d.tags.slice(0,8) : [];
        setPreview('main', state.mainThumbnailUrl);
        setPreview('cover', state.coverImageUrl);
        drawSubs(); drawTags();

        say('로드 완료', true);
      }catch(err){
        console.error('[load edit]', err);
        say('불러오기 실패: '+(err.message||'오류'));
      }
    }

    // 전역 디버그 헬퍼(선택)
    window.PF_APP = { state, submit };
  }
})();