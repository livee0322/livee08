(() => {
  // 상단 앱바
  const appbar = document.getElementById('appbar');
  if (appbar) {
    appbar.innerHTML = `
      <div class="appbar">
        <div class="appbar__in">
          <div class="appbar__title">라이비</div>
          <div class="appbar__actions">
            <button class="ic-btn" aria-label="알림">🔔</button>
            <button class="ic-btn" aria-label="검색">🔍</button>
            <button class="ic-btn" aria-label="로그아웃">↩︎</button>
          </div>
        </div>
      </div>`;
  }

  // 상단 탭
  const topTabs = document.getElementById('top-tabs');
  if (topTabs) {
    topTabs.innerHTML = `
      <div class="topTabs">
        <div class="topTabs__in">
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
      <div class="tabbar">
        <div class="tabbar__in">
          <a class="tbi is-active" href="#/home"><i>🏠</i><span>홈</span></a>
          <a class="tbi" href="recruit-new.html"><i>🗂️</i><span>모집캠페인</span></a>
          <a class="tbi" href="#/library"><i>🔖</i><span>라이브러리</span></a>
          <a class="tbi" href="#/portfolios"><i>👤</i><span>인플루언서</span></a>
          <a class="tbi" href="login.html"><i>⚙️</i><span>마이페이지</span></a>
        </div>
      </div>`;
  }
})();