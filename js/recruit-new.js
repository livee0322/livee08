/* livee08 /js/recruit-new.js (v2.5, Cloudinary direct upload + debug) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const TOKEN = localStorage.getItem('livee_token') || '';
  const DEFAULT_STATUS = (new URLSearchParams(location.search).get('status') || 'published').toLowerCase();

  // ---------------- DOM ----------------
  const $id = (s) => document.getElementById(s);
  const form = $id('recruitForm');
  const titleEl = $id('title');
  const descEl  = $id('desc');
  const categoryEl = $id('category');
  const locationEl = $id('location');
  const shootDate  = $id('shootDate');
  const startTime  = $id('startTime');
  const endTime    = $id('endTime');
  const deadline   = $id('deadline');
  const payEl      = $id('pay');
  const negEl      = $id('negotiable');
  const fileEl     = $id('imageFile');
  const previewEl  = $id('preview');
  const msgEl      = $id('recruitMsg');

  const todayISO = new Date().toISOString().slice(0,10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  const log = (...a) => console.log('[recruit-new]', ...a);
  const fail = (m='요청 중 오류가 발생했습니다.') => alert(m);

  const headers = (json=true) => {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };

  // ---------- 시간/유효성 ----------
  const isValidTimes = () => {
    if (!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  };
  const isValidDeadline = () => deadline?.value && shootDate?.value && (deadline.value <= shootDate.value);

  // ---------- Cloudinary 업로드 (직접 업로드 방식) ----------
  async function getSignature() {
    const url = `${API_BASE}/uploads/signature`;
    log('GET signature →', url);
    const res = await fetch(url, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {} });
    const json = await res.json().catch(()=>({}));
    if (!res.ok || json.ok === false) throw new Error(json.message || `서명 실패(${res.status})`);
    const sig = json.data || json;
    log('signature ok:', sig);
    return sig; // {cloudName, apiKey, timestamp, signature, folder}
  }

  function transformUrl(url, transform) {
    try {
      const [h, t] = url.split('/upload/');
      return `${h}/upload/${transform}/${t}`;
    } catch { return url; }
  }

  async function uploadToCloudinary(file) {
    const sig = await getSignature();
    const { cloudName, apiKey, timestamp, signature, folder } = sig;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    if (folder) fd.append('folder', folder);
    fd.append('signature', signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    log('POST → Cloudinary', { url, name:file.name, size:file.size, type:file.type });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload?.addEventListener('progress', (e) => {
        if (e.length computable) log(`upload ${Math.round(e.loaded/e.total*100)}%`);
      });
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            const json = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) {
              log('cloudinary response', json);
              resolve(json.secure_url || json.url);
            } else {
              reject(new Error(json.error?.message || `Cloudinary HTTP_${xhr.status}`));
            }
          } catch {
            reject(new Error('Cloudinary 응답 파싱 실패'));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Cloudinary 네트워크 오류'));
      xhr.open('POST', url, true);
      xhr.send(fd);
    });
  }

  // 미리보기 + 업로드 예행검사
  fileEl?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { msgEl.textContent='이미지 파일만 업로드'; e.target.value=''; return; }
    if (f.size > 8*1024*1024)      { msgEl.textContent='최대 8MB까지 업로드 가능'; e.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { previewEl.src = ev.target.result; msgEl.textContent='미리보기 적용'; };
    reader.readAsDataURL(f);
  });

  // 협의 체크 → pay 잠금
  negEl?.addEventListener('change', () => {
    if (negEl.checked) {
      payEl.value = ''; payEl.disabled = true; payEl.classList.add('disabled');
    } else {
      payEl.disabled = false; payEl.classList.remove('disabled');
    }
  });

  // ---------- 제출 ----------
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!TOKEN) return fail('로그인이 필요합니다.');

    const title = (titleEl?.value || '').trim();
    const desc  = (descEl?.value || '').trim();
    if (!title) return fail('제목을 입력해주세요.');
    if (!desc || desc.length < 30) return fail('내용(브리프)을 30자 이상 입력해주세요.');
    if (!categoryEl?.value) return fail('카테고리를 선택해주세요.');
    if (!shootDate?.value) return fail('촬영일을 선택해주세요.');
    if (!deadline?.value)  return fail('공고 마감일을 선택해주세요.');
    if (!startTime?.value || !endTime?.value) return fail('촬영 시작/종료 시간을 입력해주세요.');
    if (!isValidTimes()) return fail('종료 시간은 시작 시간 이후여야 합니다.');
    if (!isValidDeadline()) return fail('마감일은 촬영일과 같거나 그 이전이어야 합니다.');

    // pay
    let pay = '';
    if (!negEl?.checked) {
      const raw = String(payEl?.value || '').trim();
      const n = Number(raw);
      if (!raw || isNaN(n) || n < 0) return fail('출연료를 숫자로 입력해주세요.');
      pay = raw;
    }

    // 이미지 업로드(선택)
    let coverImageUrl = '';
    let thumbnailUrl  = '';
    const picked = fileEl?.files?.[0];
    if (picked) {
      try {
        msgEl.textContent = '이미지 업로드 중...';
        coverImageUrl = await uploadToCloudinary(picked);
        // 썸네일 변환(16:9)
        const t = (CFG.thumb && CFG.thumb.card169) || 'c_fill,g_auto,w_640,h_360,f_auto,q_auto';
        thumbnailUrl = transformUrl(coverImageUrl, t);
        msgEl.textContent = '이미지 업로드 완료';
      } catch (err) {
        log('upload fail', err);
        return fail(`이미지 업로드 실패: ${err.message}`);
      }
    } else {
      log('no image selected; proceed without coverImageUrl');
    }

    // payload
    const payload = {
      type: 'recruit',
      status: DEFAULT_STATUS,   // published / draft
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(coverImageUrl ? { coverImageUrl } : {}),
      ...(thumbnailUrl  ? { thumbnailUrl }  : {}),
      recruit: {
        recruitType: 'product',
        location: (locationEl?.value || '').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        pay,
        payNegotiable: !!negEl?.checked,
        requirements: desc,
        preferred: '',
        questions: []
      }
    };

    log('POST /campaigns payload', payload);

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `등록 실패(${res.status})`);
      alert('공고가 등록되었습니다.');
      location.href = (CFG.BASE_PATH || '') + '/index.html#recruits';
    } catch (err) {
      console.error('[create]', err);
      fail(err.message);
    }
  });
})();