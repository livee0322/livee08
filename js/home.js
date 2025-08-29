(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '').replace(/\/+$/,'');
  const token = localStorage.getItem('liveeToken') || '';
  const $ = (s,p=document)=>p.querySelector(s);

  // ---- 크롬(헤더/탑/바텀) 최소 렌더 ----
  (function renderChrome(){
    const header = $('#header-container');
    if (header) header.innerHTML = `
      <div class="lv-h-wrap">
        <a class="lv-logo" href="./index.html">LIVEE</a>
        <div class="lv-spacer"></div>
        <button class="lv-icon" aria-label="알림"><i class="ri-notification-3-line"></i></button>
        <button class="lv-icon" aria-label="검색"><i class="ri-search-line"></i></button>
        <a class="lv-icon" href="./login.html" aria-label="로그인"><i class="ri-user-3-line"></i></a>
      </div>
    `;

    const top = $('#top-tab-container');
    if (top) top.innerHTML = `
      <div class="lv-top-in">
        ${(CFG.ui?.tabs||[]).map((t,i)=>`<button class="lv-tab ${i===0?'active':''}" type="button">${t}</button>`).join('')}
      </div>
    `;

    const bottom = $('#bottom-tab-container');
    if (bottom) bottom.innerHTML = `
      <div class="lv-bottom-in">
        <a class="lv-bn active" href="./index.html"><i class="ri-home-5-line"></i><span>홈</span></a>
        <a class="lv-bn" href="./recruit-new.html"><i class="ri-flag-2-line"></i><span>캠페인</span></a>
        <a class="lv-bn" href="#"><i class="ri-folder-user-line"></i><span>포트폴리오</span></a>
        <a class="lv-bn" href="#"><i class="ri-team-line"></i><span>인플루언서</span></a>
        <a class="lv-bn" href="./login.html"><i class="ri-user-line"></i><span>로그인</span></a>
      </div>
    `;
  })();

  // fetch helper (교체본)
async function getJson(path){
  try{
    const url = (API + path).replace(/(?<!:)\/{2,}/g,'/'); // //중복슬래시 방지
    const res = await fetch(url, { headers: { 'Content-Type':'application/json' } });
    const text = await res.text();
    let json = {}; try { json = JSON.parse(text); } catch {}
    const ok = res.ok && json.ok !== false;
    const arr = (Array.isArray(json) && json) || json.items || json.data?.items || json.docs || json.result || [];
    if (!ok) throw new Error(`${res.status} ${res.statusText} · ${json.message || text.slice(0,120)}`);
    return { ok, items: Array.isArray(arr) ? arr : [], json };
  } catch (e){
    return { ok:false, items:[], error:e.message };
  }
}
  // ---- normalizers (campaigns) ----
  const N = {
    live: it => ({
      id: it._id||it.id,
      title: it.title || '라이브 방송',
      brand: it.brand?.name || it.brandName || '',
      startAt: it.startAt || it.scheduledAt || it.date || '',
      cover: it.thumbnailUrl || it.imageUrl || it.coverImageUrl || ''
    }),
    product: it => ({
      id: it._id||it.id,
      brand: it.brand?.name || it.brandName || '브랜드',
      name: it.name || it.title || '상품',
      price: it.price ?? it.salePrice ?? it.finalPrice ?? '',
      image: it.thumbnailUrl || it.imageUrl || it.coverImageUrl || ''
    }),
    recruit: it => ({
      id: it._id||it.id,
      title: it.title || '공고',
      desc: it.desc || it.description || '',
      date: it.scheduledAt || it.deadline || it.date || '',
      pay: it.pay || it.reward || '',
      image: it.thumbnailUrl || it.imageUrl || it.coverImageUrl || ''
    }),
  };

  // ---- sections ----
  async function renderSchedule(){
    const box = $('#schedule');
    if (!box) return;
    const { ok, items } = await getJson(CFG.endpoints.schedule);
    if (!ok || !items.length){
      box.innerHTML = '<div class="lv-empty">오늘 예정된 라이브가 없습니다.</div>'; return;
    }
    box.innerHTML = items.map((raw,i)=>{
      const it = N.live(raw);
      const img = it.cover || ph(`live-${it.id}-${i}`);
      const time = it.startAt ? new Date(it.startAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}) : '';
      return `
        <article class="lv-live">
          <div class="lv-live-thumb" style="background-image:url('${img}')"></div>
          <div class="lv-live-meta">
            <div class="lv-live-time">${time}</div>
            <div class="lv-live-title">${esc(it.title)}</div>
            <div class="lv-live-brand">${esc(it.brand||'')}</div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function renderProducts(){
    const box = $('#productGrid');
    if (!box) return;
    const { ok, items } = await getJson(CFG.endpoints.products);
    if (!ok || !items.length){
      box.innerHTML = '<div class="lv-empty">등록된 라이브 상품이 없습니다.</div>'; return;
    }
    box.innerHTML = items.map((raw,i)=>{
      const it = N.product(raw);
      const img = it.image || ph(`prod-${it.id}-${i}`);
      const price = (it.price!=='' && it.price!=null) ? `${Number(it.price).toLocaleString()}원` : '';
      return `
        <article class="lv-card">
          <div class="lv-card-thumb" style="background-image:url('${img}')"></div>
          <div class="lv-card-body">
            <div class="lv-card-brand">${esc(it.brand)}</div>
            <div class="lv-card-name">${esc(it.name)}</div>
            ${price ? `<div class="lv-card-price">${price}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  async function renderRecruits(){
    const box = $('#recruits');
    if (!box) return;
    const { ok, items } = await getJson(CFG.endpoints.recruits);
    if (!ok || !items.length){
      box.innerHTML = '<div class="lv-empty">등록된 공고가 없습니다.</div>'; return;
    }
    box.innerHTML = items.map((raw,i)=>{
      const it = N.recruit(raw);
      const img = it.image || ph(`rec-${it.id}-${i}`,480,270);
      const date = it.date ? new Date(it.date).toLocaleDateString('ko-KR') : '';
      return `
        <a class="lv-job" href="./recruit-detail.html?id=${encodeURIComponent(it.id)}">
          <div class="lv-job-thumb" style="background-image:url('${img}')"></div>
          <div class="lv-job-meta">
            <div class="lv-job-title">${esc(it.title)}</div>
            <div class="lv-job-desc">${esc(it.desc||'')}</div>
            <div class="lv-job-foot">
              ${it.pay ? `<span class="lv-job-pay">${esc(it.pay)}</span>` : ''}
              ${date ? `<span class="lv-job-date">${date}</span>` : ''}
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSchedule(); renderProducts(); renderRecruits();
  });
})();