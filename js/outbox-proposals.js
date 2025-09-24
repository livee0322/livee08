/* js/outbox-proposals.js — v1.1.1 (stable, DTO 호환)
   - box=sent 목록
   - 상태별 액션: accepted→결제(계약 확정), rejected→다시 제안, pending/on_hold→withdrawn
*/
(function () {
  'use strict';
  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const OFFERS = (EP.offersBase || '/offers-test').replace(/^\/*/,'/');
  const BASE = (CFG.BASE_PATH || '').replace(/\/+$/,'');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  try{
    window.LIVEE_UI?.mountHeader?.({ title:'보낸 제안' });
    window.LIVEE_UI?.mountTabbar?.({ active:'mypage' });
  }catch(_){}

  const elList = $('#list');
  const elMsg  = $('#ipMsg');
  const elMore = $('#loadMore');

  const fmtDate = (v)=> v ? new Date(v).toLocaleDateString() : '-';
  const fmtDT   = (v)=> v ? new Date(v).toLocaleString() : '-';
  const money   = (n)=> (n||0).toLocaleString();

  let page=1, limit=20, loading=false, done=false, filterStatus='';
  const cache=[];

  $('#filters')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.ip-tab'); if(!b) return;
    $$('.ip-tab').forEach(x=>x.classList.toggle('is-on',x===b));
    filterStatus = b.dataset.status || '';
    page=1; done=false; cache.length=0; elList.innerHTML=''; fetchPage();
  });

  const authHeaders = ()=> TOKEN ? { Authorization:`Bearer ${TOKEN}` } : {};

  async function fetchPage(){
    if(loading || done) return;
    loading=true; elMsg.textContent=''; elMsg.classList.remove('show');
    try{
      const qs = new URLSearchParams({ box:'sent', page:String(page), limit:String(limit) });
      if (filterStatus) qs.set('status', filterStatus);
      const url = `${API}${OFFERS}?`+qs.toString();
      const r = await fetch(url, { headers:{ Accept:'application/json', ...authHeaders() } });
      if (r.status===401){ elMsg.textContent='로그인 세션이 만료되었습니다. 다시 로그인 해주세요.'; elMsg.classList.add('show'); loading=false; return; }
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      const items = Array.isArray(j.items) ? j.items : [];
      cache.push(...items);
      if (items.length < limit) done = true;
      page += 1;
      render();
    }catch(e){
      console.error('[offers:outbox] load failed', e);
      elMsg.textContent='보낸 제안을 불러오지 못했습니다.';
      elMsg.classList.add('show');
    }finally{
      loading=false; if (elMore) elMore.disabled=done;
    }
  }

  function feeText(f){
    if (!f) return '출연료 미정';
    if (f.negotiable) return '협의';
    if (f.value == null) return '출연료 미정';
    return money(f.value)+'원';
  }
  function chip(status){
    const label = status==='pending' ? '대기'
                : status==='on_hold' ? '보류'
                : status==='accepted' ? '수락'
                : status==='rejected' ? '거절'
                : status==='withdrawn' ? '철회'
                : status;
    const cls = status==='accepted' ? 'ok'
              : (status==='rejected' || status==='withdrawn') ? 'bad'
              : status==='on_hold' ? 'hold'
              : '';
    return `<span class="ip-chip ${cls}">${label}</span>`;
  }

  // 상태별 액션영역 HTML
  function actionsHTML(o){
    if (o.status === 'accepted') {
      const amt = (o.fee && o.fee.value) ? Number(o.fee.value)||0 : 0;
      const q = new URLSearchParams({ offer:o.id, amount:String(amt) });
      return `<a class="btn pri" href="${BASE}/payment.html?${q.toString()}"><i class="ri-check-double-line"></i> 계약 확정</a>`;
    }
    if (o.status === 'rejected') {
      const pid = o.portfolio?.id || '';
      return `<button class="btn" data-offer data-portfolio-id="${pid}"><i class="ri-send-plane-line"></i> 다시 제안하기</button>`;
    }
    if (o.status === 'pending' || o.status === 'on_hold') {
      return `<button class="btn bad" data-act="withdrawn"><i class="ri-forbid-line"></i> 제안 취소</button>`;
    }
    return ''; // withdrawn 등
  }

  function card(o){
    const host = o.portfolio?.nickname || '쇼호스트';
    const sched = [o.shootDate?fmtDate(o.shootDate):'', o.shootTime||''].filter(Boolean).join(' ');
    const due   = o.replyDeadline ? `답장 기한: ${fmtDate(o.replyDeadline)}` : '';
    return `
      <article class="ip-card" data-id="${o.id}">
        <div class="ip-body">
          <div class="ip-title">${host} ${chip(o.status)}</div>
          ${o.message ? `<div class="ip-msgtext">${o.message}</div>` : ''}
          <div class="ip-meta">보낸 시각 · ${fmtDT(o.createdAt)}</div>
          <div class="ip-meta">출연료 · ${feeText(o.fee)}</div>
          ${sched || o.location ? `<div class="ip-meta">일정/장소 · ${[sched, o.location||''].filter(Boolean).join(' · ')}</div>` : ''}
          ${due ? `<div class="ip-meta">${due}</div>` : ''}
          <div class="ip-acts">
            <button class="btn icon" data-open title="상세"><i class="ri-information-line"></i> 상세</button>
            ${actionsHTML(o)}
          </div>
        </div>
      </article>`;
  }

  function render(){
    const start = elList.children.length;
    const html = cache.slice(start).map(card).join('');
    elList.insertAdjacentHTML('beforeend', html);
  }

  elMore?.addEventListener('click', fetchPage);

  // 상세 모달
  const modal  = $('#opModal');
  const mBody  = $('#opDetail');
  const mActs  = $('#opActs');
  const mClose = $('#opClose');

  function openDetail(o){
    if (!modal) return;
    const host = o.portfolio?.nickname || '-';
    const sched = [o.shootDate?fmtDate(o.shootDate):'', o.shootTime||''].filter(Boolean).join(' ');
    const due   = o.replyDeadline ? fmtDate(o.replyDeadline) : '-';
    mBody && (mBody.innerHTML = `
      <div class="ipd">
        <div><b>수신자</b><div>${host}</div></div>
        <div><b>상태</b><div>${chip(o.status)}</div></div>
        <div><b>출연료</b><div>${feeText(o.fee)}</div></div>
        <div><b>메시지</b><div>${(o.message||'-').replace(/\n/g,'<br>')}</div></div>
        <div><b>촬영</b><div>${sched || '-'}</div></div>
        <div><b>장소</b><div>${o.location || '-'}</div></div>
        <div><b>답장 기한</b><div>${due}</div></div>
        ${o.responseMessage ? `<div><b>상대 응답</b><div>${o.responseMessage}</div></div>` : ''}
      </div>`);
    mActs && (mActs.innerHTML = actionsHTML(o) || '<button class="btn" disabled>액션 없음</button>');
    modal.dataset.id = o.id;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
  }

  // 카드 내부 버튼 핸들
  elList?.addEventListener('click', (e)=>{
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      const id = openBtn.closest('.ip-card')?.dataset.id; if(!id) return;
      const o = cache.find(x=>x.id===id); if(!o) return;
      openDetail(o);
      return;
    }
    const actBtn = e.target.closest('button[data-act]');
    if (actBtn) {
      const id = actBtn.closest('.ip-card')?.dataset.id; if(!id) return;
      doAct(id, actBtn.dataset.act, actBtn);
      return;
    }
    // data-offer는 전역 offer-modal.js가 처리
  });

  mClose?.addEventListener('click', ()=>{ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); });
  mActs?.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-act]'); if(!b) return;
    const id = modal.dataset.id; if(!id) return;
    doAct(id, b.dataset.act, b);
  });

  async function doAct(id, act, btn){
    try{
      btn && (btn.disabled = true);
      const r = await fetch(`${API}${OFFERS}/${encodeURIComponent(id)}/status`, {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', Accept:'application/json', ...(TOKEN?{Authorization:`Bearer ${TOKEN}`}:{}) },
        body: JSON.stringify({ status: act })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      // 갱신
      const i = cache.findIndex(x=>x.id===id);
      if (i>=0) cache[i] = j.data || cache[i];
      // 리렌더
      elList.innerHTML=''; render();
      modal?.classList.remove('show');
      alert('처리되었습니다.');
    }catch(e){
      alert('처리 실패: ' + (e.message||'오류'));
    }finally{
      btn && (btn.disabled = false);
    }
  }

  // 최초 로드
  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', fetchPage, { once:true });
  } else { fetchPage(); }
})();