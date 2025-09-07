// Livee News page + Hash Router
(() => {
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = Object.assign({
    news: '/news?status=published&limit=20',
    newsById: (id) => `/news/${id}`,
    newsRequest: '/news-requests',
    sign: '/uploads/signature', // Cloudinary signature
  }, CFG.endpoints || {});

  const CLOUD = CFG.cloudinary || { cloudName:'', apiKey:'' }; // config.js에서 세팅 권장
  let cursor = null;
  let currentTag = 'all';

  /* --------- utils --------- */
  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const esc = s => (s==null ? '' : String(s))
      .replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const prefixMap = { notice:'공지', event:'이벤트', live:'쇼핑라이브', pick:'추천', external:'관련기사', ad:'광고' };
  const thumb = n => n.image?.url || n.thumb || '';

  async function getJSON(url){
    const r = await fetch(url, { headers:{'Accept':'application/json'} });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j;
  }
  async function postJSON(url, body){
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j;
  }

  const parseList  = j => {
    const arr = Array.isArray(j)? j : (j.items || j.data?.items || j.docs || j.data?.docs || []);
    cursor = j.cursor || j.nextCursor || null;
    return arr;
  };
  const itemURL = id => `#/news/${encodeURIComponent(id)}`;

  /* --------- render list --------- */
  function tagClass(tag){ return ['notice','event','live','pick','external','ad'].includes(tag) ? tag : 'notice'; }
  function renderItem(n){
    const showThumb = !!thumb(n);
    const tag = n.tag || 'notice';
    return `
      <article class="news-item" onclick="location.hash='${itemURL(n.id).slice(1)}'">
        <div>
          <div class="news-meta">
            <span class="prefix ${tagClass(tag)}">[${prefixMap[tag]||'공지'}]</span>
            <span>${fmtDate(n.publishedAt || n.createdAt) || ''}</span>
            ${n.sponsored?.enabled ? `<span class="prefix ad">[광고]</span>` : ''}
            ${n.priority>0 ? `<span class="prefix pick">추천</span>` : ''}
          </div>
          <div class="news-title">${esc(n.title || '제목 없음')}</div>
        </div>
        ${ showThumb ? `<img class="news-thumb" src="${thumb(n)}" alt="">` : `<div></div>` }
      </article>
    `;
  }

  async function loadList({reset=false}={}){
    const listEl = $('#view-list');
    if (reset){ listEl.innerHTML=''; cursor=null; }
    const qs = new URLSearchParams();
    if (currentTag !== 'all') qs.set('tag', currentTag);
    if (cursor) qs.set('cursor', cursor);
    const j = await getJSON(`${API_BASE}${EP.news}${EP.news.includes('?')?'&':'?'}${qs.toString()}`);
    const arr = parseList(j);
    listEl.insertAdjacentHTML('beforeend', arr.map(renderItem).join('') || `<div class="news-empty">표시할 뉴스가 없습니다.</div>`);
    $('#btnMore').hidden = !cursor;
  }

  /* --------- detail --------- */
  async function renderDetail(id){
    const j  = await getJSON(`${API_BASE}${EP.newsById(id)}`);
    const n  = j.data || j || {};
    const el = $('#view-detail');
    const tag = n.tag || 'notice';
    el.innerHTML = `
      <div class="news-detail__in">
        <h1 class="nd-title">${esc(n.title || '')}</h1>
        <div class="nd-meta">
          <span class="prefix ${tagClass(tag)}">[${prefixMap[tag]||'공지'}]</span>
          <span>${fmtDate(n.publishedAt || n.createdAt)}</span>
          ${n.sponsored?.enabled ? `<span class="prefix ad">[광고]</span>` : ''}
        </div>
        ${ thumb(n) ? `<img class="nd-hero" src="${thumb(n)}" alt="">` : '' }
        <div class="nd-body">${esc(n.summary || '')}</div>
        ${ n.sourceUrl ? `<p class="nd-meta"><a href="${esc(n.sourceUrl)}" target="_blank" rel="noopener">원문 보기</a></p>` : '' }
      </div>
    `;
  }

  /* --------- modal (request) --------- */
  function openModal(){ $('#requestModal').hidden=false; location.hash = '#/news/request'; }
  function closeModal(){ $('#requestModal').hidden=true; if (location.hash.startsWith('#/news/request')) history.back(); }
  function attachModal(){
    $('#btnRequest').addEventListener('click', openModal);
    $$('.modal [data-close]').forEach(b=> b.addEventListener('click', closeModal));
    // tag 조건부 필드
    const tagSel = $('#requestForm select[name="tag"]');
    const srcFld = $('#requestForm [data-when="external"]');
    const syncFields = () => { srcFld.style.display = (tagSel.value==='external') ? 'block' : 'none'; };
    tagSel.addEventListener('change', syncFields); syncFields();

    // Cloudinary upload
    const fileInput = $('#fileInput');
    fileInput.addEventListener('change', async (e)=>{
      const f = e.target.files?.[0]; if (!f) return;
      $('#uploadHint').textContent = '업로드 준비 중...';
      try{
        const sig = await postJSON(`${API_BASE}${EP.sign}`, { folder:'livee/news' });
        const fd = new FormData();
        fd.append('file', f);
        fd.append('api_key', sig.apiKey || CLOUD.apiKey);
        fd.append('timestamp', sig.timestamp);
        fd.append('signature', sig.signature);
        fd.append('folder', sig.folder || 'livee/news');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName || CLOUD.cloudName}/image/upload`, { method:'POST', body: fd });
        const j = await res.json();
        if(!j.secure_url) throw new Error('업로드 실패');
        fileInput.dataset.url = j.secure_url;
        fileInput.dataset.publicId = j.public_id;
        $('#uploadHint').textContent = '업로드 완료 ✅';
      }catch(err){
        console.error(err);
        $('#uploadHint').textContent = '업로드 실패. 다시 시도해주세요.';
      }
    });

    // submit
    $('#requestForm').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      if (fd.get('tag')==='external' && !fd.get('sourceUrl')) {
        alert('관련기사 말머리에는 출처 URL이 필요합니다.'); return;
      }
      const payload = {
        tag: fd.get('tag'),
        title: fd.get('title'),
        summary: fd.get('summary') || '',
        sourceUrl: fd.get('sourceUrl') || '',
        image: fileInput.dataset.url ? { url:fileInput.dataset.url, publicId:fileInput.dataset.publicId } : null
      };
      try{
        await postJSON(`${API_BASE}${EP.newsRequest}`, payload);
        closeModal();
        alert('요청이 접수되었습니다. 검수 후 노출됩니다.');
      }catch(err){
        console.error(err);
        alert('요청 실패: ' + (err.message||'서버 오류'));
      }
    });
  }

  /* --------- router --------- */
  function renderListView(){
    $('#view-detail').hidden = true;
    $('#view-list').hidden = false;
  }
  function renderDetailView(){
    $('#view-list').hidden = true;
    $('#view-detail').hidden = false;
  }

  async function router(){
    const hash = location.hash || '#/news';
    const [_, base, idOrAction] = hash.split('/'); // ["#","news","123"| "request" | ""]
    if (base !== 'news'){
      location.hash = '#/news'; return;
    }
    if (!idOrAction || idOrAction === ''){ // list
      renderListView();
      await loadList({reset:true});
      return;
    }
    if (idOrAction === 'request'){
      openModal(); return;
    }
    // detail
    renderDetailView();
    await renderDetail(decodeURIComponent(idOrAction));
  }

  /* --------- events --------- */
  function init(){
    // filters
    $$('.news-filter .chip').forEach(chip=>{
      chip.addEventListener('click', async ()=>{
        $$('.news-filter .chip').forEach(c=>c.classList.remove('is-active'));
        chip.classList.add('is-active');
        currentTag = chip.dataset.tag;
        await loadList({reset:true});
      });
    });
    // more
    $('#btnMore').addEventListener('click', ()=> loadList({reset:false}));
    // modal
    attachModal();
    // initial route
    window.addEventListener('hashchange', router);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ init(); router(); }, {once:true});
  }else{
    init(); router();
  }
})();