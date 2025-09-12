/* byhen-admin.page.js — v2.1
   - HTML(id)와 완전 정합
   - Cloudinary 업로드 + 미리보기
   - 가격/예약/갤러리/FAQ/숏폼 관리
   - 엔드포인트: CFG.endpoints.byhen || '/byhen-test'
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
    gallery:  'c_fill,g_auto,w_1000,h_1000,f_auto,q_auto',
    logo:     'c_fill,g_auto,w_512,h_512,f_auto,q_auto',
  };

  // -------- helpers --------
  const $id = (s)=>document.getElementById(s);
  const on  = (el, ev, fn)=>el && el.addEventListener(ev, fn);
  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8); }catch{ return url; } };
  const say = (t, ok=false)=>{ const el=$id('adMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  const money = (n)=>Number(n||0).toLocaleString('ko-KR');

  // Shorts utils
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
    // hero/logo
    heroImageUrl:'',
    logoUrl:'',
    // galleries
    studioPhotos:[],
    portfolioPhotos:[],
    // pricing
    pricing:[],               // [{name, price, duration, includes[], options[]}]
    // availability
    availability:{ leadDays:0, timeslots:[], booked:[], closed:[] },
    // faq/policy
    faq:[],                   // [{q,a}]
    policy:'',
    // shorts
    shorts:[],                // [{sourceUrl, provider, embedUrl, thumbnailUrl}]
    pending:0
  };
  const bump=(n)=>{ state.pending=Math.max(0, state.pending+n); };

  // -------- Cloudinary upload --------
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
    const elName=$id('name'), elSlug=$id('slug'), elTagline=$id('tagline'), elLocation=$id('location'), elHours=$id('hours');
    const elPhone=$id('phone'), elKakao=$id('kakaoUrl'), elEmail=$id('email');

    // hero/logo (URL inputs + upload)
    const elHeroURL=$id('heroImage'), elLogoURL=$id('heroLogo');
    const upHero=$id('upHeroImage'), upLogo=$id('upHeroLogo');
    const fileHero=$id('fileHeroImage'), fileLogo=$id('fileHeroLogo');
    const prevHero=$id('prevHeroImage'), prevLogo=$id('prevHeroLogo');

    // pricing
    const plans=$id('plans'), addPlan=$id('addPlan');

    // availability
    const elLeadDays=$id('leadDays'), elTimeslots=$id('timeslots');
    const elBooked=$id('booked'), elClosed=$id('closed');

    // galleries
    const taStudio=$id('studioPhotos'), taPortfolio=$id('portfolioPhotos');
    const upStudio=$id('upStudio'), upPortfolio=$id('upPortfolio');
    const fileStudio=$id('fileStudio'), filePortfolio=$id('filePortfolio');

    // shorts
    const shortsList=$id('shortsList'), shortUrl=$id('shortUrl'), addShort=$id('addShort');

    // faq / policy
    const faqList=$id('faqList'), addFaq=$id('addFaq'), elPolicy=$id('policy');

    // actions
    const btnSave=$id('adSave');

    // ---- hero/logo: URL 입력 시 미리보기 ----
    on(elHeroURL,'input', ()=>{ state.heroImageUrl = elHeroURL.value.trim(); prevHero.src = state.heroImageUrl || ''; });
    on(elLogoURL,'input', ()=>{ state.logoUrl = elLogoURL.value.trim(); prevLogo.src = state.logoUrl || ''; });

    // ---- hero/logo: 업로드 → URL 세팅 + 미리보기 ----
    on(upHero,'click', ()=>fileHero?.click());
    on(upLogo,'click', ()=>fileLogo?.click());

    on(fileHero,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); prevHero.src=local; bump(+1);
      try{ say('배경 업로드 중…'); const url=withTransform(await uploadImage(f), THUMB.cover169);
        state.heroImageUrl=url; elHeroURL.value=url; prevHero.src=url; say('업로드 완료',true);
      }catch(err){ console.error('[hero upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    on(fileLogo,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); prevLogo.src=local; bump(+1);
      try{ say('로고 업로드 중…'); const url=withTransform(await uploadImage(f), THUMB.logo);
        state.logoUrl=url; elLogoURL.value=url; prevLogo.src=url; say('업로드 완료',true);
      }catch(err){ console.error('[logo upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); bump(-1); e.target.value=''; }
    });

    // ---- pricing ----
    function renderPlans(){
      plans.innerHTML = state.pricing.map((p,i)=>`
        <div class="plan-row" data-i="${i}">
          <div class="grid">
            <input class="input p-name" placeholder="상품명" value="${p.name||''}">
            <input class="input p-price" type="number" min="0" placeholder="가격(원)" value="${p.price||''}">
            <input class="input p-dur" placeholder="소요시간 예: 2시간" value="${p.duration||''}">
            <button type="button" class="ic rm">✕</button>
          </div>
          <div class="grid">
            <input class="input p-inc" placeholder="포함사항(쉼표 구분)" value="${(p.includes||[]).join(', ')}">
            <input class="input p-opt" placeholder="옵션: 이름+금액 (쉼표 구분)" value="${(p.options||[]).map(o=>`${o.name}+${o.price||0}`).join(', ')}">
          </div>
        </div>
      `).join('') || '<div class="note">패키지를 추가하세요</div>';
    }
    function addPlanRow(p={name:'', price:'', duration:'', includes:[], options:[] }){ state.pricing.push(p); renderPlans(); }
    on(plans,'click', (e)=>{
      const row=e.target.closest('.plan-row'); if(!row) return;
      if(e.target.closest('.rm')){ state.pricing.splice(Number(row.dataset.i),1); renderPlans(); }
    });
    on(addPlan,'click', ()=> addPlanRow());

    function collectPlans(){
      const rows=[...plans.querySelectorAll('.plan-row')];
      return rows.map(r=>{
        const name=r.querySelector('.p-name')?.value?.trim()||'';
        if(!name) return null;
        const price=Number(r.querySelector('.p-price')?.value||0);
        const duration=r.querySelector('.p-dur')?.value?.trim()||'';
        const includes=(r.querySelector('.p-inc')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const optRaw=(r.querySelector('.p-opt')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const options=optRaw.map(s=>{ const m=s.split('+'); return { name:(m[0]||'').trim(), price:Number(m[1]||0) }; }).filter(o=>o.name);
        return { name, price, duration, includes, options };
      }).filter(Boolean);
    }

    // ---- availability ----
    const splitCSV=(s)=> (s||'').split(',').map(x=>x.trim()).filter(Boolean);
    const joinCSV=(arr)=> (arr||[]).join(', ');
    // 저장 시: elLeadDays, elTimeslots, elBooked(el textarea CSV), elClosed(el textarea CSV)

    // ---- galleries (textarea에 URL 누적) ----
    function appendToTextarea(ta, urls){
      const cur=(ta.value||'').trim();
      const add=urls.filter(Boolean);
      ta.value = cur ? (cur + '\n' + add.join('\n')) : add.join('\n');
    }

    on(upStudio,'click', ()=>fileStudio?.click());
    on(upPortfolio,'click', ()=>filePortfolio?.click());

    on(fileStudio,'change', async (e)=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      bump(+files.length);
      try{
        say('스튜디오 이미지 업로드 중…');
        const urls=[];
        for(const f of files){ if(!isImgOk(f)) continue; const u=withTransform(await uploadImage(f), THUMB.gallery); urls.push(u); }
        appendToTextarea(taStudio, urls);
        say('업로드 완료', true);
      }catch(err){ console.error('[studio upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-files.length); e.target.value=''; }
    });

    on(filePortfolio,'change', async (e)=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      bump(+files.length);
      try{
        say('포트폴리오 이미지 업로드 중…');
        const urls=[];
        for(const f of files){ if(!isImgOk(f)) continue; const u=withTransform(await uploadImage(f), THUMB.gallery); urls.push(u); }
        appendToTextarea(taPortfolio, urls);
        say('업로드 완료', true);
      }catch(err){ console.error('[pf upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-files.length); e.target.value=''; }
    });

    // ---- shorts ----
    function renderShorts(){
      shortsList.innerHTML = state.shorts.map((s,i)=>`
        <div class="short-item" data-i="${i}">
          <img src="${s.thumbnailUrl||''}" alt="">
          <a class="url" href="${s.sourceUrl}" target="_blank" rel="noopener">${s.sourceUrl}</a>
          <button type="button" class="ic rm">✕</button>
        </div>
      `).join('') || '<div class="note">링크를 입력 후 추가하세요</div>';
    }
    function addShort(url){
      const u=(url||'').trim(); if(!u) return;
      const p=detectProvider(u);
      const embed=embedUrl(p,u);
      if(!embed){ say('지원되지 않는 링크 형식입니다'); return; }
      state.shorts.push({ sourceUrl:u, provider:p, embedUrl:embed, thumbnailUrl:thumbUrl(p,u) });
      shortUrl.value=''; renderShorts();
    }
    on(addShort,'click', ()=> addShort(shortUrl.value));
    on(shortUrl,'keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addShort(shortUrl.value); }});
    on(shortsList,'click', (e)=>{
      const item=e.target.closest('.short-item'); if(!item) return;
      if(e.target.closest('.rm')){ state.shorts.splice(Number(item.dataset.i),1); renderShorts(); }
    });

    // ---- FAQ ----
    function renderFaq(){
      faqList.innerHTML = state.faq.map((f,i)=>`
        <div class="faq-row" data-i="${i}">
          <input class="input f-q" placeholder="질문" value="${f.q||''}">
          <textarea class="input f-a" rows="3" placeholder="답변">${f.a||''}</textarea>
          <div class="row-end"><button type="button" class="ic rm">✕</button></div>
        </div>
      `).join('') || '<div class="note">FAQ를 추가하세요</div>';
    }
    on(addFaq,'click', ()=>{ state.faq.push({q:'',a:''}); renderFaq(); });
    on(faqList,'click', (e)=>{
      const row=e.target.closest('.faq-row'); if(!row) return;
      if(e.target.closest('.rm')){ state.faq.splice(Number(row.dataset.i),1); renderFaq(); }
    });

    // ---- load (수정 모드) ----
    state.id = new URLSearchParams(location.search).get('id') || '';
    await loadExisting();

    async function loadExisting(){
      try{
        say('불러오는 중…');

        let data=null;
        if(state.id){
          const r=await fetch(`${API_BASE}${ENTITY}/${state.id}`, { headers:headers(false) });
          const j=await r.json().catch(()=>({}));
          if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
          data=j.data||j;
        }else{
          // slug=byhen 우선
          let r=await fetch(`${API_BASE}${ENTITY}?slug=byhen&limit=1`, { headers:headers(false) });
          let j=await r.json().catch(()=>({}));
          if(r.ok){
            const arr=j.items||j.data||j.docs||[];
            if(Array.isArray(arr)&&arr.length){ data=arr[0]; state.id=data.id||data._id||''; }
          }
          if(!data){
            r=await fetch(`${API_BASE}${ENTITY}?limit=1`, { headers:headers(false) });
            j=await r.json().catch(()=>({}));
            const arr=j.items||j.data||j.docs||[];
            if(Array.isArray(arr)&&arr.length){ data=arr[0]; state.id=data.id||data._id||''; }
          }
        }

        if(!data){ say('새 페이지 작성 중', true); return; }

        // 기본
        elName && (elName.value=data.name||'');
        elSlug && (elSlug.value=data.slug||'byhen');
        elTagline && (elTagline.value=data.tagline||'');
        elLocation && (elLocation.value=data.location||'');
        elHours && (elHours.value=data.hours||'');

        elPhone && (elPhone.value=data.contact?.phone||'');
        elKakao && (elKakao.value=data.contact?.kakaoUrl||'');
        elEmail && (elEmail.value=data.contact?.email||'');

        // hero/logo
        state.heroImageUrl = data.hero?.image || '';
        state.logoUrl      = data.hero?.logo  || '';
        elHeroURL && (elHeroURL.value = state.heroImageUrl || '');
        elLogoURL && (elLogoURL.value = state.logoUrl || '');
        prevHero && (prevHero.src = state.heroImageUrl || '');
        prevLogo && (prevLogo.src = state.logoUrl || '');

        // galleries
        state.studioPhotos    = Array.isArray(data.studioPhotos)? data.studioPhotos.slice(0,200):[];
        state.portfolioPhotos = Array.isArray(data.portfolioPhotos)? data.portfolioPhotos.slice(0,200):[];
        taStudio && (taStudio.value = state.studioPhotos.join('\n'));
        taPortfolio && (taPortfolio.value = state.portfolioPhotos.join('\n'));

        // pricing
        state.pricing = Array.isArray(data.pricing)? data.pricing : [];
        renderPlans();

        // availability
        state.availability = {
          leadDays: Number(data.availability?.leadDays||0),
          timeslots: Array.isArray(data.availability?.timeslots)? data.availability.timeslots : [],
          booked: Array.isArray(data.availability?.booked)? data.availability.booked : [],
          closed: Array.isArray(data.availability?.closed)? data.availability.closed : [],
        };
        elLeadDays && (elLeadDays.value = state.availability.leadDays);
        elTimeslots && (elTimeslots.value = state.availability.timeslots.join(', '));
        elBooked && (elBooked.value = state.availability.booked.join(', '));
        elClosed && (elClosed.value = state.availability.closed.join(', '));

        // faq / policy
        state.faq = Array.isArray(data.faq)? data.faq : [];
        renderFaq();
        elPolicy && (elPolicy.value = data.policy || '');

        // shorts
        state.shorts = Array.isArray(data.shorts)? data.shorts : [];
        renderShorts();

        say('로드 완료', true);
      }catch(err){
        console.error('[byhen load]', err);
        say('불러오기 실패: '+(err.message||'오류'));
      }
    }

    // ---- validate & payload ----
    function validate(){
      if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
      if(!(elName?.value||'').trim()){ say('브랜드명을 입력해주세요'); return false; }
      // URL 형식 간단 체크
      const mustUrl = [elKakao?.value, elHeroURL?.value, elLogoURL?.value].filter(Boolean);
      for(const u of mustUrl){ if(u.trim() && !/^https?:\/\//i.test(u.trim())){ say('URL은 http(s):// 로 시작해야 합니다'); return false; } }
      return true;
    }

    function collectPayload(){
      const contact = {
        phone: (elPhone?.value||'').trim() || undefined,
        kakaoUrl: (elKakao?.value||'').trim() || undefined,
        email: (elEmail?.value||'').trim() || undefined,
      };
      const pricing = collectPlans();
      const availability = {
        leadDays: Number(elLeadDays?.value||0),
        timeslots: splitCSV(elTimeslots?.value),
        booked: splitCSV(elBooked?.value),
        closed: splitCSV(elClosed?.value),
      };
      // galleries: textarea 줄바꿈 → 배열
      const studioPhotos = (taStudio?.value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
      const portfolioPhotos = (taPortfolio?.value||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);

      return {
        slug: (elSlug?.value||'byhen'),
        type: 'brand',
        status: 'published', // 관리자 저장 = 발행 취급
        name: (elName?.value||'').trim() || undefined,
        tagline: (elTagline?.value||'').trim() || undefined,
        location: (elLocation?.value||'').trim() || undefined,
        hours: (elHours?.value||'').trim() || undefined,
        hero: { image: (elHeroURL?.value||'').trim() || undefined, logo: (elLogoURL?.value||'').trim() || undefined },
        contact,
        studioPhotos, portfolioPhotos,
        pricing, availability,
        faq: state.faq
          .map((f,i)=>{ // 최신 입력값 반영 수집
            const row = faqList.querySelector(`.faq-row[data-i="${i}"]`);
            const q = row?.querySelector('.f-q')?.value?.trim()||'';
            const a = row?.querySelector('.f-a')?.value?.trim()||'';
            return q && a ? { q, a } : null;
          }).filter(Boolean),
        policy: (elPolicy?.value||'').trim() || '',
        shorts: state.shorts
      };
    }

    async function submit(){
      if(!TOKEN){ location.href='login.html?returnTo='+here; return; }
      if(!validate()) return;
      try{
        say('저장 중…');
        const url = state.id ? `${API_BASE}${ENTITY}/${state.id}` : `${API_BASE}${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(collectPayload()) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || data.ok===false) throw new Error((data && (data.message||data.error)) || `HTTP_${res.status}`);
        say('저장 완료', true);
        setTimeout(()=>location.href='byhen.html', 480);
      }catch(err){
        console.error('[byhen save]', err);
        say('저장 실패: '+(err.message||'네트워크 오류'));
      }
    }

    // ---- actions ----
    on(btnSave,'click', (e)=>{ e.preventDefault(); submit(); });
    // 디버그
    window.BYHEN_ADMIN = { state, submit, money };
  }
})();