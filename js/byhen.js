/* byhen.js — v1.0.0
   - LIVEE_CONFIG(API_BASE, endpoints.byhen) 기반 조회
   - /{byhen endpoint}/byhen 슬러그로 조회, 실패 시 localStorage 폴백
   - 달력/예약, 썸네일 스와핑, 간단 모달
*/
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '').toString().trim();
    if (!raw) return '';
    const p = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(p) ? p : (location.origin + (p.startsWith('/') ? p : '/' + p));
  })();

  const EP = CFG.endpoints || {};
  const BRAND_EP = (EP.byhen || '/brands-test').replace(/^\/+/, '/'); // 기본값
  const SLUG = 'byhen';

  // ------------- helpers -------------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const toast = (m) => { const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(t._); t._=setTimeout(()=>t.classList.remove("show"),1200); };

  const ym  = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const ymd = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  async function apiGetBrand(slug){
    try{
      if(!API_BASE) throw new Error('NO_API');
      const url = `${API_BASE}${BRAND_EP}/${encodeURIComponent(slug)}`;
      const r = await fetch(url, { headers:{Accept:'application/json'} });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      return j.data || j;
    }catch(e){
      // 폴백: localStorage
      const raw = localStorage.getItem('brand:'+slug);
      if(raw) return JSON.parse(raw);
      // 데모 샘플 1회 삽입
      const demo = {
        slug:'byhen',
        name:'BYHEN',
        thumbnail:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200',
        subThumbnails:[
          'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800',
          'https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=800'
        ],
        availableHours:'10:00–19:00 (일·공휴일 휴무)',
        availableDates:[],
        timeslots:['10:00','14:00','19:00'],
        contact:{phone:'02-000-0000',email:'hello@byhen.studio',kakao:'https://pf.kakao.com/_byhen'},
        intro:'한 공간에서 다양한 컨셉 촬영이 가능한 성수동 스튜디오입니다.',
        gallery:[
          'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800',
          'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=800'
        ],
        usageGuide:'• 예약금 20% 선결제\n• 촬영 3일 전 50% 환불, 1일 전 20%, 당일 환불 불가',
        priceInfo:'베이직 2h 350,000원\n프리미엄 4h 650,000원',
        address:'서울 성수동 XX로 00-0',
        map:{link:'https://map.naver.com'},
        closed:['2025-09-22'],
        booked:['2025-09-20']
      };
      localStorage.setItem('brand:'+slug, JSON.stringify(demo));
      return demo;
    }
  }

  // ------------- state -------------
  let BRAND = null;
  let curMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let picked = null;

  // ------------- render -------------
  function renderAll(){
    if(!BRAND) return;

    // 썸네일
    $("#mainThumb").src = BRAND.thumbnail || '';
    const subs = (BRAND.subThumbnails||[]).map((s,i)=>`<img src="${s}" data-i="${i}" alt="sub-${i}">`).join('');
    $("#subThumbs").innerHTML = subs;
    $("#subThumbs").onclick = (e)=>{
      const im = e.target.closest('img'); if(!im) return;
      $("#mainThumb").src = im.src;
      $$("#subThumbs img").forEach(x=>x.classList.toggle('sel', x===im));
    };
    const first = $("#subThumbs img"); first && first.classList.add('sel');

    // chips (영업시간/예약가능일)
    $("#chips").innerHTML = [
      BRAND.availableHours ? `<span class="chip"><i class="ri-time-line"></i>${BRAND.availableHours}</span>` : '',
      Array.isArray(BRAND.availableDates) && BRAND.availableDates.length
        ? `<span class="chip"><i class="ri-calendar-event-line"></i>예약 가능일 ${BRAND.availableDates.length}일</span>` : ''
    ].join('');

    // 텍스트
    $("#intro").textContent   = BRAND.intro || '-';
    $("#guide").textContent   = BRAND.usageGuide || '-';
    $("#pricing").textContent = BRAND.priceInfo || '-';
    $("#address").textContent = BRAND.address || '-';

    // 연락
    $("#phone").textContent = BRAND.contact?.phone || '-';
    $("#email").textContent = BRAND.contact?.email || '-';
    $("#kakao").innerHTML   = BRAND.contact?.kakao
      ? `<a href="${BRAND.contact.kakao}" target="_blank" rel="noopener">${BRAND.contact.kakao}</a>` : '-';
    $("#mapLink").innerHTML = BRAND.map?.link
      ? `<a class="btn" href="${BRAND.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>`
      : '';

    // 갤러리
    $("#gallery").innerHTML = (BRAND.gallery||[]).map(s=>`<img src="${s}" alt="">`).join('');

    // 시간 옵션
    const times = BRAND.timeslots?.length ? BRAND.timeslots : ['10:00','13:00','15:30','18:00'];
    $("#rvTime").innerHTML = times.map(t=>`<option>${t}</option>`).join('');

    // 달력
    renderCalendar();
  }

  function dayStatus(dateStr){
    if (Array.isArray(BRAND.closed) && BRAND.closed.includes(dateStr))  return 'closed';
    if (Array.isArray(BRAND.booked) && BRAND.booked.includes(dateStr))  return 'booked';
    if (Array.isArray(BRAND.availableDates) && BRAND.availableDates.length){
      return BRAND.availableDates.includes(dateStr) ? 'ok' : 'closed';
    }
    return 'ok';
  }

  function renderCalendar(){
    $("#monTitle").textContent = ym(curMonth);
    const first = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1);
    // 월요일 시작으로 보정
    const start = new Date(first);
    start.setDate(first.getDay()===0 ? -5 : 1-first.getDay()+1);

    const arr = [];
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const s = dayStatus(ymd(d));
      arr.push({d,s});
    }
    $("#calGrid").innerHTML = arr.map(({d,s})=>{
      const selected = picked && picked===ymd(d);
      return `<div class="day ${s} ${s==='ok'?'ok':''} ${selected?'sel':''}" data-ymd="${ymd(d)}">
        <span class="dn">${d.getDate()}</span><i class="dot ${s}"></i>
      </div>`;
    }).join('');
  }

  // ------------- events -------------
  $("#prevM").onclick = ()=>{ curMonth.setMonth(curMonth.getMonth()-1); renderCalendar(); };
  $("#nextM").onclick = ()=>{ curMonth.setMonth(curMonth.getMonth()+1); renderCalendar(); };
  $("#calGrid").onclick = (e)=>{
    const cell = e.target.closest('.day.ok'); if(!cell) return;
    picked = cell.dataset.ymd; renderCalendar();
    $("#rvDate").value = picked;
    toast("선택 날짜: " + picked);
  };

  // 모달
  function open(id){ $(id).classList.add('show'); }
  function closeAny(e){ if(e.target.hasAttribute('data-x') || e.target.classList.contains('modal')) e.currentTarget.classList.remove('show'); }
  $("#inqModal").addEventListener('click', closeAny);
  $("#payModal").addEventListener('click', closeAny);
  $("#btnInquiry").onclick = ()=> open("#inqModal");
  $("#btnReserve").onclick = ()=>{
    if(picked) $("#rvDate").value = picked;
    open("#payModal");
  };
  $("#sendInquiry").onclick = ()=>{
    toast("문의가 전송되었습니다.");
    $("#inqModal").classList.remove('show');
  };
  $("#doPay").onclick = ()=>{
    const d = $("#rvDate").value, t = $("#rvTime").value;
    if(!d || !t){ toast("날짜/시간을 선택하세요"); return; }
    alert(`[결제 시뮬레이션]\n날짜: ${d}\n시간: ${t}\n결제수단: ${$("#rvPay").value}`);
    $("#payModal").classList.remove('show');
  };

  // ------------- init -------------
  (async function init(){
    BRAND = await apiGetBrand(SLUG);
    renderAll();
  })();
})();
