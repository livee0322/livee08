(function (w) {
  'use strict';
  const H = w.LIVEE_HOME || (w.LIVEE_HOME = {});
  const FALLBACK_IMG = 'fallback.jpg';

  const util = H.util || {};
  const fmtDate = (d)=> (d ? String(d).slice(0,10) : '-');
  const money   = (n)=> (n||0).toLocaleString();
  const feeText = (fee,nego)=> (nego ? '협의' : (fee!=null ? (money(fee)+'원') : '출연료 미정'));

  // ── hero slider (banner1.jpg / banner2.jpg at root)
  function tplHeroSlider(){
    const base = w.LIVEE_HOME?.CFG?.BASE_PATH || '';
    const src = (p)=> (base ? (base.replace(/\/$/,'') + '/' + p) : p);
    return `
      <div class="hero">
        <div class="slides" data-hero-slides>
          <div class="slide"><img src="${src('banner1.jpg')}" alt=""></div>
          <div class="slide"><img src="${src('banner2.jpg')}" alt=""></div>
        </div>
        <div class="dots" data-hero-dots>
          <span class="dot is-active"></span>
          <span class="dot"></span>
        </div>
      </div>`;
  }

  // ── sections
  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    `<div class="section" data-sec="${secKey||''}">
      <div class="section-head"><h2>${title}</h2>
        <a class="more" href="${moreHref||'#'}">더보기</a></div>
      ${innerHTML}
    </div>`;

  const tplLineupList = (items)=> items?.length
    ? `<div class="ed-grid">${
        items.map(r=>`
        <article class="card-ed" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
          <img class="card-ed__media" src="${r.thumb||FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
          <div>
            <div class="card-ed__eyebrow">${r.brandName||'브랜드'}</div>
            <div class="card-ed__title">${r.title}</div>
            <div class="card-ed__meta">마감 ${fmtDate(r.closeAt)} · ${feeText(r.fee, r.feeNegotiable)}</div>
          </div>
        </article>`).join('')
      }</div>`
    : `<div class="ed-grid"><article class="card-ed"><div class="card-ed__title">등록된 라이브가 없습니다</div><div class="card-ed__meta">브랜드 공고를 등록해보세요</div></article></div>`;

  const tplRecruitHScroll = (items)=> items?.length
    ? `<div class="hscroll">${
        items.map(r=>`
        <article class="card-vert">
          <img class="thumb" src="${r.thumb||FALLBACK_IMG}" alt="">
          <div class="body">
            <div class="brand">${r.brandName||'브랜드'}</div>
            <div class="title">${r.title}</div>
            <div class="meta">마감 ${fmtDate(r.closeAt)} · ${feeText(r.fee, r.feeNegotiable)}</div>
            <div class="actions"><button type="button" class="btn pri mini-apply" data-id="${r.id}">
              <i class="ri-send-plane-line"></i> 지원하기
            </button></div>
          </div>
        </article>`).join('')
      }</div>`
    : `<div class="hscroll"><article class="card-vert"><div class="body"><div class="title">공고가 없습니다</div></div></article></div>`;

  const tplNewsList = (items)=> items?.length
    ? `<div class="news-list">${
        items.map(n=>{
          const hasImg = !!n.thumb;
          return `<article class="news-item ${hasImg?'':'noimg'}" onclick="location.href='news.html#/${encodeURIComponent(n.id)}'">
              <div>
                <div class="news-item__title">${n.title}</div>
                <div class="news-item__meta">${n.date? (fmtDate(n.date)+' · '):''}${n.summary||''}</div>
              </div>
              ${hasImg? `<div class="news-thumb"><img src="${n.thumb}" alt=""></div>`: ''}
            </article>`;
        }).join('')
      }</div>`
    : `<div class="news-list"><article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>`;

  const tplPortfolios = (items)=> items?.length
    ? `<div class="pf-hlist">${
        items.slice(0,6).map(p=>`
        <article class="pf-hcard">
          <img class="pf-avatar" src="${p.thumb||FALLBACK_IMG}" alt="">
          <div>
            <div class="pf-name">${p.nickname||'쇼호스트'}</div>
            <div class="pf-intro">${p.headline||'소개 준비 중'}</div>
            <div class="pf-actions">
              <a class="btn" href="outbox-proposals.html?to=${encodeURIComponent(p.id)}"><i class="ri-mail-send-line"></i> 제안하기</a>
              <a class="btn" href="portfolio-detail.html?id=${encodeURIComponent(p.id)}"><i class="ri-user-line"></i> 프로필 보기</a>
            </div>
          </div>
        </article>`).join('')
      }</div>`
    : `<div class="ed-grid"><article class="card-ed"><div class="card-ed__title">포트폴리오가 없습니다</div></article></div>`;

  const tplHotClips = (items)=> items?.length
    ? `<div class="shorts-hscroll" id="hotShorts">${
        items.map(s=>`
          <article class="clip-card" data-embed="${s.embed}">
            <img class="clip-thumb" src="${s.thumb||FALLBACK_IMG}" alt="">
          </article>`).join('')
      }</div>` : `<div class="shorts-hscroll"><div class="clip-empty">등록된 클립이 없습니다</div></div>`;

  const tplImageBanner = ()=>{
    const base = w.LIVEE_HOME?.CFG?.BASE_PATH || '';
    const src = base ? (base.replace(/\/$/,'')+'/ad_banner.jpg') : 'ad_banner.jpg';
    return `<a class="img-banner" href="byhen.html"><img src="${src}" alt="BYHEN 배너"></a>`;
  };

  H.tpl = {
    tplHeroSlider,
    tplLineupList, tplRecruitHScroll, tplNewsList,
    tplPortfolios, tplHotClips, tplImageBanner, sectionBlock
  };
})(window);