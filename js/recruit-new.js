/* Livee v2.5 — Recruit Create (livee08)
 * - POST {API_BASE}/campaigns
 * - optional: POST {API_BASE}/uploads (multipart via server proxy)
 * - needs: localStorage 'livee_token'
 */
(() => {
  // ===== config =====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  let BASE_PATH = CFG.BASE_PATH || '';
  if (BASE_PATH && !BASE_PATH.startsWith('/')) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === '/') BASE_PATH = '';
  const TOKEN = localStorage.getItem('livee_token') || '';

  // ===== DOM refs =====
  const $ = (id) => document.getElementById(id);
  const form       = $('recruitForm');
  const titleEl    = $('title');
  const descEl     = $('desc');
  const categoryEl = $('category');
  const locationEl = $('location');
  const shootDate  = $('shootDate');
  const startTime  = $('startTime');
  const endTime    = $('endTime');
  const deadline   = $('deadline');
  const payEl      = $('pay');
  const negEl      = $('negotiable');
  const fileEl     = $('imageFile');
  const previewEl  = $('preview');
  const msgEl      = $('recruitMsg');

  // ===== init =====
  const todayISO = new Date().toISOString().slice(0,10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;
  if (previewEl && !previewEl.getAttribute('src')) previewEl.src = './default.jpg';

  // ===== helpers =====
  const headers = (isJSON = true) => {
    const h = {};
    if (isJSON) h['Content-Type'] = 'application/json';
    if (TOKEN)  h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  };
  const fail = (m='요청을 처리할 수 없습니다.') => alert(m);

  const isValidTimes = () => {
    if (!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  };
  const isValidDeadline = () => {
    if (!deadline?.value || !shootDate?.value) return false;
    return deadline.value <= shootDate.value;
  };

  // 이미지 업로드 (서버 프록시)
  async function uploadImage(file) {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers: TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : undefined,
        body: fd
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `업로드 실패 (${res.status})`);
      return {
        coverImageUrl: data.url || data.secure_url || data.coverImageUrl || '',
        thumbnailUrl:  data.thumbnail || data.thumbnailUrl || ''
      };
    } catch (e) {
      console.error('[upload]', e);
      fail(e.message);
      return null;
    }
  }

  // 미리보기
  fileEl?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      msgEl && (msgEl.textContent = '이미지 파일만 업로드할 수 있어요.');
      e.target.value = '';
      return;
    }
    const max = 4 * 1024 * 1024; // 4MB
    if (f.size > max) {
      msgEl && (msgEl.textContent = '용량이 큽니다. 4MB 이하로 올려주세요.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (previewEl) previewEl.src = ev.target.result;
      msgEl && (msgEl.textContent = '미리보기 적용됨');
    };
    reader.readAsDataURL(f);
  });

  // 협의 가능 토글
  negEl?.addEventListener('change', () => {
    if (!payEl) return;
    if (negEl.checked) {
      payEl.value = '';
      payEl.disabled = true;
      payEl.classList.add('disabled');
    } else {
      payEl.disabled = false;
      payEl.classList.remove('disabled');
    }
  });

  // ===== submit =====
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 로그인 필수
    if (!TOKEN) {
      const loginUrl = BASE_PATH ? `${BASE_PATH}/login.html` : './login.html';
      alert('로그인이 필요합니다.');
      location.href = `${loginUrl}?prev=${encodeURIComponent(location.href)}`;
      return;
    }

    // 검증
    const title = (titleEl?.value || '').trim();
    const desc  = (descEl?.value || '').trim();
    if (!title || title.length < 5) return fail('제목을 5자 이상 입력해주세요.');
    if (!desc || desc.length < 30) return fail('내용(브리프)을 30자 이상 입력해주세요.');
    if (!categoryEl?.value) return fail('카테고리를 선택해주세요.');
    if (!shootDate?.value)  return fail('촬영일을 선택해주세요.');
    if (!deadline?.value)   return fail('공고 마감일을 선택해주세요.');
    if (!startTime?.value || !endTime?.value) return fail('촬영 시작/종료 시간을 입력해주세요.');
    if (!isValidTimes()) return fail('종료 시간은 시작 시간 이후여야 합니다.');
    if (!isValidDeadline()) return fail('공고 마감일은 촬영일과 같거나 그 이전이어야 합니다.');

    // 출연료
    let pay = '';
    if (!negEl?.checked) {
      const raw = String(payEl?.value || '').trim();
      const n = Number(raw);
      if (!raw || isNaN(n) || n < 0) return fail('출연료를 숫자로 입력해주세요. 협의 가능이면 체크하세요.');
      // (선택) 최소 기준 걸고 싶으면 아래 주석 해제
      // if (n < 50000) return fail('출연료는 50,000원 이상 입력해주세요. 협의 시 체크');
      pay = raw;
    }

    // 이미지 업로드(선택)
    let imagePayload = {};
    const picked = fileEl?.files?.[0];
    if (picked) {
      const up = await uploadImage(picked);
      if (up) imagePayload = up;
    }

    // 페이로드 (v2.5 Campaign - recruit)
    const payload = {
      type: 'recruit',
      status: 'published', // 공개 저장 → 홈에 즉시 노출
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...imagePayload,
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

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `등록 실패 (${res.status})`);
      }

      alert('공고가 등록되었습니다.');
      const next = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : './index.html#recruits';
      location.replace(next);
    } catch (err) {
      console.error('[create]', err);
      fail(err.message);
    }
  });
})();