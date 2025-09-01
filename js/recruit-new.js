/* Livee v2.5 – Recruit Create (for /recruit-test)
 * - POST {API_BASE}/recruit-test
 * - optional: /uploads/signature → Cloudinary 업로드
 * - adds verbose debug logs
 */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || "";
  const TOKEN = localStorage.getItem("livee_token") || "";

  const log = (...a) => console.log("[recruit-new]", ...a);
  const warn = (...a) => console.warn("[recruit-new]", ...a);
  const errl = (...a) => console.error("[recruit-new]", ...a);

  const $id = (s) => document.getElementById(s);
  const form=$id("recruitForm"), titleEl=$id("title"), descEl=$id("desc"),
        categoryEl=$id("category"), locationEl=$id("location"),
        shootDate=$id("shootDate"), startTime=$id("startTime"), endTime=$id("endTime"),
        deadline=$id("deadline"), payEl=$id("pay"), negEl=$id("negotiable"),
        fileEl=$id("imageFile"), previewEl=$id("preview"), msgEl=$id("recruitMsg");

  const todayISO = new Date().toISOString().slice(0,10);
  if (shootDate) shootDate.min = todayISO;
  if (deadline)  deadline.min  = todayISO;

  const headers = (json=true)=> {
    const h = {};
    if (json) h['Content-Type']='application/json';
    if (TOKEN) h['Authorization']=`Bearer ${TOKEN}`;
    return h;
  };
  const fail = (m)=>{ alert(m||'요청 오류'); };

  async function getSignature(){
    const url = `${API_BASE}/uploads/signature`;
    log("GET signature →", url);
    const r = await fetch(url, { headers: headers(false) });
    const j = await r.json().catch(()=>({}));
    log("signature res:", r.status, j);
    if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data || j;
  }
  function transUrl(u,t){
    try{const [a,b]=u.split('/upload/'); return `${a}/upload/${t}/${b}`;}catch{ return u;}
  }
  function toThumb(u){
    // 서버도 해주지만 프런트에서도 보강 (카드 16:9)
    if(!u) return "";
    return transUrl(u, (CFG.thumb && CFG.thumb.card169) || "c_fill,g_auto,w_640,h_360,f_auto,q_auto");
  }
  async function uploadToCloudinary(file){
    const sig = await getSignature();
    const { cloudName, apiKey, timestamp, signature } = sig || {};
    if(!cloudName || !apiKey || !timestamp || !signature) throw new Error("서명 파라미터 누락");
    const fd=new FormData();
    fd.append('file',file);
    fd.append('api_key',apiKey);
    fd.append('timestamp',timestamp);
    fd.append('signature',signature);
    const url=`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    log("POST cloudinary →", url);
    const res = await fetch(url,{ method:'POST', body:fd });
    const j = await res.json().catch(()=>({}));
    log("cloudinary res:", res.status, j);
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }

  fileEl?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)) { msgEl.textContent='이미지 파일만 업로드'; e.target.value=''; return; }
    if(f.size>8*1024*1024){ msgEl.textContent='8MB 이하만 업로드'; e.target.value=''; return; }
    try{
      msgEl.textContent='이미지 업로드 중...';
      const url = await uploadToCloudinary(f);
      previewEl.src = toThumb(url);
      previewEl.dataset.cover = url;          // 원본 URL 저장
      msgEl.textContent='업로드 완료';
      log("uploaded cover:", url);
    }catch(err){
      msgEl.textContent='업로드 실패: '+err.message;
      previewEl.removeAttribute('src');
      delete previewEl.dataset.cover;
      errl("upload fail:", err);
    }
  });

  negEl?.addEventListener('change',()=>{
    if(negEl.checked){ payEl.value=''; payEl.disabled=true; }
    else { payEl.disabled=false; }
  });

  function validTimes(){
    if(!shootDate?.value || !startTime?.value || !endTime?.value) return false;
    const s=new Date(`${shootDate.value}T${startTime.value}`);
    const e=new Date(`${shootDate.value}T${endTime.value}`);
    return e>s;
  }
  function validDeadline(){
    if(!deadline?.value || !shootDate?.value) return false;
    return deadline.value <= shootDate.value;
  }

  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    log("submit!");

    if(!TOKEN) { warn("no token"); return fail('로그인이 필요합니다.'); }

    const title=(titleEl.value||'').trim();
    const desc=(descEl.value||'').trim();
    if(!title) return fail('제목을 입력해주세요.');
    if(!desc || desc.length<30) return fail('내용을 30자 이상 입력해주세요.');
    if(!categoryEl.value) return fail('카테고리를 선택해주세요.');
    if(!shootDate.value) return fail('촬영일을 선택해주세요.');
    if(!deadline.value) return fail('마감일을 선택해주세요.');
    if(!startTime.value || !endTime.value) return fail('시작/종료 시간을 입력해주세요.');
    if(!validTimes()) return fail('종료 시간은 시작 시간 이후여야 합니다.');
    if(!validDeadline()) return fail('마감일은 촬영일과 같거나 그 이전이어야 합니다.');

    let pay = '';
    if(!negEl.checked){
      const raw = String(payEl.value||'').trim();
      const n = Number(raw);
      if(!raw || isNaN(n) || n<0) return fail('출연료를 숫자로 입력해주세요.');
      pay = raw;
    }

    const cover = previewEl?.dataset?.cover || '';
    const payload = {
      type:'recruit',
      status:'published',                     // 홈에서 보이도록 기본 published
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(cover ? { coverImageUrl: cover, thumbnailUrl: toThumb(cover) } : {}),
      recruit:{
        recruitType:'product',
        location: (locationEl.value||'').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        pay,
        payNegotiable: !!negEl.checked,
        requirements: desc,
        preferred:'',
        questions:[]
      }
    };
    log("POST payload:", payload);

    try{
      const url = `${API_BASE}/recruit-test`;
      log("POST →", url);
      const res = await fetch(url,{
        method:'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      log("POST res:", res.status, data);
      if(!res.ok || data.ok===false) throw new Error(data.message||`등록 실패 (${res.status})`);
      alert('공고가 등록되었습니다.');
      location.href = (BASE_PATH ? `${BASE_PATH}/index.html#recruits` : './index.html#recruits');
    }catch(err){
      errl("create fail:", err);
      fail(err.message);
    }
  });

  // 초기 로그 (환경 확인)
  log("CFG", CFG);
  log("API_BASE", API_BASE, "BASE_PATH", BASE_PATH);
})();