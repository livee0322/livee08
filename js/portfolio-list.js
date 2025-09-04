/* Portfolio List – v2.7 (fields aligned with option-B backend) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const LIST_PATH = EP.portfolios || '/portfolio-test?status=published&limit=24';

  const $ = (s) => document.querySelector(s);

  // fallback thumb
  const FALLBACK =
    CFG.placeholderThumb ||
    (CFG.BASE_PATH ? `${CFG.BASE_PATH}/default.jpg` : 'default.jpg');

  // pick first usable image (matches our model fields)
  const pickImage = (p) =>
    p.mainThumbnailUrl ||
    (Array.isArray(p.subThumbnails) && p.subThumbnails[0]) ||
    p.coverImageUrl ||
    '';

  // cloudinary helpers
  const isCloudinary = (u) => /https?:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(u);
  const hasTransform = (u) => {
    if (!isCloudinary(u)) return false;
    const tail = u.split('/upload/')[1] || '';
    const first = tail.split('/')[0] || '';
    return /^([a-z]+_[^/]+,?)+$/.test(first);
  };
  const PRESET = (CFG.thumb && CFG.thumb.square) || 'c_fill,g_auto,w_320,h_320,f_auto,q_auto';
  const cldSquare = (u) => {
    if (!isCloudinary(u)) return u;
    try {
      if (hasTransform(u)) return u;
      const [head, tail] = u.split('/upload/');
      return `${head}/upload/${PRESET}/${tail}`;
    } catch { return u; }
  };
  const thumbSrc = (u) => (u ? cldSquare(u) : FALLBACK);

  async function fetchList(q = '', sort = 'latest') {
    const base = LIST_PATH.startsWith('http')
      ? LIST_PATH
      : `${API_BASE}${LIST_PATH.startsWith('/') ? LIST_PATH : `/${LIST_PATH}`}`;

    const url = base +
      (base.includes('?') ? '&' : '?') +
      (q ? `q=${encodeURIComponent(q)}&` : '') +
      `sort=${encodeURIComponent(sort)}`;

    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `HTTP_${res.status}`);

      const list =
        (Array.isArray(data) && data) ||
        data.items || data.data?.items ||
        data.docs  || data.data?.docs  || [];

      return list.map((p, i) => ({
        id: p.id || p._id || `${i}`,
        nickname: p.nickname || '무명',
        headline: p.headline || '',
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 5) : [],
        img: pickImage(p),
        openToOffers: !!p.openToOffers
      }));
    } catch (e) {
      console.warn('[portfolio-list] fetch error:', e);
      return [];
    }
  }

  function render(list) {
    const grid = $('#plGrid');
    const empty = $('#plEmpty');
    if (!grid) return;

    grid.innerHTML = '';
    if (!list.length) { if (empty) empty.hidden = false; return; }
    if (empty) empty.hidden = true;

    grid.innerHTML = list.map(it => `
      <a class="pl-card card-link" href="portfolio-view.html?id=${encodeURIComponent(it.id)}">
        <img class="pl-thumb"
             src="${thumbSrc(it.img)}"
             alt=""
             onerror="this.onerror=null;this.src='${FALLBACK}';"/>
        <div class="pl-body">
          <div class="pl-nick">${it.nickname}</div>
          <div class="pl-head">${it.headline || ''}</div>
          <div class="pl-tags">
            ${it.tags.map(t => `<span class="pl-tag">#${t}</span>`).join('')}
          </div>
          <div class="pl-meta">
            ${it.openToOffers ? '<span class="badge">제안 가능</span>' : ''}
          </div>
        </div>
      </a>
    `).join('');
  }

  async function boot() {
    const qEl = $('#plSearch');
    const sEl = $('#plSort');
    let q = '', sort = 'latest';
    const load = async () => render(await fetchList(q, sort));

    qEl?.addEventListener('input', (e) => { q = e.target.value.trim(); load(); });
    sEl?.addEventListener('change', (e) => { sort = e.target.value; load(); });

    await load();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();