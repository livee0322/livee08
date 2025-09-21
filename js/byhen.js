/* byhen.js — v1.0.0
   - 같은 스키마(Brand)로 서버에서 불러와 렌더
   - API 없으면 localStorage 폴백 (brand:byhen)
   - 페이지 요소 id는 byhen.html 분리본과 동일 가정
*/
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = (CFG.endpoints || {});
  const BRANDS_BASE = (EP.byhen || '/brands-test').replace(/^\/*/, '/'); // '/brands-test'
  const SLUG = 'byhen';

  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const toast=(m)=>{const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(t._); t._=setTimeout(()=>t.classList.remove("show"),1200)};

  const ym  = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const ymd = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  let BRAND = null;
  let curMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let picked = null;

  // ----- 데이터 로드 -----
  async function fetchBrand() {
    try {
      const url = `${API_BASE}${BRANDS_BASE}/${encodeURIComponent(SLUG)}`;
      const r = await fetch(url, { headers:{Accept:'application/json'} });
      if (r.ok) return (await r.json())?.data || (await r.json());
    } catch {}
    // 폴백: localStorage
    const raw = localStorage.getItem('brand:'+SLUG);
    return raw ? JSON.parse(raw) : null;
  }

  // ----- 렌더링 -----
  function renderAll(){
    if(!BRAND){ toast('브랜드 데이터를 찾을 수 없어요'); return; }

    // 메인/서브 썸네일
    $("#mainThumb").src = BRAND.thumbnail || '';
    $("#subThumbs").innerHTML = (BRAND.subThumbnails||[]).map((s,i)=>`<img src="${s}" alt="sub-${i}" data-i="${i}">`).join('');
    $("#subThumbs").onclick = (e)=>{
      const im=e.target.closest('img'); if(!im) return;
      $("#mainThumb").src = im.src;
      $$("#subThumbs img").forEach(x=>x.classList.toggle('sel', x===im));
    };
    const first = $("#subThumbs img"); first && first.classList.add('sel');

    // 정보칩
    $("#chips").innerHTML = [
      BRAND.schedule?.availableHours ? `<span class="chip"><i class="ri-time-line"></i>${BRAND.schedule.availableHours}</span>` : '',
      BRAND.schedule?.timeslots?.length ? `<span class="chip"><i class="ri-time-line"></i>타임 ${BRAND.schedule.timeslots.length}개</span>` : ''
    ].join('');

    // 소개/이용안내/금액/주소
    $("#intro").textContent   = BRAND.intro || '-';
    $("#guide").textContent   = BRAND.usageGuide || '-';
    $("#pricing").textContent = BRAND.priceInfo || '-';
    $("#address").textContent = BRAND.address || '-';

    // 연락처/지도
    $("#phone").textContent = BRAND.contact?.phone || '-';
    $("#email").textContent = BRAND.contact?.email || '-';
    $("#kakao").innerHTML   = BRAND.contact?.kakao ? `<a href="${BRAND.contact.kakao}" target="_blank" rel="noopener">${BRAND.contact.kakao}</a>` : '-';
    $("#mapLink").innerHTML = BRAND.map?.link ? `<a class="btn" href="${BRAND.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>` : '';

    // 갤러리
    $("#gallery").innerHTML = (BRAND.gallery||[]).map(s=>`<img src="${s}" alt="">`).join('');

    renderCalendar();
    // 예약 타임 드롭다운(결제 모달)
    const times = BRAND.schedule?.timeslots?.length ? BRAND.schedule.timeslots : ['10:00','14:00','19:00'];
    $("#rvTime").innerHTML = times.map(t=>`<option>${t}</option>`).join('');
  }

  // ----- 캘린더 -----
  function dayStatus(dateStr){
    const sc = BRAND.schedule || {};
    if (Array.isArray(sc.closed) && sc.closed.includes(dateStr))  return 'closed';
    if (Array.isArray(sc.booked) && sc.booked.includes(dateStr))  return 'booked';
    // availableDates 지정 시 그 목록만 OK로 처리
    if (Array.isArray(sc.availableDates) && sc.availableDates.length){
      return sc.availableDates.includes(dateStr) ? 'ok' : 'closed';
    }
    return 'ok';
  }

  function renderCalendar(){
    $("#monTitle").textContent = ym(curMonth);
    const first = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDay()===0 ? -5 : 1-first.getDay()+1); // 월요일 시작
    const days = [];
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const status = dayStatus(ymd(d));
      const selected = (picked && picked===ymd(d));
      days.push(`<div class="day ${status} ${status==='ok'?'ok':''} ${selected?'sel':''}" data-ymd="${ymd(d)}">
        <span class="dn">${d.getDate()}</span><i class="dot ${status}"></i>
      </div>`);
    }
    $("#calGrid").innerHTML = days.join('');
  }

  // ----- 이벤트 -----
  $("#prevM").onclick = ()=>{ curMonth.setMonth(curMonth.getMonth()-1); renderCalendar(); };
  $("#nextM").onclick = ()=>{ curMonth.setMonth(curMonth.getMonth()+1); renderCalendar(); };
  $("#calGrid").onclick = (e)=>{
    const cell = e.target.closest('.day.ok'); if(!cell) return;
    picked = cell.dataset.ymd; renderCalendar();
    $("#rvDate").value = picked;
  };

  // 모달
  function open(id){ document.querySelector(id)?.classList.add('show'); }
  function closeAny(e){ if(e.target.hasAttribute('data-x') || e.target.classList.contains('modal')) e.currentTarget.classList.remove('show'); }
  $("#inqModal")?.addEventListener('click', closeAny);
  $("#payModal")?.addEventListener('click', closeAny);
  $("#btnInquiry").onclick = ()=> open('#inqModal');
  $("#btnReserve").onclick = ()=> { if(picked) $("#rvDate").value = picked; open('#payModal'); };

  $("#sendInquiry").onclick = ()=>{
    (window.UI?.toast || alert)('문의가 전송되었습니다.');
    $("#inqModal")?.classList.remove('show');
  };
  $("#doPay").onclick = ()=>{
    const d=$("#rvDate").value, t=$("#rvTime").value, m=$("#rvPay").value;
    if(!d || !t) { (window.UI?.toast || alert)('날짜/시간을 선택하세요'); return; }
    alert(`[결제 시뮬레이션]\n날짜: ${d}\n시간: ${t}\n결제수단: ${m}`);
    $("#payModal")?.classList.remove('show');
  };

  // ----- 시작 -----
  (async function init(){
    // 데모 폴백 저장(최초 1회)
    if(!localStorage.getItem('brand:'+SLUG)){
      localStorage.setItem('brand:'+SLUG, JSON.stringify({
        slug:'byhen',
        name:'BYHEN',
        thumbnail:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200',
        subThumbnails:[
          'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800'
        ],
        intro:'한 공간에서 다양한 컨셉 촬영이 가능한 성수동 스튜디오입니다.',
        usageGuide:'• 예약금 20% 선결제\n• 촬영 3일 전 50% 환불, 1일 전 20%, 당일 환불 불가',
        priceInfo:'베이직 2h 350,000원\n프리미엄 4h 650,000원',
        address:'서울 성수동 XX로 00-0',
        contact:{ phone:'02-000-0000', email:'hello@byhen.studio', kakao:'https://pf.kakao.com/_byhen' },
        map:{ link:'https://map.naver.com' },
        gallery:[
          'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800',
          'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=800'
        ],
        schedule:{
          availableHours:'10:00–19:00 (일·공휴일 휴무)',
          timeslots:['10:00','14:00','19:00'],
          availableDates:[], // 비어있으면 제한 없음
          closed:[],
          booked:[]
        }
      }));
    }
    BRAND = await fetchBrand();
    renderAll();
  })();
})();