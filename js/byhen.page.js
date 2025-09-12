/* byhen.page.js — v1.0.0 (렌더 + 달력/모달/갤러리/숏폼) */
(function(w){
  'use strict';
  const D = w.BYHEN_DATA || {};

  // ---------- utils ----------
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const on = (el,ev,fn)=>el && el.addEventListener(ev,fn);
  const pad2=(n)=>String(n).padStart(2,'0');
  const fmt=(d)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const money = (n)=>Number(n||0).toLocaleString('ko-KR');

  function toast(msg){
    let t=$('#bhToast'); if(!t){ t=document.createElement('div'); t.id='bhToast'; t.className='bh-toast'; document.body.appendChild(t); }
    t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1600);
  }

  // ---------- hero ----------
  function renderHero(){
    const root = $('#bh-hero'); if(!root) return;
    root.innerHTML = `
      <div class="media" style="${D.hero?.image?`background-image:linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,.08)),url('${D.hero.image}')`:''}"></div>
      <div class="body">
        <div class="row">
          <div class="logo">${ D.hero?.logo ? `<img src="${D.hero.logo}" alt="">` : '' }</div>
          <div>
            <div class="name">${D.name||'BYHEN'}</div>
            <div class="tagline">${D.tagline||''}</div>
          </div>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <span class="bh-chip"><i class="ri-map-pin-2-line"></i>${D.location||''}</span>
          <span class="bh-chip"><i class="ri-time-line"></i>${D.hours||''}</span>
          ${D.contact?.phone?`<a class="bh-chip" href="tel:${D.contact.phone}"><i class="ri-phone-line"></i>${D.contact.phone}</a>`:''}
          ${D.contact?.kakaoUrl?`<a class="bh-chip" href="${D.contact.kakaoUrl}" target="_blank" rel="noopener"><i class="ri-kakao-talk-line"></i>카카오톡</a>`:''}
        </div>
      </div>`;
  }

  // ---------- calendar ----------
  const calState = { ym:new Date(), pickedDate:'', pickedTime:'' };
  function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

  function renderCalendar(){
    const root = $('#bhCalendar'); if(!root) return;
    const y = calState.ym.getFullYear();
    const m = calState.ym.getMonth(); // 0-11
    $('#bhMonTitle').textContent = `${y}-${pad2(m+1)}`;

    const first = new Date(y,m,1);
    const last  = new Date(y,m+1,0);
    const start = addDays(first, -((first.getDay()+6)%7)); // 월요일 시작
    const weeks = 6, days=7;

    const booked = new Set((D.availability?.booked||[]));
    const closed = new Set((D.availability?.closed||[]));
    const lead   = Number(D.availability?.leadDays||0);
    const today  = new Date(); today.setHours(0,0,0,0);
    const earliest = addDays(today, lead);

    const hd = ['월','화','수','목','금','토','일'].map(d=>`<div>${d}</div>`).join('');
    let grid = '';
    for(let i=0;i<weeks*days;i++){
      const d = addDays(start, i);
      const inMon = (d.getMonth()===m);
      const iso = fmt(d);
      const isClosed = closed.has(iso);
      const isBooked = booked.has(iso);
      const isSoon   = d < earliest;
      const ok = inMon && !isClosed && !isBooked && !isSoon;

      const cls = [
        'cell',
        inMon?'':'off',
        isClosed?'off':'',
        isBooked?'booked':'',
        ok?'ok':'',
        (calState.pickedDate===iso)?'sel':''
      ].filter(Boolean).join(' ');

      const dot =
        isClosed ? '<i class="dot off"></i>' :
        isBooked ? '<i class="dot booked"></i>' :
        isSoon   ? '<i class="dot soon"></i>' :
                   '<i class="dot ok"></i>';

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
    const wrap = $('#bhSlots'); wrap.innerHTML = (D.availability?.timeslots||[]).map(t=>{
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

  // lightbox
  function openLightbox(list, idx){
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
        <span class="bh-chip gray"><i class="ri-map-pin-2-line"></i>${D.location||''}</span>
        <span class="bh-chip gray"><i class="ri-time-line"></i>${D.hours||''}</span>
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

  // ---------- modals: inquiry / reserve ----------
  function openModal(kind, payload={}){
    let wrap=$('#bhModal'); if(!wrap){
      wrap=document.createElement('div'); wrap.id='bhModal'; wrap.className='bh-modal';
      document.body.appendChild(wrap);
    }
    if(kind==='inquiry'){
      wrap.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-label="문의하기">
          <header><strong>문의하기</strong><button class="x" aria-label="닫기">✕</button></header>
          <div class="bh-field"><label class="bh-label">문의 유형</label>
            <select id="inqType" class="bh-input">
              <option>일반 문의</option><option>견적 문의</option><option>촬영 문의</option><option>기타</option>
            </select>
          </div>
          <div class="bh-field"><label class="bh-label">이름</label><input id="inqName" class="bh-input" placeholder="이름"></div>
          <div class="bh-field"><label class="bh-label">연락처</label><input id="inqPhone" class="bh-input" placeholder="010-0000-0000"></div>
          <div class="bh-field"><label class="bh-label">메시지</label><textarea id="inqMsg" class="bh-textarea" placeholder="문의 내용을 남겨주세요."></textarea></div>
          <div class="bh-actions">
            ${D.contact?.kakaoUrl?`<a class="bh-btn ghost" target="_blank" rel="noopener" href="${D.contact.kakaoUrl}"><i class="ri-kakao-talk-line"></i> 카카오톡</a>`:''}
            <button class="bh-btn pri" id="inqSubmit"><i class="ri-send-plane-line"></i> 보내기</button>
          </div>
        </div>`;
      const close=()=>wrap.classList.remove('show');
      on($('.x',wrap),'click',close);
      on(wrap,'click',e=>{ if(e.target===wrap) close(); });
      on($('#inqSubmit',wrap),'click',()=>{
        const name=$('#inqName').value.trim(), phone=$('#inqPhone').value.trim();
        if(!name||!phone){ toast('이름/연락처를 입력해주세요'); return; }
        close(); toast('문의가 전달되었습니다');
      });
      wrap.classList.add('show');
    }
    if(kind==='reserve'){
      const date = payload.date||calState.pickedDate||'-';
      const time = payload.time||calState.pickedTime||'';
      wrap.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-label="예약 요청">
          <header><strong>예약 요청</strong><button class="x" aria-label="닫기">✕</button></header>
          <div class="bh-field"><label class="bh-label">예약일자</label>
            <input id="rvDate" class="bh-input" value="${date}" readonly>
          </div>
          <div class="bh-field"><label class="bh-label">시간</label>
            <input id="rvTime" class="bh-input" value="${time}" placeholder="예: 14:00">
          </div>
          <div class="bh-field"><label class="bh-label">이름</label><input id="rvName" class="bh-input" placeholder="이름"></div>
          <div class="bh-field"><label class="bh-label">연락처</label><input id="rvPhone" class="bh-input" placeholder="010-0000-0000"></div>
          <div class="bh-field"><label class="bh-label">요청사항 (선택)</label><textarea id="rvMsg" class="bh-textarea" placeholder="세부 요청을 남겨주세요."></textarea></div>
          <div class="bh-actions">
            <button class="bh-btn" id="rvCancel">취소</button>
            <button class="bh-btn pri" id="rvSubmit"><i class="ri-calendar-check-line"></i> 요청 보내기</button>
          </div>
        </div>`;
      const close=()=>wrap.classList.remove('show');
      on($('.x',wrap),'click',close);
      on($('#rvCancel',wrap),'click',close);
      on(wrap,'click',e=>{ if(e.target===wrap) close(); });
      on($('#rvSubmit',wrap),'click',()=>{
        const name=$('#rvName').value.trim(), phone=$('#rvPhone').value.trim();
        if(!name||!phone){ toast('이름/연락처를 입력해주세요'); return; }
        close(); toast('예약 요청이 접수되었습니다');
      });
      wrap.classList.add('show');
    }
  }

  // ---------- init ----------
  function init(){
    renderHero();
    renderCalendar(); bindCalendar(); renderSlots();
    renderPricing();
    renderGallery(); bindGallery();
    renderShorts();
    renderInfo(); renderFAQ();

    // CTA
    on($('#bhOpenInquiry'),'click',()=>openModal('inquiry'));
    on($('#bhOpenReserveBottom'),'click',()=>openModal('reserve'));
    on($('#bhOpenReserve'),'click',()=>openModal('reserve', {date:calState.pickedDate, time:calState.pickedTime}));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})(window);