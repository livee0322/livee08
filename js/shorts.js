/* shorts.js — v1.3 (hide FAB when modal, solid sticky actions) */
(function(){
  'use strict';
  const $  = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '').replace(/\/$/,'');
  const SHORTS_BASE = (CFG.endpoints && (CFG.endpoints.shortsBase || CFG.endpoints.shorts)) || '/shorts-test';

  const HJSON = { 'Accept':'application/json','Content-Type':'application/json' };
  const join = (b,p)=> b + (p.startsWith('/')?p:('/'+p));

  /* ---------- Provider/ID/Embed ---------- */
  const ytId = (u='') => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)||[])[1]||'';
  const igId = (u='') => (u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)||[])[1]||'';
  const tkId = (u='') => (u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)||[])[1]||'';

  const detectProvider = (url='') =>
    /youtu\.?be|youtube\.com/.test(url) ? 'youtube' :
    /instagram\.com/.test(url)         ? 'instagram' :
    /tiktok\.com/.test(url)            ? 'tiktok' : 'etc';

  const embedUrl = (p,u) =>
    p==='youtube'   ? (ytId(u)?`https://www.youtube.com/embed/${ytId(u)}?playsinline=1`:'') :
    p==='instagram' ? (igId(u)?`https://www.instagram.com/reel/${igId(u)}/embed`:'') :
    p==='tiktok'    ? (tkId(u)?`https://www.tiktok.com/embed/v2/${tkId(u)}`:'') : '';

  const thumbUrl = (p,u) => p==='youtube' && ytId(u) ? `https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg` : '';

  /* ---------- List ---------- */
  const grid = $('#scGrid');
  const totalEl = $('#scTotal');

  async function fetchShorts(){
    const url = join(API_BASE, SHORTS_BASE) + '?status=published&limit=24';
    const r = await fetch(url, { headers:HJSON });
    const j = await r.json().catch(()=>({}));
    const items = Array.isArray(j)?j:(j.items||j.data||j.docs||[]);
    const total = j.total ?? items.length;
    return { items, total };
  }

  const cardHTML = (it)=>{
    const p = it.provider || detectProvider(it.sourceUrl||'');
    const t = it.thumbnailUrl || thumbUrl(p, it.sourceUrl||'');
    const icon = p==='youtube' ? 'ri-youtube-fill' : p==='instagram' ? 'ri-instagram-line' :
                 p==='tiktok' ? 'ri-tiktok-line' : 'ri-global-line';
    const embed = it.embedUrl || embedUrl(p, it.sourceUrl||'');
    const title = it.title || '제목 없음';
    return `
      <article class="sc-card" data-embed="${embed}" data-title="${title.replace(/"/g,'&quot;')}">
        <span class="badge"><i class="${icon}"></i>${p}</span>
        <img class="thumb" src="${t || (CFG.placeholderThumb || 'default.jpg')}" alt="">
        <div class="title">${title}</div>
      </article>`;
  };

  async function load(){
    grid.innerHTML = '<div class="sc-card"><img class="thumb" style="opacity:.3" src="default.jpg" alt=""></div>'.repeat(6);
    try{
      const {items,total} = await fetchShorts();
      totalEl.textContent = `총 ${total}개`;
      grid.innerHTML = items.map(cardHTML).join('') || `<div style="padding:20px;color:#64748b">등록된 숏클립이 없습니다.</div>`;
    }catch(e){
      console.warn('[shorts] list error', e);
      UI.toast('목록을 불러오지 못했습니다');
      grid.innerHTML = `<div style="padding:20px;color:#ef4444">에러로 목록을 불러오지 못했습니다.</div>`;
      totalEl.textContent = '총 0개';
    }
  }

  /* ---------- Viewer ---------- */
  const viewer = $('#scViewer');
  const player = $('#scPlayer');
  const vtitle = $('#scViewerTitle');

  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.sc-card'); if(!card) return;
    const src = card.getAttribute('data-embed');
    const tt  = card.getAttribute('data-title') || '';
    if(!src) return;
    player.src = src;
    vtitle.textContent = tt;
    viewer.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
  });

  $('#scViewerClose').onclick = closeViewer;
  viewer.addEventListener('click', (e)=>{ if(e.target===viewer) closeViewer(); });
  function closeViewer(){
    player.src='about:blank';
    viewer.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';
  }

  /* ---------- FAB Modal (add) ---------- */
  const modal = $('#scModal');
  const urlIn = $('#scUrl');
  const titIn = $('#scTitle');
  const dscIn = $('#scDesc');
  const prv   = $('#scPreview');
  const prvIf = $('#scPreview iframe');
  const providerBox = $('#scProvider');
  const saveBtn = $('#scSave');

  let curProvider = 'etc', curEmbed = '', curThumb = '';

  $('#scFab').onclick = openModal;
  $('#scModalClose').onclick = closeModal;
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
    document.body.classList.add('modal-open');   /* ✅ FAB 백업 숨김 */
    urlIn.focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';
    document.body.classList.remove('modal-open');
    resetModal();
  }
  function resetModal(){
    urlIn.value=''; titIn.value=''; dscIn.value='';
    prv.hidden = true; prvIf.src='about:blank';
    providerBox.innerHTML = `<i class="ri-global-line"></i><b>알 수 없음</b>`;
    curProvider='etc'; curEmbed=''; curThumb='';
  }

  function updatePreview(){
    const url = urlIn.value.trim();
    curProvider = detectProvider(url);
    curEmbed = embedUrl(curProvider, url);
    curThumb = thumbUrl(curProvider, url);

    const icon = curProvider==='youtube' ? 'ri-youtube-fill' :
                 curProvider==='instagram' ? 'ri-instagram-line' :
                 curProvider==='tiktok' ? 'ri-tiktok-line' : 'ri-global-line';
    providerBox.innerHTML = `<i class="${icon}"></i><b>${curProvider}</b>`;

    if(curEmbed){
      prvIf.src = curEmbed;
      prv.hidden = false;
      // 저장 버튼이 가시영역에 들어오도록
      saveBtn.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }else{
      prvIf.src = 'about:blank';
      prv.hidden = true;
    }
  }
  urlIn.addEventListener('input', updatePreview);
  urlIn.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); updatePreview(); } });

  saveBtn.onclick = async ()=>{
    const sourceUrl = urlIn.value.trim();
    if(!sourceUrl || curProvider==='etc' || !curEmbed){
      UI.toast('유효한 링크를 입력하세요'); return;
    }
    const body = {
      title: titIn.value.trim() || '(제목 없음)',
      description: dscIn.value.trim(),
      provider: curProvider,
      sourceUrl,
      thumbnailUrl: curThumb || '',
      status: 'published'
    };
    try{
      const r = await fetch(join(API_BASE, SHORTS_BASE), { method:'POST', headers:HJSON, body:JSON.stringify(body) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message||'SAVE_ERROR');
      UI.toast('저장되었습니다');
      closeModal();
      load();
    }catch(e){
      console.warn('[shorts] save error', e);
      UI.toast('저장 실패');
    }
  };

  /* init */
  load();
})();