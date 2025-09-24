/* js/outbox-proposals.js — v1.1.1
   - box=sent 목록
   - 카드 타이틀: 쇼호스트 이름만
   - 액션 버튼: 본문 아래 노출 (상세/재제안/취소/확정)
*/
(function () {
  'use strict';
  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const OFFERS = (EP.offersBase || '/offers-test').replace(/^\/*/,'/');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  try{
    // 타이틀 한 줄 유지(디자인 가이드: “보낸제안”)
    window.LIVEE_UI?.mountHeader?.({ title:'보낸제안' });
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
    loading=true; elMsg.textContent='';
    try{
      const qs = new URLSearchParams({ box:'sent', page:String(page), limit:String(limit) });
      if (filterStatus) qs.set('status', filterStatus);
      const url = `${API}${OFFERS}?`+qs.toString();
      const r = await fetch(url, { headers:{ Accept:'application/json', ...authHeaders() } });
      if (r.status===401){ elMsg.textContent='로그인 세션이 만료되었습니다. 다시 로그인 해주세요.'; loading=false; return; }
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
      loading=false; elMore.disabled=done;
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
                : status==='confirmed' ? '확정'
                : status;
    const cls = status==='confirmed' || status==='accepted' ? 'ok'
              : status==='rejected' || status==='withdrawn' ? 'bad'
              : status==='on_hold' ? 'hold' : '';
    return `<span class="ip-chip ${cls}">${label}</span>`;
  }

  // 상태별 액션영역 HTML (본문 아래)
  function actionsHTML(o){
    if (o.status === 'accepted') {
      return `<button class="btn pri" data-act="confirmed"><i class="ri-check-double-line"></i> 계약 확정</button>`;
    }
    if (o.status === 'rejected') {
      const pid = o.toPortfolioId? (o.toPortfolioId._id||o.toPortfolioId.id||o.toPortfolioId) : '';
      return `<button class="btn" data-offer data-portfolio-id="${pid}"><i class="ri-send-plane-line"></i> 다시 제안하기</button>`;
    }
    if (o.status === 'pending' || o.status === 'on_hold') {
      return `<button class="btn bad" data-act="withdrawn"><i class="ri-forbid-line"></i> 제안 취소</button>`;
    }
    return ''; // confirmed/withdrawn → 액션 없음
  }

  function card(o){
    const host = o.toPortfolioId?.nickname || '쇼호스트';
    const sched = [o.shootDate?fmtDate(o.shootDate):'', o.shootTime||''].filter(Boolean).join(' ');
    const due   = o.replyDeadline ? `답장 기한: ${fmtDate(o.replyDeadline)}` : '';
    return `
      <article class="ip-card" data-id="${o.id}">
        <div class="ip-body">
          <!-- 타이틀: 수신자 라벨 제거, 이름만 -->
          <div class="ip-title">${host} ${chip(o.status)}</div>
          ${o.message ? `<div class="ip-msgtext">${o.message}</div>` : ''}
          <div class="ip-meta">보낸 시각 · ${fmtDT(o.createdAt)}</div>
          <div class="ip-meta">출연료 · ${feeText(o.fee)}</div>
          ${sched || o.location ? `<div class="ip-meta">일정/장소 · ${[sched, o.location||''].filter(Boolean).join(' · ')}</div>` : ''}
          ${due ? `<div class="ip-meta">${due}</div>` : ''}
        </div>
        <div class="ip-acts">
          <button class="btn icon" data-open title="상세"><i class="ri-information-line"></i> 상세</button>
          ${actionsHTML(o)}
        </div>
      </article>`;
  }

  function render(){
    elList.insertAdjacentHTML('beforeend', cache.slice(elList.children.length).map(card).join(''));
  }

  elMore?.addEventListener('click', fetchPage);

  // 상세 모달
  const modal  = $('#opModal');
  const mBody  = $('#opDetail');
  const mActs  = $('#opActs');
  const mClose = $('#opClose');

  function openDetail(o){
    const host = o.toPortfolioId?.nickname || '-';
    const sched = [o.shootDate?fmtDate(o.shootDate):'', o.shootTime||''].filter(Boolean).join(' ');
    const due   = o.replyDeadline ? fmtDate(o.replyDeadline) : '-';
    mBody.innerHTML = `
      <div class="ipd">
        <div><b>수신자</b><div>${host}</div></div>
        <div><b>상태</b><div>${chip(o.status)}</div></div>
        <div><b>출연료</b><div>${feeText(o.fee)}</div></div>
        <div><b>메시지</b><div>${(o.message||'-').replace(/\n/g,'<br>')}</div></div>
        <div><b>촬영</b><div>${sched || '-'}</div></div>
        <div><b>장소</b><div>${o.location || '-'}</div></div>
        <div><b>답장 기한</b><div>${due}</div></div>
        ${o.responseMessage ? `<div><b>상대 응답</b><div>${o.responseMessage}</div></div>` : ''}
      </div>`;
    mActs.innerHTML = actionsHTML(o) || '<button class="btn" disabled>액션 없음</button>';
    modal.dataset.id = o.id;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
  }

  // 카드/상세 버튼 핸들
  elList?.addEventListener('click', (e)=>{
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      const id = openBtn.closest('.ip-card')?.dataset.id; if(!id) return;
      const o = cache.find(x=>x.id===id); if(!o) return;
      openDetail(o);
      return;
    }
    // inline act
    const actBtn = e.target.closest('button[data-act]');
    if (actBtn) {
      const id = actBtn.closest('.ip-card')?.dataset.id; if(!id) return;
      doAct(id, actBtn.dataset.act);
      return;
    }
    // 다시 제안하기 (offer-modal.js가 처리)
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
      // NOTE: 서버가 confirmed 미지원이면 여기서 early-return 하세요.
      const r = await fetch(`${API}${OFFERS}/${encodeURIComponent(id)}/status`, {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', Accept:'application/json', ...(TOKEN?{Authorization:`Bearer ${TOKEN}`}:{}) },
        body: JSON.stringify({ status: act })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      const i = cache.findIndex(x=>x.id===id);
      if (i>=0) cache[i] = j.data || cache[i];
      elList.innerHTML=''; render();
      modal.classList.remove('show');
      alert('처리되었습니다.');
    }catch(e){
      alert('처리 실패: ' + (e.message||'오류'));
    }finally{
      btn && (btn.disabled = false);
    }
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', fetchPage, { once:true });
  } else { fetchPage(); }
})();