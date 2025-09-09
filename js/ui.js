// ui.js — v2.9.0 (API_BASE bootstrap + 공통 헤더/탭 자동주입 + 활성 탭 처리)
(() => {
  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once:true })
      : fn();

  ready(() => {
    /* =========================
     * ★ API_BASE 부트스트랩
     *  - ?api=... 로 들어오면 저장
     *  - 저장된 값 / 기존 설정 / 기본값('/api/v1') 순으로 사용
     * ======================= */
    const qs = new URLSearchParams(location.search);
    const apiFromQs = qs.get('api');
    if (apiFromQs) localStorage.setItem('livee_api', apiFromQs);

    const savedApi = localStorage.getItem('livee_api');
    const cfgInWin = (window.LIVEE_CONFIG || {});
    const API_BASE =
      (cfgInWin.API_BASE || savedApi || '/api/v1').replace(/\/$/, '');
    window.LIVEE_CONFIG = {
      ...cfgInWin,
      API_BASE,
      BASE_PATH: cfgInWin.BASE_PATH || ''
    };

    const getToken = () =>
      localStorage.getItem('livee_token') ||
      localStorage.getItem('liveeToken') || '';

    // ★ 컨테이너가 없으면 생성(페이지마다 공통 UI 보장)
    const ensure = (id) =>
      document.getElementById(id) ||
      (() => { const el = document.createElement('div'); el.id = id; document.body.prepend(el); return el; })();

    /* ---------- AppBar ---------- */
    const appbar = ensure('appbar'); // ★ 자동 생성
    if (appbar) {
      const isLogin = !!getToken();
      appbar.innerHTML = `
        <div class="lv-appbar" role="banner">
          <a class="lv-title" href="index.html" aria-label="홈">라이비</a>
          <div class="lv-actions" role="group" aria-label="빠른 작업">
            <a class="lv-action" href="#/alerts" aria-label="알림"><i class="ri-notification-3-line"></i></a>
            <a class="lv-action" href="#/search" aria-label="검색"><i class="ri-search-line"></i></a>
            <a class="lv-action" href="${isLogin ? 'login.html?logout=1' : 'login.html'}"
               aria-label="${isLogin ? '로그아웃' : '로그인'}">
              <i class="${isLogin ? 'ri-logout-box-r-line' : 'ri-login-box-line'}"></i>
            </a>
          </div>
        </div>`;
    }

    /* ---------- Top Tabs (underline) ---------- */
    const top = ensure('top-tabs'); // ★ 자동 생성
    if (top) {
      const path = location.pathname.replace(/\/+$/, '');
      top.innerHTML = `
        <div class="lv-topTabs" role="navigation" aria-label="상단 탭">
          <div class="lv-topTabs__in">
            <a class="tab" data-tab="home" href="index.html#/">숏클립</a>
            <a class="tab" data-tab="live" href="index.html#/live">쇼핑라이브</a>
            <a class="tab" data-tab="news" href="news.html">뉴스</a>
            <a class="tab" data-tab="event" href="index.html#/event">이벤트</a>
            <a class="tab" data-tab="service" href="index.html#/service">서비스</a>
          </div>
        </div>`;

      const setActive = (name) => {
        top.querySelectorAll('.tab').forEach(el =>
          el.classList.toggle('is-active', el.dataset.tab === name)
        );
      };
      if (/\/news\.html$/.test(path)) setActive('news');
      else if (location.hash.startsWith('#/live')) setActive('live');
      else if (location.hash.startsWith('#/event')) setActive('event');
      else if (location.hash.startsWith('#/service')) setActive('service');
      else setActive('home');
    }

    // ui.js — 공통 유틸(드로어/토스트/쿼리)
    (function(){
      'use strict';
      const $ = (s, el=document) => el.querySelector(s);

      window.UI = {
        openDrawer(id){
          const el = document.getElementById(id);
          if(!el) return;
          el.classList.add('open');
          el.setAttribute('aria-hidden','false');
          document.documentElement.style.overflow='hidden';
        },
        closeDrawer(id){
          const el = document.getElementById(id);
          if(!el) return;
          el.classList.remove('open');
          el.setAttribute('aria-hidden','true');
          document.documentElement.style.overflow='';
        },
        toast(msg){
          let t = $('#__toast');
          if(!t){ t=document.createElement('div'); t.id='__toast';
            t.style.cssText='position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:12px;font-weight:800;z-index:80';
            document.body.appendChild(t);
          }
          t.textContent = msg; t.style.opacity='1';
          setTimeout(()=>{ t.style.opacity='0'; }, 1300);
        },
        qs(){ return new URLSearchParams(location.search); },
        setQs(params){
          const q = new URLSearchParams(params);
          const url = location.pathname + '?' + q.toString();
          history.replaceState(null,'',url);
        }
      };
    })();

    /* ---------- Bottom Tabs ---------- */
    const bottom = ensure('bottom-tabs'); // ★ 자동 생성
    const myHref = getToken() ? 'mypage.html' : 'login.html';

    // ★ 현재 페이지 감지해 활성 탭 지정
    const file = location.pathname.split('/').pop() || 'index.html';
    const activeKey =
      file.includes('recruit-list') ? 'recruit' :
      file.includes('portfolio-list') ? 'influencer' :
      (file.includes('mypage') || file.includes('login')) ? 'mypage' :
      'home';

    bottom.innerHTML = `
      <div class="lv-tabbar" role="navigation" aria-label="하단 탭">
        <div class="lv-tabbar__in">
          <a class="tbi ${activeKey==='home'?'is-active':''}" href="index.html"><i class="ri-home-line"></i><span>홈</span></a>
          <a class="tbi ${activeKey==='recruit'?'is-active':''}" href="recruit-list.html"><i class="ri-archive-drawer-line"></i><span>모집캠페인</span></a>
          <a class="tbi" href="#/library"><i class="ri-bookmark-2-line"></i><span>라이브러리</span></a>
          <a class="tbi ${activeKey==='influencer'?'is-active':''}" href="portfolio-list.html"><i class="ri-user-3-line"></i><span>인플루언서</span></a>
          <a class="tbi ${activeKey==='mypage'?'is-active':''}" href="${myHref}"><i class="ri-user-settings-line"></i><span>마이페이지</span></a>
        </div>
      </div>`;
  });
})();