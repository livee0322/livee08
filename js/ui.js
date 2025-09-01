/* App Shell + Icons */
(() => {
  const shell = document.getElementById('app-shell');

  const Icon = {
    bell:`<svg viewBox="0 0 24 24" fill="none"><path d="M15 18H9m9-1V11a6 6 0 0 0-12 0v6l-2 2h16l-2-2Z"/><path d="M9 18a3 3 0 1 0 6 0"/></svg>`,
    search:`<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>`,
    logout:`<svg viewBox="0 0 24 24" fill="none"><path d="M15 12H3"/><path d="M7 8 3 12l4 4"/><path d="M21 3v18"/></svg>`,
    home:`<svg viewBox="0 0 24 24" fill="none"><path d="M3 10 12 3l9 7v10H3V10Z"/><path d="M9 21V12h6v9"/></svg>`,
    list:`<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    bookmark:`<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>`,
    user:`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`
  };

  const tabs = `
    <nav class="tabs" role="navigation" aria-label="상단 탭">
      <a class="tab active" href="#/home">숏클립</a>
      <a class="tab" href="#/live">쇼핑라이브</a>
      <a class="tab" href="#/news">뉴스</a>
      <a class="tab" href="#/event">이벤트</a>
      <a class="tab" href="#/service">서비스</a>
    </nav>`;

  shell.innerHTML = `
    <header class="appbar" role="banner">
      <div class="row">
        <div class="logo">라이비</div>
        <div class="spacer"></div>
        <button class="icon-btn" aria-label="알림" id="btnNotify">${Icon.bell}</button>
        <button class="icon-btn" aria-label="검색" id="btnSearch">${Icon.search}</button>
        <button class="icon-btn" aria-label="로그아웃" id="btnLogout">${Icon.logout}</button>
      </div>
      ${tabs}
    </header>

    <footer class="tabbar" role="contentinfo">
      <a class="tbi active" href="#/home" aria-current="page">${Icon.home}<span>홈</span></a>
      <a class="tbi" href="recruit-new.html">${Icon.list}<span>모집캠페인</span></a>
      <a class="tbi" href="#/library">${Icon.bookmark}<span>라이브러리</span></a>
      <a class="tbi" href="#/portfolios">${Icon.user}<span>인플루언서</span></a>
      <a class="tbi" href="login.html">${Icon.user}<span>마이</span></a>
    </footer>
  `;

  // 로그아웃(토큰 제거)
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    ['livee_token','liveeToken','liveeName','liveeRole','liveeTokenExp'].forEach(k=>localStorage.removeItem(k));
    alert('로그아웃되었습니다.');
    location.href = 'login.html';
  });

  // 간단 검색/알림 placeholder
  document.getElementById('btnSearch')?.addEventListener('click', ()=>alert('검색 준비중'));
  document.getElementById('btnNotify')?.addEventListener('click', ()=>alert('알림 준비중'));
})();