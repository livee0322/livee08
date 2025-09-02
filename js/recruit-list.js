/* ===== Recruit List – mine (v2.5 unified) ===== */
(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const user  = JSON.parse(localStorage.getItem('lv_user') || 'null');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // Toast
  function toast(msg){
    let t = document.getElementById('lvToast');
    if(!t){
      t = document.createElement('div');
      t.id='lvToast';
      t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 14px;border-radius:999px;z-index:9999;font-size:13px;transition:.25s';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity='1';
    setTimeout(()=>t.style.opacity='0', 1500);
  }

  // API
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test';

  // 공통 유틸
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if(!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const thumbOr = (src, seed='lv') => src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;
  const money = v => (v==null || v==='') ? '' : Number(v).toLocaleString('ko-KR');

  const pickBrandName = (c = {}) => {
    const cand = [
      c.recruit?.brandName, c.recruit?.brandname,
      c.brandName, c.brandname,
      (typeof c.brand === 'string' ? c.brand : ''),
      c.brand?.brandName, c.brand?.name,
      c.owner?.brandName, c.owner?.name,
      c.user?.brandName, c.user?.companyName
    ].filter(Boolean).map(s => String(s).trim());
    const found = cand.find(s => s && s !== '브랜드');
    return found || '브랜드';
  };

  const state = { status:'all', sort:'latest', query:'', page:1, limit:20, loading:false, ended:false };

  function headers(json=true){
    const h={}; if(json) h['Accept']='application/json';
    if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`;
    return h;
  }

  async function fetchMine({append=false} = {}){
    if (state.loading || state.ended) return;
    state.loading = true;

    const params = new URLSearchParams();
    params.set('owner','me');
    params.set('limit', String(state.limit));
    params.set('page',  String(state.page));
    if (state.query) params.set('query', state.query);
    if (state.sort)  params.set('sort',  state.sort);
    if (state.status && state.status!=='all'){
      if (state.status==='upcoming') params.set('upcoming','1');
      else params.set('status', state.status);
    }

    const url = `${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:`/${EP_RECRUITS}`}?${params.toString()}`;

    let items=[];
    try{
      const res  = await fetch(url,{headers:headers(true)});
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      items = list.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: pickBrandName(c),
        title: c.title||c.recruit?.title||'(제목 없음)',
        thumb: c.thumbnailUrl||c.coverImageUrl||'',
        status: c.status||'open',
        closeAt:c.closeAt,
        createdAt:c.createdAt,
        views:c.stats?.views,
        applies:c.stats?.applies,
        pay:c.recruit?.pay,
        payNegotiable:!!c.recruit?.payNegotiable
      }));

      // 페이징 종료 판단
      const totalPages = data.totalPages || data.data?.totalPages;
      if (totalPages && state.page >= totalPages) state.ended = true;
      if (!totalPages && items.length < state.limit) state.ended = true;
    }catch(e){
      console.warn('[recruit-list] fetch error:', e);
      items=[]; state.ended=true;
    }

    renderList(items,{append});
    state.loading=false;

    const moreBtn = $('#rlMore');
    if (moreBtn) moreBtn.style.display = state.ended ? 'none' : 'inline-flex';
  }

  function mapStatus(s){
    if (s==='closed') return {label:'마감', cls:'closed'};
    if (s==='draft')  return {label:'임시저장', cls:'draft'};
    return {label:'모집중', cls:'open'};
  }

  function renderList(items,{append=false}={}){
    const listEl  = $('#rlList');
    const emptyEl = $('#rlEmpty');
    if(!append) listEl.innerHTML = '';

    if((!append && items.length===0) && state.page===1){
      emptyEl.hidden = false; return;
    }
    emptyEl.hidden = true;

    const html = items.map(it=>{
      const st = mapStatus(it.status);
      const payStr = it.payNegotiable ? '협의 가능' : (it.pay ? `${money(it.pay)}원` : '미정');

      return `
        <article class="rl-card">
          <img class="rl-thumb" src="${thumbOr(it.thumb,it.id)}" alt="">

          <div class="rl-body">
            <div class="rl-state"><span class="rl-chip ${st.cls}">${st.label}</span></div>
            <div class="lv-brand" style="color:var(--pri);font-weight:700;font-size:13px">${it.brandName}</div>
            <h3 class="rl-title">${it.title}</h3>
            <div class="rl-meta">
              <span>마감 <b class="date">${fmtDate(it.closeAt)}</b></span>
              <span>출연료 ${payStr}</span>
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
    // 탭
    $$('#rlTabs .chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('#rlTabs .chip').forEach(b=>b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.status = btn.dataset.status;
        state.page=1; state.ended=false; fetchMine();
      });
    });

    // 검색/정렬
    const sEl = $('#rlSearch');
    if(sEl){ sEl.addEventListener('input', e=>{
      state.query = e.target.value.trim(); state.page=1; state.ended=false; fetchMine();
    });}
    const sortEl = $('#rlSort');
    if(sortEl){ sortEl.addEventListener('change', e=>{
      state.sort = e.target.value; state.page=1; state.ended=false; fetchMine();
    });}

    // 더보기
    $('#rlMore').addEventListener('click', ()=>{ state.page+=1; fetchMine({append:true}); });

    // 액션
    $('#rlList').addEventListener('click', e=>{
      const btn = e.target.closest('.ic'); if(!btn) return;
      const { act, id } = btn.dataset;
      const canManage = user && (user.role==='brand' || user.role==='admin');
      if(!canManage){ toast('브랜드만 이용 가능한 기능입니다.'); return; }

      if (act==='edit')  location.href = `recruit-new.html?id=${encodeURIComponent(id)}`;
      if (act==='dup')   toast('복제 준비중');
      if (act==='close') toast('마감 처리 준비중');
      if (act==='del')   toast('삭제 준비중');
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{ bindUI(); fetchMine(); });
})();