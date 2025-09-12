/* byhen-admin.page.js — v2.4
 * - 엔드포인트: /brands-test (slug=byhen 1건)
 * - API_BASE 절대값 강제(설정 미로드 시 Render 기본값 사용)
 * - Cloudinary: 서버 서명(/uploads/signature) 방식만 사용 (폴백 제거)
 * - 멀티 히어로 이미지(hero.images), 평점(rating), 설명/규칙/지도(map) 필드 추가
 * - 현재 admin HTML의 id와 1:1 매칭 (없으면 그냥 건너뜀)
 */
(function () {
  'use strict';

  // ------- config / endpoints -------
  const CFG = window.LIVEE_CONFIG || {};
  const DEFAULT_API = 'https://main-server-ekgr.onrender.com/api/v1';
  const API_BASE = ((CFG.API_BASE && /^https?:\/\//.test(CFG.API_BASE)) ? CFG.API_BASE : DEFAULT_API).replace(/\/$/, '');
  const EP = Object.assign({ byhen: '/brands-test', uploadsSignature: '/uploads/signature' }, (CFG.endpoints||{}));
  const ENTITY = EP.byhen;  // /brands-test
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // ------- helpers -------
  const $id = (s) => document.getElementById(s);
  const on  = (el,ev,fn)=> el && el.addEventListener(ev,fn);
  const say = (t, ok=false)=>{ const el=$id('adMsg'); if(!el) return; el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };

  // Cloudinary 변환
  const THUMB = Object.assign({
    cover169:'c_fill,g_auto,w_1600,h_900,f_auto,q_auto',
    logo:'c_fill,g_auto,w_512,h_512,f_auto,q_auto',
    gallery:'c_fill,g_auto,w_800,h_800,f_auto,q_auto'
  }, (CFG.thumb||{}));

  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{ return url; } };
  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); return false; } if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); return false; } return true; };

  // ------- Cloudinary: 서버 서명 방식만 -------
  async function getSignature(){
    const url = API_BASE + EP.uploadsSignature;
    const r = await fetch(url, { headers:headers(false) });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file, variant){
    const { cloudName, apiKey, timestamp, signature } = await getSignature(); // 실패 시 throw
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd });
    const j = await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return variant ? withTransform(j.secure_url, variant) : j.secure_url;
  }

  // 상태
  const state = { id:'', heroImageUrl:'', logoUrl:'' };

  // ------- init -------
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  async function init(){
    bindUploads();
    bindDynamicLists();
    bindSave();
    await loadExisting(); // slug=byhen 우선 로드
  }

  // ------- Bind: uploads -------
  function bindUploads(){
    const heroBtn=$id('upHeroImage'), heroFile=$id('fileHeroImage'), heroPrev=$id('prevHeroImage');
    const logoBtn=$id('upHeroLogo'),  logoFile=$id('fileHeroLogo'),  logoPrev=$id('prevHeroLogo');

    on(heroBtn,'click', ()=> heroFile?.click());
    on(logoBtn,'click', ()=> logoFile?.click());

    on(heroFile,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); if(heroPrev) heroPrev.src=local; say('배경 이미지 업로드 중…');
      try{ const url=await uploadImage(f, THUMB.cover169); state.heroImageUrl=url; if(heroPrev) heroPrev.src=url; say('업로드 완료',true); }
      catch(err){ console.error('[hero upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); e.target.value=''; }
    });

    on(logoFile,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      const local=URL.createObjectURL(f); if(logoPrev) logoPrev.src=local; say('로고 업로드 중…');
      try{ const url=await uploadImage(f, THUMB.logo); state.logoUrl=url; if(logoPrev) logoPrev.src=url; say('업로드 완료',true); }
      catch(err){ console.error('[logo upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); e.target.value=''; }
    });

    // 히어로 멀티 이미지 -> textarea#heroImages 에 줄바꿈으로 추가 & 미리보기
    const hImgsBtn=$id('upHeroImages'), hImgsFile=$id('fileHeroImages'), hImgsTA=$id('heroImages'), hImgsPrev=$id('prevHeroImages');
    on(hImgsBtn,'click',()=>hImgsFile?.click());
    on(hImgsFile,'change', async (e)=>{ await handleMultiUpload(e, hImgsTA, '히어로', THUMB.cover169); renderUrlPreview(hImgsTA, hImgsPrev); });

    // 지도 정적 이미지 업로드
    const mapBtn=$id('upMapImage'), mapFile=$id('fileMapImage'), mapPrev=$id('prevMapImage');
    const mapInput=$id('mapStaticImage');
    on(mapBtn,'click',()=>mapFile?.click());
    on(mapFile,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)){ e.target.value=''; return; }
      say('지도 이미지 업로드 중…');
      try{ const url=await uploadImage(f, THUMB.gallery); if(mapInput) mapInput.value=url; if(mapPrev) mapPrev.src=url; say('업로드 완료',true); }
      catch(err){ console.error('[map upload]',err); say('업로드 실패: '+(err.message||'오류')); }
      finally{ e.target.value=''; }
    });

    // 갤러리: 파일 선택 → 업로드 → textarea에 URL 줄바꿈 추가
    const studioBtn=$id('upStudio'), studioFile=$id('fileStudio'), studioTA=$id('studioPhotos');
    const pfBtn=$id('upPortfolio'), pfFile=$id('filePortfolio'), pfTA=$id('portfolioPhotos');

    on(studioBtn,'click',()=>studioFile?.click());
    on(pfBtn,'click',()=>pfFile?.click());

    on(studioFile,'change', async (e)=>{ await handleMultiUpload(e, studioTA, '스튜디오', THUMB.gallery); });
    on(pfFile,'change',     async (e)=>{ await handleMultiUpload(e, pfTA, '포트폴리오', THUMB.gallery); });
  }

  async function handleMultiUpload(e, ta, label, variant){
    const files=Array.from(e.target.files||[]); if(!files.length) return;
    say(`${label} 이미지 업로드 중…`);
    let urls=[];
    for(const f of files){ if(!isImgOk(f)) continue;
      try{ const url=await uploadImage(f, variant||THUMB.gallery); urls.push(url); }catch(err){ console.warn(`[${label}]`,err); }
    }
    if(urls.length){
      if(ta){ const cur=(ta.value||'').trim(); ta.value = (cur? (cur+'\n') : '') + urls.join('\n'); }
      say(`${label} ${urls.length}건 업로드 완료`,true);
    }else{
      say(`${label} 업로드 실패 또는 취소`);
    }
    e.target.value='';
  }

  function renderUrlPreview(textareaEl, previewWrap){
    if(!textareaEl || !previewWrap) return;
    const urls = (textareaEl.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    previewWrap.innerHTML = urls.map(u=>`<img src="${u}" alt="" style="width:84px;height:60px;object-fit:cover;border-radius:6px;margin-right:6px">`).join('');
  }

  // ------- Bind: dynamic lists (plans/shorts/faq) -------
  function bindDynamicLists(){
    // 가격/패키지
    const plansWrap=$id('plans'), addPlan=$id('addPlan');
    on(addPlan,'click',()=> addPlanRow(plansWrap));
    // 숏폼
    const shortsWrap=$id('shortsList'), shortUrl=$id('shortUrl'), addShort=$id('addShort');
    on(addShort,'click', ()=>{
      const u=(shortUrl.value||'').trim(); if(!u){ say('숏폼 링크를 입력하세요'); return; }
      addShortRow(shortsWrap, u); shortUrl.value='';
    });
    // FAQ
    const faqWrap=$id('faqList'), addFaq=$id('addFaq');
    on(addFaq,'click', ()=> addFaqRow(faqWrap));

    // 텍스트에 반응해 미리보기 갱신
    on($id('heroImages'),'input',()=>renderUrlPreview($id('heroImages'), $id('prevHeroImages')));
  }

  function addPlanRow(wrap, p={name:'',price:'',duration:'',includes:[],options:[]}){
    if(!wrap) return;
    const row=document.createElement('div'); row.className='plan-row';
    row.innerHTML = `
      <div class="grid">
        <input class="input p-name" placeholder="상품명" value="${p.name||''}">
        <input class="input p-price" type="number" min="0" placeholder="가격(원)" value="${p.price||''}">
        <input class="input p-dur" placeholder="소요시간 예: 2시간" value="${p.duration||''}">
        <button type="button" class="btn ghost rm">삭제</button>
      </div>
      <div class="grid">
        <input class="input p-inc" placeholder="포함사항(쉼표)" value="${(p.includes||[]).join(', ')}">
        <input class="input p-opt" placeholder="옵션: 이름+금액 쉼표(예: 추가컷+30000, 헤어+50000)" value="${(p.options||[]).map(o=>`${o.name}+${o.price||0}`).join(', ')}">
      </div>`;
    wrap.appendChild(row);
    on(row.querySelector('.rm'),'click',()=>row.remove());
  }
  function collectPlans(){
    const wrap=$id('plans'); if(!wrap) return [];
    return [...wrap.querySelectorAll('.plan-row')].map(r=>{
      const name=r.querySelector('.p-name').value.trim();
      if(!name) return null;
      const price=Number(r.querySelector('.p-price').value||0);
      const duration=r.querySelector('.p-dur').value.trim();
      const includes=(r.querySelector('.p-inc').value||'').split(',').map(s=>s.trim()).filter(Boolean);
      const optRaw=(r.querySelector('.p-opt').value||'').split(',').map(s=>s.trim()).filter(Boolean);
      const options=optRaw.map(s=>{ const m=s.split('+'); return { name:(m[0]||'').trim(), price:Number(m[1]||0) }; }).filter(o=>o.name);
      return { name, price, duration, includes, options };
    }).filter(Boolean);
  }

  function addShortRow(wrap, url){
    if(!wrap) return;
    const row=document.createElement('div'); row.className='short-row';
    row.innerHTML = `
      <input class="input s-url" value="${url||''}" placeholder="YouTube/Instagram/TikTok 링크">
      <button class="btn ghost rm" type="button">삭제</button>`;
    wrap.appendChild(row);
    on(row.querySelector('.rm'),'click',()=>row.remove());
  }
  function collectShorts(){
    const wrap=$id('shortsList'); if(!wrap) return [];
    return [...wrap.querySelectorAll('.s-url')].map(i=>({ sourceUrl: i.value.trim() })).filter(x=>x.sourceUrl);
  }

  function addFaqRow(wrap, f={q:'',a:''}){
    if(!wrap) return;
    const row=document.createElement('div'); row.className='faq-row';
    row.innerHTML = `
      <input class="input f-q" placeholder="질문" value="${f.q||''}">
      <textarea class="input f-a" rows="3" placeholder="답변">${f.a||''}</textarea>
      <div style="text-align:right;margin-top:6px"><button class="btn ghost rm" type="button">삭제</button></div>`;
    wrap.appendChild(row);
    on(row.querySelector('.rm'),'click',()=>row.remove());
  }
  function collectFaq(){
    const wrap=$id('faqList'); if(!wrap) return [];
    return [...wrap.querySelectorAll('.faq-row')].map(r=>{
      const q=r.querySelector('.f-q').value.trim();
      const a=r.querySelector('.f-a').value.trim();
      return (q && a) ? { q, a } : null;
    }).filter(Boolean);
  }

  // ------- Load / Save -------
  async function loadExisting(){
    try{
      say('불러오는 중…');
      const id = new URLSearchParams(location.search).get('id') || '';
      let data=null;

      if(id){
        const r = await fetch(`${API_BASE}${ENTITY}/${encodeURIComponent(id)}`, { headers:headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
        data = j.data || j;
      }else{
        // slug=byhen 우선 탐색 → 없으면 첫 문서
        let r = await fetch(`${API_BASE}${ENTITY}?slug=byhen&limit=1`, { headers:headers(false) });
        let j = await r.json().catch(()=>({}));
        if(r.ok){
          const items=j.items||j.data||j.docs||[];
          if(items && items.length){ data=items[0]; }
        }
        if(!data){
          r = await fetch(`${API_BASE}${ENTITY}?limit=1`, { headers:headers(false) });
          j = await r.json().catch(()=>({}));
          const items=j.items||j.data||j.docs||[];
          if(items && items.length){ data=items[0]; }
        }
      }

      if(!data){ say('새 페이지 작성', true); return; }
      state.id = data.id || data._id || '';

      // 기본 필드
      if($id('name'))     $id('name').value     = data.name || '';
      if($id('tagline'))  $id('tagline').value  = data.tagline || '';
      if($id('location')) $id('location').value = data.location || '';
      if($id('hours'))    $id('hours').value    = data.hours || '';

      if($id('phone'))    $id('phone').value    = data.contact?.phone || '';
      if($id('kakaoUrl')) $id('kakaoUrl').value = data.contact?.kakaoUrl || '';
      if($id('email'))    $id('email').value    = data.contact?.email || '';

      if($id('heroImage')) $id('heroImage').value = data.hero?.image || '';
      if($id('heroLogo'))  $id('heroLogo').value  = data.hero?.logo  || '';

      state.heroImageUrl = data.hero?.image || '';
      state.logoUrl      = data.hero?.logo || '';
      if($id('prevHeroImage') && state.heroImageUrl) $id('prevHeroImage').src = state.heroImageUrl;
      if($id('prevHeroLogo')  && state.logoUrl)      $id('prevHeroLogo').src  = state.logoUrl;

      // ---- NEW: hero.images / rating / desc / rules / map
      const heroImgs = Array.isArray(data.hero?.images)? data.hero.images : [];
      if($id('heroImages')){ $id('heroImages').value = heroImgs.join('\n'); renderUrlPreview($id('heroImages'), $id('prevHeroImages')); }

      if($id('ratingAvg'))   $id('ratingAvg').value   = data.rating?.avg ?? '';
      if($id('ratingCount')) $id('ratingCount').value = data.rating?.count ?? '';

      if($id('description')) $id('description').value = data.description || '';
      if($id('rules'))       $id('rules').value       = data.rules || '';
      if($id('mapEmbedUrl'))    $id('mapEmbedUrl').value    = data.map?.embedUrl || '';
      if($id('mapStaticImage')) $id('mapStaticImage').value = data.map?.staticImage || '';
      if($id('mapLink'))        $id('mapLink').value        = data.map?.link || '';
      if($id('prevMapImage') && data.map?.staticImage){ $id('prevMapImage').src = data.map.staticImage; }

      // 예약
      if($id('leadDays'))   $id('leadDays').value = data.availability?.leadDays ?? 0;
      if($id('timeslots'))  $id('timeslots').value= (data.availability?.timeslots||[]).join(', ');
      if($id('booked'))     $id('booked').value   = (data.availability?.booked||[]).join(', ');
      if($id('closed'))     $id('closed').value   = (data.availability?.closed||[]).join(', ');

      // 갤러리
      if($id('studioPhotos'))    $id('studioPhotos').value    = (data.studioPhotos||[]).join('\n');
      if($id('portfolioPhotos')) $id('portfolioPhotos').value = (data.portfolioPhotos||[]).join('\n');

      // 가격
      const plansWrap=$id('plans'); if(plansWrap){ plansWrap.innerHTML=''; (Array.isArray(data.pricing)?data.pricing:[]).forEach(p=>addPlanRow(plansWrap, p)); }

      // 숏폼
      const shortsWrap=$id('shortsList'); if(shortsWrap){ shortsWrap.innerHTML=''; (Array.isArray(data.shorts)?data.shorts:[]).forEach(s=>addShortRow(shortsWrap, s.sourceUrl||'')); }

      // FAQ/정책
      const faqWrap=$id('faqList'); if(faqWrap){ faqWrap.innerHTML=''; (Array.isArray(data.faq)?data.faq:[]).forEach(f=>addFaqRow(faqWrap, f)); }
      if($id('policy')) $id('policy').value = data.policy || '';

      say('로드 완료', true);
    }catch(err){
      console.error('[byhen load]', err);
      say('불러오기 실패: ' + (err.message || '오류'));
    }
  }

  function parseCsvDates(v){ return (v||'').split(',').map(s=>s.trim()).filter(Boolean); }
  function parseLines(v){ return (v||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean); }

  function buildPayload(){
    const contact = {
      phone: ($id('phone')?.value||'').trim() || undefined,
      kakaoUrl: ($id('kakaoUrl')?.value||'').trim() || undefined,
      email: ($id('email')?.value||'').trim() || undefined
    };
    const availability = {
      leadDays: Number($id('leadDays')?.value||0),
      timeslots: ($id('timeslots')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
      booked: parseCsvDates($id('booked')?.value),
      closed: parseCsvDates($id('closed')?.value)
    };

    const heroImages = parseLines($id('heroImages')?.value);
    const hero = {
      image: state.heroImageUrl || ($id('heroImage')?.value||'').trim() || heroImages[0] || undefined,
      logo:  state.logoUrl      || ($id('heroLogo')?.value||'').trim()  || undefined,
      images: heroImages.length ? heroImages : undefined
    };

    const ratingAvg = ($id('ratingAvg')?.value||'').trim();
    const ratingCnt = ($id('ratingCount')?.value||'').trim();
    const rating = (ratingAvg || ratingCnt) ? {
      avg: ratingAvg ? Number(ratingAvg) : undefined,
      count: ratingCnt ? Number(ratingCnt) : undefined
    } : undefined;

    const map = {
      embedUrl: ($id('mapEmbedUrl')?.value||'').trim() || undefined,
      staticImage: ($id('mapStaticImage')?.value||'').trim() || undefined,
      link: ($id('mapLink')?.value||'').trim() || undefined
    };
    if(!map.embedUrl && !map.staticImage && !map.link) delete map.embedUrl, delete map.staticImage, delete map.link;

    return {
      slug: 'byhen',
      type: 'brand',
      status: 'published',
      name: ($id('name')?.value||'').trim() || undefined,
      tagline: ($id('tagline')?.value||'').trim() || undefined,
      location: ($id('location')?.value||'').trim() || undefined,
      hours: ($id('hours')?.value||'').trim() || undefined,
      hero,
      contact,
      rating,
      description: ($id('description')?.value||'').trim() || undefined,
      rules: ($id('rules')?.value||'').trim() || undefined,
      map: (map.embedUrl||map.staticImage||map.link) ? map : undefined,
      studioPhotos: parseLines($id('studioPhotos')?.value),
      portfolioPhotos: parseLines($id('portfolioPhotos')?.value),
      pricing: collectPlans(),
      availability,
      shorts: collectShorts(),
      faq: collectFaq(),
      policy: ($id('policy')?.value||'').trim() || ''
    };
  }

  function validate(payload){
    if(!payload.name){ say('브랜드명을 입력해주세요'); return false; }
    const hasHero = (payload.hero?.image) || (Array.isArray(payload.hero?.images) && payload.hero.images.length);
    if(!hasHero){ say('히어로 이미지를 업로드/입력해주세요'); return false; }
    return true;
  }

  function bindSave(){
    on($id('adSave'),'click', async ()=>{
      try{
        const payload = buildPayload();
        if(!validate(payload)) return;

        say('저장 중…');
        const url   = state.id ? `${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}` : `${API_BASE}${ENTITY}`;
        const method= state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers:headers(true), body:JSON.stringify(payload) });
        const j = await res.json().catch(()=>({}));
        if(!res.ok || j.ok===false) throw new Error((j && (j.message || j.error)) || `HTTP_${res.status}`);
        state.id = j.data?.id || j.id || state.id;
        say('저장 완료', true);
      }catch(err){
        console.error('[byhen save]', err);
        say('저장 실패: ' + (err.message || 'Internal Server Error'));
      }
    });
  }
})();