/* shorts.js — v1.0.0: Shorts feed + lazy embed + infinite scroll + editor(optional) */
(() => {
  const $  = (s, el=document)=>el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '').replace(/\/$/,'') + '/shorts-test';

  const feed = $('#scFeed');
  const sentinel = $('#scSentinel');

  // state
  const qs = new URLSearchParams(location.search);
  const state = {
    page: 1,
    limit: 6,
    loading: false,
    end: false,
    editor: qs.get('editor') === '1'
  };

  // editor toggle
  const editor = $('#scEditor');
  if (state.editor) editor.hidden = false;

  // add handler
  $('#scAdd')?.addEventListener('click', async () => {
    const url = $('#scUrl').value.trim();
    if (!url) return UI.toast('URL을 입력하세요');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Accept:'application/json' },
        body: JSON.stringify({ url, status:'published' })
      });
      const j = await r.json();
      if (!r.ok || j.ok===false) throw new Error(j.message || '등록 실패');
      UI.toast('등록 완료');
      $('#scUrl').value='';
      // 새로고침 없이 맨 위에 삽입
      feed.insertAdjacentHTML('afterbegin', cardHTML(j.data || j));
      observeLazy();
    } catch (e) {
      console.warn(e); UI.toast('등록 중 오류');
    }
  });

  // fetch & render
  async function fetchShorts(){
    const url = `${API}?status=published&limit=${state.limit}&skip=${(state.page-1)*state.limit}&sort=recent`;
    const r = await fetch(url, { headers:{ Accept:'application/json' }});
    let j=null; try{ j = await r.json(); }catch{}
    if (!r.ok || (j && j.ok===false)) throw new Error((j&&j.message)||'HTTP_'+r.status);
    const items = Array.isArray(j) ? j :
                  j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || [];
    const total = j.total || (j.data && (j.data.total || j.data.count)) || 0;
    return { items, total };
  }

  function cardHTML(it){
    const id  = it.id || it._id;
    const src = it.embedSrc;
    const title = it.title || it.provider?.toUpperCase() || 'Shorts';
    const provider = it.provider || '';
    const openUrl  = it.url;
    return `
      <article class="sc-card" data-id="${id}">
        <div class="frame">
          <div class="ratio"></div>
          <iframe data-src="${src}" title="${provider} short" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <div class="meta">
          <div class="title">${title}</div>
          <div class="r">
            <button class="iconbtn open" aria-label="원본 열기" title="원본 열기"><i class="ri-external-link-line"></i></button>
            <button class="iconbtn share" aria-label="공유" title="공유"><i class="ri-share-forward-line"></i></button>
          </div>
        </div>
      </article>
    `;
  }

  // lazy load iframes + auto-unload when out of view
  let ioFrames;
  function observeLazy(){
    ioFrames && ioFrames.disconnect();
    ioFrames = new IntersectionObserver((ents)=>{
      ents.forEach(ent=>{
        const ifr = ent.target;
        if (ent.isIntersecting){
          if (!ifr.src) ifr.src = ifr.dataset.src;
        } else {
          // out of view → pause by unloading
          ifr.src = '';
        }
      });
    }, { rootMargin:'120px 0px' });
    document.querySelectorAll('.sc-card iframe').forEach(el => ioFrames.observe(el));
  }

  async function load(){
    if (state.loading || state.end) return;
    state.loading = true;

    // skeleton
    for(let i=0;i<state.limit;i++){
      feed.insertAdjacentHTML('beforeend', `<div class="sc-card skeleton"></div>`);
    }

    try{
      const {items} = await fetchShorts();
      // remove skeletons
      feed.querySelectorAll('.skeleton').forEach(e=>e.remove());

      if (!items.length){
        state.end = true;
        sentinel.remove();
        return;
      }
      feed.insertAdjacentHTML('beforeend', items.map(cardHTML).join(''));
      observeLazy();
      state.page += 1;
    }catch(e){
      console.warn('[shorts] load error:', e);
      UI.toast('불러오기에 실패했습니다.');
    }finally{
      feed.querySelectorAll('.skeleton').forEach(e=>e.remove());
      state.loading = false;
    }
  }

  // feed actions
  feed.addEventListener('click', (e)=>{
    const card = e.target.closest('.sc-card'); if(!card) return;
    const id = card.dataset.id;
    if (e.target.closest('.open')){
      // 원본 링크 새창
      const url = card.querySelector('iframe')?.dataset.src || '';
      // embedSrc가 youtube/instagram이면 원본으로 되돌림
      let raw = url;
      if (/youtube\.com\/embed\//.test(url)){
        const vid = url.split('/embed/')[1]?.split(/[?&]/)[0];
        if (vid) raw = 'https://youtu.be/' + vid;
      }else if (/instagram\.com\/.*\/embed/.test(url)){
        raw = url.replace(/\/embed\/?$/, '/');
      }
      window.open(raw, '_blank'); return;
    }
    if (e.target.closest('.share')){
      const shareUrl = location.href.split('#')[0].split('?')[0] + `?short=${id}`;
      navigator.clipboard?.writeText(shareUrl);
      UI.toast('링크가 복사되었습니다');
      return;
    }
  });

  // infinite scroll
  const io = new IntersectionObserver((ents)=>{
    ents.forEach(ent => { if(ent.isIntersecting) load(); });
  }, { rootMargin:'200px 0px' });
  io.observe(sentinel);

  // direct-open by query (?short=ID)
  (function(){
    const sid = qs.get('short');
    if (!sid) return;
    // 최상단에 우선 로드
    fetch(`${API}/${encodeURIComponent(sid)}`, { headers:{Accept:'application/json'} })
      .then(r=>r.json()).then(it=>{
        if (it && (it.id || it._id)){
          feed.insertAdjacentHTML('afterbegin', cardHTML(it));
          observeLazy();
          window.scrollTo(0,0);
        }
      }).catch(()=>{});
  })();

  // kick-off
  load();
})();