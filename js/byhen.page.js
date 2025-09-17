/* byhen.page.js — v1.4.0
   - Hero 슬라이드
   - 정보/패키지/갤러리/숏폼 렌더
   - 예약 모달(달력+타임슬롯) */
(function (w){
  'use strict';

  // --- 임시 데이터 폴백 (byhen.data.js가 있으면 그걸 사용) ---
  const D = w.BYHEN_DATA || {
    name: 'BYHEN',
    tagline: '제품 · 뷰티 · 패션 촬영 대행',
    rating: 4.9,
    ratingCount: 124,
    phone: '01012345678',
    open: '09시~18시',
    area: '대전',
    chips: ['제품', '뷰티', '패션', '촬영대행'],
    images: ['banner1.jpg','banner2.jpg','default.jpg'],
    desc: '소개 텍스트가 여기에 들어갑니다.',
    rules: '규칙 텍스트가 여기에 들어갑니다.',
    locationHtml: '<a href="https://map.naver.com/" target="_blank" rel="noopener">지도 열기</a>',
    plans: [
      { name:'Basic', price: '64,000원/시간', badge:'인기', items:['스튜디오 사용','간단 보정']},
      { name:'Pro',   price: '120,000원/시간', items:['조명 포함','포트레이트'] }
    ],
    gallery: [],
    shorts: []
  };

  // 유틸
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const fmtYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const pad2   = (n) => String(n).padStart(2,'0');

  // ---------------- Hero ----------------
  function mountHero(root){
    const imgs = (D.images||[]).filter(Boolean);
    const html = `
      <div class="slides">
        ${imgs.map((src,i)=>`<img src="${src}" alt="" class="${i? '':'show'}">`).join('')}
      </div>
      <div class="overlay">
        <div>
          <div class="title">${D.name||'브랜드'}</div>
          <div class="tag">${D.tagline||''}</div>
        </div>
      </div>
      <div class="thumbs">
        ${imgs.map((src,i)=>`<img src="${src}" alt="" data-i="${i}" class="${i? '':'sel'}">`).join('')}
      </div>
    `;
    root.insertAdjacentHTML('beforeend', html);

    const slides = $$('.slides img', root);
    const thumbs = $$('.thumbs img', root);
    let i = 0, n = slides.length;
    const go = (k) => {
      i = (k+n)%n;
      slides.forEach((im,idx)=> im.classList.toggle('show', idx===i));
      thumbs.forEach((th,idx)=> th.classList.toggle('sel', idx===i));
    };
    thumbs.forEach(th => th.addEventListener('click', ()=> go(+th.dataset.i)));
    if(n > 1){
      setInterval(()=> go(i+1), 5000);
    }
  }

  // ---------------- Info ----------------
  function mountInfo(root){
    const ratingStars = (() =>{
      const score = Math.round((D.rating||0)*2)/2;
      const stars = Array.from({length:5}, (_,i)=> i+1 <= Math.floor(score) ? 'ri-star-fill'
                      : (i+0.5===score ? 'ri-star-half-line':'ri-star-line'));
      return `<span class="stars">${stars.map(c=>`<i class="${c}"></i>`).join('')}</span>`;
    })();

    root.innerHTML = `
      <div class="bh-card bh-info">
        <div class="row">
          <span class="bh-chip soft"><i class="ri-map-pin-line"></i>${D.area||'-'}</span>
          <span class="bh-chip soft"><i class="ri-time-line"></i>${D.open||'-'}</span>
          <span class="bh-chip soft"><i class="ri-phone-line"></i>${D.phone||'-'}</span>
          <a class="bh-chip soft" href="https://pf.kakao.com/" target="_blank" rel="noopener"><i class="ri-kakao-talk-line"></i>카카오톡</a>
        </div>
        <div class="bh-rating">${ratingStars}<span>${(D.rating||0).toFixed(1)} · ${D.ratingCount||0} reviews</span></div>
        <div class="row">
          ${(D.chips||[]).slice(0,6).map(t=>`<span class="bh-chip soft">${t}</span>`).join('')}
        </div>
      </div>
    `;

    $('#bhDesc').textContent  = D.desc || '';
    $('#bhRules').textContent = D.rules || '';
    $('#bhLocation').innerHTML = D.locationHtml || '-';
  }

  // ---------------- Pricing ----------------
  function mountPricing(){
    const wrap = $('#bhPricing');
    wrap.innerHTML = (D.plans||[]).map(p => `
      <article class="bh-plan">
        ${p.badge ? `<span class="badge">${p.badge}</span>`:''}
        <div class="name">${p.name}</div>
        <div class="price">${p.price}</div>
        ${Array.isArray(p.items) ? `<ul>${p.items.map(i=>`<li>${i}</li>`).join('')}</ul>` : ''}
        ${p.opt ? `<div class="opt">${p.opt}</div>`:''}
      </article>
    `).join('');
  }

  // ---------------- Gallery / Shorts ----------------
  function mountGallery(){
    const g = $('#bhGallery');
    const arr = D.gallery && D.gallery.length ? D.gallery : (D.images||[]);
    g.innerHTML = arr.map(s=>`<img src="${s}" alt="">`).join('');
    g.addEventListener('click', (e)=>{
      const t = e.target.closest('img'); if(!t) return;
      const lb = document.createElement('div');
      lb.className = 'bh-lightbox show';
      lb.innerHTML = `<img src="${t.src}" alt=""><button class="x"><i class="ri-close-line"></i></button>`;
      document.body.appendChild(lb);
      lb.addEventListener('click', (ev)=>{ if(ev.target===lb || ev.target.closest('.x')) lb.remove(); });
    });
  }
  function mountShorts(){
    const s = $('#bhShorts');
    if(!D.shorts || !D.shorts.length){ s.innerHTML=''; return; }
    s.innerHTML = D.shorts.map(x=>`
      <article class="bh-clip" data-embed="${x.embed}">
        <img src="${x.thumb}" alt=""><span class="play"><i class="ri-play-fill"></i></span>
      </article>
    `).join('');
  }

  // ---------------- 예약 모달 ----------------
  const modal = $('#bhReserveModal');
  const openBtns = ['#bhOpenReserve','#bhOpenReserveBottom'].map(s=>$(s));
  const closeModal = ()=> modal.classList.remove('show');
  modal.addEventListener('click', (e)=>{ if(e.target===modal || e.target.hasAttribute('data-close')) closeModal(); });

  // 간단한 가용성 데이터(실서비스 연결 시 교체)
  const today = new Date();
  let cur = new Date(today.getFullYear(), today.getMonth(), 1);
  let pickedDate = null, pickedTime = null;

  function buildMonth(y,m){
    const first = new Date(y,m,1);
    const start = new Date(first);
    start.setDate(first.getDay()===0? -5 : 1-first.getDay()+1); // 월 시작 기준
    const grid = [];
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      // 예시 가용성 규칙
      let status = 'ok';
      if(d.getMonth()!==m) status='off';
      if(d.getDay()===0) status='off';
      if(d.getDate()%7===0) status='booked';
      if(d.getDate()%5===0) status='soon';
      grid.push({date:d,status});
    }
    return grid;
  }

  function renderCalendar(){
    $('#rvMonTitle').textContent = fmtYMD(cur);
    const grid = buildMonth(cur.getFullYear(), cur.getMonth());
    const el = $('#rvGrid');
    el.innerHTML = grid.map(g=>{
      const y=g.date.getFullYear(), m=pad2(g.date.getMonth()+1), d=pad2(g.date.getDate());
      const ymd = `${y}-${m}-${d}`;
      const isSel = pickedDate && ymd===pickedDate;
      return `<div class="cal-cell ${g.status} ${g.status==='ok'?'ok':''} ${isSel?'sel':''}" data-ymd="${ymd}">
        <span class="d">${g.date.getDate()}</span>
        <i class="dot ${g.status}"></i>
      </div>`;
    }).join('');
  }

  function renderSlots(ymd){
    $('#rvPickedDate').textContent = ymd ? ymd : '날짜를 선택하세요';
    const wrap = $('#rvSlots');
    if(!ymd){ wrap.innerHTML=''; $('#rvSubmit').disabled=true; return; }

    // 예시: 10:30 ~ 19:30, 30분 간격 (일부 막기)
    const times = [];
    for(let h=10; h<=19; h++){
      ['00','30'].forEach(min=>{
        if(h===10 && min==='00') return; // 10:00 제외
        times.push(`${h}:${min}`);
      });
    }
    wrap.innerHTML = times.map(t=>{
      const off = (t==='13:00' || t==='15:30'); // 예시 마감 슬롯
      const sel = pickedTime===t;
      return `<button class="time ${off?'off':''} ${sel?'sel':''}" data-t="${t}" ${off?'disabled':''}>${t}</button>`;
    }).join('');
    $('#rvSubmit').disabled = !pickedTime;
  }

  function openReserve(){
    pickedDate=null; pickedTime=null;
    renderCalendar(); renderSlots(null);
    modal.classList.add('show');
  }

  // 캘린더/슬롯 바인딩
  $('#rvPrevMon').addEventListener('click', ()=>{ cur.setMonth(cur.getMonth()-1); renderCalendar(); });
  $('#rvNextMon').addEventListener('click', ()=>{ cur.setMonth(cur.getMonth()+1); renderCalendar(); });
  $('#rvGrid').addEventListener('click', (e)=>{
    const cell = e.target.closest('.cal-cell.ok'); if(!cell) return;
    pickedDate = cell.dataset.ymd; pickedTime=null;
    renderCalendar(); renderSlots(pickedDate);
  });
  $('#rvSlots').addEventListener('click', (e)=>{
    const b = e.target.closest('.time'); if(!b || b.classList.contains('off')) return;
    pickedTime = b.dataset.t;
    $$('#rvSlots .time').forEach(x=>x.classList.toggle('sel', x===b));
    $('#rvSubmit').disabled = !(pickedDate && pickedTime);
  });
  $('#rvSubmit').addEventListener('click', ()=>{
    alert(`[예약요청]\n날짜: ${pickedDate}\n시간: ${pickedTime}`);
    closeModal();
  });

  // 문의 모달
  const inq = $('#bhInquiryModal');
  $('#bhOpenInquiry').addEventListener('click', ()=> inq.classList.add('show'));
  inq.addEventListener('click', (e)=>{ if(e.target===inq || e.target.hasAttribute('data-close')) inq.classList.remove('show'); });
  $('#inqSend').addEventListener('click', ()=>{
    alert('문의가 전송되었습니다.');
    inq.classList.remove('show');
  });

  // CTA 버튼
  openBtns.forEach(b=> b && b.addEventListener('click', openReserve));

  // 초기 렌더
  mountHero($('#bh-hero'));
  mountInfo($('#bhInfo'));
  mountPricing();
  mountGallery();
  mountShorts();
})(window);