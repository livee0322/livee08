/* Home main.js — v2.9.16 (Apply modal: robust host check + load my portfolios first) */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const appendStyleOnce = (id, css) => { if (document.getElementById(id)) return; const st=document.createElement('style'); st.id=id; st.textContent=css; document.head.appendChild(st); };

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';
  const EP_NEWS       = EP.news       || '/news-test?status=published&limit=10';
  const EP_APPLY      = EP.apply      || '/applications-test';

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const asset = (name) => (CFG.BASE_PATH ? (CFG.BASE_PATH + '/' + name) : name);
  const FALLBACK_IMG = CFG.placeholderThumb || asset('default.jpg');

  const pad2 = (n) => String(n).padStart(2,'0');
  const fmtDate = (iso) => { if (!iso) return '미정'; const d=new Date(iso); if (isNaN(d)) return String(iso).slice(0,10); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); };
  const money = (v) => (v==null?'':Number(v).toLocaleString('ko-KR'));
  const text  = (v) => (v==null?'':String(v).trim());
  const coalesce = (...vals) => vals.find(v => v!==undefined && v!==null && v!=='');

  const pickThumb = (o) => o && ( o.mainThumbnailUrl || o.thumbnailUrl || (Array.isArray(o.subThumbnails)&&o.subThumbnails[0]) || (Array.isArray(o.subImages)&&o.subImages[0]) || o.coverImageUrl || o.imageUrl || o.thumbUrl || FALLBACK_IMG );

  const authHeaders = (json=true)=>{ const h={Accept:'application/json'}; if(json) h['Content-Type']='application/json'; if(TOKEN) h['Authorization']=`Bearer ${TOKEN}`; return h; };
  async function getJSON(url, headers={Accept:'application/json'}){ const r=await fetch(url,{headers}); let j=null; try{ j=await r.json(); }catch(_){} if(!r.ok || (j&&j.ok===false)) throw new Error((j&&j.message)||('HTTP_'+r.status)); return j||{}; }
  const parseItems = (j) => ( Array.isArray(j) ? j : j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || [] );

  // ---------- brand/fee mapping ----------
  const getBrandName = (c) => text(coalesce(c.brandName, c.brand, c.recruit&&c.recruit.brandName, c.brand&&c.brand.name, c.owner&&c.owner.brandName, c.user&&c.user.brandName)) || '브랜드';
  const getFee = (c)=>{ const raw = coalesce(c.fee, c.recruit&&c.recruit.pay, c.pay); const n=Number(raw); return Number.isFinite(n)?n:undefined; };
  const isFeeNegotiable = (c)=> !!coalesce(c.feeNegotiable, c.recruit&&c.recruit.payNegotiable, c.payNegotiable);

  // ---------- fetchers ----------
  async function fetchRecruits(){ try{ const url=API_BASE+(EP_RECRUITS.startsWith('/')?EP_RECRUITS:'/'+EP_RECRUITS); const arr=parseItems(await getJSON(url)); return arr.map((c,i)=>({ id:c.id||c._id||String(i), brandName:getBrandName(c), title:text(coalesce(c.title, c.recruit&&c.recruit.title, '제목 없음')), thumb:pickThumb(c), closeAt:coalesce(c.closeAt, c.recruit&&c.recruit.closeAt), fee:getFee(c), feeNegotiable:isFeeNegotiable(c) })); }catch(_){ return []; } }
  async function fetchPortfolios(){ try{ const url=API_BASE+(EP_PORTFOLIOS.startsWith('/')?EP_PORTFOLIOS:'/'+EP_PORTFOLIOS); const arr=parseItems(await getJSON(url)); return arr.map((p,i)=>({ id:p.id||p._id||String(i), nickname:text(p.nickname||p.displayName||p.name||'쇼호스트'), headline:text(p.headline||''), thumb:pickThumb(p) })); }catch(_){ return []; } }
  async function fetchNews(fallback){ try{ const url=API_BASE+(EP_NEWS.startsWith('/')?EP_NEWS:'/'+EP_NEWS); const arr=parseItems(await getJSON(url)); return arr.map((n,i)=>({ id:n.id||n._id||String(i), title:text(n.title||n.headline||'뉴스'), date:n.publishedAt||n.createdAt||n.updatedAt, summary:text(n.summary||n.excerpt||'') })); }catch(_){ return (fallback||[]).slice(0,6).map((r,i)=>({ id:r.id||String(i), title:r.title, date:r.closeAt, summary:'브랜드 소식' })); } }

  // ---------- me / host 判定 & 내 포트폴리오 ----------
  async function getMe(){
    if(!TOKEN) return null;
    const candidates=['/auth/me','/users/me','/me'];
    for(const ep of candidates){
      try{ const j=await getJSON(API_BASE+ep, authHeaders(false)); return j.data||j.user||j; }catch(_){}
    }
    try{ const saved=localStorage.getItem('livee_user'); return saved?JSON.parse(saved):null; }catch{ return null; }
  }

  // “host”를 폭넓게 인식(여러 필드/배열, 한글/영문, 부분일치)
  function isHost(me){
    if(!me) return false;
    const str = (v)=>String(v||'').toLowerCase();
    const bag = new Set(
      [
        me.role, me.userRole, me.type, me.userType, me.accountType, me.kind,
        me.profile?.role, me.profile?.type, me.category, me.job, me.title,
        ...(Array.isArray(me.roles)?me.roles:[]),
        ...(Array.isArray(me.tags)?me.tags:[])
      ].filter(Boolean).map(str)
    );
    // 키워드에 하나라도 걸리면 host 취급
    const hostKeys = ['host','showhost','show-host','쇼호스트','creator','influencer','mc'];
    const brandKeys= ['brand','advertiser','client','agency'];
    const hasHost = [...bag].some(s=>hostKeys.some(k=>s.includes(k))) || me.isHost === true;
    const looksBrand = [...bag].some(s=>brandKeys.some(k=>s.includes(k)));
    return hasHost && !looksBrand;
  }

  // 다양한 엔드포인트를 순차 시도하여 “내 포트폴리오” 탐색
  async function fetchMyPortfolios(){
    if(!TOKEN) return [];
    const tryFetch = async (path) => { try{ const j=await getJSON(API_BASE+path, authHeaders(false)); const it=parseItems(j); return Array.isArray(it)?it:[]; }catch(_){ return []; } };

    // 1) 서버가 지원할 가능성이 높은 쿼리들
    let items = await tryFetch('/portfolio-test?mine=1&limit=100');
    if(items.length) return items;

    const me = await getMe();
    const meId = me && (me.id || me._id || me.userId);
    const candidates = meId ? [
      `/portfolio-test?owner=${encodeURIComponent(meId)}&limit=100`,
      `/portfolio-test?user=${encodeURIComponent(meId)}&limit=100`,
      `/portfolio-test?userId=${encodeURIComponent(meId)}&limit=100`,
      `/users/${encodeURIComponent(meId)}/portfolio-test?limit=100`
    ] : [];
    for(const p of candidates){ items = await tryFetch(p); if(items.length) return items; }

    // 2) 전체 후 필터 (서버가 userId를 내보내는 경우)
    const all = await tryFetch('/portfolio-test?limit=200');
    if(meId && all.length){
      const mine = all.filter(x=>{
        const uid = x.userId || x.ownerId || x.user?._id || x.user?.id;
        return uid && String(uid) === String(meId);
      });
      if(mine.length) return mine;
    }
    return [];
  }

  // ---------- templates ----------
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee)+'원') : '출연료 미정'));

  const tplLineupList = (items)=> items && items.length
    ? '<div class="ed-grid">'+items.map(r =>
        '<article class="card-ed" onclick="location.href=\'recruit-detail.html?id='+encodeURIComponent(r.id)+'\'">'+
          '<img class="card-ed__media" src="'+(r.thumb||FALLBACK_IMG)+'" alt="" loading="lazy" decoding="async">'+
          '<div class="card-ed__body">'+
            '<div class="card-ed__eyebrow">'+(r.brandName||'브랜드')+'</div>'+
            '<div class="card-ed__title">'+r.title+'</div>'+
            '<div class="card-ed__meta">마감 '+fmtDate(r.closeAt)+' · '+feeText(r.fee,r.feeNegotiable)+'</div>'+
          '</div>'+
        '</article>').join('')+'</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">등록된 라이브가 없습니다</div><div class="card-ed__meta">브랜드 공고를 등록해보세요</div></div></article></div>';

  const tplRecruitHScroll = (items)=> items && items.length
    ? '<div class="hscroll" id="brandPickH">'+items.map(r =>
        '<article class="card-mini" data-id="'+String(r.id)+'">'+
          '<img class="mini-thumb" src="'+(r.thumb||FALLBACK_IMG)+'" alt="" loading="lazy" decoding="async">'+
          '<div>'+
            '<div class="lv-brand">'+(r.brandName||'브랜드')+'</div>'+
            '<div class="mini-title">'+r.title+'</div>'+
            '<div class="mini-meta">마감 '+fmtDate(r.closeAt)+' · '+feeText(r.fee,r.feeNegotiable)+'</div>'+
            '<div class="mini-actions" style="margin-top:8px;display:flex;gap:8px;align-items:center;">'+
              '<button type="button" class="btn btn--sm mini-apply" data-id="'+String(r.id)+'"><i class="ri-send-plane-line"></i> 지원하기</button>'+
            '</div>'+
          '</div>'+
          '<button class="mini-bookmark" aria-label="북마크"><i class="ri-bookmark-line"></i></button>'+
        '</article>').join('')+'</div>'
    : '<div class="hscroll"><article class="card-mini" aria-disabled="true"><div class="mini-thumb" style="background:#f3f4f6"></div><div><div class="mini-title">공고가 없습니다</div><div class="mini-meta">새 공고를 등록해보세요</div></div></article></div>';

  const tplNewsList = (items)=> items && items.length
    ? '<div class="news-list">'+items.map(n =>
        '<article class="news-item" onclick="location.href=\'news.html#/'+encodeURIComponent(n.id)+'\'">'+
          '<div class="news-item__title">'+n.title+'</div>'+
          '<div class="news-item__meta">'+(n.date?(fmtDate(n.date)+' · '):'')+(n.summary||'소식')+'</div>'+
        '</article>').join('')+'</div>'
    : '<div class="news-list"><article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';

  const tplPortfolios = (items)=> items && items.length
    ? '<div class="pf-hlist">'+items.slice(0,6).map(p =>
        '<article class="pf-hcard">'+
          '<img class="pf-avatar" src="'+(p.thumb||FALLBACK_IMG)+'" alt="" loading="lazy" decoding="async">'+
          '<div class="pf-info">'+
            '<div class="pf-name">'+p.nickname+'</div>'+
            '<div class="pf-intro">'+(p.headline||'소개 준비 중')+'</div>'+
            '<div class="pf-actions">'+
              '<a class="btn btn--sm btn--chip" href="outbox-proposals.html?to='+encodeURIComponent(p.id)+'"><i class="ri-mail-send-line"></i> 제안하기</a>'+
              '<a class="btn btn--sm btn--chip" href="portfolio-detail.html?id='+encodeURIComponent(p.id)+'"><i class="ri-user-line"></i> 프로필 보기</a>'+
            '</div>'+
          '</div>'+
        '</article>').join('')+'</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">포트폴리오가 없습니다</div><div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div></div></article></div>';

  const tplCtaBanner =
    '<div class="cta-banner" role="region" aria-label="상담 배너"><div class="cta-copy">'+
      '<div class="cta-kicker">무료 상담</div><div class="cta-title">지금 바로 라이브 커머스 시작해보세요</div>'+
      '<div class="cta-sub">기획 · 섭외 · 계약 · 결제까지 도와드립니다</div></div>'+
      '<div class="cta-actions"><a class="btn" href="recruit-new.html"><i class="ri-megaphone-line"></i> 공고 올리기</a>'+
      '<a class="btn" href="help.html#contact"><i class="ri-chat-1-line"></i> 빠른 문의</a></div></div>';

  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="'+(secKey||'')+'"><div class="section-head"><h2>'+title+'</h2><a class="more" href="'+(moreHref||'#')+'">더보기</a></div>'+innerHTML+'</div>';

  // ---------- hero ----------
  function renderHero(el){
    if(!el) return;
    const heroSrc=asset('bannertest.jpg');
    el.innerHTML='<article class="hero-card"><div class="hero-media"></div><div class="hero-body"><div class="hero-kicker">LIVEE</div><h1 class="hero-title">신제품 론칭 LIVE</h1><p class="hero-sub">브랜드와 호스트를 가장 빠르게</p></div></article>';
    const media=el.querySelector('.hero-media');
    if(media){ media.style.backgroundImage='linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,.08)), url("'+heroSrc+'")'; }
    const nav=document.querySelector('.hero-nav'); if(nav) nav.style.display='none';
  }

  // ---------- Apply Modal ----------
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

  function openApplyModal(recruitId){
    ensureApplyCSS();
    const wrap=document.createElement('div');
    wrap.className='amodal';
    wrap.innerHTML=`
      <div class="sheet" role="dialog" aria-modal="true" aria-label="지원하기">
        <header><strong>지원하기</strong><button type="button" class="x">✕</button></header>
        <div class="warn">연락처·이메일 직접 기재는 금지됩니다. 라이비 외 채널(개인 메신저, 이메일 등)로 계약을 진행할 경우 <b>대금 미지급 등 불리한 문제가 발생</b>할 수 있습니다. 모든 커뮤니케이션은 라이비 내에서 진행해주세요.</div>
        <div class="field">
          <label>내 포트폴리오 선택</label>
          <div class="plist" id="amList"><div style="color:#64748b">불러오는 중…</div></div>
        </div>
        <div class="field">
          <label>메시지 (선택)</label>
          <textarea id="amMsg" placeholder="간단한 자기소개와 지원 이유를 남겨주세요. 연락처/이메일은 적지 마세요."></textarea>
        </div>
        <div class="actions">
          <button type="button" class="btn cancel">취소</button>
          <button type="button" class="btn pri submit">지원 보내기</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const close=()=>wrap.remove();
    on(wrap.querySelector('.x'),'click',close);
    on(wrap.querySelector('.cancel'),'click',close);
    on(wrap,'click',e=>{ if(e.target===wrap) close(); });

    (async ()=>{
      if(!TOKEN){ alert('로그인 후 이용 가능합니다.'); location.href='login.html?returnTo='+encodeURIComponent(location.pathname+location.search); close(); return; }

      let items=[];
      try{
        items = await fetchMyPortfolios();
      }catch(e){
        console.warn('[my portfolios]', e);
        $('#amList',wrap).innerHTML = '<div style="color:#ef4444;font-weight:700">불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
        wrap.querySelector('.submit').disabled = true;
        return;
      }

      if(items.length){
        // 포트폴리오가 있으면 역할 판별에 상관없이 선택 UI 제공
        $('#amList',wrap).innerHTML = items.map((p,i)=>`
          <label class="prow">
            <input type="radio" name="amP" value="${p.id||p._id}" ${i===0?'checked':''}>
            <div style="display:flex;align-items:center;gap:10px">
              <img src="${pickThumb(p)||FALLBACK_IMG}" alt="">
              <div>
                <div style="font-weight:800">${text(p.nickname||p.displayName||'쇼호스트')}</div>
                <div style="color:#64748b;font-size:12.5px">${text(p.headline||'')}</div>
              </div>
            </div>
          </label>
        `).join('');
      }else{
        // 포트폴리오 없음: 역할 체크 후 안내
        const me = await getMe();
        if(!isHost(me)){
          $('#amList',wrap).innerHTML = '<div style="color:#ef4444;font-weight:800">이 기능은 쇼호스트 전용입니다.</div>';
          wrap.querySelector('.submit').disabled = true;
        }else{
          $('#amList',wrap).innerHTML = '<div>작성된 포트폴리오가 없습니다. <a href="portfolio-new.html" style="color:#4f46e5;font-weight:800">포트폴리오 만들기 →</a></div>';
          wrap.querySelector('.submit').disabled = true;
        }
      }
    })();

    on(wrap.querySelector('.submit'),'click', async ()=>{
      const pid = wrap.querySelector('input[name="amP"]:checked')?.value;
      if(!pid){ alert('포트폴리오를 선택해주세요.'); return; }
      const msg = $('#amMsg',wrap)?.value?.trim() || '';
      const payload = { recruitId, portfolioId: pid, message: msg };

      // 제출
try{
  const res = await fetch(API_BASE + (EP_APPLY.startsWith('/')?EP_APPLY:'/'+EP_APPLY), {
    method:'POST', headers:authHeaders(true), body:JSON.stringify(payload)
  });
  const j = await res.json().catch(()=>({}));
  if(!res.ok || j.ok===false) throw new Error(j.message || ('HTTP_'+res.status));
  alert('지원이 접수되었어요. 브랜드가 확인하면 알림으로 알려드릴게요.');
  close();
}catch(e){
  console.warn('[apply]', e);
  alert('지원에 실패했습니다: ' + (e.message || '알 수 없는 오류'));
  // close(); // 원하면 닫기 유지
}
    });
  }

  function bindApply(root){
    on(root,'click', (e)=>{
      const btn=e.target.closest('.mini-apply'); if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.id || btn.closest('.card-mini')?.dataset.id;
      if(id) openApplyModal(id);
    });
  }

  // ---------- render ----------
  async function render(){
    const root = $('#home') || $('main#home') || $('main') || document.body;
    const heroRoot = $('#hero') || $('[data-hero]');
    try{
      const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);
      const news = await fetchNews(recruits);

      renderHero(heroRoot);

      const html =
        sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
        sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
        sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
        sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
        '<div class="section">'+tplCtaBanner+'</div>';

      if(root){ root.innerHTML=html; bindApply(document.getElementById('brandPickH')||root); }
    }catch(err){
      console.error('[home render error]', err);
      const r=$('#home')||$('main')||document.body;
      if(r){
        r.innerHTML =
          '<div class="section"><div class="ed-grid">'+
            '<article class="card-ed"><div class="card-ed__body">'+
              '<div class="card-ed__title">데이터를 불러오지 못했습니다</div>'+
              '<div class="card-ed__meta">잠시 후 새로고침해주세요</div>'+
            '</div></article>'+
          '</div></div>';
      }
    }
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', render, {once:true}); } else { render(); }
})();