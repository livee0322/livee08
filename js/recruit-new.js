/* recruit-new.js — v2.6.1 */
(() => {
  const CFG=window.LIVEE_CONFIG||{};
  const API_BASE=(CFG.API_BASE||"/api/v1").replace(/\/$/,"");
  const BASE_PATH=(CFG.BASE_PATH||"").replace(/\/$/,"");
  const THUMB=CFG.thumb||{ card169:"c_fill,g_auto,w_640,h_360,f_auto,q_auto" };
  const TOKEN=localStorage.getItem("livee_token")||localStorage.getItem("liveeToken")||"";

  const $=id=>document.getElementById(id);
  const form=$("recruitForm"), msg=$("recruitMsg");
  const brandNameEl=$("brandName"), titleEl=$("title"), descEl=$("desc");
  const categoryEl=$("category"), locationEl=$("location");
  const shootDate=$("shootDate"), startTime=$("startTime"), endTime=$("endTime");
  const deadline=$("deadline"), payEl=$("pay"), negEl=$("negotiable");
  const fileEl=$("imageFile"), preview=$("preview");

  const say=(t,ok=false)=>{ if(!msg) return; msg.textContent=t; msg.classList.add('show'); msg.classList.toggle('ok',ok); };
  const headers=(json=true)=>{ const h={}; if(json) h["Content-Type"]="application/json"; if(TOKEN) h["Authorization"]=`Bearer ${TOKEN}`; return h; };

  const today=new Date().toISOString().slice(0,10);
  if(shootDate) shootDate.min=today; if(deadline) deadline.min=today;

  const withTransform=(url,t)=>{ try{ if(!url.includes('/upload/')) return url; const [h,tail]=url.split('/upload/'); return `${h}/upload/${t}/${tail}`; }catch{ return url; } };

  async function getSig(){ const r=await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)}); const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`HTTP_${r.status}`); return j.data||j; }
  async function upload(file){
    const {cloudName,apiKey,timestamp,signature}=await getSig();
    const fd=new FormData(); fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const res=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd});
    const j=await res.json().catch(()=>({})); if(!res.ok||!j.secure_url) throw new Error(j.error?.message||`Cloudinary_${res.status}`); return j.secure_url;
  }

  fileEl?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    if(!/^image\//.test(f.type)) return say('이미지 파일만 업로드');
    if(f.size>8*1024*1024) return say('이미지는 8MB 이하');
    say('이미지 업로드 중...');
    try{
      const cover=await upload(f);
      const thumb=withTransform(cover, THUMB.card169);
      preview.src=thumb; preview.dataset.cover=cover; preview.dataset.thumb=thumb;
      say('이미지 업로드 완료',true);
    }catch(err){ preview.removeAttribute('src'); delete preview.dataset.cover; delete preview.dataset.thumb; say('업로드 실패: '+err.message); }
  });

  negEl?.addEventListener('change', ()=>{ if(negEl.checked){ payEl.value=''; payEl.disabled=true; } else { payEl.disabled=false; } });

  form?.addEventListener('submit', async ev=>{
    ev.preventDefault();
    if(!TOKEN){ say('로그인이 필요합니다.'); return; }
    const brandName=(brandNameEl?.value||'').trim();
    const title=(titleEl?.value||'').trim();
    const desc=(descEl?.value||'').trim(); // 자유형식
    if(!brandName) return say('브랜드명을 입력해주세요.');
    if(!title) return say('제목을 입력해주세요.');
    if(!categoryEl.value) return say('카테고리를 선택해주세요.');
    if(!shootDate.value) return say('촬영일을 선택해주세요.');
    if(!deadline.value) return say('마감일을 선택해주세요.');
    if(!startTime.value||!endTime.value) return say('시작/종료 시간을 입력해주세요.');
    if(!(deadline.value<=shootDate.value)) return say('마감일은 촬영일과 같거나 그 이전이어야 합니다.');

    let pay=""; if(!negEl.checked){ const raw=String(payEl.value||'').replace(/,/g,'').trim(); if(raw && isNaN(Number(raw))) return say('출연료는 숫자만 입력'); pay=raw; }

    const cover=preview?.dataset?.cover||""; const thumb=preview?.dataset?.thumb || (cover?withTransform(cover,THUMB.card169):"");

    const payload={
      type:"recruit", status:"published",
      brandName, title, category:categoryEl.value,
      closeAt:`${deadline.value}T23:59:59.000Z`,
      ...(cover?{coverImageUrl:cover}:{}), ...(thumb?{thumbnailUrl:thumb}:{}),
      ...(desc?{descriptionHTML:desc}:{}),
      // ★ 상·하위 동시 기록
      fee: pay ? Number(pay) : undefined,
      feeNegotiable: !!negEl.checked,
      recruit:{
        brandName,
        location:(locationEl.value||"").trim(),
        shootDate:new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime:`${startTime.value}~${endTime.value}`,
        pay, payNegotiable:!!negEl.checked,
        requirements:desc
      }
    };

    try{
      say('등록 중...');
      const r=await fetch(`${API_BASE}/recruit-test`,{method:'POST',headers:headers(true),body:JSON.stringify(payload)});
      const j=await r.json().catch(()=>({})); if(!r.ok||j.ok===false) throw new Error(j.message||`등록 실패 (${r.status})`);
      alert('공고가 등록되었습니다.'); location.href=(BASE_PATH?`${BASE_PATH}/index.html#recruits`:'./index.html#recruits');
    }catch(err){ say(err.message||'네트워크 오류'); }
  });
})();