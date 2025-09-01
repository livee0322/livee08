/* Livee v2.5 – Recruit Create (livee08 전용)
 * - API: POST {API_BASE}/campaigns (type: 'recruit')
 * - Upload: POST {API_BASE}/uploads  (서버 프록시) → 실패 시 Cloudinary 서명 방식 자동 탐색
 * - 새로고침 방지: submit에서 preventDefault, 버튼 disabled로 중복 방지
 */
(() => {
  // ---------- config ----------
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || "/livee08";
  const TOKEN = localStorage.getItem("livee_token") || "";

  // ---------- dom ----------
  const $id = (s) => document.getElementById(s);
  const form       = $id("recruitForm");
  const titleEl    = $id("title");
  const descEl     = $id("desc");
  const categoryEl = $id("category");
  const locationEl = $id("location");
  const shootDate  = $id("shootDate");
  const startTime  = $id("startTime");
  const endTime    = $id("endTime");
  const deadline   = $id("deadline");
  const payEl      = $id("pay");
  const negEl      = $id("negotiable");
  const fileEl     = $id("imageFile");
  const previewEl  = $id("preview");
  const progEl     = $id("uploadProg");
  const submitBtn  = $id("submitBtn");
  const notice     = $id("cfNotice");

  // ---------- init ----------
  const todayISO = new Date().toISOString().slice(0, 10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  // ---------- helpers ----------
  const setNotice = (msg, ok=false) => {
    if (!notice) return;
    notice.textContent = msg;
    notice.classList.toggle("ok", !!ok);
    notice.style.display = "block";
  };
  const headers = (json = true) => {
    const h = {};
    if (json) h["Content-Type"] = "application/json";
    if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
    return h;
  };
  const fail = (m) => setNotice(m || "요청 중 오류가 발생했습니다.", false);

  const isValidTimes = () => {
    if (!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  };
  const isValidDeadline = () => {
    if (!deadline?.value || !shootDate?.value) return false;
    return deadline.value <= shootDate.value; // 촬영일과 같거나 그 이전
  };

  // ---------- image upload ----------
  async function uploadViaServer(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.message || `업로드 실패 (${res.status})`);
    return {
      coverImageUrl: data.url || data.secure_url || data.coverImageUrl || "",
      thumbnailUrl:  data.thumbnail || data.thumbnailUrl || "",
    };
  }
  async function getSignature() {
    const res = await fetch(`${API_BASE}/uploads/signature`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined });
    if (!res.ok) throw new Error("서명 요청 실패");
    const s = await res.json().catch(()=>({}));
    return s.data || s;
  }
  async function uploadDirectToCloudinary(file) {
    const { cloudName, apiKey, timestamp, signature, folder } = await getSignature();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    if (folder) fd.append("folder", folder);
    fd.append("signature", signature);
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const xhr = new XMLHttpRequest();
    return await new Promise((resolve, reject) => {
      if (progEl){ progEl.style.display = "block"; progEl.value = 0; }
      xhr.upload.onprogress = (e)=>{ if(e.lengthComputable && progEl) progEl.value = Math.round(e.loaded/e.total*100); };
      xhr.onload = () => {
        if (progEl) progEl.style.display = "none";
        try {
          const j = JSON.parse(xhr.responseText||"{}");
          if (xhr.status >= 200 && xhr.status < 300 && j.secure_url) {
            resolve({ coverImageUrl: j.secure_url, thumbnailUrl: "" });
          } else reject(new Error(j.error?.message || `Cloudinary HTTP_${xhr.status}`));
        } catch { reject(new Error("응답 파싱 실패")); }
      };
      xhr.onerror = () => { if (progEl) progEl.style.display = "none"; reject(new Error("네트워크 오류")); };
      xhr.open("POST", url, true);
      xhr.send(fd);
    });
  }

  let uploaded = { coverImageUrl: "", thumbnailUrl: "" };

  fileEl?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { fail("이미지 파일만 업로드할 수 있습니다."); e.target.value=""; return; }
    if (f.size > 8 * 1024 * 1024)    { fail("파일 용량이 커요. 8MB 이하로 올려주세요."); e.target.value=""; return; }

    // 미리보기 먼저
    const reader = new FileReader();
    reader.onload = (ev) => { previewEl.src = ev.target.result; };
    reader.readAsDataURL(f);

    // 업로드 시도(서버 → 실패 시 클라우디너리 직업로드)
    try {
      setNotice("이미지 업로드 중...", true);
      try {
        uploaded = await uploadViaServer(f);
      } catch {
        uploaded = await uploadDirectToCloudinary(f);
      }
      setNotice("이미지 업로드 완료", true);
    } catch (err) {
      uploaded = { coverImageUrl:"", thumbnailUrl:"" };
      previewEl.removeAttribute("src");
      fail(`이미지 업로드 실패: ${err.message}`);
    }
  });

  // 협의 가능 → pay 잠금
  negEl?.addEventListener("change", () => {
    if (negEl.checked) {
      payEl.value = "";
      payEl.setAttribute("disabled", "disabled");
      payEl.classList.add("disabled");
    } else {
      payEl.removeAttribute("disabled");
      payEl.classList.remove("disabled");
    }
  });

  // ---------- submit ----------
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();               // ★ 리로드 방지
    if (!submitBtn) return;

    // 로그인 필요
    if (!TOKEN) return fail("로그인이 필요합니다. 먼저 로그인해주세요.");

    // 검증
    const title = (titleEl?.value || "").trim();
    const desc  = (descEl?.value || "").trim();
    if (!title) return fail("제목을 입력해주세요.");
    if (!desc || desc.length < 30) return fail("내용(브리프)을 30자 이상 입력해주세요.");
    if (!categoryEl?.value) return fail("카테고리를 선택해주세요.");
    if (!shootDate?.value) return fail("촬영일을 선택해주세요.");
    if (!deadline?.value)  return fail("마감일을 선택해주세요.");
    if (!startTime?.value || !endTime?.value) return fail("시작/종료 시간을 입력해주세요.");
    if (!isValidTimes()) return fail("종료 시간은 시작 시간 이후여야 합니다.");
    if (!isValidDeadline()) return fail("마감일은 촬영일과 같거나 그 이전이어야 합니다.");

    // 출연료
    let pay = "";
    if (!negEl?.checked) {
      const raw = String(payEl?.value || "").trim();
      const n = Number(raw);
      if (!raw || isNaN(n) || n < 0) return fail("출연료를 숫자로 입력해주세요. 협의 가능이면 체크하세요.");
      pay = raw;
    }

    // payload
    const payload = {
      type: "recruit",
      status: "published", // 홈에 바로 보이게
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...uploaded, // coverImageUrl / thumbnailUrl
      recruit: {
        recruitType: "product",
        location: (locationEl?.value || "").trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        pay,
        payNegotiable: !!negEl?.checked,
        requirements: desc,
        preferred: "",
        questions: []
      }
    };

    // 전송
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "등록 중...";
      setNotice("저장 중입니다…", true);

      const res = await fetch(`${API_BASE}/campaigns`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `등록 실패 (${res.status})`);

      setNotice("공고가 등록되었습니다.", true);
      // 자동 이동 대신 확인 요청 → 작성내용 사라진 느낌 방지
      setTimeout(() => {
        if (confirm("홈으로 이동할까요?")) {
          location.href = `${BASE_PATH}/index.html#recruits`;
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = "공고 등록";
        }
      }, 150);
    } catch (err) {
      fail(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "공고 등록";
    }
  });
})();