(() => {
  // ---------- 상단 앱바 ----------
  const appbar = document.getElementById('appbar');
  if (appbar) {
    appbar.innerHTML = `
      <div class="appbar">
        <div class="appbar__in">
          <div class="appbar__title">라이비</div>
          <div class="appbar__actions">
            <button class="ic-btn" aria-label="알림"><i class="ri-notification-3-line" aria-hidden="true"></i></button>
            <button class="ic-btn" aria-label="검색"><i class="ri-search-line" aria-hidden="true"></i></button>
            <button class="ic-btn" aria-label="로그아웃"><i class="ri-logout-box-r-line" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>`;
  }

  // ---------- 상단 탭 ----------
  const topTabs = document.getElementById('top-tabs');
  if (topTabs) {
    topTabs.innerHTML = `
      <div class="topTabs">
        <div class="topTabs__in" role="tablist" aria-label="상단 탭">
          <a class="tab is-active" role="tab" href="#/home" aria-selected="true">숏클립</a>
          <a class="tab" role="tab" href="#/live" aria-selected="false">쇼핑라이브</a>
          <a class="tab" role="tab" href="#/news" aria-selected="false">뉴스</a>
          <a class="tab" role="tab" href="#/event" aria-selected="false">이벤트</a>
          <a class="tab" role="tab" href="#/service" aria-selected="false">서비스</a>
        </div>
      </div>`;
  }

  // ---------- 하단 탭바 ----------
  const bottom = document.getElementById('bottom-tabs');
  if (bottom) {
    // 안전한 고정 레이아웃: 5등분 그리드, 아이콘+라벨 수직 정렬
    bottom.innerHTML = `
      <div class="tabbar" role="navigation" aria-label="하단 탭">
        <div class="tabbar__in">
          <a class="tbi is-active" href="#/home">
            <i class="ri-home-5-line" aria-hidden="true"></i>
            <span>홈</span>
          </a>
          <a class="tbi" href="recruit-new.html">
            <i class="ri-archive-stack-line" aria-hidden="true"></i>
            <span>모집캠페인</span>
          </a>
          <a class="tbi" href="#/library">
            <i class="ri-bookmark-3-line" aria-hidden="true"></i>
            <span>라이브러리</span>
          </a>
          <a class="tbi" href="#/portfolios">
            <i class="ri-user-3-line" aria-hidden="true"></i>
            <span>인플루언서</span>
          </a>
          <a class="tbi" href="login.html">
            <i class="ri-user-settings-line" aria-hidden="true"></i>
            <span>마이페이지</span>
          </a>
        </div>
      </div>`;
  }
})();