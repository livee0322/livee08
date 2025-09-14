/* home/templates.js — v2.12.3 */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME || (w.LIVEE_HOME = {});
  const { util } = H;
  const FALLBACK_IMG = (H.FALLBACK_IMG || 'fallback.jpg');

  const fmtDate = util?.fmtDate || (d => (d ? String(d).slice(0,10) : '-'));
  const money   = util?.money   || (n => (n||0).toLocaleString());
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee) + '원') : '출연료 미정'));

  /* ---------- 지금 뜨는 공고 (리스트) ---------- */
  const tplLineupList = (items) => items && items.length
    ? '<div class="ed-grid">' + items.map(r =>
      '<article class="card-ed" onclick="location.href=\'recruit-detail.html?id='+ encodeURIComponent(r.id) +'\'">' +
        '<img class="card-ed__media" src="'+ (r.thumb || FALLBACK_IMG) +'" alt="" loading="lazy" decoding="async">' +
        '<div class="card-ed__body">' +
          '<div class="card-ed__eyebrow">'+ (r.brandName || '브랜드') +'</div>' +
          '<div class="card-ed__title">'+ r.title +'</div>' +
          '<div class="card-ed__meta">마감 '+ fmtDate(r.closeAt) +' · '+ feeText(r.fee, r.feeNegotiable) +'</div>' +
        '</div>' +
      '</article>').join('') + '</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">등록된 라이브가 없습니다</div><div class="card-ed__meta">브랜드 공고를 등록해보세요</div></div></article></div>';

  /* ---------- 브랜드 pick (세로 카드) ---------- */
  const tplRecruitHScroll = (items) => items && items.length
    ? '<div class="hscroll edge-scroll" id="brandPickH">' + items.map(r => {
        const rid = String(r.id);
        return (
          '<article class="card-vert" data-id="'+ rid +'">' +
            '<div class="thumb-wrap">' +
              '<img class="thumb" src="'+ (r.thumb || FALLBACK_IMG) +'" alt="" loading="lazy" decoding="async">' +
              '<button class="bm" type="button" aria-label="북마크"><i class="ri-bookmark-line"></i></button>' +
            '</div>' +
            '<div class="body">' +
              '<div class="brand">'+ (r.brandName || '브랜드') +'</div>' +
              '<div class="title">'+ r.title +'</div>' +
              '<div class="meta">마감 '+ fmtDate(r.closeAt) +' · '+ feeText(r.fee, r.feeNegotiable) +'</div>' +
              '<div class="actions">' +
                '<button type="button" class="btn btn--sm pri mini-apply" data-id="'+ rid +'">' +
                  '<i class="ri-send-plane-line"></i> 지원하기' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join('') + '</div>'
    : '<div class="hscroll edge-scroll"><article class="card-vert" aria-disabled="true"><div class="thumb-wrap"><div class="thumb" style="background:#f3f4f6"></div></div><div class="body"><div class="title">공고가 없습니다</div><div class="meta">새 공고를 등록해보세요</div></div></article></div>';

  /* ---------- 라이비 뉴스 (썸네일 우측/없으면 본문만) ---------- */
  const tplNewsList = (items) => items && items.length
    ? '<div class="news-list">' + items.map(n => {
        const hasThumb = !!(n.thumb && String(n.thumb).trim());
        return (
          '<article class="news-item'+ (hasThumb ? '' : ' noimg') +'" onclick="location.href=\'news.html#/'+ encodeURIComponent(n.id) + '\'">' +
            '<div>' +
              '<div class="news-item__title">'+ (n.title || '제목') +'</div>' +
              '<div class="news-item__meta">'+ (n.date ? (fmtDate(n.date) + ' · ') : '') + (n.summary || '소식') +'</div>' +
            '</div>' +
            (hasThumb ? ('<div class="news-thumb"><img src="'+ n.thumb +'" alt=""></div>') : '') +
          '</article>'
        );
      }).join('') + '</div>'
    : '<div class="news-list"><article class="news-item noimg"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';

  /* ---------- 포트폴리오 ---------- */
  const tplPortfolios = (items) => items && items.length
    ? '<div class="pf-hlist">' + items.slice(0, 6).map(p =>
      '<article class="pf-hcard">' +
        '<img class="pf-avatar" src="'+ (p.thumb || FALLBACK_IMG) +'" alt="" loading="lazy" decoding="async">' +
        '<div class="pf-info">' +
          '<div class="pf-name">'+ p.nickname +'</div>' +
          '<div class="pf-intro">'+ (p.headline || '소개 준비 중') +'</div>' +
          '<div class="pf-actions">' +
            '<a class="btn btn--sm" href="outbox-proposals.html?to='+ encodeURIComponent(p.id) +'"><i class="ri-mail-send-line"></i> 제안하기</a>' +
            '<a class="btn btn--sm" href="portfolio-detail.html?id='+ encodeURIComponent(p.id) +'"><i class="ri-user-line"></i> 프로필 보기</a>' +
          '</div>' +
        '</div>' +
      '</article>').join('') + '</div>'
    : '<div class="pf-hlist"><article class="pf-hcard"><div class="pf-info"><div class="pf-name">포트폴리오가 없습니다</div><div class="pf-intro">첫 포트폴리오를 등록해보세요</div></div></article></div>';

  /* ---------- HOT clips (2-up grid) ---------- */
  const tplHotClips = (items) => items && items.length
    ? '<div class="hot-grid" id="hotShorts">' + items.map(s =>
        '<article class="clip-card" data-embed="'+ (s.embed || '') +'">' +
          '<img class="clip-thumb" src="'+ (s.thumb || FALLBACK_IMG) +'" alt="" loading="lazy" decoding="async">' +
          '<span class="clip-play"><i class="ri-play-fill"></i></span>' +
        '</article>'
      ).join('') + '</div>'
    : '<div class="hot-grid"><div class="clip-card" style="background:#111;display:grid;place-items:center;color:#98a2b3">등록된 클립이 없습니다</div></div>';

  /* ---------- CTA 배너 ---------- */
  const tplCtaBanner =
    '<a class="img-banner" href="byhen.html" aria-label="BYHEN 안내 배너">' +
      '<img src="'+ ((w.LIVEE_HOME?.CFG?.BASE_PATH || '') + 'bannertest2.png') +'" alt="BYHEN 배너">' +
    '</a>';

  /* ---------- 섹션 래퍼 ---------- */
  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="'+ (secKey || '') +'">' +
      '<div class="section-head"><h2>'+ title +'</h2><a class="more" href="'+ (moreHref || '#') +'">더보기</a></div>' +
      innerHTML +
    '</div>';

  H.tpl = { tplLineupList, tplRecruitHScroll, tplNewsList, tplPortfolios, tplHotClips, tplCtaBanner, sectionBlock };
})(window);