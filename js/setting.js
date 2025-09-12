/* settings.js — v1.0 (localStorage demo; optional browser push permission) */
(function(){
  'use strict';
  const $ = (s,el=document)=>el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const LS_KEY = 'livee_settings_v1';

  // 기본값
  const DEFAULTS = {
    profile: { avatarUrl:'', nickname:'', intro:'', email:'', backupEmail:'' },
    contact: { phone:'', phoneVerifiedAt:null },
    channels: { kakao:{linked:false}, email:{subscribed:true}, push:{enabled:false} },
    notif: {
      topics: {
        newRecruit:  { kakao:true,  email:false, push:true },
        application: { kakao:true,  email:true,  push:true },
        message:     { kakao:true,  email:false, push:true }
      },
      quietHours: { start:'22:00', end:'08:00' }
    }
  };

  // 상태 로드/세이브
  const clone = (o)=> JSON.parse(JSON.stringify(o));
  let state = clone(DEFAULTS);
  try{
    const saved = JSON.parse(localStorage.getItem(LS_KEY)||'null');
    if(saved && typeof saved==='object') state = Object.assign({}, state, saved);
  }catch(_){}

  // 유저 이메일 추정
  try{
    if(!state.profile.email){
      const me = JSON.parse(localStorage.getItem('livee_user')||'null');
      state.profile.email = me?.email || '';
    }
  }catch(_){}

  // 토스트
  const toast = (msg, ok=false)=>{
    const el = $('#stToast'); if(!el) return;
    el.textContent = msg; el.classList.add('show'); el.classList.toggle('ok', ok);
    setTimeout(()=>{ el.classList.remove('show'); el.classList.remove('ok'); }, 1800);
  };

  // ============ 바인딩 ============
  // 프로필
  const avatarPreview = $('#avatarPreview');
  const avatarFile    = $('#avatarFile');
  const btnAvatarPick = $('#btnAvatarPick');
  const nickname      = $('#nickname');
  const intro         = $('#intro');
  const email         = $('#email');
  const backupEmail   = $('#backupEmail');
  $('#btnProfileSave').onclick = saveProfile;

  // 연락처
  const phone      = $('#phone');
  const btnSend    = $('#btnSendCode');
  const verifyWrap = $('#verifyWrap');
  const codeInp    = $('#code');
  const btnVerify  = $('#btnVerify');
  const codeHint   = $('#codeHint');
  const codeTimer  = $('#codeTimer');
  const phoneStatus= $('#phoneStatus');
  $('#btnContactSave').onclick = saveContact;

  // 채널
  const kakaoLinked = $('#kakaoLinked');
  const emailSub    = $('#emailSub');
  const pushStatus  = $('#pushStatus');
  const btnPushPerm = $('#btnPushPerm');
  $('#btnChannelsSave').onclick = saveChannels;

  // 알림
  const tRecruitK=$('#tRecruitK'), tRecruitE=$('#tRecruitE'), tRecruitP=$('#tRecruitP');
  const tResultK=$('#tResultK'),   tResultE=$('#tResultE'),   tResultP=$('#tResultP');
  const tMsgK=$('#tMessageK'),     tMsgE=$('#tMessageE'),     tMsgP=$('#tMessageP');
  const quietStart=$('#quietStart'), quietEnd=$('#quietEnd');
  $('#btnNotiSave').onclick = saveNotif;

  // 테스트
  const testTopic=$('#testTopic'), testChannel=$('#testChannel');
  $('#btnSendTest').onclick = sendTest;

  // 위험
  // (로그아웃은 링크)

  // ============ 초기값 렌더 ============
  function render(){
    // 프로필
    avatarPreview.src = state.profile.avatarUrl || (CFG.placeholderThumb || 'default.jpg');
    nickname.value    = state.profile.nickname || '';
    intro.value       = state.profile.intro || '';
    email.value       = state.profile.email || '';
    backupEmail.value = state.profile.backupEmail || '';

    // 연락처
    phone.value = state.contact.phone || '';
    setPhoneBadge();

    // 채널
    kakaoLinked.checked = !!state.channels.kakao.linked;
    emailSub.checked    = !!state.channels.email.subscribed;
    pushStatus.textContent = (state.channels.push.enabled ? '권한 허용됨' : '브라우저 권한 필요');

    // 알림
    tRecruitK.checked = !!state.notif.topics.newRecruit.kakao;
    tRecruitE.checked = !!state.notif.topics.newRecruit.email;
    tRecruitP.checked = !!state.notif.topics.newRecruit.push;

    tResultK.checked  = !!state.notif.topics.application.kakao;
    tResultE.checked  = !!state.notif.topics.application.email;
    tResultP.checked  = !!state.notif.topics.application.push;

    tMsgK.checked     = !!state.notif.topics.message.kakao;
    tMsgE.checked     = !!state.notif.topics.message.email;
    tMsgP.checked     = !!state.notif.topics.message.push;

    quietStart.value  = state.notif.quietHours.start || '22:00';
    quietEnd.value    = state.notif.quietHours.end   || '08:00';
  }

  // ============ 이벤트 ============
  btnAvatarPick.onclick = ()=> avatarFile.click();
  avatarFile.onchange = ()=>{
    const f = avatarFile.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      avatarPreview.src = e.target.result;
      state.profile.avatarUrl = e.target.result; // 데모: base64 저장
      persist();
      toast('프로필 이미지 적용', true);
    };
    reader.readAsDataURL(f);
    avatarFile.value='';
  };

  function saveProfile(){
    state.profile.nickname = nickname.value.trim();
    state.profile.intro    = intro.value.trim();
    state.profile.backupEmail = backupEmail.value.trim();
    persist(); toast('프로필 저장 완료', true);
  }

  let code = '';
  let endAt = 0;
  let timerId = null;

  function startTimer(sec=180){
    endAt = Date.now() + sec*1000;
    tick();
    if(timerId) clearInterval(timerId);
    timerId = setInterval(tick, 250);
  }
  function tick(){
    const left = Math.max(0, Math.floor((endAt - Date.now())/1000));
    const m = String(Math.floor(left/60)).padStart(2,'0');
    const s = String(left%60).padStart(2,'0');
    codeTimer.textContent = `${m}:${s}`;
    if(left<=0){ clearInterval(timerId); timerId=null; }
  }

  btnSend.onclick = ()=>{
    const raw = phone.value.replace(/\D/g,'');
    if(raw.length<9){ toast('휴대폰 번호를 정확히 입력하세요'); return; }
    // 데모: 6자리 생성
    code = String(Math.floor(100000 + Math.random()*900000));
    codeHint.textContent = code; // 데모이므로 힌트 노출
    verifyWrap.hidden = false;
    startTimer(180);
    toast('인증코드 전송(데모)', true);
  };

  btnVerify.onclick = ()=>{
    const v = codeInp.value.trim();
    if(!v){ toast('코드를 입력하세요'); return; }
    if(v!==code){ toast('코드가 올바르지 않습니다'); return; }
    state.contact.phone = phone.value.replace(/\D/g,'');
    state.contact.phoneVerifiedAt = new Date().toISOString();
    persist();
    verifyWrap.hidden = true;
    toast('휴대폰 인증 완료', true);
    setPhoneBadge();
  };

  function setPhoneBadge(){
    const ok = !!state.contact.phoneVerifiedAt;
    phoneStatus.className = 'badge ' + (ok ? 'ok' : 'muted');
    phoneStatus.innerHTML = ok
      ? '<i class="ri-shield-check-line"></i> 인증됨'
      : '<i class="ri-alert-line"></i> 미인증';
  }

  function saveContact(){
    // 번호만 저장 (인증은 별도)
    state.contact.phone = phone.value.replace(/\D/g,'');
    persist(); toast('연락처 저장 완료', true);
  }

  // 채널
  btnPushPerm.onclick = async ()=>{
    try{
      if(!('Notification' in window)){ pushStatus.textContent='미지원 브라우저'; return; }
      const perm = await Notification.requestPermission();
      if(perm === 'granted'){
        state.channels.push.enabled = true;
        pushStatus.textContent='권한 허용됨';
        persist();
        toast('푸시 권한 허용', true);
      }else if(perm==='denied'){
        state.channels.push.enabled = false;
        pushStatus.textContent='차단됨(브라우저 설정에서 변경)';
        persist();
        toast('푸시 권한이 차단되어 있어요');
      }else{
        pushStatus.textContent='요청 취소됨';
      }
    }catch(_){ pushStatus.textContent='권한 오류'; }
  };

  kakaoLinked.addEventListener('change', ()=>{
    if(kakaoLinked.checked && !state.contact.phoneVerifiedAt){
      kakaoLinked.checked = false;
      toast('먼저 휴대폰 인증을 완료하세요');
      return;
    }
    state.channels.kakao.linked = kakaoLinked.checked;
    persist();
    toast(state.channels.kakao.linked?'카카오 연결됨':'카카오 해제됨', true);
  });
  emailSub.addEventListener('change', ()=>{
    state.channels.email.subscribed = emailSub.checked;
    persist();
  });

  function saveChannels(){
    state.channels.kakao.linked = kakaoLinked.checked;
    state.channels.email.subscribed = emailSub.checked;
    persist(); toast('채널 설정 저장 완료', true);
  }

  function saveNotif(){
    state.notif.topics.newRecruit  = { kakao:tRecruitK.checked, email:tRecruitE.checked, push:tRecruitP.checked };
    state.notif.topics.application = { kakao:tResultK.checked,  email:tResultE.checked,  push:tResultP.checked };
    state.notif.topics.message     = { kakao:tMsgK.checked,     email:tMsgE.checked,     push:tMsgP.checked };
    state.notif.quietHours.start = quietStart.value || '22:00';
    state.notif.quietHours.end   = quietEnd.value   || '08:00';
    persist(); toast('알림 설정 저장 완료', true);
  }

  function sendTest(){
    const ch = testChannel.value;
    const tp = testTopic.value;
    // 야간 제한 가이드(데모)
    const now = new Date();
    const [qs,qe] = [state.notif.quietHours.start, state.notif.quietHours.end];
    const inQuiet = isWithinQuiet(now, qs, qe);
    if(inQuiet) toast(`지금은 야간 제한 시간대입니다(${qs}~${qe})`);
    // 채널 사용 가능 여부
    if(ch==='kakao' && (!state.channels.kakao.linked || !state.contact.phoneVerifiedAt)){
      toast('카카오 연결/휴대폰 인증이 필요합니다'); return;
    }
    if(ch==='push' && !state.channels.push.enabled){
      toast('푸시 권한이 필요합니다'); return;
    }
    if(ch==='email' && !state.channels.email.subscribed){
      toast('이메일 수신을 켜주세요'); return;
    }
    toast(`테스트 알림 전송됨 · ${ch}/${tp}`, true);
  }

  function isWithinQuiet(now, start='22:00', end='08:00'){
    const [sh,sm] = start.split(':').map(Number);
    const [eh,em] = end.split(':').map(Number);
    const cur = now.getHours()*60 + now.getMinutes();
    const s = sh*60+sm, e = eh*60+em;
    if(s<=e){ // 같은날
      return cur>=s && cur<e;
    }else{    // 자정 넘김
      return cur>=s || cur<e;
    }
  }

  function persist(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(_){}
  }

  // 시작
  render();
})();