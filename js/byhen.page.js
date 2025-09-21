/* byhen.page.js — v2.0.0
 * - 메인 가로 썸네일 + 서브 썸네일
 * - 정보/소개/갤러리/이용/금액/주소/스케줄
 * - 예약: 날짜 → 시간 → 결제(데모)
 */
(function (w){
  'use strict';

  // ----- 데이터 정규화 -----
  const RAW = w.BYHEN_DATA || {};
  const D = normalize(RAW);
  function normalize(src){
    const heroImgs = (src.hero?.images?.length ? src.hero.images
                    : (src.hero?.image ? [src.hero.image] : src.images)) || [];
    return {
      name: src.name || '브랜드',
      tagline: src.tagline || '',
      location: src.location || '',
      hours: src.hours || '',
      contact: {
        phone: src.contact?.phone || '',
        kakaoUrl: src.contact?.kakaoUrl || '',
        email: src.contact?.email || ''
      },
      rating: {
        avg: Number(src.rating?.avg ?? src.rating ?? 0) || 0,
        count: Number(src.rating?.count ?? src.ratingCount ?? 0) || 0
      },
      hero: { images: heroImgs, image: heroImgs[0] || '' },
      description: src.description || src.desc || '',
      rules: src.rules || '',
      pricing: Array.isArray(src.pricing) ? src.pricing : [],
      map: { embedUrl: src.map?.embedUrl||'', staticImage: src.map?.staticImage||'', link: src.map?.link||'' },
      studioPhotos: Array.isArray(src.studioPhotos) ? src.studioPhotos : [],
      portfolioPhotos: Array.isArray(src.portfolioPhotos) ? src.portfolioPhotos : [],
      availability: {
        leadDays: Number(src.availability?.leadDays ?? 0) || 0,
        booked: Array.isArray(src.availability?.booked) ? src.availability.booked : [],
        closed: Array.isArray(src.availability?.closed) ? src.availability.closed : [],
        timeslots: Array.isArray(src.availability?.timeslots) ? src.availability.timeslots : []
      }
    };
  }

  // ----- 유틸 -----
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const pad2 = (n)=> String(n).padStart(2,'0');
  const ymd  = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const ym   = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
  const money= (v)=> isFinite(+v) ? Number(v).toLocaleString('ko-KR')+'원' : (v??'');

  // ----- Hero -----
  function mountHero(){
    const root = $('#bh-hero'); if(!root) return;
    const imgs = (D.hero.images||[]).filter(Boolean);
    const main = imgs[0] || 'default.jpg';
    root.innerHTML = `
      <div class="hero-main"><img id="heroMain" src="${main}" alt=""></div>
      <div class="hero-thumbs">
        ${imgs.map((src,i)=>`<img src="${src}" alt="" data-i="${i}" class="${i? '':'sel'}">`).join('')}
      </div>
    `;
    $('#heroMain').src = main;
    root.querySelector('.hero-thumbs')?.addEventListener('click', (e)=>{
      const im = e.target.closest('img'); if(!im) return;
      $$('#bh-hero .hero-thumbs img').forEach(x=>x.classList.remove('sel'));
      im.classList.add('sel');
      $('#heroMain').src = im.getAttribute('src');
    });
  }

  // ----- Info -----
  function mountInfo(){
    $('#bhBrandTitle').textContent = D.name || '스튜디오';
    const rating = (D.rating.avg ? `${D.rating.avg.toFixed(1)} (${D.rating.count})` : '리뷰 준비중');
    $('#bhInfo').innerHTML = `
      <div class="top">
        <span class="bh-name">${D.name||'-'}</span>
        ${D.tagline ? `<span class="bh-chip">${D.tagline}</span>` : ''}
        <span class="bh-chip"><i class="ri-star-line"></i>${rating}</span>
      </div>
      <div class="bh-kv">
        <div class="row"><i class="ri-time-line"></i><b>이용 가능</b> · ${D.hours || '문의'}</div>
        <div class="row"><i class="ri-phone-line"></i><b>연락처</b> · ${D.contact.phone || '-'} ${D.contact.kakaoUrl?`· <a href="${D.contact.kakaoUrl}" target="_blank" rel="noopener">카카오톡</a>`:''}</div>
      </div>
    `;
    $('#bhDesc').textContent  = D.description || '';
    $('#bhRules').textContent = D.rules || '';

    // 지도
    const map = $('#bhLocation');
    if (D.map.embedUrl){
      map.innerHTML = `<iframe src="${D.map.embedUrl}" style="width:100%;height:300px;border:0;border-radius:12px" loading="lazy"></iframe>`;
    } else if (D.map.staticImage){
      map.innerHTML = `<img src="${D.map.staticImage}" alt="" style="width:100%;border-radius:12px">` +
                      (D.map.link?`<div style="margin-top:8px"><a class="bh-btn" href="${D.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도로 열기</a></div>`:'');
    } else if (D.map.link){
      map.innerHTML = `<a class="bh-btn" href="${D.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도로 열기</a>`;
    } else {
      map.textContent = '-';
    }
  }

  // ----- Pricing -----
  function mountPricing(){
    const wrap = $('#bhPricing'); if(!wrap) return;
    wrap.innerHTML = (D.pricing||[]).map(p=>`
      <article class="bh-plan">
        ${p.badge?`<span class="badge">${p.badge}</span>`:''}
        <div class="name">${p.name||'-'}</div>
        <div class="price">${money(p.price)}</div>
        ${p.duration?`<div class="opt">시간: ${p.duration}</div>`:''}
        ${Array.isArray(p.includes)&&p.includes.length?`<ul>${p.includes.map(i=>`<li>${i}</li>`).join('')}</ul>`:''}
        ${Array.isArray(p.options)&&p.options.length?`<div class="opt">옵션: ${p.options.map(o=>`${o.name} +${money(o.price)}`).join(' · ')}</div>`:''}
      </article>
    `).join('');
  }

  // ----- Gallery -----
  function mountGallery(){
    const g = $('#bhGallery'); if(!g) return;
    const arr = (D.studioPhotos.length||D.portfolioPhotos.length) ? [...D.studioPhotos,...D.portfolioPhotos] : (D.hero.images||[]);
    g.innerHTML = arr.map(s=>`<img src="${s}" alt="">`).join('');
    g.addEventListener('click', (e)=>{
      const t = e.target.closest('img'); if(!t) return;
      const lb = document.createElement('div');
      lb.className = 'bh-modal show';
      lb.innerHTML = `<div class="sheet"><header><strong>미리보기</strong><button class="x" data-close><i class="ri-close-line"></i></button></header><img src="${t.src}" alt="" style="width:100%;border-radius:12px"/></div>`;
      document.body.appendChild(lb);
      lb.addEventListener('click',(ev)=>{ if(ev.target===lb || ev.target.hasAttribute('data-close')) lb.remove(); });
    });
  }

  // ----- 스케줄 (미니 달력) -----
  const today = new Date();
  let miniMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  function buildGrid(y,m){
    const first = new Date(y,m,1);
    const start = new Date(first);
    const dow = first.getDay(); // 0:일
    const shift = (dow===0? -5 : 1-dow); // 월 시작
    start.setDate(first.getDate()+shift);
    const arr = [];
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const ymdStr = ymd(d);
      let status='ok';
      if(d.getMonth()!==m) status='off';
      else if (D.availability.closed.includes(ymdStr)) status='off';
      else if (D.availability.booked.includes(ymdStr)) status='booked';
      else if (isBeforeLead(d)) status='soon';
      arr.push({date:d,ymd:ymdStr,status});
    }
    return arr;
  }
  function isBeforeLead(d){
    const pr = new Date(today); pr.setDate(pr.getDate()+ (D.availability.leadDays||0));
    const cmp = new Date(pr.getFullYear(),pr.getMonth(),pr.getDate());
    return d < cmp;
  }
  function renderMiniCal(){
    $('#miniTitle').textContent = ym(miniMonth);
    const grid = buildGrid(miniMonth.getFullYear(), miniMonth.getMonth());
    const el = $('#miniGrid');
    el.innerHTML = grid.map(g=>`
      <div class="cal-cell ${g.status} ${g.status==='ok'?'ok':''}" data-ymd="${g.ymd}">
        <span class="d">${g.date.getDate()}</span>
        <i class="dot ${g.status}"></i>
      </div>
    `).join('');
  }

  // ----- 예약 모달 -----
  const rvModal = $('#bhReserveModal');
  let curMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let pickedDate = null, pickedTime = null;

  function openReserve(){
    pickedDate=null; pickedTime=null;
    renderCalendar(); renderSlots(null); renderSummary();
    rvModal.classList.add('show');
  }
  function closeReserve(){ rvModal.classList.remove('show'); }

  function renderCalendar(){
    $('#rvMonTitle').textContent = ym(curMonth);
    const grid = buildGrid(curMonth.getFullYear(), curMonth.getMonth());
    $('#rvGrid').innerHTML = grid.map(g=>{
      const sel = pickedDate===g.ymd;
      return `<div class="cal-cell ${g.status} ${g.status==='ok'?'ok':''} ${sel?'sel':''}" data-ymd="${g.ymd}">
        <span class="d">${g.date.getDate()}</span><i class="dot ${g.status}"></i>
      </div>`;
    }).join('');
  }
  function renderSlots(ymdStr){
    $('#rvPickedDate').textContent = ymdStr || '날짜를 먼저 선택하세요';
    const wrap = $('#rvSlots');
    if(!ymdStr){ wrap.innerHTML=''; return; }
    const times = D.availability.timeslots.length ? D.availability.timeslots : buildDefaultTimes();
    wrap.innerHTML = times.map(t=>{
      const sel = pickedTime===t;
      return `<button class="time ${sel?'sel':''}" data-t="${t}">${t}</button>`;
    }).join('');
  }
  function buildDefaultTimes(){
    const list=[]; // 10:00~19:30, 30분 간격
    for(let h=10;h<=19;h++){
      for (const m of [0,30]){ if(h===10 && m===0) continue; list.push(`${pad2(h)}:${pad2(m)}`); }
    }
    return list;
  }
  function renderSummary(){
    const sum = $('#rvSummary');
    const btn = $('#rvPay');
    if(pickedDate && pickedTime){
      sum.textContent = `선택: ${pickedDate} · ${pickedTime} — 결제를 진행해주세요.`;
      btn.disabled = false;
    }else{
      sum.textContent = '날짜/시간을 선택하면 결제 버튼이 활성화됩니다.';
      btn.disabled = true;
    }
  }

  // ----- 이벤트 바인딩 -----
  // 상단/섹션
  mountHero(); mountInfo(); mountPricing(); mountGallery();
  renderMiniCal();
  $('#miniPrev')?.addEventListener('click',()=>{ miniMonth.setMonth(miniMonth.getMonth()-1); renderMiniCal(); });
  $('#miniNext')?.addEventListener('click',()=>{ miniMonth.setMonth(miniMonth.getMonth()+1); renderMiniCal(); });

  // 문의
  const inq = $('#bhInquiryModal');
  $('#bhOpenInquiry')?.addEventListener('click', ()=> inq.classList.add('show'));
  inq?.addEventListener('click',(e)=>{ if(e.target===inq||e.target.hasAttribute('data-close')) inq.classList.remove('show'); });
  $('#inqSend')?.addEventListener('click', ()=>{ alert('문의가 전송되었습니다.'); inq.classList.remove('show'); });

  // 예약 모달
  $('#bhOpenReserve')?.addEventListener('click', openReserve);
  rvModal?.addEventListener('click',(e)=>{ if(e.target===rvModal || e.target.hasAttribute('data-close')) closeReserve(); });
  $('#rvPrev')?.addEventListener('click',()=>{ curMonth.setMonth(curMonth.getMonth()-1); renderCalendar(); });
  $('#rvNext')?.addEventListener('click',()=>{ curMonth.setMonth(curMonth.getMonth()+1); renderCalendar(); });
  $('#rvGrid')?.addEventListener('click',(e)=>{
    const cell = e.target.closest('.cal-cell.ok'); if(!cell) return;
    pickedDate = cell.dataset.ymd; pickedTime=null; renderCalendar(); renderSlots(pickedDate); renderSummary();
  });
  $('#rvSlots')?.addEventListener('click',(e)=>{
    const b = e.target.closest('.time'); if(!b) return;
    pickedTime = b.dataset.t;
    $$('#rvSlots .time').forEach(x=>x.classList.toggle('sel', x===b));
    renderSummary();
  });
  $('#rvPay')?.addEventListener('click',()=>{
    alert(`[결제 데모]\n날짜: ${pickedDate}\n시간: ${pickedTime}\n결제가 완료되었다고 가정합니다.`);
    closeReserve();
  });

})(window);