// js/signup.js
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const TOKEN_KEY = "livee_token";

  const $ = s => document.querySelector(s);
  const say = (t, ok=false) => {
    const el = $("#sgMsg"); if (!el) return;
    el.textContent = t; el.classList.add("show"); el.classList.toggle("ok", ok);
  };

  function currentRole(){
    return document.querySelector('input[name="role"]:checked')?.value || 'showhost';
  }

  function toggleRole(){
    const r = currentRole();
    $("#roleShowhost").hidden = (r !== 'showhost');
    $("#roleBrand").hidden    = (r !== 'brand');
  }

  document.addEventListener('change', (e)=>{
    if (e.target.name === 'role') toggleRole();
  });
  document.addEventListener('DOMContentLoaded', toggleRole);

  $("#signupForm")?.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const role = currentRole();
    const email = $("#email").value.trim().toLowerCase();
    const pw = $("#password").value;
    const pw2 = $("#password2").value;
    const name = $("#name").value.trim();
    const phone = $("#phone").value.trim();

    if (!email) return say("이메일을 입력하세요.");
    if (pw.length < 8) return say("비밀번호는 8자 이상.");
    if (pw !== pw2) return say("비밀번호가 일치하지 않습니다.");
    if (!name) return say("이름을 입력하세요.");

    // 필수 약관
    if (!$("#agreeTerms").checked)   return say("이용약관 동의가 필요합니다.");
    if (!$("#agreePrivacy").checked) return say("개인정보처리방침 동의가 필요합니다.");
    if (!$("#agreeAge").checked)     return say("만 14세 이상만 가입할 수 있습니다.");

    const consents = [
      { key:'terms',    version:'1.0', granted: $("#agreeTerms").checked },
      { key:'privacy',  version:'1.0', granted: $("#agreePrivacy").checked },
      { key:'age14',    version:'1.0', granted: $("#agreeAge").checked },
      { key:'marketing',version:'1.0', granted: $("#agreeMarketing").checked },
      { key:'thirdparty',version:'1.0', granted: $("#agreeThird").checked }
    ];

    const body = { email, password: pw, name, phone, role, consents };

    if (role === 'showhost') {
      body.profile = {
        nickname: $("#shNickname").value.trim(),
        links: {
          instagram: $("#linkInsta").value.trim(),
          youtube: $("#linkYoutube").value.trim(),
          tiktok: $("#linkTiktok").value.trim()
        },
        bio: $("#bio").value.trim()
      };
    } else {
      const brandName = $("#brandName").value.trim();
      if (!brandName) return say("브랜드명을 입력하세요.");
      body.brandName = brandName;
      body.companyName = $("#companyName").value.trim();
      body.businessNumber = $("#businessNumber").value.trim();
    }

    try{
      say("가입 처리 중...");
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      const j = await res.json().catch(()=>({}));
      if(!res.ok || j.ok===false) throw new Error(j.message || `HTTP_${res.status}`);

      const { token, user } = j.data || {};
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // 호환 키
        localStorage.setItem("liveeToken", token);
      }
      if (user?.role === 'brand') {
        say("가입 완료! 브랜드 대시보드로 이동합니다.", true);
        location.href = "index.html"; // 필요 시 브랜드 전용 페이지로
      } else {
        say("가입 완료! 마이페이지로 이동합니다.", true);
        location.href = "mypage.html"; // 페이지 있으면 그쪽으로
      }
    }catch(err){
      console.warn('[signup] error', err);
      say(err.message || "가입에 실패했습니다.");
    }
  });
})();