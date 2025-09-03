/* Portfolio Create — Livee v2.6 (Cloudinary + /portfolio-test with /portfolios fallback) */
(() => {
  // ===== Config =====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const EP_MAIN = "/portfolio-test";
  const EP_FALL = "/portfolios";
  const THUMB = CFG.thumb || {
    square:  "c_fill,g_auto,w_600,h_600,f_auto,q_auto",
    cover169:"c_fill,g_auto,w_1280,h_720,f_auto,q_auto"
  };
  const TOKEN =
    localStorage.getItem("livee_token") ||
    localStorage.getItem("liveeToken") ||
    "";

  // ===== Elements =====
  const $id = (s) => document.getElementById(s);
  const form = $id("pfForm");
  const msg  = $id("pfMsg");

  // media
  const mainFile = $id("mainFile"),  mainPrev  = $id("mainPrev");
  const coverFile = $id("coverFile"), coverPrev = $id("coverPrev");
  const subsFile  = $id("subsFile"),  subsGrid  = $id("subsGrid");

  // fields
  const nickname = $id("nickname"),
        headline = $id("headline"),
        bio      = $id("bio");
  const realName        = $id("realName"),
        realNamePublic  = $id("realNamePublic");
  const age       = $id("age"),
        agePublic = $id("agePublic");
  const careerYears = $id("careerYears"),
        primaryLink = $id("primaryLink");
  const visibility   = $id("visibility"),
        openToOffers = $id("openToOffers");

  const linksWrap  = $id("linksWrap"),
        addLinkBtn = $id("addLinkBtn");
  const tagInput = $id("tagInput"),
        tagList  = $id("tagList");

  // ===== Local state =====
  const state = {
    mainThumbnailUrl: "",
    coverImageUrl: "",
    subThumbnails: [],
    tags: []
  };

  // ===== Utils =====
  const say = (t, ok=false) => {
    if (!msg) return;
    msg.textContent = t;
    msg.classList.add("show");
    msg.classList.toggle("ok", !!ok);
  };
  const headers = (json=true) => {
    const h = {};
    if (json) h["Content-Type"] = "application/json";
    if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
    return h;
  };
  const withTransform = (url, t) => {
    try {
      if (!url.includes("/upload/")) return url;
      const [h, tail] = url.split("/upload/");
      return `${h}/upload/${t}/${tail}`;
    } catch { return url; }
  };
  async function postPortfolio(payload){
    // 1) try new endpoint
    let res = await fetch(`${API_BASE}${EP_MAIN}`, {
      method: "POST", headers: headers(true), body: JSON.stringify(payload)
    });
    if (res.ok) return res;
    // 2) fallback to old endpoint
    res = await fetch(`${API_BASE}${EP_FALL}`, {
      method: "POST", headers: headers(true), body: JSON.stringify(payload)
    });
    return res;
  }

  // ===== Cloudinary =====
  async function getSignature(){
    const r = await fetch(`${API_BASE}/uploads/signature`, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    if (!r.ok || j.ok === false) throw new Error(j.message || `HTTP_${r.status}`);
    return j.data || j;
  }
  async function uploadImage(file){
    if (!/^image\//.test(file.type))  throw new Error("이미지 파일만 업로드 가능");
    if (file.size > 8*1024*1024)      throw new Error("이미지는 8MB 이하");
    const {cloudName, apiKey, timestamp, signature} = await getSignature();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    fd.append("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:"POST", body:fd });
    const j = await res.json().catch(()=>({}));
    if (!res.ok || !j.secure_url) throw new Error(j.error?.message || `Cloudinary_${res.status}`);
    return j.secure_url;
  }

  // ===== Media handlers =====
  mainFile?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    try{
      say("메인 이미지 업로드 중…");
      const url = await uploadImage(f);
      state.mainThumbnailUrl = withTransform(url, THUMB.square);
      if (mainPrev) mainPrev.src = state.mainThumbnailUrl;
      say("업로드 완료", true);
    }catch(err){ say("업로드 실패: " + err.message); e.target.value=""; }
  });

  coverFile?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    try{
      say("배경 이미지 업로드 중…");
      const url = await uploadImage(f);
      state.coverImageUrl = withTransform(url, THUMB.cover169);
      if (coverPrev) coverPrev.src = state.coverImageUrl;
      say("업로드 완료", true);
    }catch(err){ say("업로드 실패: " + err.message); e.target.value=""; }
  });

  subsFile?.addEventListener("change", async (e)=>{
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remain = Math.max(0, 5 - state.subThumbnails.length);
    const chosen = files.slice(0, remain);
    for (const f of chosen){
      try{
        say("서브 이미지 업로드 중…");
        const url = await uploadImage(f);
        state.subThumbnails.push(withTransform(url, THUMB.square));
        drawSubs();
        say("업로드 완료", true);
      }catch(err){ say("업로드 실패: " + err.message); }
    }
    e.target.value="";
  });
  function drawSubs(){
    if (!subsGrid) return;
    subsGrid.innerHTML = state.subThumbnails.map((u,i)=>`
      <div class="sub">
        <img src="${u}" alt="sub-${i}"/>
        <button type="button" class="rm" data-i="${i}" aria-label="삭제">×</button>
      </div>
    `).join("");
  }
  subsGrid?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".rm"); if (!btn) return;
    const i = Number(btn.dataset.i);
    state.subThumbnails.splice(i, 1);
    drawSubs();
  });

  // ===== Live links =====
  function addLinkRow(v={title:"",url:"",date:""}){
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
      <input class="input l-title" placeholder="제목(예: ◯◯몰 뷰티 라이브)" value="${(v.title||"").replace(/"/g,'&quot;')}"/>
      <input class="input l-url" type="url" placeholder="https://..." value="${(v.url||"").replace(/"/g,'&quot;')}"/>
      <input class="input l-date" type="date" value="${v.date?String(v.date).slice(0,10):""}"/>
      <button class="ic" type="button" aria-label="삭제">✕</button>
    `;
    linksWrap?.appendChild(row);
  }
  addLinkBtn?.addEventListener("click", ()=> addLinkRow());
  linksWrap?.addEventListener("click", (e)=>{
    const b = e.target.closest(".ic"); if (!b) return;
    b.closest(".link-row")?.remove();
  });

  // ===== Tags =====
  function drawTags(){
    if (!tagList) return;
    tagList.innerHTML = state.tags.map((t,i)=>`
      <span class="chip">${t}<button type="button" class="x" data-i="${i}">×</button></span>
    `).join("");
  }
  tagList?.addEventListener("click", (e)=>{
    const x = e.target.closest(".x"); if (!x) return;
    const i = Number(x.dataset.i);
    state.tags.splice(i,1);
    drawTags();
  });
  tagInput?.addEventListener("keydown", (e)=>{
    if (e.key === "Enter" || e.key === ","){
      e.preventDefault();
      const raw = tagInput.value.trim().replace(/,$/,"");
      if (!raw) return;
      if (state.tags.includes(raw)) { tagInput.value=""; return; }
      if (state.tags.length >= 8) { say("태그는 최대 8개"); return; }
      state.tags.push(raw);
      tagInput.value="";
      drawTags();
    }
  });

  // ===== Validation & Payload =====
  function validate(isPublish){
    if (isPublish){
      if (!state.mainThumbnailUrl){ say("메인 썸네일을 업로드해주세요"); return false; }
      if (!nickname?.value.trim()){ say("닉네임을 입력해주세요"); return false; }
      if (!headline?.value.trim()){ say("한 줄 소개를 입력해주세요"); return false; }
      // ✅ 50자 미만도 허용: 비어있지만 않으면 OK
      if (!bio?.value.trim()){ say("상세 소개를 입력해주세요"); return false; }
    }
    if (primaryLink?.value && !/^https:\/\//.test(primaryLink.value.trim())){
      say("대표 링크는 https:// 로 시작해야 합니다"); return false;
    }
    const rows = Array.from(linksWrap?.querySelectorAll(".link-row") || []);
    for (const r of rows){
      const url = r.querySelector(".l-url")?.value?.trim();
      if (url && !/^https:\/\//.test(url)){ say("라이브 URL은 https:// 로 시작해야 합니다"); return false; }
    }
    return true;
  }

  function collectPayload(status){
    const links = Array.from(linksWrap?.querySelectorAll(".link-row") || []).map(row=>({
      title: row.querySelector(".l-title")?.value?.trim() || "",
      url:   row.querySelector(".l-url")?.value?.trim()   || "",
      date:  row.querySelector(".l-date")?.value || undefined
    })).filter(x => x.title || x.url);

    return {
      type: "portfolio",
      status,
      visibility: visibility?.value || "public",
      // media
      mainThumbnailUrl: state.mainThumbnailUrl || "",
      coverImageUrl:    state.coverImageUrl || "",
      subThumbnails:    state.subThumbnails,
      // identity
      realName: realName?.value?.trim() || "",
      realNamePublic: !!realNamePublic?.checked,
      nickname: nickname?.value?.trim() || "",
      headline: headline?.value?.trim() || "",
      // stats
      careerYears: careerYears?.value ? Number(careerYears.value) : undefined,
      age:         age?.value ? Number(age.value) : undefined,
      agePublic:   !!agePublic?.checked,
      // links
      primaryLink: primaryLink?.value?.trim() || "",
      liveLinks: links,
      // content
      bio:  bio?.value?.trim() || "",
      tags: state.tags,
      openToOffers: !!openToOffers?.checked
    };
  }

  async function submit(status){
    if (!TOKEN){ say("로그인이 필요합니다"); return; }
    const isPublish = status === "published";
    if (!validate(isPublish)) return;

    const payload = collectPayload(status);

    try{
      say(isPublish ? "발행 중…" : "임시저장 중…");
      const res = await postPortfolio(payload);
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false){
        const details = (data.details || data.errors || [])
          .map(e => (e.msg || e.message || e.code || e).toString()).join(" · ");
        throw new Error(details || data.message || `HTTP_${res.status}`);
      }
      say(isPublish ? "발행되었습니다" : "임시저장 완료", true);
      setTimeout(()=> location.href = "mypage.html", 400);
    }catch(err){
      say("저장 실패: " + err.message);
    }
  }

  // ===== Wire buttons =====
  $id("saveDraftBtn")?.addEventListener("click", ()=> submit("draft"));
  $id("publishBtn")?.addEventListener("click", ()=> submit("published"));

  // 최초 링크 입력행 1개
  addLinkRow();
})();