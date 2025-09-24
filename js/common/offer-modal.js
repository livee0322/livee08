/* js/common/offer-modal.js — v2.0.0 (실사용 필드 전송) */
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = (CFG.endpoints||{});
  const API_BASE = (() => {
    const raw = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
    const base = raw.replace(/\/+$/, '');
    return /^https?:\/\//i.test(base) ? base : (location.origin + (base.startsWith('/') ? '' : '/') + base);
  })();
  const OFFERS_BASE = (EP.offersBase || '/offers-test').replace(/^\/*/, '/');
  const PORTF_BASE  = (EP.portfolioBase || '/portfolio-test').replace(/^\/*/, '/');

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // ── UI 만들기
  function ensureModal(){
    if (document.getElementById('offerModal')) return;
    const el = document.createElement('div');
    el.id = 'offerModal';
    el.className = 'lv-modal';
    el.innerHTML = `
      <div class="lv-sheet">
        <header class="lv-sheet__hd">
          <strong>제안 보내기</strong>
          <button type="button" class="lv-x" data-x>✕</button>
        </header>
        <div class="lv-sheet__bd">
          <div class="lv-target" id="offerTarget"></div>

          <div class="grid2">
            <div>
              <label class="lv-lb">브랜드명</label>
              <input id="ofBrand" class="lv-in" placeholder="예) 라이비">
            </div>
            <div>
              <label class="lv-lb">출연료</label>
              <div class="hstack">
                <input id="ofFee" class="lv-in" inputmode="numeric" placeholder="예) 300000">
                <label class="chk"><input type="checkbox" id="ofNego"> 협의</label>
              </div>
            </div>
          </div>

          <div class="grid2">
            <div>
              <label class="lv-lb">촬영일</label>
              <input id="ofDate" class="lv-in" type="date">
            </div>
            <div>
              <label class="lv-lb">촬영 시간</label>
              <input id="ofTime" class="lv-in" type="text" placeholder="예) 14:00~16:00">
            </div>
          </div>

          <label class="lv-lb">장소</label>
          <input id="ofLoc" class="lv-in" placeholder="예) 서울 강남구 …">

          <label class="lv-lb">답장 기한</label>
          <input id="ofDue" class="lv-in" type="date">

          <label class="lv-lb">내용 (선택)</label>
          <textarea id="offerMsg" class="lv-ta" placeholder="간단한 제안 내용을 작성하세요 (최대 800자)"></textarea>
          <small class="lv-help">* 제안은 상대방의 ‘마이페이지 &gt; 받은 제안’에 표시됩니다.</small>
        </div>
        <footer class="lv-sheet__ft">
          <button class="btn" data-x>취소</button>
          <button id="offerSend" class="btn pri">보내기</button>
        </footer>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e)=>{ if(e.target===el || e.target.hasAttribute('data-x')) el.classList.remove('show'); });
  }

  function openOfferModal({ portfolioId, recruitId }){
    ensureModal();
    const modal = document.getElementById('offerModal');
    const tg    = document.getElementById('offerTarget');
    const $id   = (s)=>document.getElementById(s);
    const ofBrand = $id('ofBrand'), ofFee=$id('ofFee'), ofNego=$id('ofNego'),
          ofDate=$id('ofDate'), ofTime=$id('ofTime'), ofLoc=$id('ofLoc'), ofDue=$id('ofDue'),
          msg=$id('offerMsg'), send=$id('offerSend');

    // 대상 요약
    tg.innerHTML = '대상 정보를 불러오는 중…';
    fetch(`${API_BASE}${PORTF_BASE}/${encodeURIComponent(portfolioId)}`, { headers:{Accept:'application/json'} })
      .then(r=>r.json().catch(()=>({}))).then(j=>{
        const d = j.data || j || {};
        const thumb = d.mainThumbnailUrl || (d.subThumbnails||[])[0] || '';
        tg.innerHTML = `
          <div class="lv-target__in">
            ${thumb ? `<img src="${thumb}" alt="" class="lv-target__thumb">` : ''}
            <div class="lv-target__text">
              <div class="lv-target__name">${d.nickname||'(알 수 없음)'}</div>
              <div class="lv-target__meta">포트폴리오 ID: ${portfolioId}${recruitId?` · 공고연결`:' '}</div>
            </div>
          </div>`;
      }).catch(()=>{ tg.textContent='포트폴리오 정보를 불러오지 못했습니다.'; });

    // 전송
    send.onclick = async ()=>{
      if(!TOKEN){ alert('로그인이 필요합니다.'); location.href = (CFG.BASE_PATH||'') + '/login.html'; return; }
      send.disabled = true;
      try{
        const payload = {
          toPortfolioId: portfolioId,
          recruitId: recruitId || undefined,
          brandName: ofBrand.value.trim() || undefined,
          feeNegotiable: !!ofNego.checked,
          fee: ofNego.checked ? undefined : ofFee.value.trim(),
          message: msg.value.trim(),
          shootDate: ofDate.value ? new Date(ofDate.value).toISOString() : undefined,
          shootTime: ofTime.value.trim() || undefined,
          location:  ofLoc.value.trim()  || undefined,
          replyDeadline: ofDue.value ? new Date(ofDue.value).toISOString() : undefined
        };

        const r = await fetch(`${API_BASE}${OFFERS_BASE}`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Accept:'application/json', Authorization: `Bearer ${TOKEN}` },
          body: JSON.stringify(payload)
        });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false){ throw new Error(j.message || `HTTP_${r.status}`); }
        alert('제안이 전송되었습니다.');
        modal.classList.remove('show');
        [ofBrand, ofFee, ofDate, ofTime, ofLoc, ofDue, msg].forEach(i=>i.value=''); ofNego.checked=false;
      }catch(e){ alert('전송 실패: '+(e.message||'오류')); }
      finally{ send.disabled=false; }
    };

    modal.classList.add('show');
    ofBrand.focus();
  }

  // 트리거: data-offer
  document.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-offer]');
    if(!b) return;
    e.preventDefault();
    const portfolioId = b.getAttribute('data-portfolio-id') || b.dataset.portfolioId;
    const recruitId   = b.getAttribute('data-recruit-id')   || b.dataset.recruitId || '';
    if(!portfolioId){ alert('포트폴리오 ID가 없습니다.'); return; }
    openOfferModal({ portfolioId, recruitId });
  });

  // 미니 스타일
  const css = `
  .lv-modal{position:fixed;inset:0;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.45);z-index:1000}
  .lv-modal.show{display:flex}
  .lv-sheet{width:min(560px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:14px 14px 0 0;padding:14px}
  .lv-sheet__hd{display:flex;align-items:center;gap:8px}
  .lv-x{margin-left:auto;border:1px solid #e5e7eb;border-radius:10px;width:36px;height:36px;background:#fff}
  .lv-lb{display:block;margin:10px 0 6px;font-weight:800}
  .lv-in{width:100%;height:42px;border:1px solid #e5e7eb;border-radius:12px;padding:0 12px}
  .lv-ta{width:100%;min-height:120px;border:1px solid #e5e7eb;border-radius:12px;padding:10px}
  .lv-sheet__ft{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
  .btn{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 16px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;font-weight:800}
  .btn.pri{background:#5449ff;color:#fff;border-color:transparent}
  .lv-help{color:#6b7280}
  .lv-target__in{display:flex;align-items:center;gap:10px;margin:6px 0 12px}
  .lv-target__thumb{width:56px;height:56px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb}
  .lv-target__name{font-weight:900}
  .lv-target__meta{font-size:12px;color:#6b7280}
  .hstack{display:flex;gap:8px;align-items:center}
  .chk{display:flex;align-items:center;gap:6px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media (max-width:520px){ .grid2{grid-template-columns:1fr} }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();