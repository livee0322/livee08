/* js/sponsorship.js — v1.0.0 (list + filters + brand-only FAB) */
(() => {
  'use strict';
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP  = (CFG.endpoints||{});
  const BASE = (EP.sponsorshipBase || '/sponsorship-test').replace(/^\/*/,'/');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // 공용 UI
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬·홍보' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'home' });
  }catch(_){}

  const list = $('#spList');
  const more = $('#spMore');
  const fab  = $('#spFab');

  // role 체크 → 브랜드만 FAB 표시
  (async ()=>{
    if(!fab) return;
    fab.hidden = true;
    if(!TOKEN) return;
    try{
      const r = await fetch(`${API}/me`, { headers:{Authorization:`Bearer ${TOKEN}` } });
      const j = await r.json().catch(()=>({}));
      const roles = (j?.data?.roles || j?.roles || []).map(v=>String(v).toLowerCase());
      if (roles.includes('brand') || roles.includes('admin')) fab.hidden = false;
    }catch(_){}
  })();

  // state
  let page=1, limit=20, done=false, loading=false, fType='', fStatus='';
  const cache = [];

  $('#spFilters')?.addEventListener('click', e=>{
    const b=e.target.closest('.chip'); if(!b) return;
    if (b.dataset.type !== undefined){
      $$('.chip[data-type]').forEach(x=>x.classList.toggle('is-on', x===b));
      fType=b.dataset.type||'';
    }
    if (b.dataset.status !== undefined){
      $$('.chip[data-status]').forEach(x=>x.classList.toggle('is-on', x===b));
      fStatus=b.dataset.status||'';
    }
    page=1; done=false; cache.length=0; list.innerHTML=''; fetchPage();
  });

  const money = n => (n||0).toLocaleString();
  const dday  = iso => {
    if(!iso) return '';
    const D = new Date(iso), today = new Date();
    const diff = Math.ceil((D - new Date(today.toDateString()))/86400000);
    return (isFinite(diff) ? `D-${diff}` : '');
  };
  const feeText = (fee, nego, prodOnly) =>
    prodOnly ? '제품만 제공' : (nego ? '협의' : (fee!=null ? `${money(fee)}원` : '원고료 미정'));
  const statusBadge = s => {
    const m = { open:['모집중','ok'], in_progress:['진행중','hold'], closed:['마감','gray'], completed:['완료','ok'] };
    const [t,c] = m[s] || [s,'gray'];
    return `<span class="badge ${c}">${t}</span>`;
  };
  const typeText = t => t==='delivery_keep'?'배송형':t==='delivery_return'?'반납형':t==='experience_review'?'체험후기형':'-';

  function card(it){
    const img = it.product?.thumb || it.thumbnailUrl || it.coverImageUrl || CFG.placeholderThumb || '';
    return `
      <article class="sp-card" onclick="location.href='sponsorship-new.html?id=${encodeURIComponent(it.id)}'" role="link">
        <img class="sp-thumb" src="${img}" alt="">
        <div class="sp-body">
          <div class="sp-meta">
            ${statusBadge(it.status)}
            <span class="badge gray">${typeText(it.type)}</span>
            <span style="margin-left:auto">${dday(it.closeAt)}</span>
          </div>
          <div class="sp-brand">${it.brandName||'브랜드'}</div>
          <div class="sp-title">${it.title||'-'}</div>
          <div class="sp-fee">원고료 ${feeText(it.fee, it.feeNegotiable, it.productOnly)}</div>
        </div>
      </article>`;
  }

  async function fetchPage(){
    if(loading||done) return; loading=true; more.disabled=true;
    try{
      const qs = new URLSearchParams({ page:String(page), limit:String(limit) });
      if(fType) qs.set('type', fType);
      if(fStatus) qs.set('status', fStatus);
      const r = await fetch(`${API}${BASE}?${qs}`);
      if(!r.ok) throw new Error('LIST_FAILED');
      const j = await r.json();
      const items = j.items||[];
      cache.push(...items);
      list.insertAdjacentHTML('beforeend', items.map(card).join(''));
      done = items.length < limit;
      page += 1;
    }catch(e){
      list.insertAdjacentHTML('beforeend','<div class="notice">목록을 불러오지 못했습니다.</div>');
    }finally{
      loading=false; more.disabled=done;
    }
  }
  more?.addEventListener('click', fetchPage);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', fetchPage, {once:true});
  }else{ fetchPage(); }
})();