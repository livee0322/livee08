/* portfolio-new.js — v2.1 (gallery+shorts link, live link preview, demographics)
   - 폼 ID 없어도 초기화 중단되지 않도록 수정
   - 발행/임시저장 위임 바인딩 추가(동적 렌더/다른 래퍼에서도 동작)
   - 로그인 없을 때 안내 후 리다이렉트
   - 제출 시 디버그 로그 출력
*/
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const ENTITY = 'portfolio-test';
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
  const stripHtml = (s = '') => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const pickHeadline = (d) =>
    (d.headline && String(d.headline).trim()) || d.intro || d.oneLiner ||
    (d.bio ? stripHtml(d.bio).slice(0, 60) : '') || '';

  // ---- Provider utils (공용: shorts와 동일 규칙) ----
  const ytId = (u = '') => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/) || [])[1] || '';
  const igId = (u = '') => (u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/) || [])[1] || '';
  const tkId = (u = '') => (u.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) || [])[1] || '';
  const detectProvider = (url = '') =>
    /youtu\.?be|youtube\.com/.test(url) ? 'youtube' :
      /instagram\.com/.test(url) ? 'instagram' :
        /tiktok\.com/.test(url) ? 'tiktok' : 'etc';
  const embedUrl = (p, url) => {
    switch (p) {
      case 'youtube': { const id = ytId(url); return id ? `https://www.youtube.com/embed/${id}` : ''; }
      case 'instagram': { const id = igId(url); return id ? `https://www.instagram.com/reel/${id}/embed` : ''; }
      case 'tiktok': { const id = tkId(url); return id ? `https://www.tiktok.com/embed/v2/${id}` : ''; }
      default: return '';
    }
  };
  const thumbUrl = (p, url) =>
    p === 'youtube' ? (ytId(url) ? `https://img.youtube.com/vi/${ytId(url)}/hqdefault.jpg` : '') : '';

  // ---- 상태 ----
  const state = {
    id: '',
    mainThumbnailUrl: '',
    coverImageUrl: '',
    subThumbnails: [],
    tags: [],
    shortsSel: new Set(), // 선택된 쇼츠 id
    pending: 0,
  };
  const bump = (n) => { state.pending = Math.max(0, state.pending + n); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    // 폼이 없어도 진행(버튼 위임 바인딩/기본 초기화는 동작)
    const form = $id('pfForm');
    if (!form) console.warn('[pfForm] not found — continue with defensive binding');

    // ----- element refs -----
    const mainFile = $id('mainFile'), coverFile = $id('coverFile'), subsFile = $id('subsFile');
    const mainTrig = $id('mainTrigger'), coverTrig = $id('coverTrigger'), subsTrig = $id('subsTrigger');
    const mainPrev = $id('mainPrev'), coverPrev = $id('coverPrev'), subsGrid = $id('subsGrid');

    const nickname = $id('nickname'), headline = $id('headline'), bio = $id('bio');
    const careerYears = $id('careerYears'), age = $id('age'), primaryLink = $id('primaryLink');
    const visibility = $id('visibility'), openToOffers = $id('openToOffers');

    // NEW: demographics & region & social
    const regionCity = $id('regionCity'), regionArea = $id('regionArea');
    const gender = $id('gender'), height = $id('height'), weight = $id('weight');
    const sizeTop = $id('sizeTop'), sizeBottom = $id('sizeBottom'), shoe = $id('shoe');
    const agePublic = $id('agePublic'), sizePublic = $id('sizePublic');
    const linkWebsite = $id('linkWebsite'), linkInstagram = $id('linkInstagram'), linkYouTube = $id('linkYouTube'), linkTikTok = $id('linkTikTok');

    // NEW: shorts chooser
    const shortsGrid = $id('shortsGrid'), shortsRefresh = $id('shortsRefresh');

    // NEW: live links (미리보기)
    const linksWrap = $id('linksWrap'), addLinkBtn = $id('addLinkBtn');

    // tag
    const tagInput = $id('tagInput'), tagList = $id('tagList');

    const nicknamePreview = $id('nicknamePreview'), headlinePreview = $id('headlinePreview');

    // ----- textarea auto-height -----
    const autoGrow = (el) => { el.style.height = 'auto'; el.style.height = Math.min(800, Math.max(180, el.scrollHeight)) + 'px'; };
    bio?.addEventListener('input', () => autoGrow(bio)); if (bio) setTimeout(() => autoGrow(bio), 0);

    // ----- file triggers -----
    mainTrig?.addEventListener('click', e => { e.preventDefault(); mainFile?.click(); });
    coverTrig?.addEventListener('click', e => { e.preventDefault(); coverFile?.click(); });
    subsTrig?.addEventListener('click', e => { e.preventDefault(); subsFile?.click(); });

    // ----- Cloudinary upload helpers -----
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

    // ----- upload handlers -----
    function setPreview(kind, url) {
      if (!url) return;
      if (kind === 'main') { mainPrev.src = url; mainPrev.style.display = 'block'; mainTrig?.classList.remove('is-empty'); }
      if (kind === 'cover') { coverPrev.src = url; coverPrev.style.display = 'block'; coverTrig?.classList.remove('is-empty'); }
    }
    mainFile?.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
      const local = URL.createObjectURL(f); setPreview('main', local); bump(+1);
      try { say('메인 이미지 업로드 중…'); const url = await uploadImage(f); state.mainThumbnailUrl = withTransform(url, THUMB.square); setPreview('main', state.mainThumbnailUrl); say('업로드 완료', true); }
      catch (err) { console.error('[main upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
      finally { URL.revokeObjectURL(local); bump(-1); e.target.value = ''; }
    });
    coverFile?.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
      const local = URL.createObjectURL(f); setPreview('cover', local); bump(+1);
      try { say('배경 이미지 업로드 중…'); const url = await uploadImage(f); state.coverImageUrl = withTransform(url, THUMB.cover169); setPreview('cover', state.coverImageUrl); say('업로드 완료', true); }
      catch (err) { console.error('[cover upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
      finally { URL.revokeObjectURL(local); bump(-1); e.target.value = ''; }
    });

    function drawSubs() {
      if (!subsGrid) return;
      const items = state.subThumbnails.map((u, i) => `
        <div class="sub">
          <img src="${u}" alt="sub-${i}">
          <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
        </div>`).join('');
      subsGrid.innerHTML = items;
    }
    subsGrid?.addEventListener('click', e => {
      const btn = e.target.closest('.rm'); if (!btn) return;
      state.subThumbnails.splice(Number(btn.dataset.i), 1); drawSubs();
    });
    subsFile?.addEventListener('change', async e => {
      const files = Array.from(e.target.files || []); if (!files.length) return;
      const remain = Math.max(0, 12 - state.subThumbnails.length); // 갤러리 확장(최대 12)
      for (const f of files.slice(0, remain)) {
        if (!isImgOk(f)) continue;
        bump(+1);
        try {
          say('이미지 업로드 중…');
          const url = await uploadImage(f);
          state.subThumbnails.push(withTransform(url, THUMB.square));
          drawSubs(); say('업로드 완료', true);
        } catch (err) {
          console.error('[sub upload]', err); say('업로드 실패: ' + (err.message || '오류'));
        } finally { bump(-1); }
      }
      e.target.value = '';
    });

    // ----- tags -----
    const tagState = state.tags;
    function drawTags() {
      tagList.innerHTML = tagState.map((t, i) =>
        `<span class="chip">${t}<button type="button" class="x" data-i="${i}" aria-label="태그 삭제">×</button></span>`
      ).join('');
    }
    tagList?.addEventListener('click', e => {
      const x = e.target.closest('.x'); if (!x) return;
      tagState.splice(Number(x.dataset.i), 1); drawTags();
    });
    tagInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const raw = (tagInput.value || '').trim().replace(/,$/, '');
        if (!raw) return;
        if (tagState.length >= 12) { say('태그는 최대 12개'); return; }
        if (tagState.includes(raw)) { tagInput.value = ''; return; }
        tagState.push(raw); tagInput.value = ''; drawTags();
      }
    });
    drawTags();

    // ----- nickname/headline preview -----
    nickname?.addEventListener('input', () => nicknamePreview.textContent = (nickname.value.trim() || '닉네임'));
    headline?.addEventListener('input', () => headlinePreview.textContent = (headline.value.trim() || '한 줄 소개'));

    // ----- live link rows (with thumbnail preview) -----
    function addLinkRow(v = { title: '', url: '', date: '', role: 'host' }) {
      const row = document.createElement('div'); row.className = 'live-row';
      row.innerHTML = `
        <div class="l-prev"><img alt=""></div>
        <div class="l-body">
          <input class="input l-title" placeholder="제목 (선택)" value="${v.title || ''}">
          <div class="grid">
            <input class="input l-url" type="url" placeholder="https:// 링크 붙여넣기" value="${v.url || ''}">
            <select class="input l-role">
              <option value="host" ${v.role === 'host' ? 'selected' : ''}>진행</option>
              <option value="guest" ${v.role === 'guest' ? 'selected' : ''}>게스트</option>
            </select>
            <input class="input l-date" type="date" value="${v.date ? String(v.date).slice(0, 10) : ''}">
            <button class="ic rm" type="button" aria-label="삭제">✕</button>
          </div>
        </div>`;
      linksWrap.appendChild(row);
      const u = row.querySelector('.l-url');
      const img = row.querySelector('.l-prev img');
      const updatePrev = () => {
        const url = (u.value || '').trim();
        const p = detectProvider(url);
        img.src = url ? (thumbUrl(p, url) || '') : '';
      };
      u.addEventListener('input', updatePrev);
      row.querySelector('.rm').addEventListener('click', () => row.remove());
      updatePrev();
    }
    addLinkBtn?.addEventListener('click', () => addLinkRow());
    addLinkRow();

    // ----- shorts chooser -----
    async function fetchMyShorts() {
      try {
        shortsGrid.innerHTML = `<div class="note">불러오는 중…</div>`;
        const r = await fetch(API_BASE + SHORTS_EP, { headers: headers(false) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
        const items = j.items || j.data || j.docs || [];
        if (!items.length) { shortsGrid.innerHTML = `<div class="note">등록된 쇼츠가 없습니다</div>`; return; }
        const cards = items.map(it => {
          const id = it.id || it._id;
          const p = it.provider || detectProvider(it.sourceUrl || '');
          const t = it.thumbnailUrl || thumbUrl(p, it.sourceUrl || '');
          const sel = state.shortsSel.has(String(id)) ? 'aria-checked="true" class="sc on"' : 'class="sc"';
          return `
            <button type="button" ${sel} data-id="${id}">
              <img src="${t || 'default.jpg'}" alt="">
              <i class="ri-check-fill"></i>
            </button>`;
        }).join('');
        shortsGrid.innerHTML = cards;
      } catch (e) {
        console.warn('[shorts load]', e);
        shortsGrid.innerHTML = `<div class="note err">쇼츠를 불러오지 못했습니다</div>`;
      }
    }
    shortsGrid?.addEventListener('click', (e) => {
      const b = e.target.closest('button.sc'); if (!b) return;
      const id = b.dataset.id;
      const on = b.getAttribute('aria-checked') === 'true';
      if (on) { state.shortsSel.delete(String(id)); b.setAttribute('aria-checked', 'false'); b.classList.remove('on'); }
      else { state.shortsSel.add(String(id)); b.setAttribute('aria-checked', 'true'); b.classList.add('on'); }
    });
    shortsRefresh?.addEventListener('click', fetchMyShorts);

    // ----- validation & payload -----
    const strOrU = (v) => (v && String(v).trim()) ? String(v).trim() : undefined;

    function validate(pub) {
      if (state.pending > 0) { say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
      if (pub) {
        if (!state.mainThumbnailUrl) { say('메인 썸네일을 업로드해주세요'); return false; }
        if (!nickname?.value.trim()) { say('닉네임을 입력해주세요'); return false; }
        if (!headline?.value.trim()) { say('한 줄 소개를 입력해주세요'); return false; }
      }
      if (primaryLink?.value && primaryLink.value.trim() && !/^https:\/\//.test(primaryLink.value.trim())) {
        say('대표 링크는 https:// 로 시작'); return false;
      }
      const rows = Array.from(linksWrap?.querySelectorAll('.live-row') || []);
      for (const r of rows) {
        const u = r.querySelector('.l-url')?.value.trim();
        if (u && !/^https:\/\//.test(u)) { say('라이브 URL은 https:// 로 시작'); return false; }
      }
      return true;
    }

    function collectPayload(status) {
      // live links
      const rows = Array.from(linksWrap?.querySelectorAll('.live-row') || []);
      const links = rows.map(r => ({
        title: strOrU(r.querySelector('.l-title')?.value),
        url: strOrU(r.querySelector('.l-url')?.value),
        role: r.querySelector('.l-role')?.value || 'host',
        date: strOrU(r.querySelector('.l-date')?.value),
      })).filter(x => x.title || x.url);

      // socials
      const linksObj = {
        website: strOrU(linkWebsite?.value),
        instagram: strOrU(linkInstagram?.value),
        youtube: strOrU(linkYouTube?.value),
        tiktok: strOrU(linkTikTok?.value),
      };

      // demographics
      const demo = {
        gender: strOrU(gender?.value),
        birthYear: age?.value ? (new Date().getFullYear() - Number(age.value)) : undefined,
        agePublic: !!agePublic?.checked,
        height: height?.value ? Number(height.value) : undefined,
        weight: weight?.value ? Number(weight.value) : undefined,
        sizeTop: strOrU(sizeTop?.value),
        sizeBottom: strOrU(sizeBottom?.value),
        shoe: strOrU(shoe?.value),
        sizePublic: !!sizePublic?.checked,
      };

      const region = {
        city: strOrU(regionCity?.value),
        area: strOrU(regionArea?.value),
        country: 'KR',
      };

      return {
        type: 'portfolio',
        status,
        visibility: visibility?.value || 'public',
        nickname: strOrU(nickname?.value),
        headline: strOrU(headline?.value),
        bio: strOrU(bio?.value),
        mainThumbnailUrl: state.mainThumbnailUrl || undefined,
        coverImageUrl: state.coverImageUrl || undefined,
        subThumbnails: state.subThumbnails.filter(Boolean), // 이미지 갤러리(간단형)
        careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
        age: age?.value ? Number(age.value) : undefined,
        primaryLink: strOrU(primaryLink?.value),
        openToOffers: !!openToOffers?.checked,
        liveLinks: links,
        tags: state.tags,
        // NEW
        region, demographics: demo, links: linksObj,
        shorts: Array.from(state.shortsSel),
      };
    }

    function formatServerError(data) {
      try {
        const first = (Array.isArray(data?.details) && data.details[0]) || (Array.isArray(data?.errors) && data.errors[0]);
        if (first) {
          const map = { nickname: '닉네임을 입력해주세요.', headline: '한 줄 소개를 입력해주세요.', mainThumbnailUrl: '메인 썸네일을 업로드해주세요.' };
          const f = first.param || first.path || '';
          return map[f] || `[${f}] ${first.msg || 'invalid'}`;
        }
        return data?.message || '유효성 오류';
      } catch { return '유효성 오류'; }
    }

    async function submit(status) {
      if (!TOKEN) {
        say('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        location.href = 'login.html?returnTo=' + here;
        return;
      }
      const pub = (status === 'published');
      if (!validate(pub)) return;

      try {
        say(pub ? '발행 중…' : '임시저장 중…');
        const url = state.id ? `${API_BASE}/${ENTITY}/${state.id}` : `${API_BASE}/${ENTITY}`;
        const method = state.id ? 'PUT' : 'POST';
        const payload = collectPayload(status);
        console.log('[PF submit]', { method, url, status, payload });
        const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(formatServerError(data) || `HTTP_${res.status}`);
        say(pub ? '발행되었습니다' : '임시저장 완료', true);
        setTimeout(() => location.href = 'mypage.html', 450);
      } catch (err) {
        console.error('[submit error]', err);
        say('저장 실패: ' + (err.message || '네트워크 오류'));
      }
    }

    // ----- buttons -----
    // 직접 바인딩(있으면 즉시 동작)
    $id('publishBtn')?.addEventListener('click', e => { e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', e => { e.preventDefault(); submit('draft'); });

    // 위임 바인딩(동적 삽입/다른 래퍼 내부여도 동작)
    document.addEventListener('click', (e) => {
      const pub = e.target.closest && e.target.closest('#publishBtn');
      const draft = e.target.closest && e.target.closest('#saveDraftBtn');
      if (pub) { e.preventDefault(); submit('published'); }
      if (draft) { e.preventDefault(); submit('draft'); }
    });

    // ----- edit mode -----
    state.id = new URLSearchParams(location.search).get('id') || '';
    if (state.id) {
      try {
        say('불러오는 중…');
        const r = await fetch(`${API_BASE}/${ENTITY}/${state.id}`, { headers: headers(false) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
        const d = j.data || j;

        // fill
        nickname && (nickname.value = d.nickname || '');
        headline && (headline.value = pickHeadline(d));
        bio && (bio.value = d.bio || '');
        careerYears && (careerYears.value = d.careerYears || '');
        age && (age.value = d.age || '');
        visibility && (visibility.value = d.visibility || 'public');
        openToOffers && (openToOffers.checked = d.openToOffers !== false);

        // region
        regionCity && (regionCity.value = d.region?.city || '');
        regionArea && (regionArea.value = d.region?.area || '');

        // demo
        gender && (gender.value = d.demographics?.gender || '');
        height && (height.value = d.demographics?.height || '');
        weight && (weight.value = d.demographics?.weight || '');
        sizeTop && (sizeTop.value = d.demographics?.sizeTop || '');
        sizeBottom && (sizeBottom.value = d.demographics?.sizeBottom || '');
        shoe && (shoe.value = d.demographics?.shoe || '');
        agePublic && (agePublic.checked = !!d.demographics?.agePublic);
        sizePublic && (sizePublic.checked = !!d.demographics?.sizePublic);

        // socials
        linkWebsite && (linkWebsite.value = d.links?.website || '');
        linkInstagram && (linkInstagram.value = d.links?.instagram || '');
        linkYouTube && (linkYouTube.value = d.links?.youtube || '');
        linkTikTok && (linkTikTok.value = d.links?.tiktok || '');

        primaryLink && (primaryLink.value = d.primaryLink || '');

        // previews & arrays
        state.mainThumbnailUrl = d.mainThumbnailUrl || '';
        state.coverImageUrl = d.coverImageUrl || '';
        state.subThumbnails = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0, 12) : [];
        state.tags = Array.isArray(d.tags) ? d.tags.slice(0, 12) : [];
        if (Array.isArray(d.shorts)) d.shorts.forEach(id => state.shortsSel.add(String(id)));

        setPreview('main', state.mainThumbnailUrl);
        setPreview('cover', state.coverImageUrl);
        drawSubs(); drawTags();

        nicknamePreview.textContent = nickname.value.trim() || '닉네임';
        headlinePreview.textContent = headline.value.trim() || '한 줄 소개';
        if (bio) autoGrow(bio);

        say('로드 완료', true);
      } catch (err) {
        console.error('[load edit]', err);
        say('불러오기 실패: ' + (err.message || '오류'));
      }
    }

    // 초기 쇼츠 로드
    if (TOKEN) fetchMyShorts();

    // 디버그
    window.PF_APP = { state, submit };
  }
})();