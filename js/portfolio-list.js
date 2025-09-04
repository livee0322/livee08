/* Portfolio List – v3.0 (card UI + real actions) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  // 기본은 내 포트폴리오 목록(액션 버튼 표시 목적)
  const LIST_PATH = EP.portfolios || '/portfolio-test?mine=1&limit=24';

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // === 이미지 선택/변환 ===
  const FALLBACK =
    CFG.placeholderThumb ||
    (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  const pickImage = (p) =>
    p.mainThumbnailUrl ||
    (Array.isArray(p.subThumbnails) && p.subThumbnails[0]) ||
    p.coverImageUrl || '';

  const isCloudinary = (u) =>
    /https?:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(u);
  const hasTransform = (u) => {
    if (!isCloudinary(u)) return false;
    const tail = u.split('/upload/')[1] || '';
    const first = tail.split('/')[0] || '';
    return /^([a-z]+_[^/]+,?)+$/.test(first);
  };
  const PRESET =
    (CFG.thumb && CFG.thumb.square) || 'c_fill,g_auto,w_400,h_400,f_auto,q_auto';
  const cldSquare = (u) => {
    if (!isCloudinary(u)) return u;
    try {
      if (hasTransform(u)) return u;
      const [head, tail] = u.split('/upload/');
      return `${head}/upload/${PRESET}/${tail}`;
    } catch { return u; }
  };
  const thumbSrc = (u) => (u ? cldSquare(u) : FALLBACK);

  // === API ===
  const headers = (json=true) => {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };

  async function fetchList() {
    const base = LIST_PATH.startsWith('http')
      ? LIST_PATH
      : `${API_BASE}${LIST_PATH.startsWith('/') ? LIST_PATH : `/${LIST_PATH}`}`;

    try {
      const res = await fetch(base, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `HTTP_${res.status}`);

      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];

      return list.map((p, i) => ({
        id: p.id || p._id || `${i}`,
        nickname: p.nickname || '무명',
        headline: p.headline || '',
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 5) : [],
        img: pickImage(p),
        updatedAt: p.updatedAt || p.createdAt || '',
        openToOffers: !!p.openToOffers
      }));
    } catch (e) {
      console.warn('[portfolio-list] fetch error:', e);
      return [];
    }
  }

  async function removeItem(id){
    const ok = confirm('정말 삭제할까요? 되돌릴 수 없습니다.');
    if (!ok) return false;
    const res = await fetch(`${API_BASE}/portfolio-test/${encodeURIComponent(id)}`, {
      method:'DELETE', headers: headers(false)
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
    return true;
  }

  // === 렌더 ===
  function render(list){
    const grid  = $('#plGrid');
    const empty = $('#plEmpty');
    if (!grid) return;

    if (!list.length){
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    grid.innerHTML = list.map(it => `
      <article class="pl-card" data-id="${it.id}">
        <a class="pl-thumbWrap" href="portfolio-view.html?id=${encodeURIComponent(it.id)}" aria-label="보기">
          <img class="pl-thumb" src="${thumbSrc(it.img)}" alt="" onerror="this.onerror=null;this.src='${FALLBACK}'" />
        </a>
        <div class="pl-body">
          <div class="pl-nick">${it.nickname}</div>
          <div class="pl-head">${it.headline || ''}</div>
          ${it.tags && it.tags.length ? `
            <div class="pl-tags">${it.tags.map(t=>`<span class="pl-tag">#${t}</span>`).join('')}</div>
          `:''}
        </div>
        <div class="pl-actions">
          <a class="btn ghost" data-act="view"  href="portfolio-view.html?id=${encodeURIComponent(it.id)}"><i class="ri-external-link-line"></i> 보기</a>
          <a class="btn"       data-act="edit"  href="portfolio-edit.html?id=${encodeURIComponent(it.id)}"><i class="ri-edit-line"></i> 수정</a>
          <button class="btn danger" data-act="del"><i class="ri-delete-bin-line"></i> 삭제</button>
        </div>
      </article>
    `).join('');
  }

  // === 액션 바인딩(위임) ===
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;

    const card = btn.closest('.pl-card');
    const id   = card?.dataset.id;
    const act  = btn.dataset.act;

    // 토큰 없는 상태에서 수정/삭제 시 로그인 필요
    if (['edit','del'].includes(act) && !TOKEN){
      e.preventDefault();
      alert('로그인 후 이용해주세요.');
      return;
    }

    try{
      if (act === 'del'){
        e.preventDefault();
        btn.disabled = true;
        btn.classList.add('loading');
        const ok = await removeItem(id);
        if (ok) {
          // 자연스러운 제거 애니메이션
          card.style.transition = 'opacity .18s ease, transform .18s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(.98)';
          setTimeout(()=> card.remove(), 180);
          // 비어있으면 empty 표시
          setTimeout(()=>{
            if (!$('#plGrid').children.length && $('#plEmpty')) $('#plEmpty').hidden = false;
          }, 220);
        }
      }
      // edit/view 는 a 링크 그대로 이동
    }catch(err){
      console.error('[delete]', err);
      alert('삭제 실패: ' + (err.message || 'ERROR'));
    }finally{
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });

  // === 시작 ===
  document.addEventListener('DOMContentLoaded', async () => {
    render(await fetchList());
  });
})();