/* model-new.js — v2.2.0 (단수 엔드포인트: /model-test, 토큰 만료 처리) */
(function () {
  'use strict';

  // ---- Config ----------------------------------------------------
  const CFG = window.LIVEE_CONFIG || {};
  const RAW_BASE = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
  const API_BASE = /^https?:\/\//i.test(RAW_BASE)
    ? RAW_BASE.replace(/\/+$/, '')
    : (location.origin + (RAW_BASE.startsWith('/') ? RAW_BASE : '/' + RAW_BASE)).replace(/\/+$/, '');

  const EP = CFG.endpoints || {};
  // ✅ 단수 엔드포인트만 사용
  const ENTITY = (EP.modelBase || '/model-test').replace(/\/+$/, '');

  const TOKEN =
    localStorage.getItem('livee_token') ||
    localStorage.getItem('liveeToken') ||
    '';

  // Cloudinary 변환 프리셋
  const THUMB = {
    square:  'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
  };

  // ---- utils -----------------------------------------------------
  const $id = (s) => document.getElementById(s);
  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  const goLogin = () => location.href = `login.html?returnTo=${here}`;

  const say = (t, ok = false) => {
    const el = $id('pfMsg');
    if (!el) return;
    el.textContent = t;
    el.classList.add('show');
    el.classList.toggle('ok', ok);
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

  const strOrU = (v) => (v && String(v).trim()) ? String(v).trim() : undefined;

  // ---- state -----------------------------------------------------
  const state = {
    id: '',
    pending: 0,
    mainThumbnailUrl: '',
    coverImageUrl: '',
    subThumbnails: [],
    tags: [],
    attachments: []
  };
  const bump = (n) => { state.pending = Math.max(0, state.pending + n); };

  // ---- boot ------------------------------------------------------
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  async function init() {
    // textarea auto height
    const bio = $id('bio');
    const autoGrow = (el) => { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(800, Math.max(180, el.scrollHeight)) + 'px'; };
    if (bio) { bio.addEventListener('input', () => autoGrow(bio)); setTimeout(() => autoGrow(bio), 0); }

    // triggers
    $id('mainTrigger')?.addEventListener('click', () => $id('mainFile')?.click());
    $id('coverTrigger')?.addEventListener('click', () => $id('coverFile')?.click());
    $id('subsTrigger')?.addEventListener('click', () => $id('subsFile')?.click());

    // Cloudinary 서명 업로드
    async function getSignature() {
      const r = await fetch(`${API_BASE}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) });
      if (r.status === 401) { say('로그인이 필요합니다'); goLogin(); return Promise.reject(new Error('UNAUTHORIZED')); }
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

    // preview helpers
    function setPreview(kind, url) {
      if (!url) return;
      if (kind === 'main') { const img = $id('mainPrev'); if (img) { img.src = url; img.style.display = 'block'; } $id('mainTrigger')?.classList.remove('is-empty'); }
      if (kind === 'cover') { const img = $id('coverPrev'); if (img) { img.src = url; img.style.display = 'block'; } $id('coverTrigger')?.classList.remove('is-empty'); }
    }

    // uploads
    $id('mainFile')?.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
      const local = URL.createObjectURL(f); setPreview('main', local); bump(+1);
      try { say('메인 이미지 업로드 중…'); const url = withTransform(await uploadImage(f), THUMB.square); state.mainThumbnailUrl = url; setPreview('main', url); say('업로드 완료', true); }
      catch (err) { console.error('[main upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
      finally { URL.revokeObjectURL(local); e.target.value = ''; bump(-1); }
    });

    $id('coverFile')?.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return; if (!isImgOk(f)) { e.target.value = ''; return; }
      const local = URL.createObjectURL(f); setPreview('cover', local); bump(+1);
      try { say('배경 이미지 업로드 중…'); const url = withTransform(await uploadImage(f), THUMB.cover169); state.coverImageUrl = url; setPreview('cover', url); say('업로드 완료', true); }
      catch (err) { console.error('[cover upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
      finally { URL.revokeObjectURL(local); e.target.value = ''; bump(-1); }
    });

    // sub gallery
    const subsGrid = $id('subsGrid');
    function drawSubs() {
      if (!subsGrid) return;
      subsGrid.innerHTML = state.subThumbnails.map((u, i) => `
        <div class="sub">
          <img src="${u}" alt="sub-${i}">
          <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
        </div>`).join('');
    }
    subsGrid?.addEventListener('click', (e) => {
      const b = e.target.closest('.rm'); if (!b) return;
      state.subThumbnails.splice(Number(b.dataset.i), 1); drawSubs();
    });
    $id('subsFile')?.addEventListener('change', async e => {
      const files = Array.from(e.target.files || []); if (!files.length) return;
      for (const f of files.slice(0, 5 - state.subThumbnails.length)) {
        if (!isImgOk(f)) continue;
        bump(+1);
        try { const url = withTransform(await uploadImage(f), THUMB.square); state.subThumbnails.push(url); drawSubs(); say('업로드 완료', true); }
        catch (err) { console.warn('[sub upload]', err); say('업로드 실패: ' + (err.message || '오류')); }
        finally { bump(-1); }
      }
      e.target.value = '';
    });

    // attachments (메타만)
    const attachments = $id('attachments'), attachList = $id('attachList');
    attachments?.addEventListener('change', () => {
      const files = Array.from(attachments.files || []);
      attachList && (attachList.innerHTML = files.map(f => `<li><i class="ri-file-line"></i>${f.name}</li>`).join(''));
      state.attachments = files;
    });

    // inline previews
    $id('nickname')?.addEventListener('input', () => $id('nicknamePreview') && ($id('nicknamePreview').textContent = ($id('nickname').value.trim() || '닉네임')));
    $id('headline')?.addEventListener('input', () => $id('headlinePreview') && ($id('headlinePreview').textContent = ($id('headline').value.trim() || '한 줄 소개')));

    // actions
    $id('publishBtn')?.addEventListener('click', (e) => { e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', (e) => { e.preventDefault(); submit('draft'); });

    // edit mode
    state.id = new URLSearchParams(location.search).get('id') || '';
    if (state.id) await loadExisting();

    // expose for debug
    window.MODEL_APP = { state };
  }

  // ---- validation & payload -------------------------------------
  function validate(pub) {
    if (state.pending > 0) { say('이미지 업로드 중입니다. 잠시 후 다시 시도해주세요.'); return false; }
    if (pub) {
      if (!state.mainThumbnailUrl) { say('메인 썸네일을 업로드해주세요'); return false; }
      if (!(($id('nickname')?.value || '').trim())) { say('닉네임을 입력해주세요'); return false; }
      if (!(($id('headline')?.value || '').trim())) { say('한 줄 소개를 입력해주세요'); return false; }
    }
    const pl = $id('primaryLink')?.value?.trim();
    if (pl && !/^https:\/\//.test(pl)) { say('대표 링크는 https:// 로 시작'); return false; }
    return true;
  }

  function collectPayload(status) {
    const region = { city: strOrU($id('regionCity')?.value), country: 'KR' };
    const demographics = {
      gender: strOrU($id('gender')?.value),
      height: $id('height')?.value ? Number($id('height').value) : undefined,
      sizeTop: strOrU($id('sizeTop')?.value),
      sizeBottom: strOrU($id('sizeBottom')?.value),
      shoe: strOrU($id('shoe')?.value),
      sizePublic: !!$id('sizePublic')?.checked,
      agePublic: !!$id('agePublic')?.checked,
      genderPublic: !!$id('genderPublic')?.checked,
      regionPublic: !!$id('regionPublic')?.checked,
      careerPublic: !!$id('careerPublic')?.checked
    };

    const links = {
      youtube:   strOrU($id('linkYouTube')?.value),
      instagram: strOrU($id('linkInstagram')?.value),
      website:   strOrU($id('primaryLink')?.value) // 대표 URL을 website로도 보관
    };

    return {
      type: 'model',
      status,
      visibility: $id('visibility')?.value || 'public',
      nickname: strOrU($id('nickname')?.value),
      headline: strOrU($id('headline')?.value),
      bio: strOrU($id('bio')?.value),
      mainThumbnailUrl: state.mainThumbnailUrl || undefined,
      coverImageUrl: state.coverImageUrl || undefined,
      subThumbnails: state.subThumbnails.filter(Boolean),
      careerYears: $id('careerYears')?.value ? Number($id('careerYears').value) : undefined,
      age: $id('age')?.value ? Number($id('age').value) : undefined,
      region, demographics, links,
      openToOffers: !!$id('openToOffers')?.checked,
      tags: state.tags
      // attachments: state.attachments // 실제 서버 업로드 붙일 때 사용
    };
  }

  // ---- submit/load ------------------------------------------------
  async function submit(status) {
    const pub = (status === 'published');
    if (!validate(pub)) return;

    try {
      if (!TOKEN) { say('로그인이 필요합니다'); return goLogin(); }

      say(pub ? '발행 중…' : '임시저장 중…');
      const url = state.id
        ? `${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}`
        : `${API_BASE}${ENTITY}`;
      const method = state.id ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(collectPayload(status)) });

      if (res.status === 401) { say('로그인이 만료되었습니다'); return goLogin(); }

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);

      state.id = j.data?.id || j.id || state.id;
      say(pub ? '발행되었습니다' : '임시저장 완료', true);
      // setTimeout(()=>location.href='mypage.html', 400);
    } catch (err) {
      console.error('[model save]', err);
      say('저장 실패: ' + (err.message || '네트워크 오류'));
    }
  }

  async function loadExisting() {
    try {
      if (!TOKEN) { say('로그인이 필요합니다'); return goLogin(); }

      say('불러오는 중…');
      const r = await fetch(`${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}`, { headers: headers(false) });
      if (r.status === 401) { say('로그인이 만료되었습니다'); return goLogin(); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);

      const d = j.data || j;

      // 기본
      $id('nickname') && ($id('nickname').value = d.nickname || '');
      $id('headline') && ($id('headline').value = d.headline || '');
      $id('bio') && ($id('bio').value = d.bio || '');
      $id('careerYears') && ($id('careerYears').value = d.careerYears || '');
      $id('age') && ($id('age').value = d.age || '');
      $id('visibility') && ($id('visibility').value = d.visibility || 'public');
      $id('openToOffers') && ($id('openToOffers').checked = d.openToOffers !== false);
      $id('primaryLink') && ($id('primaryLink').value = d.links?.website || d.primaryLink || '');
      $id('linkYouTube') && ($id('linkYouTube').value = d.links?.youtube || '');
      $id('linkInstagram') && ($id('linkInstagram').value = d.links?.instagram || '');

      // 지역/디모그래픽
      $id('regionCity') && ($id('regionCity').value = d.region?.city || '');
      $id('gender') && ($id('gender').value = d.demographics?.gender || '');
      $id('height') && ($id('height').value = d.demographics?.height || '');
      $id('sizeTop') && ($id('sizeTop').value = d.demographics?.sizeTop || '');
      $id('sizeBottom') && ($id('sizeBottom').value = d.demographics?.sizeBottom || '');
      $id('shoe') && ($id('shoe').value = d.demographics?.shoe || '');
      $id('sizePublic') && ($id('sizePublic').checked = !!d.demographics?.sizePublic);
      $id('agePublic') && ($id('agePublic').checked = !!d.demographics?.agePublic);
      $id('genderPublic') && ($id('genderPublic').checked = !!d.demographics?.genderPublic);
      $id('regionPublic') && ($id('regionPublic').checked = !!d.demographics?.regionPublic);
      $id('careerPublic') && ($id('careerPublic').checked = !!d.demographics?.careerPublic);

      // 이미지
      state.mainThumbnailUrl = d.mainThumbnailUrl || d.mainThumbnail || '';
      state.coverImageUrl    = d.coverImageUrl || d.coverImage || '';
      state.subThumbnails    = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0, 5)
                                : (Array.isArray(d.subImages) ? d.subImages.slice(0, 5) : []);

      setPreview('main', state.mainThumbnailUrl);
      setPreview('cover', state.coverImageUrl);
      (function drawSubs() {
        const subsGrid = $id('subsGrid');
        if (!subsGrid) return;
        subsGrid.innerHTML = state.subThumbnails.map((u, i) => `
          <div class="sub">
            <img src="${u}" alt="sub-${i}">
            <button type="button" class="rm" data-i="${i}">×</button>
          </div>`).join('');
      })();

      // inline preview text
      $id('nicknamePreview') && ($id('nicknamePreview').textContent = ($id('nickname').value.trim() || '닉네임'));
      $id('headlinePreview') && ($id('headlinePreview').textContent = ($id('headline').value.trim() || '한 줄 소개'));

      say('로드 완료', true);
    } catch (err) {
      console.error('[model load]', err);
      say('불러오기 실패: ' + (err.message || '오류'));
    }
  }
})();