/* byhen.js — v1.3.0 (admin의 새 schedule 모델 + 구형 필드 모두 호환) */
(function () {
  'use strict';

  // ------- Config -------
  const CFG = window.LIVEE_CONFIG || {};
  const EP = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');

  // ------- Small utils -------
  const $ = (s, el=document)=>el.querySelector(s);
  const $$= (s, el=document)=>[...el.querySelectorAll(s)];
  const toast=(m)=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._);t._=setTimeout(()=>t.classList.remove("show"),1400)};

  const pad=n=>String(n).padStart(2,'0');
  const ym  =(d)=> d.getFullYear()+"-"+pad(d.getMonth()+1);
  const ymd =(d)=> d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const toMin=(hhmm)=>{const [h,m]=String(hhmm||'0:0').split(':').map(Number);return h*60+(m||0);};
  const toHHMM=(m)=> pad(Math.floor(m/60))+':'+pad(m%60);
  function genSlots(start='10:00', end='19:00', step=60){
    const s=toMin(start), e=toMin(end), arr=[];
    for(let t=s; t+step<=e; t+=step) arr.push(toHHMM(t));
    return arr;
  }

  // ------- State -------
  const qs = new URLSearchParams(location.search);
  const SLUG = (qs.get('slug') || 'byhen').toLowerCase();
  const ID   = qs.get('id') || '';
  let BRAND = null;
  let curMonth=new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let picked=null;

  // ------- API / Fallback -------
  async function fetchBrand(){
    // 1) 서버(id 또는 slug)
    const key = ID || SLUG;
    try{
      const r=await fetch(`${API_BASE}${BRAND_BASE}/${encodeURIComponent(key)}`,{headers:{Accept:'application/json'}});
      const j=await r.json().catch(()=>({}));
      if(r.ok && j && (j.data||j)) return (j.data||j);
    }catch(e){}
    // 2) 로컬스토리지 fallback
    try{ const raw=localStorage.getItem('brand:'+SLUG); if(raw) return JSON.parse(raw); }catch(e){}
    return null;
  }

  // ------- Render: all -------
  function renderAll(){
    if(!BRAND){ alert('브랜드 로드 실패'); return; }

    // 썸네일
    $("#mainThumb").src = BRAND.thumbnail || '';
    const subs = (BRAND.subThumbnails||[]).map((s,i)=>`<img src="${s}" data-i="${i}" alt="sub-${i}">`).join('');
    $("#subThumbs").innerHTML = subs;
    $("#subThumbs").onclick = (e)=>{
      const im=e.target.closest('img'); if(!im) return;
      $("#mainThumb").src=im.src;
      $$("#subThumbs img").forEach(x=>x.classList.toggle('sel',x===im));
    };
    const first = $("#subThumbs img"); first && first.classList.add('sel');

    // chips
    const hours = BRAND.schedule?.open ? `${BRAND.schedule.open.start}–${BRAND.schedule.open.end}` : (BRAND.availableHours||'');
    const datesCount = (BRAND.availableDates||[]).length;
    $("#chips").innerHTML = [
      hours ? `<span class="chip"><i class="ri-time-line"></i>${hours}</span>` : '',
      datesCount ? `<span class="chip"><i class="ri-calendar-event-line"></i>예약 가능일 ${datesCount}일</span>` : ''
    ].join('');

    // 텍스트
    $("#intro").textContent   = BRAND.intro || BRAND.description || '-';
    $("#guide").textContent   = BRAND.usageGuide || '-';
    $("#pricing").textContent = BRAND.priceInfo || '-';
    $("#address").textContent = BRAND.address || '-';

    // 연락
    $("#phone").textContent = BRAND.contact?.phone || '-';
    $("#email").textContent = BRAND.contact?.email || '-';
    $("#kakao").innerHTML   = BRAND.contact?.kakao ? `<a href="${BRAND.contact.kakao}" target="_blank" rel="noopener">${BRAND.contact.kakao}</a>` : '-';
    $("#mapLink").innerHTML = BRAND.map?.link ? `<a class="btn" href="${BRAND.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>` : '';

    // 갤러리
    $("#gallery").innerHTML = (BRAND.gallery||[]).map((s,i)=>`<img src="${s}" alt="gal-${i}">`).join('');

    // 캘린더 + 시간 옵션
    renderCalendar();
    renderTimeOptions(picked||todayStr());
  }

  // ------- Schedule helpers -------
  function todayStr(){ const d=new Date(); return ymd(d); }

  function soldoutTimes(dateStr){
    // 새 모델
    if(BRAND.schedule?.overrides?.[dateStr]?.soldout){
      return BRAND.schedule.overrides[dateStr].soldout || [];
    }
    // 구형(bookedTimes: [{date, times:[]}, ...])
    const item = (BRAND.bookedTimes||[]).find(v=>v.date===dateStr);
    return item?.times || [];
  }
  function isClosed(dateStr){
    if(BRAND.schedule?.overrides?.[dateStr]?.closed) return true;
    return Array.isArray(BRAND.closed) && BRAND.closed.includes(dateStr);
  }
  function baseTimeslots(){
    if(Array.isArray(BRAND.timeslots) && BRAND.timeslots.length) return BRAND.timeslots;
    if(BRAND.schedule?.open) return genSlots(BRAND.schedule.open.start, BRAND.schedule.open.end, BRAND.schedule.open.slot||60);
    return ['10:00','13:00','15:30','18:00'];
  }

  function dayStatus(dateStr){
    if(isClosed(dateStr)) return 'closed';
    // "하루 전체가 마감" 판단
    const base = baseTimeslots();
    const sold = soldoutTimes(dateStr);
    if(sold.length >= base.length && base.length>0) return 'booked';
    return 'ok';
  }

  // ------- Calendar -------
  function renderCalendar(){
    $("#monTitle").textContent = ym(curMonth);
    const first = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDay()===0? -5 : 1-first.getDay()+1); // 월요일 시작
    const arr=[];
    for(let i=0;i<42;i++){
      const d=new Date(start); d.setDate(start.getDate()+i);
      const ds=ymd(d), s=dayStatus(ds);
      const selected = picked===ds ? 'sel' : '';
      arr.push(`<div class="day ${s} ${s==='ok'?'ok':''} ${selected}" data-ymd="${ds}">
        <span class="dn">${d.getDate()}</span><i class="dot ${s}"></i>
      </div>`);
    }
    $("#calGrid").innerHTML = arr.join('');
  }

  // ------- Time options -------
  function renderTimeOptions(dateStr){
    if(!dateStr){ $("#rvTime").innerHTML=''; return; }

    const base = baseTimeslots();
    const sold = new Set(soldoutTimes(dateStr));
    const closed = isClosed(dateStr);

    if(closed){
      $("#rvTime").innerHTML = `<option>휴무일입니다</option>`;
      $("#rvTime").disabled = true;
      return;
    }

    $("#rvTime").disabled = false;
    $("#rvTime").innerHTML = base.map(t=>{
      const dis = sold.has(t) ? ' disabled' : '';
      return `<option value="${t}"${dis}>${t}${dis?' (마감)':''}</option>`;
    }).join('');

    // 선택된 날짜를 date input에도 반영
    $("#rvDate").value = dateStr;
  }

  // ------- Events -------
  function bind(){
    $('#prevM').onclick=()=>{curMonth.setMonth(curMonth.getMonth()-1);renderCalendar();};
    $('#nextM').onclick=()=>{curMonth.setMonth(curMonth.getMonth()+1);renderCalendar();};
    $('#calGrid').onclick=(e)=>{
      const cell=e.target.closest('.day.ok,.day.booked,.day.closed'); if(!cell) return;
      picked=cell.dataset.ymd; renderCalendar(); renderTimeOptions(picked);
      toast("선택 날짜: "+picked);
    };

    function open(id){ $(id).classList.add('show'); }
    function closeAny(e){ if(e.target.hasAttribute('data-x') || e.target.classList.contains('modal')) e.currentTarget.classList.remove('show'); }
    $("#inqModal").addEventListener('click', closeAny);
    $("#payModal").addEventListener('click', closeAny);
    $("#btnInquiry").onclick=()=>open("#inqModal");
    $("#btnReserve").onclick=()=>{
      if(picked) $("#rvDate").value=picked;
      renderTimeOptions(picked||todayStr());
      open("#payModal");
    };
    $("#sendInquiry").onclick=()=>{ toast("문의가 전송되었습니다."); $("#inqModal").classList.remove('show'); };
    $("#doPay").onclick=()=>{ 
      const d=$("#rvDate").value, t=$("#rvTime").value;
      if(!d||!t){ toast("날짜/시간을 선택하세요"); return; }
      alert(`[결제 시뮬레이션]\n날짜: ${d}\n시간: ${t}\n결제수단: ${$("#rvPay").value}`);
      $("#payModal").classList.remove('show');
    };
  }

  // ------- Init -------
  (async function init(){
    BRAND = await fetchBrand();
    if(!BRAND){
      // 데모 데이터 1회 셋업
      const demo = {
        slug:'byhen',
        name:'BYHEN',
        thumbnail:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200',
        subThumbnails:[
          'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800',
          'https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=800'
        ],
        schedule:{ open:{ start:'10:00', end:'19:00', slot:60 }, overrides:{
          [ymd(new Date())]: { soldout:['13:00','14:00'] }
        }},
        contact:{phone:'02-000-0000',email:'hello@byhen.studio',kakao:'https://pf.kakao.com/_byhen'},
        intro:'한 공간에서 다양한 컨셉 촬영이 가능한 성수동 스튜디오입니다.',
        usageGuide:'• 예약금 20% 선결제\n• 촬영 3일 전 50% 환불, 1일 전 20%, 당일 환불 불가',
        priceInfo:'베이직 2h 350,000원\n프리미엄 4h 650,000원',
        address:'서울 성수동 XX로 00-0',
        map:{link:'https://map.naver.com'},
        gallery:[
          'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800',
          'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=800'
        ],
        closed:[],
        booked:[],
        timeslots:[]
      };
      localStorage.setItem('brand:'+SLUG, JSON.stringify(demo));
      BRAND = demo;
    }
    renderAll();
    bind();
  })();
})();