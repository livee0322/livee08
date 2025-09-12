byhen-admin.page.js — v2.0 (Cloudinary uploads + pricing/availability/FAQ/shorts)
   - 포트폴리오 등록 페이지(v2) 구조/패턴을 그대로 따릅니다.
   - Cloudinary 서명: /api/v1/uploads/signature
   - 엔드포인트(변경 가능): CFG.endpoints.byhen || '/byhen-test'
*/
(function () {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const EP = CFG.endpoints || {};
  const ENTITY = EP.byhen || '/byhen-test';
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here  = encodeURIComponent(location.pathname + location.search + location.hash);

  // 이미지 변환 preset (Cloudinary)
  const THUMB = {
    square:   'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169: 'c_fill,g_auto,w_1600,h_900,f_auto,q_auto',
    gallery:  'c_fill,g_auto,w_800,h_800,f_auto,q_auto',
    logo:     'c_fill,g_auto,w_512,h_512,f_auto,q_auto',
  };

  // -------- helpers --------
  const $   = (s, el=document)=>el.querySelector(s);
  const on  = (el, ev, fn)=>el && el.addEventListener(ev, fn);
  const $id = (s)=>document.getElementById(s);

  const say = (t, ok=false)=>{ const el=$id('bhMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };

  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8); }catch{ return url; } };
  const money = (n)=>Number(n||0).toLocaleString('ko-KR');

  // provider utils (shorts 미리보기)
  const ytId=(u='')=>(u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)||[])[1]||'';
  const igId=(u='')=>(u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)||[])[1]||'';
  const tkId=(u='')=>(u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)||[])[1]||'';
  const detectProvider=(url='')=>/youtu\.?be|youtube\.com/.test(url)?'youtube':/instagram\.com/.test(url)?'instagram':/tiktok\.com/.test(url)?'tiktok':'etc';
  const embedUrl=(p,u)=>p==='youtube'?(ytId(u)?`https://www.youtube.com/embed/${ytId(u)}`:'')
                       :p==='instagram'?(igId(u)?`https://www.instagram.com/reel/${igId(u)}/embed`:'')
                       :p==='tiktok'?(tkId(u)?`https://www.tiktok.com/embed/v2/${tkId(u)}`:''):'';
  const thumbUrl=(p,u)=>p==='youtube'&&ytId(u)?`https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg`: '';

  // -------- state --------
  const state = {
    id:'',
    heroImageUrl:'',
    logoUrl:'',
    studioPhotos:[],
    portfolioPhotos:[],
    pricing:[],               // [{name, price, duration, includes[], options[]}]
    availability:{ leadDays:0, timeslots:[], booked:[], closed:[] },
    faq:[],                   // [{q,a}]
    policy:'',
    shortsLinks:[],           // [{sourceUrl, provider, embedUrl, thumbnailUrl}]
    pending:0
  };
  const bump=(n)=>{ state.pending=Math.max(0, state.pending+n); };

  // -------- Cloudinary upload (포트폴리오 페이지와 동일 패턴) --------
  async function getSignature(){
    const r=await fetch(`${API_BASE}/uploads/signature`, { headers:headers(false) });
    const j=await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd=new FormData();
    fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
    const j=await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return j.secure_url;
  }
  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

  // -------- UI binds --------
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  async function init(){
    // basics
    const name=$id('bhName'), tagline=$id('bhTagline'), locationEl=$id('bhLocation'), hours=$id('bhHours');
    const phone=$id('bhPhone'), kakao=$id('bhKakao'), website=$id('bhWebsite'), mapUrl=$id('bhMapUrl');

    // hero/logo (싱글)
    const heroTrig=$id('heroTrigger'), heroFile=$id('heroFile'), heroPrev=$id('heroPrev');
    const logoTrig=$id('logoTrigger'), logoFile=$id('logoFile'), logoPrev=$id('logoPrev');

    // galleries (멀티)
    const studioTrig=$id('studioTrigger'), studioFile=$id('studioFile'), studioGrid=$id('studioGrid');
    const pfTrig=$id('pfTrigger'), pfFile=$id('pfFile'), pfGrid=$id('pfGrid');

    // pricing
    const pricingWrap=$id('pricingWrap'), addPlanBtn=$id('addPlanBtn');

    // availability
    const leadDays=$id('leadDays'), timeslots=$id('timeslots');
    const bookedWrap=$id('bookedWrap'), addBookedBtn=$id('addBookedBtn');
    const closedWrap=$id('closedWrap'), addClosedBtn=$id('addClosedBtn');

    // FAQ / policy
    const faqWrap=$id('faqWrap'), addFaqBtn=$id('addFaqBtn');
    const policy=$id('policy');

    // shorts (링크 붙여넣기형)
    const shortsWrap=$id('shortsWrap'), addShortBtn=$id('addShortBtn');

    // actions
    const saveBtn=$id('saveDraftBtn'), pubBtn=$id('publishBtn');

    // ---- triggers ----
    heroTrig?.addEventListener('click',()=>heroFile?.click());
    logoTrig?.addEventListener('click',()=>logoFile?.click());
    studioTrig?.addEventListener('click',()=>studioFile?.click());
    pfTrig?.addEventListener('click',()=>pfFile?.click());

    // ---- single uploads (성공 시 미리보기 교체) ----
    heroFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); heroPrev.src=local; heroTrig?.classList.remove('is-empty'); bump(+1);
      try{ say('배경 이미지 업로드 중…'); const url=await uploadImage(f); state.heroImageUrl=withTransform(url,THUMB.cover169); heroPrev.src=state.heroImageUrl; say('업로드 완료',true); }
      catch(err){ console.error('[hero upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    logoFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); logoPrev.src=local; logoTrig?.classList.remove('is-empty'); bump(+1);
      try{ say('로고 업로드 중…'); const url=await uploadImage(f); state.logoUrl=withTransform(url,THUMB.logo); logoPrev.src=state.logoUrl; say('업로드 완료',true); }
      catch(err){ console.error('[logo upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    // ---- multi uploads (플레이스홀더 → 성공 시 썸네일 삽입) ----
    function drawGrid(gridEl, arr){
      gridEl.innerHTML = arr.map((u,i)=>`
        <div class="sub">
          <img src="${u}" alt="img-${i}">
          <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
        </div>`).join('') || '<div class="note">이미지를 추가하세요</div>';
    }
    studioGrid?.addEventListener('click', e=>{
      const btn=e.target.closest('.rm'); if(!btn) return;
      state.studioPhotos.splice(Number(btn.dataset.i),1);
      drawGrid(studioGrid, state.studioPhotos);
    });
    pfGrid?.addEventListener('click', e=>{
      const btn=e.target.closest('.rm'); if(!btn) return;
      state.portfolioPhotos.splice(Number(btn.dataset.i),1);
      drawGrid(pfGrid, state.portfolioPhotos);
    });

    studioFile?.addEventListener('change', async e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      for(const f of files){
        if(!isImgOk(f)) continue;
        bump(+1); try{
          say('스튜디오 이미지 업로드 중…');
          const url=withTransform(await uploadImage(f), THUMB.gallery);
          state.studioPhotos.push(url);
          drawGrid(studioGrid, state.studioPhotos); say('업로드 완료',true);
        }catch(err){ console.error('[studio upload]',err); say('업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });

    pfFile?.addEventListener('change', async e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      for(const f of files){
        if(!isImgOk(f)) continue;
        bump(+1); try{
          say('포트폴리오 이미지 업로드 중…');
          const url=withTransform(await uploadImage(f), THUMB.gallery);
          state.portfolioPhotos.push(url);
          drawGrid(pfGrid, state.portfolioPhotos); say('업로드 완료',true);
        }catch(err){ console.error('[pf upload]',err); say('업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });

    // ---- pricing rows ----
    function addPlanRow(p={name:'', price:'', duration:'', includes:[], options:[] }){
      const row=document.createElement('div'); row.className='plan-row';
      row.innerHTML = `
        <div class="grid">
          <input class="input p-name" placeholder="상품명" value="${p.name||''}">
          <input class="input p-price" type="number" min="0" placeholder="가격(원)" value="${p.price||''}">
          <input class="input p-dur" placeholder="소요시간 예: 2시간" value="${p.duration||''}">
          <button type="button" class="ic rm" aria-label="삭제">✕</button>
        </div>
        <div class="grid">
          <input class="input p-inc" placeholder="포함사항(쉼표 구분)" value="${(p.includes||[]).join(', ')}">
          <input class="input p-opt" placeholder="옵션: 이름+금액 쉼표 구분(예: 추가컷+30000, 헤어+50000)" value="${(p.options||[]).map(o=>`${o.name}+${o.price||0}`).join(', ')}">
        </div>`;
      pricingWrap.appendChild(row);
      on(row.querySelector('.rm'),'click',()=>row.remove());
    }
    addPlanBtn?.addEventListener('click',()=>addPlanRow());

    function collectPlans(){
      const rows=[...pricingWrap?.querySelectorAll('.plan-row')||[]];
      return rows.map(r=>{
        const name=r.querySelector('.p-name')?.value?.trim()||'';
        const price=Number(r.querySelector('.p-price')?.value||0);
        const duration=r.querySelector('.p-dur')?.value?.trim()||'';
        const includes=(r.querySelector('.p-inc')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const optRaw=(r.querySelector('.p-opt')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const options=optRaw.map(s=>{
          const m=s.split('+'); return { name:(m[0]||'').trim(), price:Number(m[1]||0) };
        }).filter(o=>o.name);
        return { name, price, duration, includes, options };
      }).filter(p=>p.name);
    }

    // ---- availability (timeslots, booked/closed dates) ----
    function addDateRow(wrap, val=''){
      const row=document.createElement('div'); row.className='date-row';
      row.innerHTML = `<input type="date" class="input d" value="${val?String(val).slice(0,10):''}">
                       <button type="button" class="ic rm" aria-label="삭제">✕</button>`;
      wrap.appendChild(row);
      on(row.querySelector('.rm'),'click',()=>row.remove());
    }
    addBookedBtn?.addEventListener('click',()=>addDateRow(bookedWrap));
    addClosedBtn?.addEventListener('click',()=>addDateRow(closedWrap));

    function collectDates(wrap){ return [...wrap?.querySelectorAll('.d')||[]].map(i=>i.value).filter(Boolean); }
    function parseSlots(){ return (timeslots?.value||'').split(',').map(s=>s.trim()).filter(Boolean); }

    // ---- FAQ ----
    function addFaqRow(f={q:'',a:''}){
      const row=document.createElement('div'); row.className='faq-row';
      row.innerHTML = `
        <input class="input f-q" placeholder="질문" value="${f.q||''}">
        <textarea class="input f-a" rows="3" placeholder="답변">${f.a||''}</textarea>
        <div class="row-end"><button type="button" class="ic rm" aria-label="삭제">✕</button></div>`;
      faqWrap.appendChild(row);
      on(row.querySelector('.rm'),'click',()=>row.remove());
    }
    addFaqBtn?.addEventListener('click',()=>addFaqRow());

    function collectFaq(){
      const rows=[...faqWrap?.querySelectorAll('.faq-row')||[]];
      return rows.map(r=>{
        const q=r.querySelector('.f-q')?.value?.trim()||'';
        const a=r.querySelector('.f-a')?.value?.trim()||'';
        return { q, a };
      }).filter(x=>x.q && x.a);
    }

    // ---- Shorts(링크) ----
    function addShortRow(v={sourceUrl:''}){
      const row=document.createElement('div'); row.className='short-row';
      row.innerHTML = `
        <div class="l-prev"><img alt=""></div>
        <div class="l-body">
          <input class="input s-url" type="url" placeholder="YouTube/Instagram/TikTok 링크 붙여넣기" value="${v.sourceUrl||''}">
          <button class="ic rm" type="button" aria-label="삭제">✕</button>
        </div>`;
      shortsWrap.appendChild(row);

      const urlIn=row.querySelector('.s-url');
      const img=row.querySelector('.l-prev img');

      const update=()=>{
        const url=(urlIn.value||'').trim();
        const p=detectProvider(url);
        img.src = url ? (thumbUrl(p,url)||'') : '';
        row.dataset.embed = url ? embedUrl(p,url) : '';
        row.dataset.provider = p;
      };
      on(urlIn,'input', update);
      on(row.querySelector('.rm'),'click',()=>row.remove());
      update();
    }
    addShortBtn?.addEventListener('click',()=>addShortRow());

    function collectShorts(){
      const rows=[...shortsWrap?.querySelectorAll('.short-row')||[]];
      return rows.map(r=>{
        const sourceUrl = r.querySelector('.s-url')?.value?.trim()||'';
        const provider = r.dataset.provider || detectProvider(sourceUrl);
        const embed = r.dataset.embed || embedUrl(provider, sourceUrl);
        const thumb = thumbUrl(provider, sourceUrl);
        return { sourceUrl, provider, embedUrl:embed, thumbnailUrl:thumb };
      }).filter(s=>s.sourceUrl && s.embedUrl);
    }

    // ---- load (수정 모드) ----
    state.id = new URLSearchParams(location.search).get('id') || '';
    await loadExisting();

    async function loadExisting(){
      try{
        say('불러오는 중…');

        let data=null;
        if(state.id){
          // 지정 id
          const r=await fetch(`${API_BASE}${ENTITY}/${state.id}`, { headers:headers(false) });
          const j=await r.json().catch(()=>({}));
          if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
          data=j.data||j;
        }else{
          // slug/byhen 또는 첫 문서
          let r=await fetch(`${API_BASE}${ENTITY}?slug=byhen&limit=1`, { headers:headers(false) });
          let j=await r.json().catch(()=>({}));
          if(r.ok){
            const items = j.items||j.data||j.docs||[];
            if(Array.isArray(items) && items.length){ data=items[0]; state.id=data.id||data._id||''; }
          }
          if(!data){
            r=await fetch(`${API_BASE}${ENTITY}?limit=1`, { headers:headers(false) });
            j=await r.json().catch(()=>({}));
            const items=j.items||j.data||j.docs||[];
            if(Array.isArray(items) && items.length){ data=items[0]; state.id=data.id||data._id||''; }
          }
        }

        if(!data){ say('새 페이지 작성 중', true); return; }

        // 기본
        name && (name.value = data.name||'');
        tagline && (tagline.value = data.tagline||'');
        locationEl && (locationEl.value = data.location||'');
        hours && (hours.value = data.hours||'');

        phone && (phone.value = data.contact?.phone || '');
        kakao && (kakao.value = data.contact?.kakaoUrl || '');
        website && (website.value = data.links?.website || '');
        mapUrl && (mapUrl.value = data.links?.map || '');

        // hero/logo
        state.heroImageUrl = data.hero?.image || '';
        state.logoUrl      = data.hero?.logo || '';
        if(state.heroImageUrl){ heroPrev.src = state.heroImageUrl; heroTrig?.classList.remove('is-empty'); }
        if(state.logoUrl){ logoPrev.src = state.logoUrl; logoTrig?.classList.remove('is-empty'); }

        // galleries
        state.studioPhotos = Array.isArray(data.studioPhotos)? data.studioPhotos.slice(0,60):[];
        state.portfolioPhotos = Array.isArray(data.portfolioPhotos)? data.portfolioPhotos.slice(0,120):[];
        drawGrid(studioGrid, state.studioPhotos);
        drawGrid(pfGrid, state.portfolioPhotos);

        // pricing
        (Array.isArray(data.pricing)?data.pricing:[]).forEach(addPlanRow);

        // availability
        leadDays && (leadDays.value = data.availability?.leadDays ?? 0);
        timeslots && (timeslots.value = (data.availability?.timeslots||[]).join(', '));
        (data.availability?.booked||[]).forEach(d=>addDateRow(bookedWrap,d));
        (data.availability?.closed||[]).forEach(d=>addDateRow(closedWrap,d));

        // faq / policy
        (Array.isArray(data.faq)?data.faq:[]).forEach(addFaqRow);
        policy && (policy.value = data.policy || '');

        // shorts
        (Array.isArray(data.shorts)?data.shorts:[]).forEach(s=>addShortRow({sourceUrl: s.sourceUrl || ''}));

        say('로드 완료', true);
      }catch(err){
        console.error('[byhen load]', err);
        say('불러오기 실패: '+(err.message||'오류'));
      }
    }

    // ---- validate & payload ----
    function validate(pub){
      if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
      if(pub){
        if(!($id('bhName')?.value||'').trim()){ say('브랜드명을 입력해주세요'); return false; }
        if(!state.heroImageUrl){ say('배경 이미지를 업로드해주세요'); return false; }
      }
      if(website?.value && website.value.trim() && !/^https?:\/\//.test(website.value.trim())){ say('웹사이트는 http(s):// 로 시작'); return false; }
      if(kakao?.value && kakao.value.trim() && !/^https?:\/\//.test(kakao.value.trim())){ say('카카오 URL은 http(s):// 로 시작'); return false; }
      if(mapUrl?.value && mapUrl.value.trim() && !/^https?:\/\//.test(mapUrl.value.trim())){ say('지도 URL은 http(s):// 로 시작'); return false; }
      return true;
    }

    function collectPayload(status){
      const contact = { phone: (phone?.value||'').trim() || undefined, kakaoUrl: (kakao?.value||'').trim() || undefined };
      const links   = { website: (website?.value||'').trim() || undefined, map: (mapUrl?.value||'').trim() || undefined };
      const pricing = collectPlans();
      const availability = {
        leadDays: Number(leadDays?.value||0),
        timeslots: parseSlots(),
        booked: collectDates(bookedWrap),
        closed: collectDates(closedWrap)
      };
      const shorts = collectShorts();

      return {
        slug:'byhen',
        type:'brand',
        status,
        name: (name?.value||'').trim() || undefined,
        tagline: (tagline?.value||'').trim() || undefined,
        location: (locationEl?.value||'').trim() || undefined,
        hours: (hours?.value||'').trim() || undefined,
        hero: { image: state.heroImageUrl || undefined, logo: state.logoUrl || undefined },
        contact, links,
        studioPhotos: state.studioPhotos,
        portfolioPhotos: state.portfolioPhotos,
        pricing, availability,
        faq: collectFaq(),
        policy: (policy?.value||'').trim() || '',
        shorts
      };
    }

    function formatServerError(data){
      try{
        const first=(Array.isArray(data?.details)&&data.details[0])||(Array.isArray(data?.errors)&&data.errors[0]);
        if(first){ const f=first.param||first.path||''; return `[${f}] ${first.msg||'invalid'}`; }
        return data?.message || '유효성 오류';
      }catch{ return '유효성 오류'; }
    }

    async function submit(status){
      if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
      const pub=(status==='published');
      if(!validate(pub)) return;
      try{
        say(pub?'발행 중…':'임시저장 중…');
        const url = state.id ? `${API_BASE}${ENTITY}/${state.id}` : `${API_BASE}${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(collectPayload(status)) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || data.ok===false) throw new Error(formatServerError(data) || `HTTP_${res.status}`);
        say(pub?'발행되었습니다':'임시저장 완료', true);
        setTimeout(()=>location.href='byhen.html', 500);
      }catch(err){
        console.error('[byhen save]', err);
        say('저장 실패: '+(err.message||'네트워크 오류'));
      }
    }

    // ---- buttons ----
    on(saveBtn,'click', e=>{ e.preventDefault(); submit('draft'); });
    on(pubBtn,'click',  e=>{ e.preventDefault(); submit('published'); });

    // 디버그
    window.BYHEN_ADMIN = { state, submit };
  }
})();