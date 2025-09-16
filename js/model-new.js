/* model-new.js — v2.1.0 (포트폴리오 신규 폼 로직 재사용 / 쇼츠·최근라이브 제외) */
(function () {
  'use strict';

  // ---- Config ----------------------------------------------------
  const CFG = window.LIVEE_CONFIG || {};
  const RAW_BASE = (CFG.API_BASE || '/api/v1').toString().trim() || '/api/v1';
  const API_BASE = /^https?:\/\//i.test(RAW_BASE) ? RAW_BASE.replace(/\/+$/,'')
                  : (location.origin + (RAW_BASE.startsWith('/') ? RAW_BASE : '/' + RAW_BASE)).replace(/\/+$/,'');
  const EP = CFG.endpoints || {};
  const ENTITY = (EP.models || '/models-test').replace(/\/+$/,'');

  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // 이미지 변환 프리셋(Cloudinary)
  const THUMB = {
    square:  'c_fill,g_auto,w_600,h_600,f_auto,q_auto',
    cover169:'c_fill,g_auto,w_1280,h_720,f_auto,q_auto'
  };

  // ---- tiny utils ------------------------------------------------
  const $id = (s) => document.getElementById(s);
  const say = (t, ok = false) => { const el = $id('pfMsg'); if (!el) return; el.textContent = t; el.classList.add('show'); el.classList.toggle('ok', ok); };
  const headers = (json = true) => { const h = { Accept: 'application/json' }; if (json) h['Content-Type'] = 'application/json'; if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`; return h; };
  const withTransform = (url, t) => { try { if (!url || !/\/upload\//.test(url)) return url || ''; const i = url.indexOf('/upload/'); return url.slice(0, i + 8) + t + '/' + url.slice(i + 8); } catch { return url; } };
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
    // textarea 자동 높이
    const bio = $id('bio');
    const autoGrow = (el) => { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(800, Math.max(180, el.scrollHeight)) + 'px'; };
    if (bio) { bio.addEventListener('input', () => autoGrow(bio)); setTimeout(() => autoGrow(bio), 0); }

    // 파일 트리거
    $id('mainTrigger')?.addEventListener('click', () => $id('mainFile')?.click());
    $id('coverTrigger')?.addEventListener('click', () => $id('coverFile')?.click());
    $id('subsTrigger')?.addEventListener('click', () => $id('subsFile')?.click());

    // 업로드(Cloudinary 사인)
    async function getSignature() {
      const r = await fetch(`${API_BASE}${EP.uploadsSignature || '/uploads/signature'}`, { headers: headers(false) });
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
    const isImgOk = (f) => { if (!/^image\//.test(f.type)) { say('이미지 파일만 업로드 가능'); return false; } if (f.size > 8 * 1024 * 1024) { say('이미지는 8MB 이하'); return false; } return true; };

    // 프리뷰 유틸
    function setPreview(kind, url) {
      if (!url) return;
      if (kind === 'main') { const img = $id('mainPrev'); img.src = url; img.style.display = 'block'; $id('mainTrigger')?.classList.remove('is-empty'); }
      if (kind === 'cover') { const img = $id('coverPrev'); img.src = url; img.style.display = 'block'; $id('coverTrigger')?.classList.remove('is-empty'); }
    }

    // 메인/커버 업로드
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

    // 서브 갤러리
    const subsGrid = $id('subsGrid');
    function drawSubs() {
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

    // 첨부 파일(메타만 표시; 업로드는 서버 정책에 맞춰 후처리)
    const attachments = $id('attachments'), attachList = $id('attachList');
    attachments?.addEventListener('change', () => {
      const files = Array.from(attachments.files || []);
      attachList.innerHTML = files.map(f => `<li><i class="ri-file-line"></i>${f.name}</li>`).join('');
      state.attachments = files;
    });

    // 미리보기 닉네임/한줄소개
    $id('nickname')?.addEventListener('input', () => $id('nicknamePreview').textContent = ($id('nickname').value.trim() || '닉네임'));
    $id('headline')?.addEventListener('input', () => $id('headlinePreview').textContent = ($id('headline').value.trim() || '한 줄 소개'));

    // 저장 버튼
    $id('publishBtn')?.addEventListener('click', (e) => { e.preventDefault(); submit('published'); });
    $id('saveDraftBtn')?.addEventListener('click', (e) => { e.preventDefault(); submit('draft'); });

    // 수정 모드
    state.id = new URLSearchParams(location.search).get('id') || '';
    if (state.id) await loadExisting();

    // 디버그
    window.MODEL_APP = { state };
  }

  // 유효성 & 페이로드
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
      website:   strOrU($id('primaryLink')?.value)   // 대표 링크를 website로도 같이 전송 (백엔드 매핑 용이)
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
      // attachments: state.attachments (※ 실제 업로드 스트리밍을 붙일 경우 사용)
    };
  }

  async function submit(status) {
    const pub = (status === 'published');
    if (!validate(pub)) return;

    try {
      say(pub ? '발행 중…' : '임시저장 중…');
      const url = state.id
        ? `${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}`
        : `${API_BASE}${ENTITY}`;
      const method = state.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: headers(true), body: JSON.stringify(collectPayload(status)) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.message || `HTTP_${res.status}`);
      state.id = j.data?.id || j.id || state.id;
      say(pub ? '발행되었습니다' : '임시저장 완료', true);
      // 필요 시 이동: setTimeout(()=>location.href='mypage.html', 400);
    } catch (err) {
      console.error('[model save]', err);
      say('저장 실패: ' + (err.message || '네트워크 오류'));
    }
  }

  async function loadExisting() {
    try {
      say('불러오는 중…');
      const r = await fetch(`${API_BASE}${ENTITY}/${encodeURIComponent(state.id)}`, { headers: headers(false) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
      const d = j.data || j;

      // 기본
      $id('nickname').value = d.nickname || '';
      $id('headline').value = d.headline || '';
      $id('bio').value = d.bio || '';
      $id('careerYears').value = d.careerYears || '';
      $id('age').value = d.age || '';
      $id('visibility').value = d.visibility || 'public';
      $id('openToOffers').checked = d.openToOffers !== false;
      $id('primaryLink').value = d.links?.website || d.primaryLink || '';
      $id('linkYouTube').value = d.links?.youtube || '';
      $id('linkInstagram').value = d.links?.instagram || '';

      // 지역/디모그래픽
      $id('regionCity').value = d.region?.city || '';
      $id('gender').value = d.demographics?.gender || '';
      $id('height').value = d.demographics?.height || '';
      $id('sizeTop').value = d.demographics?.sizeTop || '';
      $id('sizeBottom').value = d.demographics?.sizeBottom || '';
      $id('shoe').value = d.demographics?.shoe || '';
      $id('sizePublic').checked = !!d.demographics?.sizePublic;
      $id('agePublic').checked = !!d.demographics?.agePublic;
      $id('genderPublic').checked = !!d.demographics?.genderPublic;
      $id('regionPublic').checked = !!d.demographics?.regionPublic;
      $id('careerPublic').checked = !!d.demographics?.careerPublic;

      // 이미지
      state.mainThumbnailUrl = d.mainThumbnailUrl || d.mainThumbnail || '';
      state.coverImageUrl    = d.coverImageUrl || d.coverImage || '';
      state.subThumbnails    = Array.isArray(d.subThumbnails) ? d.subThumbnails.slice(0, 5) : (Array.isArray(d.subImages) ? d.subImages.slice(0, 5) : []);
      setPreview('main', state.mainThumbnailUrl);
      setPreview('cover', state.coverImageUrl);
      (function drawSubs() {
        const subsGrid = $id('subsGrid');
        subsGrid.innerHTML = state.subThumbnails.map((u, i) => `
          <div class="sub">
            <img src="${u}" alt="sub-${i}">
            <button type="button" class="rm" data-i="${i}">×</button>
          </div>`).join('');
      })();

      // 미리보기 텍스트
      $id('nicknamePreview').textContent = ($id('nickname').value.trim() || '닉네임');
      $id('headlinePreview').textContent = ($id('headline').value.trim() || '한 줄 소개');

      say('로드 완료', true);
    } catch (err) {
      console.error('[model load]', err);
      say('불러오기 실패: ' + (err.message || '오류'));
    }
  }
})();