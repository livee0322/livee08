/* ui.js — v3.0.0 (공통 AppBar/Top/Bottom + UI Helper) */
(() => {
  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  // ---------- UI helpers (global) ----------
  (function () {
    'use strict';
    const $ = (s, el = document) => el.querySelector(s);

    window.UI = {
      openDrawer(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('open');
        el.setAttribute('aria-hidden', 'false');
        document.documentElement.style.overflow = 'hidden';
      },
      closeDrawer(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
      },
      toast(msg) {
        let t = $('#__toast');
        if (!t) {
          t = document.createElement('div');
          t.id = '__toast';
          t.style.cssText =
            'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:12px;font-weight:800;z-index:80;transition:opacity .25s;';
          document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = '1';
        setTimeout(() => (t.style.opacity = '0'), 1300);
      },
      qs() {
        return new URLSearchParams(location.search);
      },
      setQs(params) {
        const q = new URLSearchParams(params);
        const url = location.pathname + (q.toString() ? '?' + q.toString() : '');
        history.replaceState(null, '', url);
      },
    };
  })();

  // ---------- Bars ----------
  ready(() => {
    const getToken = () =>
      localStorage.getItem('livee_token') ||
      localStorage.getItem('liveeToken') ||
      '';
    const isLogin = !!getToken();

    const ensure = (id) =>
      document.getElementById(id) ||
      (() => {
        const el = document.createElement('div');
        el.id = id;
        document.body.prepend(el);
        return el;
      })();

    /* AppBar */
    const appbar = ensure('appbar');
    appbar.innerHTML = `
      <div class="lv-appbar" role="banner" style="position:sticky;top:0;background:#fff;z-index:50;border-bottom:1px solid #eef1f5">
        <div class="lv-title" style="font-weight:900;font-size:20px;padding:14px 16px">라이비</div>
        <div class="lv-actions" style="position:absolute;right:8px;top:6px;display:flex;gap:4px">
          <a class="lv-action" href="#/alerts" aria-label="알림" style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px"><i class="ri-notification-3-line"></i></a>
          <a class="lv-action" href="#/search" aria-label="검색" style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px"><i class="ri-search-line"></i></a>
          <a class="lv-action" href="${isLogin ? 'login.html?logout=1' : 'login.html'}" aria-label="${isLogin ? '로그아웃' : '로그인'}" style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px">
            <i class="${isLogin ? 'ri-logout-box-r-line' : 'ri-login-box-line'}"></i>
          </a>
        </div>
      </div>`;

    /* Top Tabs */
    const top = ensure('top-tabs');
    const path = location.pathname.replace(/\/+$/, '');
    top.innerHTML = `
      <nav class="lv-topTabs" role="navigation" aria-label="상단 탭" style="border-bottom:1px solid #eef1f5;background:#fff">
        <div class="lv-topTabs__in" style="display:flex;gap:18px;padding:0 16px;overflow:auto;scrollbar-width:none">
          <a class="tab" data-tab="home" href="index.html#/">숏클립</a>
          <a class="tab" data-tab="live" href="index.html#/live">쇼핑라이브</a>
          <a class="tab" data-tab="news" href="news.html">뉴스</a>
          <a class="tab" data-tab="event" href="index.html#/event">이벤트</a>
          <a class="tab" data-tab="service" href="index.html#/service">서비스</a>
          <a class="tab" data-tab="recruit" href="recruit-list.html">모집캠페인</a>
        </div>
      </nav>`;
    const setTopActive = (name) => {
      top.querySelectorAll('.tab').forEach((el) =>
        el.classList.toggle('is-active', el.dataset.tab === name)
      );
    };
    if (/\/recruit-list\.html$/.test(path)) setTopActive('recruit');
    else if (/\/news\.html$/.test(path)) setTopActive('news');
    else if (location.hash.startsWith('#/live')) setTopActive('live');
    else if (location.hash.startsWith('#/event')) setTopActive('event');
    else if (location.hash.startsWith('#/service')) setTopActive('service');
    else setTopActive('home');

    /* Bottom Tabs */
    const bottom = ensure('bottom-tabs');
    const myHref = isLogin ? 'mypage.html' : 'login.html';
    const activeKey = /recruit-list\.html$/.test(path)
      ? 'recruit'
      : /portfolio-list\.html$/.test(path)
      ? 'pf'
      : /mypage\.html$/.test(path)
      ? 'my'
      : 'home';
    bottom.innerHTML = `
      <nav class="lv-tabbar" role="navigation" aria-label="하단 탭" style="position:sticky;bottom:0;background:#fff;border-top:1px solid #eef1f5;z-index:40">
        <div class="lv-tabbar__in" style="display:grid;grid-template-columns:repeat(5,1fr);height:64px">
          <a class="tbi ${activeKey==='home'?'is-active':''}" href="index.html"><i class="ri-home-line"></i><span>홈</span></a>
          <a class="tbi ${activeKey==='recruit'?'is-active':''}" href="recruit-list.html"><i class="ri-archive-drawer-line"></i><span>모집캠페인</span></a>
          <a class="tbi" href="#/library"><i class="ri-bookmark-2-line"></i><span>라이브러리</span></a>
          <a class="tbi ${activeKey==='pf'?'is-active':''}" href="portfolio-list.html"><i class="ri-user-3-line"></i><span>인플루언서</span></a>
          <a class="tbi ${activeKey==='my'?'is-active':''}" href="${myHref}"><i class="ri-user-settings-line"></i><span>마이페이지</span></a>
        </div>
      </nav>`;
  });
})();