/* Livee v2.5 – My Portfolio list */
(() => {
  const $  = (s, el=document) => el.querySelector(s);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio?owner=me&limit=50';

  const thumbOr = (src, seed='pf') => src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };

  // 데이터 호출
  async function fetchMine(){
    const url = `${API_BASE}${EP_PORTFOLIOS.startsWith('/') ? EP_PORTFOLIOS : `/${EP_PORTFOLIOS}`}`;
    try{
      const res = await fetch(url, { headers:{ 'Accept':'application/json' }});
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];

      // 안정 매핑(필드 변형 흡수)
      return list.map((p,i)=>({
        id: p.id || p._id || `${i}`,
        title: p.title || p.name || '(제목 없음)',
        thumb: p.thumbnailUrl || p.coverImageUrl || p.images?.[0] || '',
        updatedAt: p.updatedAt || p.modifiedAt || p.createdAt || null,
      }));
    }catch(err){
      console.warn('[portfolio] fetchMine error:', err);
      return [];
    }
  }

  function tplItem(it){
    return `
      <article class="pf-card" data-id="${it.id}">
        <img class="pf-thumb" src="${thumbOr(it.thumb, it.id)}" alt="">
        <div class="pf-body">
          <h3 class="pf-title">${it.title}</h3>
          <div class="pf-meta">업데이트 ${fmtDate(it.updatedAt)}</div>
        </div>
        <div class="pf-actions">
          <button class="ic" data-act="view" title="보기"><i class="ri-external-link-line"></i></button>
          <button class="ic" data-act="edit" title="수정"><i class="ri-pencil-line"></i></button>
          <button class="ic" data-act="del"  title="삭제"><i class="ri-delete-bin-line"></i></button>
        </div>
      </article>
    `;
  }

  function render(list){
    const listEl = $('#pfList');
    const emptyEl = $('#pfEmpty');

    if (!list.length){
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    listEl.innerHTML = list.map(tplItem).join('');
  }

  function bind(){
    // 등록 버튼들
    const goCreate = () => location.href = 'portfolio-new.html';
    $('#pfCreateTop')?.addEventListener('click', goCreate);
    $('#pfCreateHead')?.addEventListener('click', goCreate);
    $('#pfCreateEmpty')?.addEventListener('click', goCreate);

    // 카드 액션
    $('#pfList').addEventListener('click', e=>{
      const btn = e.target.closest('.ic');
      if(!btn) return;
      const card = e.target.closest('.pf-card');
      const id = card?.dataset?.id;
      const act = btn.dataset.act;
      if(!id) return;

      if (act==='view')  location.href = `portfolio-detail.html?id=${encodeURIComponent(id)}`;
      if (act==='edit')  location.href = `portfolio-new.html?id=${encodeURIComponent(id)}`;
      if (act==='del')   alert('삭제 기능은 준비 중입니다.');
    });
  }

  async function init(){
    bind();
    const items = await fetchMine();
    render(items);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();