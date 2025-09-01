(() => {
  // 상단 앱바
  const appbar = document.getElementById('appbar');
  if (appbar) {
    appbar.innerHTML = `
      <div class="lv-appbar">
        <div class="lv-title">라이비</div>
        <div class="lv-actions">
          <a class="lv-action" href="#/alerts" aria-label="알림"><i class="ri-notification-3-line"></i></a>
          <a class="lv-action" href="#/search" aria-label="검색"><i class="ri-search-line"></i></a>
          <a class="lv-action" href="login.html" aria-label="로그아웃"><i class="ri-logout-box-r-line"></i></a>
        </div>
      </div>`;
  }

  // 상단 탭
  const top = document.getElementById('top-tabs');
  if (top) {
    top.innerHTML = `
      <div class="lv-topTabs">
        <div class="lv-topTabs__in">
          <a class="tab is-active" href="#/home">숏클립</a>
          <a class="tab" href="#/live">쇼핑라이브</a>
          <a class="tab" href="#/news">뉴스</a>
          <a class="tab" href="#/event">이벤트</a>
          <a class="tab" href="#/service">서비스</a>
        </div>
      </div>`;
  }

  // 하단 탭
  const bottom = document.getElementById('bottom-tabs');
  if (bottom) {
    bottom.innerHTML = `
      <div class="lv-tabbar">
        <div class="lv-tabbar__in">
          <a class="tbi is-active" href="#/home"><i class="ri-home-line"></i><span>홈</span></a>
          <a class="tbi" href="recruit-new.html"><i class="ri-archive-drawer-line"></i><span>모집캠페인</span></a>
          <a class="tbi" href="#/library"><i class="ri-bookmark-2-line"></i><span>라이브러리</span></a>
          <a class="tbi" href="#/portfolios"><i class="ri-user-3-line"></i><span>인플루언서</span></a>
          <a class="tbi" href="login.html"><i class="ri-user-settings-line"></i><span>마이페이지</span></a>
        </div>
      </div>`;
  }
})();