<!-- /livee08/js/recruit-new.js (drop-in) -->
<script>
/* Livee v2.5 – Recruit Create (for /recruit-test)
 * - Direct Cloudinary upload using /uploads/signature
 * - POST {API_BASE}/recruit-test
 * - Keeps form values on error, adds rich debugging logs
 */
(() => {
  /* ===== config ===== */
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || "";
  const TOKEN = localStorage.getItem("livee_token") || "";

  /* ===== el refs ===== */
  const $id = (s) => document.getElementById(s);
  const form=$id("recruitForm"), titleEl=$id("title"), descEl=$id("desc"),
        categoryEl=$id("category"), locationEl=$id("location"),
        shootDate=$id("shootDate"), startTime=$id("startTime"), endTime=$id("endTime"),
        deadline=$id("deadline"), payEl=$id("pay"), negEl=$id("negotiable"),
        fileEl=$id("imageFile"), previewEl=$id("preview"), msgEl=$id("recruitMsg");

  /* ===== init ===== */
  const todayISO = new Date().toISOString().slice(0,10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  function setMsg(text, ok=false){
    if(!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color = ok ? "#0a6" : "#a00";
  }

  function headers(json=true){
    const h = {};
    if (json) h["Content-Type"] = "application/json";
    if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
    return h;
  }

  /* ===== Cloudinary ===== */
  async function getSignature(){
    console.log("[UPLOAD] get signature:", `${API_BASE}/uploads/signature`);
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    console.log("[UPLOAD] signature res:", r.status, j);
    if(!r.ok || j.ok===false) throw new Error(j.message || `HTTP_${r.status}`);
    if(!j.data) throw new Error("Invalid signature payload");
    return j.data; // { cloudName, apiKey, timestamp, signature, stringToSign? }
  }

  function transformUrl(url, t){
    try{ const [a,b] = url.split("/upload/"); return `${a}/upload/${t}/${b}`; }
    catch{ return url; }
  }

  async function uploadToCloudinary(file){
    const { cloudName, apiKey, timestamp, signature } = await getSignature();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    fd.append("signature", signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    console.log("[UPLOAD] POST", url, { size:file.size, type:file.type });

    const res = await fetch(url, { method:"POST", body:fd });
    let j = {};
    try { j = await res.json(); } catch {}
    console.log("[UPLOAD] cloudinary res:", res.status, j);

    if(!res.ok || !j.secure_url){
      const emsg = j.error?.message || `Cloudinary_${res.status}`;
      throw new Error(emsg);
    }
    return j.secure_url;
  }

  fileEl?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ setMsg("이미지 파일만 업로드 가능합니다."); e.target.value=""; return; }
    if(f.size > 8*1024*1024){ setMsg("이미지는 8MB 이하만 업로드 가능"); e.target.value=""; return; }
    try{
      setMsg("이미지 업로드 중...");
      const url = await uploadToCloudinary(f);
      const thumb = transformUrl(url, (CFG.thumb?.card169) || "c_fill,g_auto,w_640,h_360,f_auto,q_auto");
      previewEl.src = thumb;
      previewEl.dataset.cover = url;                 // ← 서버로 보낼 원본 URL 저장
      setMsg("이미지 업로드 완료", true);
    }catch(err){
      console.error("[UPLOAD] failed:", err);
      setMsg("업로드 실패: " + err.message);
      previewEl.removeAttribute("src");
      delete previewEl.dataset.cover;
    }
  });

  /* ===== pay & time validation ===== */
  negEl?.addEventListener("change",()=>{
    if(negEl.checked){ payEl.value=""; payEl.disabled = true; }
    else { payEl.disabled = false; }
  });

  function validTimes(){
    if(!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s = new Date(`${shootDate.value}T${startTime.value}`);
    const e = new Date(`${shootDate.value}T${endTime.value}`);
    return e > s;
  }
  function validDeadline(){
    if(!deadline?.value || !shootDate?.value) return false;
    return deadline.value <= shootDate.value;
  }

  /* ===== submit ===== */
  form?.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    setMsg("");

    if(!TOKEN){ alert("로그인이 필요합니다."); return; }

    const title = (titleEl.value||"").trim();
    const desc  = (descEl.value||"").trim();
    if(!title) return setMsg("제목을 입력해주세요.");
    if(!desc || desc.length < 30) return setMsg("내용(브리프)을 30자 이상 입력해주세요.");
    if(!categoryEl.value) return setMsg("카테고리를 선택해주세요.");
    if(!shootDate.value) return setMsg("촬영일을 선택해주세요.");
    if(!deadline.value)  return setMsg("마감일을 선택해주세요.");
    if(!startTime.value || !endTime.value) return setMsg("시작/종료 시간을 입력해주세요.");
    if(!validTimes()) return setMsg("종료 시간은 시작 시간 이후여야 합니다.");
    if(!validDeadline()) return setMsg("마감일은 촬영일과 같거나 그 이전이어야 합니다.");

    let pay = "";
    if(!negEl.checked){
      const raw = String(payEl.value||"").trim();
      const n = Number(raw);
      if(!raw || isNaN(n) || n < 0) return setMsg("출연료를 숫자로 입력해주세요.");
      pay = raw;
    }

    const cover = previewEl?.dataset?.cover || "";
    const payload = {
      type: "recruit",
      status: "published",             // 홈에 바로 노출하려면 published
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(cover ? { coverImageUrl: cover } : {}),
      recruit: {
        recruitType: "product",
        location: (locationEl.value||"").trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        pay,
        payNegotiable: !!negEl.checked,
        requirements: desc,
        preferred: "",
        questions: []
      }
    };

    console.log("[CREATE] payload:", payload);

    try{
      const res = await fetch(`${API_BASE}/recruit-test`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      console.log("[CREATE] res:", res.status, data);

      if(!res.ok || data.ok === false){
        throw new Error(data.message || `등록 실패 (${res.status})`);
      }

      alert("공고가 등록되었습니다.");
      const to = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : "./index.html#recruits";
      location.href = to;
    }catch(err){
      console.error("[CREATE] failed:", err);
      setMsg(err.message || "등록 실패");
      // 폼 값은 유지 (새로고침 X)
    }
  });
})();
</script>