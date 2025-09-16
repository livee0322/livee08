// models.js — 2열 카드(썸네일 위, 이름/한줄소개 아래)
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP_LIST = (CFG.endpoints && (CFG.endpoints.model || CFG.endpoints.models)) || '/model-test?status=published&limit=24';
  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];

  let page = 1, done = false, key = '';

  function card(d){
    const id   = d.id || d._id;
    const img  = d.mainThumbnailUrl || d.coverImageUrl || PH;
    const name = d.nickname || d.name || '모델';
    const sub  = d.headline || d.oneLiner || '';

    return `
      <a class="mdl-card" href="model.html?id=${encodeURIComponent(id)}" aria-label="${name} 프로필">
        <div class="thumb" style="background-image:url('${img}')"></div>
        <div class="body">
          <strong class="name">${name}</strong>
          <div class="headline">${sub}</div>
        </div>
      </a>
    `;
  }

  async function load(append = true){
    if(done) return;
    $('#mdlMore')?.setAttribute('disabled','disabled');
    $('#mdlMore')?.classList.add('loading');
    try{
      const q = new URLSearchParams({ page, key, status:'published', limit: 24 });
      const url = EP_LIST.split('?')[0]; // 안전하게 base만
      const r = await fetch(`${API}${url}?${q.toString()}`);
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];
      if(items.length < 1){ done = true; $('#mdlMoreWrap').style.display = 'none'; }
      const html = items.map(card).join('');
      if(append) $('#mdlGrid').insertAdjacentHTML('beforeend', html);
      const total = Number(j.total || j.count || $('#mdlGrid').children.length);
      $('#mdlCount').textContent = `모델 ${total}명`;
      page += 1;
    }catch(e){
      console.warn('[models load]', e);
      if(window.UI?.toast) UI.toast('목록을 불러오지 못했습니다');
    }finally{
      $('#mdlMore')?.removeAttribute('disabled');
      $('#mdlMore')?.classList.remove('loading');
    }
  }

  // 필터 칩
  $('#mdlFilters')?.addEventListener('click',(e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    $$('#mdlFilters .chip').forEach(x=>x.classList.toggle('on', x===b));
    key = b.dataset.k || '';
    page = 1; done = false;
    $('#mdlGrid').innerHTML = '';
    $('#mdlMoreWrap').style.display = '';
    load(true);
  });

  $('#mdlMore')?.addEventListener('click',()=>load(true));

  // init
  load(true);
})();