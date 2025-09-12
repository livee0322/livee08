/* home/apply-modal.js — Apply (지원) modal + bind */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { API_BASE, EP, util, fetchers, FALLBACK_IMG } = H;
  const { $, on, appendStyleOnce, text, pickThumb, authHeaders } = util;
  const { fetchMyPortfolios, getMe, isHost } = fetchers;

  function ensureApplyCSS(){
    appendStyleOnce('apply-css', `
      .amodal{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.38)}
      .amodal .sheet{width:100%;max-width:520px;background:#fff;border-radius:16px 16px 0 0;padding:14px;box-shadow:0 -12px 36px rgba(15,23,42,.18)}
      .amodal header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .amodal header strong{font-weight:900;font-size:16px}
      .amodal header button{margin-left:auto;border:1px solid #e5e7eb;background:#fff;border-radius:10px;width:36px;height:36px}
      .amodal .warn{border:1px solid #e7e5ff;background:#f6f5ff;color:#4338ca;border-radius:12px;padding:10px 12px;margin:6px 0 10px;font-size:13px;line-height:1.4}
      .amodal .field{margin:10px 0}
      .amodal label{display:block;font-weight:800;margin:0 0 6px}
      .amodal .plist{display:grid;gap:8px;max-height:220px;overflow:auto}
      .amodal .prow{display:grid;grid-template-columns:40px 1fr;gap:10px;align-items:center;border:1px solid #e5e7eb;border-radius:12px;padding:8px}
      .amodal .prow img{width:40px;height:40px;border-radius:10px;object-fit:cover;background:#eee}
      .amodal textarea{width:100%;min-height:120px;border:1px solid #e5e7eb;border-radius:12px;padding:10px;resize:vertical}
      .amodal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
      .amodal .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;font-weight:800}
      .amodal .btn.pri{background:#4f46e5;border-color:#4f46e5;color:#fff}
    `);
  }

  function openApplyModal(recruitId) {
    ensureApplyCSS();
    const wrap = document.createElement('div');
    wrap.className = 'amodal';
    wrap.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="지원하기">
        <header><strong>지원하기</strong><button type="button" class="x">✕</button></header>
        <div class="warn">연락처·이메일 직접 기재는 금지됩니다. 모든 커뮤니케이션은 라이비 내에서 진행해주세요.</div>
        <div class="field">
          <label>내 포트폴리오 선택</label>
          <div class="plist" id="amList"><div style="color:#64748b">불러오는 중…</div></div>
        </div>
        <div class="field">
          <label>메시지 (선택)</label>
          <textarea id="amMsg" placeholder="간단한 소개와 지원 이유를 남겨주세요. 연락처/이메일은 적지 마세요."></textarea>
        </div>
        <div class="actions">
          <button type="button" class="btn cancel">취소</button>
          <button type="button" class="btn pri submit">지원 보내기</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    on(wrap.querySelector('.x'), 'click', close);
    on(wrap.querySelector('.cancel'), 'click', close);
    on(wrap, 'click', e => { if (e.target === wrap) close(); });

    (async () => {
      if (!H.TOKEN) { alert('로그인 후 이용 가능합니다.'); location.href = 'login.html?returnTo=' + encodeURIComponent(location.pathname + location.search); close(); return; }
      let items = [];
      try { items = await fetchMyPortfolios(); }
      catch (e) {
        console.warn('[my portfolios]', e);
        $('#amList', wrap).innerHTML = '<div style="color:#ef4444;font-weight:700">불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
        wrap.querySelector('.submit').disabled = true; return;
      }
      if (items.length) {
        $('#amList', wrap).innerHTML = items.map((p, i) => `
          <label class="prow">
            <input type="radio" name="amP" value="${p.id || p._id}" ${i === 0 ? 'checked' : ''}>
            <div style="display:flex;align-items:center;gap:10px">
              <img src="${pickThumb(p) || FALLBACK_IMG}" alt="">
              <div>
                <div style="font-weight:800">${text(p.nickname || p.displayName || '쇼호스트')}</div>
                <div style="color:#64748b;font-size:12.5px">${text(p.headline || '')}</div>
              </div>
            </div>
          </label>`).join('');
      } else {
        const me = await getMe();
        if (!isHost(me)) {
          $('#amList', wrap).innerHTML = '<div style="color:#ef4444;font-weight:800">이 기능은 쇼호스트 전용입니다.</div>';
          wrap.querySelector('.submit').disabled = true;
        } else {
          $('#amList', wrap).innerHTML = '<div>작성된 포트폴리오가 없습니다. <a href="portfolio-new.html" style="color:#4f46e5;font-weight:800">포트폴리오 만들기 →</a></div>';
          wrap.querySelector('.submit').disabled = true;
        }
      }
    })();

    on(wrap.querySelector('.submit'), 'click', async () => {
      const pid = wrap.querySelector('input[name="amP"]:checked')?.value;
      if (!pid) { alert('포트폴리오를 선택해주세요.'); return; }
      const msg = $('#amMsg', wrap)?.value?.trim() || '';
      const payload = { recruitId, portfolioId: pid, message: msg };
      try {
        const res = await fetch(API_BASE + (EP.APPLY.startsWith('/') ? EP.APPLY : '/' + EP.APPLY), {
          method: 'POST', headers: util.authHeaders(true), body: JSON.stringify(payload)
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.ok === false) throw new Error(j.message || ('HTTP_' + res.status));
        alert('지원이 접수되었어요. 브랜드가 확인하면 알림으로 알려드릴게요.');
        close();
      } catch (e) {
        console.warn('[apply]', e);
        alert('지원에 실패했습니다: ' + (e.message || '알 수 없는 오류'));
      }
    });
  }

  function bindApply(root) {
    on(root, 'click', (e) => {
      const btn = e.target.closest('.mini-apply'); if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.id || btn.closest('.card-mini')?.dataset.id;
      if (id) openApplyModal(id);
    });
  }

  H.apply = { openApplyModal, bindApply };
})(window);