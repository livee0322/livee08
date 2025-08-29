// js/home.js
(() => {
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = CFG.API_BASE?.replace(/\/+$/,'') || '';
  const token = localStorage.getItem('liveeToken') || '';
  const KST = 'Asia/Seoul';

  const $ = (s, p=document) => p.querySelector(s);

  // ---------- Header / Top / Bottom 최소 렌더 ----------
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
        ${ (CFG.ui?.tabs||[]).map((t,i)=>`<button class="lv-tab ${i===0?'active':''}" type="button">${t}</button>`).join('') }
      </div>
    `;

    const bottom = $('#bottom-tab-container');
    if (bottom) bottom.innerHTML = `
      <div class="lv-bottom-in">
        <a class="lv-bn ${location.pathname.endsWith('index.html')||location.pathname==='/'?'active':''}" href="./index.html"><i class="ri-home-5-line"></i><span>홈</span></a>
        <a class="lv-bn" href="./recruit-new.html"><i class="ri-flag-2-line"></i><span>캠페인</span></a>
        <a class="lv-bn" href="#"><i class="ri-folder-user-line"></i><span>포트폴리오</span></a>
        <a class="lv-bn" href="#"><i class="ri-team-line"></i><span>인플루언서</span></a>
        <a class="lv-bn" href="./login.html"><i class="ri-user-line"></i><span>로그인</span></a>
      </div>
    `;
  })();

  // ---------- fetch helper ----------
  async function getJson(path, params) {
    const url = new URL(API_BASE + path);
    if (params && typeof params === 'object'){
      Object.entries(params).forEach(([k,v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type':'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    const json = await res.json().catch(()=> ({}));
    const ok = res.ok && json.ok !== false;
    const items = (
      (Array.isArray(json) && json) ||
      json.items || json.data?.items ||
      json.docs  || json.data?.docs  ||
      json.result|| json.data?.result||
      json.rows  || []
    );
    return { ok, items: Array.isArray(items) ? items : [], json, status: res.status };
  }

  // ---------- utils ----------
  const fmtPrice = (n) => {
    const num = typeof n === 'number' ? n : parseFloat(String(n||'').replace(/[^\d.-]/g,''));
    return isNaN(num) ? '' : num.toLocaleString('ko-KR') + '원';
  };
  const toDate = (v) => v ? new Date(v) : null;
  const timeKST = (v) => {
    const d = toDate(v); if (!d) return '';
    return new Intl.DateTimeFormat('ko-KR',{ timeStyle:'short', timeZone:KST }).format(d);
  };
  const dateKST = (v) => {
    const d = toDate(v); if (!d) return '';
    return new Intl.DateTimeFormat('ko-KR',{ dateStyle:'medium', timeZone:KST }).format(d);
  };
  const todayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth()+1).padStart(2,'0');
    const d = String(now.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };

  // Cloudinary 변환 붙이기
  function cx(url, transform = CFG.thumb?.card169){
    if (!url) return '';
    try {
      const u = new URL(url);
      if (!u.hostname.includes('cloudinary')) return url;
      // /image/upload/ 다음에 트랜스폼 삽입
      u.pathname = u.pathname.replace(/\/image\/upload\/([^/]+)/, (_,$1)=>`/image/upload/${transform}/${$1}`);
      if (!/\/image\/upload\//.test(u.pathname)) {
        u.pathname = u.pathname.replace('/image/upload', `/image/upload/${transform}`);
      }
      return u.toString();
    } catch { return url; }
  }

  const ph = (seed, w=640, h=360) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

  // ---------- Normalizers (백엔드 포맷 다양성 흡수) ----------
  const N = {
    schedule(it){
      return {
        id: it._id || it.id || cryptoRandom(),
        title: it.title || it.name || it.liveTitle || '라이브 방송',
        brand: it.brand?.name || it.brandName || it.channel || '',
        startAt: it.startAt || it.startTime || it.scheduledAt || it.date || '',
        cover: it.thumbnailUrl || it.imageUrl || it.coverImageUrl || ''
      };
    },
    product(it){
      return {
        id: it._id || it.id || cryptoRandom(),
        brand: it.brand?.name || it.brandName || it.seller || '브랜드',
        name: it.name || it.title || '상품',
        price: it.price ?? it.salePrice ?? it.finalPrice ?? '',
        image: it.thumbnailUrl || it.imageUrl || it.coverImageUrl || ''
      };
    },
    recruit(it){
      return {
        id: it._id || it.id || cryptoRandom(),
        title: it.title || it.name || '공고',
        desc: it.desc || it.description || it.brief || '',
        date: it.scheduledAt || it.date || it.deadline || '',
        pay: it.pay || it.reward || it.compensation || '',
        image: it.thumbnailUrl || it.imageUrl || it.coverImageUrl || ''
      };
    }
  };

  function cryptoRandom() {
    try { return crypto.randomUUID(); } catch { return 'id_'+Math.random().toString(36).slice(2); }
  }

  // ---------- Renderers ----------
  async function renderSchedule(){
    const box = $('#schedule');
    if (!box) return;

    const ep = CFG.endpoints?.schedule || '/schedules?date={DATE}&limit=6';
    const path = ep.replace('{DATE}', todayStr());
    const { ok, items } = await getJson(path);

    if (!ok || !items.length) {
      box.innerHTML = `<div class="lv-empty">오늘 예정된 라이브가 없습니다.</div>`;
      return;
    }

    box.innerHTML = items.map((raw,i)=>{
      const it = N.schedule(raw);
      const img = it.cover ? cx(it.cover) : ph(`live-${it.id}-${i}`);
      return `
        <article class="lv-live">
          <div class="lv-live-thumb" style="background-image:url('${img}')"></div>
          <div class="lv-live-meta">
            <div class="lv-live-time">${timeKST(it.startAt)}</div>
            <div class="lv-live-title">${escapeHtml(it.title)}</div>
            <div class="lv-live-brand">${escapeHtml(it.brand || '')}</div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function renderProducts(){
    const box = $('#productGrid');
    if (!box) return;

    const ep = CFG.endpoints?.products || '/products?limit=6';
    const { ok, items } = await getJson(ep);

    if (!ok || !items.length) {
      box.innerHTML = `<div class="lv-empty">등록된 라이브 상품이 없습니다.</div>`;
      return;
    }

    box.innerHTML = items.map((raw,i)=>{
      const it = N.product(raw);
      const img = it.image ? cx(it.image) : ph(`prod-${it.id}-${i}`);
      const price = it.price !== '' ? fmtPrice(it.price) : '';
      return `
        <article class="lv-card">
          <div class="lv-card-thumb" style="background-image:url('${img}')"></div>
          <div class="lv-card-body">
            <div class="lv-card-brand">${escapeHtml(it.brand)}</div>
            <div class="lv-card-name">${escapeHtml(it.name)}</div>
            ${price ? `<div class="lv-card-price">${price}</div>`:''}
          </div>
        </article>
      `;
    }).join('');
  }

  async function renderRecruits(){
    const box = $('#recruits');
    if (!box) return;

    const ep = CFG.endpoints?.recruits || '/recruits?limit=6&status=open';
    const { ok, items } = await getJson(ep);

    if (!ok || !items.length) {
      box.innerHTML = `<div class="lv-empty">등록된 공고가 없습니다.</div>`;
      return;
    }

    box.innerHTML = items.map((raw,i)=>{
      const it = N.recruit(raw);
      const date = it.date ? dateKST(it.date) : '';
      const img = it.image ? cx(it.image) : ph(`rec-${it.id}-${i}`, 480, 270);
      return `
        <a class="lv-job" href="./recruit-detail.html?id=${encodeURIComponent(it.id)}">
          <div class="lv-job-thumb" style="background-image:url('${img}')"></div>
          <div class="lv-job-meta">
            <div class="lv-job-title">${escapeHtml(it.title)}</div>
            <div class="lv-job-desc">${escapeHtml(it.desc||'')}</div>
            <div class="lv-job-foot">
              ${it.pay ? `<span class="lv-job-pay">${escapeHtml(it.pay)}</span>`:''}
              ${date ? `<span class="lv-job-date">${date}</span>`:''}
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  function escapeHtml(s){
    return String(s||'')
      .replaceAll('&','&amp;').replaceAll('<','&lt;')
      .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      renderSchedule(),
      renderProducts(),
      renderRecruits()
    ]);
  });
})();