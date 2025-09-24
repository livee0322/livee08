/* js/inbox-proposals.js — v1.1.0 (카드형 제안서 + 모달 응답) */
(function () {
  'use strict';
  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const OFFERS = (EP.offersBase || '/offers-test').replace(/^\/*/,'/');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // header/tabbar
  try{ window.LIVEE_UI?.mountHeader?.({ title:'받은 제안' }); window.LIVEE_UI?.mountTabbar?.({ active:'mypage' }); }catch(_){}

  const elList = $('#list');
  const elMsg  = $('#ipMsg');
  const elMore = $('#loadMore');

  const fmtDate = (v)=> v ? new Date(v).toLocaleDateString() : '-';
  const fmtDT   = (v)=> v ? new Date(v).toLocaleString() : '-';
  const money   = (n)=> (n||0).toLocaleString();

  // state
  let page=1, limit=20, loading=false, done=false, filterStatus='';

  // tabs
  $('#filters')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.ip-tab'); if(!b) return;
    $$('.ip-tab').forEach(x=>x.classList.toggle('is-on',x===b));
    filterStatus = b.dataset.status || '';
    page=1; done=false; cache.length=0; elList.innerHTML=''; fetchPage();
  });

  // fetch
  const authHeaders = ()=> TOKEN ? { Authorization:`Bearer ${TOKEN}` } : {};
  const cache = [];

  async function fetchPage(){
    if (loading || done) return;
    loading = true; elMsg.textContent='';
    try{
      const qs = new URLSearchParams({ box:'received', page:String(page), limit:String(limit) });
      if (filterStatus) qs.set('status', filterStatus);
      const url = `${API}${OFFERS}?`+qs.toString();
      const r = await fetch(url, { headers: { Accept:'application/json', ...authHeaders() } });
      if (r.status===401){ elMsg.textContent='로그인 세션이 만료되었습니다. 다시 로그인 해주세요.'; loading=false; return; }
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      const items = Array.isArray(j.items) ? j.items : [];
      cache.push(...items);
      if (items.length < limit) done = true;
      page += 1;
      render();
    }catch(e){
      console.error('[offers:inbox] load failed', e);
      elMsg.textContent='제안 목록을 불러오지 못했습니다.';
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
                : status==='withdrawn' ? '철회' : status;
    const cls = status==='accepted' ? 'ok' : status==='rejected' || status==='withdrawn' ? 'bad'
              : status==='on_hold' ? 'hold' : '';
    return `<span class="ip-chip ${cls}">${label}</span>`;
  }

  function card(o){
    const title = o.brandName || '브랜드';
    const sched = [o.shootDate?fmtDate(o.shootDate):'', o.shootTime||''].filter(Boolean).join(' ');
    const due   = o.replyDeadline ? `답장 기한: ${fmtDate(o.replyDeadline)}` : '';
    return `
      <article class="ip-card" data-id="${o.id}">
        <div class="ip-body">
          <div class="ip-title">${title} ${chip(o.status)}</div>
          ${o.message ? `<div class="ip-msgtext">${o.message}</div>` : ''}
          <div class="ip-meta">대기 · ${fmtDT(o.createdAt)}</div>
          <div class="ip-meta">출연료 · ${feeText(o.fee)}</div>
          ${sched || o.location ? `<div class="ip-meta">일정/장소 · ${[sched, o.location||''].filter(Boolean).join(' · ')}</div>` : ''}
          ${due ? `<div class="ip-meta">${due}</div>` : ''}
        </div>
        <div class="ip-acts">
          <button class="btn icon" data-open><i class="ri-arrow-right-s-line"></i></button>
        </div>
      </article>`;
  }

  function render(){
    elList.insertAdjacentHTML('beforeend', cache.slice(elList.children.length).map(card).join(''));
  }

  elMore?.addEventListener('click', fetchPage);

  // 상세 모달
  const modal   = $('#ipModal');
  const mBody   = $('#ipDetail');
  const mClose  = $('#ipClose');
  const actBox  = modal?.querySelector('.ip-modal__ft');

  function openDetail(o){
    const sched = [o.shootDate?fmtDate(o.shootDate):'', o.shootTime||''].filter(Boolean).join(' ');
    const due   = o.replyDeadline ? fmtDate(o.replyDeadline) : '-';
    mBody.innerHTML = `
      <div class="ipd">
        <div><b>브랜드</b><div>${o.brandName || '-'}</div></div>
        <div><b>출연료</b><div>${feeText(o.fee)}</div></div>
        <div><b>메시지</b><div>${(o.message||'-').replace(/\n/g,'<br>')}</div></div>
        <div><b>촬영</b><div>${sched || '-'}</div></div>
        <div><b>장소</b><div>${o.location || '-'}</div></div>
        <div><b>답장 기한</b><div>${due}</div></div>
        ${o.responseMessage ? `<div><b>내 응답</b><div>${o.responseMessage}</div></div>` : ''}
        <div class="ipd-reply">
          <label>응답 메시지 (선택)</label>
          <textarea id="ipReplyMsg" rows="3" placeholder="수락/거절/보류 사유를 적어주세요 (선택)"></textarea>
        </div>
      </div>`;
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('show');
    modal.dataset.id = o.id;
    // 버튼 상태(수락 완료/철회 후 비활성)
    $$('button', actBox).forEach(b=>b.disabled = (o.status==='withdrawn' || o.status==='accepted'));
  }

  // 카드 클릭/자세히 버튼 → 상세
  elList?.addEventListener('click', (e)=>{
    const wrap = e.target.closest('.ip-card'); if(!wrap) return;
    if (!e.target.closest('[data-open]') && e.target.closest('.ip-acts')) return;
    const id = wrap.dataset.id;
    const o = cache.find(x=>x.id===id); if(!o) return;
    openDetail(o);
  });
  elList?.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-open]'); if(!btn) return;
    const id = btn.closest('.ip-card')?.dataset.id; if(!id) return;
    const o = cache.find(x=>x.id===id); if(!o) return;
    openDetail(o);
  });

  mClose?.addEventListener('click', ()=>{ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); });

  // 수락/거절/보류 PATCH
  actBox?.addEventListener('click', async (e)=>{
    const b = e.target.closest('button[data-act]'); if(!b) return;
    const id = modal.dataset.id; if(!id) return;
    const status = b.dataset.act;
    const msg = $('#ipReplyMsg')?.value?.trim() || '';
    b.disabled = true;
    try{
      const r = await fetch(`${API}${OFFERS}/${encodeURIComponent(id)}/status`,{
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', Accept:'application/json',
          ...(TOKEN?{Authorization:`Bearer ${TOKEN}`}:{}) },
        body: JSON.stringify({ status, responseMessage: msg })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
      const i = cache.findIndex(x=>x.id===id);
      if (i>=0) cache[i] = j.data || cache[i];
      elList.innerHTML=''; render();
      alert('처리되었습니다.');
      modal.classList.remove('show');
    }catch(err){
      alert('처리 실패: ' + (err.message || '오류'));
    }finally{ b.disabled=false; }
  });

  // 최초 로드
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchPage, { once:true });
  } else { fetchPage(); }
})();