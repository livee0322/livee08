<script>
(() => {
  const shell = document.getElementById('app-shell');
  shell.innerHTML = `
    <header class="lv-appbar">
      <div class="row">
        <div class="lv-logo">라이비</div>
        <div class="lv-spacer"></div>
        <button class="lv-ico" title="알림">🔔</button>
        <button class="lv-ico" title="검색">🔎</button>
        <button class="lv-ico" title="로그아웃">↩️</button>
      </div>
    </header>

    <nav class="lv-top-tabs" role="navigation" aria-label="상단 탭">
      <div class="in">
        <a class="lv-tab active" href="#/home">숏클립</a>
        <a class="lv-tab" href="#/live">쇼핑라이브</a>
        <a class="lv-tab" href="#/news">뉴스</a>
        <a class="lv-tab" href="#/event">이벤트</a>
        <a class="lv-tab" href="#/service">서비스</a>
      </div>
    </nav>

    <footer class="tabbar">
      <div class="in">
        <a class="tbi active" href="#/home"><i>🏠</i>홈</a>
        <a class="tbi" href="recruit-new.html"><i>📅</i>모집캠페인</a>
        <a class="tbi" href="#/library"><i>🔖</i>라이브러리</a>
        <a class="tbi" href="#/portfolios"><i>👤</i>인플루언서</a>
        <a class="tbi" href="login.html"><i>⚙️</i>마이</a>
      </div>
    </footer>
  `;
})();
</script>