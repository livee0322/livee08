/* js/recruit-new.js — v3.3.0 (쇼핑라이브/상품 섹션 추가 + 공통 UI 마운트) */
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const TH = Object.assign({
    card169:  "c_fill,g_auto,w_640,h_360,f_auto,q_auto",
    card916:  "c_fill,g_auto,w_720,h_1280,f_auto,q_auto",
    square:   "c_fill,g_auto,w_640,h_640,f_auto,q_auto"
  }, CFG.thumb || {});

  // 공통 UI 마운트
  try{
    window.LIVEE_UI?.mountHeader?.({ title:'공고 등록' });
    window.LIVEE_UI?.mountTopTabs?.({ active:'campaigns' });
    window.LIVEE_UI?.mountTabbar?.({ active:'campaigns' });
  }catch(_){}

  const $id = (s) => document.getElementById(s);
  const form=$id("recruitForm"), msgEl=$id("recruitMsg");

  const brandNameEl=$id("brandName"), prefixEl=$id("prefix"), titleEl=$id("title");
  const contentEl=$id("content"), categoryEl=$id("category"), locationEl=$id("location");

  const shootDate=$id("shootDate"), deadline=$id("deadline");
  const shootHours=$id("shootHours"), startTime=$id("startTime"), endTime=$id("endTime");

  const payEl=$id("pay"), negEl=$id("negotiable");

  // 이미지 업로드 3종
  const fileMain=$id("imageFile"), prevMain=$id("preview");
  const fileLive=$id("liveCoverFile"), prevLive=$id("liveCoverPreview");
  const fileProd=$id("prodThumbFile"), prevProd=$id("prodThumbPreview");

  const say=(t,ok=false)=>{ if(!msgEl) return; msgEl.textContent=t; msgEl.classList.add('show'); msgEl.classList.toggle('ok',ok); };
  const headers=(json=true)=>{ const h={}; if(json) h["Content-Type"]="application/json";
    const tok=localStorage.getItem("livee_token")||localStorage.getItem("liveeToken");
    if(tok) h.Authorization=`Bearer ${tok}`; return h; };
  const withTransform=(url,t)=>{ try{ if(!url||!url.includes('/upload/')) return url||''; const [a,b]=url.split('/upload/'); return `${a}/upload/${t}/${b}`; }catch{ return url; } };

  async function uploadToCloudinary(file){
    const sig = await fetch(`${API_BASE}/uploads/signature`,{headers:headers(false)}).then(r=>r.json());
    const {cloudName, apiKey, timestamp, signature} = sig.data||sig;
    const fd=new FormData();
    fd.append('file',file); fd.append('api_key',apiKey); fd.append('timestamp',timestamp); fd.append('signature',signature);
    const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,{method:'POST',body:fd}).then(r=>r.json());
    if(!up.secure_url) throw new Error('업로드 실패');
    return up.secure_url;
  }

  // 메인(16:9)
  fileMain?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      say('이미지 업로드 중…');
      const url = await uploadToCloudinary(f);
      const thumb = withTransform(url, TH.card169);
      prevMain.src=thumb; prevMain.dataset.cover=url; prevMain.dataset.thumb=thumb;
      say('이미지 업로드 완료', true);
    }catch(err){
      prevMain.removeAttribute('src'); delete prevMain.dataset.cover; delete prevMain.dataset.thumb;
      say('업로드 실패: '+(err.message||'오류'));
    }
  });

  // 쇼핑라이브(세로 9:16)
  fileLive?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      say('라이브 커버 업로드 중…');
      const url = await uploadToCloudinary(f);
      const thumb = withTransform(url, TH.card916);
      prevLive.src=thumb; prevLive.dataset.cover=url; prevLive.dataset.thumb=thumb;
      say('업로드 완료', true);
    }catch(err){
      prevLive.removeAttribute('src'); delete prevLive.dataset.cover; delete prevLive.dataset.thumb;
      say('업로드 실패: '+(err.message||'오류'));
    }
  });

  // 상품(정사각)
  fileProd?.addEventListener('change', async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      say('상품 썸네일 업로드 중…');
      const url = await uploadToCloudinary(f);
      const thumb = withTransform(url, TH.square);
      prevProd.src=thumb; prevProd.dataset.cover=url; prevProd.dataset.thumb=thumb;
      say('업로드 완료', true);
    }catch(err){
      prevProd.removeAttribute('src'); delete prevProd.dataset.cover; delete prevProd.dataset.thumb;
      say('업로드 실패: '+(err.message||'오류'));
    }
  });

  // 협의 스위치
  negEl?.addEventListener('change', ()=>{
    if(negEl.checked){ payEl.value=''; payEl.disabled = true; } else { payEl.disabled = false; }
  });

  // 네이티브 date/time 오픈
  document.addEventListener('click', (e)=>{
    const b=e.target.closest('[data-open]'); if(!b) return;
    const [, id] = String(b.dataset.open).split(':'); const t=$id(id); if(!t) return;
    e.preventDefault(); t.showPicker ? t.showPicker() : t.focus();
  });

  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();

    // 기본 검증
    const brandName = (brandNameEl?.value||'').trim();
    const titleRaw  = (titleEl?.value||'').trim();
    if(!brandName) return say('브랜드명을 입력해주세요.');
    if(!titleRaw)  return say('제목을 입력해주세요.');
    if(!categoryEl.value) return say('카테고리를 선택해주세요.');
    if(!shootDate.value)  return say('촬영일을 선택해주세요.');
    if(!deadline.value)   return say('공고 마감일을 선택해주세요.');
    if(!shootHours.value) return say('촬영 시간을 입력해주세요.');
    if(!startTime.value || !endTime.value) return say('시작/종료 시간을 입력해주세요.');

    // 말머리 적용
    const prefix = (prefixEl?.value||'').trim();
    let title = titleRaw;
    if(prefix && !/^\[.+\]/.test(titleRaw)) title = `[${prefix}] ${titleRaw}`;

    // 출연료
    let feeNum;
    if(!negEl.checked){
      const n = Number(String(payEl.value||'').replace(/,/g,'').trim());
      if(!Number.isFinite(n) || n<0) return say('출연료는 숫자로 입력해주세요.');
      feeNum = n;
    }

    // 대표 이미지
    const coverImageUrl = prevMain?.dataset?.cover || '';
    const thumbnailUrl  = prevMain?.dataset?.thumb  || (coverImageUrl?withTransform(coverImageUrl,TH.card169):'');

    // 쇼핑라이브/상품 입력값
    const liveLink = ($id('liveLink')?.value||'').trim();
    const liveCoverUrl = prevLive?.dataset?.cover || '';
    const productName  = ($id('productName')?.value||'').trim();
    const productLink  = ($id('productLink')?.value||'').trim();
    const productThumb = prevProd?.dataset?.cover || '';

    // products 배열 구성 (스키마 호환)
    const products = [];
    if (liveLink || liveCoverUrl){
      products.push({
        url: liveLink || '',
        marketplace: 'etc',
        title: '쇼핑라이브',
        imageUrl: liveCoverUrl || '',
        detailHtml: 'type=live' // 용도 표기
      });
    }
    if (productName || productLink || productThumb){
      products.push({
        url: productLink || '',
        marketplace: 'smartstore',
        title: productName || '',
        imageUrl: productThumb || '',
        detailHtml: 'type=product'
      });
    }

    const payload = {
      type:'recruit',
      status:'published',
      title,
      category: categoryEl.value,
      brandName,
      closeAt: `${deadline.value}T23:59:59.000Z`,
      ...(coverImageUrl?{coverImageUrl}:{}),
      ...(thumbnailUrl ?{thumbnailUrl }:{}),
      descriptionHTML: (contentEl?.value||'').trim(),

      // 카드 요약
      ...(feeNum!==undefined ? { fee: feeNum } : {}),
      feeNegotiable: !!negEl.checked,

      // 상세
      recruit: {
        recruitType: 'product',
        brandName,
        location: (locationEl.value||'').trim(),
        shootDate: new Date(`${shootDate.value}T00:00:00.000Z`),
        shootTime: `${startTime.value}~${endTime.value}`,
        durationHours: Number(shootHours.value),
        pay: feeNum,
        payNegotiable: !!negEl.checked,
        requirements: (contentEl?.value||'').trim()
      },

      // 신규: 쇼핑라이브/상품 (Campaign.products 스키마)
      ...(products.length ? { products } : {})
    };

    try{
      say('등록 중…');
      const r = await fetch(`${API_BASE}/recruit-test`, { method:'POST', headers:headers(true), body:JSON.stringify(payload) });
      const j = await r.json().catch(()=>({}));
      if(!r.ok || j.ok===false) throw new Error(j.message || `등록 실패 (${r.status})`);
      alert('공고가 등록되었습니다.');
      location.href = 'recruit-board.html';
    }catch(err){ say(err.message||'네트워크 오류'); }
  });
})();