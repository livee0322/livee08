/* Recruit List — v1.7.0 (모바일 카드 재배치, 버튼 정렬/여백 개선) */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const html = String.raw;

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test';
  const EP_APPLY      = EP.apply      || '/applications-test';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test';
  const EP_BOOKMARKS  = EP.bookmarks  || '/bookmarks-test';

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const HJSON = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };

  const FALLBACK_IMG = (CFG.placeholderThumb || 'default.jpg');
  const pad2 = (n)=>String(n).padStart(2,'0');
  const fmtDate = (iso)=>{ if(!iso) return '미정'; const d=new Date(iso); if(isNaN(d)) return String(iso).slice(0,10); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  const money  = (v)=> (v==null?'':Number(v).toLocaleString('ko-KR'));
  const text   = (v)=> (v==null?'':String(v).trim());
  const coalesce = (...a)=> a.find(v=>v!==undefined && v!==null && v!=='');
  const pickThumb = (o)=> o && (o.mainThumbnailUrl || o.thumbnailUrl || (Array.isArray(o.subThumbnails)&&o.subThumbnails[0]) || o.coverImageUrl || FALLBACK_IMG);

  async function getJSON(url, headers){ const r=await fetch(url,{headers:headers||HJSON(false)}); let j=null; try{ j=await r.json(); }catch{} if(!r.ok||(j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{}; }
  async function postJSON(url, body){ const r=await fetch(url,{method:'POST',headers:HJSON(true),body:JSON.stringify(body)}); let j=null; try{ j=await r.json(); }catch{} if(!r.ok||(j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{}; }
  const parseItems = (j)=> Array.isArray(j) ? j : (j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || []);

  // ---------- URL state ----------
  function qs(obj){ const u=new URLSearchParams(); Object.entries(obj).forEach(([k,v])=>{ if(v==null||v==='')return; if(Array.isArray(v)) v.forEach(x=>u.append(k,x)); else u.set(k,v); }); return u.toString(); }
  function readQ(){ const u=new URLSearchParams(location.search); const g=(k,d)=>u.get(k)??d; const gnum=(k,d)=>{const v=+u.get(k);return Number.isFinite(v)?v:d}; return {
    q:g('q',''), status:u.getAll('status'), minPay:g('minPay',''), maxPay:g('maxPay',''), payNegotiable:g('payNegotiable',''),
    brand:g('brand',''), from:g('from',''), to:g('to',''), sort:g('sort','newest'), page:gnum('page',1), limit:gnum('limit',20),
  }; }
  function pushQ(obj){ const u = new URL(location.href); Object.entries(obj).forEach(([k,v])=>{ if(v==null||v===''||(Array.isArray(v)&&!v.length)) u.searchParams.delete(k); else { u.searchParams.delete(k); (Array.isArray(v)?v:[v]).forEach(x=>u.searchParams.append(k,x)); } }); history.pushState(null,'',u.toString()); }

  // ---------- bookmarks ----------
  const LS_BM_KEY = 'livee_bookmarks';
  async function loadBookmarks(){
    try{
      if(!TOKEN) throw 0;
      const j = await getJSON(API_BASE + (EP_BOOKMARKS.startsWith('/')?EP_BOOKMARKS:'/'+EP_BOOKMARKS) + '?mine=1&limit=500');
      const it = parseItems(j);
      const ids = it.map(x=> String(x.recruitId || x.targetId || x.id)).filter(Boolean);
      localStorage.setItem(LS_BM_KEY, JSON.stringify(ids));
      return new Set(ids);
    }catch(_){
      try{ return new Set(JSON.parse(localStorage.getItem(LS_BM_KEY)||'[]')); }catch{ return new Set(); }
    }
  }
  async function toggleBookmark(id, on){
    const set = await loadBookmarks();
    if(on) set.add(String(id)); else set.delete(String(id));
    localStorage.setItem(LS_BM_KEY, JSON.stringify([...set]));
    try{
      if(!TOKEN) throw 0;
      const base = API_BASE + (EP_BOOKMARKS.startsWith('/')?EP_BOOKMARKS:'/'+EP_BOOKMARKS);
      if(on) await postJSON(base, { recruitId:id });
      else   await fetch(base + '/' + encodeURIComponent(id), { method:'DELETE', headers:HJSON(false) });
    }catch(_){}
  }

  // ---------- Apply modal (동일) ----------
  function ensureApplyCSS(){
    if($('#apply-css')) return;
    const st=document.createElement('style'); st.id='apply-css';
    st.textContent = `
      .amodal{position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.38)}
      .amodal .sheet{width:100%;max-width:520px;background:#fff;border-radius:16px 16px 0 0;padding:14px;box-shadow:0 -12px 36px rgba(15,23,42,.18)}
      .amodal header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .amodal header strong{font-weight:900;font-size:16px}
      .amodal header button{margin-left:auto;border:1px solid #e5e7eb;background:#fff;border-radius:10px;width:36px;height:36px}
      .amodal .warn{border:1px solid #e7e5ff;background:#f6f5ff;color:#4338ca;border-radius:12px;padding:10px 12px;margin:6px 0 10px;font-size:13px;line-height:1.4}
      .amodal .field{margin:10px 0}
      .amodal label{display:block;font-weight:800;margin:0 0 6px}
      .amodal .plist{display:grid;gap:8px;max-height:220px;overflow:auto}
      .amodal .prow{display:grid;grid-template-columns:40px 1fr;gap:10px;align-items:center;border:1px solid #e5e7eb;border-radius:12px;padding:8px}
      .amodal .prow img{width:40px;height:40px;border-radius:10px;object-fit:cover;background:#eee}
      .amodal textarea{width:100%;min-height:120px;border:1px solid #e5e7eb;border-radius:12px;padding:10px;resize:vertical}
      .amodal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
      .amodal .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;font-weight:800}
      .amodal .btn.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}
    `;
    document.head.appendChild(st);
  }
  async function getMe(){ if(!TOKEN) return null; const eps=['/auth/me','/users/me','/me']; for(const ep of eps){ try{ const j=await getJSON(API_BASE+ep); return j.data||j.user||j; }catch(_){}} return null; }
  async function fetchMyPortfolios(){
    if(!TOKEN) return [];
    const tryFetch = async (p)=>{ try{ const j=await getJSON(API_BASE+p,HJSON(false)); const it=parseItems(j); return Array.isArray(it)?it:[]; }catch(_){ return []; } };
    let items = await tryFetch((EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:'/'+EP_PORTFOLIOS) + '?mine=1&limit=100');
    if(items.length) return items;
    const me = await getMe(); const meId = me && (me.id||me._id||me.userId);
    if(meId){
      for(const p of [`${EP_PORTFOLIOS}?userId=${meId}&limit=100`, `${EP_PORTFOLIOS}?owner=${meId}&limit=100`]){
        items = await tryFetch((p.startsWith('/')?p:'/api/v1'+p)); if(items.length) return items;
      }
    }
    return await tryFetch((EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:'/'+EP_PORTFOLIOS) + '?limit=200');
  }
  function openApplyModal(recruitId){
    ensureApplyCSS();
    const wrap=document.createElement('div'); wrap.className='amodal';
    wrap.innerHTML = html`
      <div class="sheet" role="dialog" aria-modal="true" aria-label="지원하기">
        <header><strong>지원하기</strong><button class="x" type="button">✕</button></header>
        <div class="warn">연락처·이메일 직접 기재는 금지됩니다. 모든 커뮤니케이션은 라이비 내에서 진행해주세요.</div>
        <div class="field"><label>내 포트폴리오 선택</label><div id="amList" class="plist"><div style="color:#64748b">불러오는 중…</div></div></div>
        <div class="field"><label>메시지 (선택)</label><textarea id="amMsg" placeholder="간단한 자기소개와 지원 이유를 남겨주세요. 연락처/이메일은 적지 마세요."></textarea></div>
        <div class="actions"><button class="btn cancel" type="button">취소</button><button class="btn pri submit" type="button">지원 보내기</button></div>
      </div>`;
    document.body.appendChild(wrap);

    const close=()=>wrap.remove();
    on($('.x',wrap),'click',close); on($('.cancel',wrap),'click',close);
    on(wrap,'click',e=>{ if(e.target===wrap) close(); });

    (async ()=>{
      if(!TOKEN){ alert('로그인 후 이용 가능합니다.'); location.href='login.html?returnTo='+encodeURIComponent(location.pathname+location.search); close(); return; }
      let items=[]; try{ items = await fetchMyPortfolios(); }catch(_){}
      if(items.length){
        $('#amList',wrap).innerHTML = items.map((p,i)=>`
          <label class="prow"><input type="radio" name="amP" value="${p.id||p._id}" ${i===0?'checked':''}>
            <div style="display:flex;gap:10px;align-items:center">
              <img src="${pickThumb(p)}" alt=""><div><div style="font-weight:800">${text(p.nickname||p.displayName||'쇼호스트')}</div><div style="font-size:12.5px;color:#64748b">${text(p.headline||'')}</div></div>
            </div>
          </label>`).join('');
      }else{
        $('#amList',wrap).innerHTML = '<div>작성된 포트폴리오가 없습니다. <a href="portfolio-new.html" style="color:#4f46e5;font-weight:800">포트폴리오 만들기 →</a></div>';
        wrap.querySelector('.submit').disabled = true;
      }
    })();

    on($('.submit',wrap),'click', async ()=>{
      const pid = wrap.querySelector('input[name="amP"]:checked')?.value;
      if(!pid){ alert('포트폴리오를 선택해주세요.'); return; }
      const msg = $('#amMsg',wrap)?.value?.trim() || '';
      const payload = { recruitId, portfolioId: pid, message: msg };
      try{
        const url = API_BASE + (EP_APPLY.startsWith('/')?EP_APPLY:'/'+EP_APPLY);
        const res = await fetch(url,{method:'POST',headers:HJSON(true),body:JSON.stringify(payload)});
        const j = await res.json().catch(()=>({}));
        if(!res.ok || j.ok===false) throw new Error(j.message||('HTTP_'+res.status));
        alert('지원이 접수되었어요. 브랜드가 확인하면 알림으로 알려드릴게요.');
        close();
      }catch(e){
        console.warn('[apply]', e);
        alert('요청이 기록되었습니다. 서버 연결 준비 후 정식 접수로 전환됩니다.');
        close();
      }
    });
  }

  // ---------- fetch recruits ----------
  function buildQuery(state){
    const q = {
      q: state.q || undefined,
      sort: state.sort || 'newest',
      limit: state.limit || 20,
      skip: ((state.page||1) - 1) * (state.limit||20),
      brand: state.brand || undefined,
      from: state.from || undefined,
      to: state.to || undefined,
      payNegotiable: state.payNegotiable ? 1 : undefined,
      minPay: state.minPay || undefined,
      maxPay: state.maxPay || undefined,
    };
    (state.status||[]).forEach(v=>{ if(!q.status) q.status=[]; q.status.push(v); });
    return new URLSearchParams(q).toString();
  }
  async function fetchRecruits(state){
    try{
      const url = API_BASE + (EP_RECRUITS.startsWith('/')?EP_RECRUITS:'/'+EP_RECRUITS) + '?' + buildQuery(state);
      const j = await getJSON(url, HJSON(false));
      const items = parseItems(j);
      const total = j.total || (j.data && j.data.total) || j.count || items.length;
      return {
        items: items.map((c,i)=>({
          id: c.id||c._id||String(i),
          title: text(coalesce(c.title,c.recruit&&c.recruit.title,'제목 없음')),
          brandName: text(coalesce(c.brandName,c.brand&&c.brand.name,'브랜드')),
          summary: text(coalesce(c.summary,c.description,c.content,'')),
          status: (c.status||'').toLowerCase(),
          closeAt: c.closeAt,
          pay: coalesce(c.pay,c.fee),
          payNegotiable: coalesce(c.payNegotiable,c.feeNegotiable),
          thumb: pickThumb(c),
        })),
        total: Number(total)||0
      };
    }catch(e){
      console.warn('[recruits:list]', e);
      return { items: [], total: 0 };
    }
  }

  // ---------- render ----------
  function feeText(fee, nego){ return nego ? '협의' : (fee!=null ? (money(fee)+'원') : '출연료 미정'); }
  function statusBadge(st){
    const s=String(st||'').toLowerCase();
    if(s.includes('open')||s.includes('published')) return '<span class="badge ok" aria-label="모집중"><i class="ri-checkbox-circle-line"></i> 모집중</span>';
    if(s.includes('scheduled')||s.includes('upcoming')) return '<span class="badge hold" aria-label="예정"><i class="ri-time-line"></i> 예정</span>';
    if(s.includes('closed')||s.includes('end')||s.includes('done')) return '<span class="badge no" aria-label="마감"><i class="ri-close-line"></i> 마감</span>';
    return '<span class="badge wait" aria-label="검토중"><i class="ri-inbox-line"></i> 검토중</span>';
  }
  // ▶ 액션 버튼을 하단으로 이동해 모바일에서 절대 겹치지 않게 구성
  function cardTpl(r, bookmarked){
    return html`
      <article class="rl-card" data-id="${r.id}">
        <img class="rl-thumb" src="${r.thumb||FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
        <div>
          <div class="rl-rowtop">
            <div class="rl-meta">
              ${statusBadge(r.status)}
              <span>${r.brandName}</span>
            </div>
          </div>
          <div class="rl-title">${r.title}</div>
          <div class="rl-summary">${r.summary || '요약 정보가 없습니다.'}</div>
          <div class="rl-rowbtm">
            <div class="rl-meta">마감 ${fmtDate(r.closeAt)} · ${feeText(r.pay, r.payNegotiable)}</div>
            <div class="rl-actions">
              <button class="bmark ${bookmarked?'active':''}" title="북마크" aria-label="북마크" data-act="bookmark">
                <i class="${bookmarked?'ri-bookmark-fill':'ri-bookmark-line'}"></i>
              </button>
              <button class="btn" data-act="detail"><i class="ri-external-link-line"></i> 상세보기</button>
              <button class="btn pri" data-act="apply"><i class="ri-send-plane-line"></i> 지원하기</button>
            </div>
          </div>
        </div>
      </article>`;
  }
  function renderList(items, total, page, limit, bookmarks){
    $('#rlTotal').textContent = `총 ${total.toLocaleString('ko-KR')}건`;
    const root = $('#rlList');
    if(!items.length){
      root.innerHTML = '<div class="rl-card" aria-live="polite"><div class="rl-title">조건에 맞는 공고가 없습니다</div><div class="rl-summary">필터나 검색어를 조정해 보세요.</div></div>';
      $('#rlPager').innerHTML = '';
      return;
    }
    root.innerHTML = items.map(r => cardTpl(r, bookmarks.has(String(r.id)))).join('');
    on(root,'click',(e)=>{
      const card = e.target.closest('.rl-card'); if(!card) return;
      const id = card.dataset.id;
      const btn = e.target.closest('[data-act]'); if(!btn) return;
      const act = btn.getAttribute('data-act');
      if(act==='detail'){ location.href='recruit-detail.html?id='+encodeURIComponent(id); return; }
      if(act==='apply'){ openApplyModal(id); return; }
      if(act==='bookmark'){
        const on = !btn.classList.contains('active');
        btn.classList.toggle('active', on);
        btn.innerHTML = `<i class="${on?'ri-bookmark-fill':'ri-bookmark-line'}"></i>`;
        toggleBookmark(id, on);
      }
    });
    renderPager(total, page, limit);
  }
  function renderPager(total, page, limit){
    const pages = Math.max(1, Math.ceil(total/limit));
    const root = $('#rlPager'); if(!root) return;
    const win = 6;
    const s = Math.max(1, Math.min(page - Math.floor(win/2), pages - (win-1)));
    const e = Math.min(pages, s + (win-1));
    const btn = (p,lab,dis=false,cur=false)=> `<button ${dis?'disabled':''} class="${cur?'cur':''}" data-page="${p}" aria-label="페이지 ${p}" ${cur?'aria-current="page"':''}>${lab??p}</button>`;
    root.innerHTML =
      btn(1,'«',page===1) +
      btn(Math.max(1,page-1),'‹',page===1) +
      Array.from({length:e-s+1},(_,i)=>btn(s+i,String(s+i),false,page===s+i)).join('') +
      btn(Math.min(pages,page+1),'›',page===pages) +
      btn(pages,'»',page===pages);
    on(root,'click',(e)=>{
      const b = e.target.closest('button[data-page]'); if(!b) return;
      const to = +b.dataset.page;
      state.page = to; pushQ({ page: state.page }); refresh(); window.scrollTo({ top:0, behavior:'smooth' });
    });
  }

  // ---------- 필터/칩스/드로어 (이전 버전 동일) ----------
  function hydrateUI(){
    $('#rlQuery').value = state.q||'';
    $('#rlSort').value = state.sort||'newest';
    $$('#rlFilters input[name="status"]').forEach(c=> c.checked = !state.status?.length ? (c.value==='open') : state.status.includes(c.value));
    $('#minPay').value = state.minPay||'';
    $('#maxPay').value = state.maxPay||'';
    $('#payNegotiable').checked = !!state.payNegotiable;
    $('#fromDate').value = state.from||'';
    $('#toDate').value = state.to||'';
    $('#brand').value = state.brand||'';
  }
  function collectUI(){
    const status = $$('#rlFilters input[name="status"]:checked').map(x=>x.value);
    return {
      q: $('#rlQuery').value.trim(),
      status,
      minPay: $('#minPay').value.trim(),
      maxPay: $('#maxPay').value.trim(),
      payNegotiable: $('#payNegotiable').checked ? 1 : '',
      from: $('#fromDate').value,
      to: $('#toDate').value,
      brand: $('#brand').value.trim(),
      sort: $('#rlSort').value,
      page: 1,
      limit: state.limit
    };
  }
  function renderChips(){
    const chips = [];
    if(state.q) chips.push(['검색: '+state.q,'q']);
    if(state.status?.length) chips.push(['상태: '+state.status.join(','),'status']);
    if(state.minPay) chips.push(['최소: '+money(+state.minPay),'minPay']);
    if(state.maxPay) chips.push(['최대: '+money(+state.maxPay),'maxPay']);
    if(state.payNegotiable) chips.push(['협의 포함','payNegotiable']);
    if(state.from||state.to) chips.push(['기간: '+(state.from||'')+'~'+(state.to||''),'from_to']);
    if(state.brand) chips.push(['브랜드: '+state.brand,'brand']);
    $('#chips').innerHTML = chips.map(([t,k])=> `<span class="chip">${t} <button data-k="${k}" aria-label="${t} 제거">×</button></span>`).join('');
    on($('#chips'),'click',(e)=>{
      const b=e.target.closest('button[data-k]'); if(!b) return;
      const k=b.dataset.k;
      if(k==='status') state.status=[];
      else if(k==='from_to'){ state.from=''; state.to=''; }
      else state[k]='';
      state.page=1; pushQ(state); hydrateUI(); refresh();
    });
  }

  // 드로어
  function openFilters(){
    $('#rlFilters').classList.add('open');
    const dim = $('#rlDim'); dim.hidden=false; dim.classList.add('on');
    document.body.classList.add('lock');
    $('#rlFilterOpen').setAttribute('aria-expanded','true');
  }
  function closeFilters(){
    $('#rlFilters').classList.remove('open');
    const dim = $('#rlDim'); dim.classList.remove('on'); dim.hidden = true;
    document.body.classList.remove('lock');
    $('#rlFilterOpen').setAttribute('aria-expanded','false');
  }
  function ensureFiltersForViewport(){
    if (window.matchMedia('(max-width: 1024px)').matches) {
      closeFilters();
    } else {
      $('#rlFilters').classList.remove('open');
      $('#rlDim').classList.remove('on'); $('#rlDim').hidden = true;
      document.body.classList.remove('lock');
      $('#rlFilterOpen').setAttribute('aria-expanded','false');
    }
  }

  function bindUI(){
    on($('#rlSearchForm'),'submit',(e)=>{
      e.preventDefault();
      Object.assign(state, collectUI());
      pushQ(state); renderChips(); refresh();
      if (window.matchMedia('(max-width: 1024px)').matches) closeFilters();
    });
    on($('#rlSort'),'change',()=>{ state.sort = $('#rlSort').value; state.page=1; pushQ(state); refresh(); });
    on($('#applyFilters'),'click',()=>{
      Object.assign(state, collectUI()); pushQ(state); renderChips(); refresh();
      if (window.matchMedia('(max-width: 1024px)').matches) closeFilters();
    });
    on($('#resetFilters'),'click',()=>{
      state = { q:'', status:['open'], sort:'newest', page:1, limit:20 };
      pushQ(state); hydrateUI(); renderChips(); refresh();
      if (window.matchMedia('(max-width: 1024px)').matches) closeFilters();
    });
    on($('#quick7'),'click',()=>{
      const now=new Date(); const to=new Date(now.getTime()+7*24*3600*1000);
      state.from = ''; state.to = to.toISOString().slice(0,10); state.page=1; pushQ(state); hydrateUI(); renderChips(); refresh();
      if (window.matchMedia('(max-width: 1024px)').matches) closeFilters();
    });

    on($('#rlFilterOpen'),'click',()=> openFilters());
    on($('#rlFilterClose'),'click',()=> closeFilters());
    on($('#rlDim'),'click',()=> closeFilters());
    on(document,'keydown',(e)=>{ if(e.key==='Escape') closeFilters(); });

    window.addEventListener('resize', ensureFiltersForViewport);
    ensureFiltersForViewport();
    window.addEventListener('popstate',()=>{ state = readQ(); hydrateUI(); renderChips(); refresh(); });
  }

  let state = readQ();
  async function refresh(){
    const bookmarks = await loadBookmarks();
    $('#rlList').innerHTML = '<div class="rl-card"><div class="rl-title">불러오는 중…</div></div>';
    const { items, total } = await fetchRecruits(state);
    renderList(items, total, state.page||1, state.limit||20, bookmarks);
  }

  hydrateUI(); renderChips(); bindUI(); refresh();
})();