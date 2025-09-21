/* byhen-admin.js — v4.2
   - 이미지: Cloudinary unsigned 있으면 사용, 없으면 base64(DataURL)로 저장
   - 스케줄: 달력 UI + 시작/마감 모달 + 날짜별 1시간 슬롯 토글(마감)
   - 저장 시 구형 필드(timeslots/closed/bookedTimes)도 자동 채움(노출페이지 호환)
*/
(function () {
  'use strict';

  // ---------- Config ----------
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const BRAND_BASE = (EP.brandBase || '/brand-test').replace(/^\/*/, '/');

  // Cloudinary unsigned(선택)
  const U = (CFG.cloudinaryUnsigned || CFG.cloudinary || {});
  const CLOUD_NAME = U.cloudName || U.name || '';
  const PRESET     = U.uploadPreset || U.unsignedPreset || U.preset || '';

  const THUMB = {
    main:   CFG.thumb?.cover169 || 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
    square: CFG.thumb?.square   || 'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
  };
  const withTr=(url,t)=>{ try{ if(!url||!/\/upload\//.test(url)) return url||''; const i=url.indexOf('/upload/'); return url.slice(0,i+8)+t+'/'+url.slice(i+8);}catch{return url||'';} };

  const $  = (s, el=document)=>el.querySelector(s);
  const say=(m,ok=false)=>{ const n=$('#admMsg'); if(!n) return; n.textContent=m; n.classList.add('show'); n.classList.toggle('ok',!!ok); };

  // ---------- Upload ----------
  function fileToDataURL(file){
    return new Promise((res,rej)=>{const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file);});
  }
  async function uploadUnsigned(file){
    if(!CLOUD_NAME || !PRESET) throw new Error('UNSIGNED_NOT_CONFIGURED');
    const fd=new FormData(); fd.append('file',file); fd.append('upload_preset',PRESET);
    const url=`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const r=await fetch(url,{method:'POST',body:fd}); const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${r.status}`);
    return j.secure_url;
  }
  async function uploadImage(file, transform){
    if(!file) throw new Error('파일 없음');
    if(!/^image\//.test(file.type)) throw new Error('이미지 파일만');
    if(file.size>10*1024*1024) throw new Error('최대 10MB');
    try{ const u=await uploadUnsigned(file); return transform?withTr(u,transform):u; }
    catch{ return await fileToDataURL(file); }
  }

  // ---------- State ----------
  const qs=new URLSearchParams(location.search);
  const state={
    id: qs.get('id') || '',
    uploads:0,
    doc:{
      type:'brand', status:'draft',
      name:'', slug:'',
      thumbnail:'', subThumbnails:[], gallery:[],
      intro:'', description:'', usageGuide:'', priceInfo:'',
      contact:{phone:'',email:'',kakao:''},
      address:'', map:{link:''},
      // 새 스케줄 모델
      schedule:{ open:{ start:'10:00', end:'19:00', slot:60 }, overrides:{} },
      // 구형 호환 필드(자동 채움)
      availableHours:'', timeslots:[], availableDates:[], closed:[], booked:[], bookedTimes:[]
    },
    // 달력/선택
    curMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    picked: '' // 'YYYY-MM-DD'
  };
  const bump=(n)=>{ state.uploads=Math.max(0,state.uploads+n); };

  // ---------- Time helpers ----------
  const pad=n=>String(n).padStart(2,'0');
  const ymd=(d)=> d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const ym =(d)=> d.getFullYear()+'-'+pad(d.getMonth()+1);
  const toMin=(hhmm='00:00')=>{const [h,m]=hhmm.split(':').map(Number); return h*60+(m||0);};
  const toHHMM=(m)=> pad(Math.floor(m/60))+':'+pad(m%60);
  function genSlots(start='10:00', end='19:00', step=60){
    const s=toMin(start), e=toMin(end), arr=[];
    for(let t=s; t+step<=e; t+=step) arr.push(toHHMM(t));
    return arr;
  }

  // ---------- DOM ----------
  const el={};
  function cacheDom(){
    // 기본
    el.name=$('#name'); el.slug=$('#slug');
    el.thumbPrev=$('#thumbPrev'); el.thumbFile=$('#thumbFile'); el.thumbTrigger=$('#thumbTrigger');
    el.subsFile=$('#subsFile'); el.subsTrigger=$('#subsTrigger'); el.subsGrid=$('#subsGrid');
    el.intro=$('#intro'); el.description=$('#description');
    el.usageGuide=$('#usageGuide'); el.priceInfo=$('#priceInfo');
    el.phone=$('#phone'); el.email=$('#email'); el.kakao=$('#kakao');
    el.address=$('#address'); el.mapLink=$('#mapLink');
    el.galleryFile=$('#galleryFile'); el.galleryTrigger=$('#galleryTrigger'); el.galleryGrid=$('#galleryGrid');
    el.publishBtn=$('#publishBtn'); el.saveDraftBtn=$('#saveDraftBtn'); el.saveBtn=$('#saveBtn');

    // 스케줄
    el.admPrevM=$('#admPrevM'); el.admNextM=$('#admNextM'); el.admMonTitle=$('#admMonTitle'); el.admCalGrid=$('#admCalGrid');
    el.toggleClosedBtn=$('#toggleClosedBtn'); el.resetDayBtn=$('#resetDayBtn'); el.selDateLabel=$('#selDateLabel');
    el.slotGrid=$('#slotGrid'); el.timesInfo=$('#timesInfo');
    el.setStartBtn=$('#setStartBtn'); el.setEndBtn=$('#setEndBtn');
    el.startModal=$('#startModal'); el.endModal=$('#endModal');
    el.startTimeInput=$('#startTimeInput'); el.endTimeInput=$('#endTimeInput');
    el.saveStartTime=$('#saveStartTime'); el.saveEndTime=$('#saveEndTime');
  }

  // ---------- Draw: thumbnails/gallery ----------
  function drawSubs(){ el.subsGrid.innerHTML = state.doc.subThumbnails.map((u,i)=>`
    <div class="thumb"><img src="${u}" alt="sub-${i}"><button type="button" class="rm" data-i="${i}">×</button></div>`).join(''); }
  function drawGallery(){ el.galleryGrid.innerHTML = state.doc.gallery.map((u,i)=>`
    <div class="thumb"><img src="${u}" alt="gal-${i}"><button type="button" class="rm" data-i="${i}">×</button></div>`).join(''); }

  // ---------- Draw: calendar & slots ----------
  function isClosed(dateStr){ return !!state.doc.schedule.overrides?.[dateStr]?.closed; }
  function soldoutOf(dateStr){ return state.doc.schedule.overrides?.[dateStr]?.soldout || []; }
  function setSoldout(dateStr, list){ state.doc.schedule.overrides[dateStr] = Object.assign({}, state.doc.schedule.overrides[dateStr], { soldout:list }); }
  function toggleClosed(dateStr){
    const cur = state.doc.schedule.overrides?.[dateStr]?.closed;
    state.doc.schedule.overrides[dateStr] = Object.assign({}, state.doc.schedule.overrides[dateStr], { closed:!cur });
    renderCalendar(); renderSlots();
  }

  function renderCalendar(){
    el.admMonTitle.textContent = ym(state.curMonth);
    const first = new Date(state.curMonth.getFullYear(), state.curMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDay()===0? -5 : 1-first.getDay()+1); // 월요일 시작
    const cells=[];
    for(let i=0;i<42;i++){
      const d=new Date(start); d.setDate(start.getDate()+i);
      const ds=ymd(d); const closed=isClosed(ds);
      const booked = soldoutOf(ds)?.length>0;
      const sel = state.picked===ds ? ' sel' : '';
      const dot = closed? 'closed' : (booked? 'booked' : '');
      cells.push(`<div class="adm-day${sel}" data-ymd="${ds}">
        <span class="dn">${d.getDate()}</span>${dot?`<i class="adm-dot ${dot}"></i>`:''}
      </div>`);
    }
    el.admCalGrid.innerHTML = cells.join('');
  }

  function renderSlots(){
    const dateStr = state.picked;
    el.selDateLabel.textContent = dateStr ? `선택 날짜: ${dateStr}` : '';
    if(!dateStr){ el.slotGrid.innerHTML=''; el.timesInfo.textContent='달력에서 날짜를 선택하면 1시간 단위 버튼이 생성됩니다.'; return; }
    if(isClosed(dateStr)){
      el.slotGrid.innerHTML=''; el.timesInfo.textContent='휴무일로 설정된 날짜입니다. (상단 버튼으로 해제 가능)'; return;
    }
    const S=state.doc.schedule.open;
    const base = genSlots(S.start, S.end, S.slot||60);
    const sold = new Set(soldoutOf(dateStr));
    el.timesInfo.textContent='해당 시간 버튼을 눌러 “마감” 토글하세요.';
    el.slotGrid.innerHTML = base.map(t=>{
      const off = sold.has(t) ? ' off' : '';
      return `<button class="slot-btn${off}" data-time="${t}">${t}</button>`;
    }).join('');
  }

  // ---------- Bind ----------
  function bind(){
    // 이미지
    el.thumbTrigger?.addEventListener('click',()=>el.thumbFile?.click());
    el.subsTrigger?.addEventListener('click',()=>el.subsFile?.click());
    el.galleryTrigger?.addEventListener('click',()=>el.galleryFile?.click());

    el.thumbFile?.addEventListener('change', async e=>{
      const f=e.target.files?.[0]; if(!f) return;
      const local=URL.createObjectURL(f); el.thumbPrev.src=local; el.thumbPrev.style.display='block';
      bump(+1);
      try{ say('메인 업로드 중…'); const u=await uploadImage(f, THUMB.main); state.doc.thumbnail=u; el.thumbPrev.src=u; say('메인 업로드 완료',true); }
      catch(err){ say('메인 업로드 실패: '+(err.message||'오류')); }
      finally{ bump(-1); URL.revokeObjectURL(local); e.target.value=''; }
    });

    el.subsFile?.addEventListener('change', async e=>{
      const files=[...(e.target.files||[])].slice(0, 5 - state.doc.subThumbnails.length);
      for(const f of files){
        bump(+1);
        try{ const u=await uploadImage(f, THUMB.square); state.doc.subThumbnails.push(u); drawSubs(); }
        catch(err){ say('서브 업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });
    el.subsGrid?.addEventListener('click', e=>{
      const b=e.target.closest('.rm'); if(!b) return;
      state.doc.subThumbnails.splice(Number(b.dataset.i),1); drawSubs();
    });

    el.galleryFile?.addEventListener('change', async e=>{
      const files=[...(e.target.files||[])];
      for(const f of files){
        bump(+1);
        try{ const u=await uploadImage(f, THUMB.square); state.doc.gallery.push(u); drawGallery(); }
        catch(err){ say('갤러리 업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });
    el.galleryGrid?.addEventListener('click', e=>{
      const b=e.target.closest('.rm'); if(!b) return;
      state.doc.gallery.splice(Number(b.dataset.i),1); drawGallery();
    });

    // 달력/슬롯
    el.admPrevM?.addEventListener('click',()=>{ state.curMonth.setMonth(state.curMonth.getMonth()-1); renderCalendar(); });
    el.admNextM?.addEventListener('click',()=>{ state.curMonth.setMonth(state.curMonth.getMonth()+1); renderCalendar(); });
    el.admCalGrid?.addEventListener('click', e=>{
      const cell=e.target.closest('.adm-day'); if(!cell) return;
      state.picked = cell.dataset.ymd; renderCalendar(); renderSlots();
    });

    el.slotGrid?.addEventListener('click', e=>{
      const b=e.target.closest('.slot-btn'); if(!b||!state.picked) return;
      const t=b.dataset.time; const cur=new Set(soldoutOf(state.picked));
      if(cur.has(t)) cur.delete(t); else cur.add(t);
      setSoldout(state.picked, Array.from(cur).sort());
      renderSlots(); renderCalendar();
    });

    el.toggleClosedBtn?.addEventListener('click', ()=>{ if(!state.picked){say('날짜를 먼저 선택하세요'); return;} toggleClosed(state.picked); });
    el.resetDayBtn?.addEventListener('click', ()=>{ if(!state.picked) return; delete state.doc.schedule.overrides[state.picked]; renderSlots(); renderCalendar(); });

    // 시작/마감 모달
    const openModal = (box)=> box.classList.add('show');
    const closeModal = (e)=>{ if(e.target.hasAttribute('data-x')||e.target.classList.contains('modal')) e.currentTarget.classList.remove('show'); };
    el.startModal?.addEventListener('click', closeModal);
    el.endModal?.addEventListener('click', closeModal);

    el.setStartBtn?.addEventListener('click', ()=>{ el.startTimeInput.value = state.doc.schedule.open.start; openModal(el.startModal); });
    el.setEndBtn  ?.addEventListener('click', ()=>{ el.endTimeInput.value   = state.doc.schedule.open.end;   openModal(el.endModal);   });

    el.saveStartTime?.addEventListener('click', ()=>{
      const v=el.startTimeInput.value||'10:00';
      state.doc.schedule.open.start=v;
      el.startModal.classList.remove('show'); renderSlots();
    });
    el.saveEndTime?.addEventListener('click', ()=>{
      const v=el.endTimeInput.value||'19:00';
      state.doc.schedule.open.end=v;
      el.endModal.classList.remove('show'); renderSlots();
    });

    // 저장 버튼
    el.saveDraftBtn?.addEventListener('click', e=>{e.preventDefault(); submit('draft');});
    el.saveBtn?.addEventListener('click',      e=>{e.preventDefault(); submit('published');});
    el.publishBtn?.addEventListener('click',   e=>{e.preventDefault(); submit('published');});
  }

  // ---------- Load ----------
  async function loadIfEdit(){
    if(!state.id) { renderCalendar(); renderSlots(); return; }
    try{
      say('불러오는 중…');
      const r=await fetch(`${API_BASE}${BRAND_BASE}/${state.id}`,{headers:{Accept:'application/json'}});
      const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const d=j.data||j;

      Object.assign(state.doc,{
        status:d.status||'draft', name:d.name||'', slug:d.slug||'',
        thumbnail:d.thumbnail||'', subThumbnails:Array.isArray(d.subThumbnails)?d.subThumbnails:[],
        gallery:Array.isArray(d.gallery)?d.gallery:[],
        intro:d.intro||'', description:d.description||'', usageGuide:d.usageGuide||'', priceInfo:d.priceInfo||'',
        contact:{ phone:d.contact?.phone||'', email:d.contact?.email||'', kakao:d.contact?.kakao||'' },
        address:d.address||'', map:{link:d.map?.link||''},
        schedule: d.schedule && d.schedule.open ? d.schedule : state.doc.schedule,
        availableHours:d.availableHours||'', timeslots:Array.isArray(d.timeslots)?d.timeslots:[],
        availableDates:Array.isArray(d.availableDates)?d.availableDates:[],
        closed:Array.isArray(d.closed)?d.closed:[],
        booked:Array.isArray(d.booked)?d.booked:[],
        bookedTimes:Array.isArray(d.bookedTimes)?d.bookedTimes:[]
      });

      $('#name').value=state.doc.name; $('#slug').value=state.doc.slug;
      if(state.doc.thumbnail){ el.thumbPrev.src=state.doc.thumbnail; el.thumbPrev.style.display='block'; }
      drawSubs(); drawGallery();
      $('#intro').value=state.doc.intro; $('#description').value=state.doc.description;
      $('#usageGuide').value=state.doc.usageGuide; $('#priceInfo').value=state.doc.priceInfo;
      $('#phone').value=state.doc.contact.phone; $('#email').value=state.doc.contact.email; $('#kakao').value=state.doc.contact.kakao;
      $('#address').value=state.doc.address; $('#mapLink').value=state.doc.map.link;

      renderCalendar(); renderSlots();
      say('로드 완료',true);
    }catch(e){ say('불러오기 실패: '+(e.message||'오류')); renderCalendar(); renderSlots(); }
  }

  // ---------- Save ----------
  function collect(status){
    const d=state.doc;
    d.status=status||'draft';
    d.name=$('#name').value.trim();
    d.slug=$('#slug').value.trim().toLowerCase();
    d.intro=$('#intro').value.trim();
    d.description=$('#description').value.trim();
    d.usageGuide=$('#usageGuide').value.trim();
    d.priceInfo=$('#priceInfo').value.trim();
    d.contact={ phone:$('#phone').value.trim(), email:$('#email').value.trim(), kakao:$('#kakao').value.trim() };
    d.address=$('#address').value.trim();
    d.map={ link:$('#mapLink').value.trim() };

    // 스케줄 → 구형 호환값 자동 생성
    const open=d.schedule.open;
    d.timeslots = genSlots(open.start, open.end, open.slot||60);
    d.availableHours = `${open.start}–${open.end}`;
    const ov=d.schedule.overrides||{};
    d.closed = Object.keys(ov).filter(k=>ov[k]?.closed);
    d.bookedTimes = Object.entries(ov).map(([date,v])=> (v?.soldout?.length? {date, times:v.soldout} : null)).filter(Boolean);
    // (옵션) 하루 모든 슬롯이 마감이면 booked(날짜 레벨)로도 표시
    d.booked = Object.entries(ov).filter(([date,v])=>Array.isArray(v?.soldout) && v.soldout.length>=d.timeslots.length).map(([date])=>date);

    return d;
  }

  async function submit(status){
    if(state.uploads>0){ say('이미지 업로드 중입니다. 잠시 후 시도'); return; }
    const doc=collect(status);
    if(!doc.name) return say('브랜드명을 입력하세요');
    if(!doc.slug) return say('슬러그를 입력하세요');

    try{
      say(status==='published'?'발행 중…':'저장 중…');
      const url = state.id ? `${API_BASE}${BRAND_BASE}/${state.id}` : `${API_BASE}${BRAND_BASE}`;
      const method = state.id ? 'PUT' : 'POST';
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(doc)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      say('완료되었습니다',true);
      const saved=j.data||j; const newId=saved._id;
      if(newId){ localStorage.setItem('byhen:lastId', newId); localStorage.setItem('byhen:lastSlug', saved.slug || doc.slug); }
      if(!state.id && newId){ location.replace(location.pathname+'?id='+encodeURIComponent(newId)); }
    }catch(e){ say('저장 실패: '+(e.message||'오류')); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ cacheDom(); bind(); loadIfEdit(); });
})();