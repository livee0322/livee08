/* ===== Recruit List – mine ===== */
(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const user = JSON.parse(localStorage.getItem('lv_user') || 'null');

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

  const state = { status:'all', sort:'latest', query:'', cursor:null, loading:false, ended:false };

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if(!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const thumbOr = (src, seed='lv') => src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

  // 브랜드명 추출
  const pickBrandName = (c={}) => {
    const cand = [
      c.recruit?.brandName, c.brandName,
      (typeof c.brand === 'string' ? c.brand : ''),
      c.brand?.brandName, c.brand?.name,
      c.owner?.brandName, c.owner?.name,
      c.user?.brandName, c.user?.companyName
    ].filter(Boolean).map(s=>String(s).trim());
    return cand.find(s=>s && s!=='브랜드') || '브랜드';
  };

  const mapStatus = s => (s==='closed') ? {label:'마감', cls:'closed'}
                      : (s==='draft')  ? {label:'임시저장', cls:'draft'}
                      : {label:'모집중', cls:'open'};

  // 정렬 폴백(서버가 정렬 안 해줄 때도 보정)
  function sortItems(items){
    const byDate = (a,b, key) => (new Date(b[key]||0)) - (new Date(a[key]||0));
    const byCloseAsc = (a,b) => {
      const A = a.closeAt ? new Date(a.closeAt) : null;
      const B = b.closeAt ? new Date(b.closeAt) : null;
      if(!A && !B) return 0; if(!A) return 1; if(!B) return -1;
      return A - B;
    };
    if(state.sort==='latest')    return items.sort((a,b)=>byDate(a,b,'createdAt'));
    if(state.sort==='closeAsc')  return items.sort(byCloseAsc);
    if(state.sort==='viewsDesc') return items.sort((a,b)=>(b.views||0)-(a.views||0));
    return items;
  }

  async function fetchMine({append=false} = {}){
    if (state.loading || state.ended) return;
    state.loading = true;

    const params = new URLSearchParams();
    params.set('owner','me');
    params.set('limit','20');
    if (state.query) params.set('query', state.query);
    if (state.sort)  params.set('sort', state.sort);
    if (state.status && state.status!=='all'){
      if (state.status==='upcoming') params.set('upcoming','1');
      else params.set('status', state.status);
    }
    if (state.cursor) params.set('cursor', state.cursor);

    const url = `${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:`/${EP_RECRUITS}`}?${params.toString()}`;

    let items=[], nextCursor=null;
    try{
      const res  = await fetch(url,{headers:{'Accept':'application/json'}});
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      items = list.map((c,i)=>({
        id: c.id||c._id||`${i}`,
        brandName: pickBrandName(c),
        title: c.title||c.recruit?.title||'(제목 없음)',
        thumb: c.thumbnailUrl||c.coverImageUrl||'',
        status: c.status||'open',
        closeAt: c.closeAt,
        createdAt: c.createdAt || c._createdAt || c.meta?.createdAt || null,
        category: c.recruit?.category||'',
        views: c.stats?.views,
        applies: c.stats?.applies,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable
      }));
      nextCursor = data.nextCursor || data.data?.nextCursor || null;

      // 클라 정렬 보정
      items = sortItems(items);
    }catch(e){
      console.warn('[recruit-list] fetch error:', e);
      items=[]; nextCursor=null;
    }

    renderList(items,{append});
    state.cursor = nextCursor;
    state.ended  = !nextCursor && items.length<20;
    state.loading=false;

    const moreBtn = $('#rlMore');
    if (moreBtn) moreBtn.style.display = state.ended ? 'none' : 'inline-flex';
  }

  function renderList(items,{append=false}={}){
    const listEl  = $('#rlList');
    const emptyEl = $('#rlEmpty');
    if(!append) listEl.innerHTML = '';

    if((!append && items.length===0) && !state.cursor){
      emptyEl.hidden = false; return;
    }
    emptyEl.hidden = true;

    const html = items.map(it=>{
      const st = mapStatus(it.status);
      const payStr = it.payNegotiable ? '협의 가능' : (it.pay ? `${Number(it.pay).toLocaleString('ko-KR')}원` : '미정');

      return `
        <article class="rl-card">
          <img class="rl-thumb" src="${thumbOr(it.thumb,it.id)}" alt="">

          <div class="rl-body">
            <div class="rl-state"><span class="rl-chip ${st.cls}">${st.label}</span></div>
            <div class="rl-brand">${it.brandName}</div>
            <h3 class="rl-title">${it.title}</h3>
            <div class="rl-meta">
              <span>마감 <b class="date">${fmtDate(it.closeAt)}</b></span>
              <span>출연료 ${payStr}</span>
            </div>
          </div>

          <!-- ✅ 액션은 단 한 곳 -->
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
        state.cursor=null; state.ended=false; fetchMine();
      });
    });

    // 검색/정렬
    const sEl = $('#rlSearch');
    if(sEl){ sEl.addEventListener('input', e=>{
      state.query = e.target.value.trim(); state.cursor=null; state.ended=false; fetchMine();
    });}
    const sortEl = $('#rlSort');
    if(sortEl){ sortEl.addEventListener('change', e=>{
      state.sort = e.target.value; state.cursor=null; state.ended=false; fetchMine();
    });}

    // 더보기
    $('#rlMore').addEventListener('click', ()=> fetchMine({append:true}));

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