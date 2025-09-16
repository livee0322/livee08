// models.js — v1.2.0 (카드 하단 '프로필 상세보기' 링크, 카운트 제거)
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  // 단수 endpoint (model-test) 사용
  const EP_LIST = (CFG.endpoints && CFG.endpoints.model) || '/model-test?status=published&limit=24';
  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s, el = document) => el.querySelector(s);

  let page = 1, done = false;

  function card(d){
    const id = d.id || d._id;
    const img = d.mainThumbnailUrl || d.coverImageUrl || PH;
    const name = d.nickname || d.name || '모델';
    const sub  = d.headline || d.oneLiner || '';

    return `
      <article class="mdl-card" data-id="${id}">
        <div class="thumb" style="background-image:url('${img}')"></div>
        <div class="body">
          <div class="name">${name}</div>
          <div class="headline">${sub}</div>
        </div>
        <a class="detail-link" href="model.html?id=${encodeURIComponent(id)}">
          프로필 상세보기 <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </a>
      </article>`;
  }

  async function load(append = true){
    if (done) return;
    $('#mdlMore')?.setAttribute('disabled','disabled');

    try{
      const url = new URL(API + EP_LIST.split('?')[0]);
      url.search = new URLSearchParams({
        page,
        status: 'published',
        limit: 24
      }).toString();

      const r = await fetch(url.toString());
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];

      if (!items.length){
        done = true;
        $('#mdlMoreWrap')?.style && ($('#mdlMoreWrap').style.display = 'none');
        return;
      }

      const html = items.map(card).join('');
      if (append) $('#mdlGrid').insertAdjacentHTML('beforeend', html);
      page += 1;
    }catch(e){
      console.warn('[models load]', e);
    }finally{
      $('#mdlMore')?.removeAttribute('disabled');
    }
  }

  $('#mdlMore')?.addEventListener('click',()=>load(true));
  load(true);
})();