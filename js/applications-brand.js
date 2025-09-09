/* Applications (Brand) — v1.1.0 (mine 필터+MSG fix+safe count) */
(function () {
  'use strict';

  // -------- helpers --------
  const $ = (s, el = document) => el.querySelector(s);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const html = String.raw;

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  const asset = (name) => (CFG.BASE_PATH ? (CFG.BASE_PATH + '/' + name) : name);
  const FALLBACK_IMG = CFG.placeholderThumb || asset('default.jpg');

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (iso) => {
    if (!iso) return '미정';
    const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0,10);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  const money = (v) => (v == null ? '' : Number(v).toLocaleString('ko-KR'));
  const text  = (v) => (v == null ? '' : String(v).trim());
  const coalesce = (...a) => a.find(v => v !== undefined && v !== null && v !== '');
  const sameId = (a,b)=> a && b && String(a)===String(b);

  const HJSON = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  async function getJSON(url, headers){ const r=await fetch(url,{headers:headers||HJSON(false)}); let j=null; try{ j=await r.json(); }catch{} if(!r.ok||(j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{}; }
  async function postJSON(url, body){ const r=await fetch(url,{method:'POST',headers:HJSON(true),body:JSON.stringify(body)}); let j=null; try{ j=await r.json(); }catch{} if(!r.ok||(j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{}; }
  async function patchJSON(url, body){ const r=await fetch(url,{method:'PATCH',headers:HJSON(true),body:JSON.stringify(body)}); let j=null; try{ j=await r.json(); }catch{} if(!r.ok||(j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{}; }

  const parseItems = (j)=> Array.isArray(j) ? j : (j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || []);

  // -------- auth guard --------
  function guard() {
    if (!TOKEN) {
      alert('로그인 후 이용해주세요.');
      location.href = 'login.html?returnTo=' + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  // -------- me --------
  async function getMe(){
    if(!TOKEN) return null;
    const eps = ['/auth/me','/users/me','/me'];
    for(const ep of eps){
      try{
        const j = await getJSON(API_BASE + ep);
        return j.data || j.user || j;
      }catch(_){}
    }
    try{ return JSON.parse(localStorage.getItem('livee_user')||'null'); }catch{ return null; }
  }

  // -------- fetchers --------
  async function fetchMyRecruits() {
    // 1) mine=1
    try{
      const j = await getJSON(API_BASE + '/recruit-test?mine=1&limit=50');
      const it = parseItems(j);
      if (Array.isArray(it) && it.length) return it;
    }catch(_){}

    // 2) fallback: 전체 → 내 것만 필터
    try{
      const me = await getMe();
      const meId = me && (me.id || me._id || me.userId);
      const j = await getJSON(API_BASE + '/recruit-test?limit=50');
      const all = parseItems(j);
      if (!meId) return all;
      return all.filter(r =>
        sameId(r.createdBy, meId) ||
        sameId(r.ownerId,   meId) ||
        sameId(r.userId,    meId) ||
        sameId(r.brand && r.brand.ownerId, meId)
      );
    }catch(_){ return []; }
  }

  async function fetchApplications(recruitId) {
    try{
      const j = await getJSON(API_BASE + '/applications-test?recruitId=' + encodeURIComponent(recruitId) + '&limit=100');
      return parseItems(j);
    }catch(e){
      console.warn('[apps:list]', recruitId, e);
      return [];
    }
  }

  async function fetchAppCount(recruitId){
    try{
      const j = await getJSON(API_BASE + '/applications-test/count?recruitId=' + encodeURIComponent(recruitId));
      return (j.data && j.data.total) || 0;
    }catch(_){
      return 0;
    }
  }

  // -------- templates --------
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee) + '원') : '출연료 미정'));

  function applicantCard(a){
    const p = a.portfolio || a.applicant || {};
    const thumb = p.mainThumbnailUrl || p.thumbnailUrl || (Array.isArray(p.subThumbnails) && p.subThumbnails[0]) || FALLBACK_IMG;
    const name = text(p.nickname || p.displayName || '쇼호스트');
    const head = text(p.headline || a.message || '');
    const badge = (st)=>{
      if(st==='accepted') return '<span class="badge ok"><i class="ri-check-line"></i> 선정</span>';
      if(st==='on_hold') return '<span class="badge hold"><i class="ri-time-line"></i> 보류</span>';
      if(st==='rejected') return '<span class="badge no"><i class="ri-close-line"></i> 거절</span>';
      return '<span class="badge wait"><i class="ri-inbox-line"></i> 검토중</span>';
    };
    return html`
      <article class="app-card" data-app="${a.id||a._id}" data-portfolio="${p.id||p._id||''}">
        <img class="app-ava" src="${thumb}" alt="">
        <div class="app-info">
          <div class="app-name">${name} ${badge(a.status)}</div>
          <div class="app-head">${head || '자기소개가 없습니다'}</div>
        </div>
        <div class="app-actions">
          <a class="btn-chip" href="portfolio-detail.html?id=${encodeURIComponent(p.id||p._id||'')}"><i class="ri-user-line"></i> 프로필</a>
          <button class="btn-chip" data-act="msg"><i class="ri-chat-1-line"></i> 메시지</button>
          <button class="btn-chip" data-act="hold"><i class="ri-time-line"></i> 보류</button>
          <button class="btn-chip" data-act="reject"><i class="ri-close-line"></i> 거절</button>
          <button class="btn-chip pri" data-act="accept"><i class="ri-thumb-up-line"></i> 선정</button>
        </div>
      </article>
    `;
  }

  function recruitBlock(r, apps, count){
    const thumb = r.mainThumbnailUrl || r.thumbnailUrl || FALLBACK_IMG;
    const title = text(coalesce(r.title, r.recruit && r.recruit.title, '제목 없음'));
    const brand = text(coalesce(r.brandName, r.brand && r.brand.name, '브랜드'));
    const fee = feeText(coalesce(r.fee, r.pay), r.feeNegotiable || r.payNegotiable);
    const list = (apps && apps.length)
      ? apps.map(applicantCard).join('')
      : `<div class="app-empty">아직 지원자가 없습니다.</div>`;
    return html`
      <section class="rec-card" data-rec="${r.id||r._id}">
        <div class="rec-head">
          <img class="rec-thumb" src="${thumb}" alt="">
          <div class="rec-titles">
            <div class="rec-brand">${brand}</div>
            <div class="rec-title">${title}</div>
            <div class="rec-meta">마감 ${fmtDate(r.closeAt)} · ${fee}</div>
          </div>
          <div class="rec-count"><i class="ri-team-line"></i> ${Number.isFinite(count)?count:(apps?.length||0)}명</div>
        </div>
        <hr class="sep">
        <div class="app-list">${list}</div>
      </section>
    `;
  }

  // -------- Offer Modal + Payment Sheet --------
  function openOfferModal(app, recruit){
    const wrap = document.createElement('div');
    wrap.className='omodal';
    const baseFee = Number(coalesce(app.fee, recruit?.fee, recruit?.pay)) || '';
    const liveISO = (recruit?.liveAt || '').slice(0,16);
    wrap.innerHTML = html`
      <div class="sheet" role="dialog" aria-modal="true" aria-label="오퍼 생성">
        <header><strong>오퍼 생성 (선정)</strong><button class="x" type="button">✕</button></header>
        <div class="warn">라이비 외 채널(개인 메신저·이메일 등)로 계약/결제를 진행할 경우 <b>대금 미지급 등 불리한 문제</b>가 발생할 수 있습니다. 모든 커뮤니케이션은 라이비 내에서 진행해주세요.</div>

        <label>출연료(원)</label>
        <input id="ofee" type="number" min="10000" step="1000" placeholder="예: 500000" value="${baseFee}">

        <div class="row">
          <div>
            <label>방송 일정</label>
            <input id="olive" type="datetime-local" value="${liveISO}">
          </div>
          <div>
            <label>리허설(선택)</label>
            <input id="oreh" type="datetime-local">
          </div>
        </div>

        <label>비고(내부 메모)</label>
        <textarea id="onote" placeholder="필요 시 내부용 메모를 남겨주세요."></textarea>

        <div class="sum">
          <div><b>결제 예상 금액</b> = 출연료 + 옵션(0) <span class="muted">(플랫폼 수수료/VAT는 정책에 따라 별도 적용될 수 있습니다)</span></div>
          <div id="oSum" style="margin-top:6px;font-weight:900">${baseFee?money(baseFee):'-'} 원</div>
        </div>

        <div class="actions">
          <button class="btn cancel" type="button">취소</button>
          <button class="btn pri go" type="button">오퍼 생성 & 결제 안내</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const close = ()=> wrap.remove();
    on($('.x',wrap),'click',close);
    on($('.cancel',wrap),'click',close);
    on($('#ofee',wrap),'input',()=>{$('#oSum',wrap).textContent = (Number($('#ofee',wrap).value)||0).toLocaleString('ko-KR')+' 원';});

    on($('.go',wrap),'click', async ()=>{
      const fee = Number($('#ofee',wrap).value||0);
      if (!fee || fee<10000){ alert('출연료를 입력해주세요(최소 10,000원).'); return; }
      const payload = {
        applicationId: app.id || app._id,
        finalFee: fee,
        schedule: { liveAt: $('#olive',wrap).value || null, rehearsalAt: $('#oreh',wrap).value || null },
        note: $('#onote',wrap).value || '',
        acceptTerms: true
      };

      let offer = null;
      try{
        // 1) application 상태 변경(accepted)
        try{ await patchJSON(API_BASE + '/applications-test/' + (app.id||app._id), { status:'accepted' }); }catch(_){}
        // 2) 오퍼 생성(서버 준비 전이면 실패해도 UX 진행)
        offer = await postJSON(API_BASE + '/offers-test', payload);
      }catch(e){
        console.warn('[offer create]', e);
      }

      openPaymentSheet(offer, fee, app, recruit);
      close();
    });
  }

  function openPaymentSheet(offer, fee, app, recruit){
    const wrap = document.createElement('div');
    wrap.className='psheet';

    const due = new Date(Date.now()+24*60*60*1000);
    const dueStr = `${fmtDate(due.toISOString())} ${pad2(due.getHours())}:${pad2(due.getMinutes())}`;
    const ref = (offer?.reference || ('LV-' + Math.random().toString(36).slice(2,8).toUpperCase()));

    wrap.innerHTML = html`
      <div class="sheet" role="dialog" aria-modal="true" aria-label="결제 안내">
        <h4>결제 안내 (무통장입금)</h4>
        <div class="pbox">
          <div class="row"><span class="muted">지원자</span><b>${text(app?.portfolio?.nickname||'쇼호스트')}</b></div>
          <div class="row"><span class="muted">공고</span><b>${text(recruit?.title||'제목 없음')}</b></div>
          <div class="row"><span class="muted">방송일</span><b>${fmtDate(recruit?.liveAt || '')}</b></div>
          <hr style="border:none;border-top:1px dashed #e5e7eb;margin:8px 0">
          <div class="row"><span>결제 금액</span><span class="amt">${money(Number(offer?.amount)||Number(fee)||0)} 원</span></div>
        </div>

        <p class="muted" style="margin:10px 0 6px">PG 연동 준비 중으로 현재는 <b>무통장입금</b>만 지원합니다.</p>
        <div class="pbox">
          <div class="row"><span class="muted">은행</span><b>국민은행</b></div>
          <div class="row"><span class="muted">계좌</span><b>1234-5678-8888</b> <button class="copy" data-copy="1234-5678-8888">복사</button></div>
          <div class="row"><span class="muted">예금주</span><b>라이비 주식회사</b></div>
          <div class="row"><span class="muted">참조코드</span><b>${ref}</b> <button class="copy" data-copy="${ref}">복사</button></div>
          <div class="row"><span class="muted">입금기한</span><b>${dueStr}</b></div>
          <small class="muted">* 송금 메모에 <b>참조코드</b>를 꼭 입력해 주세요. 확인이 빨라집니다.</small>
        </div>

        <div class="actions">
          <button class="copy" data-copy="입금 완료했습니다. 확인 부탁드립니다.">입금 후 메시지 문구 복사</button>
          <button class="copy" data-copy="${'국민은행 1234-5678-8888 / 예금주: 라이비 주식회사 / ' + (money(Number(fee)||0)) + '원 / 참조코드 ' + ref}">계좌 정보 복사</button>
          <button class="btn" data-close>닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    on(wrap, 'click', (e)=>{
      if (e.target.matches('[data-close]') || e.target === wrap) wrap.remove();
      if (e.target.classList.contains('copy')) {
        const v = e.target.getAttribute('data-copy')||'';
        navigator.clipboard?.writeText(v).then(()=>{ e.target.textContent='복사됨'; setTimeout(()=>e.target.textContent='복사',1200); });
      }
    });

    // 서버 결제 생성 시도(가능하면)
    (async ()=>{
      try{
        if (!offer?.id){
          const body = { offerId: (offer?.id||'offer_tmp'), method:'bank_transfer', amount:Number(offer?.amount)||Number(fee)||0,
            bt:{ bank:'KB', account:'1234-5678-8888', holder:'라이비', reference: ref }, dueAt: due.toISOString() };
          await postJSON(API_BASE + '/payments-test', body);
        }
      }catch(e){ console.warn('[payment create]', e); }
    })();
  }

  // -------- actions binding --------
  function bindActions(root, recruit){
    on(root,'click', async (e)=>{
      const card = e.target.closest('.app-card'); if(!card) return;
      const appId = card.getAttribute('data-app');
      const actBtn = e.target.closest('[data-act]'); if(!actBtn) return;
      const act = actBtn.getAttribute('data-act');

      const findApp = ()=> {
        const nickname = $('.app-name',card)?.textContent.replace(/(선정|보류|거절|검토중).*/,'').trim();
        const headline = $('.app-head',card)?.textContent.trim();
        const ava = $('.app-ava',card)?.getAttribute('src');
        const portfolioId = card.getAttribute('data-portfolio') || '';
        return { id: appId, portfolio:{ id: portfolioId, nickname, headline, mainThumbnailUrl: ava } };
      };
      const app = findApp();

      try{
        if (act === 'msg'){
          const toId = app.portfolio.id;
          if (!toId) { alert('포트폴리오 ID를 찾을 수 없습니다.'); return; }
          location.href = 'outbox-proposals.html?to=' + encodeURIComponent(toId);
          return;
        }
        if (act === 'reject'){
          await patchJSON(API_BASE + '/applications-test/' + appId, { status:'rejected' });
          card.querySelector('.badge')?.remove();
          $('.app-name',card).insertAdjacentHTML('beforeend',' <span class="badge no"><i class="ri-close-line"></i> 거절</span>');
          return;
        }
        if (act === 'hold'){
          await patchJSON(API_BASE + '/applications-test/' + appId, { status:'on_hold' });
          card.querySelector('.badge')?.remove();
          $('.app-name',card).insertAdjacentHTML('beforeend',' <span class="badge hold"><i class="ri-time-line"></i> 보류</span>');
          return;
        }
        if (act === 'accept'){
          openOfferModal(app, recruit);
          return;
        }
      }catch(err){
        alert('처리 중 오류가 발생했습니다: ' + (err.message||'네트워크'));
      }
    });
  }

  // -------- render --------
  async function render(){
    if (!guard()) return;
    const root = $('#brandApps'); if(!root) return;

    root.innerHTML = '<div class="app-empty">불러오는 중…</div>';

    try{
      const recs = await fetchMyRecruits();
      if (!recs.length){
        root.innerHTML = '<div class="app-empty">내가 등록한 공고가 없습니다. 먼저 공고를 만들어주세요.</div>';
        return;
      }

      // 각 공고별 지원자/카운트 병렬 로드
      const [lists, counts] = await Promise.all([
        Promise.all(recs.map(r => fetchApplications(r.id||r._id))),
        Promise.all(recs.map(r => fetchAppCount(r.id||r._id)))
      ]);

      root.innerHTML = recs.map((r,idx)=> recruitBlock(r, lists[idx], counts[idx])).join('');

      // 액션 바인딩
      root.querySelectorAll('.rec-card').forEach((sec, i)=>{
        bindActions(sec, recs[i]);
      });

    }catch(err){
      console.error('[apps render]', err);
      root.innerHTML = `
        <div class="app-empty">
          데이터를 불러오지 못했습니다. 잠시 후 새로고침해주세요.<br>
          <small class="muted">네트워크 혹은 API(-test) 준비 상태를 확인해 주세요.</small>
        </div>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})();