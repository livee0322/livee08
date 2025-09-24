/* inbox-proposals.js — v1.2 (robust inbox for Offer-test)
   - 컨테이너: #list, 메시지: #ipMsg, 필터: #filters, 더보기: #loadMore
   - /offers-test 에 대해 다양한 쿼리키 시도(inbox=1 | to=me | toUser=me | mine=received | toUser=<me.id> …)
   - 토큰 자동 부착, 응답 포맷(items|data|배열) 모두 호환
*/
(function () {
  'use strict';
  const $ = (s, el=document) => el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const BASE     = (EP.offersBase || '/offers-test').replace(/^\/*/,'/');

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // mount common UI(있으면)
  try {
    window.LIVEE_UI?.mountHeader?.({ title:'받은 제안' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'mypage' });
  } catch(_) {}

  // DOM refs
  const elMsg   = $('#ipMsg');
  const elList  = $('#list') || document.body;
  const elTabs  = $('#filters');
  const btnMore = $('#loadMore');

  const state = {
    me: null,
    items: [],
    page: 1,
    limit: 20,
    lastUsedUrl: '',
    status: '' // '', 'pending', 'on_hold', 'accepted', 'rejected'
  };

  const money  = (n)=> (n||0).toLocaleString();
  const fmtDT  = (d)=> { try{ return new Date(d).toLocaleString(); }catch{ return String(d||'').slice(0,16); } };
  const say    = (m, ok)=> { if(!elMsg) return; elMsg.textContent=m; elMsg.classList.toggle('ok', !!ok); };

  async function fetchJSON(url){
    const h={ Accept:'application/json' };
    if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
    const r = await fetch(url, { headers:h, credentials:'include' });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    if (!ct.includes('application/json')) throw new Error('NOT_JSON');
    return r.json();
  }
  async function fetchMe(){
    if(!TOKEN) return null;
    for (const p of ['/users/me','/auth/me','/me']) {
      try {
        const j = await fetchJSON(API_BASE+p);
        const me = j.data || j.user || j;
        if (me && (me.id || me._id)) return me;
      } catch(_) {}
    }
    return null;
  }
  function getItems(j){
    if (!j) return [];
    if (Array.isArray(j)) return j;
    if (Array.isArray(j.items)) return j.items;
    if (Array.isArray(j.data)) return j.data;
    if (j.data && Array.isArray(j.data.items)) return j.data.items;
    return [];
  }

  // 서버가 어떤 쿼리를 쓰든 성공할 때까지 시도
  async function loadPage(page=1, limit=state.limit){
    const me = state.me || await fetchMe(); state.me = me;
    const meId = me?.id || me?._id || '';

    // 시도 순서(가장 보편적인 것부터)
    const qs = (q)=> `${API_BASE}${BASE}?${q}&page=${page}&limit=${limit}`;
    const tries = [
      qs('inbox=1'),
      qs('to=me'),
      qs('toUser=me'),
      qs('mine=received'),
      meId ? qs('toUser='+encodeURIComponent(meId)) : null,
      meId ? qs('to='+encodeURIComponent(meId))     : null,
      qs('') // 최후의 수단(서버가 토큰 기준으로 자동 필터)
    ].filter(Boolean);

    let lastErr = null;
    for (const u of tries) {
      try{
        const j = await fetchJSON(u);
        const items = getItems(j);
        // 한 번이라도 배열을 받으면 성공 처리
        state.lastUsedUrl = u;
        return items;
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('LOAD_FAILED');
  }

  // 카드 템플릿(서버 필드 다양성 호환)
  function card(o){
    const id   = o.id || o._id || '';
    const msg  = o.message || o.memo || '(메시지 없음)';
    const st   = (o.status || 'pending');
    const at   = o.createdAt || o.created_at || o.date;
    const brand= o.fromBrandName || o.brandName || o.createdByName || '브랜드';
    const fee  = (o.fee!=null) ? `${money(o.fee)}원` : (o.feeNegotiable ? '협의' : '');
    const pid  = o.toPortfolioId || o.portfolioId || o.toPortfolio?._id || '';
    const rid  = o.recruitId || '';

    return `
      <article class="ip-card" data-id="${id}" data-status="${st}">
        <div class="ip-card__hd">
          <strong class="brand">${brand}</strong>
          <span class="st ${st}">${st}</span>
        </div>
        <div class="ip-card__msg">${String(msg).replace(/\n/g,'<br>')}</div>
        <div class="ip-card__meta">
          <span>${at ? fmtDT(at) : ''}</span>
          ${fee ? `<span class="dot"></span><span>${fee}</span>` : ''}
        </div>
        <div class="ip-card__ft">
          ${rid ? `<a class="btn sm" href="recruit-detail.html?id=${encodeURIComponent(rid)}"><i class="ri-file-list-2-line"></i> 공고</a>` : ''}
          ${pid ? `<a class="btn sm" href="portfolio-detail.html?id=${encodeURIComponent(pid)}"><i class="ri-user-line"></i> 프로필</a>` : ''}
        </div>
      </article>
    `;
  }

  function applyFilter(){
    const s = state.status;
    const items = s ? state.items.filter(it => (it.status||'pending')===s) : state.items;
    if (!items.length) {
      elList.innerHTML = `<div class="ip-empty">받은 제안이 없습니다.</div>`;
      return;
    }
    elList.innerHTML = items.map(card).join('');
  }

  async function firstLoad(){
    try{
      say('불러오는 중…');
      state.page = 1;
      const items = await loadPage(1);
      state.items = items;
      say('로드 완료', true);
      applyFilter();
      // 다음 페이지가 있는지 애매하므로 길이로 추정
      if (btnMore) btnMore.style.display = (items.length >= state.limit ? '' : 'none');
    }catch(e){
      console.error('[offers inbox] load failed:', e);
      say(TOKEN ? '제안 목록을 불러오지 못했습니다.' : '로그인이 필요합니다.');
      if (btnMore) btnMore.style.display = 'none';
    }
  }

  async function more(){
    try{
      const next = state.page + 1;
      const items = await loadPage(next);
      if (!items.length){ if(btnMore) btnMore.style.display='none'; return; }
      state.page = next;
      state.items = state.items.concat(items);
      applyFilter();
      if (items.length < state.limit && btnMore) btnMore.style.display='none';
    }catch(_){
      if (btnMore) btnMore.style.display = 'none';
    }
  }

  // 탭 필터
  elTabs?.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-status]');
    if (!b) return;
    elTabs.querySelectorAll('.ip-tab').forEach(t=>t.classList.toggle('is-on', t===b));
    state.status = b.dataset.status || '';
    applyFilter();
  });

  btnMore?.addEventListener('click', more);

  // 스타일(간단)
  (function injectCss(){
    const css = `
    .ip-card{border:1px solid #eee;border-radius:12px;padding:14px;margin:10px 0;background:#fff}
    .ip-card__hd{display:flex;gap:8px;align-items:center}
    .ip-card__hd .brand{font-weight:600}
    .ip-card__hd .st{margin-left:auto;font-size:12px;padding:2px 8px;border-radius:999px;background:#eef}
    .ip-card__hd .st.accepted{background:#e6ffec;color:#155724}
    .ip-card__hd .st.rejected{background:#ffeaea;color:#9b1c1c}
    .ip-card__msg{margin:8px 0 10px;line-height:1.5}
    .ip-card__meta{font-size:12px;color:#666;display:flex;align-items:center;gap:8px}
    .ip-card__meta .dot{width:4px;height:4px;border-radius:50%;background:#bbb;display:inline-block}
    .ip-card__ft{margin-top:10px;display:flex;gap:8px}
    .btn.sm{font-size:12px;padding:6px 10px;border:1px solid #ddd;border-radius:8px;background:#fafafa}
    .ip-empty{padding:24px 8px;color:#666}
    .ip-msg.ok{color:#0a7}
    `;
    if (!document.getElementById('ip-inline-style')) {
      const s=document.createElement('style'); s.id='ip-inline-style'; s.textContent=css; document.head.appendChild(s);
    }
  })();

  // 부팅
  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', firstLoad, { once:true });
  } else { firstLoad(); }
})();