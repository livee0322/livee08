/* Portfolio Detail — robust fetch + safe fallbacks + CTA logic */
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP  = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test'; // 단수 엔드포인트
  const PH  = CFG.placeholderThumb || 'default.jpg';

  // Shortcuts
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '';

  // Elements
  const coverBg    = $('#coverBg');
  const avatarImg  = $('#avatarImg');
  const nicknameT  = $('#nicknameTtl');
  const headlineEl = $('#headlineSub');
  const badgeWrap  = $('#pubBadges');
  const hintEl     = $('#pdHint');

  const linkWrap   = $('#linkWrap');
  const lnkInsta   = $('#lnkInsta');
  const lnkYT      = $('#lnkYT');
  const lnkSite    = $('#lnkSite');

  const bioCard    = $('#bioCard');
  const bioHtml    = $('#bioHtml');
  const galleryCard= $('#galleryCard');
  const subGrid    = $('#subGrid');
  const liveCard   = $('#liveCard');
  const liveList   = $('#liveList');

  const backBtn    = $('#pdBack');
  const shareBtn   = $('#pdShare');
  const saveBtn    = $('#pdSave');

  const ctaBar     = $('#ctaBar');
  const ctaLeft    = $('#ctaLeft');  // 제안하기
  const ctaRight   = $('#ctaRight'); // 수정하기

  // Back
  backBtn?.addEventListener('click', () => history.length > 1 ? history.back() : location.href='portfolio-list.html');

  // Scrap (local)
  const SCRAP_KEY = 'livee_portfolio_scraps';
  const getScraps = () => {
    try { return JSON.parse(localStorage.getItem(SCRAP_KEY) || '[]'); } catch { return []; }
  };
  const setScraps = (arr) => localStorage.setItem(SCRAP_KEY, JSON.stringify(arr));
  const isScrapped = (pid) => getScraps().includes(pid);

  const setSaveIcon = (on) => {
    saveBtn.innerHTML = `<i class="${on?'ri-bookmark-fill':'ri-bookmark-line'}"></i>`;
  };
  saveBtn?.addEventListener('click', () => {
    if (!id) return;
    const arr = getScraps();
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i,1); else arr.push(id);
    setScraps(arr);
    setSaveIcon(isScrapped(id));
    UI?.toast(isScrapped(id) ? '스크랩에 저장했어요' : '스크랩을 해제했어요');
  });

  // Share
  shareBtn?.addEventListener('click', async () => {
    const url = location.href;
    try{
      if (navigator.share) await navigator.share({ title: document.title, url });
      else {
        await navigator.clipboard.writeText(url);
        UI?.toast('링크를 복사했어요');
      }
    }catch{ /* ignore */ }
  });

  // Load
  ready(async function load() {
    if (!id) { UI?.toast('프로필 ID가 없습니다'); return; }
    try {
      const r = await fetch(`${API}${EP}/${encodeURIComponent(id)}`, { headers: {Accept:'application/json'} });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);

      const d = j.data || j;

      // ---- Safe mapping / fallbacks ----
      const nick = d.nickname || d.displayName || d.name || '닉네임';
      const head = d.headline || d.oneLiner || '';
      const avatar = d.mainThumbnailUrl || d.mainThumbnail || PH;
      const cover  = d.coverImageUrl || d.coverImage || avatar || PH;

      nicknameT.textContent = nick;
      headlineEl.textContent = head || ' ';
      avatarImg.src = avatar;
      coverBg.style.backgroundImage = `url("${cover}")`;

      // Public badges from schema flags
      const bdgs = [];
      const age = d.age;
      if (d.agePublic && age) bdgs.push({icon:'ri-cake-2-line', text:`${age}세`});

      const demo = d.demographics || {};
      if (d.genderPublic && demo.gender)  bdgs.push({icon:'ri-user-3-line', text:(demo.gender==='male'?'남성':demo.gender==='female'?'여성':'기타')});
      if (d.heightPublic && demo.height)  bdgs.push({icon:'ri-ruler-line', text:`${demo.height}cm`});
      if (demo.sizePublic && (demo.sizeTop || demo.sizeBottom)) {
        const sizeTxt = [demo.sizeTop, demo.sizeBottom].filter(Boolean).join('/');
        bdgs.push({icon:'ri-t-shirt-line', text:sizeTxt});
      }
      if (d.regionPublic && d.region?.city) {
        bdgs.push({icon:'ri-map-pin-2-line', text:[d.region.city, d.region.area].filter(Boolean).join(' ')});
      }

      badgeWrap.innerHTML = bdgs.map(b=>`<span class="bdg"><i class="${b.icon}"></i>${b.text}</span>`).join('');

      // Links (show when exists)
      const links = d.links || {};
      let hasLink = false;
      if (links.instagram) { hasLink = true; lnkInsta.href = links.instagram; lnkInsta.removeAttribute('hidden'); }
      else lnkInsta.setAttribute('hidden','');

      if (links.youtube)   { hasLink = true; lnkYT.href = links.youtube; lnkYT.removeAttribute('hidden'); }
      else lnkYT.setAttribute('hidden','');

      if (links.website || d.primaryLink) {
        hasLink = true; lnkSite.href = links.website || d.primaryLink; lnkSite.removeAttribute('hidden');
      } else lnkSite.setAttribute('hidden','');

      linkWrap.hidden = !hasLink;

      // Bio
      if (d.bio && String(d.bio).trim()) {
        bioHtml.textContent = '';    // sanitize: 프론트는 텍스트로만; 서버에서 sanitize된 html을 주는 경우 아래 한 줄 사용
        // bioHtml.innerHTML = d.bio; // 서버에서 sanitize된 경우에만 사용
        bioHtml.textContent = d.bio;
        bioCard.hidden = false;
      }

      // Sub gallery
      const subs = Array.isArray(d.subThumbnails) ? d.subThumbnails : Array.isArray(d.subImages) ? d.subImages : [];
      if (subs.length) {
        subGrid.innerHTML = subs.map(u=>`<img src="${u}" alt="">`).join('');
        galleryCard.hidden = false;
      }

      // Recent lives (optional)
      if (Array.isArray(d.liveLinks) && d.liveLinks.length) {
        liveList.innerHTML = d.liveLinks.slice(0,6).map(x=>`
          <div class="pd-liveItem">
            <div style="font-weight:900">${x.title||'라이브'}</div>
            <div class="muted" style="font-size:13px">${x.role==='guest'?'게스트':'호스트'} · ${x.date?new Date(x.date).toLocaleDateString():'-'}</div>
          </div>
        `).join('');
        liveCard.hidden = false;
      }

      // CTA (owner vs guest)
      const token = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
      const meReq = token ? fetch(`${API}/users/me`, { headers:{Authorization:`Bearer ${token}`} }).then(r=>r.json()).catch(()=>null) : null;
      const me = await meReq;

      const isOwner = me && (me.id === String(d.createdBy || '').replace(/^ObjectId\("(.*)"\)$/, '$1'));
      // 좌측: 제안하기 (항상 표시), 우측: 내 소유면 '수정하기', 아니면 숨김
      ctaLeft.href = `mailto:?subject=[Livee] ${encodeURIComponent(nick)}님에게 제안&body=${encodeURIComponent(location.href)}`;
      ctaLeft.innerHTML = `<i class="ri-send-plane-line"></i> 제안하기`;

      if (isOwner) {
        ctaRight.href = `portfolio-new.html?id=${encodeURIComponent(id)}`;
        ctaRight.innerHTML = `<i class="ri-edit-2-line"></i> 수정하기`;
        ctaRight.style.display = '';
      } else {
        ctaRight.style.display = 'none';
      }
      ctaBar.hidden = false;

      // Scrap icon initial
      setSaveIcon(isScrapped(id));
      hintEl.style.display = ''; // 안내문구는 상단 한 번만
    } catch (err) {
      console.error('[portfolio detail load]', err);
      UI?.toast('프로필을 불러오지 못했습니다.');
      // 최소한의 안전 레이아웃
      coverBg.style.background = '#e5e7eb';
    }
  });

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }
})();