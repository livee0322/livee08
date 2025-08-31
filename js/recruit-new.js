/* Livee v2.5 - Recruit New (Server Integration)
   - POST /api/v1/campaigns  (type: 'recruit')
   - Optional: POST /api/v1/uploads  (multipart image upload)
   - Bearer token from localStorage 'livee_token'
*/

(() => {
  const $ = (id) => document.getElementById(id);

  // ===== DOM =====
  const form = $('recruitForm');
  const title = $('title');
  const desc = $('desc');
  const category = $('category');
  const locationEl = $('location');
  const shootDate = $('shootDate');
  const deadline = $('deadline');
  const startTime = $('startTime');
  const endTime = $('endTime');
  const pay = $('pay');
  const neg = $('negotiable');
  const file = $('imageFile');
  const preview = $('preview');
  const msg = $('recruitMsg');

  // ===== Config =====
  const API_BASE = (window.API_BASE || '/api/v1').replace(/\/$/, ''); // from config.js or fallback
  const TOKEN = localStorage.getItem('livee_token') || '';

  // ===== Helpers =====
  const todayISO = new Date().toISOString().slice(0,10);
  shootDate.min = todayISO;
  deadline.min   = todayISO;

  function alertFail(message = '요청 중 오류가 발생했습니다.') {
    alert(message);
  }

  function buildHeaders(isJSON = true) {
    const h = {};
    if (isJSON) h['Content-Type'] = 'application/json';
    if (TOKEN)  h['Authorization'] = `Bearer ${TOKEN}`;
    return h;
  }

  function validTimes() {
    if (!shootDate.value || !startTime.value || !endTime.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  }

  function validDeadline() {
    if (!deadline.value || !shootDate.value) return false;
    return deadline.value <= shootDate.value;
  }

  // 파일 → 서버 업로드 (멀티파트)
  async function uploadImage(file) {
    if (!file) return null;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers: TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : undefined,
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `업로드 실패 (${res.status})`);
      }
      // 기대 형태: { ok:true, url:'...', thumbnail:'...' } 혹은 {url}
      return {
        coverImageUrl: data.url || data.secure_url || data.coverImageUrl || '',
        thumbnailUrl:  data.thumbnail || data.thumbnailUrl || ''
      };
    } catch (err) {
      console.error('Upload error:', err);
      alertFail(err.message);
      return null;
    }
  }

  // 이미지 미리보기
  file.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      msg.textContent = '이미지 파일만 업로드할 수 있습니다.';
      e.target.value = '';
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (f.size > maxSize) {
      msg.textContent = '파일 용량이 커요. 2MB 이하로 올려주세요.';
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      msg.textContent = '미리보기가 적용되었습니다.';
    };
    reader.readAsDataURL(f);
  });

  // 협의 가능 체크 → pay 비활성화
  neg.addEventListener('change', () => {
    if (neg.checked) {
      pay.value = '';
      pay.setAttribute('disabled', 'disabled');
      pay.classList.add('disabled');
    } else {
      pay.removeAttribute('disabled');
      pay.classList.remove('disabled');
    }
  });

  // ===== Submit =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 로그인 토큰 확인
    if (!TOKEN) {
      return alertFail('로그인이 필요합니다. (토큰 없음)');
    }

    // 기본 검증
    if (!title.value.trim()) return alertFail('제목을 입력해주세요.');
    if (!desc.value.trim() || desc.value.trim().length < 30) return alertFail('내용을 30자 이상 입력해주세요.');
    if (!category.value) return alertFail('카테고리를 선택해주세요.');
    if (!shootDate.value) return alertFail('촬영일을 선택해주세요.');
    if (!deadline.value) return alertFail('공고 마감일을 선택해주세요.');
    if (!startTime.value || !endTime.value) return alertFail('촬영 시작/종료 시간을 입력해주세요.');
    if (!validTimes()) return alertFail('종료 시간은 시작 시간 이후여야 합니다.');
    if (!validDeadline()) return alertFail('공고 마감일은 촬영일 이전(또는 동일)이어야 합니다.');

    // 업로드(선택)
    let imagePayload = {};
    const picked = file.files?.[0];
    if (picked) {
      const up = await uploadImage(picked);
      if (up) imagePayload = up;
    }

    // 페이/협의
    const payStr = neg.checked ? '' : String(pay.value || '').trim();
    if (!neg.checked) {
      const n = Number(payStr);
      if (!payStr || isNaN(n) || n < 0) return alertFail('출연료를 숫자로 입력해주세요. 협의 가능이면 체크하세요.');
    }

    // 서버 스키마에 맞춰 페이로드 구성
    const payload = {
      type: 'recruit',
      status: 'draft', // 최초 생성은 임시저장(필요시 published)
      title: title.value.trim(),
      category: category.value,
      descriptionHTML: undefined, // 필요 시 WYSIWYG 사용 시에만 적용
      ...imagePayload, // coverImageUrl / thumbnailUrl

      // 마감일 -> closeAt
      closeAt: `${deadline.value}T23:59:59.000Z`,

      // 모집형 상세
      recruit: {
        recruitType: 'product', // 기본값(선택 컴포넌트 생기면 변경)
        location: (locationEl.value || '').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`), // 날짜만
        shootTime: `${startTime.value}~${endTime.value}`,        // "HH:MM~HH:MM"
        pay: payStr,
        payNegotiable: !!neg.checked,
        requirements: desc.value.trim(), // 브리프
        preferred: '',
        questions: []                     // 커스텀 질문 UI가 생기면 채움
      }
    };

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        // 서버의 fail 포맷 사용
        throw new Error(data.message || `등록 실패 (${res.status})`);
      }

      alert('공고가 등록되었습니다.');
      window.location.href = './index.html#recruits';
    } catch (err) {
      console.error('Create campaign error:', err);
      alertFail(err.message);
    }
  });
})();