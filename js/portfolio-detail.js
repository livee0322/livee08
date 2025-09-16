/* portfolio-detail.js — v1.0.0 */
(() => {
  'use strict';

  const CFG = window.LIVEE_CONFIG || {};
  const RAW = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
  const API_BASE = /^https?:\/\//i.test(RAW) ? RAW.replace(/\/+$/, '')
                 : (location.origin + (RAW.startsWith('/') ? RAW : '/'+RAW)).replace(/\/+$/,'');
  const EP  = CFG.endpoints || {};
  const BASE = (EP.portfolioBase || '/portfolio-test').replace(/\/+$/,'');
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '';

  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const setTxt = (el, t) => { if(!el) return; el.textContent = t || ''; el.hidden = !t; };

  const token = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const headers = (json=true) => {
    const h = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', init, { once:true });

  async function init(){
    if(!id){ $('#pdEmpty').hidden = false; return; }

    // fetch portfolio
    let myself = null;
    try {
      const me = await fetch(`${API_BASE}/users/me`, { headers: headers(false) });
      const mj = await me.json().catch(()=> ({}));
      if (me.ok && mj?.ok !== false) myself = { id: mj.id, role: mj.role };
    } catch { /* ignore */ }

    try{
      const r = await fetch(`${API_BASE}${BASE}/${encodeURIComponent(id)}`, { headers: headers(false) });
      const j = await r.json().catch(()=> ({}));
      if(!r.ok || j.ok === false){ throw new Error(j.message || `HTTP_${r.status}`); }
      render(j.data || j, myself);
    }catch(err){
      console.warn('[pd] load fail', err);
      $('#pdEmpty').hidden = false;
    }
  }

  function chip(icon, text){
    return `<span class="pd-chip"><i class="${icon}"></i>${text}</span>`;
  }

  function render(d, me){
    // main images
    const avatar = d.mainThumbnailUrl || d.mainThumbnail || d.coverImageUrl || d.coverImage || '';
    const cover  = d.coverImageUrl || d.coverImage || avatar || '';
    if (cover)  $('#pdCover').style.backgroundImage  = `url('${cover}')`;
    if (avatar) $('#pdAvatar').src = avatar;

    setTxt($('#pdName'), d.nickname || d.displayName || d.name || ''); 
    setTxt($('#pdHeadline'), d.headline || '');

    // chips: 공개 플래그 있는 값만
    const chips = [];
    // 나이
    if (d.age && (d.agePublic || d.demographics?.agePublic))
      chips.push(chip('ri-cake-3-line', `${d.age}세`));
    // 성별
    const g = d.demographics?.gender;
    if (g && d.demographics?.genderPublic){
      const gk = g === 'female' ? '여성' : g === 'male' ? '남성' : '기타';
      chips.push(chip('ri-user-smile-line', gk));
    }
    // 키
    if (d.demographics?.height && d.demographics?.heightPublic)
      chips.push(chip('ri-ruler-line', `${d.demographics.height}cm`));
    // 사이즈
    if ((d.demographics?.sizeTop || d.demographics?.sizeBottom || d.demographics?.shoe) && d.demographics?.sizePublic){
      const sz = [d.demographics.sizeTop, d.demographics.sizeBottom, d.demographics.shoe].filter(Boolean).join(' / ');
      chips.push(chip('ri-t-shirt-air-line', sz));
    }
    // 지역
    if (d.region?.city && (d.regionPublic || d.region?.regionPublic)){
      chips.push(chip('ri-map-pin-line', `${d.region.city}${d.region.area ? ' ' + d.region.area : ''}`));
    }
    $('#pdChips').innerHTML = chips.join('');

    // links
    if (d.links?.website){
      $('#pdWeb').hidden = false;
      $('#pdWeb').href = d.links.website;
      $('#pdWeb').querySelector('span').textContent = d.links.website.replace(/^https?:\/\/(www\.)?/,'');
    }
    if (d.links?.instagram){ $('#pdInsta').hidden = false; $('#pdInsta').href = d.links.instagram; }
    if (d.links?.youtube)  { $('#pdYouTube').hidden = false; $('#pdYouTube').href = d.links.youtube; }

    if (d.region?.city){
      $('#pdRegion').hidden = false;
      $('#pdRegion span').textContent = `${d.region.city}${d.region.area ? ' ' + d.region.area : ''}`;
    }

    // bio
    if (d.bio){ $('#pdBioWrap').hidden = false; $('#pdBio').textContent = d.bio; }

    // gallery
    const imgs = Array.isArray(d.subThumbnails) ? d.subThumbnails
                : Array.isArray(d.subImages) ? d.subImages : [];
    if (imgs.length){
      $('#pdGalleryWrap').hidden = false;
      $('#pdGallery').innerHTML = imgs.map(u=> `<img src="${u}" alt="">`).join('');
    }

    // lives
    if (Array.isArray(d.liveLinks) && d.liveLinks.length){
      $('#pdLivesWrap').hidden = false;
      $('#pdLives').innerHTML = d.liveLinks.map(x => `
        <li class="pd-live">
          <img class="tn" src="${x.thumbnailUrl || ''}" alt="">
          <div class="meta">
            <span class="t">${x.title || ''}</span>
            <span class="s">${x.role==='guest' ? '게스트' : '호스트'} · ${x.date ? new Date(x.date).toLocaleDateString('ko-KR') : ''}</span>
          </div>
        </li>`).join('');
    }

    // action button
    const isOwner = me?.id && d.createdBy && String(d.createdBy) === String(me.id);
    const btn = $('#pdActionBtn');
    const icon = btn.querySelector('i'); const text = btn.querySelector('span');
    if (isOwner){ icon.className='ri-edit-2-line'; text.textContent='수정하기'; }
    else { icon.className='ri-send-plane-2-line'; text.textContent='제안하기'; }

    btn.onclick = () => {
      if (isOwner) location.href = `portfolio-new.html?id=${encodeURIComponent(d.id || d._id)}`;
      else {
        // 제안하기—원하는 경로에 맞춰 연결하세요
        const to = d.links?.instagram || d.links?.website || d.links?.youtube || '#';
        if (to === '#') { UI.toast('연락 가능한 링크가 없습니다'); return; }
        window.open(to, '_blank', 'noopener');
      }
    };
  }
})();