/* home/fetchers.js — API fetch + user/host helpers (models robust) */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { API_BASE, EP, util, shorts, FALLBACK_IMG } = H;
  const { getJSON, parseItems, text, coalesce, pickThumb, authHeaders } = util;
  const { detectProvider, embedUrl, thumbUrl } = shorts;

  const getBrandName = (c) => text(coalesce(
    c.brandName, c.brand, c.recruit && c.recruit.brandName,
    c.brand && c.brand.name, c.owner && c.owner.brandName,
    c.user && c.user.brandName
  )) || '브랜드';

  const getFee = (c) => {
    const raw = coalesce(c.fee, c.recruit && c.recruit.pay, c.pay);
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const isFeeNegotiable = (c) => !!coalesce(
    c.feeNegotiable, c.recruit && c.recruit.payNegotiable, c.payNegotiable
  );

  async function fetchRecruits() {
    try {
      const url = API_BASE + (EP.RECRUITS?.startsWith('/') ? EP.RECRUITS : '/' + EP.RECRUITS);
      const arr = parseItems(await getJSON(url));
      return arr.map((c, i) => ({
        id: c.id || c._id || String(i),
        brandName: getBrandName(c),
        title: text(coalesce(c.title, c.recruit && c.recruit.title, '제목 없음')),
        thumb: pickThumb(c),
        closeAt: coalesce(c.closeAt, c.recruit && c.recruit.closeAt),
        fee: getFee(c),
        feeNegotiable: isFeeNegotiable(c)
      }));
    } catch (_) { return []; }
  }

  async function fetchPortfolios() {
    try {
      const url = API_BASE + (EP.PORTFOLIOS?.startsWith('/') ? EP.PORTFOLIOS : '/' + EP.PORTFOLIOS);
      const arr = parseItems(await getJSON(url));
      return arr.map((p, i) => ({
        id: p.id || p._id || String(i),
        nickname: text(p.nickname || p.displayName || p.name || '쇼호스트'),
        headline: text(p.headline || ''),
        thumb: pickThumb(p)
      }));
    } catch (_) { return []; }
  }

  // 🔹 추가: 모델 가져오기(엔드포인트 자동 탐색 + 느슨한 필터)
  async function fetchModels(limit = 10) {
    const tryPaths = [
      EP?.MODELS,                 // 설정에 있으면 최우선
      '/model-test',              // 스키마명 기반
      '/models', '/model',        // 일반 관례
      '/api/models', '/api/model' // 혹시 모를 프록시
    ].filter(Boolean);

    const tryFetch = async (p) => {
      try {
        const url = API_BASE + (p.startsWith('/') ? p : '/' + p);
        const j = await getJSON(url);
        return parseItems(j);
      } catch { return []; }
    };

    let items = [];
    for (const p of tryPaths) {
      items = await tryFetch(p);
      if (items.length) break;
    }
    if (!items.length) return [];

    // 모델 스키마 호환 매핑
    const mapped = items.map((m, i) => {
      const thumb = pickThumb(m) || m.mainThumbnailUrl || m.coverImageUrl || (Array.isArray(m.subThumbnails) && m.subThumbnails[0]) || FALLBACK_IMG;
      return {
        id: m.id || m._id || String(i),
        nickname: text(m.nickname || m.displayName || m.name || '모델'),
        headline: text(m.headline || m.bio || ''),
        thumb,
        status: m.status,
        visibility: m.visibility
      };
    });

    // 너무 엄격하지 않게: published/public 우선, 없으면 전부 표시
    const published = mapped.filter(x =>
      (!x.status || x.status === 'published') &&
      (!x.visibility || x.visibility === 'public')
    );
    const show = published.length ? published : mapped;

    return (limit && limit > 0) ? show.slice(0, limit) : show;
  }

  async function fetchNews(fallback) {
    try {
      const url = API_BASE + (EP.NEWS?.startsWith('/') ? EP.NEWS : '/' + EP.NEWS);
      const arr = parseItems(await getJSON(url));
      return arr.map((n, i) => ({
        id: n.id || n._id || String(i),
        title: text(n.title || n.headline || '뉴스'),
        date: n.publishedAt || n.createdAt || n.updatedAt,
        summary: text(n.summary || n.excerpt || '')
      }));
    } catch (_) {
      return (fallback || []).slice(0, 6).map((r, i) => ({
        id: r.id || String(i), title: r.title, date: r.closeAt, summary: '브랜드 소식'
      }));
    }
  }

  async function fetchShorts() {
    try {
      const url = API_BASE + (EP.SHORTS?.startsWith('/') ? EP.SHORTS : '/' + EP.SHORTS);
      const arr = parseItems(await getJSON(url));
      return arr.map((s, i) => {
        const link = s.sourceUrl || s.url || s.link || '';
        const provider = s.provider || detectProvider(link);
        return {
          id: s.id || s._id || String(i),
          provider,
          thumb: s.thumbnailUrl || thumbUrl(provider, link) || FALLBACK_IMG,
          embed: s.embedUrl || embedUrl(provider, link)
        };
      }).filter(x => x.embed);
    } catch (_) { return []; }
  }

  async function getMe() {
    if (!H.TOKEN) return null;
    const candidates = ['/auth/me', '/users/me', '/me'];
    for (const ep of candidates) {
      try {
        const j = await getJSON(API_BASE + ep, authHeaders(false));
        return j.data || j.user || j;
      } catch {}
    }
    try {
      const saved = localStorage.getItem('livee_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }

  function isHost(me) {
    if (!me) return false;
    const str = (v) => String(v || '').toLowerCase();
    const bag = new Set(
      [
        me.role, me.userRole, me.type, me.userType, me.accountType, me.kind,
        me.profile?.role, me.profile?.type, me.category, me.job, me.title,
        ...(Array.isArray(me.roles) ? me.roles : []),
        ...(Array.isArray(me.tags) ? me.tags : [])
      ].filter(Boolean).map(str)
    );
    const hostKeys = ['host', 'showhost', 'show-host', '쇼호스트', 'creator', 'influencer', 'mc'];
    const brandKeys = ['brand', 'advertiser', 'client', 'agency'];
    const hasHost = [...bag].some(s => hostKeys.some(k => s.includes(k))) || me.isHost === true;
    const looksBrand = [...bag].some(s => brandKeys.some(k => s.includes(k)));
    return hasHost && !looksBrand;
  }

  async function fetchMyPortfolios() {
    if (!H.TOKEN) return [];
    const tryFetch = async (path) => {
      try {
        const j = await getJSON(API_BASE + path, authHeaders(false));
        const it = parseItems(j);
        return Array.isArray(it) ? it : [];
      } catch { return []; }
    };
    let items = await tryFetch('/portfolio-test?mine=1&limit=100');
    if (items.length) return items;

    const me = await getMe();
    const meId = me && (me.id || me._id || me.userId);
    const candidates = meId ? [
      `/portfolio-test?owner=${encodeURIComponent(meId)}&limit=100`,
      `/portfolio-test?user=${encodeURIComponent(meId)}&limit=100`,
      `/portfolio-test?userId=${encodeURIComponent(meId)}&limit=100`,
      `/users/${encodeURIComponent(meId)}/portfolio-test?limit=100`
    ] : [];
    for (const p of candidates) {
      items = await tryFetch(p);
      if (items.length) return items;
    }

    const all = await tryFetch('/portfolio-test?limit=200');
    if (meId && all.length) {
      const mine = all.filter(x => {
        const uid = x.userId || x.ownerId || x.user?._id || x.user?.id;
        return uid && String(uid) === String(meId);
      });
      if (mine.length) return mine;
    }
    return [];
  }

  // ⬅️ 여기 export에 fetchModels 추가!
  H.fetchers = {
    fetchRecruits, fetchPortfolios, fetchModels,
    fetchNews, fetchShorts, getMe, isHost, fetchMyPortfolios
  };
})(window);