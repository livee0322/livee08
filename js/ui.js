// 상단/하단 공통 UI 모듈
(() => {
  const $ = (s, d=document) => d.querySelector(s);

  // Appbar
  $('#appbar').innerHTML = `
    <div class="lv-appbar">
      <div class="lv-appbar__in">
        <div class="lv-appbar__title">라이비</div>
        <div class="lv-appbar__icons">
          <button class="lv-ic" aria-label="알림">🔔</button>
          <button class="lv-ic" aria-label="검색">🔎</button>
          <button class="lv-ic" aria-label="로그아웃">↩︎</button>
        </div>
      </div>
    </div>
  `;

  // Top tabs
  $('#top-tabs').innerHTML = `
    <div class="lv-topTabs">
      <div class="lv-topTabs__in">
        <a class="lv-tab is-active" href="#/home">숏클립</a>
        <a class="lv-tab" href="#/live">쇼핑라이브</a>
        <a class="lv-tab" href="#/news">뉴스</a>
        <a class="lv-tab" href="#/event">이벤트</a>
        <a class="lv-tab" href="#/service">서비스</a>
      </div>
    </div>
  `;

  // Bottom tabbar
  $('#tabbar').innerHTML = `
    <div class="lv-tabbar">
      <div class="lv-tabbar__in">
        <a class="lv-tbi is-active" href="#/home">홈</a>
        <a class="lv-tbi" href="recruit-new.html">모집캠페인</a>
        <a class="lv-tbi" href="#/library">라이브러리</a>
        <a class="lv-tbi" href="#/portfolios">인플루언서</a>
        <a class="lv-tbi" href="login.html">마이페이지</a>
      </div>
    </div>
  `;
})();