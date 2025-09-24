/* inbox-proposals.js — v1.1
   - CONFIG.endpoints.offersBase 사용
   - 토큰 자동 부착
   - 다양한 쿼리 키(inbox=1 | to=me | toUser=me | mine=received) 순차 시도
   - 응답 형태(items | data | 배열) 모두 호환
*/
(function () {
  'use strict';
  const CFG = window.LIVEE_CONFIG || {};
  const EP  = CFG.endpoints || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/+$/, '');
  const BASE = (EP.offersBase || '/offers-test').replace(/^\/*/, '/');

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const $ = (s, el=document)=> el.querySelector(s);
  const root = $('#offersRoot') || $('#inboxRoot') || $('#proposalsRoot') || $('#content') || document.body;

  function say(msg, ok){
    const id='offersMsg';
    let n = document.getElementById(id);
    if(!n){ n = document.createElement('div'); n.id=id; n.style.margin='12px 0'; root.prepend(n); }
    n.textContent = msg;
    n.style.color = ok ? '#0a7' : '#d33';
  }

  function money(n){ return (n||0).toLocaleString(); }
  function fmtDate(d){ try{ return new Date(d).toLocaleString(); }catch{ return String(d||'').slice(0,16); } }

  // 다양한 응답 포맷을 items 배열로 정규화
  function pickItems(j){
    if (!j) return [];
    if (Array.isArray(j)) return j;
    if (Array.isArray(j.items)) return j.items;
    if (Array.isArray(j.data))  return j.data;
    if (j.data && Array.isArray(j.data.items)) return j.data.items;
    return [];
  }

  async function getJSON(url){
    const h = { 'Accept':'application/json' };
    if (TOKEN) h['Authorization'] = 'Bearer ' + TOKEN;
    const r = await fetch(url, { headers:h, credentials:'include' });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    if (!ct.includes('application/json')) throw new Error('NOT_JSON');
    return await r.json().catch(()=>{ throw new Error('BAD_JSON'); });
  }

  // 서버 구현이 어떤 쿼리를 쓰든 순차적으로 시도
  async function loadInbox(limit=50){
    const tries = [
      `${API_BASE}${BASE}?inbox=1&limit=${limit}`,
      `${API_BASE}${BASE}?to=me&limit=${limit}`,
      `${API_BASE}${BASE}?toUser=me&limit=${limit}`,
      `${API_BASE}${BASE}?mine=received&limit=${limit}`,
      `${API_BASE}${BASE}?limit=${limit}` // 최후의 수단(서버가 자동 필터링하는 경우)
    ];
    let lastErr = null;
    for (const u of tries){
      try{
        const j = await getJSON(u);
        const items = pickItems(j);
        if (items.length || u.includes('inbox=') || u.includes('to=') || u.includes('mine=')) {
          return { items, used:u };
        }
      }catch(e){ lastErr = e; /* 다음 시도 */ }
    }
    throw lastErr || new Error('NO_RESULT');
  }

  function card(o){
    // 서버 필드 다양성 호환
    const id      = o.id || o._id || '';
    const msg     = o.message || o.memo || o.note || '(메시지 없음)';
    const created = o.createdAt || o.created_at || o.date || null;
    const status  = (o.status || 'pending');
    const brand   = o.fromBrandName || o.brandName || o.brand?.name || o.createdByName || '브랜드';
    const fee     = (o.fee != null) ? `${money(o.fee)}원` : (o.feeNegotiable ? '협의' : '');
    const pid     = o.toPortfolioId || o.portfolioId || o.toPortfolio?._id || '';
    const rid     = o.recruitId || o.toRecruitId || '';

    const actions = [
      pid ? `<a class="btn sm" href="portfolio-detail.html?id=${encodeURIComponent(pid)}"><i class="ri-user-line"></i> 포트폴리오</a>` : '',
      rid ? `<a class="btn sm" href="recruit-detail.html?id=${encodeURIComponent(rid)}"><i class="ri-file-list-2-line"></i> 공고</a>` : ''
    ].filter(Boolean).join(' ');

    return `
      <article class="offer-card" data-id="${id}">
        <div class="offer-hd">
          <strong class="brand">${brand}</strong>
          <span class="status ${status}">${status}</span>
        </div>
        <div class="offer-msg">${msg.replace(/\n/g,'<br>')}</div>
        <div class="offer-meta">
          <span>${created ? fmtDate(created) : ''}</span>
          ${fee ? `<span class="dot"></span><span>${fee}</span>` : ''}
        </div>
        <div class="offer-actions">${actions}</div>
      </article>
    `;
  }

  function render(items){
    if (!items.length){
      root.innerHTML = `
        <div class="empty" style="padding:24px 12px;color:#666">
          받은 제안이 없습니다.
        </div>`;
      return;
    }
    const css = `
      .offer-card{border:1px solid #eee;border-radius:12px;padding:14px;margin:10px 0;background:#fff}
      .offer-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}
      .offer-hd .brand{font-weight:600}
      .offer-hd .status{margin-left:auto;font-size:12px;padding:2px 8px;border-radius:999px;background:#eef}
      .offer-hd .status.pending{background:#eef;color:#335}
      .offer-hd .status.accepted{background:#e6ffec;color:#155724}
      .offer-hd .status.rejected{background:#ffeaea;color:#9b1c1c}
      .offer-msg{margin:6px 0 10px;line-height:1.5;white-space:pre-wrap}
      .offer-meta{font-size:12px;color:#666;display:flex;align-items:center;gap:8px}
      .offer-meta .dot{width:4px;height:4px;border-radius:50%;background:#bbb;display:inline-block}
      .offer-actions{margin-top:10px;display:flex;gap:8px}
      .btn.sm{font-size:12px;padding:6px 10px;border:1px solid #ddd;border-radius:8px;background:#fafafa}
    `;
    const styleId='offers-inline-style';
    if(!document.getElementById(styleId)){
      const st=document.createElement('style'); st.id=styleId; st.textContent=css; document.head.appendChild(st);
    }
    root.innerHTML = items.map(card).join('');
  }

  async function boot(){
    try{
      say('불러오는 중…');
      const { items, used } = await loadInbox(50);
      say('로드 완료', true);
      render(items);
      // 디버그 확인 원하면 콘솔에서 확인
      console.debug('[offers] used endpoint:', used, items);
    }catch(e){
      console.error('[offers] load failed:', e);
      if (!TOKEN) {
        say('로그인이 필요합니다. 마이페이지에서 로그인해 주세요.');
      } else {
        say('제안 목록을 불러오지 못했습니다.');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else { boot(); }
})();