/* js/mypage.js — v1.1
   - 모든 이동 경로는 ROUTES 한 곳에서만 관리
   - HTML에는 실제 링크를 하드코딩하지 않음(중복 제거)
*/
(() => {
  const $  = (s) => document.querySelector(s);
  const $id= (s) => document.getElementById(s);

  // ====== 중앙 경로 관리 ======
  const ROUTES = {
    // 브랜드
    myRecruit:        'myrecruit.html',     // ✅ 내가 등록한 공고
    recruitNew:       'recruit-new.html',   // 공고 올리기
    applicantsBrand:  'applications-brand.html', // 지원자 관리(브랜드)
    outboxProposals:  'outbox-proposals.html',
    bookmarksPf:      'bookmarks-portfolios.html',

    // 쇼호스트
    myPortfolio:      'myportfolio.html',
    myApplies:        'applications.html',  // 내 지원 내역
    inboxProposals:   'inbox-proposals.html', // 받은 제안
    bookmarksJobs:    'bookmarks.html',

    // 공통
    settings:         'settings.html',
    notify:           'settings-notify.html',
    login:            'login.html'
  };

  // ====== mount header/tabbar ======
  try {
    const CFG = window.LIVEE_CONFIG || {};
    window.LIVEE_UI?.mountHeader?.({ title: '마이페이지' });
    window.LIVEE_UI?.mountTopTabs?.({ active: null });
    window.LIVEE_UI?.mountTabbar?.({ active: 'mypage' });
    // 기본 아바타
    $id('mpAvatar').src = CFG.placeholderThumb || 'assets/default.jpg';
  } catch(_) {}

  // ====== auth/me ======
  const token =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');

  async function fetchMe(){
    if(!token) return null;
    const headers = { 'Authorization':'Bearer '+token, 'Accept':'application/json' };
    for (const p of ['/users/me','/auth/me','/me']) {
      try {
        const r = await fetch(API_BASE + p, { headers });
        const j = await r.json().catch(()=>null);
        if (r.ok && j) return j.data || j.user || j;
      } catch(_) {}
    }
    return null;
  }

  function rolesOf(u){
    if (!u) return [];
    return Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  }
  function hasRole(u, role){
    const rs = rolesOf(u);
    return rs.includes(role) || rs.includes('admin');
  }

  // ====== Guard(modal) ======
  const guard = $id('mpGuard');
  const guardClose = $id('guardClose');
  const guardTitle = $id('guardTitle');
  const guardDesc  = $id('guardDesc');
  const guardAction= $id('guardAction');
  guardClose?.addEventListener('click', ()=> guard.classList.remove('show'));

  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  function setGuard(kind){
    if (kind === 'login') {
      guardTitle.textContent = '로그인이 필요합니다';
      guardDesc.textContent  = '로그인 후 이용해 주세요.';
      guardAction.textContent= '로그인하기';
      guardAction.href       = `${ROUTES.login}?returnTo=${here}`;
    } else if (kind === 'host') {
      guardTitle.textContent = '쇼호스트 권한이 필요합니다';
      guardDesc.textContent  = '쇼호스트 인증 후 이용하실 수 있어요.';
      guardAction.textContent= '권한 문의';
      guardAction.href       = 'help.html#host';
    } else if (kind === 'brand') {
      guardTitle.textContent = '브랜드 권한이 필요합니다';
      guardDesc.textContent  = '브랜드 인증 후 이용하실 수 있어요.';
      guardAction.textContent= '권한 문의';
      guardAction.href       = 'help.html#brand';
    }
  }

  // ====== 메뉴 정의 (경로는 ROUTES만 참조) ======
  const MENUS = {
    brand: [
      { icon:'ri-file-list-2-line', title:'내 공고 관리',  sub:'진행/마감/정산 상태', href: ROUTES.myRecruit,      guard:'brand' },
      { icon:'ri-megaphone-line',   title:'공고 올리기',    sub:'라이브 캠페인/출연 공고 등록', href: ROUTES.recruitNew,     guard:'brand' },
      { icon:'ri-team-line',        title:'지원자 관리',    sub:'대기/합격/계약/결제(에스크로)', href: ROUTES.applicantsBrand, guard:'brand' },
      { icon:'ri-mail-send-line',   title:'보낸 제안',      sub:'쇼호스트에게 보낸 제안 내역',  href: ROUTES.outboxProposals, guard:'brand' },
      { icon:'ri-star-line',        title:'찜한 포트폴리오', sub:'관심 쇼호스트 모아보기',       href: ROUTES.bookmarksPf,    guard:'login' },
    ],
    showhost: [
      { icon:'ri-image-line',       title:'내 포트폴리오',  sub:'프로필/경력/미디어 관리', href: ROUTES.myPortfolio,   guard:'host' },
      { icon:'ri-briefcase-line',   title:'내 지원 내역',   sub:'대기/합격/거절/정산',     href: ROUTES.myApplies,     guard:'login' },
      { icon:'ri-mail-star-line',   title:'받은 제안',      sub:'브랜드가 보낸 제안',       href: ROUTES.inboxProposals,guard:'login' },
      { icon:'ri-heart-3-line',     title:'찜한 공고',      sub:'북마크한 공고 모아보기',   href: ROUTES.bookmarksJobs, guard:'login' },
    ]
  };

  function itemHTML(m){
    return `
      <li>
        <a class="mp-item guard-link" data-guard="${m.guard||''}" href="${m.href}">
          <i class="${m.icon}"></i>
          <div>
            <div class="title">${m.title}</div>
            <div class="meta">${m.sub||''}</div>
          </div>
          <i class="ri-arrow-right-s-line arrow"></i>
        </a>
      </li>`;
  }

  function bindGuards(me){
    document.querySelectorAll('.guard-link').forEach(a=>{
      a.addEventListener('click', (e)=>{
        const kind = a.dataset.guard;
        const need =
          (kind==='login' && !me) ||
          (kind==='host'  && !hasRole(me,'showhost')) ||
          (kind==='brand' && !hasRole(me,'brand'));
        if (need){
          e.preventDefault();
          setGuard(kind);
          guard.classList.add('show');
        }
      });
    });
  }

  function renderUser(u){
    const nameEl = $id('mpName');
    const roleEl = $id('mpRole');
    if(!u){
      nameEl.textContent = '로그인이 필요합니다';
      roleEl.textContent = '-';
      $id('mpAuthTitle').textContent = '로그인';
      return;
    }
    nameEl.textContent = u.name || u.nickname || '사용자';
    roleEl.textContent = rolesOf(u).join(', ') || '회원';
    if(u.avatarUrl) $id('mpAvatar').src = u.avatarUrl;
    $id('mpAuthTitle').textContent = '로그아웃';
  }

  function renderMenu(me){
    const isBrand = hasRole(me,'brand');
    const list = isBrand ? MENUS.brand : MENUS.showhost;

    $id('menuTitle').textContent = isBrand ? '브랜드 메뉴' : '쇼호스트 메뉴';
    const cta = $id('menuCta');
    if (isBrand){
      cta.textContent = '내 공고 관리';
      cta.href = ROUTES.myRecruit;
      cta.style.display = '';
      cta.classList.add('guard-link');
      cta.dataset.guard = 'brand';
    } else {
      cta.style.display = 'none';
    }

    $id('menuList').innerHTML = list.map(itemHTML).join('');
    bindGuards(me);
  }

  // 로그인/로그아웃
  $id('mpAuthBtn')?.addEventListener('click', ()=>{
    const hasToken = !!token;
    if(hasToken){
      localStorage.removeItem('livee_token');
      localStorage.removeItem('liveeToken');
      location.reload();
    }else{
      location.href = `${ROUTES.login}?returnTo=${here}`;
    }
  });

  // boot
  (async ()=>{
    const me = await fetchMe();
    renderUser(me);
    renderMenu(me);
  })();
})();