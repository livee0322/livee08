/* portfolio-detail.js — v1.1.0
   - 커버/텍스트 겹침 해결(오버레이)
   - 링크는 있을 때만 노출
   - FAB: 본인이면 "수정하기", 타인이면 "제안하기"
   - 공유 버튼(Web Share API fallback)
*/
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const RAW = (CFG.API_BASE || '/api/v1').toString().trim();
  const API = /^https?:\/\//i.test(RAW) ? RAW.replace(/\/+$/,'')
            : (location.origin + (RAW.startsWith('/')?RAW:'/'+RAW)).replace(/\/+$/,'');
  const EP = (CFG.endpoints || {});
  const LIST = (EP.portfolios || '/portfolio-test?status=published&limit=24');
  const BASE = (EP.portfolioBase || '/portfolio-test');

  const $ = (s, el=document) => el.querySelector(s);
  const say = (msg) => window.UI?.toast ? UI.toast(msg) : alert(msg);

  const qs = new URLSearchParams(location.search);
  const id = qs.get('id');

  const heroBg = $('#heroBg');
  const avatar = $('#avatar');
  const nickname = $('#nickname');
  const headline = $('#headline');
  const pillRow = $('#pillRow');
  const bioWrap = $('#bioWrap'), bio = $('#bio');
  const galleryWrap = $('#galleryWrap'), gallery = $('#gallery');
  const extLinks = $('#extLinks');
  const ctaBtn = $('#ctaBtn');

  const token = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  let current;

  if (!id) {
    say('잘못된 접근입니다.');
    location.replace('portfolio-list.html');
    return;
  }

  // ------- load -------
  (async function load() {
    try {
      const r = await fetch(`${API}${BASE}/${encodeURIComponent(id)}`);
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      current = j.data || j;

      render(current);
    } catch (e) {
      console.error('[portfolio-detail] load', e);
      say('프로필을 불러오지 못했습니다.');
    }
  })();

  // ------- render -------
  function render(d) {
    // 이미지
    const cover = d.coverImageUrl || d.coverImage || d.mainThumbnailUrl || '';
    const main  = d.mainThumbnailUrl || d.mainThumbnail || '';
    if (cover) heroBg.style.backgroundImage = `url("${cover}")`;
    if (main)  avatar.src = main;

    // 텍스트
    nickname.textContent = d.nickname || d.displayName || d.name || '프로필';
    headline.textContent = d.headline || '';

    // 공개 pill (age, gender, height/size 등)
    pillRow.innerHTML = '';
    const pills = [];

    if (Number.isFinite(d.age) && (d.agePublic || d.demographics?.agePublic)) {
      pills.push({ icon:'ri-cake-2-line', text:`${d.age}세` });
    }
    if (d.demographics?.gender && d.demographics.genderPublic) {
      const gMap = { female:'여성', male:'남성', other:'기타' };
      pills.push({ icon:'ri-user-6-line', text:gMap[d.demographics.gender] || d.demographics.gender });
    }
    if (Number.isFinite(d.demographics?.height) && d.demographics.heightPublic) {
      pills.push({ icon:'ri-ruler-line', text:`${d.demographics.height}cm` });
    }
    if (d.demographics?.sizePublic) {
      const t = [d.demographics.sizeTop, d.demographics.sizeBottom].filter(Boolean).join('/');
      if (t) pills.push({ icon:'ri-t-shirt-line', text:t });
    }
    if (d.region?.city && d.regionPublic) {
      pills.push({ icon:'ri-map-pin-line', text:d.region.city + (d.region.area? ' ' + d.region.area : '') });
    }
    if (d.careerYears > 0 && d.careerPublic) {
      pills.push({ icon:'ri-briefcase-2-line', text:`경력 ${d.careerYears}y` });
    }

    pillRow.innerHTML = pills.map(p=>`
      <span class="pf-pill"><i class="${p.icon}"></i>${p.text}</span>
    `).join('');

    // bio
    if (d.bio && String(d.bio).trim()) {
      bio.textContent = d.bio;
      bioWrap.hidden = false;
    }

    // 링크: instagram/youtube/website만 조건부 표시
    const insta = d.links?.instagram;
    const ytb   = d.links?.youtube;
    const site  = d.links?.website || d.primaryLink;
    const linkBtns = [];
    const mk = (href, icon, label) => `<a class="pf-link" href="${href}" target="_blank" rel="noopener"><i class="${icon}"></i>${label}</a>`;

    if (insta) linkBtns.push(mk(insta,'ri-instagram-line','Instagram'));
    if (ytb)   linkBtns.push(mk(ytb,'ri-youtube-line','YouTube'));
    if (site)  linkBtns.push(mk(site,'ri-link','Website'));

    if (linkBtns.length) {
      extLinks.innerHTML = linkBtns.join('');
      extLinks.hidden = false;
    }

    // 갤러리
    const subs = Array.isArray(d.subThumbnails) ? d.subThumbnails
                : (Array.isArray(d.subImages) ? d.subImages : []);
    if (subs.length) {
      gallery.innerHTML = subs.map(u => `<img src="${u}" alt="gallery">`).join('');
      galleryWrap.hidden = false;
    }

    // FAB: 본인이면 수정, 아니면 제안
    const myId = localStorage.getItem('livee_user_id') || '';
    const isOwner = myId && (d.createdBy && (d.createdBy._id || d.createdBy) === myId);
    if (isOwner) {
      ctaBtn.classList.add('edit');
      ctaBtn.textContent = '수정하기';
      ctaBtn.onclick = () => location.href = `portfolio-new.html?id=${encodeURIComponent(d.id || d._id)}`;
    } else {
      ctaBtn.textContent = '제안하기';
      ctaBtn.onclick = () => location.href = `chat.html?to=${encodeURIComponent(d.nickname || d.id || d._id)}`;
    }

    // 공유
    $('#shareBtn')?.addEventListener('click', async () => {
      const shareData = {
        title: (d.nickname || '프로필') + ' - Livee',
        text: d.headline || '',
        url: location.href
      };
      try{
        if (navigator.share) await navigator.share(shareData);
        else {
          await navigator.clipboard.writeText(location.href);
          say('링크가 복사되었습니다');
        }
      }catch(e){ /* cancel */ }
    });

    // 스크랩 토글 (프론트 임시)
    const fav = $('#favBtn');
    fav?.addEventListener('click', () => {
      fav.classList.toggle('on');
      fav.innerHTML = fav.classList.contains('on')
        ? '<i class="ri-bookmark-fill"></i>'
        : '<i class="ri-bookmark-line"></i>';
    });
  }
})();