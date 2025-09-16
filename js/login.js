// 로그인 (FINAL v2.6.2)
// - role 필수 전송(brand/showhost)
// - ui.js 탭바 사용(하단탭 레이아웃 고정)
// - returnTo/prev 처리, 토큰 키 2종 저장
// - 로딩/에러 상태 처리, 네트워크 예외 방어

(() => {
  const CFG       = window.LIVEE_CONFIG || {};
  const API_BASE  = (CFG.API_BASE  || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = (CFG.BASE_PATH || "").replace(/\/$/, "");

  const $ = (s) => document.querySelector(s);

  /* ---------- 하단 탭: ui.js 사용 ---------- */
  try {
    if (window.LIVEE_UI?.mountTabbar) {
      // 로그인 페이지는 '마이페이지' 탭이 자연스럽게 활성화
      LIVEE_UI.mountTabbar({ active: "mypage" });
    }
  } catch (_) {
    /* no-op */
  }

  /* ---------- 역할 토글 ---------- */
  const pills = document.querySelectorAll(".role-switch .pill");
  const qs    = new URLSearchParams(location.search);

  let selectedRole =
    (qs.get("role") || localStorage.getItem("lastRole") || "brand").toLowerCase();
  if (!["brand", "showhost"].includes(selectedRole)) selectedRole = "brand";

  const applyRoleUI = () =>
    pills.forEach((p) => {
      const on = p.dataset.role === selectedRole;
      p.classList.toggle("active", on);
      p.setAttribute("aria-pressed", String(on));
    });

  pills.forEach((p) =>
    p.addEventListener("click", () => {
      selectedRole = (p.dataset.role || "brand").toLowerCase();
      localStorage.setItem("lastRole", selectedRole);
      applyRoleUI();
    })
  );
  applyRoleUI();

  /* ---------- 폼 요소 ---------- */
  const form   = $("#loginForm");
  const email  = $("#email");
  const pw     = $("#password");
  const btn    = $("#loginBtn");
  const errBox = $("#loginError");

  const setLoading = (on) => {
    btn.disabled = on;
    btn.textContent = on ? "로그인 중…" : "로그인";
  };
  const showError = (m) => {
    errBox.textContent = m || "로그인에 실패했습니다.";
    errBox.hidden = false;
  };
  const clearError = () => {
    errBox.hidden = true;
    errBox.textContent = "";
  };

  /* ---------- API helper ---------- */
  async function postJSON(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }).catch(() => {
      // 네트워크 단절 등 fetch 자체 실패
      throw new Error("NETWORK_ERROR");
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      /* no-op */
    }

    if (!res.ok || data?.ok === false) {
      const e = new Error(data?.message || `HTTP_${res.status}`);
      e.code = data?.code || "";
      throw e;
    }
    return data || {};
  }

  /* ---------- 제출 ---------- */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const emailVal = (email.value || "").trim().toLowerCase();
    const pwVal    = pw.value || "";
    const role     = (selectedRole || "brand").toLowerCase();

    if (!emailVal || !pwVal) {
      showError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      // 서버 요구: role 필수
      const payload = { email: emailVal, password: pwVal, role };
      const data = await postJSON("/users/login", payload);

      // 토큰/프로필 저장 — 호환 위해 2개의 키 모두
      const token = data.token || "";
      localStorage.setItem("livee_token", token);
      localStorage.setItem("liveeToken", token);
      if (data.name) localStorage.setItem("liveeName", data.name);
      if (data.role) localStorage.setItem("liveeRole", data.role);

      // 리다이렉트 처리: returnTo > prev > 홈
      const q = new URLSearchParams(location.search);
      const ret = q.get("returnTo") || q.get("prev");
      const next = ret
        ? decodeURIComponent(ret)
        : (BASE_PATH ? `${BASE_PATH}/index.html` : "./index.html");
      location.href = next;
    } catch (err) {
      const map = {
        VALIDATION_FAILED: "이메일, 비밀번호, 역할은 필수입니다.",
        INVALID_CREDENTIALS: "이메일 또는 비밀번호가 잘못되었습니다.",
        ROLE_MISMATCH: "선택한 역할과 계정의 역할이 다릅니다.",
        NETWORK_ERROR: "네트워크 오류입니다. 연결을 확인해주세요.",
      };
      showError(map[err.code] || err.message || "로그인에 실패했습니다.");
      setLoading(false);
    }
  });
})();