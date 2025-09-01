<!-- js/mypage.js -->
(() => {
  const $ = s => document.querySelector(s);

  const token = localStorage.getItem('livee_token');
  const savedRole = localStorage.getItem('liveeRole'); // 'brand' | 'showhost' | null

  // 로그인 안됐으면 로그인 페이지로
  if (!token) {
    location.replace('login.html?redirect=mypage.html');
    return;
  }

  // API에서 me 정보를 가져오되, 실패 시 localStorage를 신뢰
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');

  async function fetchMe() {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('HTTP_' + res.status);
      return await res.json();
    } catch {
      return { role: savedRole || 'showhost', name: '사용자', email: '' };
    }
  }

  // 메뉴 정의
  const MENUS = {
    brand: [
      { key:'my-campaigns',  icon:'ri-folder-2-line',     label:'내 캠페인',    href:'#/my-campaigns' },
      { key:'new-campaign',  icon:'ri-add-box-line',      label:'캠페인 등록',  href:'recruit-new.html' },
      { key:'applicants',    icon:'ri-team-line',         label:'지원자 현황',  href:'#/applicants' },
      { key:'offers',        icon:'ri-hand-coin-line',    label:'제안 관리',    href:'#/offers' },
      { key:'payments',      icon:'ri-secure-payment-line',label:'결제/에스크로', href:'#/payments' },
      { key:'services',      icon:'ri-tools-line',        label:'서비스 관리',  href:'#/services' },
    ],
    showhost: [
      { key:'portfolio',     icon:'ri-id-card-line',      label:'내 포트폴리오', href:'#/portfolio' },
      { key:'my-applies',    icon:'ri-inbox-archive-line',label:'내 지원 현황',  href:'#/applies' },
      { key:'in-offers',     icon:'ri-mail-star-line',    label:'받은 제안',    href:'#/in-offers' },
      { key:'saved',         icon:'ri-heart-2-line',      label:'찜한 공고',    href:'#/saved' },
      { key:'settlement',    icon:'ri-wallet-3-line',     label:'정산 내역',    href:'#/settlement' },
    ]
  };

  function profileCard(user) {
    return `
      <div class="mp-profile">
        <div class="mp-avatar"><i class="ri-user-3-line"></i></div>
        <div class="mp-info">
          <div class="mp-name">${user.name || '사용자'}</div>
          <div class="mp-sub">${user.email || ''}</div>
          <span class="mp-role ${user.role || savedRole}">${(user.role || savedRole) === 'brand' ? '브랜드' : '쇼호스트'}</span>
        </div>
        <a class="mp-edit" href="login.html?logout=1" aria-label="로그아웃"><i class="ri-logout-box-r-line"></i></a>
      </div>
    `;
  }

  function menuGrid(role) {
    const list = MENUS[role] || [];
    return `
      <div class="mp-grid">
        ${list.map(m => `
          <a class="mp-item" href="${m.href}">
            <i class="${m.icon}"></i>
            <span>${m.label}</span>
          </a>
        `).join('')}
      </div>
    `;
  }

  async function render() {
    const root = $('#mypage-root');
    const me = await fetchMe();
    const role = (me.role || savedRole || 'showhost');

    root.innerHTML = `
      ${profileCard(me)}
      <div class="section-head" style="margin:16px 2px 10px">
        <h2>${role === 'brand' ? '브랜드 메뉴' : '쇼호스트 메뉴'}</h2>
      </div>
      ${menuGrid(role)}
    `;
  }

  render();
})();