/* mypage.js — v1.3 (robust me + optimistic render)
   - API 미응답/HTML 응답이어도 토큰 있으면 로그인으로 간주하여 메뉴 렌더
   - roles/role/admin 대소문자 무시
   - 경로는 LIVEE_CONFIG.PATH 한 곳에서 관리
*/
(() => {
  const $ = (s, el=document) => el.querySelector(s);

  // ------- Config & Paths -------
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const PATH = Object.assign({
    myRecruit: 'myrecruit.html',
    recruitNew: 'recruit-new.html',
    applicationsBrand: 'applications-brand.html',
    inboxProposals: 'inbox-proposals.html',
    bookmarksPortfolios: 'bookmarks-portfolios.html',
    portfolioMine: 'myportfolio.html',
    appliesMine: 'applications.html',
    inOffers: 'inbox-proposals.html',
    savedRecruits: 'bookmarks.html',
    settlement: 'settlement.html',
    settingsNotify: 'settings-notify.html',
    login: 'login.html'
  }, CFG.PATH || {});

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') || '';

  // ------- Header/Tabbar mount -------
  try {
    window.LIVEE_UI?.mountHeader?.({ title:'마이페이지' });
    window.LIVEE_UI?.mountTopTabs?.({ active:null });
    window.LIVEE_UI?.mountTabbar?.({ active:'mypage' });
  } catch(_) {}

  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  // ------- utils -------
  function rolesOf(me){
    const arr = Array.isArray(me?.roles) ? me.roles : (me?.role ? [me.role] : []);
    return arr.map(v => String(v||'').toLowerCase());
  }
  const isBrandLike = (me) => {
    const r = rolesOf(me);
    return r.includes('brand') || r.includes('admin');
  };
  const isHostLike = (me) => {
    const r = rolesOf(me);
    return r.includes('showhost') || r.includes('host') || r.includes('admin');
  };

  async function fetchMe(){
    if(!TOKEN) return null;
    const h = { 'Accept':'application/json', 'Authorization':'Bearer '+TOKEN };
    for(const p of ['/users/me','/auth/me','/me']){
      try{
        const r = await fetch(API_BASE+p, { headers:h, credentials:'include' });
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) continue; // HTML이면 패스
        const j = await r.json().catch(()=>null);
        if (r.ok && j) return j.data || j.user || j;
      }catch(_){}
    }
    return null;
  }

  // ------- view tpl -------
  const avatarSrc = CFG.placeholderThumb || 'assets/default.jpg';
  const profileCard = (user, loggedIn) => `
    <div class="mp-card">
      <img class="mp-avatar" src="${user?.avatarUrl || avatarSrc}" alt="">
      <div>
        <div class="mp-name">${loggedIn ? (user?.name || user?.nickname || '사용자') : '로그인이 필요합니다'}</div>
        <div class="mp-role">${loggedIn ? (rolesOf(user).join(', ') || '회원') : '-'}</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <a class="btn outline" href="${loggedIn ? (CFG.BASE_PATH || '') + '/settings.html' : `${PATH.login}?returnTo=${here}`}">
          ${loggedIn ? '설정' : '로그인'}
        </a>
        ${loggedIn ? `<button class="btn outline" id="logoutBtn">로그아웃</button>` : ''}
      </div>
    </div>
  `;

  const grid = (items) => `
    <div class="mp-grid">
      ${items.map(m=>`
        <a class="mp-item" href="${m.href}">
          <i class="${m.icon}"></i>
          <span>${m.label}</span>
        </a>`).join('')}
    </div>
  `;

  function section(title, inner){
    return `
      <div class="section-head"><h2>${title}</h2></div>
      ${inner}
    `;
  }

  // ------- menus -------
  const MENU_BRAND = [
    { icon:'ri-file-list-2-line', label:'내 모집공고', href: PATH.myRecruit },
    { icon:'ri-add-box-line',     label:'공고 등록',   href: PATH.recruitNew },
    { icon:'ri-team-line',        label:'지원자 현황', href: PATH.applicationsBrand },
    { icon:'ri-mail-send-line',   label:'보낸 제안',   href: PATH.inboxProposals },
    { icon:'ri-star-line',        label:'찜한 포트폴리오', href: PATH.bookmarksPortfolios },
  ];
  const MENU_HOST = [
    { icon:'ri-id-card-line',     label:'내 포트폴리오', href: PATH.portfolioMine },
    { icon:'ri-inbox-archive-line',label:'내 지원 내역', href: PATH.appliesMine },
    { icon:'ri-mail-star-line',   label:'받은 제안',     href: PATH.inOffers },
    { icon:'ri-heart-2-line',     label:'찜한 공고',     href: PATH.savedRecruits },
    { icon:'ri-wallet-3-line',    label:'정산 내역',     href: PATH.settlement },
  ];

  // ------- render -------
  async function render(){
    const root = $('#mypage-root');

    // 1) 서버 시도
    let me = await fetchMe();

    // 2) 실패해도 토큰 있으면 낙관 렌더 (localStorage 힌트 사용)
    if (!me && TOKEN){
      const hintRole = (localStorage.getItem('liveeRole') || '').toLowerCase();
      me = { name: localStorage.getItem('liveeName') || '사용자',
             roles: hintRole ? [hintRole] : ['showhost'] };
    }

    const loggedIn = !!TOKEN;
    root.innerHTML = [
      profileCard(me, loggedIn),
      // 로그인 X면 최소 설정/로그인만 보여주자
      !loggedIn ? '' : [
        isBrandLike(me) ? section('브랜드 메뉴', grid(MENU_BRAND)) : '',
        isHostLike(me)  ? section('쇼호스트 메뉴', grid(MENU_HOST)) : ''
      ].join(''),
      section('설정', grid([
        { icon:'ri-notification-3-line', label:'알림 설정', href: PATH.settingsNotify },
        { icon:'ri-logout-box-r-line',   label: loggedIn ? '로그아웃' : '로그인', href: loggedIn ? `${PATH.login}?logout=1` : `${PATH.login}?returnTo=${here}` }
      ]))
    ].join('');

    // 즉시 로그아웃
    $('#logoutBtn')?.addEventListener('click', ()=>{
      localStorage.removeItem('livee_token');
      localStorage.removeItem('liveeToken');
      location.reload();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else { render(); }
})();