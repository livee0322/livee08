/* News page — reference style list + modal write (publish now) */
(() => {
  const $ = (s, el=document)=> el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'news-test';
  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // ── ui.js 마운트 (index.html과 동일) ─────────────────────────────────────
  (function mountUI(){
    const UI = window.LIVEE_UI || {};
    if (UI.mountHeader) {
      UI.mountHeader({
        target: '#appbar',
        title: '뉴스',
        right: [{ id: 'openWrite', label: '작성하기', kind: 'primary' }],
      });
    } else {
      $('#appbar').innerHTML =
        `<div class="lv-appbar"><div class="lv-title">뉴스</div>
          <div class="lv-actions"><button id="openWrite" class="btn pri">작성하기</button></div></div>`;
    }
    if (UI.mountTopTabs) UI.mountTopTabs({ target:'#top-tabs', active:'news' });
    if (UI.mountTabbar)  UI.mountTabbar({ target:'#bottom-tabs', active:'home' });
  })();

  // ── utils ────────────────────────────────────────────────────────────────
  const FALLBACK_IMG = (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');
  async function getJSON(url){
    const r = await fetch(url, { headers:{ 'Accept':'application/json' }});
    const j = await r.json().catch(()=> ({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j;
  }
  const parseList = j => (Array.isArray(j) && j) || j.items || j.data?.items || j.data || [];
  const pickThumb = (n)=>
    n.thumbnailUrl ||
    n.imageUrl || n.imageURL || n.image ||
    n.thumbUrl  || n.thumb ||
    n.coverImageUrl || n.mainThumbnailUrl ||
    n.media?.thumbnailUrl || n.media?.imageUrl || '';

  function relTime(iso){
    if(!iso) return '';
    const d = new Date(iso), now = new Date();
    const diff = Math.max(0, (now - d)/1000);
    const m = Math.floor(diff/60), h = Math.floor(m/60), d2 = Math.floor(h/24);
    if (d2 > 0) return `${d2}일 전`;
    if (h > 0)  return `${h}시간 전`;
    if (m > 0)  return `${m}분 전`;
    return '방금 전';
  }

  // ── 리스트 ───────────────────────────────────────────────────────────────
  async function fetchNews(){
    try{
      const j = await getJSON(`${API_BASE}/${ENTITY}?status=published&limit=50`);
      const arr = parseList(j);
      return arr.map((n,i)=>({
        id: n._id || n.id || `${i}`,
        category: n.category || '공지',
        title: n.title || '(제목 없음)',
        summary: n.summary || '',
        createdAt: n.createdAt || n.updatedAt,
        thumb: pickThumb(n)
      }));
    }catch(e){ console.error(e); return []; }
  }
  function tplRows(items){
    if(!items.length){ $('#emptyBox').style.display='block'; return ''; }
    $('#emptyBox').style.display='none';
    return items.map(n=>`
      <article class="news-row">
        <div class="txt">
          <div class="meta"><span class="badge">${n.category}</span>${relTime(n.createdAt)}</div>
          <div class="title">${n.title}</div>
          <div class="sum">${n.summary || ''}</div>
        </div>
        <img class="thumb" src="${n.thumb || FALLBACK_IMG}" alt=""
             onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
      </article>
    `).join('');
  }
  async function renderList(){ $('#newsList').innerHTML = tplRows(await fetchNews()); }

  // ── 모달/업로드/등록 ──────────────────────────────────────────────────────
  const modal = $('#newsModal');
  const toast = $('#toast');
  const say = (t, ok=false)=>{ toast.textContent=t; toast.classList.add('show'); toast.classList.toggle('ok', ok); };
  const openModal = ()=>{ modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); };
  const closeModal= ()=>{
    modal.classList.remove('show'); modal.setAttribute('aria-hidden','true');
    toast.classList.remove('show','ok');
    $('#newsForm').reset(); $('#fileName').textContent='선택된 파일 없음';
    $('#thumbPrev').style.display='none'; state.thumbnailUrl='';
  };

  document.addEventListener('click', (e)=>{
    if (e.target.closest('#openWrite') || e.target.closest('#fabWrite')) {
      if(!TOKEN){ location.href='login.html?returnTo='+encodeURIComponent(location.pathname); return; }
      openModal();
    }
    if (e.target.matches('[data-close]') || e.target.closest('.modal__overlay')) closeModal();
  });

  // 업로드
  const state = { thumbnailUrl:'' };
  const file = $('#imageFile'), pickBtn = $('#pickImage'), fileName = $('#fileName'), prev=$('#thumbPrev');
  pickBtn.addEventListener('click', ()=> file.click());

  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: { 'Accept':'application/json' }});
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(f){
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd=new FormData();
    fd.append('file',f); fd.append('api_key',apiKey);
    fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({}));
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return j.secure_url;
  }
  const withTransform = (url) => {
    try{
      if(!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0,i+8) + 'c_fill,g_auto,w_640,h_640,f_auto,q_auto/' + url.slice(i+8);
    }catch{ return url; }
  };

  file.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ say('이미지 파일만 업로드 가능'); file.value=''; return; }
    if(f.size>8*1024*1024){ say('이미지는 8MB 이하'); file.value=''; return; }
    fileName.textContent = f.name;
    const local = URL.createObjectURL(f);
    prev.src = local; prev.style.display='block';
    try{
      say('이미지 업로드 중…');
      const url = await uploadImage(f);
      state.thumbnailUrl = withTransform(url);
      prev.src = state.thumbnailUrl;
      say('업로드 완료', true);
    }catch(err){ console.error(err); say('업로드 실패: '+err.message); }
    finally{ URL.revokeObjectURL(local); }
  });

  // 등록 (즉시 발행)
  $('#newsForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!$('#agree').checked){ say('동의가 필요합니다'); return; }
    const payload = {
      type:'news', status:'published', visibility:'public',
      category: $('#category').value || '공지',
      title: $('#title').value.trim(),
      summary: $('#summary').value.trim() || undefined,
      content: $('#content').value || undefined,
      thumbnailUrl: state.thumbnailUrl || undefined,
      consent: true
    };
    if(!payload.title){ say('제목을 입력해주세요'); return; }

    try{
      say('등록 중…');
      const r = await fetch(`${API_BASE}/${ENTITY}`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{}) },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      say('등록되었습니다', true);
      setTimeout(()=>{ closeModal(); renderList(); }, 250);
    }catch(err){ console.error(err); say('등록 실패: '+(err.message||'네트워크 오류')); }
  });

  // boot
  renderList();
})();