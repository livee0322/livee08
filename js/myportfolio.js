/* My Portfolio – v1.1
   - 빈문구 항상 보이던 문제 해결 (토글 강화)
   - 상단 우측 '+ 등록'만 유지
*/
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const THUMB = CFG.thumb || {
    square:  'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
  };
  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const grid  = document.getElementById('mpGrid');
  const empty = document.getElementById('mpEmpty');

  // ---- helpers ----
  const headers = (json=true) => {
    const h={};
    if (json) h['Content-Type']='application/json';
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };

  const isCloudinary = (u)=>/https?:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(u||'');
  const inject = (url, t) => {
    try{
      if (!url || !/\/upload\//.test(url)) return url || '';
      if (isCloudinary(url)) {
        const i=url.indexOf('/upload/');
        const first = url.slice(i+8).split('/')[0]||'';
        if (/^([a-z]+_[^/]+,?)+$/.test(first)) return url; // 이미 변환 존재
        return url.slice(0,i+8) + t + '/' + url.slice(i+8);
      }
      return url;
    }catch{ return url; }
  };
  const FALLBACK =
    CFG.placeholderThumb ||
    (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  const coverSrc  = (p)=> p.coverImageUrl  ? inject(p.coverImageUrl,  THUMB.cover169) : FALLBACK;
  const avatarSrc = (p)=> p.mainThumbnailUrl? inject(p.mainThumbnailUrl,THUMB.square)  : FALLBACK;

  // ---- API ----
  async function fetchMine(){
    const base = CFG.endpoints?.portfolios || '/portfolio-test';
    const url  = `${API_BASE}${base}?mine=1&limit=50`;
    const res  = await fetch(url, { headers: headers(false) });
    const j    = await res.json().catch(()=>({}));
    if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
    const arr =
      (Array.isArray(j) && j) ||
      j.items || j.data?.items || j.docs || j.data?.docs || [];
    return arr.map((p,i)=>({
      id: p.id || p._id || `${i}`,
      nickname: p.nickname || '무명',
      headline: p.headline || '',
      cover: coverSrc(p),
      avatar: avatarSrc(p),
    }));
  }

  async function removeItem(id){
    if (!TOKEN){ alert('로그인 후 이용해주세요.'); return false; }
    if (!confirm('정말 삭제할까요? 되돌릴 수 없습니다.')) return false;
    const res = await fetch(`${API_BASE}/portfolio-test/${encodeURIComponent(id)}`, {
      method:'DELETE', headers: headers(false)
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
    return true;
  }

  // ---- render ----
  function toggleEmpty(show){
    if (!empty) return;
    empty.hidden = !show;
  }

  function render(list){
    if (!grid) return;
    if (!Array.isArray(list)) list = [];
    if (!list.length){
      grid.innerHTML = '';
      toggleEmpty(true);
      return;
    }
    toggleEmpty(false);
    grid.innerHTML = list.map(it => `
      <article class="mp-card" data-id="${it.id}">
        <a class="mp-coverWrap" href="portfolio-view.html?id=${encodeURIComponent(it.id)}" aria-label="포트폴리오 보기">
          <img class="mp-cover"  src="${it.cover}"  alt="">
          <img class="mp-avatar" src="${it.avatar}" alt="">
        </a>
        <div class="mp-body">
          <div class="mp-name">${it.nickname}</div>
          <div class="mp-desc">${it.headline}</div>
        </div>
        <div class="mp-actions">
          <a class="btn" href="portfolio-view.html?id=${encodeURIComponent(it.id)}"><i class="ri-external-link-line"></i> 보기</a>
          <a class="btn" href="portfolio-edit.html?id=${encodeURIComponent(it.id)}"><i class="ri-edit-line"></i> 수정</a>
          <button class="btn danger" data-act="del"><i class="ri-delete-bin-line"></i> 삭제</button>
        </div>
      </article>
    `).join('');
  }

  // 삭제 위임
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-act="del"]');
    if (!btn) return;
    const card = btn.closest('.mp-card');
    const id   = card?.dataset.id;
    try{
      btn.disabled = true;
      if (await removeItem(id)){
        card.style.transition='opacity .18s ease, transform .18s ease';
        card.style.opacity='0'; card.style.transform='scale(.98)';
        setTimeout(()=> {
          card.remove();
          if (!grid.children.length) toggleEmpty(true);
        }, 180);
      }
    }catch(err){
      console.error(err);
      alert('삭제 실패: ' + (err.message || 'ERROR'));
    }finally{
      btn.disabled = false;
    }
  });

  // start
  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      const list = await fetchMine();
      render(list);
    }catch(e){
      console.warn('[myportfolio] load error', e);
      render([]); // 에러 시에도 일단 빈상태 표시
    }
  });
})();