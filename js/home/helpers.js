/* home/helpers.js — core utils, cfg, shorts helpers */
(function (w) {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const appendStyleOnce = (id, css) => {
    if (document.getElementById(id)) return;
    const st = document.createElement('style'); st.id = id; st.textContent = css;
    document.head.appendChild(st);
  };

  const CFG = w.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP = CFG.endpoints || {};
  const EP_RECRUITS   = EP.recruits   || '/recruit-test?status=published&limit=20';
  const EP_PORTFOLIOS = EP.portfolios || '/portfolio-test?status=published&limit=12';
  const EP_NEWS       = EP.news       || '/news-test?status=published&limit=10';
  const EP_APPLY      = EP.apply      || '/applications-test';
  const EP_SHORTS     = EP.shorts     || '/shorts-test?status=published&limit=12';

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const asset = (name) => (CFG.BASE_PATH ? (CFG.BASE_PATH + '/' + name) : name);
  const FALLBACK_IMG = CFG.placeholderThumb || asset('default.jpg');

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (iso) => { if (!iso) return '미정'; const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0, 10); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  const money = (v) => (v == null ? '' : Number(v).toLocaleString('ko-KR'));
  const text = (v) => (v == null ? '' : String(v).trim());
  const coalesce = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');

  const pickThumb = (o) => o && (
    o.mainThumbnailUrl || o.thumbnailUrl ||
    (Array.isArray(o.subThumbnails) && o.subThumbnails[0]) ||
    (Array.isArray(o.subImages) && o.subImages[0]) ||
    o.coverImageUrl || o.imageUrl || o.thumbUrl || FALLBACK_IMG
  );

  const authHeaders = (json = true) => { const h = { Accept: 'application/json' }; if (json) h['Content-Type'] = 'application/json'; if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`; return h; };
  async function getJSON(url, headers = { Accept: 'application/json' }) {
    const r = await fetch(url, { headers }); let j = null;
    try { j = await r.json(); } catch(_) {}
    if (!r.ok || (j && j.ok === false)) throw new Error((j && j.message) || ('HTTP_' + r.status));
    return j || {};
  }
  const parseItems = (j) => (Array.isArray(j) ? j : j.items || (j.data && (j.data.items || j.data.docs)) || j.docs || []);

  // Shorts helpers
  const ytId = (u = '') => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/) || [])[1] || '';
  const igId = (u = '') => (u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/) || [])[1] || '';
  const tkId = (u = '') => (u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) || [])[1] || '';
  const detectProvider = (u = '') =>
    /youtu\.?be|youtube\.com/.test(u) ? 'youtube' :
    /instagram\.com/.test(u)         ? 'instagram' :
    /tiktok\.com/.test(u)            ? 'tiktok' : 'etc';
  const embedUrl = (p, u) =>
    p === 'youtube'   ? (ytId(u) ? `https://www.youtube.com/embed/${ytId(u)}` : '') :
    p === 'instagram' ? (igId(u) ? `https://www.instagram.com/reel/${igId(u)}/embed` : '') :
    p === 'tiktok'    ? (tkId(u) ? `https://www.tiktok.com/embed/v2/${tkId(u)}` : '') : '';
  const thumbUrl = (p, u) => p === 'youtube' && ytId(u) ? `https://img.youtube.com/vi/${ytId(u)}/hqdefault.jpg` : '';

  w.LIVEE_HOME = Object.assign(w.LIVEE_HOME || {}, {
    CFG, API_BASE, EP: { RECRUITS: EP_RECRUITS, PORTFOLIOS: EP_PORTFOLIOS, NEWS: EP_NEWS, APPLY: EP_APPLY, SHORTS: EP_SHORTS },
    TOKEN, FALLBACK_IMG,
    util: { $, on, appendStyleOnce, fmtDate, money, text, coalesce, pickThumb, authHeaders, getJSON, parseItems },
    shorts: { ytId, igId, tkId, detectProvider, embedUrl, thumbUrl }
  });
})(window);