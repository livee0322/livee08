/* 공고 등록 v2.5 (프론트 시뮬레이션)
   - 필수값 검증
   - 종료시간 > 시작시간
   - 마감일 <= 촬영일
   - 협의 가능 시 pay 비활성화
   - 이미지 미리보기 (로컬) + 기본 default.jpg
   - 저장: localStorage 'livee_recruits'
*/

(() => {
  const $ = (id) => document.getElementById(id);
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

  // 오늘 이전 선택 방지(마감일/촬영일)
  const todayISO = new Date().toISOString().slice(0,10);
  shootDate.min = todayISO;
  deadline.min = todayISO;

  // 협의 가능 체크 -> pay 입력 잠금
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

  // 이미지 미리보기 (로컬)
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

  // 유효성 헬퍼
  function err(text) {
    alert(text);
    return false;
  }

  function validateTimes() {
    // ISO 조합해서 비교
    if (!shootDate.value || !startTime.value || !endTime.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  }

  function validateDeadline() {
    if (!deadline.value || !shootDate.value) return false;
    // 일반적으로 마감일은 촬영일 이전/같음
    return deadline.value <= shootDate.value;
  }

  // 저장(로컬스토리지)
  function saveRecruit(data) {
    const key = 'livee_recruits';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift(data);
    localStorage.setItem(key, JSON.stringify(list));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // 기본 required 체크
    if (!title.value.trim()) return err('제목을 입력해주세요.');
    if (!desc.value.trim() || desc.value.trim().length < 30) return err('내용을 30자 이상 입력해주세요.');
    if (!category.value) return err('카테고리를 선택해주세요.');
    if (!shootDate.value) return err('촬영일을 선택해주세요.');
    if (!deadline.value) return err('공고 마감일을 선택해주세요.');
    if (!startTime.value || !endTime.value) return err('촬영 시작/종료 시간을 입력해주세요.');
    if (!validateTimes()) return err('종료 시간은 시작 시간 이후여야 합니다.');
    if (!validateDeadline()) return err('공고 마감일은 촬영일 이전(또는 동일)이어야 합니다.');

    if (!neg.checked) {
      const payNum = Number(pay.value);
      if (!pay.value || isNaN(payNum) || payNum < 0) return err('출연료를 숫자로 입력해주세요. 협의 가능이면 체크하세요.');
    }

    const data = {
      id: 'rc_' + Math.random().toString(36).slice(2,10),
      title: title.value.trim(),
      desc: desc.value.trim(),
      category: category.value,
      location: locationEl.value.trim(),
      shootDate: shootDate.value,
      deadline: deadline.value,
      startTime: startTime.value,
      endTime: endTime.value,
      pay: neg.checked ? null : Number(pay.value),
      negotiable: neg.checked,
      image: preview.src || './default.jpg',
      createdAt: new Date().toISOString()
    };

    saveRecruit(data);
    alert('공고가 임시 저장되었습니다. (로컬)');
    // 리스트로 이동(필요 시 앵커/파라미터로 표시)
    window.location.href = './index.html#recruits';
  });

})();