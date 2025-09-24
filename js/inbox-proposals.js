/* inbox-proposals.js — v1.0.2
   - CORS 에러 회피: credentials 제거 (Bearer 토큰만 사용)
   - 받은 제안 목록/필터/더보기/모달 열람
*/
(() => {
  'use strict';

  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const msg = (t, ok=false) => { const n = $('#ipMsg'); if(!n) return; n.textContent=t||''; n.classList.toggle('err', !ok); };

  // ---- Config / endpoints
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const OFFERS_BASE = (CFG.endpoints?.offersBase || '/offers-test').replace(/^\/*/,'/');
  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // 공용 UI(있으면 장착)
  try {
    window.LIVEE_UI?.mountHeader?.({ title:'받은 제안' });
    window.LIVEE_UI?.mountTabbar?.({ active:'mypage' });
  } catch(_){}

  if (!TOKEN) {
    msg('로그인이 필요합니다.');
    return;
  }

  // ---- State
  const state = {
    page: 1,
    limit: 20,
    status: '',        // '', 'pending' | 'on_hold' | 'accepted' | 'rejected' | 'withdrawn'
    items: [],
    loading: false,
    done: false,
  };

  // ---- Render
  function tplItem(o){
    const pf   = o.toPortfolioId || {};
    const name = pf.nickname || '쇼호스트';
    const thumb= pf.mainThumbnailUrl || (pf.subThumbnails?.[0]) || (CFG.placeholderThumb || 'default.jpg');
    const badgeMap = { pending:'대기', on_hold:'보류', accepted:'수락', rejected:'거절', withdrawn:'회수' };
    const badge = badgeMap[o.status] || o.status || '대기';

    return `
      <article class="ip-card" data-id="${o.id}">
        <img class="ip-avatar" src="${thumb}" alt="">
        <div class="ip-body">
          <div class="ip-row1">
            <strong class="ip-name">${name}</strong>
            <span class="ip-badge ip-badge--${o.status}">${badge}</span>
          </div>
          <div class="ip-msg">${(o.message||'').replace(/</g,'&lt;')}</div>
          <div class="ip-meta">${new Date(o.createdAt).toLocaleString()}</div>
        </div>
        <button class="btn sm" data-open="${o.id}"><i class="ri-chat-1-line"></i> 보기</button>
      </article>
    `;
  }

  function render(){
    const root = $('#list');
    if (!state.items.length) {
      root.innerHTML = '<div class="ip-empty">표시할 제안이 없습니다</div>';
    } else {
      root.innerHTML = state.items.map(tplItem).join('');
    }
    $('#loadMore')?.toggleAttribute('disabled', state.loading || state.done);
  }

  // ---- Fetch (NO credentials!)
  async function load(page=1){
    if (state.loading || state.done) return;
    state.loading = true; $('#loadMore')?.setAttribute('disabled','');
    try{
      msg('');
      const qs = new URLSearchParams({
        box: 'received',
        page: String(page),
        limit: String(state.limit),
      });
      if (state.status) qs.set('status', state.status);

      const r = await fetch(`${API_BASE}${OFFERS_BASE}?${qs.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        },
        // ★ 중요: 쿠키 불필요. credentials 사용 금지(미설정이면 'same-origin')
        // credentials: 'include'  <-- 제거
      });

      // 서버가 JSON이 아닐 수도 있으니 방어
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error(`서버 응답 형식 오류 (${r.status})`);

      const j = await r.json();
      if (!r.ok) throw new Error(j.message || '목록 조회 실패');

      const items = Array.isArray(j.items) ? j.items : [];
      if (page === 1) state.items = items;
      else            state.items = state.items.concat(items);

      state.page = page;
      state.done = items.length < state.limit;
      render();
    }catch(err){
      console.error('[offers:inbox] load failed:', err);
      msg('제안 목록을 불러오지 못했습니다.');
    }finally{
      state.loading = false;
      $('#loadMore')?.toggleAttribute('disabled', state.loading || state.done);
    }
  }

  // ---- Modal
  function openModal(id){
    const o = state.items.find(x => x.id === id);
    if (!o) return;
    $('#ipDetail').innerHTML = `
      <div class="ip-dlg">
        <div class="row"><span class="lb">상태</span><span class="val">${o.status}</span></div>
        <div class="row"><span class="lb">메시지</span><div class="val">${(o.message||'').replace(/</g,'&lt;')}</div></div>
        ${o.recruitId ? `<div class="row"><span class="lb">공고</span><span class="val">${o.recruitId.title||''}</span></div>` : ''}
        <div class="row"><span class="lb">받은 시각</span><span class="val">${new Date(o.createdAt).toLocaleString()}</span></div>
      </div>
    `;
    $('#ipModal')?.setAttribute('aria-hidden','false');
  }
  function closeModal(){ $('#ipModal')?.setAttribute('aria-hidden','true'); }

  // ---- Events
  function bind(){
    // 필터 탭
    $('#filters')?.addEventListener('click', (e)=>{
      const b = e.target.closest('.ip-tab'); if(!b) return;
      $$('.ip-tab').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      state.status = b.dataset.status || '';
      state.page = 1; state.done = false;
      load(1);
    });

    // 더보기
    $('#loadMore')?.addEventListener('click', ()=>{
      if (!state.done) load(state.page + 1);
    });

    // 카드 내 모달 열기
    $('#list')?.addEventListener('click', (e)=>{
      const openBtn = e.target.closest('[data-open]');
      if (openBtn) openModal(openBtn.dataset.open);
    });

    // 모달 닫기
    $('#ipClose')?.addEventListener('click', closeModal);
    $('#ipModal')?.addEventListener('click', (e)=>{
      if (e.target.id === 'ipModal') closeModal();
    });

    // (선택) 상태 변경 버튼들 → 서버 PATCH 추가되면 연결
    $$('#ipModal [data-act]').forEach(btn=>{
      btn.addEventListener('click', ()=>alert('상태 변경 API 연결 예정'));
    });
  }

  // init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bind(); load(1); }, { once:true });
  } else { bind(); load(1); }
})();