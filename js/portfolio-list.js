/* Portfolio List – /portfolio-test */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP  = CFG.endpoints || {};
  const EP_LIST = EP.portfolios || '/portfolio-test?status=published&limit=24';

  const $ = s => document.querySelector(s);
  const thumbOr = (src, seed='pf') =>
    src || `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/640`;
  const withTransform = (url, t) => { try{ if(!url || !url.includes('/upload/')) return url||''; const [h,tail]=url.split('/upload/'); return `${h}/upload/${t}/${tail}`; }catch{ return url; } };

  const square = (u)=>withTransform(u, (CFG.thumb||{}).square || 'c_fill,g_auto,w_320,h_320,f_auto,q_auto');

  async function fetchList(q='', sort='latest'){
    const url = `${API_BASE}${EP_LIST.startsWith('/')?EP_LIST:`/${EP_LIST}`}` +
      (EP_LIST.includes('?') ? '&' : '?') +
      (q ? `q=${encodeURIComponent(q)}&` : '') +
      `sort=${encodeURIComponent(sort)}`;

    try{
      const res = await fetch(url, { headers: { 'Accept':'application/json' }});
      const data = await res.json().catch(()=>({}));
      if(!res.ok || data.ok===false) throw new Error(data.message||`HTTP_${res.status}`);

      const list = (Array.isArray(data)&&data) || data.items || data.data?.items || data.docs || data.data?.docs || [];
      return list.map((p,i)=>({
        id: p.id||p._id||`${i}`,
        nickname: p.nickname || p.name || '무명',
        headline: p.headline || '',
        tags: Array.isArray(p.tags)?p.tags.slice(0,5):[],
        mainThumbnailUrl: p.mainThumbnailUrl || p.thumbnailUrl || p.coverImageUrl || '',
        openToOffers: !!p.openToOffers
      }));
    }catch(e){
      console.warn('[portfolio-list] fetch error:', e);
      return [];
    }
  }

  function render(list){
    const grid = $('#plGrid');
    const empty = $('#plEmpty');
    grid.innerHTML = '';
    if(!list.length){ empty.hidden=false; return; }
    empty.hidden = true;

    grid.innerHTML = list.map((it)=>`
      <a class="pl-card card-link" href="portfolio-view.html?id=${encodeURIComponent(it.id)}">
        <img class="pl-thumb" src="${thumbOr(square(it.mainThumbnailUrl), it.id)}" alt=""/>
        <div class="pl-body">
          <div class="pl-nick">${it.nickname}</div>
          <div class="pl-head">${it.headline||''}</div>
          <div class="pl-tags">
            ${it.tags.map(t=>`<span class="pl-tag">#${t}</span>`).join('')}
          </div>
          <div class="pl-meta">
            ${it.openToOffers ? '<span class="badge">제안 가능</span>' : ''}
          </div>
        </div>
      </a>
    `).join('');
  }

  async function boot(){
    const qEl = $('#plSearch');
    const sEl = $('#plSort');
    let q='', sort='latest';

    const load = async()=> render(await fetchList(q, sort));
    qEl?.addEventListener('input', e=>{ q=e.target.value.trim(); load(); });
    sEl?.addEventListener('change', e=>{ sort=e.target.value; load(); });

    await load();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();