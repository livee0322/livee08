/* /livee08/js/recruit-new.js
 * Livee v2.5 – Recruit Create (for livee08)
 * - POST {API_BASE}/campaigns
 * - optional: GET {API_BASE}/uploads/signature → Cloudinary 업로드
 * - needs: localStorage 'livee_token'
 * - dirty/submit-lock/console debug 포함
 */
(() => {
  /* ---------- config ---------- */
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || "/livee08";

  /* ---------- DOM refs ---------- */
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
  const msgEl      = $id("recruitMsg");

  /* ---------- globals ---------- */
  const TOKEN = localStorage.getItem("livee_token") || "";
  const urlParams = new URLSearchParams(location.search);
  // 기본은 홈에서 보이도록 published 저장 (변경하고 싶으면 ?status=draft)
  const DEFAULT_STATUS = (urlParams.get("status") || "published").toLowerCase();

  // 날짜 min
  const todayISO = new Date().toISOString().slice(0, 10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  // dirty/submit-lock
  let isDirty = false;
  let isSaving = false;

  const markDirty = () => {
    if (!isDirty) {
      isDirty = true;
      // 폼 이탈 경고(작성 중에만)
      window.addEventListener("beforeunload", beforeUnloadHandler);
    }
  };
  const clearDirty = () => {
    isDirty = false;
    window.removeEventListener("beforeunload", beforeUnloadHandler);
  };
  function beforeUnloadHandler(e) {
    if (!isSaving && isDirty) {
      e.preventDefault();
      e.returnValue = ""; // 일부 브라우저에서 필수
      return "";
    }
  }

  // 모든 입력요소 변경 시 dirty
  ([
    titleEl, descEl, categoryEl, locationEl,
    shootDate, startTime, endTime, deadline,
    payEl, negEl, fileEl
  ]).forEach(el => el && el.addEventListener("input", markDirty));

  /* ---------- helpers ---------- */
  const headers = (json = true) => {
    const h = {};
    if (json) h["Content-Type"] = "application/json";
    if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
    return h;
  };
  const fail = (m = "요청 중 오류가 발생했습니다.") => alert(m);

  const isValidTimes = () => {
    if (!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  };

  const isValidDeadline = () => {
    if (!deadline?.value || !shootDate?.value) return false;
    // 마감일은 촬영일과 같거나 그 이전
    return deadline.value <= shootDate.value;
  };

  /* ---------- Cloudinary (서명 → 업로드) ---------- */
  async function getSignature() {
    console.debug("[upload] get signature…");
    const res = await fetch(`${API_BASE}/uploads/signature`, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || `signature ${res.status}`);
    }
    const sig = data.data || data;
    console.debug("[upload] signature ok:", sig);
    return sig; // { cloudName, apiKey, timestamp, signature, folder? }
  }

  function toTransformedUrl(originalUrl, transform) {
    try {
      const [head, tail] = originalUrl.split("/upload/");
      return `${head}/upload/${transform}/${tail}`;
    } catch { return originalUrl; }
  }

  async function uploadToCloudinary(file) {
    const { cloudName, apiKey, timestamp, signature, folder } = await getSignature();

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    if (folder) fd.append("folder", folder);
    fd.append("signature", signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    console.debug("[upload] POST", url, "size=", file.size);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload?.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const p = Math.round((e.loaded / e.total) * 100);
          msgEl && (msgEl.textContent = `업로드 중… ${p}%`);
        }
      });
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) {
              console.debug("[upload] success:", json);
              resolve(json.secure_url || json.url);
            } else {
              console.debug("[upload] fail:", xhr.status, json);
              reject(new Error(json.error?.message || `Cloudinary ${xhr.status}`));
            }
          } catch {
            reject(new Error("Cloudinary 응답 파싱 실패"));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Cloudinary 네트워크 오류"));
      xhr.open("POST", url, true);
      xhr.send(fd);
    });
  }

  // 파일 선택 → 미리보기 + 업로드
  fileEl?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { msgEl.textContent = "이미지 파일만 업로드"; fileEl.value = ""; return; }
    if (f.size > 8 * 1024 * 1024) { msgEl.textContent = "이미지는 8MB 이하"; fileEl.value = ""; return; }

    // 미리보기
    const reader = new FileReader();
    reader.onload = (ev) => { previewEl && (previewEl.src = ev.target.result); };
    reader.readAsDataURL(f);

    // 업로드
    try {
      msgEl && (msgEl.textContent = "이미지 업로드 시작…");
      const rawUrl = await uploadToCloudinary(f);
      const thumbUrl = toTransformedUrl(
        rawUrl,
        (window.LIVEE_CONFIG?.thumb && window.LIVEE_CONFIG.thumb.card169) ||
        "c_fill,g_auto,w_640,h_360,f_auto,q_auto"
      );
      // 업로드 경로를 input[data-*] 로 임시 저장 (폼 제출 시 payload에 포함)
      fileEl.dataset.cover = rawUrl;
      fileEl.dataset.thumb = thumbUrl;
      msgEl && (msgEl.textContent = "이미지 업로드 완료");
      console.debug("[upload] stored:", { rawUrl, thumbUrl });
    } catch (err) {
      console.error("[upload] error:", err);
      msgEl && (msgEl.textContent = `업로드 실패: ${err.message}`);
      // 업로드 실패 시에도 작성내용은 유지 (파일 필드만 초기화)
      delete fileEl.dataset.cover;
      delete fileEl.dataset.thumb;
    }
  });

  /* ---------- 협의 가능 → pay 잠금 ---------- */
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

  /* ---------- submit ---------- */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();        // ✅ 새로고침 방지
    e.stopPropagation();

    if (isSaving) return;      // ✅ 이중 제출 방지
    isSaving = true;

    if (!TOKEN) { isSaving = false; return fail("로그인이 필요합니다."); }

    // 필드 검증
    const title = (titleEl?.value || "").trim();
    const desc  = (descEl?.value || "").trim();

    if (!title) { isSaving = false; return fail("제목을 입력해주세요."); }
    if (!desc || desc.length < 30) { isSaving = false; return fail("내용(브리프)을 30자 이상 입력해주세요."); }
    if (!categoryEl?.value) { isSaving = false; return fail("카테고리를 선택해주세요."); }
    if (!shootDate?.value)  { isSaving = false; return fail("촬영일을 선택해주세요."); }
    if (!deadline?.value)   { isSaving = false; return fail("공고 마감일을 선택해주세요."); }
    if (!startTime?.value || !endTime?.value) { isSaving = false; return fail("촬영 시작/종료 시간을 입력해주세요."); }
    if (!isValidTimes()) { isSaving = false; return fail("종료 시간은 시작 시간 이후여야 합니다."); }
    if (!isValidDeadline()) { isSaving = false; return fail("공고 마감일은 촬영일과 같거나 그 이전이어야 합니다."); }

    // pay
    let pay = "";
    if (!negEl?.checked) {
      const raw = String(payEl?.value || "").trim();
      const n = Number(raw);
      if (!raw || isNaN(n) || n < 0) { isSaving = false; return fail("출연료를 숫자로 입력해주세요. 협의 가능이면 체크하세요."); }
      pay = raw;
    }

    // 업로드 결과(선택)
    const imagePayload = {};
    if (fileEl?.dataset?.cover) {
      imagePayload.coverImageUrl = fileEl.dataset.cover;
      imagePayload.thumbnailUrl  = fileEl.dataset.thumb || "";
    }

    // payload (v2.5 Campaign)
    const payload = {
      type: "recruit",
      status: DEFAULT_STATUS, // 'published' | 'draft'
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...imagePayload,
      recruit: {
        recruitType: "product",
        location: (locationEl?.value || "").trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`), // 날짜만
        shootTime: `${startTime.value}~${endTime.value}`,        // "HH:MM~HH:MM"
        pay,
        payNegotiable: !!negEl?.checked,
        requirements: desc,
        preferred: "",
        questions: []
      }
    };

    console.debug("[create] payload:", payload);

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      console.debug("[create] response:", res.status, data);

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `등록 실패 (${res.status})`);
      }

      alert("공고가 등록되었습니다.");

      // ✅ 저장 성공 → 이탈 경고 해제 후 이동
      clearDirty();
      isSaving = false;
      location.href = `${BASE_PATH}/index.html#recruits`;
    } catch (err) {
      console.error("[create] error:", err);
      isSaving = false;
      fail(err.message);
    }
  });
})();