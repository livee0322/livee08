/* js/sponsorship.js — v1.2.0 (board-row layout + filters + pager) */
(function(){
  'use strict';
  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const LIST_EP = EP.sponsorships || '/sponsorship-test?status=published&limit=20';

  // header/tabbar
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'협찬·홍보' });
    window.LIVEE_UI?.mountTopTabs?.({ active:'shorts' });
    window.LIVEE_UI?.mountTabbar?.({ active:'campaigns' });
  }catch(_){}

  const elList = $('#spList');
  const elMsg  = $('#spMsg');
  const elMore = $('#spLoadMore');

  // state
  let page=1, limit=20, loading=false, done=false;
  let filterType='', filterStatus='';
  const cache=[];

  // helpers
  const money = (n)=> (n==null ? '' : (Number(n)||0).toLocaleString()+'원');
  const typeLabel = (t)=> t==='shipping'?'배송형' : t==='return'?'반납형' : t==='review'?'체험후기형' : '기타';
  const statusLabel = (s)=> s==='published'?'모집중' : s==='progress'?'진행중' : s==='closed'?'마감' : s==='done'?'완료' : (s||'');

  // filters
  $('#spFilters')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    if (b.dataset.type !== undefined) {
      $$('.chip[data-type]').forEach(x=>x.classList.toggle('is-on', x===b));
      filterType = b.dataset.type || '';
    }
    if (b.dataset.status !== undefined) {
      $$('.chip[data-status]').forEach(x=>x.classList.toggle('is-on', x===b));
      filterStatus = b.dataset.status || '';
    }
    // reset
    page=1; done=false; cache.length=0; elList.innerHTML='';
    fetchPage();
  });

  function buildUrl(){
    const url = new URL(API + (EP.sponsorships || '/sponsorship-test'));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    if (filterStatus) url.searchParams.set('status', filterStatus);
    // 타입 필터는 서버에서 없을 수 있으니 클라이언트에서 post-filter
    return url.toString();
  }

  async function fetchPage(){
    if (loading || done) return;
    loading=true; elMsg.textContent=''; elMsg.classList.remove('show');
    try{
      const r = await fetch(buildUrl(), { headers:{ Accept:'application/json' } });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      let items = Array.isArray(j.items) ? j.items : (Array.isArray(j.data)?j.data:[]);
      // client-side type filter
      if (filterType) items = items.filter(it => (it.sponsorType||'')===filterType);
      cache.push(...items);
      if (items.length < limit) done = true;
      page += 1;
      render();
    }catch(e){
      console.error('[sponsorship:list] load failed', e);
      elMsg.textContent='목록을 불러오지 못했습니다.'; elMsg.classList.add('show');
    }finally{
      loading=false; elMore.disabled=done;
    }
  }

  function row(r){
    const thumb = r.thumbnailUrl || r.coverImageUrl || 'default.jpg';
    const type  = r.sponsorType || 'shipping';
    const status= r.status || 'published';
    return `
      <article class="sp-item" data-id="${r.id}">
        <a class="sp-thumb" href="sponsorship-detail.html?id=${encodeURIComponent(r.id)}" aria-label="${r.title}">
          <img src="${thumb}" alt="">
        </a>
        <div class="sp-body">
          <div class="sp-brand">${r.brandName || ''}</div>
          <div class="sp-title">${r.title || ''}</div>
          <div class="sp-meta">${statusLabel(status)} · ${typeLabel(type)} · 원고료 ${money(r.fee) || (r.feeNegotiable?'협의':'미정')}</div>
        </div>
        <div class="sp-right">
          <span class="badge ${type}">${typeLabel(type)}</span>
          <a class="btn more" href="sponsorship-detail.html?id=${encodeURIComponent(r.id)}">상세</a>
        </div>
      </article>`;
  }

  function render(){
    const start = elList.children.length;
    elList.insertAdjacentHTML('beforeend', cache.slice(start).map(row).join(''));
  }

  elMore?.addEventListener('click', fetchPage);

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', fetchPage, { once:true });
  }else{ fetchPage(); }
})();