/* portfolio-new.js — v2.1.0 (shorts 제거, 공개옵션, 링크행 개선, 첨부 표시) */
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const RAW_BASE = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
  const API_BASE = (/^https?:\/\//i.test(RAW_BASE) ? RAW_BASE.replace(/\/+$/,'') : (location.origin + (RAW_BASE.startsWith('/')?RAW_BASE:'/'+RAW_BASE))).replace(/\/+$/,'');
  const ENTITY = 'portfolio-test';
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  const $id = (s) => document.getElementById(s);
  const say = (t, ok = false) => { const el = $id('pfMsg'); if (!el) return; el.textContent = t; el.classList.add('show'); el.classList.toggle('ok', ok); };

  const headers = (json = true) => { const h = { Accept: 'application/json' }; if (json) h['Content-Type'] = 'application/json'; if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`; return h; };

  const ytId = (u = '') => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/) || [])[1] || '';
  const igId = (u = '') => (u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/) || [])[1] || '';
  const detect = (u='') => /youtu\.?be|youtube\.com/.test(u) ? 'yt' : (/instagram\.com/.test(u) ? 'ig' : '');
  const ytThumb = (u) => ytId(u) ? `https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg` : '';

  const withTransform = (url, t) => { try { if (!url || !/\/upload\//.test(url)) return url || ''; const i = url.indexOf('/upload/'); return url.slice(0, i + 8) + t + '/' + url.slice(i + 8); } catch { return url; } };
  const THUMB = { square: 'c_fill,g_auto,w_600,h_600,f_auto,q_auto', cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto' };

  const state = { id:'', mainThumbnailUrl:'', coverImageUrl:'', subThumbnails:[], pending:0, attachments:[] };
  const bump = (n)=>{ state.pending=Math.max(0, state.pending+n); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();

  async function init(){
    // el refs
    const mainFile=$id('mainFile'), coverFile=$id('coverFile'), subsFile=$id('subsFile');
    const mainTrig=$id('mainTrigger'), coverTrig=$id('coverTrigger'), subsTrig=$id('subsTrigger');
    const mainPrev=$id('mainPrev'), coverPrev=$id('coverPrev'), subsGrid=$id('subsGrid');
    const nickname=$id('nickname'), headline=$id('headline'), bio=$id('bio');
    const careerYears=$id('careerYears'), age=$id('age');
    const regionCity=$id('regionCity'), gender=$id('gender'), height=$id('height'), sizeTop=$id('sizeTop'), sizeBottom=$id('sizeBottom'), shoe=$id('shoe');
    const primaryLink=$id('primaryLink'), linkInstagram=$id('linkInstagram'), linkYouTube=$id('linkYouTube');
    const visibility=$id('visibility'), openToOffers=$id('openToOffers');
    const careerPublic=$id('careerPublic'), agePublic=$id('agePublic'), regionPublic=$id('regionPublic'), genderPublic=$id('genderPublic'), sizePublic=$id('sizePublic');

    const linksWrap=$id('linksWrap'), addLinkBtn=$id('addLinkBtn');
    const attachInp=$id('attachments'), attachList=$id('attachList');
    const nicknamePreview=$id('nicknamePreview'), headlinePreview=$id('headlinePreview');

    // textarea autogrow
    const autoGrow = (el)=>{ if(!el) return; el.style.height='auto'; el.style.height=Math.min(800, Math.max(180, el.scrollHeight))+'px'; };
    bio && (bio.addEventListener('input', ()=>autoGrow(bio)), setTimeout(()=>autoGrow(bio),0));

    // triggers
    mainTrig && mainTrig.addEventListener('click', e=>{ e.preventDefault(); mainFile?.click(); });
    coverTrig && coverTrig.addEventListener('click', e=>{ e.preventDefault(); coverFile?.click(); });
    subsTrig && subsTrig.addEventListener('click', e=>{ e.preventDefault(); subsFile?.click(); });

    // cloudinary signature
    async function getSignature(){ const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) }); const j=await r.json().catch(()=>({})); if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`); return j.data||j; }
    async function uploadImage(file){ const { cloudName, apiKey, timestamp, signature } = await getSignature(); const fd = new FormData(); fd.append('file', file); fd.append('api_key', apiKey); fd.append('timestamp', timestamp); fd.append('signature', signature); const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd }); const j=await res.json().catch(()=>({})); if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`); return j.secure_url; }
    const isImgOk = (f)=>{ if(!/^image\//.test(f.type)) { say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

    function setPreview(kind, url){ if(!url) return; if(kind==='main'){ mainPrev.src=url; mainPrev.style.display='block'; mainTrig?.classList.remove('is-empty'); } if(kind==='cover'){ coverPrev.src=url; coverPrev.style.display='block'; coverTrig?.classList.remove('is-empty'); } }
    mainFile && mainFile.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); setPreview('main', local); bump(+1);
      try{ say('메인 이미지 업로드 중…'); const url=await uploadImage(f); state.mainThumbnailUrl=withTransform(url, THUMB.square); setPreview('main', state.mainThumbnailUrl); say('업로드 완료', true); }
      catch(err){ console.error(err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });
    coverFile && coverFile.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); setPreview('cover', local); bump(+1);
      try{ say('배경 이미지 업로드 중…'); const url=await uploadImage(f); state.coverImageUrl=withTransform(url, THUMB.cover169); setPreview('cover', state.coverImageUrl); say('업로드 완료', true); }
      catch(err){ console.error(err); say('업로드 실패: '+(err.message||'오류')); }
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
    subsGrid && subsGrid.addEventListener('click', e=>{
      const btn=e.target.closest('.rm'); if(!btn) return;
      state.subThumbnails.splice(Number(btn.dataset.i),1); drawSubs();
    });
    subsFile && subsFile.addEventListener('change', async e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      const remain=Math.max(0, 5 - state.subThumbnails.length);
      for(const f of files.slice(0, remain)){
        if(!isImgOk(f)) continue; bump(+1);
        try{ say('이미지 업로드 중…'); const url=await uploadImage(f); state.subThumbnails.push(withTransform(url, THUMB.square)); drawSubs(); say('업로드 완료', true); }
        catch(err){ console.error(err); say('업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });

    // 이름/헤드라인 미리보기
    nickname && nickname.addEventListener('input', ()=> nicknamePreview && (nicknamePreview.textContent = nickname.value.trim() || '닉네임'));
    headline && headline.addEventListener('input', ()=> headlinePreview && (headlinePreview.textContent = headline.value.trim() || '한 줄 소개'));

    // 링크 행
    function addLinkRow(v = { title:'', url:'', date:'', role:'host' }){
      if(!linksWrap) return;
      const row=document.createElement('div'); row.className='live-row';
      row.innerHTML = `
        <div class="l-prev"><i class="ri-image-line"></i><img alt=""></div>
        <div class="l-body">
          <input class="input l-title" placeholder="제목 (선택)" value="${v.title||''}">
          <div class="grid">
            <input class="input l-url" type="url" placeholder="https:// 링크 붙여넣기" value="${v.url||''}">
            <select class="input l-role">
              <option value="host" ${v.role==='host'?'selected':''}>진행</option>
              <option value="guest" ${v.role==='guest'?'selected':''}>게스트</option>
            </select>
            <div class="date-ic"><i class="ri-calendar-line"></i><input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}"></div>
            <button class="ic rm" type="button" aria-label="삭제">✕</button>
          </div>
        </div>`;
      linksWrap.appendChild(row);
      const u=row.querySelector('.l-url'); const img=row.querySelector('.l-prev img'); const ic=row.querySelector('.l-prev i');
      const updatePrev = ()=>{
        const val=(u.value||'').trim();
        const p=detect(val);
        const src = p==='yt' ? ytThumb(val) : (p==='ig' ? '' : '');
        if(src){ img.src=src; img.style.display='block'; ic.style.display='none'; }
        else { img.src=''; img.style.display='none'; ic.style.display='block'; }
      };
      u.addEventListener('input', updatePrev);
      row.querySelector('.rm').addEventListener('click', ()=>row.remove());
      updatePrev();
    }
    addLinkBtn && addLinkBtn.addEventListener('click', ()=> addLinkRow());
    addLinkRow();

    // 첨부 표시(이름만). 실제 업로드는 별도 API 필요 지점.
    attachInp && attachInp.addEventListener('change', (e)=>{
      const files=Array.from(e.target.files||[]);
      state.attachments = files.map(f=>({ name:f.name, size:f.size, type:f.type }));
      if(attachList) attachList.innerHTML = state.attachments.map(a=>`<li>${a.name}</li>`).join('');
    });

    // 검증 & 페이로드
    const strOrU = (v)=> (v && String(v).trim()) ? String(v).trim() : undefined;
    function validate(pub){
      if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 시도해주세요.'); return false; }
      if(pub){
        if(!state.mainThumbnailUrl){ say('메인 썸네일을 업로드해주세요'); return false; }
        if(!nickname?.value.trim()){ say('닉네임을 입력해주세요'); return false; }
        if(!headline?.value.trim()){ say('한 줄 소개를 입력해주세요'); return false; }
      }
      const rows=Array.from(linksWrap?.querySelectorAll('.live-row')||[]);
      for(const r of rows){
        const u=r.querySelector('.l-url')?.value.trim();
        if(u && !/^https:\/\//.test(u)){ say('라이브 URL은 https:// 로 시작'); return false; }
      }
      for (const el of [primaryLink, linkYouTube, linkInstagram]) {
        const v = el?.value?.trim(); if (v && !/^https:\/\//.test(v)) { say('링크는 https:// 로 시작'); return false; }
      }
      return true;
    }

    function collectPayload(status){
      const rows=Array.from(linksWrap?.querySelectorAll('.live-row')||[]);
      const links=rows.map(r=>({
        title: strOrU(r.querySelector('.l-title')?.value),
        url: strOrU(r.querySelector('.l-url')?.value),
        role: r.querySelector('.l-role')?.value || 'host',
        date: strOrU(r.querySelector('.l-date')?.value)
      })).filter(x=>x.title || x.url);

      // 날짜 최신순 정렬
      links.sort((a,b)=> String(b.date||'').localeCompare(String(a.date||'')));

      const region = { city: strOrU(regionCity?.value), country:'KR', public: !!regionPublic?.checked };
      const demographics = {
        gender: strOrU(gender?.value),
        genderPublic: !!genderPublic?.checked,
        height: height?.value ? Number(height.value) : undefined,
        sizeTop: strOrU(sizeTop?.value),
        sizeBottom: strOrU(sizeBottom?.value),
        shoe: strOrU(shoe?.value),
        sizePublic: !!sizePublic?.checked,
        careerPublic: !!careerPublic?.checked
      };

      return {
        type:'portfolio',
        status,
        visibility: visibility?.value || 'public',
        nickname: strOrU(nickname?.value),
        headline: strOrU(headline?.value),
        bio: strOrU(bio?.value),
        mainThumbnailUrl: state.mainThumbnailUrl || undefined,
        coverImageUrl: state.coverImageUrl || undefined,
        subThumbnails: state.subThumbnails.filter(Boolean),
        careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
        age: age?.value ? Number(age.value) : undefined,
        agePublic: !!agePublic?.checked,
        openToOffers: !!openToOffers?.checked,
        primaryLink: strOrU(primaryLink?.value),
        links: { instagram: strOrU(linkInstagram?.value), youtube: strOrU(linkYouTube?.value) },
        liveLinks: links,
        region, demographics
        // attachments: state.attachments  // ← 서버 업로드 연동 시 필드 정의 후 활성화
      };
    }

    async function submit(status){
      if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
      const pub=(status==='published');
      if(!validate(pub)) return;

      try{
        say(pub?'발행 중…':'임시저장 중…');
        const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(collectPayload(status)) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || data.ok===false) throw new Error((data && (data.message || data.code)) || `HTTP_${res.status}`);
        say(pub?'발행되었습니다':'임시저장 완료', true);
        setTimeout(()=> location.href='mypage.html', 450);
      }catch(err){ console.error(err); say('저장 실패: '+(err.message||'네트워크 오류')); }
    }

    window.submit = submit;
    $id('publishBtn')?.addEventListener('click', e=>{ e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', e=>{ e.preventDefault(); submit('draft'); });

    // edit mode
    state.id = new URLSearchParams(location.search).get('id') || '';
    if(state.id){
      try{
        say('불러오는 중…');
        const r = await fetch(`${API_BASE}/${ENTITY}/${state.id}`, { headers: headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
        const d = j.data || j;

        nickname && (nickname.value = d.nickname || '');
        headline && (headline.value = d.headline || '');
        bio && (bio.value = d.bio || '');
        careerYears && (careerYears.value = d.careerYears || '');
        age && (age.value = d.age || '');
        visibility && (visibility.value = d.visibility || 'public');
        openToOffers && (openToOffers.checked = d.openToOffers !== false);

        regionCity && (regionCity.value = d.region?.city || '');
        gender && (gender.value = d.demographics?.gender || '');
        height && (height.value = d.demographics?.height || '');
        sizeTop && (sizeTop.value = d.demographics?.sizeTop || '');
        sizeBottom && (sizeBottom.value = d.demographics?.sizeBottom || '');
        shoe && (shoe.value = d.demographics?.shoe || '');

        agePublic && (agePublic.checked = !!d.agePublic);
        sizePublic && (sizePublic.checked = !!d.demographics?.sizePublic);

        primaryLink && (primaryLink.value = d.primaryLink || '');
        linkInstagram && (linkInstagram.value = d.links?.instagram || '');
        linkYouTube && (linkYouTube.value = d.links?.youtube || '');

        state.mainThumbnailUrl = d.mainThumbnailUrl || '';
        state.coverImageUrl = d.coverImageUrl || '';
        state.subThumbnails = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0,5) : [];

        setPreview('main', state.mainThumbnailUrl);
        setPreview('cover', state.coverImageUrl);
        drawSubs();

        nicknamePreview && (nicknamePreview.textContent = nickname.value.trim() || '닉네임');
        headlinePreview && (headlinePreview.textContent = headline.value.trim() || '한 줄 소개');
        bio && autoGrow(bio);

        // liveLinks 로드
        if (Array.isArray(d.liveLinks)) {
          linksWrap.innerHTML = '';
          d.liveLinks.forEach(x => addLinkRow(x));
        }

        say('로드 완료', true);
      }catch(err){ console.error(err); say('불러오기 실패: '+(err.message||'오류')); }
    }
  }
})();