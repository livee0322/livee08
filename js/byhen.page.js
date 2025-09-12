/* byhen.page.js — v1.3.0 (멀티 히어로, 별점, 섹션 재배치) */
(function(w){
  'use strict';

  // ---------- config / data load ----------
  const CFG = w.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/,'');
  const QS = new URLSearchParams(location.search);
  const SLUG = (QS.get('slug') || 'byhen').trim().toLowerCase();
  const ID   = (QS.get('id') || '').trim();

  let D = {}; // 페이지 데이터
  let heroIdx = 0; let heroTimer = 0;

  async function fetchJSON(url){
    const r = await fetch(url, { headers:{ Accept:'application/json' }});
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }
  async function loadData(){
    try{
      if(ID){ const j=await fetchJSON(`${API_BASE}/brands-test/${encodeURIComponent(ID)}`); return j.data||j; }
      const j1=await fetchJSON(`${API_BASE}/brands-test?slug=${encodeURIComponent(SLUG)}&limit=1`);
      const items1 = j1.items||j1.data||j1.docs||[];
      if(Array.isArray(items1) && items1.length) return items1[0];

      const j2=await fetchJSON(`${API_BASE}/brands-test?limit=1`);
      const items2 = j2.items||j2.data||j2.docs||[];
      if(Array.isArray(items2) && items2.length) return items2[0];
    }catch(_){}
    return (w.BYHEN_DATA || {});
  }

  // ---------- utils ----------
  const $ = (s,el=document)=>el.querySelector(s);
  const on = (el,ev,fn)=>el && el.addEventListener(ev,fn);
  const pad2=(n)=>String(n).padStart(2,'0');
  const fmt=(d)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const money = (n)=>Number(n||0).toLocaleString('ko-KR');

  function toast(msg){
    let t=$('#bhToast'); if(!t){ t=document.createElement('div'); t.id='bhToast'; t.className='bh-toast'; document.body.appendChild(t); }
    t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1600);
  }

  // ---------- HERO (multi images) ----------
  function collectHeroImages(){
    // 우선순위: hero.images → hero.image → studioPhotos 앞부분
    const arr = [];
    if (Array.isArray(D.hero?.images)) arr.push(...D.hero.images);
    if (D.hero?.image) arr.unshift(D.hero.image);
    if (arr.length===0 && Array.isArray(D.studioPhotos)) arr.push(...D.studioPhotos.slice(0,6));
    // 중복 제거/빈값 필터
    return [...new Set(arr.filter(Boolean))];
  }

  function renderHero(){
    const root = $('#bh-hero'); if(!root) return;
    const imgs = collectHeroImages();
    const name = D.name || 'BYHEN';
    const tag  = D.tagline || '';

    let slides = imgs.map((src,i)=>`<img alt="hero-${i}" ${i===0?'class="show"':''} src="${src}">`).join('');
    let thumbs = imgs.map((src,i)=>`<img ${i===0?'class="sel"':''} data-i="${i}" src="${src}" alt="thumb-${i}">`).join('');

    root.innerHTML = `
      <div class="slides">${slides}</div>
      <div class="overlay">
        <div>
          <div class="title">${name}</div>
          ${tag?`<div class="tag">${tag}</div>`:''}
        </div>
      </div>
      <div class="thumbs">${thumbs}</div>
    `;

    // 인터랙션
    const slideEls = [...root.querySelectorAll('.slides img')];
    const thumbEls = [...root.querySelectorAll('.thumbs img')];

    function go(n){
      heroIdx = (n+slideEls.length)%slideEls.length;
      slideEls.forEach((el,i)=>el.classList.toggle('show', i===heroIdx));
      thumbEls.forEach((el,i)=>el.classList.toggle('sel',  i===heroIdx));
    }
    on(root.querySelector('.thumbs'),'click', (e)=>{
      const t=e.target.closest('img[data-i]'); if(!t) return;
      go(Number(t.dataset.i)||0); restartAuto();
    });

    function restartAuto(){
      clearInterval(heroTimer);
      if(slideEls.length>1){
        heroTimer = setInterval(()=>go(heroIdx+1), 4500);
      }
    }
    restartAuto();
  }

  // ---------- INFO + RATING ----------
  function starHtml(avg=0){
    const full = Math.floor(avg);
    const half = (avg - full) >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return [
      ...Array(full).fill('<i class="ri-star-fill"></i>'),
      ...Array(half).fill('<i class="ri-star-half-line"></i>'),
      ...Array(empty).fill('<i class="ri-star-line dim"></i>')
    ].join('');
  }
  function renderInfo(){
    const r = $('#bhInfo'); if(!r) return;
    const rating = D.rating || {}; // {avg, count}
    r.innerHTML = `
      <div class="bh-card">
        <div class="bh-rating">
          <span class="stars" aria-label="평점 ${rating.avg||'-'}">${starHtml(rating.avg||0)}</span>
          <span>${(rating.avg||'-')} (${rating.count||0})</span>
        </div>
        <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${D.location?`<span class="bh-chip gray"><i class="ri-map-pin-2-line"></i>${D.location}</span>`:''}
          ${D.hours?`<span class="bh-chip gray"><i class="ri-time-line"></i>${D.hours}</span>`:''}
          ${D.contact?.phone?`<a class="bh-chip gray" href="tel:${D.contact.phone}"><i class="ri-phone-line"></i>${D.contact.phone}</a>`:''}
          ${D.contact?.kakaoUrl?`<a class="bh-chip gray" href="${D.contact.kakaoUrl}" target="_blank" rel="noopener"><i class="ri-kakao-talk-line"></i>카카오톡</a>`:''}
        </div>
      </div>
    `;
  }

  // ---------- DESC / RULES / LOCATION ----------
  function renderDesc(){ $('#bhDesc').textContent = D.description || (D.policy? '':'소개가 준비 중입니다.'); }
  function renderRules(){ $('#bhRules').textContent = D.rules || D.policy || ''; }
  function renderLocation(){
    const wrap = $('#bhLocation'); if(!wrap) return;
    const map = D.map || {};
    // 우선순위: iframe(embedUrl) → 정적 이미지(staticImage) → 네이버/카카오 링크
    if(map.embedUrl){
      wrap.innerHTML = `<div class="map" style="overflow:hidden;border-radius:10px">
        <iframe src="${map.embedUrl}" style="border:0;width:100%;height:280px" loading="lazy"></iframe>
      </div>
      <p style="color:#6b7280;margin-top:8px">자세한 주소는 예약 확정 후에 안내됩니다.</p>`;
    }else if(map.staticImage){
      wrap.innerHTML = `<img src="${map.staticImage}" alt="map" style="width:100%;border-radius:10px">
      <p style="color:#6b7280;margin-top:8px">자세한 주소는 예약 확정 후에 안내됩니다.</p>`;
    }else{
      const link = map.link || 'https://map.naver.com/';
      wrap.innerHTML = `<a class="bh-btn ghost" href="${link}" target="_blank" rel="noopener"><i class="ri-map-2-line"></i> 지도에서 보기</a>
      <p style="color:#6b7280;margin-top:8px">자세한 주소는 예약 확정 후에 안내됩니다.</p>`;
    }
  }

  // ---------- CALENDAR ----------
  const calState = { ym:new Date(), pickedDate:'', pickedTime:'' };
  const addDays=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };

  function renderCalendar(){
    const root = $('#bhCalendar'); if(!root) return;
    const y = calState.ym.getFullYear(), m=calState.ym.getMonth();
    $('#bhMonTitle').textContent = `${y}-${pad2(m+1)}`;
    const first = new Date(y,m,1), start = addDays(first, -((first.getDay()+6)%7));
    const booked = new Set(D.availability?.booked||[]);
    const closed = new Set(D.availability?.closed||[]);
    const lead   = Number(D.availability?.leadDays||0);
    const today  = new Date(); today.setHours(0,0,0,0);
    const earliest = addDays(today, lead);

    let grid=''; const weeks=6, days=7;
    for(let i=0;i<weeks*days;i++){
      const d=addDays(start,i), inMon=(d.getMonth()===m), iso=fmt(d);
      const isClosed=closed.has(iso), isBooked=booked.has(iso), isSoon=d<earliest;
      const ok=inMon && !isClosed && !isBooked && !isSoon;
      const cls=['cell',inMon?'':'off',isClosed?'off':'',isBooked?'booked':'',ok?'ok':'',(calState.pickedDate===iso)?'sel':''].filter(Boolean).join(' ');
      const dot=isClosed?'<i class="dot off"></i>':isBooked?'<i class="dot booked"></i>':isSoon?'<i class="dot soon"></i>':'<i class="dot ok"></i>';
      grid += `<div class="${cls}" data-iso="${iso}"><span class="d">${d.getDate()}</span>${inMon?dot:''}</div>`;
    }
    root.innerHTML = `<div class="hd">${['월','화','수','목','금','토','일'].map(d=>`<div>${d}</div>`).join('')}</div><div class="grid">${grid}</div>`;
  }
  function bindCalendar(){
    on($('#bhPrevMon'),'click',()=>{ calState.ym.setMonth(calState.ym.getMonth()-1); renderCalendar(); });
    on($('#bhNextMon'),'click',()=>{ calState.ym.setMonth(calState.ym.getMonth()+1); renderCalendar(); });
    on($('#bhCalendar'),'click',(e)=>{
      const cell=e.target.closest('.cell.ok'); if(!cell) return;
      calState.pickedDate = cell.dataset.iso; calState.pickedTime='';
      renderCalendar(); renderSlots();
    });
  }
  function renderSlots(){
    const card=$('#bhSlotCard'); if(!card) return;
    if(!calState.pickedDate){ card.hidden=true; return; }
    $('#bhPickedDate').textContent=calState.pickedDate;
    const wrap=$('#bhSlots'); const slots=(D.availability?.timeslots||[]);
    wrap.innerHTML = slots.map(t=>{
      const sel=(calState.pickedTime===t)?'is-sel':'';
      return `<button class="bh-chip2 ${sel}" data-t="${t}" type="button">${t}</button>`;
    }).join('');
    card.hidden=false; $('#bhOpenReserve').disabled=!calState.pickedTime;
    on(wrap,'click',(e)=>{
      const b=e.target.closest('.bh-chip2'); if(!b) return;
      calState.pickedTime=b.dataset.t;
      [...wrap.children].forEach(x=>x.classList.toggle('is-sel',x===b));
      $('#bhOpenReserve').disabled=false;
    });
  }

  // ---------- PRICING ----------
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

  // ---------- GALLERY / SHORTS (기존 유지) ----------
  function renderGallery(){
    const root = $('#bhGallery'); if(!root) return;
    const list = (D.studioPhotos||[]).concat(D.portfolioPhotos||[]);
    root.innerHTML = list.map((src,i)=>`<img src="${src}" alt="gallery-${i}" loading="lazy">`).join('');
  }
  function renderShorts(){
    const root = $('#bhShorts'); if(!root) return;
    const items = (D.shorts||[]).filter(s=>s.embedUrl);
    root.innerHTML = items.map(s=>`
      <article class="bh-clip" data-embed="${s.embedUrl}">
        <img src="${s.thumbnailUrl||''}" alt=""><span class="play"><i class="ri-play-fill"></i></span>
      </article>
    `).join('') || '<div style="color:#64748b">클립이 없습니다.</div>';
  }

  // ---------- modals (문의/예약) ----------
  function openModal(kind, payload={}){
    let wrap=$('#bhModal'); if(!wrap){ wrap=document.createElement('div'); wrap.id='bhModal'; wrap.className='bh-modal'; document.body.appendChild(wrap); }
    if(kind==='inquiry'){
      wrap.innerHTML = `<div class="sheet"><header><strong>문의하기</strong><button class="x">✕</button></header>
        <div class="bh-field"><label class="bh-label">이름</label><input id="inqName" class="bh-input" placeholder="이름"></div>
        <div class="bh-field"><label class="bh-label">연락처</label><input id="inqPhone" class="bh-input" placeholder="010-0000-0000"></div>
        <div class="bh-field"><label class="bh-label">메시지</label><textarea id="inqMsg" class="bh-textarea" placeholder="문의 내용을 남겨주세요."></textarea></div>
        <div class="bh-actions">
          ${D.contact?.kakaoUrl?`<a class="bh-btn ghost" target="_blank" rel="noopener" href="${D.contact.kakaoUrl}"><i class="ri-kakao-talk-line"></i> 카카오톡</a>`:''}
          <button class="bh-btn pri" id="inqSubmit"><i class="ri-send-plane-line"></i> 보내기</button>
        </div></div>`;
      const close=()=>wrap.classList.remove('show');
      on(wrap.querySelector('.x'),'click',close);
      on(wrap,'click',e=>{ if(e.target===wrap) close(); });
      on($('#inqSubmit',wrap),'click',()=>{ const n=$('#inqName').value.trim(), p=$('#inqPhone').value.trim(); if(!n||!p){ toast('이름/연락처를 입력해주세요'); return; } close(); toast('문의가 전달되었습니다'); });
      wrap.classList.add('show');
    }
    if(kind==='reserve'){
      const date = payload.date||calState.pickedDate||'-';
      const time = payload.time||calState.pickedTime||'';
      wrap.innerHTML = `<div class="sheet"><header><strong>예약 요청</strong><button class="x">✕</button></header>
        <div class="bh-field"><label class="bh-label">예약일자</label><input id="rvDate" class="bh-input" value="${date}" readonly></div>
        <div class="bh-field"><label class="bh-label">시간</label><input id="rvTime" class="bh-input" value="${time}" placeholder="예: 14:00"></div>
        <div class="bh-field"><label class="bh-label">이름</label><input id="rvName" class="bh-input" placeholder="이름"></div>
        <div class="bh-field"><label class="bh-label">연락처</label><input id="rvPhone" class="bh-input" placeholder="010-0000-0000"></div>
        <div class="bh-field"><label class="bh-label">요청사항 (선택)</label><textarea id="rvMsg" class="bh-textarea" placeholder="세부 요청을 남겨주세요."></textarea></div>
        <div class="bh-actions"><button class="bh-btn" id="rvCancel">취소</button><button class="bh-btn pri" id="rvSubmit"><i class="ri-calendar-check-line"></i> 요청 보내기</button></div></div>`;
      const close=()=>wrap.classList.remove('show');
      on(wrap.querySelector('.x'),'click',close); on($('#rvCancel',wrap),'click',close);
      on(wrap,'click',e=>{ if(e.target===wrap) close(); });
      on($('#rvSubmit',wrap),'click',()=>{ const n=$('#rvName').value.trim(), p=$('#rvPhone').value.trim(); if(!n||!p){ toast('이름/연락처를 입력해주세요'); return; } close(); toast('예약 요청이 접수되었습니다'); });
      wrap.classList.add('show');
    }
  }

  // ---------- init ----------
  async function init(){
    try{
      D = await loadData(); w.BYHEN_DATA = D;
    }catch(e){ console.warn('[byhen load error]', e); D = w.BYHEN_DATA || {}; }

    renderHero();
    renderInfo();
    renderDesc(); renderRules(); renderLocation();

    renderCalendar(); bindCalendar(); renderSlots();
    renderPricing();
    renderGallery();
    renderShorts();

    on($('#bhOpenInquiry'),'click',()=>openModal('inquiry'));
    on($('#bhOpenReserveBottom'),'click',()=>openModal('reserve'));
    on($('#bhOpenReserve'),'click',()=>openModal('reserve', {date:calState.pickedDate, time:calState.pickedTime}));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})(window);