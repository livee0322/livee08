/* js/inbox-proposals.js — v1.1.0
   - GET /offers-test?box=received&page=&limit=
   - PATCH /offers-test/:id/status { status }
   - CORS: credentials 사용 금지(Authorization 헤더만)
*/
(() => {
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP  = (CFG.endpoints || {});
  const OFFERS_BASE = (EP.offersBase || '/offers-test');

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // 헤더/탭바
  try {
    window.LIVEE_UI?.mountHeader?.({ title:'받은 제안' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'mypage' });
  } catch(_) {}

  // -------- state --------
  let page = 1, limit = 20, loading = false, done = false;
  let filter = ''; // '', 'pending','on_hold','accepted','rejected'
  let cache = [];  // 누적 items

  const elList = $('#list');
  const elMsg  = $('#ipMsg');
  const elMore = $('#loadMore');
  const elModal= $('#ipModal');
  const elDetail = $('#ipDetail');

  const prettyDate = (s) => {
    try {
      const d = new Date(s);
      return isNaN(d) ? '-' : d.toLocaleString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    } catch(_){ return '-'; }
  };
  const statusName = (st) => ({
    pending:'대기', on_hold:'보류', accepted:'수락', rejected:'거절', withdrawn:'철회'
  }[st] || st);

  function authHeaders(){
    const h = { 'Accept':'application/json', 'Content-Type':'application/json' };
    if (TOKEN) h['Authorization'] = 'Bearer ' + TOKEN;
    return h;
  }

  async function fetchPage(){
    if (loading || done) return;
    loading = true;
    elMsg.textContent = '';
    try{
      const url = `${API}${OFFERS_BASE}?box=received&page=${page}&limit=${limit}`;
      const r = await fetch(url, { method:'GET', headers:authHeaders() }); // NOTE: no credentials!
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = await r.json();
      const items = Array.isArray(j.items) ? j.items : [];
      cache = cache.concat(items);
      if (items.length < limit) done = true;
      page += 1;
      render();
    }catch(err){
      console.error('[offers:inbox] load failed:', err);
      elMsg.textContent = '제안 목록을 불러오지 못했습니다.';
    }finally{
      loading = false;
      elMore.disabled = done;
    }
  }

  function card(o){
    const pf   = o.toPortfolioId || {};
    const name = pf.nickname || '쇼호스트';
    const thumb= pf.mainThumbnailUrl || (CFG.placeholderThumb || 'default.jpg');
    const meta = `${statusName(o.status)} · ${prettyDate(o.createdAt)}`;
    const msg  = String(o.message||'').replace(/\n/g,' ').slice(0,90);
    return `
      <article class="ip-item" data-id="${o.id}">
        <img class="ip-avatar" src="${thumb}" alt="">
        <div class="ip-body">
          <div class="ip-name">${name}</div>
          <div class="ip-msgline">${msg || '메시지 없음'}</div>
          <div class="ip-meta">${meta}</div>
        </div>
        <button class="ip-open" aria-label="상세 보기"><i class="ri-arrow-right-s-line"></i></button>
      </article>
    `;
  }

  function render(){
    const list = cache.filter(it => !filter || it.status === filter);
    elList.innerHTML = list.length
      ? list.map(card).join('')
      : `<div class="ip-empty">표시할 제안이 없습니다</div>`;
  }

  // 상세 모달 열기
  function openModal(id){
    const o = cache.find(x=>x.id===id); if(!o) return;
    const pf = o.toPortfolioId || {};
    elDetail.innerHTML = `
      <div class="ip-dl">
        <div><b>대상 포트폴리오</b><div>${pf.nickname || '-'}</div></div>
        <div><b>상태</b><div>${statusName(o.status)}</div></div>
        <div><b>받은 시각</b><div>${prettyDate(o.createdAt)}</div></div>
        ${o.recruitId ? `<div><b>관련 공고</b><div>${o.recruitId.title || ''}</div></div>` : ''}
        <div class="ip-memo"><b>메시지</b><p>${(o.message||'').replace(/\n/g,'<br>') || '메시지 없음'}</p></div>
      </div>
    `;
    elModal.setAttribute('aria-hidden','false');
    elModal.classList.add('is-on');

    // 버튼 상태
    $$('.ip-modal__ft .btn', elModal).forEach(b=>{
      const act = b.getAttribute('data-act');
      // 수신자만 변경 가능하므로 모두 표시. 필요시 상태별 비활성화
      b.disabled = (o.status === 'accepted' && act !== 'accepted');
    });

    // 액션 핸들러
    $$('.ip-modal__ft .btn', elModal).forEach(b=>{
      b.onclick = async () => {
        const want = b.getAttribute('data-act'); // on_hold | rejected | accepted
        try{
          const r = await fetch(`${API}${OFFERS_BASE}/${encodeURIComponent(id)}/status`, {
            method:'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ status: want })
          });
          if (!r.ok) throw new Error(`${r.status}`);
          const j = await r.json();
          // 캐시 갱신 후 다시 렌더
          const idx = cache.findIndex(x=>x.id===id);
          if (idx >= 0) cache[idx] = j.data;
          render();
          closeModal();
        }catch(err){
          console.error('[offers] status change failed', err);
          alert('상태 변경에 실패했습니다.');
        }
      };
    });
  }

  function closeModal(){
    elModal.classList.remove('is-on');
    elModal.setAttribute('aria-hidden','true');
  }

  // ----- events -----
  $('#ipClose')?.addEventListener('click', closeModal);
  elModal?.addEventListener('click', (e)=>{ if(e.target===elModal) closeModal(); });
  elMore?.addEventListener('click', fetchPage);

  $('#filters')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.ip-tab'); if(!b) return;
    $$('.ip-tab', $('#filters')).forEach(x=>x.classList.toggle('is-on', x===b));
    filter = b.getAttribute('data-status') || '';
    render();
  });

  elList?.addEventListener('click', (e)=>{
    const it = e.target.closest('.ip-item'); if(!it) return;
    openModal(it.getAttribute('data-id'));
  });

  // ----- init -----
  if (!TOKEN) {
    elMsg.textContent = '로그인이 필요합니다.';
  } else {
    fetchPage();
  }
})();