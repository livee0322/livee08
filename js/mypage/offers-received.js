/* js/mypage/offers-received.js — v1.0.0 */
(function(){
  const CFG = window.LIVEE_CONFIG||{};
  const EP  = CFG.endpoints||{};
  const API_BASE = (()=>{ const raw=(CFG.API_BASE||'/api/v1').toString().trim()||'/api/v1';
    const base=raw.replace(/\/+$/,''); return /^https?:\/\//i.test(base)?base:(location.origin+(base.startsWith('/')?'':'/')+base); })();
  const OFFERS_BASE=(EP.offersBase||'/offers-test').replace(/^\/*/,'/');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const box = document.getElementById('offersReceived'); // <div id="offersReceived"></div>
  if(!box) return;

  async function load(){
    if(!TOKEN){ box.innerHTML='<p>로그인이 필요합니다.</p>'; return; }
    box.innerHTML = '<p>불러오는 중…</p>';
    try{
      const r=await fetch(`${API_BASE}${OFFERS_BASE}?box=received&limit=50`,{
        headers:{Accept:'application/json', Authorization:`Bearer ${TOKEN}`}
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
      const items=j.items||[];
      if(!items.length){ box.innerHTML='<p>받은 제안이 없습니다.</p>'; return; }
      box.innerHTML = items.map(it=>{
        const pf = it.toPortfolioId || {};
        const th = pf.mainThumbnailUrl || (pf.subThumbnails||[])[0] || '';
        const rec= it.recruitId ? `<div class="small muted">연결된 공고: ${it.recruitId?.title||''}</div>` : '';
        return `
          <article class="offer">
            ${th?`<img class="th" src="${th}" alt="">`:''}
            <div class="body">
              <div class="row">
                <strong>새 제안</strong>
                <small class="muted">${new Date(it.createdAt).toLocaleString()}</small>
              </div>
              <p>${(it.message||'').replace(/</g,'&lt;')}</p>
              ${rec}
            </div>
          </article>`;
      }).join('');
    }catch(e){ box.innerHTML = `<p>로드 실패: ${(e.message||'오류')}</p>`; }
  }
  document.addEventListener('DOMContentLoaded', load);
})();