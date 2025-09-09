<script>
/* Home main.js — v2.10.0 (apply CTA for recruits + modal) */
(function () {
  'use strict';

  // ---------- helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';
  const EP_NEWS       = EP.news       || '/news-test?status=published&limit=10';
  const FALLBACK_IMG  = CFG.placeholderThumb || (CFG.BASE_PATH ? (CFG.BASE_PATH + '/assets/default.jpg') : 'default.jpg');

  const pad2 = n => String(n).padStart(2,'0');
  const fmtDate = iso => {
    if (!iso) return '미정';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  };
  const money = v => (v==null ? '' : Number(v).toLocaleString('ko-KR'));
  const text  = v => (v==null ? '' : String(v).trim());
  const coalesce = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');

  const token = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const userRole = localStorage.getItem('livee_role') || ''; // 프론트 캐시(없으면 서버에서 다시 확인)

  const pickThumb = (o) =>
    o && (
      o.mainThumbnailUrl ||
      o.thumbnailUrl ||
      (Array.isArray(o.subThumbnails) && o.subThumbnails[0]) ||
      (Array.isArray(o.subImages) && o.subImages[0]) ||
      o.coverImageUrl ||
      o.imageUrl ||
      o.thumbUrl ||
      FALLBACK_IMG
    );

  async function getJSON(url, headers) {
    const r = await fetch(url, { headers: Object.assign({ 'Accept': 'application/json' }, headers||{}) });
    let j = null;
    try { j = await r.json(); } catch(_){}
    if (!r.ok || (j && j.ok === false)) throw new Error((j && j.message) || ('HTTP_' + r.status));
    return j || {};
  }
  const parseItems = j => (
    Array.isArray(j) ? j :
    j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || []
  );

  // ---------- brand/fee mapping ----------
  const getBrandName = (c) => text(coalesce(
    c.brandName,
    c.brand,
    c.recruit && c.recruit.brandName,
    c.brand && c.brand.name,
    c.owner && c.owner.brandName,
    c.user && c.user.brandName
  )) || '브랜드';

  const getFee = (c) => {
    const raw = coalesce(c.fee, c.recruit && c.recruit.pay, c.pay);
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const isFeeNegotiable = (c) => !!coalesce(
    c.feeNegotiable,
    c.recruit && c.recruit.payNegotiable,
    c.payNegotiable
  );

  // ---------- fetchers ----------
  async function fetchRecruits() {
    try {
      const url = API_BASE + (EP_RECRUITS.startsWith('/') ? EP_RECRUITS : '/' + EP_RECRUITS);
      const arr = parseItems(await getJSON(url));
      return arr.map((c,i) => ({
        id: c.id || c._id || String(i),
        brandName: getBrandName(c),
        title: text(coalesce(c.title, c.recruit && c.recruit.title, '제목 없음')),
        thumb: pickThumb(c),
        closeAt: coalesce(c.closeAt, c.recruit && c.recruit.closeAt),
        fee: getFee(c),
        feeNegotiable: isFeeNegotiable(c)
      }));
    } catch(_) { return []; }
  }

  async function fetchPortfolios() {
    try {
      const url = API_BASE + (EP_PORTFOLIOS.startsWith('/') ? EP_PORTFOLIOS : '/' + EP_PORTFOLIOS);
      const arr = parseItems(await getJSON(url));
      return arr.map((p,i) => ({
        id: p.id || p._id || String(i),
        nickname: text(p.nickname || p.displayName || p.name || '쇼호스트'),
        headline: text(p.headline || ''),
        thumb: pickThumb(p)
      }));
    } catch(_) { return []; }
  }

  async function fetchNews(fallback) {
    try {
      const url = API_BASE + (EP_NEWS.startsWith('/') ? EP_NEWS : '/' + EP_NEWS);
      const arr = parseItems(await getJSON(url));
      return arr.map((n,i) => ({
        id: n.id || n._id || String(i),
        title: text(n.title || n.headline || '뉴스'),
        date: n.publishedAt || n.createdAt || n.updatedAt,
        summary: text(n.summary || n.excerpt || '')
      }));
    } catch(_) {
      return (fallback || []).slice(0,6).map((r,i)=>({
        id: r.id || String(i),
        title: r.title,
        date: r.closeAt,
        summary: '브랜드 소식'
      }));
    }
  }

  // ---------- APPLY modal (deferred mount) ----------
  function mountApplyModal() {
    if ($('#applyModal')) return;
    const el = document.createElement('div');
    el.id = 'applyModal';
    el.innerHTML = `
      <div class="lv-modal__mask" data-close></div>
      <div class="lv-modal">
        <header class="lv-modal__head">
          <strong>공고 지원</strong>
          <button class="x" data-close aria-label="닫기">×</button>
        </header>
        <div class="lv-modal__body">
          <div class="warn">
            라이비 플랫폼 내 메시지/계약을 이용해주세요. <b>외부 메신저·이메일 등 다른 플랫폼을 통한 계약 진행 시</b>
            결제 보호를 적용할 수 없어 <b>대금 미지급 등 불리한 문제가 발생할 수 있습니다.</b>
          </div>

          <label class="label">지원할 포트폴리오</label>
          <div class="selectwrap">
            <select id="applyPortfolioSelect" class="input"></select>
          </div>

          <label class="label">메시지</label>
          <textarea id="applyMsg" class="input" rows="6" maxlength="800" placeholder="간단한 자기소개, 해당 공고에 적합한 이유 등을 작성해주세요. 연락처·이메일 기재 금지"></textarea>
          <div class="hint">연락처·이메일 등 외부 연락처는 입력하지 마세요.</div>
        </div>
        <footer class="lv-modal__foot">
          <button class="btn ghost" data-close>취소</button>
          <button class="btn pri" id="applySubmitBtn">지원하기</button>
        </footer>
      </div>
    `;
    document.body.appendChild(el);

    // events
    el.addEventListener('click', (e)=>{
      if (e.target.hasAttribute('data-close')) closeApply();
    });
    $('#applySubmitBtn', el).addEventListener('click', submitApply);
  }

  function openApply(recruitId) {
    if (!token) { location.href = 'login.html?returnTo=' + encodeURIComponent(location.href); return; }
    // 권한 체크(프론트 캐시 없을 때는 서버 화면에서 막히더라도 프롬프트)
    if (userRole && !userRole.split(',').includes('showhost') && !userRole.split(',').includes('admin')) {
      alert('쇼호스트만 지원 가능합니다.');
      return;
    }
    mountApplyModal();
    const root = $('#applyModal');
    root.dataset.rid = recruitId;
    root.classList.add('show');
    loadMyPortfolios();
  }
  function closeApply(){ $('#applyModal')?.classList.remove('show'); }

  async function loadMyPortfolios(){
    const sel = $('#applyPortfolioSelect');
    if (!sel) return;
    sel.innerHTML = '<option disabled selected>불러오는 중…</option>';
    try{
      const url = API_BASE + '/portfolio-test?mine=true&status=published&limit=50';
      const j = await getJSON(url, { 'Authorization': 'Bearer '+token });
      const items = parseItems(j);
      if (!items.length) {
        sel.innerHTML = '<option disabled selected>발행한 포트폴리오가 없습니다</option>';
        return;
      }
      sel.innerHTML = items.map(p => `<option value="${p.id||p._id}">${p.nickname||'쇼호스트'} · ${p.headline||'소개'}</option>`).join('');
    }catch(e){
      sel.innerHTML = '<option disabled selected>목록을 불러오지 못했습니다</option>';
    }
  }

  async function submitApply(){
    const root = $('#applyModal');
    const recruitId = root?.dataset.rid;
    const portfolioId = $('#applyPortfolioSelect')?.value;
    const msg = $('#applyMsg')?.value?.trim() || '';

    if (!recruitId) return alert('잘못된 요청입니다.');
    if (!portfolioId) return alert('포트폴리오를 선택하세요.');
    if (/(email|@|카톡|카카오|kakao|톡|전화|phone|tel|연락|이메일)/i.test(msg)) {
      return alert('연락처/이메일은 메시지에 포함할 수 없습니다.');
    }

    try{
      const url = API_BASE + '/applications-test';
      const body = { recruitId, portfolioId, message: msg };
      const r = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Accept':'application/json', 'Authorization':'Bearer '+token },
        body: JSON.stringify(body)
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok===false) throw new Error(j.message || ('HTTP_'+r.status));
      closeApply();
      alert('지원이 접수되었습니다.');
    }catch(err){
      alert('지원 실패: ' + (err.message||'네트워크 오류'));
    }
  }

  // ---------- templates ----------
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee) + '원') : '출연료 미정'));

  // 카드 하단에 “지원하기” 버튼 포함(브랜드 pick 섹션용)
  const tplRecruitHScroll = items => {
    if (!items || !items.length) {
      return (
        '<div class="hscroll">' +
          '<article class="card-mini" aria-disabled="true">' +
            '<div class="mini-thumb" style="background:#f3f4f6"></div>' +
            '<div><div class="mini-title">공고가 없습니다</div><div class="mini-meta">새 공고를 등록해보세요</div></div>' +
          '</article>' +
        '</div>'
      );
    }
    return (
      '<div class="hscroll">' +
        items.map(r =>
          '<article class="card-mini">' +
            '<img class="mini-thumb" src="' + (r.thumb || FALLBACK_IMG) + '" alt="" loading="lazy" decoding="async">' +
            '<div>' +
              '<div class="lv-brand">' + (r.brandName || '브랜드') + '</div>' +
              '<div class="mini-title">' + r.title + '</div>' +
              '<div class="mini-meta">마감 ' + fmtDate(r.closeAt) + ' · ' + feeText(r.fee, r.feeNegotiable) + '</div>' +
              '<div class="mini-actions">' +
                '<button class="btn btn--sm btn--chip ghost" data-view="' + r.id + '"><i class="ri-external-link-line"></i> 상세보기</button>' +
                '<button class="btn btn--sm btn--chip pri" data-apply="' + r.id + '"><i class="ri-send-plane-line"></i> 지원하기</button>' +
              '</div>' +
            '</div>' +
            '<button class="mini-bookmark" aria-label="북마크"><i class="ri-bookmark-line"></i></button>' +
          '</article>'
        ).join('') +
      '</div>'
    );
  };

  // 나머지 템플릿은 기존과 동일
  const tplLineupList = items => {
    if (!items || !items.length) {
      return '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">등록된 라이브가 없습니다</div><div class="card-ed__meta">브랜드 공고를 등록해보세요</div></div></article></div>';
    }
    return (
      '<div class="ed-grid">' +
        items.map(r =>
          '<article class="card-ed" onclick="location.href=\'recruit-detail.html?id=' + encodeURIComponent(r.id) + '\'">' +
            '<img class="card-ed__media" src="' + (r.thumb || FALLBACK_IMG) + '" alt="" loading="lazy" decoding="async">' +
            '<div class="card-ed__body">' +
              '<div class="card-ed__eyebrow">' + (r.brandName || '브랜드') + '</div>' +
              '<div class="card-ed__title">' + r.title + '</div>' +
              '<div class="card-ed__meta">마감 ' + fmtDate(r.closeAt) + ' · ' + feeText(r.fee, r.feeNegotiable) + '</div>' +
            '</div>' +
          '</article>'
        ).join('') +
      '</div>'
    );
  };

  const tplNewsList = items => {
    if (!items || !items.length) return '<div class="news-list"><article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';
    return (
      '<div class="news-list">' +
        items.map(n =>
          '<article class="news-item" onclick="location.href=\'news.html#/' + encodeURIComponent(n.id) + '\'">' +
            '<div class="news-item__title">' + n.title + '</div>' +
            '<div class="news-item__meta">' + (n.date ? (fmtDate(n.date) + ' · ') : '') + (n.summary || '소식') + '</div>' +
          '</article>'
        ).join('') +
      '</div>'
    );
  };

  const tplPortfolios = items => {
    if (!items || !items.length) {
      return '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">포트폴리오가 없습니다</div><div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div></div></article></div>';
    }
    return (
      '<div class="pf-hlist">' +
        items.slice(0,6).map(p =>
          '<article class="pf-hcard">' +
            '<img class="pf-avatar" src="' + (p.thumb || FALLBACK_IMG) + '" alt="" loading="lazy" decoding="async">' +
            '<div class="pf-info">' +
              '<div class="pf-name">' + p.nickname + '</div>' +
              '<div class="pf-intro">' + (p.headline || '소개 준비 중') + '</div>' +
              '<div class="pf-actions">' +
                '<a class="btn btn--sm btn--chip" href="outbox-proposals.html?to=' + encodeURIComponent(p.id) + '"><i class="ri-mail-send-line"></i> 제안하기</a>' +
                '<a class="btn btn--sm btn--chip" href="portfolio-detail.html?id=' + encodeURIComponent(p.id) + '"><i class="ri-user-line"></i> 프로필 보기</a>' +
              '</div>' +
            '</div>' +
          '</article>'
        ).join('') +
      '</div>'
    );
  };

  const tplCtaBanner =
    '<div class="cta-banner" role="region" aria-label="상담 배너">' +
      '<div class="cta-copy">' +
        '<div class="cta-kicker">무료 상담</div>' +
        '<div class="cta-title">지금 바로 라이브 커머스 시작해보세요</div>' +
        '<div class="cta-sub">기획 · 섭외 · 계약 · 결제까지 도와드립니다</div>' +
      '</div>' +
      '<div class="cta-actions">' +
        '<a class="btn" href="recruit-new.html"><i class="ri-megaphone-line"></i> 공고 올리기</a>' +
        '<a class="btn" href="help.html#contact"><i class="ri-chat-1-line"></i> 빠른 문의</a>' +
      '</div>' +
    '</div>';

  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="' + (secKey || '') + '">' +
      '<div class="section-head">' +
        '<h2>' + title + '</h2>' +
        '<a class="more" href="' + moreHref + '">더보기</a>' +
      '</div>' +
      innerHTML +
    '</div>';

  function renderHero(el) {
    if (!el) return;
    const heroSrc = 'bannertest.jpg';
    el.innerHTML =
      '<article class="hero-card">' +
        '<div class="hero-media"></div>' +
        '<div class="hero-body">' +
          '<div class="hero-kicker">LIVEE</div>' +
          '<h1 class="hero-title">신제품 론칭 LIVE</h1>' +
          '<p class="hero-sub">브랜드와 호스트를 가장 빠르게</p>' +
        '</div>' +
      '</article>';
    const media = el.querySelector('.hero-media');
    if (media) {
      media.style.backgroundImage =
        'linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,.08)), url("' + heroSrc + '")';
    }
    const nav = document.querySelector('.hero-nav');
    if (nav) nav.style.display = 'none';
  }

  // ---------- render ----------
  async function render() {
    const root = $('#home') || $('main#home') || $('main') || document.body;
    const heroRoot = $('#hero') || $('[data-hero]');

    try {
      const [recruits, portfolios] = await Promise.all([fetchRecruits(), fetchPortfolios()]);
      const news = await fetchNews(recruits);

      renderHero(heroRoot);

      const lineupHTML    = tplLineupList(recruits.slice(0,6));
      const recommendHTML = tplRecruitHScroll(recruits.slice(0,8));
      const newsHTML      = tplNewsList(news.slice(0,8));
      const pfHTML        = tplPortfolios(portfolios);

      const html =
        sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고', 'recruit-list.html', lineupHTML, 'lineup') +
        sectionBlock('브랜드 <span class="hl">pick</span>', 'recruit-list.html', recommendHTML, 'recruits') +
        sectionBlock('<span class="hl">라이비</span> 뉴스', 'news.html', newsHTML, 'news') +
        sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?', 'portfolio-list.html', pfHTML, 'pf') +
        '<div class="section">' + tplCtaBanner + '</div>';

      root.innerHTML = html;

      // 바인딩: 상세/지원
      const sec = $('[data-sec="recruits"]');
      if (sec) {
        sec.addEventListener('click', (e)=>{
          const btnView = e.target.closest('[data-view]');
          const btnApply = e.target.closest('[data-apply]');
          if (btnView) {
            const id = btnView.getAttribute('data-view');
            location.href = 'recruit-detail.html?id=' + encodeURIComponent(id);
          }
          if (btnApply) {
            const id = btnApply.getAttribute('data-apply');
            openApply(id);
          }
        });
      }
    } catch (err) {
      if (window.console && console.error) console.error('[home render error]', err);
      const root = $('#home') || $('main') || document.body;
      if (root) {
        root.innerHTML =
          '<div class="section"><div class="ed-grid">' +
            '<article class="card-ed"><div class="card-ed__body">' +
              '<div class="card-ed__title">데이터를 불러오지 못했습니다</div>' +
              '<div class="card-ed__meta">잠시 후 새로고침해주세요</div>' +
            '</div></article>' +
          '</div></div>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();
</script>