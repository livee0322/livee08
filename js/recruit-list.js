<script>
(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // 간단 토스트
  function toast(msg){
    let t = document.getElementById('lvToast');
    if(!t){
      t = document.createElement('div'); t.id='lvToast';
      t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 14px;border-radius:999px;z-index:9999;font-size:13px;transition:.2s';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity='1'; setTimeout(()=>t.style.opacity='0',1500);
  }

  // API 설정
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP_RECRUITS = (CFG.endpoints?.recruits) || '/recruit-test';

  const state = { status:'all', sort:'latest', query:'', cursor:null, loading:false, ended:false };

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if(!iso) return '';
    const d = new Date(iso); if(isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };

  const thumbOr = (src, seed='lv') =>
    src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

  const mapStatus = s => (
    s==='closed' ? {label:'마감', cls:'closed'} :
    s==='draft'  ? {label:'임시저장', cls:'draft'} :
    {label:'모집중', cls:'open'}
  );

  async function fetchMine({append=false}={}){
    if(state.loading || state.ended) return;
    state.loading = true;

    const qs = new URLSearchParams({ owner:'me', limit:'20' });
    if(state.query) qs.set('query', state.query);
    if(state.sort)  qs.set('sort', state.sort);
    if(state.status && state.status!=='all'){
      if(state.status==='upcoming') qs.set('upcoming','1');
      else qs.set('status', state.status);
    }
    if(state.cursor) qs.set('cursor', state.cursor);

    const url = `${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:`/${EP_RECRUITS}`}?${qs}`;

    let items=[], next=null;
    try{
      const res  = await fetch(url, { headers:{Accept:'application/json'} });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      items = list.map((c,i)=>({
        id:c.id||c._id||`${i}`,
        title:c.title || c.recruit?.title || '(제목 없음)',
        thumb:c.thumbnailUrl || c.coverImageUrl || '',
        status:c.status || 'open',
        pay:c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
        closeAt:c.closeAt,
        category:c.recruit?.category||'',
        views:c.stats?.views,
        applies:c.stats?.applies
      }));
      next = data.nextCursor || data.data?.nextCursor || null;
    }catch(e){
      console.warn('[recruit-list] fetch error:', e);
    }

    renderList(items, {append});
    state.cursor = next;
    state.ended  = !next && items.length < 20;
    state.loading = false;
  }

  function renderList(items, {append=false}={}){
    const listEl  = $('#rlList');
    const emptyEl = $('#rlEmpty');

    if(!append) listEl.innerHTML = '';

    if((!append && items.length===0) && !state.cursor){
      emptyEl.hidden = false; return;
    } else emptyEl.hidden = true;

    const html = items.map(it => {
      const st  = mapStatus(it.status);
      const pay = it.payNegotiable ? '협의 가능' :
                  (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '미정');

      return `
        <article class="rl-card">
          <img class="rl-thumb" src="${thumbOr(it.thumb,it.id)}" alt="" onerror="this.src='${thumbOr('', 'rl-fallback')}'"/>
          <div class="rl-body">
            <div class="rl-title" title="${it.title}">${it.title}</div>
            <div class="rl-meta">
              <span class="rl-chip ${st.cls}">${st.label}</span>
              ${it.category ? `<span class="rl-cat">${it.category}</span>` : ''}
              ${it.closeAt ? `<span class="rl-date">마감 <b>${fmtDate(it.closeAt)}</b></span>` : ''}
              <span class="rl-pay">출연료 ${pay}</span>
              ${it.views!=null   ? `<span class="rl-view">조회 ${it.views}</span>` : ''}
              ${it.applies!=null ? `<span class="rl-apply">지원 ${it.applies}</span>` : ''}
            </div>
          </div>
          <div class="rl-actions">
            <button class="ic" data-act="edit"  data-id="${it.id}" title="수정"><i class="ri-pencil-line"></i></button>
            <button class="ic" data-act="dup"   data-id="${it.id}" title="복제"><i class="ri-file-copy-line"></i></button>
            <button class="ic" data-act="close" data-id="${it.id}" title="마감"><i class="ri-lock-line"></i></button>
            <button class="ic" data-act="del"   data-id="${it.id}" title="삭제"><i class="ri-delete-bin-line"></i></button>
          </div>
        </article>`;
    }).join('');

    listEl.insertAdjacentHTML('beforeend', html);
  }

  function bindUI(){
    // 상태 탭
    $$('#rlTabs .chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('#rlTabs .chip').forEach(b=>b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.status = btn.dataset.status;
        state.cursor = null; state.ended = false;
        fetchMine();
      });
    });

    // 검색 / 정렬
    const search = $('#rlSearch');
    const sort   = $('#rlSort');

    if(search){
      search.addEventListener('input', e=>{
        state.query = e.target.value.trim();
      });
      search.addEventListener('change', ()=>{
        state.cursor=null; state.ended=false; fetchMine();
      });
    }
    if(sort){
      sort.addEventListener('change', e=>{
        state.sort = e.target.value;
        state.cursor=null; state.ended=false; fetchMine();
      });
    }

    // 더보기
    $('#rlMore')?.addEventListener('click', ()=> fetchMine({append:true}));

    // 액션(간이 권한)
    const user = JSON.parse(localStorage.getItem('lv_user') || 'null');
    $('#rlList').addEventListener('click', e=>{
      const btn = e.target.closest('.ic'); if(!btn) return;
      const act = btn.dataset.act, id = btn.dataset.id;

      const canManage = user && (user.role==='brand' || user.role==='admin');
      if(!canManage){ toast('브랜드만 이용 가능한 기능입니다.'); return; }

      if(act==='edit')  location.href = `recruit-new.html?id=${encodeURIComponent(id)}`;
      if(act==='dup')   toast('복제 준비중');
      if(act==='close') toast('마감 처리 준비중');
      if(act==='del')   toast('삭제 준비중');
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    bindUI();
    fetchMine();
  });
})();
</script>