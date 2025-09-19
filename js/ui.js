/* ui.js — v3.0.6
 * - Top tabs: nowrap + scroll
 * - Bottom tabs
 * - Helpers (UI.openDrawer/closeDrawer/toast/qs/setQs)
 * - AppBar 로고(logo.png) + 아이콘
 * - ✅ 링크 기본 파란색/밑줄 제거(visited 포함) + 탭/탭바 앵커 일괄 무밑줄 처리
 */
(() => {
  'use strict';

  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  // -------- Common helpers --------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  window.UI = {
    openDrawer(id){
      const el = document.getElementById(id); if(!el) return;
      el.classList.add('open'); el.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow = 'hidden';
    },
    closeDrawer(id){
      const el = document.getElementById(id); if(!el) return;
      el.classList.remove('open'); el.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow = '';
    },
    toast(msg){
      let t = $('#__toast');
      if(!t){
        t = document.createElement('div'); t.id='__toast';
        t.style.cssText = 'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);' +
          'background:#111827;color:#fff;padding:10px 14px;border-radius:12px;' +
          'font-weight:800;z-index:1200;transition:opacity .2s';
        document.body.appendChild(t);
      }
      t.textContent = msg; t.style.opacity = '1';
      clearTimeout(t.__to); t.__to = setTimeout(()=> t.style.opacity='0', 1300);
    },
    qs(){ return new URLSearchParams(location.search); },
    setQs(params){
      const q = new URLSearchParams(params);
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : ''));
    }
  };

  // -------- Global link style patch (no blue, no underline) --------
  // 방문/활성/포커스 상태까지 통일 + 탭 하이라이트 제거
  const style = document.createElement('style');
  style.textContent = `
    :root { --lv-ink:#111827; --lv-sub:#64748b; }
    /* 모든 앵커 기본값을 상속 컬러 + 밑줄 제거 */
    a, a:visited, a:hover, a:active, a:focus {
      color: inherit;
      text-decoration: none;
    }
    /* 탭/탭바/앱바 내 앵커도 동일 적용 + 탭 하이라이트 제거 */
    .lv-topTabs a, .lv-tabbar a, .lv-appbar a,
    .lv-topTabs a:visited, .lv-tabbar a:visited, .lv-appbar a:visited {
      color: inherit;
      text-decoration: none;
      -webkit-tap-highlight-color: transparent;
      outline: none;
    }
    /* 키보드 접근성: 포커스시만 미세 테두리 */
    a:focus-visible { outline: 2px solid rgba(79,70,229,.35); outline-offset: 2px; border-radius: 8px; }
  `;
  document.head.appendChild(style);

  ready(() => {
    const getToken = () =>
      localStorage.getItem('livee_token') ||
      localStorage.getItem('liveeToken') || '';

    // ---------- AppBar ----------
    const appbar = document.getElementById('appbar');
    if (appbar) {
      const logoSrc = './logo.png?v=1';
      appbar.innerHTML = `
        <div class="lv-appbar" role="banner"
             style="display:flex;align-items:center;gap:8px;justify-content:space-between;
                    padding:12px 16px;border-bottom:1px solid #eef1f5;background:#fff;
                    position:sticky;top:0;z-index:900">
          <a href="index.html" class="lv-logo" aria-label="라이비 홈"
             style="display:flex;align-items:center;gap:10px">
            <img src="${logoSrc}" alt="라이비" width="124" height="32"
                 style="display:block;height:28px;width:auto;object-fit:contain"/>
          </a>
          <div class="lv-actions" role="group" aria-label="빠른 작업" style="display:flex;gap:10px;color:var(--lv-sub)">
            <a class="lv-action" href="#/alerts" aria-label="알림"><i class="ri-notification-3-line" style="font-size:20px"></i></a>
            <a class="lv-action" href="#/search" aria-label="검색"><i class="ri-search-line" style="font-size:20px"></i></a>
            <a class="lv-action" href="${getToken() ? 'login.html?logout=1' : 'login.html'}"
               aria-label="${getToken() ? '로그아웃' : '로그인'}">
              <i class="${getToken() ? 'ri-logout-box-r-line' : 'ri-login-box-line'}" style="font-size:20px"></i>
            </a>
          </div>
        </div>`;
    }

    // ---------- Top Tabs (underline animation + nowrap scroll) ----------
    const top = document.getElementById('top-tabs');
    if (top) {
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
      $$('.tab', top).forEach((el)=>{
        el.style.display='inline-block';
        el.style.marginRight='18px';
        el.style.padding='10px 2px';
        el.style.fontWeight='800';
        el.style.position='relative';
        el.style.userSelect='none';
        el.style.color='var(--lv-sub)';
        // 밑줄 애니메이션
        el.style.background='linear-gradient(#111, #111) left calc(100% + 6px)/0 2px no-repeat';
        el.style.transition='background-size .25s,color .2s';
      });
      const path = location.pathname.replace(/\/+$/, '');
      const setActive = (name) => {
        $$('.tab', top).forEach((el) => {
          const active = el.dataset.tab === name;
          el.style.color = active ? 'var(--lv-ink)' : 'var(--lv-sub)';
          el.style.backgroundSize = active ? '100% 2px' : '0 2px';
        });
      };
      if (/\/news\.html$/.test(path))       setActive('news');
      else if (location.hash.startsWith('#/live'))    setActive('live');
      else if (location.hash.startsWith('#/event'))   setActive('event');
      else if (location.hash.startsWith('#/service')) setActive('service');
      else setActive('home');
    }

    // ---------- Bottom Tabs ----------
    const ensure = (id) =>
      document.getElementById(id) || (()=>{ const el=document.createElement('div'); el.id=id; document.body.appendChild(el); return el; })();
    const bottom = ensure('bottom-tabs');
    const myHref = getToken() ? 'mypage.html' : 'login.html';
    bottom.innerHTML = `
      <nav class="lv-tabbar" role="navigation" aria-label="하단 탭"
           style="position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #eef1f5;z-index:1000">
        <div class="lv-tabbar__in"
             style="display:grid;grid-template-columns:repeat(5,1fr);height:calc(64px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom)">
          <a class="tbi" href="index.html"           style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--lv-sub)"><i class="ri-home-line" style="font-size:20px"></i><span style="font-size:12px">홈</span></a>
          <a class="tbi" href="recruit-board.html"   style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--lv-sub)"><i class="ri-archive-drawer-line" style="font-size:20px"></i><span style="font-size:12px">모집캠페인</span></a>
          <a class="tbi" href="models.html"          style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--lv-sub)"><i class="ri-user-star-line" style="font-size:20px"></i><span style="font-size:12px">모델</span></a>
          <a class="tbi" href="portfolio-list.html"  style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--lv-sub)"><i class="ri-user-3-line" style="font-size:20px"></i><span style="font-size:12px">포트폴리오</span></a>
          <a class="tbi" href="${myHref}"            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--lv-sub)"><i class="ri-user-settings-line" style="font-size:20px"></i><span style="font-size:12px">마이페이지</span></a>
        </div>
      </nav>`;
    const root = document.querySelector('main') || document.body;
    const pb = parseInt(getComputedStyle(root).paddingBottom || '0', 10);
    root.style.paddingBottom = 'calc('+ Math.max(pb, 88) +'px + env(safe-area-inset-bottom))';
  });
})();