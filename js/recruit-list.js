(() => {
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const user = JSON.parse(localStorage.getItem('lv_user') || 'null');

  function toast(msg){
    let t = document.getElementById('lvToast');
    if(!t){
      t = document.createElement('div'); t.id='lvToast';
      t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 14px;border-radius:999px;z-index:9999;font-size:13px;transition:.25s';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity='1';
    setTimeout(()=>t.style.opacity='0', 1500);
  }

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || '/recruit-test';

  const state = { status:'all', sort:'latest', query:'', cursor:null, loading:false, ended:false };

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if(!iso) return ''; const d=new Date(iso);
    if(isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const thumbOr = (src,seed='lv')=> src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;

  function mapStatus(s){
    if(s==='open')   return {label:'모집중',cls:'open'};
    if(s==='closed') return {label:'마감',cls:'closed'};
    if(s==='draft')  return {label:'임시저장',cls:'draft'};
    return {label:'모집중',cls:'open'};
  }

  async function fetchMine({append=false}={}){
    if(state.loading||state.ended) return;
    state.loading=true;

    const params=new URLSearchParams();
    params.set('owner','me'); params.set('limit','20');
    if(state.query) params.set('query',state.query);
    if(state.sort)  params.set('sort',state.sort);
    if(state.status && state.status!=='all'){
      if(state.status==='upcoming') params.set('upcoming','1');
      else params.set('status',state.status);
    }
    if(state.cursor) params.set('cursor',state.cursor);

    const url=`${API_BASE}${EP_RECRUITS.startsWith('/')?EP_RECRUITS:`/${EP_RECRUITS}`}?${params.toString()}`;
    let items=[], nextCursor=null;
    try{
      const res=await fetch(url,{headers:{'Accept':'application/json'}});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);
      const list=(Array.isArray(data)&&data)||data.items||data.data?.items||data.docs||data.data?.docs||[];
      items=list.map((c,i)=>({
        id:c.id||c._id||`${i}`, title:c.title||'(제목 없음)',
        thumb:c.thumbnailUrl||c.coverImageUrl||'', status:c.status||'open',
        pay:c.recruit?.pay, payNegotiable:!!c.recruit?.payNegotiable,
        closeAt:c.closeAt
      }));
      nextCursor=data.nextCursor||data.data?.nextCursor||null;
    }catch(e){ console.warn('[recruit-list] fetch error:',e); }
    renderList(items,{append});
    state.cursor=nextCursor; state.ended=!nextCursor&&items.length<20; state.loading=false;
    const moreBtn=$('#rlMore'); if(moreBtn) moreBtn.style.display=state.ended?'none':'inline-flex';
  }

  function renderList(items,{append=false}={}){
    const listEl=$('#rlList'); const emptyEl=$('#rlEmpty');
    if(!append) listEl.innerHTML='';
    if((!append&&items.length===0)&&!state.cursor){ emptyEl.hidden=false; return; }
    emptyEl.hidden=true;

    const html=items.map(it=>{
      const st=mapStatus(it.status);
      const pay=it.payNegotiable?'협의 가능':(it.pay?`${Number(it.pay).toLocaleString()}원`:'미정');
      return `
        <article class="rl-card">
          <img class="rl-thumb" src="${thumbOr(it.thumb,it.id)}" alt="">
          <div class="rl-body">
            <div class="rl-status">${st.label}</div>
            <div class="rl-title">${it.title}</div>
            <div class="rl-info">
              <span>마감 ${fmtDate(it.closeAt)}</span>
              <span>출연료 ${pay}</span>
            </div>
            <div class="rl-actions">
              <button class="ic" data-act="edit" data-id="${it.id}"><i class="ri-pencil-line"></i></button>
              <button class="ic" data-act="dup"  data-id="${it.id}"><i class="ri-file-copy-line"></i></button>
              <button class="ic" data-act="close"data-id="${it.id}"><i class="ri-lock-line"></i></button>
              <button class="ic" data-act="del"  data-id="${it.id}"><i class="ri-delete-bin-line"></i></button>
            </div>
          </div>
        </article>`;
    }).join('');
    listEl.insertAdjacentHTML('beforeend',html);
  }

  function bindUI(){
    $$('#rlTabs .chip').forEach(btn=>{
      btn.addEventListener('click',()=>{
        $$('#rlTabs .chip').forEach(b=>b.classList.remove('is-active'));
        btn.classList.add('is-active'); state.status=btn.dataset.status;
        state.cursor=null; state.ended=false; fetchMine();
      });
    });
    $('#rlSearch').addEventListener('input',e=>{
      state.query=e.target.value.trim(); state.cursor=null; state.ended=false; fetchMine();
    });
    $('#rlSort').addEventListener('change',e=>{
      state.sort=e.target.value; state.cursor=null; state.ended=false; fetchMine();
    });
    $('#rlMore').addEventListener('click',()=>fetchMine({append:true}));
    $('#rlList').addEventListener('click',e=>{
      const btn=e.target.closest('.ic'); if(!btn) return;
      const {act,id}=btn.dataset;
      const canManage=user&&(user.role==='brand'||user.role==='admin');
      if(!canManage){toast('브랜드만 이용 가능한 기능입니다.');return;}
      if(act==='edit') location.href=`recruit-new.html?id=${encodeURIComponent(id)}`;
      else if(act==='dup') toast('복제 준비중');
      else if(act==='close') toast('마감 처리 준비중');
      else if(act==='del') toast('삭제 준비중');
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{bindUI();fetchMine();});
})();