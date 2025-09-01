/* Livee v2.5 – Recruit Create (Cloudinary + /recruit-test)
 * - POST {API_BASE}/recruit-test
 * - GET  {API_BASE}/uploads/signature → Cloudinary direct upload
 */
(() => {
  // ========= CONFIG =========
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = (CFG.BASE_PATH || "").replace(/\/$/, "");
  const THUMB = CFG.thumb || {
    card169: "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
    square:  "c_fill,g_auto,w_320,h_320,f_auto,q_auto"
  };
  const TOKEN = localStorage.getItem("livee_token") || "";

  // ========= DOM =========
  const $id = (s) => document.getElementById(s);
  const form        = $id("recruitForm");
  const brandNameEl = $id("brandName");
  const titleEl     = $id("title");
  const descEl      = $id("desc");           // 선택 입력
  const categoryEl  = $id("category");
  const locationEl  = $id("location");
  const shootDate   = $id("shootDate");
  const startTime   = $id("startTime");
  const endTime     = $id("endTime");
  const deadline    = $id("deadline");
  const payEl       = $id("pay");
  const negEl       = $id("negotiable");
  const fileEl      = $id("imageFile");
  const previewEl   = $id("preview");
  const msgEl       = $id("recruitMsg");

  // ========= INIT =========
  const todayISO = new Date().toISOString().slice(0, 10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  // ========= HELPERS =========
  const headers = (json = true) => {
    const h = {};
    if (json) h["Content-Type"] = "application/json";
    if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
    return h;
  };
  const say = (text, ok=false) => {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.classList.add("show");
    msgEl.classList.toggle("ok", ok);
  };

  const validTimes = () => {
    if (!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  };
  const validDeadline = () => {
    if (!deadline?.value || !shootDate?.value) return false;
    return deadline.value <= shootDate.value;
  };

  const withTransform = (originalUrl, transform) => {
    try {
      const [head, tail] = originalUrl.split("/upload/");
      return `${head}/upload/${transform}/${tail}`;
    } catch {
      return originalUrl;
    }
  };

  // ========= CLOUDINARY =========
  async function getSignature() {
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }

  async function uploadToCloudinary(file) {
    const { cloudName, apiKey, timestamp, signature } = await getSignature();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    fd.append("signature", signature);
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const res = await fetch(url, { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.secure_url) {
      throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    }
    return j.secure_url;
  }

  // ========= FILE → UPLOAD → PREVIEW =========
  fileEl?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { say("이미지 파일만 업로드", false); e.target.value = ""; return; }
    if (f.size > 8 * 1024 * 1024)   { say("이미지는 8MB 이하로 업로드", false); e.target.value = ""; return; }

    try {
      say("이미지 업로드 중...");
      const coverUrl = await uploadToCloudinary(f);
      const thumbUrl = withTransform(coverUrl, THUMB.card169);
      if (previewEl) {
        previewEl.src = thumbUrl;
        previewEl.dataset.cover = coverUrl;
        previewEl.dataset.thumb = thumbUrl;
      }
      say("이미지 업로드 완료", true);
    } catch (err) {
      if (previewEl) {
        previewEl.removeAttribute("src");
        delete previewEl.dataset.cover;
        delete previewEl.dataset.thumb;
      }
      say("업로드 실패: " + err.message, false);
      console.error("[UPLOAD] error:", err);
    }
  });

  // 협의 가능 체크
  negEl?.addEventListener("change", () => {
    if (negEl.checked) { payEl.value = ""; payEl.disabled = true; }
    else               { payEl.disabled = false; }
  });

  // ========= SUBMIT =========
  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    if (!TOKEN) { say("로그인이 필요합니다.", false); return; }

    const brandName = (brandNameEl.value || "").trim();
    const title     = (titleEl.value || "").trim();
    const desc      = (descEl.value || "").trim(); // 선택 입력

    if (!brandName) { say("브랜드명을 입력해주세요.", false); return; }
    if (!title)     { say("제목을 입력해주세요.", false); return; }
    if (!categoryEl.value) { say("카테고리를 선택해주세요.", false); return; }
    if (!shootDate.value)  { say("촬영일을 선택해주세요.", false); return; }
    if (!deadline.value)   { say("마감일을 선택해주세요.", false); return; }
    if (!startTime.value || !endTime.value) { say("시작/종료 시간을 입력해주세요.", false); return; }
    if (!validTimes())     { say("종료 시간은 시작 시간 이후여야 합니다.", false); return; }
    if (!validDeadline())  { say("마감일은 촬영일과 같거나 그 이전이어야 합니다.", false); return; }

    let pay = "";
    if (!negEl.checked) {
      const raw = String(payEl.value || "").trim();
      const n = Number(raw);
      if (raw && (isNaN(n) || n < 0)) { say("출연료는 숫자로 입력해주세요.", false); return; }
      pay = raw; // 입력 안하면 빈 문자열 전송
    }

    const coverImageUrl = previewEl?.dataset?.cover || "";
    const thumbnailUrl  = previewEl?.dataset?.thumb  || (coverImageUrl ? withTransform(coverImageUrl, THUMB.card169) : "");

    const payload = {
      type: "recruit",
      status: "published",
      brandName,                // ← 추가
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(coverImageUrl ? { coverImageUrl } : {}),
      ...(thumbnailUrl  ? { thumbnailUrl  } : {}),
      ...(desc ? { descriptionHTML: desc } : {}), // 선택 입력(있을 때만 보냄)
      recruit: {
        recruitType: "product",
        location: (locationEl.value || "").trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        pay,
        payNegotiable: !!negEl.checked,
        requirements: desc,  // 서버에서 사용한다면 그대로 전달(없으면 빈 문자열)
        preferred: "",
        questions: []
      }
    };

    try {
      say("등록 중...");
      const res  = await fetch(`${API_BASE}/recruit-test`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || `등록 실패 (${res.status})`);

      say("공고가 등록되었습니다.", true);
      alert("공고가 등록되었습니다.");
      location.href = (BASE_PATH ? `${BASE_PATH}/index.html#recruits` : "./index.html#recruits");
    } catch (err) {
      say(err.message, false);
      console.error("[CREATE] error:", err);
    }
  });
})();