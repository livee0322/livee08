/* Livee v2.5 – Recruit Create (Refactor)
 * - POST {API_BASE}/campaigns
 * - optional: POST {API_BASE}/uploads (multipart)
 * - needs: localStorage 'livee_token'
 */
(() => {
  // ---------- config ----------
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || ""; // e.g., '/alpa'
  const TOKEN = localStorage.getItem("livee_token") || "";

  // 기본 저장 상태(홈에서 보이게 하려면 published). ?status=draft 로 강제 가능
  const urlParams = new URLSearchParams(location.search);
  const DEFAULT_STATUS = (urlParams.get("status") || "published").toLowerCase();

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
  const msgEl      = $id("recruitMsg");

  // ---------- init ----------
  const todayISO = new Date().toISOString().slice(0, 10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  // ---------- helpers ----------
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

  async function uploadImage(file) {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `업로드 실패 (${res.status})`);
      }
      return {
        coverImageUrl: data.url || data.secure_url || data.coverImageUrl || "",
        thumbnailUrl:  data.thumbnail || data.thumbnailUrl || "",
      };
    } catch (err) {
      console.error("[upload]", err);
      fail(err.message);
      return null;
    }
  }

  // 미리보기
  fileEl?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      msgEl.textContent = "이미지 파일만 업로드할 수 있습니다.";
      e.target.value = "";
      return;
    }
    const max = 2 * 1024 * 1024;
    if (f.size > max) {
      msgEl.textContent = "용량이 커요. 2MB 이하로 올려주세요.";
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewEl.src = ev.target.result;
      msgEl.textContent = "미리보기가 적용되었습니다.";
    };
    reader.readAsDataURL(f);
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
    e.preventDefault();

    if (!TOKEN) return fail("로그인이 필요합니다.");

    // 필드 검증
    const title = (titleEl?.value || "").trim();
    const desc  = (descEl?.value || "").trim();
    if (!title) return fail("제목을 입력해주세요.");
    if (!desc || desc.length < 30) return fail("내용(브리프)을 30자 이상 입력해주세요.");
    if (!categoryEl?.value) return fail("카테고리를 선택해주세요.");
    if (!shootDate?.value) return fail("촬영일을 선택해주세요.");
    if (!deadline?.value)  return fail("공고 마감일을 선택해주세요.");
    if (!startTime?.value || !endTime?.value) return fail("촬영 시작/종료 시간을 입력해주세요.");
    if (!isValidTimes()) return fail("종료 시간은 시작 시간 이후여야 합니다.");
    if (!isValidDeadline()) return fail("공고 마감일은 촬영일과 같거나 그 이전이어야 합니다.");

    // pay
    let pay = "";
    if (!negEl?.checked) {
      const raw = String(payEl?.value || "").trim();
      const n = Number(raw);
      if (!raw || isNaN(n) || n < 0) return fail("출연료를 숫자로 입력해주세요. 협의 가능이면 체크하세요.");
      pay = raw;
    }

    // 이미지 업로드(선택)
    let imagePayload = {};
    const picked = fileEl?.files?.[0];
    if (picked) {
      const up = await uploadImage(picked);
      if (up) imagePayload = up;
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

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `등록 실패 (${res.status})`);
      }
      alert("공고가 등록되었습니다.");
      // 홈으로 (그리드 위치로 스크롤되게 앵커)
      const to = (BASE_PATH || "") + "/index.html#recruits";
      location.href = to;
    } catch (err) {
      console.error("[create]", err);
      fail(err.message);
    }
  });
})();