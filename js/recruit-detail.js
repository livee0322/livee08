/* ===== recruit-detail.js (잡코리아 풍 상세) ===== */
(function () {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');

  // ---------- Util ----------
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  const money = (n) => (n || 0).toLocaleString();
  const fmtDate = (d) => {
    if(!d) return '-';
    const t = new Date(d);
    if(isNaN(t)) return '-';
    const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'), da=String(t.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  };
  const ddayByShoot = (shootDate) => {
    if (!shootDate) return '';
    const t = new Date(shootDate); t.setHours(0,0,0,0);
    const n = new Date();         n.setHours(0,0,0,0);
    const d = Math.ceil((t - n) / 86400000);
    return d > 0 ? `D-${d}` : (d === 0 ? 'D-DAY' : '마감');
  };
  const statusInfo = (status, dd) => {
    if (status === 'scheduled') return { text:'예정', cls:'is-scheduled' };
    if (status === 'closed' || dd === '마감') return { text:'마감', cls:'is-closed' };
    return { text:'모집중', cls:'is-open' };
  };
  const getParam = (k) => new URL(location.href).searchParams.get(k);

  // products에서 '상품'을 뽑아내기(라이브/기타 제외 우선)
  function normalizeProducts(data){
    const arr = Array.isArray(data.products) ? data.products : [];
    // 우선: marketplace 존재 && etc가 아닌 것 / 제목이 '쇼핑라이브'가 아닌 것
    let prods = arr.filter(p => (p && ((p.marketplace && p.marketplace !== 'etc') || (p.title && p.title !== '쇼핑라이브'))));
    if (!prods.length) {
      // 없으면 라우터 보조 필드라도 1개 만든다
      const t = data.firstProductTitle || '';
      const img = data.firstProductImage || '';
      if (t || img) prods = [{ title: t, imageUrl: img, url: '', marketplace:'etc' }];
    }
    return prods;
  }

  // ---------- Renderers ----------
  function renderHero(data){
    const cover = data.verticalCoverUrl || data.coverImageUrl || data.thumbnailUrl || 'default.jpg';
    const dd = ddayByShoot(data.recruit?.shootDate || data.shootDate);
    const st = statusInfo(data.status, dd);
    $('#rdCover').src = cover;
    $('#rdCover').alt = data.title || '커버';
    const statEl = $('#rdStat'); statEl.textContent = st.text; statEl.classList.add(st.cls);
    const ddEl = $('#rdDday'); ddEl.textContent = dd || ''; ddEl.hidden = !dd;
  }
  function renderHeader(data){
    $('#rdBrand').textContent = data.brandName || '브랜드';
    $('#rdTitle').textContent = data.title || '';
    $('#rdFee').textContent = data.feeNegotiable ? '출연료 협의' :
      (data.fee != null ? `출연료 ${money(data.fee)}원` : '출연료 미정');
    document.title = (data.title || '공고 상세') + ' - 라이비';
  }
  function renderSpec(data){
    $('#specShootDate').textContent = fmtDate(data.recruit?.shootDate || data.shootDate);
    $('#specShootTime').textContent = data.recruit?.shootTime || data.shootTime || '-';
    const loc = data.recruit?.location || data.location || '-';
    $('#specLocation').textContent = loc;
    $('#specCloseAt').textContent = fmtDate(data.closeAt);
    $('#specCategory').textContent = data.category || '-';

    const dd = ddayByShoot(data.recruit?.shootDate || data.shootDate);
    const st = statusInfo(data.status, dd);
    $('#specStatus').textContent = st.text;

    const liveLink = data.liveLink || '';
    const liveBtn = $('#liveLinkBtn');
    if(liveLink){
      liveBtn.hidden = false;
      liveBtn.href = liveLink;
    }else{
      liveBtn.hidden = true;
    }
  }
  function renderProducts(data){
    const list = $('#rdProdList');
    const empty = $('#rdProdEmpty');
    list.innerHTML = '';

    const prods = normalizeProducts(data);
    if(!prods.length){
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    prods.forEach(p=>{
      const a = document.createElement('a');
      a.className = 'rd-prod';
      a.href = p.url || '#';
      if(!p.url) a.removeAttribute('href');
      a.target = p.url ? '_blank' : '';
      a.rel = p.url ? 'noopener' : '';

      a.innerHTML = `
        <img class="rd-prod-thumb" src="${p.imageUrl || 'default.jpg'}" alt="${p.title || '상품'}" loading="lazy" decoding="async" />
        <div class="rd-prod-name">${p.title || ''}</div>
      `;
      list.appendChild(a);
    });
  }
  function renderDesc(data){
    const el = $('#rdDesc');
    el.innerHTML = data.descriptionHTML || '<div style="color:#6b7280">등록된 상세 설명이 없습니다.</div>';
  }
  function renderCTA(data){
    const dd = ddayByShoot(data.recruit?.shootDate || data.shootDate);
    const st = statusInfo(data.status, dd);
    $('#ctaFee').textContent = data.feeNegotiable ? '출연료 협의' :
      (data.fee != null ? `출연료 ${money(data.fee)}원` : '출연료 미정');
    $('#ctaMeta').textContent = `${data.brandName || ''} · ${dd || st.text}`;

    const applyBtn = $('#applyBtn');
    const closed = (st.text === '마감');
    if(closed){
      applyBtn.textContent = '지원 마감';
      applyBtn.setAttribute('disabled','true');
      applyBtn.removeAttribute('href');
    }else{
      // 지원 페이지로 이동 시 현재 id 전달
      const id = getParam('id') || data.id;
      applyBtn.href = `recruit-apply.html?id=${encodeURIComponent(id)}`;
    }
  }

  // 공유/북마크(간단 버전)
  function bindActions(data){
    $('#shareBtn')?.addEventListener('click', async ()=>{
      const shareData = {
        title: data.title || '공고 상세',
        text: `${data.brandName || ''} · ${data.title || ''}`,
        url: location.href
      };
      try{
        if(navigator.share){ await navigator.share(shareData); }
        else{
          await navigator.clipboard.writeText(location.href);
          alert('링크가 복사되었습니다.');
        }
      }catch(_){}
    });
  }

  // ---------- Fetch & boot ----------
  async function fetchRecruit(id){
    const headers = {};
    const tok=localStorage.getItem('livee_token')||localStorage.getItem('liveeToken');
    if(tok) headers.Authorization=`Bearer ${tok}`;
    const r = await fetch(`${API_BASE}/recruit-test/${encodeURIComponent(id)}`, { headers });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw new Error(j.message || `로드 실패(${r.status})`);
    return j.data || j;
  }

  async function boot(){
    const id = getParam('id');
    if(!id){ alert('잘못된 접근입니다.'); history.back(); return; }
    try{
      const data = await fetchRecruit(id);
      renderHero(data);
      renderHeader(data);
      renderSpec(data);
      renderProducts(data);
      renderDesc(data);
      renderCTA(data);
      bindActions(data);
    }catch(err){
      alert(err.message || '공고를 불러오지 못했습니다.');
    }
  }

  boot();
})();