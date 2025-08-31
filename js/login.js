// 로그인 (v2.5 API) — /users/login 사용
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || "";

  const $ = (s) => document.querySelector(s);
  const form = $("#loginForm");
  const emailEl = $("#email");
  const pwEl = $("#password");
  const btn = $("#loginBtn");
  const err = $("#loginError");

  // 역할 토글
  const pills = document.querySelectorAll(".role-switch .pill");
  let selectedRole = localStorage.getItem("lastRole") || "brand";
  const applyRoleUI = () => pills.forEach(p => {
    const on = p.dataset.role === selectedRole;
    p.classList.toggle("active", on);
    p.setAttribute("aria-pressed", String(on));
  });
  pills.forEach(p => p.addEventListener("click", () => {
    selectedRole = p.dataset.role;
    localStorage.setItem("lastRole", selectedRole);
    applyRoleUI();
  }));
  applyRoleUI();

  const showError = (m) => { err.textContent = m || "로그인에 실패했습니다."; err.hidden = false; };
  const clearError = () => { err.hidden = true; err.textContent = ""; };

  async function postJSON(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.message || `HTTP_${res.status}`);
    }
    return data;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = (emailEl.value || "").trim();
    const password = pwEl.value || "";
    if (!email || !password) return showError("이메일과 비밀번호를 입력해주세요.");

    btn.disabled = true; btn.textContent = "로그인 중...";
    try {
      // 서버 응답 기대: { ok:true, token, name, role }
      const data = await postJSON("/users/login", { email, password });

      // 저장 (토큰 키는 프런트 전역에서 쓰는 'livee_token'으로 통일)
      localStorage.setItem("livee_token", data.token || "");
      if (data.name) localStorage.setItem("liveeName", data.name);
      if (data.role) localStorage.setItem("liveeRole", data.role);

      // 역할 안내는 경고만
      if (data.role && data.role !== selectedRole) {
        console.warn(`[LOGIN] 선택역할(${selectedRole}) ≠ 서버역할(${data.role})`);
      }

      // 돌아갈 위치 (prev 파라미터가 있으면 우선 사용)
      const params = new URLSearchParams(location.search);
      const prev = params.get("prev");
      const next = prev ? decodeURIComponent(prev) : (BASE_PATH ? `${BASE_PATH}/index.html` : "./index.html");
      location.href = next;
    } catch (e2) {
      showError(e2.message);
      btn.disabled = false; btn.textContent = "로그인";
    }
  });
})();