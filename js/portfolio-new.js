/* portfolio-new.js — v2.1.1
   - ui.js와 공존(밑줄 스타일 충돌 없음)
   - 프로필/커버 업로드 + 갤러리 5장
   - 공개여부 트리거 필드 포함
   - 쇼츠 기능 제거
   - 최근 라이브 링크(아이콘/미리보기/삭제)
   - 외부 링크 3개(대표/YouTube/Instagram)
   - 파일 첨부 목록 표시
*/
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    let p = raw.replace(/\/+$/, '');
    if (/^\/a\/v1($|\/)/.test(p)) p = p.replace(/^\/a\/v1/, '/api/v1');
    return /^https?:\/\//i.test(p) ? p : (location.origin + (p.startsWith('/') ? p : '/' + p));
  })();

  const ENTITY = 'portfolio-test';
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // dom
  const $ = (s, el = document) => el.querySelector(s);
  const $id = (s) => document.getElementById(s);
  const say = (t, ok=false) => { const el=$id('pfMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };

  // elements
  const mainFile=$id('mainFile'), coverFile=$id('coverFile'), subsFile=$id('subsFile');
  const mainTrig=$id('mainTrigger'), coverTrig=$id('coverTrigger'), subsTrig=$id('subsTrigger');
  const mainPrev=$id('mainPrev'), coverPrev=$id('coverPrev'), subsGrid=$id('subsGrid');

  const nickname=$id('nickname'), headline=$id('headline'), bio=$id('bio');
  const careerYears=$id('careerYears'), age=$id('age');
  const careerPublic=$id('careerPublic'), agePublic=$id('agePublic');

  const regionCity=$id('regionCity'), regionPublic=$id('regionPublic');
  const gender=$id('gender'), genderPublic=$id('genderPublic');
  const height=$id('height'), sizeTop=$id('sizeTop'), sizeBottom=$id('sizeBottom'), shoe=$id('shoe'), sizePublic=$id('sizePublic');

  const primaryLink=$id('primaryLink'), linkYouTube=$id('linkYouTube'), linkInstagram=$id('linkInstagram');
  const visibility=$id('visibility'), openToOffers=$id('openToOffers');

  const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
  const attachments=$id('attachments'), attachList=$id('attachList');

  const nicknamePreview=$id('nicknamePreview'), headlinePreview=$id('headlinePreview');

  // state
  const state = {
    id:'',
    mainThumbnailUrl:'',
    coverImageUrl:'',
    subThumbnails:[],
    uploads:0,
    files:[]   // 첨부파일(File) 배열(서버 업로드는 별도 엔드포인트 연결 시 활용)
  };
  const bump = (n)=>{ state.uploads=Math.max(0,state.uploads+n); };

  // helpers
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h.Authorization=`Bearer ${TOKEN}`; return h; };
  const withTr=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{return url;} };
  const THUMB={square:'c_fill,g_auto,w_600,h_600,f_auto,q_auto', cover:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'};

  async function getSignature(){
    const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data||j;
  }
  async function uploadImage(file){
    const {cloudName,apiKey,timestamp,signature}=await getSignature();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }
  const isImg=(f)=>/^image\//.test(f.type) && f.size<=8*1024*1024;

  // triggers
  mainTrig?.addEventListener('click',()=>mainFile?.click());
  coverTrig?.addEventListener('click',()=>coverFile?.click());
  subsTrig?.addEventListener('click',()=>subsFile?.click());

  function setPrev(kind,url){
    if(!url) return;
    if(kind==='main'){ mainPrev.src=url; mainPrev.style.display='block'; mainTrig?.classList.remove('is-empty'); }
    if(kind==='cover'){ coverPrev.src=url; coverPrev.style.display='block'; coverTrig?.classList.remove('is-empty'); }
  }

  mainFile?.addEventListener('change',async e=>{
    const f=e.target.files?.[0]; if(!f||!isImg(f)) return;
    const local=URL.createObjectURL(f); setPrev('main',local); bump(+1);
    try{ say('메인 업로드 중…'); const u=await uploadImage(f); state.mainThumbnailUrl=withTr(u,THUMB.square); setPrev('main',state.mainThumbnailUrl); say('완료',true); }
    catch(err){ console.error(err); say('메인 업로드 실패'); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });
  coverFile?.addEventListener('change',async e=>{
    const f=e.target.files?.[0]; if(!f||!isImg(f)) return;
    const local=URL.createObjectURL(f); setPrev('cover',local); bump(+1);
    try{ say('배경 업로드 중…'); const u=await uploadImage(f); state.coverImageUrl=withTr(u,THUMB.cover); setPrev('cover',state.coverImageUrl); say('완료',true); }
    catch(err){ console.error(err); say('배경 업로드 실패'); }
    finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
  });

  function drawSubs(){
    if(!subsGrid) return;
    subsGrid.innerHTML = state.subThumbnails.map((u,i)=>`
      <div class="sub">
        <img src="${u}" alt="sub-${i}">
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>`).join('');
  }
  subsGrid?.addEventListener('click',e=>{
    const b=e.target.closest('.rm'); if(!b) return;
    state.subThumbnails.splice(Number(b.dataset.i),1); drawSubs();
  });
  subsFile?.addEventListener('change',async e=>{
    const files=[...(e.target.files||[])].slice(0, Math.max(0,5-state.subThumbnails.length));
    for(const f of files){
      if(!isImg(f)) continue;
      bump(+1);
      try{ say('이미지 업로드 중…'); const u=await uploadImage(f); state.subThumbnails.push(withTr(u,THUMB.square)); drawSubs(); say('완료',true); }
      catch(err){ console.error(err); say('업로드 실패'); }
      finally{ bump(-1); }
    }
    e.target.value='';
  });

  // 프리뷰 텍스트
  nickname?.addEventListener('input',()=> nicknamePreview && (nicknamePreview.textContent = (nickname.value.trim() || '닉네임')));
  headline?.addEventListener('input',()=> headlinePreview && (headlinePreview.textContent = (headline.value.trim() || '한 줄 소개')));

  // ---------- 최근 라이브 링크 ----------
  const ytId=(u='')=>(u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)||[])[1]||'';
  const igId=(u='')=>(u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)||[])[1]||'';
  const thumb=(u='')=>{
    if(ytId(u)) return `https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg`;
    return ''; // 인스타는 섬네일 API 없음(사용자 수동)
  };

  function addLinkRow(v={title:'',url:'',date:'',role:'host'}){
    const row=document.createElement('div'); row.className='live-row';
    row.innerHTML=`
      <div class="l-prev">
        <i class="ri-gallery-line ph" aria-hidden="true"></i>
        <img alt="">
      </div>
      <div class="l-body">
        <input class="input l-title" placeholder="제목 (선택)" value="${v.title||''}">
        <div class="grid">
          <div class="with-icon" style="grid-column:1/2"><i class="ri-link-m"></i>
            <input class="input l-url" type="url" placeholder="https:// 링크" value="${v.url||''}">
          </div>
          <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
          <button class="ic rm" type="button" aria-label="삭제">✕</button>
        </div>
      </div>`;
    const urlIn=row.querySelector('.l-url');
    const img=row.querySelector('img');
    const ph=row.querySelector('.ph');
    const update=()=>{
      const u=urlIn.value.trim(); const t=thumb(u);
      if(t){ img.src=t; img.classList.add('show'); ph.style.display='none'; } else { img.classList.remove('show'); img.removeAttribute('src'); ph.style.display='block'; }
    };
    urlIn.addEventListener('input',update);
    row.querySelector('.rm').addEventListener('click',()=>row.remove());
    update();
    linksWrap.appendChild(row);
  }
  addLinkBtn?.addEventListener('click',()=>addLinkRow());
  // 최초 1개
  addLinkRow();

  // ---------- 첨부 파일 ----------
  function drawFiles(){
    if(!attachList) return;
    attachList.innerHTML = state.files.map((f,i)=>`<li>${f.name} (${Math.round(f.size/1024)}KB)</li>`).join('');
  }
  attachments?.addEventListener('change',e=>{
    state.files = Array.from(e.target.files||[]);
    drawFiles();
  });

  // ---------- 저장/발행 ----------
  function validate(pub){
    if(state.uploads>0){ say('이미지 업로드 중입니다. 잠시 후 시도'); return false; }
    if(pub){
      if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
      if(!nickname?.value.trim()){ say('닉네임을 입력해주세요'); return false; }
      if(!headline?.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
    }
    const urlFields=[primaryLink,linkYouTube,linkInstagram, ...Array.from(document.querySelectorAll('.l-url'))];
    for(const f of urlFields){
      if(f && f.value && f.value.trim() && !/^https:\/\//.test(f.value.trim())){ say('링크는 https:// 로 시작해야 합니다'); return false; }
    }
    return true;
  }

  const str=(v)=> (v && String(v).trim()) ? String(v).trim() : undefined;

  function payload(status){
    const rows=[...document.querySelectorAll('.live-row')];
    const liveLinks = rows.map(r=>({
      title:str(r.querySelector('.l-title')?.value),
      url:str(r.querySelector('.l-url')?.value),
      date:str(r.querySelector('.l-date')?.value)
    })).filter(x=>x.title||x.url||x.date);

    return {
      type:'portfolio',
      status,
      visibility: visibility?.value || 'public',
      nickname: str(nickname?.value),
      headline: str(headline?.value),
      bio: str(bio?.value),
      mainThumbnailUrl: state.mainThumbnailUrl || undefined,
      coverImageUrl: state.coverImageUrl || undefined,
      subThumbnails: state.subThumbnails.slice(0,5),
      careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
      age: age?.value ? Number(age.value) : undefined,
      // 공개여부(필요 시 서버 필드 추가 가능)
      careerPublic: !!careerPublic?.checked,
      agePublic: !!agePublic?.checked,
      region: { city: str(regionCity?.value), public: !!regionPublic?.checked },
      gender: { value: str(gender?.value), public: !!genderPublic?.checked },
      body: { height: height?.value ? Number(height.value) : undefined,
              sizeTop: str(sizeTop?.value), sizeBottom: str(sizeBottom?.value),
              shoe: str(shoe?.value), sizePublic: !!sizePublic?.checked },
      links: { primary: str(primaryLink?.value), youtube: str(linkYouTube?.value), instagram: str(linkInstagram?.value) },
      openToOffers: !!openToOffers?.checked,
      liveLinks
      // 첨부 파일은 별도 업로드 API 설계 시 전송
    };
  }

  async function submit(status){
    if(!TOKEN){ location.href='login.html?returnTo='+encodeURIComponent(location.pathname); return; }
    const pub=(status==='published'); if(!validate(pub)) return;
    try{
      say(pub?'발행 중…':'임시저장 중…');
      const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
      const method = state.id ? 'PUT' : 'POST';
      const res = await fetch(url,{method,headers:headers(true),body:JSON.stringify(payload(status))});
      const j = await res.json().catch(()=>({}));
      if(!res.ok || j.ok===false) throw new Error(j.message||`HTTP_${res.status}`);
      say(pub?'발행되었습니다':'임시저장 완료',true);
      setTimeout(()=>location.href='mypage.html',500);
    }catch(e){ console.error(e); say('저장 실패: '+(e.message||'오류')); }
  }

  $id('publishBtn')?.addEventListener('click',e=>{e.preventDefault();submit('published');});
  $id('saveDraftBtn')?.addEventListener('click',e=>{e.preventDefault();submit('draft');});

  // edit 모드
  state.id = new URLSearchParams(location.search).get('id') || '';
  if(state.id){
    (async()=>{
      try{
        say('불러오는 중…');
        const r=await fetch(`${API_BASE}/${ENTITY}/${state.id}`,{headers:headers(false)});
        const j=await r.json().catch(()=>({}));
        if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
        const d=j.data||j;

        // fill
        nickname && (nickname.value=d.nickname||'');
        headline && (headline.value=d.headline||'');
        bio && (bio.value=d.bio||'');
        careerYears && (careerYears.value=d.careerYears||'');
        age && (age.value=d.age||'');
        visibility && (visibility.value=d.visibility||'public');
        openToOffers && (openToOffers.checked=d.openToOffers!==false);

        // region/gender/body(서버 포맷 다양성 고려)
        regionCity && (regionCity.value=d.region?.city||'');
        regionPublic && (regionPublic.checked=!!d.region?.public);
        gender && (gender.value=d.gender?.value||d.gender||'');
        genderPublic && (genderPublic.checked=!!(d.gender?.public));
        height && (height.value=d.body?.height||d.demographics?.height||'');
        sizeTop && (sizeTop.value=d.body?.sizeTop||d.demographics?.sizeTop||'');
        sizeBottom && (sizeBottom.value=d.body?.sizeBottom||d.demographics?.sizeBottom||'');
        shoe && (shoe.value=d.body?.shoe||d.demographics?.shoe||'');
        sizePublic && (sizePublic.checked=!!(d.body?.sizePublic||d.demographics?.sizePublic));

        // links
        primaryLink && (primaryLink.value = d.links?.primary || d.primaryLink || '');
        linkYouTube && (linkYouTube.value = d.links?.youtube || '');
        linkInstagram && (linkInstagram.value = d.links?.instagram || '');

        // images
        state.mainThumbnailUrl=d.mainThumbnailUrl||d.mainThumbnail||'';
        state.coverImageUrl=d.coverImageUrl||d.coverImage||'';
        state.subThumbnails=Array.isArray(d.subThumbnails)?d.subThumbnails.slice(0,5):(Array.isArray(d.subImages)?d.subImages.slice(0,5):[]);
        setPrev('main',state.mainThumbnailUrl); setPrev('cover',state.coverImageUrl); drawSubs();

        nicknamePreview && (nicknamePreview.textContent = nickname.value.trim() || '닉네임');
        headlinePreview && (headlinePreview.textContent = headline.value.trim() || '한 줄 소개');

        // live links
        if(Array.isArray(d.liveLinks)){ d.liveLinks.forEach(it=> addLinkRow({title:it.title,url:it.url,date:it.date})); }

        say('로드 완료',true);
      }catch(e){ console.error(e); say('불러오기 실패: '+(e.message||'오류')); }
    })();
  }
})();