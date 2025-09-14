/* home/templates.js — HTML builders for sections (vertical brand pick) */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME || (w.LIVEE_HOME = {});
  const { util } = H;
  const FALLBACK_IMG = (H.FALLBACK_IMG || 'fallback.jpg');
  const { fmtDate, money } = util || {
    fmtDate: (d) => (d ? String(d).slice(0,10) : '-'),
    money: (n) => (n||0).toLocaleString()
  };
  const feeText = (fee, nego) => (nego ? '협의' : (fee != null ? (money(fee) + '원') : '출연료 미정'));

  /* ----- lineup (list) ----- */
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

  /* ----- 브랜드 pick: vertical card ----- */
  const tplRecruitHScroll = (items) => items && items.length
    ? '<div class="hscroll" id="brandPickH">' + items.map(r => {
        const rid = String(r.id);
        return `
        <article class="card-vert" data-id="${rid}">
          <div class="thumb-wrap">
            <img class="thumb" src="${r.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
            <button class="bm" type="button" aria-label="북마크"><i class="ri-bookmark-line"></i></button>
          </div>
          <div class="body">
            <div class="brand">${r.brandName || '브랜드'}</div>
            <div class="title">${r.title}</div>
            <div class="meta">마감 ${fmtDate(r.closeAt)} · ${feeText(r.fee, r.feeNegotiable)}</div>
            <div class="actions">
              <button type="button" class="btn btn--sm pri mini-apply" data-id="${rid}">
                <i class="ri-send-plane-line"></i> 지원하기
              </button>
            </div>
          </div>
        </article>`;
      }).join('') + '</div>'
    : `<div class="hscroll"><article class="card-vert" aria-disabled="true">
         <div class="thumb-wrap"><div class="thumb" style="background:#f3f4f6"></div></div>
         <div class="body"><div class="title">공고가 없습니다</div><div class="meta">새 공고를 등록해보세요</div></div>
       </article></div>`;

  /* ----- news (좌본문 · 우썸네일) ----- */
const tplNewsList = (items) => items && items.length
  ? '<div class="news-list">' + items.map(n => {
      const id = encodeURIComponent(n.id);
      const thumb = n.thumb || n.image || n.img || '';
      const dateTxt = (n.date ? (fmtDate(n.date) + ' · ') : '');
      // 이미지 유무에 따라 noimg 클래스로 그리드 폭 자동 조정
      return (
        `<article class="news-item${thumb ? '' : ' noimg'}" onclick="location.href='news.html#/${id}'">
           <div>
             <div class="news-item__title">${n.title}</div>
             <div class="news-item__meta">${dateTxt}${n.summary || '소식'}</div>
           </div>
           ${thumb ? (
             `<div class="news-thumb"><img src="${thumb}" alt="" loading="lazy" decoding="async"></div>`
           ) : ''}
         </article>`
      );
    }).join('') + '</div>'
  : '<div class="news-list"><article class="news-item noimg"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';

  /* ----- portfolios ----- */
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

  /* ----- HOT clips ----- */
  const tplHotClips = (items) => items && items.length
    ? `<div class="shorts-hscroll" id="hotShorts">
        ${items.map(s => `
          <article class="clip-card" data-embed="${s.embed}">
            <img class="clip-thumb" src="${s.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
            <span class="clip-play"><i class="ri-play-fill"></i></span>
          </article>`).join('')}
      </div>`
    : '<div class="shorts-hscroll"><div class="clip-empty">등록된 클립이 없습니다</div></div>';

  /* ----- CTA banner ----- */
  const tplCtaBanner =
    '<div class="cta-banner" role="region" aria-label="상담 배너"><div class="cta-copy">' +
      '<div class="cta-kicker">무료 상담</div><div class="cta-title">지금 바로 라이브 커머스 시작해보세요</div>' +
      '<div class="cta-sub">기획 · 섭외 · 계약 · 결제까지 도와드립니다</div></div>' +
      '<div class="cta-actions"><a class="btn" href="recruit-new.html"><i class="ri-megaphone-line"></i> 공고 올리기</a>' +
      '<a class="btn" href="help.html#contact"><i class="ri-chat-1-line"></i> 빠른 문의</a></div></div>';

  /* ----- section wrapper ----- */
  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="' + (secKey || '') + '"><div class="section-head"><h2>' + title + '</h2><a class="more" href="' + (moreHref || '#') + '">더보기</a></div>' + innerHTML + '</div>';

  H.tpl = { tplLineupList, tplRecruitHScroll, tplNewsList, tplPortfolios, tplHotClips, tplCtaBanner, sectionBlock };
})(window);

/* === Image Banner (HOT clip 아래) === */
(function () {
  'use strict';
  const H = (window.HomeHelpers ||= {
    appendStyleOnce(id, css) {
      if (document.getElementById(id)) return;
      const st = document.createElement('style');
      st.id = id; st.textContent = css;
      document.head.appendChild(st);
    }
  });
  const T = (window.HomeTemplates ||= {});

  H.appendStyleOnce('img-banner-css', `
    .img-banner{display:block;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
    .img-banner img{width:100%;display:block;height:auto}
  `);

  T.tplImageBanner = function () {
    const base = (window.LIVEE_HOME?.CFG?.BASE_PATH || '');
    const src = base ? (base + '/bannertest2.png') : 'bannertest2.png';
    return '<a class="img-banner" href="byhen.html" aria-label="BYHEN 안내 배너">'
         +   '<img src="'+src+'" alt="BYHEN 배너">'
         + '</a>';
  };
})();