/* byhen.js — v1.0.1 (브랜드 뷰) */
(function(){
  const CFG=window.LIVEE_CONFIG||{};
  const API_BASE=((CFG.API_BASE||'/api/v1').toString().trim()||'/api/v1').replace(/\/+$/,'');
  const BRAND_BASE=(CFG.endpoints?.byhen||'/brand-test').replace(/^\/+/,'');

  const $=(s,e=document)=>e.querySelector(s);
  const $$=(s,e=document)=>[...e.querySelectorAll(s)];
  const ymd=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const slug=new URLSearchParams(location.search).get('slug')||'byhen';

  async function getBrand(){
    const primary=`${API_BASE}/${BRAND_BASE.replace(/^brands-test$/,'brand-test')}/${slug}`;
    const alt    =`${API_BASE}/brand-test/${slug}`;
    let r=await fetch(primary); if(!r.ok && r.status===404) r=await fetch(alt);
    const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data||j;
  }

  function mount(d){
    // hero
    $('#mainThumb').src = d.thumbnail||'';
    const subs = (d.subThumbnails||[]).map((s,i)=>`<img src="${s}" data-i="${i}">`).join('');
    $('#subThumbs').innerHTML = subs;
    $('#subThumbs').onclick=(e)=>{const im=e.target.closest('img'); if(!im) return; $('#mainThumb').src=im.src; $$('#subThumbs img').forEach(x=>x.classList.toggle('sel',x===im)); };
    const first=$('#subThumbs img'); first&&first.classList.add('sel');

    // chips
    $('#chips').innerHTML = [
      d.availableHours?`<span class="chip"><i class="ri-time-line"></i>${d.availableHours}</span>`:'',
      (d.timeslots?.length?`<span class="chip"><i class="ri-checkbox-circle-line"></i>타임슬롯 ${d.timeslots.length}</span>`:'')
    ].join('');
    $('#intro').textContent = d.description || d.intro || '-';

    // 연락/주소
    $('#phone').textContent=d.contact?.phone||'-';
    $('#email').textContent=d.contact?.email||'-';
    $('#kakao').innerHTML=d.contact?.kakao?`<a href="${d.contact.kakao}" target="_blank" rel="noopener">${d.contact.kakao}</a>`:'-';
    $('#address').textContent=d.address||'-';
    $('#mapLink').innerHTML=d.map?.link?`<a class="btn" href="${d.map.link}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 지도 열기</a>`:''

    // 안내/가격/갤러리
    $('#guide').textContent=d.usageGuide||'-';
    $('#pricing').textContent=d.priceInfo||'-';
    $('#gallery').innerHTML=(d.gallery||[]).map(s=>`<img src="${s}" alt="">`).join('');

    // 스케줄 달력
    const closed=new Set(d.closed||[]), booked=new Set(d.booked||[]);
    const today=new Date(); let cur=new Date(today.getFullYear(),today.getMonth(),1); let picked=null;
    function dayStatus(s){ if(closed.has(s)) return 'closed'; if(booked.has(s)) return 'booked'; if(d.availableDates?.length) return d.availableDates.includes(s)?'ok':'closed'; return 'ok'; }
    function ym(x){return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;}
    function renderCal(){
      $('#monTitle').textContent=ym(cur);
      const first=new Date(cur.getFullYear(),cur.getMonth(),1);
      const start=new Date(first); start.setDate(first.getDay()===0? -5 : 1-first.getDay()+1);
      let html='';
      for(let i=0;i<42;i++){
        const dt=new Date(start); dt.setDate(start.getDate()+i);
        const s=ymd(dt); const st=dayStatus(s); const sel=(picked===s);
        html+=`<div class="day ${st} ${st==='ok'?'ok':''} ${sel?'sel':''}" data-ymd="${s}"><span class="dn">${dt.getDate()}</span><i class="dot ${st}"></i></div>`;
      }
      $('#calGrid').innerHTML=html;
    }
    $('#prevM').onclick=()=>{cur.setMonth(cur.getMonth()-1);renderCal();}
    $('#nextM').onclick=()=>{cur.setMonth(cur.getMonth()+1);renderCal();}
    $('#calGrid').onclick=(e)=>{const cell=e.target.closest('.day.ok'); if(!cell) return; picked=cell.dataset.ymd; renderCal(); }
    renderCal();
  }

  (async function init(){
    try{ const d=await getBrand(); mount(d); }
    catch(e){ console.error(e); alert('브랜드 로드 실패: '+(e.message||'오류')); }
  })();
})();