/* home/templates.js — HTML builders for sections */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, FALLBACK_IMG } = H;
  const { fmtDate, money } = util;
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee) + '원') : '출연료 미정'));

  const tplLineupList = (items) => items && items.length
    ? '<div class="ed-grid">' + items.map(r =>
      '<article class="card-ed" onclick="location.href=\'recruit-detail.html?id=' + encodeURIComponent(r.id) + '\'">' +
        '<img class="card-ed__media" src="' + (r.thumb || FALLBACK_IMG) + '" alt="" loading="lazy" decoding="async">' +
        '<div class="card-ed__body">' +
          '<div class="card-ed__eyebrow">' + (r.brandName || '브랜드') + '</div>' +
          '<div class="card-ed__title">' + r.title + '</div>' +
          '<div class="card-ed__meta">마감 ' + fmtDate(r.closeAt) + ' · ' + feeText(r.fee, r.feeNegotiable) + '</div>' +
        '</div>' +
      '</article>').join('') + '</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">등록된 라이브가 없습니다</div><div class="card-ed__meta">브랜드 공고를 등록해보세요</div></div></article></div>';

  const tplRecruitHScroll = (items) => items && items.length
    ? '<div class="hscroll" id="brandPickH">' + items.map(r =>
      '<article class="card-mini" data-id="' + String(r.id) + '">' +
        '<img class="mini-thumb" src="' + (r.thumb || FALLBACK_IMG) + '" alt="" loading="lazy" decoding="async">' +
        '<div>' +
          '<div class="lv-brand">' + (r.brandName || '브랜드') + '</div>' +
          '<div class="mini-title">' + r.title + '</div>' +
          '<div class="mini-meta">마감 ' + fmtDate(r.closeAt) + ' · ' + feeText(r.fee, r.feeNegotiable) + '</div>' +
          '<div class="mini-actions" style="margin-top:8px;display:flex;gap:8px;align-items:center;">' +
            '<button type="button" class="btn btn--sm mini-apply" data-id="' + String(r.id) + '"><i class="ri-send-plane-line"></i> 지원하기</button>' +
          '</div>' +
        '</div>' +
        '<button class="mini-bookmark" aria-label="북마크"><i class="ri-bookmark-line"></i></button>' +
      '</article>').join('') + '</div>'
    : '<div class="hscroll"><article class="card-mini" aria-disabled="true"><div class="mini-thumb" style="background:#f3f4f6"></div><div><div class="mini-title">공고가 없습니다</div><div class="mini-meta">새 공고를 등록해보세요</div></div></article></div>';

  const tplNewsList = (items) => items && items.length
    ? '<div class="news-list">' + items.map(n =>
      '<article class="news-item" onclick="location.href=\'news.html#/' + encodeURIComponent(n.id) + '\'">' +
        '<div class="news-item__title">' + n.title + '</div>' +
        '<div class="news-item__meta">' + (n.date ? (fmtDate(n.date) + ' · ') : '') + (n.summary || '소식') + '</div>' +
      '</article>').join('') + '</div>'
    : '<div class="news-list"><article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';

  const tplPortfolios = (items) => items && items.length
    ? '<div class="pf-hlist">' + items.slice(0, 6).map(p =>
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
      '</article>').join('') + '</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">포트폴리오가 없습니다</div><div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div></div></article></div>';

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

  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="' + (secKey || '') + '"><div class="section-head"><h2>' + title + '</h2><a class="more" href="' + (moreHref || '#') + '">더보기</a></div>' + innerHTML + '</div>';

  H.tpl = { tplLineupList, tplRecruitHScroll, tplNewsList, tplPortfolios, tplHotClips, tplCtaBanner, sectionBlock };
})(window);