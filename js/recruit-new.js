/* Livee v2.5 – Recruit Create (for /recruit-test) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const BASE_PATH = CFG.BASE_PATH || "";
  const TOKEN = localStorage.getItem("livee_token") || "";

  const $id = (s) => document.getElementById(s);
  const form=$id("recruitForm"), titleEl=$id("title"), descEl=$id("desc"),
        categoryEl=$id("category"), locationEl=$id("location"),
        shootDate=$id("shootDate"), startTime=$id("startTime"), endTime=$id("endTime"),
        deadline=$id("deadline"), payEl=$id("pay"), negEl=$id("negotiable"),
        fileEl=$id("imageFile"), previewEl=$id("preview"), msgEl=$id("recruitMsg");

  // 업로드 결과 보관 변수(미리보기 src와 분리)
  let coverImageUrl = '';

  const today = new Date().toISOString().slice(0,10);
  if (shootDate) shootDate.min = today;
  if (deadline)  deadline.min  = today;

  const headers = (json=true)=> {
    const h = {};
    if (json) h['Content-Type']='application/json';
    if (TOKEN) h['Authorization']=`Bearer ${TOKEN}`;
    return h;
  };
  const fail = (m)=>alert(m||'요청 오류');

  async function getSignature(){
    const url = `${API_BASE}/uploads/signature`;
    console.log('[RECRUIT] getSignature:', url);
    const r = await fetch(url, { headers: headers(false), cache:'no-store' });
    const j = await r.json().catch(()=>({}));
    console.log('[RECRUIT] signature res:', r.status, j);
    if(!r.ok || j.ok===false) throw new Error(j.message||`HTTP_${r.status}`);
    return j.data || j;
  }
  function transUrl(u,t){
    try{const [a,b]=u.split('/upload/'); return `${a}/upload/${t}/${b}`;}catch{ return u;}
  }
  async function uploadToCloudinary(file){
    const { cloudName, apiKey, timestamp, signature } = await getSignature();
    const fd=new FormData();
    fd.append('file',file);
    fd.append('api_key',apiKey);
    fd.append('timestamp',timestamp);
    fd.append('signature',signature);
    const url=`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    console.log('[RECRUIT] uploading to:', url, 'size:', file.size);
    const res = await fetch(url,{ method:'POST', body:fd });
    const j = await res.json().catch(()=>({}));
    console.log('[RECRUIT] cloudinary res:', res.status, j);
    if(!res.ok || !j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`);
    return j.secure_url;
  }

  fileEl?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)) { msgEl.textContent='이미지 파일만 업로드'; e.target.value=''; return; }
    if(f.size>8*1024*1024){ msgEl.textContent='8MB 이하만 업로드'; e.target.value=''; return; }
    try{
      msgEl.textContent='이미지 업로드 중...';
      coverImageUrl = await uploadToCloudinary(f);       // ← 결과 저장
      previewEl.src = transUrl(coverImageUrl, (CFG.thumb?.card169)||'c_fill,g_auto,w_640,h_360,f_auto,q_auto');
      msgEl.textContent='업로드 완료';
    }catch(err){
      msgEl.textContent='업로드 실패: '+err.message;
      previewEl.removeAttribute('src');
      coverImageUrl = '';
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

    if(!TOKEN) return fail('로그인이 필요합니다.');

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

    const payload = {
      type:'recruit',
      status:'published',
      title,
      category: categoryEl.value,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(coverImageUrl ? { coverImageUrl } : {}),
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

    console.log('[RECRUIT] POST payload:', payload);

    try{
      const res = await fetch(`${API_BASE}/recruit-test`,{
        method:'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      console.log('[RECRUIT] create res:', res.status, data);

      if(!res.ok || data.ok===false) throw new Error(data.message||`등록 실패 (${res.status})`);
      alert('공고가 등록되었습니다.');
      location.href = (BASE_PATH ? `${BASE_PATH}/index.html#recruits` : './index.html#recruits');
    }catch(err){
      fail(err.message);
    }
  });
})();