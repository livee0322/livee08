// 로그인 (v2.6) — role 동봉, returnTo/prev 리다이렉트, 토큰 키 2종 저장
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE  = (CFG.API_BASE  || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = (CFG.BASE_PATH || "").replace(/\/$/, "");

  const $ = (s) => document.querySelector(s);
  const form   = $("#loginForm");
  const emailEl= $("#email");
  const pwEl   = $("#password");
  const btn    = $("#loginBtn");
  const err    = $("#loginError");

  // ---- 역할 토글 ----------------------------------------------------------
  const pills = document.querySelectorAll(".role-switch .pill");
  const qs    = new URLSearchParams(location.search);
  let selectedRole = (qs.get("role") || localStorage.getItem("lastRole") || "brand")
    .toLowerCase();
  if (!["brand","showhost"].includes(selectedRole)) selectedRole = "brand";

  const applyRoleUI = () => {
    pills.forEach(p => {
      const on = p.dataset.role === selectedRole;
      p.classList.toggle("active", on);
      p.setAttribute("aria-pressed", String(on));
    });
  };
  pills.forEach(p => p.addEventListener("click", () => {
    selectedRole = p.dataset.role;
    localStorage.setItem("lastRole", selectedRole);
    applyRoleUI();
  }));
  applyRoleUI();

  // ---- helpers ------------------------------------------------------------
  const showError  = (m) => { err.textContent = m || "로그인에 실패했습니다."; err.hidden = false; };
  const clearError = ()   => { err.hidden = true; err.textContent = ""; };

  async function postJSON(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      // 서버 표준 메시지/코드 그대로 전달
      const msg = data.message || data.code || `HTTP_${res.status}`;
      const e   = new Error(msg);
      e.code = data.code || msg;
      throw e;
    }
    return data;
  }

  // ---- submit -------------------------------------------------------------
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = pwEl.value || "";
    if (!email || !password) return showError("이메일과 비밀번호를 입력해주세요.");

    btn.disabled = true; btn.textContent = "로그인 중…";

    try {
      // ✅ 역할 동봉 (백엔드가 필수로 받음)
      const payload = { email, password, role: selectedRole };
      const data = await postJSON("/users/login", payload);
      // 기대 응답: { ok:true, token, name, role }

      // 토큰·프로필 저장 (양쪽 키 모두 저장해 호환)
      const token = data.token || "";
      localStorage.setItem("livee_token", token);
      localStorage.setItem("liveeToken",  token);
      if (data.name) localStorage.setItem("liveeName", data.name);
      if (data.role) localStorage.setItem("liveeRole", data.role);

      // 리다이렉트 (returnTo > prev > 홈)
      const ret = qs.get("returnTo") || qs.get("prev");
      const next = ret
        ? decodeURIComponent(ret)
        : (BASE_PATH ? `${BASE_PATH}/index.html` : "./index.html");
      location.href = next;
    } catch (e2) {
      // 친절 메시지 매핑
      const map = {
        VALIDATION_FAILED: "이메일, 비밀번호, 역할은 필수입니다.",
        INVALID_CREDENTIALS: "이메일 또는 비밀번호가 잘못되었습니다.",
        ROLE_MISMATCH: "선택한 역할과 계정의 역할이 다릅니다.",
      };
      showError(map[e2.code] || e2.message || "로그인에 실패했습니다.");
      btn.disabled = false; btn.textContent = "로그인";
    }
  });
})();