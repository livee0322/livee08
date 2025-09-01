(() => {
  // ===== 상단 앱바 =====
  const appbar = document.getElementById('appbar');
  if (appbar) {
    appbar.innerHTML = `
      <header class="lv-appbar" role="banner">
        <div class="lv-appbar__in">
          <div class="lv-appbar__title">라이비</div>
          <nav class="lv-appbar__icons" aria-label="빠른 액션">
            <button class="lv-ic" aria-label="알림"><i class="ri-notification-3-line"></i></button>
            <button class="lv-ic" aria-label="검색"><i class="ri-search-line"></i></button>
            <button class="lv-ic" aria-label="로그아웃"><i class="ri-logout-box-r-line"></i></button>
          </nav>
        </div>
      </header>`;
  }

  // ===== 상단 탭 =====
  const topTabs = document.getElementById('top-tabs');
  if (topTabs) {
    topTabs.innerHTML = `
      <nav class="lv-topTabs" role="navigation" aria-label="상단 탭">
        <div class="lv-topTabs__in">
          <a class="lv-tab is-active" href="#/home">숏클립</a>
          <a class="lv-tab" href="#/live">쇼핑라이브</a>
          <a class="lv-tab" href="#/news">뉴스</a>
          <a class="lv-tab" href="#/event">이벤트</a>
          <a class="lv-tab" href="#/service">서비스</a>
        </div>
      </nav>`;
  }

  // ===== 하단 탭 =====
  const bottom = document.getElementById('bottom-tabs');
  if (bottom) {
    bottom.innerHTML = `
      <footer class="lv-tabbar" role="contentinfo" aria-label="하단 탭">
        <div class="lv-tabbar__in">
          <a class="lv-tbi is-active" href="#/home">
            <i class="ri-home-line"></i><span>홈</span>
          </a>
          <a class="lv-tbi" href="recruit-new.html">
            <i class="ri-file-list-3-line"></i><span>모집캠페인</span>
          </a>
          <a class="lv-tbi" href="#/library">
            <i class="ri-book-open-line"></i><span>라이브러리</span>
          </a>
          <a class="lv-tbi" href="#/portfolios">
            <i class="ri-user-3-line"></i><span>인플루언서</span>
          </a>
          <a class="lv-tbi" href="login.html">
            <i class="ri-user-settings-line"></i><span>마이페이지</span>
          </a>
        </div>
      </footer>`;
  }
})();