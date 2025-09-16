/* ui.js — v3.0.5 (Top tabs nowrap + scroll, bottom tabs, helpers, logo.png in AppBar) */
(() => {
  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  // -------- Common helpers --------
  (() => {
    'use strict';
    const $ = (s, el = document) => el.querySelector(s);
    window.UI = {
      openDrawer(id){ const el=document.getElementById(id); if(!el) return; el.classList.add('open'); el.setAttribute('aria-hidden','false'); document.documentElement.style.overflow='hidden'; },
      closeDrawer(id){ const el=document.getElementById(id); if(!el) return; el.classList.remove('open'); el.setAttribute('aria-hidden','true'); document.documentElement.style.overflow=''; },
      toast(msg){
        let t = $('#__toast');
        if(!t){ t=document.createElement('div'); t.id='__toast';
          t.style.cssText='position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:12px;font-weight:800;z-index:1200;transition:opacity .2s';
          document.body.appendChild(t);
        }
        t.textContent=msg; t.style.opacity='1';
        clearTimeout(t.__to); t.__to=setTimeout(()=>t.style.opacity='0',1300);
      },
      qs(){ return new URLSearchParams(location.search); },
      setQs(params){ const q=new URLSearchParams(params); history.replaceState(null,'',location.pathname+'?'+q.toString()); },
    };
  })();

  ready(() => {
    const getToken = () =>
      localStorage.getItem('livee_token') ||
      localStorage.getItem('liveeToken') || '';

   /* ui.js — appbar logo image patch */
(() => {
  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  ready(() => {
    const appbar = document.getElementById('appbar');
    if (!appbar) return;

    // 현재 문서 기준 상대경로로 로고 경로 생성
    // 루트에 logo.png가 있다면 './logo.png'가 가장 안전 (GitHub Pages 호환)
    const logoSrc = './logo.png?v=1';

    appbar.innerHTML = `
      <div class="lv-appbar" role="banner"
           style="display:flex;align-items:center;gap:8px;justify-content:space-between;
                  padding:12px 16px;border-bottom:1px solid #eef1f5;background:#fff;
                  position:sticky;top:0;z-index:900">
        <a href="index.html" class="lv-logo" aria-label="라이비 홈"
           style="display:flex;align-items:center;gap:10px;text-decoration:none">
          <img src="${logoSrc}" alt="라이비" width="124" height="32"
               style="display:block;height:28px;width:auto;object-fit:contain"/>
        </a>
        <div class="lv-actions" role="group" aria-label="빠른 작업" style="display:flex;gap:10px">
          <a class="lv-action" href="#/alerts" aria-label="알림">
            <i class="ri-notification-3-line" style="font-size:20px"></i>
          </a>
          <a class="lv-action" href="#/search" aria-label="검색">
            <i class="ri-search-line" style="font-size:20px"></i>
          </a>
          <a class="lv-action" href="${
            (localStorage.getItem('livee_token') || localStorage.getItem('liveeToken')) ? 'login.html?logout=1' : 'login.html'
          }" aria-label="${
            (localStorage.getItem('livee_token') || localStorage.getItem('liveeToken')) ? '로그아웃' : '로그인'
          }">
            <i class="${
              (localStorage.getItem('livee_token') || localStorage.getItem('liveeToken'))
                ? 'ri-logout-box-r-line'
                : 'ri-login-box-line'
            }" style="font-size:20px"></i>
          </a>
        </div>
      </div>`;
  });
})();


    /* ---------- Top Tabs (underline + nowrap scroll) ---------- */
    const top = document.getElementById('top-tabs');
    if (top) {
      const path = location.pathname.replace(/\/+$/, '');
      top.innerHTML = `
        <nav class="lv-topTabs" role="navigation" aria-label="상단 탭"
             style="background:#fff;border-bottom:1px solid #eef1f5">
          <div class="lv-topTabs__in"
               style="display:block;white-space:nowrap;overflow-x:auto;overflow-y:hidden;padding:10px 16px;-webkit-overflow-scrolling:touch;scrollbar-width:none">
            <a class="tab" data-tab="home"    href="shorts.html">숏클립</a>
            <a class="tab" data-tab="live"    href="index.html#/live">쇼핑라이브</a>
            <a class="tab" data-tab="news"    href="news.html">뉴스</a>
            <a class="tab" data-tab="event"   href="index.html#/event">이벤트</a>
            <a class="tab" data-tab="service" href="index.html#/service">서비스</a>
          </div>
        </nav>`;
      top.querySelectorAll('.tab').forEach((el)=>{
        el.style.display='inline-block';
        el.style.marginRight='18px';
        el.style.padding='10px 2px';
        el.style.fontWeight='800';
        el.style.position='relative';
        el.style.textDecoration='none';
        el.style.userSelect='none';
      });
      const setActive = (name) => {
        top.querySelectorAll('.tab').forEach((el) => {
          const active = el.dataset.tab === name;
          el.style.color = active ? '#111827' : '#64748b';
          el.style.background = 'linear-gradient(currentColor,currentColor) left calc(100% + 6px)/'+(active?'100%':'0')+' 2px no-repeat';
          el.style.transition = 'background-size .25s';
        });
      };
      if (/\/news\.html$/.test(path))       setActive('news');
      else if (location.hash.startsWith('#/live'))    setActive('live');
      else if (location.hash.startsWith('#/event'))   setActive('event');
      else if (location.hash.startsWith('#/service')) setActive('service');
      else setActive('home');
    }

    /* ---------- Bottom Tabs (fixed) ---------- */
    const ensure = (id) =>
      document.getElementById(id) || (()=>{ const el=document.createElement('div'); el.id=id; document.body.appendChild(el); return el; })();
    const bottom = ensure('bottom-tabs');
    const myHref = getToken() ? 'mypage.html' : 'login.html';
    bottom.innerHTML = `
      <nav class="lv-tabbar" role="navigation" aria-label="하단 탭"
           style="position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #eef1f5;z-index:1000">
        <div class="lv-tabbar__in"
             style="display:grid;grid-template-columns:repeat(5,1fr);height:calc(64px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom)">
          <a class="tbi" href="index.html"           style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#64748b"><i class="ri-home-line" style="font-size:20px"></i><span style="font-size:12px">홈</span></a>
          <a class="tbi" href="recruit-list.html"    style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#64748b"><i class="ri-archive-drawer-line" style="font-size:20px"></i><span style="font-size:12px">모집캠페인</span></a>
          <a class="tbi" href="models.html"          style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#64748b"><i class="ri-user-star-line" style="font-size:20px"></i><span style="font-size:12px">모델</span></a>
          <a class="tbi" href="portfolio-list.html"  style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#64748b"><i class="ri-user-3-line" style="font-size:20px"></i><span style="font-size:12px">포트폴리오</span></a>
          <a class="tbi" href="${myHref}"             style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#64748b"><i class="ri-user-settings-line" style="font-size:20px"></i><span style="font-size:12px">마이페이지</span></a>
        </div>
      </nav>`;
    const root = document.querySelector('main') || document.body;
    const pb = parseInt(getComputedStyle(root).paddingBottom || '0', 10);
    root.style.paddingBottom = 'calc('+ Math.max(pb, 88) +'px + env(safe-area-inset-bottom))';
  });
})();

