/* home/hotclips.js — HOT clips modal + styles */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util } = H;
  const { $, on, appendStyleOnce } = util;

  function ensureClipModal(){
    appendStyleOnce('hotclip-css', `
      .shorts-hscroll{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 0;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
      .shorts-hscroll::-webkit-scrollbar{display:none}
      .clip-card{position:relative;flex:0 0 calc(50% - 6px);scroll-snap-align:center;border-radius:14px;overflow:hidden;background:#000;aspect-ratio:9/16}
      .clip-thumb{width:100%;height:100%;object-fit:cover;background:#000}
      .clip-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.45);color:#fff}
      .clip-empty{min-height:120px;display:grid;place-items:center;color:#98a2b3;border:1px dashed #e5e7eb;border-radius:12px}
      .section-head .hl-hot{color:#ef4444}

      .clip-modal{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6)}
      .clip-modal.show{display:flex}
      .clip-modal .inner{position:relative;width:min(520px,92vw);background:#000;border-radius:14px;overflow:hidden}
      .clip-modal iframe{width:100%;aspect-ratio:9/16;display:block;background:#000;border:0}
      .clip-modal .x{position:absolute;right:8px;top:8px;width:36px;height:36px;border:0;border-radius:10px;background:rgba(0,0,0,.5);color:#fff}
    `);
    if ($('#clipModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'clipModal'; wrap.className = 'clip-modal';
    wrap.innerHTML = `<div class="inner">
      <button class="x" aria-label="닫기"><i class="ri-close-line"></i></button>
      <iframe id="clipFrame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => { $('#clipFrame').src = 'about:blank'; wrap.classList.remove('show'); document.documentElement.style.overflow = ''; };
    on($('.x', wrap), 'click', close);
    on(wrap, 'click', e => { if (e.target === wrap) close(); });
    window.__openClip = (src) => { if (!src) return; $('#clipFrame').src = src; wrap.classList.add('show'); document.documentElement.style.overflow = 'hidden'; };
  }

  function bindHotShorts(){
    const root = $('#hotShorts'); if (!root) return;
    ensureClipModal();
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.clip-card'); if (!card) return;
      const src = card.dataset.embed; if (src) window.__openClip(src);
    }, { passive: true });
  }

  H.hotclips = { ensureClipModal, bindHotShorts };
})(window);