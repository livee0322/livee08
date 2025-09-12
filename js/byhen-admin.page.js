/* byhen-admin.page.js — v1.0.0 */
(function(){
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const ENDPOINT = API_BASE + '/brands-test/byhen';
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const $ = (s,el=document)=>el.querySelector(s);
  const say = (t, ok=false)=>{ const el=$('#adMsg'); el.textContent=t; el.classList.add('show'); el.classList.toggle('ok', ok); };
  const HJSON = ()=>{ const h={Accept:'application/json','Content-Type':'application/json'}; if(TOKEN) h.Authorization=`Bearer ${TOKEN}`; return h; };

  // ---- Cloudinary upload (서버의 /uploads/signature 재사용) ----
  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers:{Accept:'application/json'} });
    const j = await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd = new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j = await r.json().catch(()=>({})); if(!r.ok||!j.secure_url) throw new Error(j.error?.message||`Cloud_${r.status}`);
    return j.secure_url;
  }

  // ---- shorts helpers ----
  const ytId=(u='')=>(u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)||[])[1]||'';
  const igId=(u='')=>(u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)||[])[1]||'';
  const tkId=(u='')=>(u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)||[])[1]||'';
  const detect=(u='')=>/youtu\.?be|youtube\.com/.test(u)?'youtube':/instagram\.com/.test(u)?'instagram':/tiktok\.com/.test(u)?'tiktok':'etc';
  const embed=(p,u)=>p==='youtube'?(ytId(u)?`https://www.youtube.com/embed/${ytId(u)}`:''):p==='instagram'?(igId(u)?`https://www.instagram.com/reel/${igId(u)}/embed`:''):p==='tiktok'?(tkId(u)?`https://www.tiktok.com/embed/v2/${tkId(u)}`:''):'';
  const thumb=(p,u)=>p==='youtube'&&ytId(u)?`https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg`:''; 

  // ---- form refs ----
  const els = {
    name:$('#name'), tagline:$('#tagline'), location:$('#location'), hours:$('#hours'),
    phone:$('#phone'), kakaoUrl:$('#kakaoUrl'), email:$('#email'),
    heroImage:$('#heroImage'), heroLogo:$('#heroLogo'),
    prevHeroImage:$('#prevHeroImage'), prevHeroLogo:$('#prevHeroLogo'),
    leadDays:$('#leadDays'), timeslots:$('#timeslots'), booked:$('#booked'), closed:$('#closed'),
    studioPhotos:$('#studioPhotos'), portfolioPhotos:$('#portfolioPhotos'),
    plans:$('#plans'), addPlan:$('#addPlan'),
    shortsList:$('#shortsList'), shortUrl:$('#shortUrl'), addShort:$('#addShort'),
    faqList:$('#faqList'), addFaq:$('#addFaq'),
    policy:$('#policy'),
    save:$('#adSave'),
    upHeroImage:$('#upHeroImage'), upHeroLogo:$('#upHeroLogo'),
    fileHeroImage:$('#fileHeroImage'), fileHeroLogo:$('#fileHeroLogo'),
    upStudio:$('#upStudio'), fileStudio:$('#fileStudio'),
    upPortfolio:$('#upPortfolio'), filePortfolio:$('#filePortfolio'),
  };

  // ---- dynamic blocks ----
  function renderPlans(list){
    els.plans.innerHTML = (list||[]).map((p,i)=>`
      <div class="item-row" data-i="${i}">
        <div>
          <div class="grid3">
            <input class="input p-name" placeholder="이름" value="${p.name||''}">
            <input class="input p-price" type="number" placeholder="가격" value="${p.price||''}">
            <input class="input p-duration" placeholder="소요시간" value="${p.duration||''}">
          </div>
          <div class="field"><span class="small">포함사항(쉼표)</span>
            <input class="input p-includes" placeholder="스튜디오 2시간, 감독 1명" value="${(p.includes||[]).join(', ')}">
          </div>
          <div class="field"><span class="small">옵션(이름:가격; 세미콜론으로 구분)</span>
            <input class="input p-options" placeholder="원본 전체:100000; 메이크업:150000" value="${(p.options||[]).map(o=>`${o.name}:${o.price}`).join('; ')}">
          </div>
          <div class="grid2">
            <input class="input p-id" placeholder="ID" value="${p.id||''}">
            <input class="input p-badge" placeholder="뱃지(추천 등)" value="${p.badge||''}">
          </div>
        </div>
        <button class="x">✕</button>
      </div>
    `).join('');
  }
  function readPlans(){
    return [...els.plans.querySelectorAll('.item-row')].map(row=>{
      const val = sel=>row.querySelector(sel)?.value?.trim()||'';
      const includes = val('.p-includes').split(',').map(s=>s.trim()).filter(Boolean);
      const options = val('.p-options').split(';').map(x=>x.trim()).filter(Boolean)
        .map(s=>{ const [name,price]=s.split(':'); return { name:(name||'').trim(), price:Number(price||0) };});
      return {
        id: val('.p-id'), name: val('.p-name'), price: Number(val('.p-price')||0),
        duration: val('.p-duration'), includes, options, badge: val('.p-badge')
      };
    });
  }

  function renderShorts(list){
    els.shortsList.innerHTML = (list||[]).map((s,i)=>`
      <div class="item-row" data-i="${i}">
        <div>
          <div class="grid2">
            <input class="input s-src" placeholder="sourceUrl" value="${s.sourceUrl||''}">
            <input class="input s-emb" placeholder="embedUrl" value="${s.embedUrl||''}">
          </div>
          <div class="grid2">
            <input class="input s-th" placeholder="thumbnailUrl" value="${s.thumbnailUrl||''}">
            <input class="input s-prov" placeholder="provider" value="${s.provider||''}">
          </div>
        </div>
        <button class="x">✕</button>
      </div>
    `).join('');
  }
  function readShorts(){
    return [...els.shortsList.querySelectorAll('.item-row')].map(row=>{
      const v = sel=>row.querySelector(sel)?.value?.trim()||'';
      return { sourceUrl:v('.s-src'), embedUrl:v('.s-emb'), thumbnailUrl:v('.s-th'), provider:v('.s-prov') };
    }).filter(s=>s.sourceUrl||s.embedUrl);
  }

  function renderFaq(list){
    els.faqList.innerHTML = (list||[]).map((f,i)=>`
      <div class="item-row" data-i="${i}">
        <div>
          <input class="input f-q" placeholder="질문" value="${f.q||''}">
          <div class="field"><span class="small">답변</span><textarea class="input f-a" rows="3">${f.a||''}</textarea></div>
        </div>
        <button class="x">✕</button>
      </div>
    `).join('');
  }
  function readFaq(){
    return [...els.faqList.querySelectorAll('.item-row')].map(row=>{
      return { q: row.querySelector('.f-q')?.value?.trim()||'', a: row.querySelector('.f-a')?.value?.trim()||'' };
    }).filter(f=>f.q||f.a);
  }

  // ---- load/save ----
  async function load(){
    try{
      say('불러오는 중…');
      const r = await fetch(ENDPOINT, { headers:{Accept:'application/json'} });
      const j = await r.json().catch(()=>({}));
      const d = (j && (j.data||j)) || {};
      // 기본값
      $('#name').value     = d.name||'BYHEN';
      $('#tagline').value  = d.tagline||'브랜드가 사랑하는 크리에이티브 스튜디오';
      $('#location').value = d.location||'서울 성수동';
      $('#hours').value    = d.hours||'10:00–19:00 (일·공휴일 휴무)';
      $('#phone').value    = d.contact?.phone||'';
      $('#kakaoUrl').value = d.contact?.kakaoUrl||'';
      $('#email').value    = d.contact?.email||'';

      $('#heroImage').value= d.hero?.image||'';
      $('#heroLogo').value = d.hero?.logo||'';
      $('#prevHeroImage').src = d.hero?.image||'';
      $('#prevHeroLogo').src  = d.hero?.logo||'';

      $('#leadDays').value = d.availability?.leadDays ?? 3;
      $('#timeslots').value= (d.availability?.timeslots||[]).join(', ');
      $('#booked').value   = (d.availability?.booked||[]).join(', ');
      $('#closed').value   = (d.availability?.closed||[]).join(', ');

      $('#studioPhotos').value    = (d.studioPhotos||[]).join('\n');
      $('#portfolioPhotos').value = (d.portfolioPhotos||[]).join('\n');

      renderPlans(d.pricing||[]);
      renderShorts(d.shorts||[]);
      renderFaq(d.faq||[]);
      $('#policy').value = d.policy||'';

      say('로드 완료', true);
    }catch(e){ console.warn(e); say('불러오기 실패: '+(e.message||'오류')); }
  }

  async function save(){
    try{
      const body = {
        slug: 'byhen',
        name: $('#name').value.trim(),
        tagline: $('#tagline').value.trim(),
        location: $('#location').value.trim(),
        hours: $('#hours').value.trim(),
        contact: {
          phone: $('#phone').value.trim(),
          kakaoUrl: $('#kakaoUrl').value.trim(),
          email: $('#email').value.trim()
        },
        hero: { image: $('#heroImage').value.trim(), logo: $('#heroLogo').value.trim() },
        pricing: readPlans(),
        availability: {
          leadDays: Number($('#leadDays').value||0),
          timeslots: $('#timeslots').value.split(',').map(s=>s.trim()).filter(Boolean),
          booked: $('#booked').value.split(',').map(s=>s.trim()).filter(Boolean),
          closed: $('#closed').value.split(',').map(s=>s.trim()).filter(Boolean)
        },
        studioPhotos: $('#studioPhotos').value.split('\n').map(s=>s.trim()).filter(Boolean),
        portfolioPhotos: $('#portfolioPhotos').value.split('\n').map(s=>s.trim()).filter(Boolean),
        shorts: readShorts(),
        faq: readFaq(),
        policy: $('#policy').value.trim()
      };

      say('저장 중…');
      const r = await fetch(ENDPOINT, { method:'PUT', headers:HJSON(), body: JSON.stringify(body) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||('HTTP_'+r.status));
      say('저장되었습니다', true);
    }catch(e){ console.warn(e); say('저장 실패: '+(e.message||'오류')); }
  }

  // ---- binds ----
  // 패키지
  els.addPlan.addEventListener('click', ()=>{
    const cur = readPlans(); cur.push({ name:'새 패키지', price:0, duration:'' });
    renderPlans(cur);
  });
  $('#plans').addEventListener('click', (e)=>{
    const x = e.target.closest('.x'); if(!x) return;
    const rows = [...$('#plans').children]; const idx = rows.indexOf(x.closest('.item-row'));
    const cur = readPlans(); cur.splice(idx,1); renderPlans(cur);
  });

  // 숏폼
  els.addShort.addEventListener('click', ()=>{
    const url = els.shortUrl.value.trim(); if(!url) return;
    const p = detect(url); const em = embed(p,url); const th = thumb(p,url);
    const cur = readShorts(); cur.unshift({ provider:p, sourceUrl:url, embedUrl:em, thumbnailUrl:th });
    renderShorts(cur); els.shortUrl.value='';
  });
  els.shortsList.addEventListener('click', (e)=>{
    const x = e.target.closest('.x'); if(!x) return;
    const rows = [...els.shortsList.children]; const idx = rows.indexOf(x.closest('.item-row'));
    const cur = readShorts(); cur.splice(idx,1); renderShorts(cur);
  });

  // FAQ
  els.addFaq.addEventListener('click', ()=>{
    const cur = readFaq(); cur.push({ q:'', a:'' }); renderFaq(cur);
  });
  els.faqList.addEventListener('click', (e)=>{
    const x = e.target.closest('.x'); if(!x) return;
    const rows = [...els.faqList.children]; const idx = rows.indexOf(x.closest('.item-row'));
    const cur = readFaq(); cur.splice(idx,1); renderFaq(cur);
  });

  // 이미지 업로드
  els.upHeroImage.addEventListener('click', ()=> els.fileHeroImage.click());
  els.upHeroLogo.addEventListener('click', ()=> els.fileHeroLogo.click());
  els.fileHeroImage.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{ say('업로드 중…'); const url=await uploadImage(f); $('#heroImage').value=url; $('#prevHeroImage').src=url; say('업로드 완료',true); }
    catch(err){ say('업로드 실패: '+(err.message||'오류')); }
    finally{ e.target.value=''; }
  });
  els.fileHeroLogo.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{ say('업로드 중…'); const url=await uploadImage(f); $('#heroLogo').value=url; $('#prevHeroLogo').src=url; say('업로드 완료',true); }
    catch(err){ say('업로드 실패: '+(err.message||'오류')); }
    finally{ e.target.value=''; }
  });

  // 갤러리 업로드(멀티)
  els.upStudio.addEventListener('click', ()=> els.fileStudio.click());
  els.upPortfolio.addEventListener('click', ()=> els.filePortfolio.click());
  async function uploadMulti(inputEl, targetTextarea){
    const files=[...(inputEl.files||[])].slice(0,20);
    if(!files.length) return;
    say('이미지 업로드 중…');
    const urls=[];
    for(const f of files){
      try{ const u=await uploadImage(f); urls.push(u); }
      catch(e){ console.warn('upload fail', e); }
    }
    const cur = targetTextarea.value.split('\n').map(s=>s.trim()).filter(Boolean);
    targetTextarea.value = [...cur, ...urls].join('\n');
    say('업로드 완료', true); inputEl.value='';
  }
  els.fileStudio.addEventListener('change', ()=>uploadMulti(els.fileStudio, $('#studioPhotos')));
  els.filePortfolio.addEventListener('change', ()=>uploadMulti(els.filePortfolio, $('#portfolioPhotos')));

  // 저장
  $('#adSave').addEventListener('click', (e)=>{ e.preventDefault(); save(); });

  // init
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', load, {once:true}); } else { load(); }
})();