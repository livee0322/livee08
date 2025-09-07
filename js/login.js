// 로그인 (FINAL v2.6.2)
// - role 필수 전송(brand/showhost)
// - ui.js 탭바 사용(하단탭 레이아웃 고정)
// - returnTo/prev 처리, 토큰 키 2종 저장

(() => {
  const CFG       = window.LIVEE_CONFIG || {};
  const API_BASE  = (CFG.API_BASE  || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = (CFG.BASE_PATH || "").replace(/\/$/, "");

  const $ = (s) => document.querySelector(s);

  // ----- 하단 탭: ui.js 사용 -----
  try {
    if (window.LIVEE_UI?.mountTabbar) {
      // 로그인 페이지는 'mypage' 강조가 자연스러움
      LIVEE_UI.mountTabbar({ active: 'mypage' });
    }
  } catch(_) {}

  // ----- 역할 토글 -----
  const pills = document.querySelectorAll(".role-switch .pill");
  const qs    = new URLSearchParams(location.search);
  let selectedRole = (qs.get("role") || localStorage.getItem("lastRole") || "brand").toLowerCase();
  if (!["brand","showhost"].includes(selectedRole)) selectedRole = "brand";

  const applyRoleUI = () => pills.forEach(p => {
    const on = p.dataset.role === selectedRole;
    p.classList.toggle("active", on);
    p.setAttribute("aria-pressed", String(on));
  });
  pills.forEach(p => p.addEventListener("click", () => {
    selectedRole = (p.dataset.role || "brand").toLowerCase();
    localStorage.setItem("lastRole", selectedRole);
    applyRoleUI();
  }));
  applyRoleUI();

  // ----- 폼 -----
  const form = $("#loginForm");
  const emailEl = $("#email");
  const pwEl    = $("#password");
  const btn     = $("#loginBtn");
  const errBox  = $("#loginError");

  const showError  = (m) => { errBox.textContent = m || "로그인에 실패했습니다."; errBox.hidden = false; };
  const clearError = ()   => { errBox.hidden = true; errBox.textContent = ""; };

  async function postJSON(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const e = new Error(data.message || data.code || `HTTP_${res.status}`);
      e.code = data.code || '';
      throw e;
    }
    return data;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = pwEl.value || "";
    const role = (selectedRole || "brand").toLowerCase();

    if (!email || !password) return showError("이메일과 비밀번호를 입력해주세요.");

    btn.disabled = true; btn.textContent = "로그인 중…";

    try {
      // ✅ 서버 요구사항: role 필수
      const payload = { email, password, role };
      const data = await postJSON("/users/login", payload);

      // 토큰/프로필 저장(호환키 둘 다)
      const token = data.token || "";
      localStorage.setItem("livee_token", token);
      localStorage.setItem("liveeToken",  token);
      if (data.name) localStorage.setItem("liveeName", data.name);
      if (data.role) localStorage.setItem("liveeRole", data.role);

      // 리다이렉트
      const qs = new URLSearchParams(location.search);
      const ret = qs.get("returnTo") || qs.get("prev");
      const next = ret ? decodeURIComponent(ret)
                       : (BASE_PATH ? `${BASE_PATH}/index.html` : "./index.html");
      location.href = next;

    } catch (e2) {
      const map = {
        VALIDATION_FAILED   : "이메일, 비밀번호, 역할은 필수입니다.",
        INVALID_CREDENTIALS : "이메일 또는 비밀번호가 잘못되었습니다.",
        ROLE_MISMATCH       : "선택한 역할과 계정의 역할이 다릅니다."
      };
      showError(map[e2.code] || e2.message || "로그인에 실패했습니다.");
      btn.disabled = false; btn.textContent = "로그인";
    }
  });
})();