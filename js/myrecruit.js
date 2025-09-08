/* myrecruit.js – v1.2 (mine=1 우선, 폴백 지원) */
(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const FALLBACK_IMG = CFG.placeholderThumb || (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  // ========= utilities =========
  const pad2 = n => String(n).padStart(2,'0');
  const ymd = v => { if(!v) return ''; const d = new Date(v); if (isNaN(d)) return String(v).slice(0,10); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  const money = v => (v==null ? '' : Number(v).toLocaleString('ko-KR'));
  const text = v => (v==null ? '' : String(v).trim());
  const pickThumb = (o) =>
    o?.thumbnailUrl || o?.coverImageUrl || o?.imageUrl || o?.thumbUrl || FALLBACK_IMG;

  // 브랜드/출연료 매퍼 (서버 스키마 차이 흡수)
  const brandOf = (c) =>
    text(c.brandName || c.brand || c.recruit?.brandName || c.owner?.brandName || '');
  const feeOf = (c) => {
    const fee = c.fee ?? c.recruit?.pay ?? c.pay;
    const nego = (c.feeNegotiable ?? c.recruit?.payNegotiable) ? true : false;
    return { fee, nego };
  };

  // ========= auth guard =========
  const token = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  const headers = { 'Accept':'application/json', ...(token ? { 'Authorization':'Bearer '+token } : {}) };

  async function fetchMe(){
    if(!token) return null;
    try{
      const r = await fetch(`${API_BASE}/users/me`, { headers });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok || j.ok===false) return null;
      return j.data || j.user || j;
    }catch{ return null; }
  }
  function hasBrandRole(me){
    const roles = Array.isArray(me?.roles) ? me.roles : (me?.role ? [me.role] : []);
    return roles.includes('brand') || roles.includes('admin');
  }

  // ========= fetch list (mine=1 선호) =========
  async function getMineViaParam(){
    const url = `${API_BASE}/recruit-test?mine=1&limit=50`;
    const r = await fetch(url, { headers });
    if(!r.ok) throw new Error('mine-param-unsupported');
    const j = await r.json().catch(()=> ({}));
    const items = (Array.isArray(j) ? j : (j.items || j.data?.items || []) );
    if(!items) throw new Error('mine-param-empty');
    return items;
  }
  async function getMineViaFilter(me){
    // 폴백: status별로 모아 createdBy==me.id 만 필터 (API가 createdBy를 내려줄 때만 유효)
    const stats = ['draft','published','closed','scheduled'];
    const all = [];
    for(const s of stats){
      try{
        const r = await fetch(`${API_BASE}/recruit-test?status=${s}&limit=50`, { headers });
        const j = await r.json().catch(()=> ({}));
        const items = (Array.isArray(j) ? j : (j.items || j.data?.items || []) );
        for(const it of items || []) {
          if(!it) continue;
          // createdBy가 없으면 전체가 섞이므로 건너뜀
          if(it.createdBy && (String(it.createdBy) === String(me.id || me._id))) {
            all.push(it);
          }
        }
      }catch(_){}
    }
    return all;
  }

  // ========= render =========
  function statusLabel(c){
    const now = Date.now();
    const close = c.closeAt ? new Date(c.closeAt).getTime() : 0;
    if(c.status === 'draft') return { key:'draft', text:'임시저장' };
    if(c.status === 'closed' || (close && close < now)) return { key:'closed', text:'마감' };
    return { key:'ongoing', text:'진행중' };
  }

  function tplCard(c){
    const brand = brandOf(c) || '브랜드';
    const { fee, nego } = feeOf(c);
    const feeTxt = nego ? '협의' : (fee!=null ? `${money(fee)}원` : '미정');

    const st = statusLabel(c);
    return `
      <article class="card" data-id="${c.id || c._id}">
        <img class="thumb" src="${pickThumb(c)}" loading="lazy" alt="" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
        <div class="body">
          <div class="meta">
            <span class="badge ${st.key}">${st.text}</span>
            <span class="brand">${brand}</span>
          </div>
          <div class="title">${text(c.title || '(제목 없음)')}</div>
          <div class="info">
            <div>마감 ${c.closeAt ? ymd(c.closeAt) : '미정'}</div>
            <div>출연료 ${feeTxt}</div>
          </div>
          <div class="actions">
            <a class="btn primary" href="recruit-applicants.html?recruitId=${encodeURIComponent(c.id || c._id)}">지원자 현황</a>
            <a class="btn ghost" href="recruit-edit.html?id=${encodeURIComponent(c.id || c._id)}">수정</a>
            <a class="btn" href="recruit-detail.html?id=${encodeURIComponent(c.id || c._id)}">공고보기</a>
            <button class="btn danger" data-del="${c.id || c._id}">삭제</button>
          </div>
        </div>
      </article>`;
  }

  function draw(list, filter='all'){
    const wrap = $('#list');
    if(!list.length){ $('#empty').hidden=false; wrap.innerHTML=''; return; }
    $('#empty').hidden=true;

    const filtered = list.filter(c=>{
      const st = statusLabel(c).key;
      return filter==='all' ? true : (filter===st);
    });
    wrap.innerHTML = filtered.map(tplCard).join('') || '<div class="empty">조건에 맞는 공고가 없습니다</div>';
  }

  async function remove(id){
    if(!confirm('정말 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    try{
      const r = await fetch(`${API_BASE}/recruit-test/${encodeURIComponent(id)}`, { method:'DELETE', headers });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || '삭제 실패');
      location.reload();
    }catch(e){ alert(e.message||'삭제 실패'); }
  }

  // ========= boot =========
  (async ()=>{
    if(!token){ location.href = `login.html?returnTo=${here}`; return; }
    const me = await fetchMe();
    if(!me || !hasBrandRole(me)){ $('#guard').hidden=false; return; }

    let items = [];
    try { items = await getMineViaParam(); }
    catch(_){ items = await getMineViaFilter(me); }

    // 표준화(safe id)
    items = (items||[]).map((x,i)=>({ ...x, id: x.id||x._id||String(i) }));

    draw(items, 'all');

    // 필터
    $('.seg')?.addEventListener('click', e=>{
      const b = e.target.closest('button'); if(!b) return;
      $$('.seg button').forEach(x=>x.classList.toggle('on', x===b));
      draw(items, b.dataset.filter);
    });

    // 삭제
    $('#list')?.addEventListener('click', e=>{
      const btn = e.target.closest('[data-del]'); if(!btn) return;
      remove(btn.dataset.del);
    });
  })();
})();