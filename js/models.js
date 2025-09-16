/* models.js — v1.1.1 (단수 엔드포인트: model-test) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  // 🔴 단수 엔드포인트로 고정
  const EP_LIST = (CFG.endpoints && (CFG.endpoints.models || CFG.endpoints.model)) || '/model-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && (CFG.endpoints.modelBase || CFG.endpoints.model)) || '/model-test';
  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const star = (v = 0) => {
    const x = Math.max(0, Math.min(5, Number(v || 0)));
    const full = Math.floor(x), half = x - full >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '<i class="ri-star-fill"></i>';
    if (half) html += '<i class="ri-star-half-line"></i>';
    for (let i = full + (half ? 1 : 0); i < 5; i++) html += '<i class="ri-star-line"></i>';
    return `<span class="rate" aria-label="별점 ${x}점">${html}</span>`;
  };

  let page = 1, done = false, key = '';

  function card(d) {
    const id = d.id || d._id;
    const img = d.mainThumbnailUrl || d.coverImageUrl || PH;
    const name = d.nickname || d.name || '모델';
    const sub = d.headline || d.oneLiner || '';
    const region = d.region?.city ? `${d.region.city}${d.region.area ? (' · ' + d.region.area) : ''}` : '';
    const rating = d.ratingAvg ?? d.rating ?? 0;
    const tags = Array.isArray(d.tags) ? d.tags.slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('') : '';

    return `
      <article class="mdl-card" data-id="${id}">
        <div class="thumb" style="background-image:url('${img}')"></div>
        <div class="body">
          <div class="row">
            <strong class="name">${name}</strong>
            ${rating ? star(rating) : ''}
          </div>
          <div class="headline">${sub}</div>
          <div class="meta">${region}${d.careerYears ? ` · 경력 ${d.careerYears}y` : ''}</div>
          <div class="tags">${tags}</div>
        </div>
        <div class="ft">
          <a class="btn ghost" href="model.html?id=${encodeURIComponent(id)}"><i class="ri-user-line"></i> 프로필</a>
          <a class="btn" href="model-new.html?id=${encodeURIComponent(id)}"><i class="ri-edit-2-line"></i> 수정</a>
        </div>
      </article>`;
  }

  async function load(append = true) {
    if (done) return;
    $('#mdlMore')?.setAttribute('disabled', 'disabled');
    $('#mdlMore')?.classList.add('loading');
    try {
      const base = EP_LIST.split('?')[0]; // 안전하게 쿼리 제거
      const q = new URLSearchParams({ page, key, status: 'published', limit: 24 });
      const r = await fetch(`${API}${base}?${q.toString()}`);
      const j = await r.json().catch(() => ({}));
      const items = j.items || j.data || j.docs || [];
      if (items.length < 1) {
        done = true;
        $('#mdlMoreWrap') && ($('#mdlMoreWrap').style.display = 'none');
      }
      const html = items.map(card).join('');
      if (append) $('#mdlGrid').insertAdjacentHTML('beforeend', html);
      const current = $('#mdlGrid')?.children.length || 0;
      const total = Number(j.total || j.count || current);
      $('#mdlCount').textContent = `모델 ${total}명`;
      page += 1;
    } catch (e) {
      console.warn('[models load]', e);
      if (window.UI && UI.toast) UI.toast('목록을 불러오지 못했습니다');
    } finally {
      $('#mdlMore')?.removeAttribute('disabled');
      $('#mdlMore')?.classList.remove('loading');
    }
  }

  // filters
  $('#mdlFilters')?.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('#mdlFilters .chip').forEach(x => x.classList.toggle('on', x === b));
    key = b.dataset.k || '';
    page = 1; done = false;
    $('#mdlGrid').innerHTML = '';
    $('#mdlMoreWrap').style.display = '';
    load(true);
  });

  $('#mdlMore')?.addEventListener('click', () => load(true));

  // init
  load(true);
})();