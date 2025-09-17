/* home/fetchers.js — API fetch + user/host helpers (v2.13.3) */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME || (w.LIVEE_HOME = {});
  const { API_BASE = '/api/v1', EP = {}, util = {}, shorts = {}, FALLBACK_IMG = 'default.jpg' } = H;

  const {
    getJSON,
    parseItems,
    text,
    coalesce,
    pickThumb,
    authHeaders
  } = util;

  const { detectProvider, embedUrl, thumbUrl } = shorts;

  // ---------- helpers ----------
  const getBrandName = (c) =>
    text(
      coalesce(
        c.brandName,
        c.brand,
        c.recruit && c.recruit.brandName,
        c.brand && c.brand.name,
        c.owner && c.owner.brandName,
        c.user && c.user.brandName
      )
    ) || '브랜드';

  const getFee = (c) => {
    const raw = coalesce(c.fee, c.recruit && c.recruit.pay, c.pay);
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const isFeeNegotiable = (c) =>
    !!coalesce(c.feeNegotiable, c.recruit && c.recruit.payNegotiable, c.payNegotiable);

  // API 경로 보정
  const withBase = (p) => {
    const base = (API_BASE || '').replace(/\/$/, '');
    const path = (p || '').startsWith('/') ? p : '/' + (p || '');
    return base + path;
  };

  // ---------- fetchers ----------
  async function fetchRecruits() {
    try {
      const url = withBase(EP.RECRUITS || '/recruits');
      const arr = parseItems(await getJSON(url));
      return arr.map((c, i) => ({
        id: c.id || c._id || String(i),
        brandName: getBrandName(c),
        title: text(coalesce(c.title, c.recruit && c.recruit.title, '제목 없음')),
        thumb: pickThumb(c) || FALLBACK_IMG,
        closeAt: coalesce(c.closeAt, c.recruit && c.recruit.closeAt, c.deadline),
        fee: getFee(c),
        feeNegotiable: isFeeNegotiable(c),
      }));
    } catch {
      return [];
    }
  }

  async function fetchPortfolios() {
    // 쇼호스트(포트폴리오) 섹션용
    try {
      const url = withBase(EP.PORTFOLIOS || '/portfolio-test');
      const arr = parseItems(await getJSON(url));
      return arr.map((p, i) => ({
        id: p.id || p._id || String(i),
        nickname: text(p.nickname || p.displayName || p.name || '쇼호스트'),
        headline: text(p.headline || ''),
        thumb:
          p.mainThumbnailUrl ||
          p.mainThumbnail ||
          (Array.isArray(p.subThumbnails) && p.subThumbnails[0]) ||
          (Array.isArray(p.subImages) && p.subImages[0]) ||
          pickThumb(p) ||
          FALLBACK_IMG,
      }));
    } catch {
      return [];
    }
  }

  async function fetchModels() {
    // “컨셉에 맞는 모델 찾기” 카드용 (사각 카드 2.5개 노출)
    try {
      const url = withBase(EP.MODELS || '/models-test');
      const arr = parseItems(await getJSON(url));
      return arr.map((m, i) => ({
        id: m.id || m._id || String(i),
        nickname: text(m.nickname || '모델'),
        headline: text(m.headline || ''),
        thumb:
          m.mainThumbnailUrl ||
          (Array.isArray(m.subThumbnails) && m.subThumbnails[0]) ||
          m.coverImageUrl ||
          pickThumb(m) ||
          FALLBACK_IMG,
        tags: Array.isArray(m.tags) ? m.tags.slice(0, 5) : [],
        // 공개 필드는 상세에서 사용할 수 있도록 보존(목록은 심플하게)
        demographics: m.demographics || {},
      }));
    } catch {
      return [];
    }
  }

  async function fetchNews(fallback) {
    try {
      const url = withBase(EP.NEWS || '/news');
      const arr = parseItems(await getJSON(url));
      return arr.map((n, i) => ({
        id: n.id || n._id || String(i),
        title: text(n.title || n.headline || '뉴스'),
        date: n.publishedAt || n.createdAt || n.updatedAt,
        summary: text(n.summary || n.excerpt || ''),
        thumb: n.thumb || n.thumbnailUrl || '',
      }));
    } catch {
      // 뉴스가 없을 때 공고 일부를 뉴스처럼 보여주기
      return (fallback || []).slice(0, 6).map((r, i) => ({
        id: r.id || String(i),
        title: r.title,
        date: r.closeAt,
        summary: '브랜드 소식',
      }));
    }
  }

  async function fetchShorts() {
    try {
      const url = withBase(EP.SHORTS || '/shorts');
      const arr = parseItems(await getJSON(url));
      return arr
        .map((s, i) => {
          const link = s.sourceUrl || s.url || s.link || '';
          const provider = s.provider || detectProvider(link);
          const embed = s.embedUrl || embedUrl(provider, link);
          return {
            id: s.id || s._id || String(i),
            provider,
            thumb: s.thumbnailUrl || thumbUrl(provider, link) || FALLBACK_IMG,
            embed,
          };
        })
        .filter((x) => x.embed);
    } catch {
      return [];
    }
  }

  // ---------- user helpers ----------
  async function getMe() {
    if (!H.TOKEN) return null;
    const candidates = ['/auth/me', '/users/me', '/me'];
    for (const ep of candidates) {
      try {
        const j = await getJSON(withBase(ep), authHeaders(false));
        return j.data || j.user || j;
      } catch {}
    }
    try {
      const saved = localStorage.getItem('livee_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  function isHost(me) {
    if (!me) return false;
    const str = (v) => String(v || '').toLowerCase();
    const bag = new Set(
      [
        me.role,
        me.userRole,
        me.type,
        me.userType,
        me.accountType,
        me.kind,
        me.profile?.role,
        me.profile?.type,
        me.category,
        me.job,
        me.title,
        ...(Array.isArray(me.roles) ? me.roles : []),
        ...(Array.isArray(me.tags) ? me.tags : []),
      ]
        .filter(Boolean)
        .map(str)
    );
    const hostKeys = ['host', 'showhost', 'show-host', '쇼호스트', 'creator', 'influencer', 'mc'];
    const brandKeys = ['brand', 'advertiser', 'client', 'agency'];
    const hasHost = [...bag].some((s) => hostKeys.some((k) => s.includes(k))) || me.isHost === true;
    const looksBrand = [...bag].some((s) => brandKeys.some((k) => s.includes(k)));
    return hasHost && !looksBrand;
  }

  // 내 포트폴리오(쇼호스트) 목록
  async function fetchMyPortfolios() {
    if (!H.TOKEN) return [];
    const tryFetch = async (path) => {
      try {
        const j = await getJSON(withBase(path), authHeaders(false));
        const it = parseItems(j);
        return Array.isArray(it) ? it : [];
      } catch {
        return [];
      }
    };

    // 1) 서버 제공 쿼리
    let items = await tryFetch('/portfolio-test?mine=1&limit=100');
    if (items.length) return items;

    // 2) 내 ID로 탐색
    const me = await getMe();
    const meId = me && (me.id || me._id || me.userId);
    const candidates = meId
      ? [
          `/portfolio-test?owner=${encodeURIComponent(meId)}&limit=100`,
          `/portfolio-test?user=${encodeURIComponent(meId)}&limit=100`,
          `/portfolio-test?userId=${encodeURIComponent(meId)}&limit=100`,
          `/users/${encodeURIComponent(meId)}/portfolio-test?limit=100`,
        ]
      : [];
    for (const p of candidates) {
      items = await tryFetch(p);
      if (items.length) return items;
    }

    // 3) 전체에서 필터
    const all = await tryFetch('/portfolio-test?limit=200');
    if (meId && all.length) {
      const mine = all.filter((x) => {
        const uid = x.userId || x.ownerId || x.user?._id || x.user?.id;
        return uid && String(uid) === String(meId);
      });
      if (mine.length) return mine;
    }
    return [];
  }

  // 노출
  H.fetchers = {
    fetchRecruits,
    fetchPortfolios,
    fetchModels,
    fetchNews,
    fetchShorts,
    getMe,
    isHost,
    fetchMyPortfolios,
  };
})(window);