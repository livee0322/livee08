
/* byhen.page.js — v1.5.0
   - BrandPage 스키마에 맞춘 렌더러
   - Hero(멀티) · 정보 · 가격 · 갤러리 · 숏폼
   - 예약 모달: 캘린더 + 타임슬롯 (availability 기반)
*/
(function (w){
  'use strict';

  // ---------- 데이터 정규화 ----------
  const RAW = w.BYHEN_DATA || {};
  const D = normalize(RAW);

  function normalize(src){
    const heroImgs = (src.hero?.images && src.hero.images.length ? src.hero.images
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
      tags: src.tags || src.chips || [],

      hero: {
        images: heroImgs,
        image: src.hero?.image || (heroImgs && heroImgs[0]) || ''
      },

      rating: {
        avg: Number(src.rating?.avg ?? src.rating ?? 0) || 0,
        count: Number(src.rating?.count ?? src.ratingCount ?? 0) || 0
      },

      description: src.description || src.desc || '',
      rules: src.rules || '',

      map: {
        embedUrl: src.map?.embedUrl || '',
        staticImage: src.map?.staticImage || '',
        link: src.map?.link || ''
      },

      availability: {
        leadDays: Number(src.availability?.leadDays ?? 0) || 0,
        timeslots: Array.isArray(src.availability?.timeslots) ? src.availability.timeslots : [],
        booked: Array.isArray(src.availability?.booked) ? src.availability.booked : [],
        closed: Array.isArray(src.availability?.closed) ? src.availability.closed : []
      },

      pricing: Array.isArray(src.pricing) ? src.pricing : [],
      studioPhotos: Array.isArray(src.studioPhotos) ? src.studioPhotos : [],
      portfolioPhotos: Array.isArray(src.portfolioPhotos) ? src.portfolioPhotos : [],
      shorts: Array.isArray(src.shorts) ? src.shorts : []
    };
  }

  // ---------- 유틸 ----------
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const ymd = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const ym  = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

  // ---------- Hero ----------
  function mountHero(root){
    const imgs = (D.hero.images || []).filter(Boolean);
    if(!root) return;
    root.innerHTML = `
      <div class="slides">
        ${imgs.map((src,i)=>`<img src="${src}" alt="" class="${i? '':'show'}">`).join('')}
      </div>
      <div class="overlay">
        <div>
          <div class="title">${D.name}</div>
          <div class="tag">${D.tagline||''}</div>
        </div>
      </div>
      <div class="thumbs">
        ${imgs.map((src,i)=>`<img src="${src}" alt="" data-i="${i}" class="${i? '':'sel'}">`).join('')}
      </div>
    `;

    const slides = $$('.slides img', root);
    const thumbs = $$('.thumbs img', root);
    let i = 0, n = slides.length;
    const go = (k) => {
      i = (k+n)%n;
      slides.forEach((im,idx)=> im.classList.toggle('show', idx===i));
      thumbs.forEach((th,idx)=> th.classList.toggle('sel', idx===i));
    };
    thumbs.forEach(th => th.addEventListener('click', ()=> go(+th.dataset.i)));
    if(n > 1){ setInterval(()=> go(i+1), 5000); }
  }

  // ---------- Info ----------
  function mountInfo(root){
    if(!root) return;
    const stars = (() =>{
      const score = Math.round((D.rating.avg||0)*2)/2;
      return Array.from({length:5}, (_,i)=> {
        if(i+1 <= Math.floor(score)) return 'ri-star-fill';
        if(i+0.5 === score) return 'ri-star-half-line';
        return 'ri-star-line';
      });
    })();

    root.innerHTML = `
      <div class="bh-card bh-info">
        <div class="row">
          ${D.location ? `<span class="bh-chip soft"><i class="ri-map-pin-line"></i>${D.location}</span>`:''}
          ${D.hours ? `<span class="bh-chip soft"><i class="ri-time-line"></i>${D.hours}</span>`:''}
          ${D.contact.phone ? `<span class="bh-chip soft"><i class="ri-phone-line"></i>${D.contact.phone}</span>`:''}
          ${D.contact.kakaoUrl ? `<a class="bh-chip soft" href="${D.contact.kakaoUrl}" target="_blank" rel="noopener"><i class="ri-kakao-talk-line"></i>카카오톡</a>`:''}
        </div>
        <div class="bh-rating">
          <span class="stars">${stars.map(c=>`<i class="${c}"></i>`).join('')}</span>
          <span>${(D.rating.avg||0).toFixed(1)} · ${D.rating.count||0} reviews</span>
        </div>
        ${D.tags && D.tags.length ? `<div class="row">${D.tags.slice(0,6).map(t=>`<span class="bh-chip soft">${t}</span>`).join('')}</div>` : ''}
      </div>
    `;

    // 소개 / 규칙
    $('#bhDesc') && ($('#bhDesc').textContent = D.description || '');
    $('#bhRules') && ($('#bhRules').textContent = D.rules || '');

    // 지도
    const mapWrap = $('#bhLocation');
    if(mapWrap){
      if(D.map.embedUrl){
        mapWrap.innerHTML = `<iframe src="${D.map.embedUrl}" style="width:100%;height:280px;border:0;border-radius:12px" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      } else if (D.map.staticImage){
        mapWrap.innerHTML = `<img src="${D.map.staticImage}" alt="" style="width:100%;border-radius:12px">` +
                            (D.map.link ? `<div style="margin-top:8px"><a class="bh-btn" href="${D.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도로 열기</a></div>`:'');
      } else if (D.map.link){
        mapWrap.innerHTML = `<a class="bh-btn" href="${D.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도로 열기</a>`;
      } else {
        mapWrap.textContent = '-';
      }
    }
  }

  // ---------- Pricing ----------
  function mountPricing(){
    const wrap = $('#bhPricing'); if(!wrap) return;
    wrap.innerHTML = (D.pricing||[]).map(p => `
      <article class="bh-plan">
        ${p.badge ? `<span class="badge">${p.badge}</span>`:''}
        <div class="name">${p.name||'-'}</div>
        <div class="price">${formatMoney(p.price)}</div>
        ${p.duration ? `<div class="opt">소요시간: ${p.duration}</div>`:''}
        ${Array.isArray(p.includes) && p.includes.length ? `<ul>${p.includes.map(i=>`<li>${i}</li>`).join('')}</ul>` : ''}
        ${Array.isArray(p.options) && p.options.length ? `<div class="opt">옵션: ${p.options.map(o=>`${o.name} +${formatMoney(o.price)}`).join(' · ')}</div>`:''}
      </article>
    `).join('');
  }
  function formatMoney(v){
    const n = Number(v||0);
    if(!isFinite(n)) return String(v||'');
    return n.toLocaleString() + '원';
  }

  // ---------- Gallery / Shorts ----------
  function mountGallery(){
    const g = $('#bhGallery'); if(!g) return;
    const arr = (D.studioPhotos.length || D.portfolioPhotos.length)
      ? [...D.studioPhotos, ...D.portfolioPhotos]
      : (D.hero.images || []);
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
    const s = $('#bhShorts'); if(!s) return;
    if(!D.shorts || !D.shorts.length){ s.innerHTML=''; return; }
    s.innerHTML = D.shorts.map(x=>`
      <article class="bh-clip" data-embed="${x.embedUrl||''}">
        <img src="${x.thumbnailUrl||''}" alt=""><span class="play"><i class="ri-play-fill"></i></span>
      </article>
    `).join('');
    s.addEventListener('click', (e)=>{
      const card = e.target.closest('.bh-clip'); if(!card) return;
      const url = card.getAttribute('data-embed'); if(!url) return;
      const m = document.createElement('div');
      m.className = 'bh-clip-modal show';
      m.innerHTML = `<div class="inner"><iframe src="${url}" allowfullscreen></iframe><button class="x"><i class="ri-close-line"></i></button></div>`;
      document.body.appendChild(m);
      m.addEventListener('click', ev=>{ if(ev.target===m || ev.target.closest('.x')) m.remove(); });
    });
  }

  // ---------- 예약 모달 ----------
  // 모달 마크업은 byhen.html에 포함되어 있다고 가정
  const modal = $('#bhReserveModal');
  const openBtns = ['#bhOpenReserve','#bhOpenReserveBottom'].map(s=>$(s));
  const today = new Date();
  let curMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let pickedDate = null, pickedTime = null;

  function openReserve(){
    if(!modal) return;
    pickedDate = null; pickedTime = null;
    renderCalendar(); renderSlots(null);
    modal.classList.add('show');
  }
  function closeReserve(){ modal && modal.classList.remove('show'); }

  function isBooked(ymdStr){ return D.availability.booked.includes(ymdStr); }
  function isClosed(ymdStr){ return D.availability.closed.includes(ymdStr); }
  function isBeforeLead(dateObj){
    const d = new Date(today); d.setDate(today.getDate() + (D.availability.leadDays||0));
    return dateObj < new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function buildGrid(y,m){
    const first = new Date(y,m,1);
    const start = new Date(first);
    const dow = first.getDay(); // 0:일
    // 월요일 시작 그리드
    const shift = (dow===0? -5 : 1-dow);
    start.setDate(first.getDate()+shift);
    const arr = [];
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const ymdStr = ymd(d);
      let status = 'ok';
      if(d.getMonth()!==m) status='off';
      if(isClosed(ymdStr)) status='off';
      else if(isBooked(ymdStr)) status='booked';
      else if(isBeforeLead(d)) status='soon';
      arr.push({date:d, status});
    }
    return arr;
  }

  function renderCalendar(){
    if(!modal) return;
    $('#rvMonTitle').textContent = ym(curMonth);
    const grid = buildGrid(curMonth.getFullYear(), curMonth.getMonth());
    const wrap = $('#rvGrid'); if(!wrap) return;
    wrap.innerHTML = grid.map(g=>{
      const ymdStr = ymd(g.date);
      const sel = (pickedDate===ymdStr);
      return `<div class="cal-cell ${g.status} ${g.status==='ok'?'ok':''} ${sel?'sel':''}" data-ymd="${ymdStr}">
        <span class="d">${g.date.getDate()}</span>
        <i class="dot ${g.status}"></i>
      </div>`;
    }).join('');
  }

  function renderSlots(ymdStr){
    $('#rvPickedDate').textContent = ymdStr || '날짜를 선택하세요';
    const list = $('#rvSlots'); if(!list) return;
    if(!ymdStr){ list.innerHTML=''; $('#rvSubmit').disabled=true; return; }

    const times = (D.availability.timeslots && D.availability.timeslots.length)
      ? D.availability.timeslots
      : buildDefaultTimes(); // 폴백: 10:30~19:30, 30분 간격

    list.innerHTML = times.map(t=>{
      const off = false; // 시간이 별도 마감되는 요구가 생기면 여기서 처리
      const sel = (pickedTime===t);
      return `<button class="time ${off?'off':''} ${sel?'sel':''}" data-t="${t}" ${off?'disabled':''}>${t}</button>`;
    }).join('');
    $('#rvSubmit').disabled = !pickedTime;
  }

  function buildDefaultTimes(){
    const out = [];
    for(let h=10; h<=19; h++){
      ['00','30'].forEach(m=>{
        if(h===10 && m==='00') return; // 10:00 제외 예시
        out.push(`${String(h).padStart(2,'0')}:${m}`);
      });
    }
    return out;
  }

  // 이벤트 바인딩(모달)
  if(modal){
    modal.addEventListener('click', (e)=>{ if(e.target===modal || e.target.hasAttribute('data-close')) closeReserve(); });
    $('#rvPrevMon')?.addEventListener('click', ()=>{ curMonth.setMonth(curMonth.getMonth()-1); renderCalendar(); });
    $('#rvNextMon')?.addEventListener('click', ()=>{ curMonth.setMonth(curMonth.getMonth()+1); renderCalendar(); });
    $('#rvGrid')?.addEventListener('click', (e)=>{
      const cell = e.target.closest('.cal-cell.ok'); if(!cell) return;
      pickedDate = cell.dataset.ymd; pickedTime=null;
      renderCalendar(); renderSlots(pickedDate);
    });
    $('#rvSlots')?.addEventListener('click', (e)=>{
      const b = e.target.closest('.time'); if(!b || b.classList.contains('off')) return;
      pickedTime = b.dataset.t;
      $$('#rvSlots .time').forEach(x=>x.classList.toggle('sel', x===b));
      $('#rvSubmit').disabled = !(pickedDate && pickedTime);
    });
    $('#rvSubmit')?.addEventListener('click', ()=>{
      alert(`[예약요청]\n날짜: ${pickedDate}\n시간: ${pickedTime}`);
      closeReserve();
    });
  }
  openBtns.forEach(b=> b && b.addEventListener('click', openReserve));

  // ---------- 초기 렌더 ----------
  mountHero($('#bh-hero'));
  mountInfo($('#bhInfo'));
  mountPricing();
  mountGallery();
  mountShorts();
})(window);
