/* home/fetchers.js — API fetch + user/host helpers */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { API_BASE, EP, util, shorts, FALLBACK_IMG } = H;
  const { getJSON, parseItems, text, coalesce, pickThumb, authHeaders } = util;
  const { detectProvider, embedUrl, thumbUrl } = shorts;

  const getBrandName = (c) => text(coalesce(c.brandName, c.brand, c.recruit && c.recruit.brandName, c.brand && c.brand.name, c.owner && c.owner.brandName, c.user && c.user.brandName)) || '브랜드';
  const getFee = (c) => { const raw = coalesce(c.fee, c.recruit && c.recruit.pay, c.pay); const n = Number(raw); return Number.isFinite(n) ? n : undefined; };
  const isFeeNegotiable = (c) => !!coalesce(c.feeNegotiable, c.recruit && c.recruit.payNegotiable, c.payNegotiable);

  async function fetchRecruits() {
    try {
      const url = API_BASE + (EP.RECRUITS.startsWith('/') ? EP.RECRUITS : '/' + EP.RECRUITS);
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
      const url = API_BASE + (EP.PORTFOLIOS.startsWith('/') ? EP.PORTFOLIOS : '/' + EP.PORTFOLIOS);
      const arr = parseItems(await getJSON(url));
      return arr.map((p, i) => ({
        id: p.id || p._id || String(i),
        nickname: text(p.nickname || p.displayName || p.name || '쇼호스트'),
        headline: text(p.headline || ''),
        thumb: pickThumb(p)
      }));
    } catch (_) { return []; }
  }

  async function fetchNews(fallback) {
    try {
      const url = API_BASE + (EP.NEWS.startsWith('/') ? EP.NEWS : '/' + EP.NEWS);
      const arr = parseItems(await getJSON(url));
      return arr.map((n, i) => ({
        id: n.id || n._id || String(i),
        title: text(n.title || n.headline || '뉴스'),
        date: n.publishedAt || n.createdAt || n.updatedAt,
        summary: text(n.summary || n.excerpt || '')
      }));
    } catch (_) {
      return (fallback || []).slice(0, 6).map((r, i) => ({ id: r.id || String(i), title: r.title, date: r.closeAt, summary: '브랜드 소식' }));
    }
  }

  async function fetchShorts() {
    try {
      const url = API_BASE + (EP.SHORTS.startsWith('/') ? EP.SHORTS : '/' + EP.SHORTS);
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
      try { const j = await getJSON(API_BASE + ep, authHeaders(false)); return j.data || j.user || j; } catch (_) {}
    }
    try { const saved = localStorage.getItem('livee_user'); return saved ? JSON.parse(saved) : null; } catch { return null; }
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
    const tryFetch = async (path) => { try { const j = await getJSON(API_BASE + path, authHeaders(false)); const it = parseItems(j); return Array.isArray(it) ? it : []; } catch (_) { return []; } };
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
    for (const p of candidates) { items = await tryFetch(p); if (items.length) return items; }

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

  H.fetchers = { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts, getMe, isHost, fetchMyPortfolios };
})(window);