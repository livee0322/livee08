/* News page — list + write modal (Cloudinary upload, unified schema) */
(() => {
  const $ = (s, el=document)=> el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'news-test';
  const THUMB = CFG.thumb || { cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto" };

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // ---------- list ----------
  async function getJSON(url){
    const r = await fetch(url, { headers:{ 'Accept':'application/json' }});
    const j = await r.json().catch(()=> ({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }
  const parseList = j => (Array.isArray(j) && j) || j.items || j.data?.items || [];

  async function fetchNews(){
    try{
      const j = await getJSON(`${API_BASE}/${ENTITY}?status=published&limit=30`);
      const arr = parseList(j);
      return arr.map((n,i)=>({
        id: n._id || n.id || `${i}`,
        category: n.category || '공지',
        title: n.title || '(제목 없음)',
        summary: n.summary || '',
        thumbnailUrl: n.thumbnailUrl || '',
        createdAt: n.createdAt
      }));
    }catch(e){ console.error(e); return []; }
  }

  function tplCards(items){
    if(!items.length){ $('#emptyBox').style.display='block'; return ''; }
    $('#emptyBox').style.display='none';
    return items.map(n=>`
      <article class="card">
        <img class="thumb" src="${n.thumbnailUrl || (CFG.BASE_PATH?CFG.BASE_PATH+'/default.jpg':'default.jpg')}" alt="" />
        <div class="body">
          <span class="badge">${n.category}</span>
          <div class="title">${n.title}</div>
          <div class="sum">${n.summary || ''}</div>
        </div>
      </article>
    `).join('');
  }

  async function renderList(){
    const list = await fetchNews();
    $('#newsList').innerHTML = tplCards(list);
  }

  // ---------- modal ----------
  const modal = $('#newsModal');
  const toast = $('#toast');
  const say = (t, ok=false)=>{ toast.textContent=t; toast.classList.add('show'); toast.classList.toggle('ok', ok); };

  function openModal(){ modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); toast.classList.remove('show','ok'); $('#newsForm').reset(); $('#fileName').textContent='선택된 파일 없음'; $('#thumbPrev').style.display='none'; state.thumbnailUrl=''; }

  document.body.addEventListener('click', (e)=>{
    if(e.target.matches('#openWrite')){ 
      if(!TOKEN){ location.href='login.html?returnTo='+encodeURIComponent(location.pathname); return; }
      openModal();
    }
    if(e.target.matches('[data-close]')) closeModal();
    if(e.target.closest('.modal__overlay')) closeModal();
  });

  // ---------- upload ----------
  const state = { thumbnailUrl:'' };
  const pickBtn = $('#pickImage'), file = $('#imageFile'), fileName = $('#fileName'), prev=$('#thumbPrev');
  pickBtn.addEventListener('click', ()=> file.click());

  const withTransform = (url, t) => {
    try{
      if(!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0,i+8) + t + '/' + url.slice(i+8);
    }catch{ return url; }
  };

  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: { 'Accept':'application/json' }});
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }

  async function uploadImage(file){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd=new FormData();
    fd.append('file',file);
    fd.append('api_key',apiKey);
    fd.append('timestamp',timestamp);
    fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return j.secure_url;
  }

  file.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); file.value=''; return; }
    if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); file.value=''; return; }
    fileName.textContent = f.name;
    const local = URL.createObjectURL(f);
    prev.src = local; prev.style.display='block';
    try{
      say('이미지 업로드 중…');
      const url = await uploadImage(f);
      state.thumbnailUrl = withTransform(url, THUMB.cover169);
      prev.src = state.thumbnailUrl;
      say('업로드 완료', true);
    }catch(err){ console.error(err); say('업로드 실패: '+err.message); }
    finally{ URL.revokeObjectURL(local); }
  });

  // ---------- submit ----------
  $('#newsForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const agree = $('#agree').checked;
    if(!agree){ say('동의가 필요합니다'); return; }
    const title = $('#title').value.trim();
    if(!title){ say('제목을 입력해주세요'); return; }

    const payload = {
      type:'news',
      status:'pending',          // 관리자가 승인해 발행
      visibility:'public',
      category: $('#category').value || '공지',
      title,
      summary: $('#summary').value.trim() || undefined,
      content: $('#content').value || undefined,
      thumbnailUrl: state.thumbnailUrl || undefined,
      consent: true
    };

    try{
      say('요청 전송 중…');
      const r = await fetch(`${API_BASE}/${ENTITY}`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{}) },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);

      say('등록요청이 접수되었습니다', true);
      setTimeout(()=>{ closeModal(); renderList(); }, 400);
    }catch(err){ console.error(err); say('요청 실패: '+(err.message||'네트워크 오류')); }
  });

  // boot
  renderList();
})();