<!-- public/js/byhen-admin.page.js -->
/* byhen-admin.page.js — v2.5 (full refactor)
 * - API_BASE 강제(설정 없을 때 Render 기본값)
 * - Cloudinary: 서버 서명(/uploads/signature) 방식만 사용
 * - hero.images / rating / map / description / rules 필드 정식 반영
 * - 폼 id와 1:1 매칭, 없는 엘리먼트는 건너뜀
 */
(function () {
  'use strict';

  // ===== Config =====
  const CFG = window.LIVEE_CONFIG || {};
  const DEFAULT_API = 'https://main-server-ekgr.onrender.com/api/v1';
  const API_BASE = ((CFG.API_BASE && /^https?:\/\//.test(CFG.API_BASE)) ? CFG.API_BASE : DEFAULT_API).replace(/\/$/, '');
  const EP = Object.assign({
    BYHEN: '/brands-test',
    SIGN:  '/uploads/signature'
  }, (CFG.endpoints || {}));
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // ===== Utils =====
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn, false);
  const toast = (msg, ok=false) => { const n=$('adMsg'); if(!n) return; n.textContent=msg; n.classList.add('show'); n.classList.toggle('ok', ok); };
  const headers = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h.Authorization=`Bearer ${TOKEN}`; return h; };

  // Cloudinary 변환 preset (서버에서도 동일 preset 쓰면 일관)
  const THUMB = {
    cover169:'c_fill,g_auto,w_1600,h_900,f_auto,q_auto',
    logo    :'c_fill,g_auto,w_512,h_512,f_auto,q_auto',
    gallery :'c_fill,g_auto,w_800,h_800,f_auto,q_auto'
  };
  const withTransform=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{ return url; } };
  const isImgOk=(f)=>{ if(!/^image\//.test(f.type)) return toast('이미지 파일만 업로드 가능'), false; if(f.size>8*1024*1024) return toast('이미지는 8MB 이하'), false; return true; };

  async function getSignature(){
    const r = await fetch(API_BASE + EP.SIGN, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file, variant){
    const { cloudName, apiKey, timestamp, signature } = await getSignature();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body: fd });
    const j = await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return variant ? withTransform(j.secure_url, variant) : j.secure_url;
  }

  // ===== State =====
  const state = { id:'', heroImageUrl:'', logoUrl:'' };

  // ===== Init =====
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();

  async function init(){
    bindUploads();
    bindDynamicLists();
    bindSave();
    await loadExisting();
  }

  // ===== Upload bindings =====
  function bindUploads(){
    // 1) 대표/로고
    const heroBtn=$('upHeroImage'), heroFile=$('fileHeroImage'), heroPrev=$('prevHeroImage');
    const logoBtn=$('upHeroLogo'),  logoFile=$('fileHeroLogo'),  logoPrev=$('prevHeroLogo');

    on(heroBtn,'click',()=>heroFile?.click());
    on(logoBtn,'click',()=>logoFile?.click());

    on(heroFile,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)) return void(e.target.value='');
      const local=URL.createObjectURL(f); if(heroPrev) heroPrev.src=local; toast('배경 이미지 업로드 중…');
      try{ const url=await uploadImage(f, THUMB.cover169); state.heroImageUrl=url; if(heroPrev) heroPrev.src=url; toast('업로드 완료',true); }
      catch(err){ console.error(err); toast('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); e.target.value=''; }
    });

    on(logoFile,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)) return void(e.target.value='');
      const local=URL.createObjectURL(f); if(logoPrev) logoPrev.src=local; toast('로고 업로드 중…');
      try{ const url=await uploadImage(f, THUMB.logo); state.logoUrl=url; if(logoPrev) logoPrev.src=url; toast('업로드 완료',true); }
      catch(err){ console.error(err); toast('업로드 실패: '+(err.message||'오류')); }
      finally{ URL.revokeObjectURL(local); e.target.value=''; }
    });

    // 2) 히어로 멀티
    const hBtn=$('upHeroImages'), hFile=$('fileHeroImages'), hTA=$('heroImages'), hPrev=$('prevHeroImages');
    on(hBtn,'click',()=>hFile?.click());
    on(hFile,'change', async (e)=>{ await handleMultiUpload(e, hTA, '히어로', THUMB.cover169); renderUrlPreview(hTA, hPrev); });

    // 3) 지도 정적 이미지
    const mBtn=$('upMapImage'), mFile=$('fileMapImage'), mPrev=$('prevMapImage'), mInput=$('mapStaticImage');
    on(mBtn,'click',()=>mFile?.click());
    on(mFile,'change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return; if(!isImgOk(f)) return void(e.target.value='');
      toast('지도 이미지 업로드 중…');
      try{ const url=await uploadImage(f, THUMB.gallery); if(mInput) mInput.value=url; if(mPrev) mPrev.src=url; toast('업로드 완료',true); }
      catch(err){ console.error(err); toast('업로드 실패: '+(err.message||'오류')); }
      finally{ e.target.value=''; }
    });

    // 4) 갤러리 업로드
    const sBtn=$('upStudio'), sFile=$('fileStudio'), sTA=$('studioPhotos');
    const pBtn=$('upPortfolio'), pFile=$('filePortfolio'), pTA=$('portfolioPhotos');
    on(sBtn,'click',()=>sFile?.click());
    on(pBtn,'click',()=>pFile?.click());
    on(sFile,'change', async (e)=>{ await handleMultiUpload(e, sTA, '스튜디오', THUMB.gallery); });
    on(pFile,'change', async (e)=>{ await handleMultiUpload(e, pTA, '포트폴리오', THUMB.gallery); });
  }

  async function handleMultiUpload(e, ta, label, variant){
    const files=Array.from(e.target.files||[]); if(!files.length) return;
    toast(`${label} 이미지 업로드 중…`);
    const urls=[];
    for(const f of files){ if(!isImgOk(f)) continue; try{ urls.push(await uploadImage(f, variant)); }catch(err){ console.warn(`[${label}]`,err); } }
    if(urls.length){ const cur=(ta?.value||'').trim(); if(ta) ta.value = (cur? cur+'\n' : '') + urls.join('\n'); toast(`${label} ${urls.length}건 업로드 완료`,true); }
    else toast(`${label} 업로드 실패 또는 취소`);
    e.target.value='';
  }
  function renderUrlPreview(ta, wrap){
    if(!ta||!wrap) return;
    const urls=(ta.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    wrap.innerHTML = urls.map(u=>`<img src="${u}" alt="" style="width:84px;height:60px;object-fit:cover;border-radius:6px;margin-right:6px">`).join('');
  }

  // ===== Dynamic rows =====
  function bindDynamicLists(){
    // 가격/패키지
    const wrap=$('plans'); on($('addPlan'),'click',()=>addPlanRow(wrap));
    // 숏폼
    const sl=$('shortsList'), su=$('shortUrl'); on($('addShort'),'click',()=>{ const u=(su.value||'').trim(); if(!u) return toast('숏폼 링크를 입력하세요'); addShortRow(sl,u); su.value=''; });
    // FAQ
    const fq=$('faqList'); on($('addFaq'),'click',()=>addFaqRow(fq));
    // 프리뷰
    on($('heroImages'),'input',()=>renderUrlPreview($('heroImages'), $('prevHeroImages')));
  }

  function addPlanRow(wrap, p={name:'',price:'',duration:'',includes:[],options:[],badge:''}){
    if(!wrap) return;
    const row=document.createElement('div'); row.className='plan-row';
    row.innerHTML = `
      <div class="grid">
        <input class="input p-name" placeholder="상품명" value="${p.name||''}">
        <input class="input p-price" type="number" min="0" placeholder="가격(원)" value="${p.price||''}">
        <input class="input p-dur" placeholder="소요시간 예: 2시간" value="${p.duration||''}">
        <input class="input p-badge" placeholder="뱃지(선택)" value="${p.badge||''}">
        <button class="btn ghost rm" type="button">삭제</button>
      </div>
      <div class="grid">
        <input class="input p-inc" placeholder="포함사항(쉼표)" value="${(p.includes||[]).join(', ')}">
        <input class="input p-opt" placeholder="옵션: 이름+금액 쉼표(예: 추가컷+30000, 헤어+50000)" value="${(p.options||[]).map(o=>`${o.name}+${o.price||0}`).join(', ')}">
      </div>`;
    wrap.appendChild(row);
    on(row.querySelector('.rm'),'click',()=>row.remove());
  }
  function collectPlans(){
    const wrap=$('plans'); if(!wrap) return [];
    return [...wrap.querySelectorAll('.plan-row')].map(r=>{
      const name=r.querySelector('.p-name').value.trim(); if(!name) return null;
      const price=Number(r.querySelector('.p-price').value||0);
      const duration=r.querySelector('.p-dur').value.trim();
      const badge=r.querySelector('.p-badge').value.trim();
      const includes=(r.querySelector('.p-inc').value||'').split(',').map(s=>s.trim()).filter(Boolean);
      const optRaw=(r.querySelector('.p-opt').value||'').split(',').map(s=>s.trim()).filter(Boolean);
      const options=optRaw.map(s=>{ const [n,pr]=s.split('+'); return { name:(n||'').trim(), price:Number(pr||0) }; }).filter(o=>o.name);
      return { name, price, duration, includes, options, ...(badge?{badge}:null) };
    }).filter(Boolean);
  }

  function addShortRow(wrap, url){
    if(!wrap) return;
    const row=document.createElement('div'); row.className='short-row';
    row.innerHTML=`<input class="input s-url" value="${url||''}" placeholder="YouTube/Instagram/TikTok 링크"><button class="btn ghost rm" type="button">삭제</button>`;
    wrap.appendChild(row);
    on(row.querySelector('.rm'),'click',()=>row.remove());
  }
  function collectShorts(){
    const wrap=$('shortsList'); if(!wrap) return [];
    return [...wrap.querySelectorAll('.s-url')].map(i=>({ sourceUrl: i.value.trim() })).filter(x=>x.sourceUrl);
  }

  function addFaqRow(wrap, f={q:'',a:''}){
    if(!wrap) return;
    const row=document.createElement('div'); row.className='faq-row';
    row.innerHTML=`
      <input class="input f-q" placeholder="질문" value="${f.q||''}">
      <textarea class="input f-a" rows="3" placeholder="답변">${f.a||''}</textarea>
      <div style="text-align:right;margin-top:6px"><button class="btn ghost rm" type="button">삭제</button></div>`;
    wrap.appendChild(row);
    on(row.querySelector('.rm'),'click',()=>row.remove());
  }
  function collectFaq(){
    const wrap=$('faqList'); if(!wrap) return [];
    return [...wrap.querySelectorAll('.faq-row')].map(r=>{
      const q=r.querySelector('.f-q').value.trim();
      const a=r.querySelector('.f-a').value.trim();
      return (q && a) ? { q, a } : null;
    }).filter(Boolean);
  }

  // ===== Load / Save =====
  async function loadExisting(){
    try{
      toast('불러오는 중…');
      const id = new URLSearchParams(location.search).get('id') || '';
      let data=null;

      if(id){
        const r = await fetch(`${API_BASE}${EP.BYHEN}/${encodeURIComponent(id)}`, { headers: headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
        data = j.data || j;
      }else{
        // slug=byhen 우선
        let r = await fetch(`${API_BASE}${EP.BYHEN}?slug=byhen&limit=1`, { headers: headers(false) });
        let j = await r.json().catch(()=>({}));
        if(r.ok){ const it=j.items||j.data||j.docs||[]; if(it.length) data=it[0]; }
        if(!data){
          r = await fetch(`${API_BASE}${EP.BYHEN}?limit=1`, { headers: headers(false) });
          j = await r.json().catch(()=>({}));
          const it=j.items||j.data||j.docs||[]; if(it.length) data=it[0];
        }
      }

      if(!data){ toast('새 페이지 작성', true); return; }
      state.id = data.id || data._id || '';

      const setVal=(id,v)=>{ const el=$(id); if(el!=null) el.value = (v ?? ''); };

      setVal('name', data.name);
      setVal('tagline', data.tagline);
      setVal('location', data.location);
      setVal('hours', data.hours);

      setVal('phone', data.contact?.phone);
      setVal('kakaoUrl', data.contact?.kakaoUrl);
      setVal('email', data.contact?.email);

      setVal('heroImage', data.hero?.image);
      setVal('heroLogo', data.hero?.logo);

      state.heroImageUrl = data.hero?.image || '';
      state.logoUrl      = data.hero?.logo  || '';
      if($('prevHeroImage') && state.heroImageUrl) $('prevHeroImage').src = state.heroImageUrl;
      if($('prevHeroLogo')  && state.logoUrl)      $('prevHeroLogo').src  = state.logoUrl;

      // NEW: hero.images / rating / description / rules / map
      const heroImgs = Array.isArray(data.hero?.images)? data.hero.images : [];
      setVal('heroImages', heroImgs.join('\n'));
      renderUrlPreview($('heroImages'), $('prevHeroImages'));

      setVal('ratingAvg',   data.rating?.avg);
      setVal('ratingCount', data.rating?.count);

      setVal('description', data.description);
      setVal('rules',       data.rules);

      setVal('mapEmbedUrl',    data.map?.embedUrl);
      setVal('mapStaticImage', data.map?.staticImage);
      setVal('mapLink',        data.map?.link);
      if($('prevMapImage') && data.map?.staticImage) $('prevMapImage').src = data.map.staticImage;

      setVal('leadDays',  data.availability?.leadDays ?? 0);
      setVal('timeslots', (data.availability?.timeslots||[]).join(', '));
      setVal('booked',    (data.availability?.booked||[]).join(', '));
      setVal('closed',    (data.availability?.closed||[]).join(', '));

      setVal('studioPhotos',    (data.studioPhotos||[]).join('\n'));
      setVal('portfolioPhotos', (data.portfolioPhotos||[]).join('\n'));

      // plans
      const pWrap=$('plans'); if(pWrap){ pWrap.innerHTML=''; (Array.isArray(data.pricing)?data.pricing:[]).forEach(p=>addPlanRow(pWrap,p)); }
      // shorts
      const sWrap=$('shortsList'); if(sWrap){ sWrap.innerHTML=''; (Array.isArray(data.shorts)?data.shorts:[]).forEach(s=>addShortRow(sWrap, s.sourceUrl||'')); }
      // faq
      const fWrap=$('faqList'); if(fWrap){ fWrap.innerHTML=''; (Array.isArray(data.faq)?data.faq:[]).forEach(f=>addFaqRow(fWrap, f)); }
      setVal('policy', data.policy || '');

      toast('로드 완료', true);
    }catch(err){
      console.error('[byhen load]', err);
      toast('불러오기 실패: ' + (err.message || '오류'));
    }
  }

  const lines = (v)=> (v||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const csv   = (v)=> (v||'').split(',').map(s=>s.trim()).filter(Boolean);

  function buildPayload(){
    const heroImages = lines($('heroImages')?.value);
    const contact = {
      phone: ($('phone')?.value||'').trim() || undefined,
      kakaoUrl: ($('kakaoUrl')?.value||'').trim() || undefined,
      email: ($('email')?.value||'').trim() || undefined
    };
    const availability = {
      leadDays: Number($('leadDays')?.value||0),
      timeslots: csv($('timeslots')?.value),
      booked:    csv($('booked')?.value),
      closed:    csv($('closed')?.value)
    };
    const ratingAvg = ($('ratingAvg')?.value||'').trim();
    const ratingCnt = ($('ratingCount')?.value||'').trim();
    const rating = (ratingAvg || ratingCnt) ? {
      avg:   ratingAvg ? Number(ratingAvg) : undefined,
      count: ratingCnt ? Number(ratingCnt) : undefined
    } : undefined;
    const map = {
      embedUrl:    ($('mapEmbedUrl')?.value||'').trim() || undefined,
      staticImage: ($('mapStaticImage')?.value||'').trim() || undefined,
      link:        ($('mapLink')?.value||'').trim() || undefined
    };
    if(!map.embedUrl && !map.staticImage && !map.link) {} else {};

    return {
      slug: 'byhen',
      type: 'brand',
      status: 'published',
      name: ($('name')?.value||'').trim() || undefined,
      tagline: ($('tagline')?.value||'').trim() || undefined,
      location: ($('location')?.value||'').trim() || undefined,
      hours: ($('hours')?.value||'').trim() || undefined,
      hero: {
        image: state.heroImageUrl || ($('heroImage')?.value||'').trim() || (heroImages[0] || undefined),
        logo:  state.logoUrl      || ($('heroLogo')?.value||'').trim()  || undefined,
        images: heroImages.length ? heroImages : undefined
      },
      contact,
      rating,
      description: ($('description')?.value||'').trim() || undefined,
      rules:       ($('rules')?.value||'').trim() || undefined,
      map: (map.embedUrl||map.staticImage||map.link) ? map : undefined,
      studioPhotos:    lines($('studioPhotos')?.value),
      portfolioPhotos: lines($('portfolioPhotos')?.value),
      pricing:  collectPlans(),
      availability,
      shorts:   collectShorts(),
      faq:      collectFaq(),
      policy:   ($('policy')?.value||'').trim() || ''
    };
  }

  function validate(payload){
    if(!payload.name){ toast('브랜드명을 입력해주세요'); return false; }
    const hasHero = payload.hero?.image || (Array.isArray(payload.hero?.images) && payload.hero.images.length);
    if(!hasHero){ toast('히어로 이미지를 업로드/입력해주세요'); return false; }
    return true;
  }

  function bindSave(){
    on($('adSave'),'click', async ()=>{
      try{
        const body = buildPayload();
        if(!validate(body)) return;

        toast('저장 중…');
        const url   = state.id ? `${API_BASE}${EP.BYHEN}/${encodeURIComponent(state.id)}` : `${API_BASE}${EP.BYHEN}`;
        const method= state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(body) });
        const j = await res.json().catch(()=>({}));
        if(!res.ok || j.ok===false) throw new Error(j.message || `HTTP_${res.status}`);
        state.id = j.data?.id || j.data?._id || state.id;
        toast('저장 완료', true);
      }catch(err){
        console.error('[byhen save]', err);
        toast('저장 실패: ' + (err.message || 'Internal Server Error'));
      }
    });
  }
})();
