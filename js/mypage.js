/* myrecruit.js — v1.2
   - 서버 응답을 우선 확인(403/401일 때만 가드 노출)
   - 브랜드/관리자 역할 판별은 대소문자 무시 + roles/role 모두 지원
*/
(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const TOKEN = localStorage.getItem('livee_token') || localStorage.getItem('liveeToken') || '';

  // UI 장착
  try {
    window.LIVEE_UI?.mountHeader?.({
      title: '내 모집공고',
      left: [{ id:'back', icon:'ri-arrow-left-line', href:'mypage.html' }],
      right:[{ id:'new',  icon:'ri-add-line', href:'recruit-new.html' }]
    });
    window.LIVEE_UI?.mountTabbar?.({ active: 'mypage' });
  } catch(_) {}

  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  $('#loginBtn').href = `login.html?returnTo=${here}`;

  // 역할 헬퍼
  function rolesOf(me){
    if (!me) return [];
    const a = Array.isArray(me.roles) ? me.roles : (me.role ? [me.role] : []);
    return a.map(x => String(x||'').toLowerCase());
  }
  function isBrandLike(me){
    const r = rolesOf(me);
    return r.includes('brand') || r.includes('admin');
  }

  async function fetchMe(){
    if(!TOKEN) return null;
    const h = { 'Authorization':'Bearer '+TOKEN, 'Accept':'application/json' };
    for (const p of ['/users/me','/auth/me','/me']) {
      try {
        const r = await fetch(API_BASE+p, { headers:h });
        const j = await r.json().catch(()=>null);
        if (r.ok && j) return j.data || j.user || j;
      } catch(_){}
    }
    return null;
  }

  async function getJSON(url, opt={}){
    const h = { 'Accept':'application/json', ...(TOKEN?{Authorization:'Bearer '+TOKEN}:{}) };
    const r = await fetch(url, { headers:h, ...opt });
    if (r.status === 401 || r.status === 403) return { _forbidden:true, status:r.status };
    const j = await r.json().catch(()=>({}));
    return { ok:r.ok, status:r.status, data:j };
  }

  // 서버 스키마 → 카드 모델
  const money = n => (n==null||isNaN(n)) ? '' : Number(n).toLocaleString('ko-KR');
  const fmtDate = iso => {
    if (!iso) return '미정';
    const d = new Date(iso); if (isNaN(d)) return '미정';
    const p = s => String(s).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  };
  const pickThumb = o =>
    o?.thumbnailUrl || o?.coverImageUrl || o?.imageUrl || CFG.placeholderThumb || 'default.jpg';

  function mapItem(c){
    return {
      id: c.id || c._id,
      title: c.title || '(제목 없음)',
      thumb: pickThumb(c),
      closeAt: c.closeAt,
      // fee/pay 호환 처리
      fee: c.fee ?? c.recruit?.pay ?? c.pay,
      feeNegotiable: (c.feeNegotiable ?? c.recruit?.payNegotiable ?? c.payNegotiable) ? true : false,
      brandName: c.brandName || c.brand || ''
    };
  }

  function cardHTML(it){
    const feeTxt = it.feeNegotiable ? '협의' : (it.fee!=null ? `${money(it.fee)}원` : '출연료 미정');
    return `
      <article class="card" onclick="location.href='recruit-detail.html?id=${encodeURIComponent(it.id)}'">
        <img class="thumb" src="${it.thumb}" alt="" loading="lazy" decoding="async">
        <div style="flex:1">
          <div class="row">
            <div class="meta">브랜드</div>
            <button class="btn-ghost" onclick="event.stopPropagation();location.href='applications-brand.html?rid=${encodeURIComponent(it.id)}'">
              지원자 현황
            </button>
          </div>
          <div class="title">${it.title}</div>
          <div class="meta">마감 ${fmtDate(it.closeAt)} · ${feeTxt}</div>
        </div>
      </article>`;
  }

  function renderList(items){
    const list = $('#list');
    if (!items.length){
      $('#empty').style.display='block';
      list.innerHTML = '';
      return;
    }
    $('#empty').style.display='none';
    list.innerHTML = items.map(cardHTML).join('');
  }

  // 상태 필터
  let CURRENT = 'all';
  $('#chips')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    document.querySelectorAll('.chip').forEach(x=>x.classList.remove('is-active'));
    b.classList.add('is-active');
    CURRENT = b.dataset.status || 'all';
    load(); // 다시 로드
  });

  async function load(){
    // 1) 우선 me 로컬 판별(UX 빠르게) — 실패해도 서버 응답으로 최종 판단
    const me = await fetchMe();

    // 2) 서버 호출 (mine 개념이 없으면 전체 받아서 클라 필터)
    const qs = new URLSearchParams();
    if (CURRENT !== 'all') qs.set('status', CURRENT);
    // NOTE: 서버가 mine 필터를 지원하지 않으므로 전체 조회 후 createdBy가 없을 수 있으니
    // 일단 전체를 받아 사용자 브랜드 권한만 확인해서 화면 제공
    const url = `${API_BASE}/recruit-test?${qs.toString()}`;

    const { _forbidden, ok, status, data } = await getJSON(url);
    if (_forbidden){
      // 토큰은 있으나 권한 거부 (브랜드가 아님/권한 만료 등)
      $('#guard').style.display='block';
      $('#empty').style.display='none';
      $('#list').innerHTML = '';
      return;
    }

    // me가 없고 토큰도 없으면 로그인 유도
    if (!TOKEN){
      $('#guard').style.display='block';
      return;
    }

    // me가 있는데 브랜드가 아니어도 서버가 허용했으면 그냥 보여줌
    // (오탐 방지, 최종 권한은 서버가 판단)
    const rows = (Array.isArray(data?.items) ? data.items : (data?.data?.items || []))
      .map(mapItem);
    renderList(rows);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', load, { once:true });
  } else { load(); }
})();