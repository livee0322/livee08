// js/ui.js (drop-in, 뉴스 탭 -> news.html + active sync)
(() => {
  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn)
      : fn();

  ready(() => {
    const getToken = () =>
      localStorage.getItem('livee_token') ||
      localStorage.getItem('liveeToken') ||
      '';

    /* ---------- 상단 앱바 ---------- */
    const appbar = document.getElementById('appbar');
    if (appbar) {
      const isLogin = !!getToken();
      appbar.innerHTML = `
        <div class="lv-appbar">
          <div class="lv-title">라이비</div>
          <div class="lv-actions">
            <a class="lv-action" href="#/alerts" aria-label="알림"><i class="ri-notification-3-line"></i></a>
            <a class="lv-action" href="#/search" aria-label="검색"><i class="ri-search-line"></i></a>
            <a class="lv-action" href="${isLogin ? 'login.html?logout=1' : 'login.html'}"
               aria-label="${isLogin ? '로그아웃' : '로그인'}">
              <i class="${isLogin ? 'ri-logout-box-r-line' : 'ri-login-box-line'}"></i>
            </a>
          </div>
        </div>`;
    }

    /* ---------- 상단 탭 ---------- */
    const top = document.getElementById('top-tabs');
    if (top) {
      const path = location.pathname.replace(/\/+$/, ''); // trailing slash 제거

      top.innerHTML = `
        <div class="lv-topTabs">
          <div class="lv-topTabs__in">
            <a class="tab" data-tab="home" href="index.html#/">숏클립</a>
            <a class="tab" data-tab="live" href="index.html#/live">쇼핑라이브</a>
            <a class="tab" data-tab="news" href="news.html">뉴스</a>   <!-- ← 루트 news.html 로 이동 -->
            <a class="tab" data-tab="event" href="index.html#/event">이벤트</a>
            <a class="tab" data-tab="service" href="index.html#/service">서비스</a>
          </div>
        </div>`;

      // 활성 탭 동기화
      const setActive = (name) => {
        top.querySelectorAll('.tab').forEach(el =>
          el.classList.toggle('is-active', el.dataset.tab === name)
        );
      };
      if (/\/news\.html$/.test(path)) {
        setActive('news');
      } else if (location.hash.startsWith('#/live')) {
        setActive('live');
      } else if (location.hash.startsWith('#/event')) {
        setActive('event');
      } else if (location.hash.startsWith('#/service')) {
        setActive('service');
      } else {
        setActive('home');
      }
    }

    /* ---------- 하단 탭 ---------- */
    const ensure = (id) => {
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
      return el;
    };
    const bottom = ensure('bottom-tabs');
    const myHref = getToken() ? 'mypage.html' : 'login.html';

    bottom.innerHTML = `
      <div class="lv-tabbar">
        <div class="lv-tabbar__in">
          <a class="tbi is-active" href="index.html"><i class="ri-home-line"></i><span>홈</span></a>
          <a class="tbi" href="recruit-new.html"><i class="ri-archive-drawer-line"></i><span>모집캠페인</span></a>
          <a class="tbi" href="#/library"><i class="ri-bookmark-2-line"></i><span>라이브러리</span></a>
          <a class="tbi" href="portfolio-list.html"><i class="ri-user-3-line"></i><span>인플루언서</span></a>
          <a class="tbi" href="${myHref}"><i class="ri-user-settings-line"></i><span>마이페이지</span></a>
        </div>
      </div>`;
  });
})();