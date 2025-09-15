/* home/templates.js — v2.13.1 (hero slider + sections) */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME || (w.LIVEE_HOME = {});
  const { util } = H;
  const FALLBACK_IMG = (H.FALLBACK_IMG || 'default.jpg');

  const { fmtDate, money } = util || {
    fmtDate: (d) => (d ? String(d).slice(0,10) : '-'),
    money: (n) => (n||0).toLocaleString()
  };
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee) + '원') : '출연료 미정'));

  /* ---------- Hero slider ---------- */
  function tplHeroSlider() {
    // 루트 이미지만 사용: banner1.jpg / banner2.jpg (없으면 있는 것만)
    const imgs = ['banner1.jpg','banner2.jpg'].filter(Boolean);
    const slides = imgs.map(src => `<div class="hero-slide"><img src="${src}" alt=""></div>`).join('');
    const dots   = imgs.map((_,i)=>`<span class="hero-dot${i===0?' is-on':''}"></span>`).join('');
    return `
      <div class="hero">
        <div class="hero-track">${slides}</div>
        <div class="hero-dots">${dots}</div>
      </div>`;
  }

  /* ---------- Sections ---------- */
  const tplLineupList = (items) => items && items.length
    ? '<div class="ed-grid">' + items.map(r =>
      '<article class="card-ed" onclick="location.href=\'recruit-detail.html?id=' + encodeURIComponent(r.id) + '\'">' +
        '<img class="card-ed__media" src="' + (r.thumb || FALLBACK_IMG) + '" alt="" loading="lazy" decoding="async">' +
        '<div>' +
          '<div class="card-ed__eyebrow">' + (r.brandName || '브랜드') + '</div>' +
          '<div class="card-ed__title">' + r.title + '</div>' +
          '<div class="card-ed__meta">마감 ' + fmtDate(r.closeAt) + ' · ' + feeText(r.fee, r.feeNegotiable) + '</div>' +
        '</div>' +
      '</article>').join('') + '</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__title">등록된 라이브가 없습니다</div><div class="card-ed__meta">브랜드 공고를 등록해보세요</div></article></div>';

  const tplRecruitHScroll = (items) => items && items.length
    ? '<div class="hscroll" id="brandPickH">' + items.map(r => `
        <article class="card-vert">
          <div class="thumb-wrap">
            <img class="thumb" src="${r.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
            <button class="bm" type="button" aria-label="북마크"><i class="ri-bookmark-line"></i></button>
          </div>
          <div class="body">
            <div class="brand">${r.brandName || '브랜드'}</div>
            <div class="title">${r.title}</div>
            <div class="meta">마감 ${fmtDate(r.closeAt)} · ${feeText(r.fee, r.feeNegotiable)}</div>
          </div>
        </article>`).join('') + '</div>'
    : `<div class="hscroll"><article class="card-vert" aria-disabled="true">
         <div class="thumb-wrap"><div class="thumb" style="background:#f3f4f6"></div></div>
         <div class="body"><div class="title">공고가 없습니다</div><div class="meta">새 공고를 등록해보세요</div></div>
       </article></div>`;

  const tplNewsList = (items) => items && items.length
    ? '<div class="news-list">' + items.map(n => {
        const thumb = n.thumb || '';
        const hasImg = !!thumb;
        return `
        <article class="news-item ${hasImg ? '' : 'noimg'}" onclick="location.href='news.html#/${encodeURIComponent(n.id)}'">
          <div>
            <div class="news-item__title">${n.title}</div>
            <div class="news-item__meta">${n.date ? (fmtDate(n.date) + ' · ') : ''}${n.summary || ''}</div>
          </div>
          ${hasImg ? `<div class="news-thumb"><img src="${thumb}" alt="" loading="lazy"></div>` : ''}
        </article>`;
      }).join('') + '</div>'
    : '<div class="news-list"><article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';

  /* ----- 포트폴리오(쇼호스트) : 둥근 썸네일 + 본문 중앙정렬 ----- */
const tplPortfolios = (items) => {
  if(!items || !items.length){
    return '<div class="pf-hlist"><article class="pf-card"><div class="pf-body"><div class="pf-name">포트폴리오가 없습니다</div><div class="pf-intro">첫 포트폴리오를 등록해보세요</div></div></article></div>';
  }

  // 공개 여부 선택된 데이터만 메타에 표기: career, age, height, region
  const fmtMeta = (p) => {
    const parts = [];
    if(p.careerPublic && p.career) parts.push(p.career);      // 예) 3년차
    if(p.agePublic && p.age) parts.push(p.age+'세');
    if(p.heightPublic && p.height) parts.push(p.height+'cm');
    if(p.regionPublic && p.region) parts.push(p.region);
    if(!parts.length) return '';
    return '<div class="pf-meta">' +
      parts.map((t,i)=> (i?'<span class="dot"></span>':'') + '<span>'+t+'</span>').join('') +
      '</div>';
  };

  return '<div class="pf-hlist">' + items.slice(0, 6).map(p => {
    const id = encodeURIComponent(p.id);
    const name = p.nickname || '쇼호스트';
    const intro = p.headline || '';   // 한줄소개
    const thumb = (p.thumb || (p.thumbnailUrl || p.avatarUrl || 'default.jpg'));
    return `
      <article class="pf-card">
        <img class="pf-thumb" src="${thumb}" alt="" loading="lazy" decoding="async">
        <div class="pf-body">
          <div>
            <div class="pf-name">${name}</div>
            ${intro ? `<div class="pf-intro">${intro}</div>` : ''}
            ${fmtMeta(p)}
          </div>
          <div class="pf-actions">
            <a class="pf-btn pri" href="outbox-proposals.html?to=${id}">
              <i class="ri-send-plane-line"></i> 제안
            </a>
            <a class="pf-btn" href="portfolio-detail.html?id=${id}">
              <i class="ri-user-line"></i> 프로필 보기
            </a>
          </div>
        </div>
      </article>`;
  }).join('') + '</div>';
};


  const tplHotClips = (items) => items && items.length
    ? `<div class="shorts-hscroll" id="hotShorts">
        ${items.map(s => `
          <article class="clip-card" data-embed="${s.embed}">
            <img class="clip-thumb" src="${s.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
            <span class="clip-play"><i class="ri-play-fill"></i></span>
          </article>`).join('')}
      </div>`
    : '<div class="shorts-hscroll"><div class="clip-empty">등록된 클립이 없습니다</div></div>';

  const tplCtaBanner =
    '<div class="cta-banner" role="region" aria-label="상담 배너"><div class="cta-copy">' +
      '<div class="cta-kicker">무료 상담</div><div class="cta-title">지금 바로 라이브 커머스 시작해보세요</div>' +
      '<div class="cta-sub">기획 · 섭외 · 계약 · 결제까지 도와드립니다</div></div>' +
      '<div class="cta-actions"><a class="btn" href="recruit-new.html"><i class="ri-megaphone-line"></i> 공고 올리기</a>' +
      '<a class="btn" href="help.html#contact"><i class="ri-chat-1-line"></i> 빠른 문의</a></div></div>';

  /* 이미지 배너 — 루트의 ad_banner.jpg */
  function tplImageBanner(){
    return '<a class="img-banner" href="byhen.html" aria-label="BYHEN 안내 배너">' +
           '<img src="ad_banner.jpg" alt="BYHEN 배너">' +
           '</a>';
  }

  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="' + (secKey || '') + '">' +
      '<div class="section-head"><h2>' + title + '</h2>' +
      '<a class="more" href="' + (moreHref || '#') + '">더보기</a></div>' +
      innerHTML + '</div>';

  H.tpl = {
    tplHeroSlider,
    tplLineupList, tplRecruitHScroll, tplNewsList,
    tplPortfolios, tplHotClips, tplCtaBanner,
    tplImageBanner, sectionBlock
  };
})(window);