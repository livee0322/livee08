// models.js — v1.2.0
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');

  // 최신(단수) 우선, 구키 호환
  const EP_LIST = (CFG.endpoints && (CFG.endpoints.model || CFG.endpoints.models)) || '/model-test?status=published&limit=24';
  const EP_BASE = (CFG.endpoints && (CFG.endpoints.modelBase || CFG.endpoints.model || CFG.endpoints.models)) || '/model-test';

  const PH = CFG.placeholderThumb || 'default.jpg';

  const $ = (s, el = document) => el.querySelector(s);

  let page = 1;
  let done = false;

  function cardTemplate(d) {
    const id = d.id || d._id || '';
    const img = d.mainThumbnailUrl || d.coverImageUrl || PH;
    const name = (d.nickname || d.name || '').trim() || '이름 미정';
    const sub  = (d.headline || d.oneLiner || d.summary || '').trim();

    return `
      <a class="mdl-card" role="listitem" href="model.html?id=${encodeURIComponent(id)}" aria-label="${name}">
        <div class="thumb" style="background-image:url('${img}')"></div>
        <div class="body">
          <strong class="name">${escapeHtml(name)}</strong>
          <div class="headline">${escapeHtml(sub)}</div>
        </div>
      </a>
    `;
  }

  // 간단 이스케이프
  function escapeHtml(s=''){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function load(append = true) {
    if (done) return;
    const moreBtn = $('#mdlMore');
    moreBtn?.setAttribute('disabled','disabled');
    moreBtn?.classList.add('loading');
    try {
      const base = EP_LIST.split('?')[0]; // 안전
      const q = new URLSearchParams({ page, limit: 24, status: 'published' });
      const res = await fetch(`${API}${base}?${q.toString()}`);
      const j = await res.json().catch(() => ({}));
      const items = j.items || j.data || j.docs || [];
      if (!items.length) {
        done = true;
        $('#mdlMoreWrap')?.style && ($('#mdlMoreWrap').style.display = 'none');
        return;
      }
      const html = items.map(cardTemplate).join('');
      if (append) $('#mdlGrid').insertAdjacentHTML('beforeend', html);
      const total = Number(j.total || j.count || $('#mdlGrid').children.length);
      $('#mdlCount').textContent = `모델 ${total.toLocaleString('ko-KR')}명`;
      page += 1;
    } catch (err) {
      console.warn('[models list]', err);
      try { UI.toast?.('목록을 불러오지 못했습니다'); } catch {}
    } finally {
      moreBtn?.removeAttribute('disabled');
      moreBtn?.classList.remove('loading');
    }
  }

  // FAB → 등록 페이지
  $('#fabNew')?.addEventListener('click', () => {
    location.href = 'model-new.html';
  });

  // 더 보기
  $('#mdlMore')?.addEventListener('click', () => load(true));

  // 초기 로드
  load(true);
})();