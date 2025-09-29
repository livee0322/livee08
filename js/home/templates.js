/* home/templates.js — v2.14.1 (hero slider + sections + models hscroll + offer trigger) */
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
    const candidates = ['banner1.jpg','banner2.jpg'];
    const imgs = candidates.filter(Boolean);
    const slides = imgs.map(src => `<div class="hero-slide"><img src="${src}" alt=""></div>`).join('');
    const dots   = imgs.map((_,i)=>`<span class="hero-dot${i===0?' is-on':''}"></span>`).join('');
    return `
      <div class="hero">
        <div class="hero-track">${slides}</div>
        <div class="hero-dots">${dots}</div>
      </div>`;
  }

  /* ---------- Hot Recruits (row-card 레이아웃) ---------- */
const tplLineupList = (items) => {
  const pickThumb = (r) => r.thumb || r.thumbnailUrl || r.coverImageUrl || FALLBACK_IMG;

  const dday = (closeAt) => {
    if (!closeAt) return '';
    const t = new Date(closeAt); t.setHours(0,0,0,0);
    const n = new Date();        n.setHours(0,0,0,0);
    const d = Math.ceil((t - n) / 86400000);
    return d > 0 ? `D-${d}` : (d === 0 ? 'D-DAY' : '마감');
  };

  const statusInfo = (r) => {
    const dd = dday(r.closeAt);
    if (r.status === 'scheduled') return { text:'예정', cls:'scheduled' };
    if (r.status === 'closed' || dd === '마감') return { text:'마감', cls:'closed' };
    return { text:'모집중', cls:'open' };
  };

  const feeText = (fee, nego) =>
    nego ? '협의' : (fee != null ? ((fee||0).toLocaleString() + '원') : '출연료 미정');

  if (!items || !items.length) {
    return `<div class="rl-list">
      <article class="rl-card" aria-disabled="true">
        <div class="rl-thumb" style="background:#f3f4f6"></div>
        <div class="rl-body">
          <div class="rl-row rl-top"><span class="rl-stat scheduled">예정</span><span class="rl-dday">D-0</span></div>
          <div class="rl-brand">브랜드</div>
          <div class="rl-title">등록된 공고가 없습니다</div>
          <div class="rl-row rl-bottom"><span></span><span class="rl-fee">출연료 미정</span></div>
        </div>
      </article>
    </div>`;
  }

  return '<div class="rl-list">' + items.map(r => {
    const stat = statusInfo(r);
    const dd   = dday(r.closeAt);
    const idQ  = encodeURIComponent(r.id);
    return `
      <article class="rl-card" onclick="location.href='recruit-detail.html?id=${idQ}'">
        <img class="rl-thumb" src="${pickThumb(r)}" alt="" loading="lazy" decoding="async">
        <div class="rl-body">
          <div class="rl-row rl-top">
            <span class="rl-stat ${stat.cls}">${stat.text}</span>
            <span class="rl-dday">${dd || ''}</span>
          </div>
          <div class="rl-brand">${r.brandName || '브랜드'}</div>
          <div class="rl-title">${r.title}</div>
          <div class="rl-row rl-bottom">
            <span></span>
            <span class="rl-fee">출연료 ${feeText(r.fee, r.feeNegotiable)}</span>
          </div>
        </div>
      </article>`;
  }).join('') + '</div>';
};

  /* ---------- Brand pick (가로 스크롤 · 대카드) ---------- */
const tplRecruitHScroll = (items) => {
  const pickThumb = (r) => r.thumb || r.thumbnailUrl || r.coverImageUrl || FALLBACK_IMG;

  const dday = (closeAt) => {
    if (!closeAt) return '';
    const t = new Date(closeAt); t.setHours(0,0,0,0);
    const n = new Date();        n.setHours(0,0,0,0);
    const d = Math.ceil((t - n) / 86400000);
    return d > 0 ? `D-${d}` : (d === 0 ? 'D-DAY' : '마감');
  };

  const statusInfo = (r) => {
    const dd = dday(r.closeAt);
    if (r.status === 'scheduled') return { text:'예정', cls:'scheduled' };
    if (r.status === 'closed' || dd === '마감') return { text:'마감', cls:'closed' };
    return { text:'모집중', cls:'open' };
  };

  const feeText = (fee, nego) =>
    nego ? '협의' : (fee != null ? ((fee||0).toLocaleString() + '원') : '출연료 미정');

  if (!items || !items.length) {
    return `<div class="hscroll">
      <article class="card-vert bp" aria-disabled="true">
        <div class="thumb-wrap"><div class="thumb" style="background:#f3f4f6"></div></div>
        <div class="body">
          <div class="bp-row bp-row--title"><div class="bp-title">공고가 없습니다</div></div>
          <div class="bp-row bp-row--cta"><a class="btn wfull" href="recruit-new.html">공고 등록</a></div>
        </div>
      </article>
    </div>`;
  }

  return '<div class="hscroll" id="brandPickH">' + items.map(r => {
    const stat = statusInfo(r);
    const dd   = dday(r.closeAt);
    const idQ  = encodeURIComponent(r.id);
    return `
      <article class="card-vert bp" onclick="location.href='recruit-detail.html?id=${idQ}'">
        <div class="thumb-wrap">
          <img class="thumb" src="${pickThumb(r)}" alt="" loading="lazy" decoding="async">
          <button class="bm" type="button" aria-label="북마크"><i class="ri-bookmark-line"></i></button>
        </div>
        <div class="body">
          <div class="bp-row bp-row--top">
            <div class="bp-brand">${r.brandName || '브랜드'}</div>
            <span class="bp-stat ${stat.cls}">${stat.text}</span>
          </div>

          <div class="bp-row bp-row--title">
            <div class="bp-title">${r.title}</div>
            <div class="bp-dday">${dd || ''}</div>
          </div>

          <div class="bp-row bp-row--fee">
            <div></div>
            <div class="bp-fee">${feeText(r.fee, r.feeNegotiable)}</div>
          </div>

          <div class="bp-row bp-row--cta" onclick="event.stopPropagation()">
            <a class="btn pri wfull" href="recruit-detail.html?id=${idQ}">지원하기</a>
          </div>
        </div>
      </article>`;
  }).join('') + '</div>';
};

  /* ---------- News ---------- */
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

  /* ---------- Portfolios (쇼호스트) ---------- */
  const tplPortfolios = (items) => items && items.length
    ? '<div class="pf-hlist">' + items.slice(0, 6).map(p => {
        const pidRaw = p.id;                      // API용 (그대로)
        const pidQ   = encodeURIComponent(pidRaw); // URL용 (인코딩)
        const name  = (p.nickname || '쇼호스트');
        const intro = (p.headline || '소개 준비 중');
        return `
        <article class="pf-hcard">
          <img class="pf-avatar" src="${p.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
          <div class="pf-info">
            <div class="pf-name">${name}</div>
            <div class="pf-intro">${intro}</div>
            <div class="pf-actions">
              <!-- 제안 모달 트리거 -->
              <button class="btn pri" type="button" data-offer data-portfolio-id="${pidRaw}">
                <i class="ri-send-plane-line"></i> 제안
              </button>
              <a class="btn" href="portfolio-detail.html?id=${pidQ}">
                <i class="ri-user-line"></i> 프로필 보기
              </a>
            </div>
            <div class="pf-moreRow">
              <span></span>
              <a href="portfolio-detail.html?id=${pidQ}" aria-label="프로필 상세보기">
                프로필 상세보기 <span class="arrow">›</span>
              </a>
            </div>
          </div>
        </article>`;
      }).join('') + '</div>'
    : '<div class="ed-grid"><article class="card-ed"><div class="card-ed__body"><div class="card-ed__title">포트폴리오가 없습니다</div><div class="card-ed__meta">첫 포트폴리오를 등록해보세요</div></div></article></div>';

  /* ---------- HOT clips ---------- */
  const tplHotClips = (items) => items && items.length
    ? `<div class="shorts-hscroll" id="hotShorts">
        ${items.map(s => `
          <article class="clip-card" data-embed="${s.embed}">
            <img class="clip-thumb" src="${s.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
            <span class="clip-play"><i class="ri-play-fill"></i></span>
          </article>`).join('')}
      </div>`
    : '<div class="shorts-hscroll"><div class="clip-empty">등록된 클립이 없습니다</div></div>';

  /* ---------- CTA image banner ---------- */
  function tplImageBanner(){
    return '<a class="img-banner" href="byhen.html" aria-label="BYHEN 안내 배너">' +
           '<img src="ad_banner.jpg" alt="BYHEN 배너">' +
           '</a>';
  }

  /* ---------- NEW: Models H-Scroll (2.5-up) ---------- */
  const tplModelsHScroll = (items) => {
    if (!items || !items.length) {
      return `<div class="hscroll models">
        <article class="card-model" aria-disabled="true">
          <div class="thumb" style="background:#f3f4f6"></div>
          <div class="body">
            <div class="name">모델이 없습니다</div>
            <div class="intro">컨셉에 맞는 모델을 곧 보여드릴게요</div>
          </div>
        </article>
      </div>`;
    }
    return `<div class="hscroll models">` + items.map(m => {
      const id     = encodeURIComponent(m.id);
      const thumb  = m.mainThumbnailUrl || m.coverImageUrl || FALLBACK_IMG;
      const name   = m.nickname || '모델';
      const intro  = m.headline || '';
      const chips = [];
      const d = (m.demographics || {});
      if (d.genderPublic && d.gender) chips.push(d.gender === 'female' ? '여성' : d.gender === 'male' ? '남성' : '기타');
      if (d.sizePublic && d.height)   chips.push(`${d.height}cm`);
      if (d.sizePublic && d.weight)   chips.push(`${d.weight}kg`);
      if (m.demographics?.sizePublic && m.agePublic && m.age) chips.push(`${m.age}세`);

      return `
        <article class="card-model" onclick="location.href='model-detail.html?id=${id}'">
          <img class="thumb" src="${thumb}" alt="" loading="lazy" decoding="async">
          <div class="body">
            <div class="name">${name}</div>
            <div class="intro">${intro}</div>
            ${chips.length ? `<div class="meta">${chips.map(c=>`<span class="chip">${c}</span>`).join('')}</div>` : ''}
          </div>
        </article>
      `;
    }).join('') + `</div>`;
  };

  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="' + (secKey || '') + '">' +
      '<div class="section-head"><h2>' + title + '</h2>' +
      '<a class="more" href="' + (moreHref || '#') + '">더보기</a></div>' +
      innerHTML + '</div>';

  H.tpl = {
    tplHeroSlider,
    tplLineupList, tplRecruitHScroll, tplNewsList,
    tplPortfolios, tplHotClips, tplImageBanner,
    tplModelsHScroll, sectionBlock
  };
})(window);