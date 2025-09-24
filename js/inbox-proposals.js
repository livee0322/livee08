/* inbox-proposals.js — v2.0 (offers-test 단일 사용)
   - 받은 제안 / 보낸 제안 탭
   - 수락/거절/취소 액션
   - 토큰 없어도 읽기는 시도(401이면 로그인 안내)
*/
(() => {
  'use strict';

  // ---------- Config ----------
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const OFFERS_BASE = (EP.offersBase || '/offers-test').replace(/^\/*/, '/');
  const PATH = Object.assign({
    login: 'login.html',
    // 상세로 연결할 때 쓰는 기본 경로들(없는 경우에도 오류 없이 안전)
    recruitDetail: 'recruit-detail.html',
    portfolioDetail: 'portfolio-detail.html'
  }, CFG.PATH || {});

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // ---------- Mini UI helpers ----------
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const toast=(m)=>{
    let t=$('#toast'); if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
    t.textContent=m; t.className='show'; clearTimeout(t._); t._=setTimeout(()=>t.classList.remove('show'),1400);
  };
  function fmtDate(s){ try{ const d=new Date(s); if(isNaN(d)) return '-'; return d.toISOString().slice(0,10);}catch{ return '-'; } }
  function relTime(s){
    try{
      const d=new Date(s); const diff=Date.now()-d.getTime();
      const m=Math.floor(diff/60000), h=Math.floor(m/60), day=Math.floor(h/24);
      if(day>0) return `${day}일 전`; if(h>0) return `${h}시간 전`; if(m>0) return `${m}분 전`; return '방금';
    }catch{ return ''; }
  }
  const statusBadge = (st) => {
    const map = {
      pending: ['대기', 'muted'],
      sent:    ['보냄', 'muted'],
      viewed:  ['열람', 'muted'],
      accepted:['수락', 'ok'],
      declined:['거절', 'bad'],
      rejected:['거절', 'bad'],
      cancelled:['취소', 'muted']
    };
    const [label, cls] = map[`${st}`] || [st || '-', 'muted'];
    return `<span class="offer-badge ${cls}">${label}</span>`;
  };

  // ---------- API ----------
  async function apiGet(url){
    const h={Accept:'application/json'};
    if(TOKEN) h.Authorization = 'Bearer '+TOKEN;
    const r=await fetch(url,{headers:h,credentials:'include'}).catch(()=>null);
    if(!r) throw new Error('NETWORK');
    const ct=r.headers.get('content-type')||'';
    if(!ct.includes('application/json')){
      // HTML이 돌아와도 로그인 필요로 간주
      const e=new Error('NON_JSON'); e.status=r.status; throw e;
    }
    const j=await r.json().catch(()=>({}));
    if(!r.ok) { const e=new Error(j.message||`HTTP_${r.status}`); e.status=r.status; throw e; }
    return j.data || j.items || j; // 라우터 다양성 대응
  }
  async function apiPatch(url, body){
    const h={'Content-Type':'application/json',Accept:'application/json'};
    if(TOKEN) h.Authorization = 'Bearer '+TOKEN;
    const r=await fetch(url,{method:'PATCH',headers:h,credentials:'include',body:JSON.stringify(body)}).catch(()=>null);
    if(!r) throw new Error('NETWORK');
    const j=await r.json().catch(()=>({}));
    if(!r.ok) { const e=new Error(j.message||`HTTP_${r.status}`); e.status=r.status; throw e; }
    return j.data || j;
  }

  // ---------- State ----------
  const qs = new URLSearchParams(location.search);
  let tab = (qs.get('tab')||'inbox').toLowerCase(); // 'inbox' | 'outbox'
  if(tab!=='inbox' && tab!=='outbox') tab='inbox';
  let ITEMS = [];

  // ---------- Render ----------
  function layout(){
    const root = $('#inbox-root') || document.body;
    root.innerHTML = `
      <div class="inb-head">
        <h1>제안함</h1>
        <div class="inb-tabs" role="tablist">
          <button class="inb-tab ${tab==='inbox'?'on':''}" data-tab="inbox">받은 제안</button>
          <button class="inb-tab ${tab==='outbox'?'on':''}" data-tab="outbox">보낸 제안</button>
        </div>
      </div>
      <div id="inbList" class="inb-list"></div>
      <div id="inbEmpty" class="inb-empty" style="display:none">표시할 제안이 없습니다.</div>
      <div id="toast"></div>
    `;
    bindTabs();
  }

  function bindTabs(){
    $('.inb-tabs')?.addEventListener('click', (e)=>{
      const b=e.target.closest('[data-tab]'); if(!b) return;
      tab = b.getAttribute('data-tab');
      const url=new URL(location.href); url.searchParams.set('tab',tab); history.replaceState(null,'',url);
      $$('.inb-tab').forEach(x=>x.classList.toggle('on', x===b));
      loadList();
    });
  }

  function card(item){
    // item 스키마 다양성 대응(서버 응답에 따라 최대한 안전하게 접근)
    const id = item.id || item._id || '';
    const createdAt = item.createdAt || item.created_at;
    const msg = item.message || item.note || '';
    const st  = item.status || 'pending';

    // 상대/발신자 선택
    // 받은(inbox): 상대는 보낸 사람(from/brand)
    // 보낸(outbox): 상대는 받은 사람(to/showhost/portfolio)
    let actor = {};
    if(tab==='inbox'){
      actor = item.from || item.brand || item.createdBy || {};
    }else{
      actor = item.to || item.showhost || item.portfolio || {};
    }
    const name =
      actor.nickname || actor.name || actor.brandName || actor.displayName || actor.email || '사용자';
    const thumb =
      actor.mainThumbnailUrl || actor.coverImageUrl || actor.avatarUrl || actor.photoUrl || CFG.placeholderThumb || 'default.jpg';

    // 부가 정보: 관련 공고 / 포트폴리오
    const recruit = item.recruit || {};
    const portfolio = item.portfolio || {};
    const recruitTitle = recruit.title || item.recruitTitle || '';
    const pid = portfolio.id || portfolio._id;

    // 액션 영역(받은: 수락/거절, 보낸: 취소)
    let actions = '';
    if(st==='pending'){
      if(tab==='inbox'){
        actions = `
          <button class="btn sm pri" data-act="accept" data-id="${id}">수락</button>
          <button class="btn sm" data-act="decline" data-id="${id}">거절</button>
        `;
      }else{
        actions = `<button class="btn sm" data-act="cancel" data-id="${id}">취소</button>`;
      }
    }

    return `
      <article class="offer-card" data-id="${id}">
        <img class="avatar" src="${thumb}" alt="">
        <div class="body">
          <div class="row1">
            <div class="name">${name}</div>
            <div class="right">
              ${statusBadge(st)}
              <span class="time" title="${fmtDate(createdAt)}">${relTime(createdAt)}</span>
            </div>
          </div>
          ${recruitTitle ? `<div class="title">[공고] ${recruitTitle}</div>` : ''}
          <div class="msg">${msg ? escapeHtml(msg) : ''}</div>
          ${pid && tab==='outbox' ? `<div class="link"><a href="${PATH.portfolioDetail}?id=${encodeURIComponent(pid)}">포트폴리오 보기 ›</a></div>`:''}
          <div class="actions">${actions}</div>
        </div>
      </article>
    `;
  }

  function escapeHtml(s=''){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderList(){
    const list = $('#inbList'), empty = $('#inbEmpty');
    if(!ITEMS.length){
      list.innerHTML=''; empty.style.display='block'; return;
    }
    empty.style.display='none';
    list.innerHTML = ITEMS.map(card).join('');
  }

  // ---------- Load ----------
  async function loadList(){
    const root = $('#inbox-root') || document.body;
    root.classList.add('loading');
    try{
      const url = `${API_BASE}${OFFERS_BASE}?${tab==='inbox'?'inbox=1':'outbox=1'}`;
      const data = await apiGet(url);
      // 라우터에 따라 {items:[]} 또는 [] 형태 지원
      const items = Array.isArray(data) ? data : (data.items || data.data || []);
      ITEMS = Array.isArray(items) ? items : [];
      renderList();
    }catch(e){
      if(e.status===401){
        const here = encodeURIComponent(location.pathname + location.search + location.hash);
        $('#inbList').innerHTML = `
          <div class="need-login">
            제안함을 보려면 로그인이 필요합니다.
            <a class="btn pri" href="${PATH.login}?returnTo=${here}">로그인</a>
          </div>`;
          $('#inbEmpty').style.display='none';
      }else{
        $('#inbList').innerHTML = `<div class="inb-empty">목록을 불러오지 못했습니다.</div>`;
        console.error('[offers:list]', e);
      }
    }finally{
      root.classList.remove('loading');
    }
  }

  // ---------- Actions ----------
  async function doAction(id, act){
    // 상태 매핑: 서버가 rejected/declined 중 하나만 쓸 수 있음 → 보수적으로 둘 다 지원
    const map = {
      accept:  { status:'accepted' },
      decline: { status:'declined' },
      cancel:  { status:'cancelled' }
    };
    const body = map[act];
    if(!body) return;

    try{
      await apiPatch(`${API_BASE}${OFFERS_BASE}/${encodeURIComponent(id)}`, body);
      toast('처리되었습니다');
      // 프론트 상태도 즉시 반영(낙관적 업데이트)
      const it = ITEMS.find(x => (x.id||x._id)===id);
      if(it){ it.status = body.status; renderList(); }
    }catch(e){
      if(e.status===401){
        toast('로그인이 필요합니다');
      }else{
        toast('실패했습니다');
        console.error('[offers:action]', e);
      }
    }
  }

  function bindActions(){
    $('#inbList')?.addEventListener('click', (e)=>{
      const b = e.target.closest('[data-act]'); if(!b) return;
      const id = b.getAttribute('data-id');
      const act= b.getAttribute('data-act');
      if(act==='cancel' && !confirm('이 제안을 취소할까요?')) return;
      doAction(id, act);
    });
  }

  // ---------- Mount ----------
  function mountHeader(){
    try{
      window.LIVEE_UI?.mountHeader?.({ title:'제안함' });
      window.LIVEE_UI?.mountTopTabs?.({ active:null });
      window.LIVEE_UI?.mountTabbar?.({ active:'mypage' });
    }catch(_){}
  }

  function ensureBaseStyles(){
    if(document.getElementById('inb-style')) return;
    const css = `
    #toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:12px;font-weight:800;opacity:0;transition:.2s;z-index:200}
    #toast.show{opacity:1}
    .inb-head{display:flex;align-items:center;justify-content:space-between;margin:10px 0 14px}
    .inb-tabs{display:flex;gap:8px}
    .inb-tab{height:36px;padding:0 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
    .inb-tab.on{background:#111827;color:#fff;border-color:#111827}
    .inb-list{display:grid;gap:10px}
    .offer-card{display:flex;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:14px;background:#fff}
    .offer-card .avatar{width:56px;height:56px;border-radius:12px;object-fit:cover;background:#f3f4f6}
    .offer-card .row1{display:flex;align-items:center;gap:8px}
    .offer-card .name{font-weight:800}
    .offer-card .right{margin-left:auto;display:flex;align-items:center;gap:8px;color:#64748b}
    .offer-card .title{margin:6px 0 2px;font-weight:700}
    .offer-card .msg{color:#374151;white-space:pre-line}
    .offer-card .actions{margin-top:10px;display:flex;gap:8px}
    .offer-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid #e5e7eb}
    .offer-badge.ok{background:#10b9811a;border-color:#10b98133;color:#065f46}
    .offer-badge.bad{background:#ef44441a;border-color:#ef444433;color:#7f1d1d}
    .offer-badge.muted{background:#f3f4f6;border-color:#e5e7eb;color:#6b7280}
    .btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
    .btn.sm{height:32px}
    .btn.pri{background:#5449ff;border-color:#5449ff;color:#fff}
    .inb-empty,.need-login{padding:20px 12px;color:#6b7280;text-align:center}
    `;
    const tag = document.createElement('style'); tag.id='inb-style'; tag.textContent=css; document.head.appendChild(tag);
  }

  async function init(){
    mountHeader();
    ensureBaseStyles();
    layout();
    bindActions();
    await loadList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else { init(); }
})();