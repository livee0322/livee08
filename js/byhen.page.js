/* byhen.page.js — v1.1.2 (fix: duplicate 'money', robust slug/id load) */
(function(w){
  'use strict';

  // ---------- config ----------
  const CFG = w.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const QS = new URLSearchParams(location.search);
  const SLUG = (QS.get('slug') || 'byhen').trim().toLowerCase();
  const ID   = (QS.get('id') || '').trim();

  let D = {}; // 전역 데이터

  // ---------- helpers ----------
  const $  = (s,el=document)=>el.querySelector(s);
  const on = (el,ev,fn)=>el && el.addEventListener(ev,fn);
  const pad2=(n)=>String(n).padStart(2,'0');
  const fmt=(d)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const money = (n)=>Number(n||0).toLocaleString('ko-KR'); // ✅ 한 번만 선언

  function toast(msg){
    let t=$('#bhToast'); if(!t){ t=document.createElement('div'); t.id='bhToast'; t.className='bh-toast'; document.body.appendChild(t); }
    t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1600);
  }

  // 응답 객체 → 단일 문서로 언래핑
  function unwrapDoc(j){
    if (!j) return null;
    const list = j.items || j.docs || (Array.isArray(j.data) ? j.data : null);
    if (Array.isArray(list) && list.length) return list[0];
    return j.data || j; // {data: {...}} 또는 그냥 {...}
  }
  async function fetchJSON(url){
    const r = await fetch(url, { headers:{ Accept:'application/json' }});
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }

  // ---------- load ----------
  async function loadData(){
    // id 우선
    if (ID) {
      try {
        const j = await fetchJSON(`${API_BASE}/brands-test/${encodeURIComponent(ID)}`);
        const doc = unwrapDoc(j); if (doc) return doc;
      } catch(_) {}
    }
    // slug 우선
    try {
      const j = await fetchJSON(`${API_BASE}/brands-test?slug=${encodeURIComponent(SLUG)}&limit=1`);
      const doc = unwrapDoc(j); if (doc) return doc;
    } catch(_) {}
    // 폴백: 첫 문서
    try {
      const j = await fetchJSON(`${API_BASE}/brands-test?limit=1`);
      const doc = unwrapDoc(j); if (doc) return doc;
    } catch(_) {}
    // 최종 폴백: 정적
    return (w.BYHEN_DATA || {});
  }

  // ---------- hero ----------
  function renderHero(){
    const root = $('#bh-hero'); if(!root) return;
    const img = (D.hero && typeof D.hero.image==='string') ? D.hero.image : '';
    const logo= (D.hero && typeof D.hero.logo==='string')  ? D.hero.logo  : '';
    const bg = img ? `background-image:linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,.08)),url('${img}')` : '';
    root.innerHTML = `
      <div class="media" style="${bg}"></div>
      <div class="body">
        <div class="row">
          <div class="logo">${ logo ? `<img src="${logo}" alt="">` : '' }</div>
          <div>
            <div class="name">${D.name||'BYHEN'}</div>
            <div class="tagline">${D.tagline||''}</div>
          </div>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          ${D.location?`<span class="bh-chip"><i class="ri-map-pin-2-line"></i>${D.location}</span>`:''}
          ${D.hours?`<span class="bh-chip"><i class="ri-time-line"></i>${D.hours}</span>`:''}
          ${D.contact?.phone?`<a class="bh-chip" href="tel:${D.contact.phone}"><i class="ri-phone-line"></i>${D.contact.phone}</a>`:''}
          ${D.contact?.kakaoUrl?`<a class="bh-chip" href="${D.contact.kakaoUrl}" target="_blank" rel="noopener"><i class="ri-kakao-talk-line"></i>카카오톡</a>`:''}
        </div>
      </div>`;
  }

  // ---------- calendar ----------
  const calState = { ym:new Date(), pickedDate:'', pickedTime:'' };
  const addDays=(d, n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };

  function renderCalendar(){
    const root = $('#bhCalendar'); if(!root) return;
    const y = calState.ym.getFullYear();
    const m = calState.ym.getMonth();
    $('#bhMonTitle').textContent = `${y}-${pad2(m+1)}`;

    const first = new Date(y,m,1);
    const start = addDays(first, -((first.getDay()+6)%7)); // 월요일 시작
    const weeks = 6, days=7;

    const booked = new Set(D.availability?.booked||[]);
    const closed = new Set(D.availability?.closed||[]);
    const lead   = Number(D.availability?.leadDays||0);
    const today  = new Date(); today.setHours(0,0,0,0);
    const earliest = addDays(today, lead);

    const hd = ['월','화','수','목','금','토','일'].map(d=>`<div>${d}</div>`).join('');
    let grid = '';
    for(let i=0;i<weeks*days;i++){
      const d = addDays(start, i);
      const inMon = (d.getMonth()===calState.ym.getMonth());
      const iso = fmt(d);
      const isClosed = closed.has(iso);
      const isBooked = booked.has(iso);
      const isSoon   = d < earliest;
      const ok = inMon && !isClosed && !isBooked && !isSoon;

      const cls = ['cell', inMon?'':'off', isClosed?'off':'', isBooked?'booked':'', ok?'ok':'', (calState.pickedDate===iso)?'sel':''].filter(Boolean).join(' ');
      const dot = isClosed ? '<i class="dot off"></i>' : isBooked ? '<i class="dot booked"></i>' : isSoon ? '<i class="dot soon"></i>' : '<i class="dot ok"></i>';
      grid += `<div class="${cls}" data-iso="${iso}"><span class="d">${d.getDate()}</span>${inMon?dot:''}</div>`;
    }
    root.innerHTML = `<div class="hd">${hd}</div><div class="grid">${grid}</div>`;
  }
  function bindCalendar(){
    on($('#bhPrevMon'),'click',()=>{ calState.ym.setMonth(calState.ym.getMonth()-1); renderCalendar(); });
    on($('#bhNextMon'),'click',()=>{ calState.ym.setMonth(calState.ym.getMonth()+1); renderCalendar(); });
    on($('#bhCalendar'),'click', (e)=>{
      const cell=e.target.closest('.cell.ok'); if(!cell) return;
      calState.pickedDate = cell.dataset.iso;
      calState.pickedTime = '';
      renderCalendar();
      renderSlots();
    });
  }
  function renderSlots(){
    const card = $('#bhSlotCard'); if(!card) return;
    if(!calState.pickedDate){ card.hidden = true; return; }
    $('#bhPickedDate').textContent = calState.pickedDate;
    const wrap = $('#bhSlots'); const slots = (D.availability?.timeslots||[]);
    wrap.innerHTML = slots.map(t=>{
      const sel = (calState.pickedTime===t)?'is-sel':'';
      return `<button type="button" class="bh-chip2 ${sel}" data-t="${t}">${t}</button>`;
    }).join('');
    card.hidden=false;
    $('#bhOpenReserve').disabled = !calState.pickedTime;

    on(wrap,'click',(e)=>{
      const b=e.target.closest('.bh-chip2'); if(!b) return;
      calState.pickedTime=b.dataset.t;
      [...wrap.children].forEach(x=>x.classList.toggle('is-sel',x===b));
      $('#bhOpenReserve').disabled = false;
    });
  }

  // ---------- pricing ----------
  function renderPricing(){
    const root = $('#bhPricing'); if(!root) return;
    const html = (D.pricing||[]).map(p=>`
      <article class="bh-plan">
        ${p.badge?`<span class="badge">${p.badge}</span>`:''}
        <div class="name">${p.name} · <span style="color:#64748b">${p.duration||''}</span></div>
        <div class="price">${money(p.price)}원</div>
        ${Array.isArray(p.includes)?`<ul>${p.includes.map(i=>`<li>${i}</li>`).join('')}</ul>`:''}
        ${Array.isArray(p.options)&&p.options.length?`<div class="opt"><b>옵션</b> · ${p.options.map(o=>`${o.name} +${money(o.price)}원`).join(' / ')}</div>`:''}
      </article>
    `).join('');
    root.innerHTML = html || '<div style="color:#64748b">준비 중입니다.</div>';
  }

  // ---------- gallery ----------
  const galState = { tab:'studio', list:[] };
  function renderGallery(){
    const root = $('#bhGallery'); if(!root) return;
    galState.list = (galState.tab==='studio') ? (D.studioPhotos||[]) : (D.portfolioPhotos||[]);
    root.innerHTML = galState.list.map((src,i)=>`<img src="${src}" alt="gallery-${i}" data-i="${i}" loading="lazy">`).join('');
  }
  function bindGallery(){
    const tabs = $('#bhGalTabs');
    on(tabs,'click',(e)=>{
      const btn=e.target.closest('button'); if(!btn) return;
      tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('is-active', b===btn));
      galState.tab = btn.dataset.tab;
      renderGallery();
    });

    const root = $('#bhGallery');
    on(root,'click',(e)=>{
      const img=e.target.closest('img'); if(!img) return;
      openLightbox(galState.list, Number(img.dataset.i)||0);
    });
  }
  function openLightbox(list, idx){
    if(!list.length) return;
    let wrap=$('#bhLightbox');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='bhLightbox'; wrap.className='bh-lightbox';
      wrap.innerHTML = `<button class="x" aria-label="닫기"><i class="ri-close-line"></i></button><img alt="">`;
      document.body.appendChild(wrap);
      on($('.x',wrap),'click',()=>wrap.classList.remove('show'));
      on(wrap,'click',e=>{ if(e.target===wrap) wrap.classList.remove('show'); });
      on(wrap,'keydown',e=>{
        if(e.key==='Escape') wrap.classList.remove('show');
        if(e.key==='ArrowRight'){ idx=(idx+1)%list.length; $('img',wrap).src=list[idx]; }
        if(e.key==='ArrowLeft'){ idx=(idx-1+list.length)%list.length; $('img',wrap).src=list[idx]; }
      });
    }
    $('img',wrap).src=list[idx];
    wrap.classList.add('show'); wrap.focus();
  }

  // ---------- shorts ----------
  function renderShorts(){
    const root = $('#bhShorts'); if(!root) return;
    const items = (D.shorts||[]).filter(s=>s.embedUrl);
    root.innerHTML = items.map(s=>`
      <article class="bh-clip" data-embed="${s.embedUrl}">
        <img src="${s.thumbnailUrl||''}" alt="">
        <span class="play"><i class="ri-play-fill"></i></span>
      </article>
    `).join('') || '<div style="color:#64748b">클립이 없습니다.</div>';

    ensureClipModal();
    on(root,'click',(e)=>{
      const card=e.target.closest('.bh-clip'); if(!card) return;
      w.__openBhClip(card.dataset.embed);
    });
  }
  function ensureClipModal(){
    if($('#bhClipModal')) return;
    const wrap=document.createElement('div');
    wrap.id='bhClipModal'; wrap.className='bh-clip-modal';
    wrap.innerHTML = `<div class="inner"><button class="x" aria-label="닫기"><i class="ri-close-line"></i></button>
      <iframe id="bhClipFrame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    document.body.appendChild(wrap);
    const close=()=>{ $('#bhClipFrame').src='about:blank'; wrap.classList.remove('show'); document.documentElement.style.overflow=''; };
    on($('.x',wrap),'click',close);
    on(wrap,'click',e=>{ if(e.target===wrap) close(); });
    w.__openBhClip = (src)=>{ if(!src) return; $('#bhClipFrame').src=src; wrap.classList.add('show'); document.documentElement.style.overflow='hidden'; };
  }

  // ---------- info / faq ----------
  function renderInfo(){
    const r = $('#bhInfo'); if(!r) return;
    r.innerHTML = `
      <div class="row">
        ${D.location?`<span class="bh-chip gray"><i class="ri-map-pin-2-line"></i>${D.location}</span>`:''}
        ${D.hours?`<span class="bh-chip gray"><i class="ri-time-line"></i>${D.hours}</span>`:''}
        ${D.contact?.phone?`<a class="bh-chip gray" href="tel:${D.contact.phone}"><i class="ri-phone-line"></i>${D.contact.phone}</a>`:''}
        ${D.contact?.kakaoUrl?`<a class="bh-chip gray" href="${D.contact.kakaoUrl}" target="_blank" rel="noopener"><i class="ri-kakao-talk-line"></i>카카오톡</a>`:''}
      </div>
      <div style="margin-top:8px">
        <a class="bh-btn ghost" href="https://map.naver.com/" target="_blank" rel="noopener"><i class="ri-map-2-line"></i> 지도에서 보기</a>
      </div>
    `;
  }
  function renderFAQ(){
    const r = $('#bhFAQ'); if(!r) return;
    const items = (D.faq||[]).map(f=>`<div class="item"><div class="q">Q. ${f.q}</div><div class="a">${f.a}</div></div>`).join('');
    r.innerHTML = items + (D.policy?`<div class="item"><div class="q">정책</div><div class="a">${D.policy}</div></div>`:'');
  }

  // ---------- init ----------
  async function init(){
    try{
      D = await loadData();
      w.BYHEN_DATA = D; // 외부 참고용
    }catch(e){
      console.warn('[byhen load error]', e);
      toast('데이터를 불러오지 못했습니다. 기본값으로 표시합니다.');
      D = w.BYHEN_DATA || {};
    }

    renderHero();
    renderCalendar(); bindCalendar(); renderSlots();
    renderPricing();
    renderGallery(); bindGallery();
    renderShorts();
    renderInfo(); renderFAQ();

    on($('#bhOpenInquiry'),'click',()=>openModal('inquiry'));
    on($('#bhOpenReserveBottom'),'click',()=>openModal('reserve'));
    on($('#bhOpenReserve'),'click',()=>openModal('reserve', {date:calState.pickedDate, time:calState.pickedTime}));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})(window);