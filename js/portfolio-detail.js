/* portfolio-detail.js — v1.1.0
 * - CTA 버튼(제안/수정) 커버 밖에 배치 → 하단 탭과 겹침 방지
 * - 링크가 있는 경우만 노출
 * - 공개 플래그(facts) 가로 스크롤
 * - 공유/스크랩
 */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/+$/,'');
  const EP   = (CFG.endpoints && (CFG.endpoints.portfolioBase || '/portfolio-test')) || '/portfolio-test';

  const $ = (s,el=document)=>el.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '';

  const token = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const headers = { Accept:'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const el = {
    cover: $('#pfCover'),
    avatar: $('#pfAvatar'),
    name: $('#pfName'),
    headline: $('#pfHeadline'),
    badges: $('#pfBadges'),
    facts: $('#pfFacts'),
    bio: $('#pfBio'),
    bioWrap: $('#pfBioWrap'),
    linksWrap: $('#pfLinksWrap'),
    lnkWeb: $('#lnkWebsite'),
    lnkInsta: $('#lnkInsta'),
    lnkYT: $('#lnkYouTube'),
    galleryWrap: $('#pfGalleryWrap'),
    gallery: $('#pfGallery'),
    cta: $('#pfCta'),
    btnEdit: $('#btnEdit'),
    btnPropose: $('#btnPropose'),
    btnShare: $('#btnShare'),
    btnBookmark: $('#btnBookmark'),
    btnBack: $('#btnBack'),
  };

  // helpers
  const clean = (s)=> (s||'').toString().trim();
  const has = (s)=> !!clean(s);
  const fact = (icon, txt) => `<span class="fact-chip"><i class="${icon}"></i>${txt}</span>`;
  const badge = (icon, txt) => `<span class="badge"><i class="${icon}"></i>${txt}</span>`;

  async function load() {
    if (!id) { UI?.toast?.('잘못된 접근입니다'); history.back(); return; }
    try {
      const res = await fetch(`${API}${EP}/${encodeURIComponent(id)}`, { headers });
      const j = await res.json().catch(()=> ({}));
      if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
      const d = j.data || j;

      // hero
      el.cover.src  = d.coverImageUrl || d.coverImage || d.mainThumbnailUrl || '';
      el.avatar.src = d.mainThumbnailUrl || d.mainThumbnail || d.coverImageUrl || '';
      el.name.textContent = d.nickname || d.displayName || d.name || '이름 미상';
      el.headline.textContent = d.headline || '';

      // badges (예: 나이 공개)
      el.badges.innerHTML = '';
      if (typeof d.age === 'number') {
        // 나이는 개별 공개 플래그로 판단 (demographics.agePublic or agePublic)
        const isPublic = d.agePublic === true || d.demographics?.agePublic === true;
        if (isPublic) el.badges.insertAdjacentHTML('beforeend', badge('ri-cake-2-line', `${d.age}세`));
      }

      // facts (공개 설정된 항목만)
      const facts = [];
      const demo = d.demographics || {};
      if (demo.genderPublic && has(demo.gender)) {
        const gmap = { female:'여성', male:'남성', other:'기타' };
        facts.push(fact('ri-user-3-line', gmap[demo.gender] || demo.gender));
      }
      if (demo.heightPublic && demo.height) facts.push(fact('ri-ruler-line', `${demo.height}cm`));
      if (demo.sizePublic) {
        const pieces = [];
        if (has(demo.sizeTop)) pieces.push(`상의 ${demo.sizeTop}`);
        if (has(demo.sizeBottom)) pieces.push(`하의 ${demo.sizeBottom}`);
        if (has(demo.shoe)) pieces.push(`신발 ${demo.shoe}`);
        if (pieces.length) facts.push(fact('ri-t-shirt-2-line', pieces.join(' · ')));
      }
      if (d.regionPublic && d.region?.city) {
        const city = d.region.city;
        const area = d.region.area ? ` ${d.region.area}` : '';
        facts.push(fact('ri-map-pin-2-line', `${city}${area}`));
      }
      if (d.careerPublic && typeof d.careerYears === 'number') {
        facts.push(fact('ri-briefcase-2-line', `경력 ${d.careerYears}년`));
      }
      el.facts.innerHTML = facts.join('') || '';

      // 링크
      const links = d.links || {};
      const hasAnyLink = [links.website, links.instagram, links.youtube].some(Boolean);
      if (hasAnyLink) {
        el.linksWrap.hidden = false;
        if (has(links.website)) { el.lnkWeb.href = links.website; el.lnkWeb.hidden = false; }
        if (has(links.instagram)) { el.lnkInsta.href = links.instagram; el.lnkInsta.hidden = false; }
        if (has(links.youtube)) { el.lnkYT.href = links.youtube; el.lnkYT.hidden = false; }
      }

      // 소개
      if (has(d.bio)) { el.bio.textContent = d.bio; el.bioWrap.hidden = false; }

      // 갤러리
      const subs = Array.isArray(d.subThumbnails) ? d.subThumbnails : (Array.isArray(d.subImages) ? d.subImages : []);
      if (subs.length) {
        el.galleryWrap.hidden = false;
        el.gallery.innerHTML = subs.map(u=> `<img src="${u}" alt="gallery">`).join('');
      }

      // CTA: 본인일 때 수정, 아니면 제안
      const me = await loadMeSafely();
      const isOwner = me?.id && d.createdBy && (me.id === (d.createdBy._id || d.createdBy));
      el.btnEdit.style.display = isOwner ? '' : 'none';
      el.btnPropose.style.display = isOwner ? 'none' : '';

    } catch (e) {
      console.error('[portfolio-detail] load error', e);
      UI?.toast?.('프로필을 불러오지 못했습니다');
    }
  }

  async function loadMeSafely(){
    try{
      if (!token) return null;
      const r = await fetch(`${API}/users/me`, { headers });
      const j = await r.json().catch(()=> ({}));
      if (!r.ok || j.ok === false) return null;
      return j;
    }catch{ return null; }
  }

  // actions
  el.btnBack?.addEventListener('click', ()=> history.length > 1 ? history.back() : location.href='portfolio-list.html');
  el.btnShare?.addEventListener('click', async ()=>{
    try{
      if (navigator.share) {
        await navigator.share({ title: document.title, url: location.href });
      } else {
        await navigator.clipboard.writeText(location.href);
        UI?.toast?.('링크가 복사되었습니다');
      }
    }catch{}
  });
  el.btnBookmark?.addEventListener('click', ()=>{
    const on = el.btnBookmark.classList.toggle('on');
    el.btnBookmark.innerHTML = `<i class="${on ? 'ri-bookmark-fill':'ri-bookmark-line'}"></i>`;
    UI?.toast?.(on ? '스크랩에 추가' : '스크랩 해제');
  });

  el.btnPropose?.addEventListener('click', ()=> {
    // 향후 제안 폼으로 이동/모달
    UI?.toast?.('제안하기 폼으로 이동합니다');
    // location.href = 'proposal-new.html?target='+encodeURIComponent(id);
  });
  el.btnEdit?.addEventListener('click', ()=> location.href = 'portfolio-new.html?id='+encodeURIComponent(id));

  // boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once:true });
  } else load();
})();