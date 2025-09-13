/* model-new.js — v1.0
 * - 엔드포인트: /models-test
 * - Cloudinary 서버 서명(/uploads/signature) 사용
 * - 포트폴리오 등록 페이지 로직을 모델에 맞게 경량화/필드 치환
 */
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'models-test';
  const SHORTS_EP = '/shorts-test?mine=1&limit=60';
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';
  const here = encodeURIComponent(location.pathname + location.search + location.hash);

  const THUMB = {
    square: 'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169: 'c_fill,g_auto,w_1280,h_720,f_auto,q_auto',
  };

  const $id = (s) => document.getElementById(s);
  const say = (t, ok = false) => {
    const el = $id('pfMsg'); if (!el) return;
    el.textContent = t; el.classList.add('show'); el.classList.toggle('ok', ok);
  };
  const headers = (json = true) => {
    const h = { Accept: 'application/json' };
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };
  const withTransform = (url, t) => {
    try {
      if (!url || !/\/upload\//.test(url)) return url || '';
      const i = url.indexOf('/upload/');
      return url.slice(0, i + 8) + t + '/' + url.slice(i + 8);
    } catch { return url; }
  };

  // provider helpers
  const ytId = (u = '') => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/) || [])[1] || '';
  const detectProvider = (url = '') => /youtu\.?be|youtube\.com/.test(url) ? 'youtube' : '';
  const thumbUrl = (p, url) => p === 'youtube' ? (ytId(url) ? `https://img.youtube.com/vi/${ytId(url)}/hqdefault.jpg` : '') : '';

  const state = {
    id: '',
    slugAuto: true,
    mainThumbnailUrl: '',
    coverImageUrl: '',
    gallery: [],
    tags: [],
    shortsSel: new Set(),
    pending: 0,
  };
  const bump = (n) => { state.pending = Math.max(0, state.pending + n); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    // refs
    const form = $id('pfForm'); if (!form) return;

    // inputs
    const nickname = $id('nickname'), slug = $id('slug'), headline = $id('headline'), bio = $id('bio');
    const gender = $id('gender'), age = $id('age'), careerYears = $id('careerYears'), primaryLink = $id('primaryLink');
    const height = $id('height'), weight = $id('weight'), sizeTop = $id('sizeTop'), sizeBottom = $id('sizeBottom'), shoe = $id('shoe');
    const regionCity = $id('regionCity'), regionArea = $id('regionArea');
    const linkWebsite = $id('linkWebsite'), linkInstagram = $id('linkInstagram'), linkYouTube = $id('linkYouTube'), linkTikTok = $id('linkTikTok');
    const visibility = $id('visibility');

    // files
    const mainFile = $id('mainFile'), coverFile = $id('coverFile'), subsFile = $id('subsFile');
    const mainTrig = $id('mainTrigger'), coverTrig = $id('coverTrigger'), subsTrig = $id('subsTrigger');
    const mainPrev = $id('mainPrev'), coverPrev = $id('coverPrev'), subsGrid = $id('subsGrid');

    // shorts
    const shortsGrid = $id('shortsGrid'), shortsRefresh = $id('shortsRefresh');

    // links
    const linksWrap = $id('linksWrap'), addLinkBtn = $id('addLinkBtn');

    // tags
    const tagInput = $id('tagInput'), tagList = $id('tagList');

    // auto slug
    nickname?.addEventListener('input', () => {
      if (!state.slugAuto) return;
      const v = (nickname.value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      slug.value = v;
    });
    slug?.addEventListener('input', () => state.slugAuto = false);

    // textarea auto-height
    const autoGrow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(800, Math.max(180, el.scrollHeight)) + 'px'; };
    bio?.addEventListener('input', () => autoGrow(bio)); if (bio) setTimeout(() => autoGrow(bio), 0);

    // triggers
    mainTrig?.addEventListener('click', e => { e.preventDefault(); mainFile?.click(); });
    coverTrig?.addEventListener('click', e => { e.preventDefault(); coverFile?.click(); });
    subsTrig?.addEventListener('click', e => { e.preventDefault(); subsFile?.click(); });

    // cloudinary
    async function getSignature() {
      const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      return j.data || j;
    }
    async function uploadImage(file) {
      const { cloudName, apiKey, timestamp, signature } = await getSignature();
      const fd = new FormData();
      fd.append('file', file); fd.append('api_key', apiKey); fd.append('timestamp', timestamp); fd.append('signature', signature);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
      return j.secure_url;
    }
    const isImgOk = (f) => {
      if (!/^image\//.test(f.type)) { say('이미지 파일만 업로드 가능'); return false; }
      if (f.size > 8 * 1024 * 1024) { say('이미지는 8MB 이하'); return false; }
      return true;
    };

    // uploads
    const setPreview = (k, url) => {
      if (k === 'main') { mainPrev.src = url; mainPrev.style.display = 'block'; }
      if (k === 'cover') { coverPrev.src = url; coverPrev.style.display = 'block'; }
    };
    mainFile?.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
      const local = URL.createObjectURL(f); setPreview('main', local); bump(+1);
      try { say('대표 이미지 업로드 중…'); const url = await uploadImage(f); state.mainThumbnailUrl = withTransform(url, THUMB.square); setPreview('main', state.mainThumbnailUrl); say('업로드 완료', true); }
      catch (err) { console.error('[main upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
      finally { URL.revokeObjectURL(local); bump(-1); e.target.value = ''; }
    });
    coverFile?.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
      const local = URL.createObjectURL(f); setPreview('cover', local); bump(+1);
      try { say('커버 이미지 업로드 중…'); const url = await uploadImage(f); state.coverImageUrl = withTransform(url, THUMB.cover169); setPreview('cover', state.coverImageUrl); say('업로드 완료', true); }
      catch (err) { console.error('[cover upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
      finally { URL.revokeObjectURL(local); bump(-1); e.target.value = ''; }
    });

    function drawSubs(){
      if(!subsGrid) return;
      const items = state.gallery.map((u,i)=>`
        <div class="sub">
          <img src="${u}" alt="g-${i}"><button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
        </div>`).join('');
      subsGrid.innerHTML = items;
    }
    subsGrid?.addEventListener('click', e=>{
      const btn = e.target.closest('.rm'); if(!btn) return;
      state.gallery.splice(Number(btn.dataset.i), 1); drawSubs();
    });
    subsFile?.addEventListener('change', async e=>{
      const files = Array.from(e.target.files||[]); if(!files.length) return;
      const remain = Math.max(0, 20 - state.gallery.length);
      for(const f of files.slice(0, remain)){
        if(!isImgOk(f)) continue; bump(+1);
        try{
          say('갤러리 업로드 중…');
          const url = await uploadImage(f);
          state.gallery.push(withTransform(url, THUMB.square));
          drawSubs(); say('업로드 완료', true);
        }catch(err){ console.error('[gallery upload]',err); say('업로드 실패: '+(err.message||'오류')); }
        finally{ bump(-1); }
      }
      e.target.value='';
    });

    // tags
    function drawTags(){
      $id('tagList').innerHTML = state.tags.map((t,i)=>`<span class="chip">${t}<button type="button" class="x" data-i="${i}" aria-label="삭제">×</button></span>`).join('');
    }
    $id('tagList')?.addEventListener('click', e=>{
      const x = e.target.closest('.x'); if(!x) return; state.tags.splice(Number(x.dataset.i),1); drawTags();
    });
    tagInput?.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===','){
        e.preventDefault();
        const raw = (tagInput.value||'').trim().replace(/,$/,''); if(!raw) return;
        if(state.tags.length>=12){ say('태그는 최대 12개'); return; }
        if(state.tags.includes(raw)){ tagInput.value=''; return; }
        state.tags.push(raw); tagInput.value=''; drawTags();
      }
    }); drawTags();

    // live rows
    function addLinkRow(v={ title:'', url:'', role:'host', date:'' }){
      const row=document.createElement('div'); row.className='live-row';
      row.innerHTML = `
        <div class="l-prev"><img alt=""></div>
        <div class="l-body">
          <input class="input l-title" placeholder="제목 (선택)" value="${v.title||''}">
          <div class="grid">
            <input class="input l-url" type="url" placeholder="https:// 링크 붙여넣기" value="${v.url||''}">
            <select class="input l-role">
              <option value="host" ${v.role==='host'?'selected':''}>진행</option>
              <option value="guest" ${v.role==='guest'?'selected':''}>게스트</option>
            </select>
            <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):''}">
            <button class="ic rm" type="button" aria-label="삭제">✕</button>
          </div>
        </div>`;
      linksWrap.appendChild(row);
      const u=row.querySelector('.l-url'); const img=row.querySelector('.l-prev img');
      const update=()=>{ const url=(u.value||'').trim(); const p=detectProvider(url); img.src = url?(thumbUrl(p,url)||''):''; };
      u.addEventListener('input', update); row.querySelector('.rm').addEventListener('click',()=>row.remove()); update();
    }
    addLinkBtn?.addEventListener('click', ()=>addLinkRow()); addLinkRow();

    // shorts chooser
    async function fetchMyShorts(){
      try{
        shortsGrid.innerHTML = `<div class="note">불러오는 중…</div>`;
        const r = await fetch(API_BASE + SHORTS_EP, { headers: headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
        const items = j.items || j.data || j.docs || [];
        if(!items.length){ shortsGrid.innerHTML = `<div class="note">등록된 쇼츠가 없습니다</div>`; return; }
        const cards = items.map(it=>{
          const id = it.id || it._id;
          const p  = it.provider || detectProvider(it.sourceUrl||'');
          const t  = it.thumbnailUrl || thumbUrl(p, it.sourceUrl||'');
          const sel = state.shortsSel.has(String(id)) ? 'aria-checked="true" class="sc on"' : 'class="sc"';
          return `<button type="button" ${sel} data-id="${id}"><img src="${t||'default.jpg'}" alt=""><i class="ri-check-fill"></i></button>`;
        }).join('');
        shortsGrid.innerHTML = cards;
      }catch(e){
        console.warn('[shorts load]',e);
        shortsGrid.innerHTML = `<div class="note err">쇼츠를 불러오지 못했습니다</div>`;
      }
    }
    shortsGrid?.addEventListener('click', (e)=>{
      const b = e.target.closest('button.sc'); if(!b) return;
      const id = b.dataset.id;
      const on = b.getAttribute('aria-checked')==='true';
      if(on){ state.shortsSel.delete(String(id)); b.setAttribute('aria-checked','false'); b.classList.remove('on'); }
      else { state.shortsSel.add(String(id)); b.setAttribute('aria-checked','true'); b.classList.add('on'); }
    });
    shortsRefresh?.addEventListener('click', fetchMyShorts);

    // validation
    function validate(pub){
      if(state.pending>0){ say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
      if(pub){
        if(!nickname?.value.trim()){ say('이름을 입력해주세요'); return false; }
        if(!slug?.value.trim()){ say('슬러그를 입력해주세요'); return false; }
        if(!state.mainThumbnailUrl){ say('대표 이미지를 업로드해주세요'); return false; }
      }
      if(primaryLink?.value && primaryLink.value.trim() && !/^https:\/\//.test(primaryLink.value.trim())){
        say('대표 링크는 https:// 로 시작'); return false;
      }
      const rows = Array.from(linksWrap?.querySelectorAll('.live-row')||[]);
      for(const r of rows){
        const u = r.querySelector('.l-url')?.value.trim();
        if(u && !/^https:\/\//.test(u)){ say('라이브 URL은 https:// 로 시작'); return false; }
      }
      return true;
    }

    const strOrU = (v) => (v && String(v).trim()) ? String(v).trim() : undefined;
    function collectPayload(status){
      // live links
      const rows = Array.from(linksWrap?.querySelectorAll('.live-row')||[]);
      const links = rows.map(r=>({
        title: strOrU(r.querySelector('.l-title')?.value),
        url: strOrU(r.querySelector('.l-url')?.value),
        role: r.querySelector('.l-role')?.value || 'host',
        date: strOrU(r.querySelector('.l-date')?.value),
      })).filter(x=>x.title||x.url);

      return {
        type: 'model',
        status,
        visibility: visibility?.value || 'public',
        slug: strOrU(slug?.value?.toLowerCase()),
        name: strOrU(nickname?.value),
        headline: strOrU(headline?.value),
        bio: strOrU(bio?.value),
        gender: strOrU(gender?.value),
        age: age?.value ? Number(age.value) : undefined,
        careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
        physical: {
          height: height?.value ? Number(height.value) : undefined,
          weight: weight?.value ? Number(weight.value) : undefined,
          top: strOrU(sizeTop?.value),
          bottom: strOrU(sizeBottom?.value),
          shoes: shoe?.value ? String(shoe.value) : undefined
        },
        location: [strOrU(regionCity?.value), strOrU(regionArea?.value)].filter(Boolean).join(' ') || undefined,
        links: {
          website: strOrU(linkWebsite?.value),
          instagram: strOrU(linkInstagram?.value),
          youtube: strOrU(linkYouTube?.value),
          tiktok: strOrU(linkTikTok?.value),
        },
        hero: { image: state.coverImageUrl || undefined, images: state.gallery.slice(0,4) },
        gallery: state.gallery,
        mainThumbnailUrl: state.mainThumbnailUrl || undefined, // (리스트 썸네일 용)
        tags: state.tags,
        reels: Array.from(state.shortsSel).map(id=>({ provider:'youtube', embedUrl:'', thumbnailUrl:'', id })), // 필요시 서버 변환
        openToOffers: true
      };
    }

    function formatServerError(data){
      try{
        const first = (Array.isArray(data?.details)&&data.details[0]) || (Array.isArray(data?.errors)&&data.errors[0]);
        if(first){
          const map={ name:'이름을 입력해주세요.', slug:'슬러그 형식을 확인해주세요.', mainThumbnailUrl:'대표 이미지를 업로드해주세요.' };
          const f = first.param || first.path || '';
          return map[f] || `[${f}] ${first.msg || 'invalid'}`;
        }
        return data?.message || '유효성 오류';
      }catch{ return '유효성 오류'; }
    }

    async function submit(status){
      if(!TOKEN){ location.href = 'login.html?returnTo='+here; return; }
      const pub = (status==='published');
      if(!validate(pub)) return;

      try{
        say(pub?'발행 중…':'임시저장 중…');
        const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(collectPayload(status)) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || data.ok===false) throw new Error(formatServerError(data) || `HTTP_${res.status}`);
        say(pub?'발행되었습니다':'임시저장 완료', true);
        setTimeout(()=>location.href='byhen.html?tab=models', 450);
      }catch(err){
        console.error('[submit error]', err);
        say('저장 실패: ' + (err.message || '네트워크 오류'));
      }
    }

    $id('publishBtn')?.addEventListener('click', e=>{ e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', e=>{ e.preventDefault(); submit('draft'); });

    // 편집 모드(id가 있으면 로드) — 필요시 확장
    state.id = new URLSearchParams(location.search).get('id') || '';
    if(state.id){
      try{
        say('불러오는 중…');
        const r = await fetch(`${API_BASE}/${ENTITY}/${state.id}`, { headers: headers(false) });
        const j = await r.json().catch(()=>({}));
        if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
        const d = j.data || j;

        nickname && (nickname.value = d.name || '');
        slug && (slug.value = d.slug || '');
        state.slugAuto = false;
        headline && (headline.value = d.headline || '');
        bio && (bio.value = d.bio || '');
        gender && (gender.value = d.gender || '');
        age && (age.value = d.age || '');
        careerYears && (careerYears.value = d.careerYears || '');
        visibility && (visibility.value = d.visibility || 'public');

        height && (height.value = d.physical?.height || '');
        weight && (weight.value = d.physical?.weight || '');
        sizeTop && (sizeTop.value = d.physical?.top || '');
        sizeBottom && (sizeBottom.value = d.physical?.bottom || '');
        shoe && (shoe.value = d.physical?.shoes || '');

        regionCity && (regionCity.value = (d.location||'').split(' ')[0] || '');
        regionArea && (regionArea.value = (d.location||'').split(' ').slice(1).join(' ') || '');

        linkWebsite && (linkWebsite.value = d.links?.website || '');
        linkInstagram && (linkInstagram.value = d.links?.instagram || '');
        linkYouTube && (linkYouTube.value = d.links?.youtube || '');
        linkTikTok && (linkTikTok.value = d.links?.tiktok || '');

        state.mainThumbnailUrl = d.mainThumbnailUrl || '';
        state.coverImageUrl = d.hero?.image || '';
        state.gallery = Array.isArray(d.gallery) ? d.gallery.slice(0,20) : [];
        state.tags = Array.isArray(d.tags) ? d.tags.slice(0,12) : [];
        if(Array.isArray(d.reels)) d.reels.forEach(x=>state.shortsSel.add(String(x.id||x)));

        if(state.mainThumbnailUrl) setPreview('main', state.mainThumbnailUrl);
        if(state.coverImageUrl) setPreview('cover', state.coverImageUrl);
        drawSubs(); drawTags(); if(bio) autoGrow(bio);

        say('로드 완료', true);
      }catch(err){
        console.error('[load edit]', err);
        say('불러오기 실패: ' + (err.message || '오류'));
      }
    }

    // 초기 쇼츠 로드(로그인 시)
    if(TOKEN) fetchMyShorts();

    // export(디버그)
    window.MODEL_APP = { state, submit };
  }
})();