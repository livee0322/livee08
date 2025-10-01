/* home/templates.js — v2.16.2
 * --------------------------------------------------------------------------
 * 홈 화면 템플릿 모음
 * - Hero 슬라이더
 * - 지금 뜨는 쇼핑라이브 공고 (가로 스크롤 · 세로커버 1:1.5 · 하단 상품행)
 * - 브랜드 pick (세로 카드 가로 스크롤)
 * - 뉴스 리스트
 * - 포트폴리오(쇼호스트) 카드
 * - HOT 쇼츠
 * - 이미지 배너
 * - 모델 H-스크롤
 * - 공통 섹션 래퍼(sectionBlock)
 * --------------------------------------------------------------------------
 * 사용처: window.LIVEE_HOME.tpl.{함수명} 으로 문자열 HTML을 받아서 .innerHTML 등에 삽입
 * 주의: 이 파일은 단일 IIFE로만 내보냄(중복 IIFE 금지)
 * -------------------------------------------------------------------------- */
(function (w) {
  'use strict';

  const H = w.LIVEE_HOME || (w.LIVEE_HOME = {});
  const FALLBACK_IMG = H.FALLBACK_IMG || 'default.jpg';

  /* 유틸 보조(없어도 동작하도록 기본 제공) ----------------------------------- */
  const util = H.util || {
    fmtDate: (d) => (d ? String(d).slice(0, 10) : '-'),
    money: (n) => (n || 0).toLocaleString()
  };
  const feeText = (fee, nego) =>
    nego ? '협의' : (fee != null ? (util.money(fee) + '원') : '출연료 미정');

  /* 1) Hero slider ---------------------------------------------------------- */
  function tplHeroSlider() {
    const candidates = ['banner1.jpg', 'banner2.jpg']; // 필요 시 교체
    const imgs = candidates.filter(Boolean);
    const slides = imgs.map(src => `<div class="hero-slide"><img src="${src}" alt=""></div>`).join('');
    const dots   = imgs.map((_, i) => `<span class="hero-dot${i === 0 ? ' is-on' : ''}"></span>`).join('');
    return `
      <div class="hero">
        <div class="hero-track">${slides}</div>
        <div class="hero-dots">${dots}</div>
      </div>`;
  }

  /* 2) “지금 뜨는 쇼핑라이브 공고” (레퍼런스 스타일)
   * ------------------------------------------------------------------------
   * 카드 구성
   *   [세로 커버 1:1.5]
   *   브랜드
   *   (좌)상태칩  (우)D-day(촬영일 기준)
   *   [말머리]제목
   *   출연료
   *   ─ 상품 썸네일 | 상품명  (등록된 products에서 1개만 노출)
   *
   * 제품 선택 규칙(getFirstProduct):
   *   - products 배열이 있으면:
   *       1) title이 '쇼핑라이브'가 아니거나 marketplace !== 'etc' 인 항목 우선
   *       2) 없으면 이미지/제목 있는 첫 항목
   *   - 그래도 없으면 firstProductTitle / firstProductImage 보조 필드 사용
   * ------------------------------------------------------------------------ */
  function tplLineupList(items) {
    // 커버(세로) 우선순위: verticalCover → thumb → thumbnail → coverImage → fallback
    const pickCover = (r) =>
      r.verticalCoverUrl || r.coverVerticalUrl ||
      r.thumb || r.thumbnailUrl || r.coverImageUrl || FALLBACK_IMG;

    // 촬영일 기준 D-day
    const ddayByShoot = (shootDate) => {
      if (!shootDate) return '';
      const t = new Date(shootDate); t.setHours(0, 0, 0, 0);
      const n = new Date();         n.setHours(0, 0, 0, 0);
      const d = Math.ceil((t - n) / 86400000);
      return d > 0 ? `D-${d}` : (d === 0 ? 'D-DAY' : '마감');
    };

    // 상태칩 텍스트/클래스
    const statusInfo = (r) => {
      const dd = ddayByShoot(r.recruit?.shootDate || r.shootDate);
      if (r.status === 'scheduled') return { text: '예정', cls: 'scheduled' };
      if (r.status === 'closed' || dd === '마감') return { text: '마감', cls: 'closed' };
      return { text: '모집중', cls: 'open' };
    };

    // 등록된 product 하나 추출 (간단/안전 우선)
    function getFirstProduct(r) {
      const arr = Array.isArray(r.products) ? r.products
                : Array.isArray(r.product)  ? r.product : [];

      // 1) '쇼핑라이브'가 아닌 실제 상품(또는 marketplace가 etc가 아닌 항목) 우선
      let prod = arr.find(p =>
        p && (p.imageUrl || p.title) &&
        (String(p.title || '').trim() !== '쇼핑라이브' || (p.marketplace && p.marketplace !== 'etc'))
      );
      // 2) 없으면 이미지/제목 있는 첫 항목
      if (!prod) prod = arr.find(p => p && (p.imageUrl || p.title));
      // 3) 서버가 보조 필드를 주는 경우
      if (!prod && (r.firstProductTitle || r.firstProductImage)) {
        return { title: r.firstProductTitle || '', imageUrl: r.firstProductImage || '' };
      }
      return prod ? { title: prod.title || '', imageUrl: prod.imageUrl || '' } : { title: '', imageUrl: '' };
    }

    // 비어있는 경우
    if (!items || !items.length) {
      return `
        <div class="now-hscroll">
          <article class="now-card is-empty" aria-disabled="true">
            <div class="now-thumb" style="background:#f3f4f6"></div>
            <div class="now-body">
              <div class="now-brand">브랜드</div>
              <div class="now-row"><span class="now-stat open">모집중</span><span class="now-dday">D-0</span></div>
              <div class="now-title">등록된 공고가 없습니다</div>
              <div class="now-fee">출연료 미정</div>
            </div>
          </article>
        </div>`;
    }

    // 카드 렌더
    return `<div class="now-hscroll">` + items.map(r => {
      const idQ   = encodeURIComponent(r.id);
      const stat  = statusInfo(r);
      const dday  = ddayByShoot(r.recruit?.shootDate || r.shootDate) || '';
      const cover = pickCover(r);
      const p     = getFirstProduct(r);

      return `
        <article class="now-card" onclick="location.href='recruit-detail.html?id=${idQ}'">
          <img class="now-thumb" src="${cover}" alt="" loading="lazy" decoding="async">

          <div class="now-body">
            <div class="now-brand">${r.brandName || '브랜드'}</div>

            <div class="now-row">
              <span class="now-stat ${stat.cls}">${stat.text}</span>
              <span class="now-dday">${dday}</span>
            </div>

            <div class="now-title">${r.title || ''}</div>
            <div class="now-fee">출연료 ${r.feeNegotiable ? '협의' : (r.fee != null ? (r.fee.toLocaleString() + '원') : '미정')}</div>

            ${ (p.title || p.imageUrl) ? `
              <div class="prod-row" onclick="event.stopPropagation()">
                ${p.imageUrl ? `<img class="prod-thumb" src="${p.imageUrl}" alt="" loading="lazy">`
                              : `<div class="prod-thumb"></div>`}
                <div class="prod-name">${p.title || ''}</div>
              </div>` : ``}
          </div>
        </article>`;
    }).join('') + `</div>`;
  }

  /* 3) 브랜드 pick(세로 카드 가로 스크롤) ---------------------------------- */
  function tplRecruitHScroll(items) {
    if (!items || !items.length) {
      return `<div class="hscroll"><article class="card-vert" aria-disabled="true">
        <div class="thumb-wrap"><div class="thumb" style="background:#f3f4f6"></div></div>
        <div class="body"><div class="title">공고가 없습니다</div><div class="meta">새 공고를 등록해보세요</div></div>
      </article></div>`;
    }
    return '<div class="hscroll" id="brandPickH">' + items.map(r => `
      <article class="card-vert bp" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(r.id)}'">
        <div class="thumb-wrap">
          <img class="thumb" src="${r.thumb || r.thumbnailUrl || r.coverImageUrl || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
          <button class="bm" type="button" aria-label="북마크"><i class="ri-bookmark-line"></i></button>
        </div>
        <div class="body">
          <div class="bp-row bp-row--top">
            <div class="bp-brand">${r.brandName || '브랜드'}</div>
            <span class="bp-stat ${r.status==='closed'?'closed':(r.status==='scheduled'?'scheduled':'open')}">
              ${r.status==='closed'?'마감':(r.status==='scheduled'?'예정':'모집중')}
            </span>
          </div>
          <div class="bp-row bp-row--title">
            <div class="bp-title">${r.title}</div>
            <div class="bp-dday"></div>
          </div>
          <div class="bp-row bp-row--fee">
            <div></div>
            <div class="bp-fee">${feeText(r.fee, r.feeNegotiable)}</div>
          </div>
          <div class="bp-row bp-row--cta" onclick="event.stopPropagation()">
            <a class="btn pri wfull" href="recruit-detail.html?id=${encodeURIComponent(r.id)}">지원하기</a>
          </div>
        </div>
      </article>`).join('') + '</div>';
  }

  /* 4) 뉴스 리스트 ---------------------------------------------------------- */
  function tplNewsList(items) {
    return items && items.length
      ? '<div class="news-list">' + items.map(n => {
          const thumb = n.thumb || '';
          const hasImg = !!thumb;
          return `
          <article class="news-item ${hasImg ? '' : 'noimg'}" onclick="location.href='news.html#/${encodeURIComponent(n.id)}'">
            <div>
              <div class="news-item__title">${n.title}</div>
              <div class="news-item__meta">${n.date ? (util.fmtDate(n.date) + ' · ') : ''}${n.summary || ''}</div>
            </div>
            ${hasImg ? `<div class="news-thumb"><img src="${thumb}" alt="" loading="lazy"></div>` : ''}
          </article>`;
        }).join('') + '</div>'
      : '<div class="news-list"><article class="news-item"><div class="news-item__title">표시할 뉴스가 없습니다</div></article></div>';
  }

  /* 5) 포트폴리오(쇼호스트) 카드 ------------------------------------------- */
  function tplPortfolios(items) {
    return items && items.length
      ? '<div class="pf-hlist">' + items.slice(0, 6).map(p => {
          const pidRaw = p.id;
          const pidQ   = encodeURIComponent(pidRaw);
          const name  = p.nickname || '쇼호스트';
          const intro = p.headline || '소개 준비 중';
          return `
          <article class="pf-hcard">
            <img class="pf-avatar" src="${p.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
            <div class="pf-info">
              <div class="pf-name">${name}</div>
              <div class="pf-intro">${intro}</div>
              <div class="pf-actions">
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
  }

  /* 6) HOT clips ------------------------------------------------------------ */
  function tplHotClips(items) {
    return items && items.length
      ? `<div class="shorts-hscroll" id="hotShorts">
          ${items.map(s => `
            <article class="clip-card" data-embed="${s.embed}">
              <img class="clip-thumb" src="${s.thumb || FALLBACK_IMG}" alt="" loading="lazy" decoding="async">
              <span class="clip-play"><i class="ri-play-fill"></i></span>
            </article>`).join('')}
        </div>`
      : '<div class="shorts-hscroll"><div class="clip-empty">등록된 클립이 없습니다</div></div>';
  }

  /* 7) CTA 이미지 배너 ------------------------------------------------------ */
  function tplImageBanner(){
    return '<a class="img-banner" href="byhen.html" aria-label="BYHEN 안내 배너">' +
           '<img src="ad_banner.jpg" alt="BYHEN 배너">' +
           '</a>';
  }

  /* 8) 모델 H-스크롤(2.5-up 느낌) ----------------------------------------- */
  function tplModelsHScroll(items) {
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
      const d = m.demographics || {};
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
        </article>`;
    }).join('') + `</div>`;
  }

  /* 9) 공통 섹션 래퍼 ------------------------------------------------------- */
  const sectionBlock = (title, moreHref, innerHTML, secKey) =>
    '<div class="section" data-sec="' + (secKey || '') + '">' +
      '<div class="section-head"><h2>' + title + '</h2>' +
      '<a class="more" href="' + (moreHref || '#') + '">더보기</a></div>' +
      innerHTML + '</div>';

  /* 내보내기 --------------------------------------------------------------- */
  H.tpl = {
    tplHeroSlider,
    tplLineupList,          // ← 지금 뜨는 공고(세로커버 1:1.5 + 상품행)
    tplRecruitHScroll,
    tplNewsList,
    tplPortfolios,
    tplHotClips,
    tplImageBanner,
    tplModelsHScroll,
    sectionBlock
  };
})(window);