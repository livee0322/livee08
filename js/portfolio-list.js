/* portfolio-list.js — v1.2.0
   - 카드 전체 클릭: “카드를 누르면 상세 프로필을 보실 수 있어요.” 안내
   - ‘프로필 상세보기’ 텍스트 제거(오른쪽 화살표만)
   - 공개 필드(agePublic, genderPublic, heightPublic, sizePublic 등) 뱃지 가로 스크롤
   - 데이터 있으면 empty 숨김
*/
(() => {
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const CFG = window.LIVEE_CONFIG || {};
  const API = (CFG.API_BASE || '/api/v1').replace(/\/$/, '');
  const EP  = (CFG.endpoints && CFG.endpoints.portfolios) || '/portfolio-test?status=published&limit=24';
  const EPB = (CFG.endpoints && CFG.endpoints.portfolioBase) || '/portfolio-test';

  const fmtAge    = (n) => (n ? `${n}세` : '');
  const fmtGender = (g) => g==='female'?'여성': g==='male'?'남성' : (g ? '기타' : '');
  const fmtHeight = (h) => (h ? `${h}cm` : '');
  const fmtSize   = (t,b,s) => {
    const parts = [];
    if (t) parts.push(`상의 ${t}`);
    if (b) parts.push(`하의 ${b}`);
    if (s) parts.push(`신발 ${s}`);
    return parts.join(' · ');
  };

  function badgeRow(d) {
    const bs = [];
    if (d.agePublic && d.age) bs.push(fmtAge(d.age));
    if (d.demographics?.genderPublic && d.demographics?.gender) bs.push(fmtGender(d.demographics.gender));
    if (d.demographics?.heightPublic && d.demographics?.height) bs.push(fmtHeight(d.demographics.height));
    if (d.demographics?.sizePublic && (d.demographics.sizeTop || d.demographics.sizeBottom || d.demographics.shoe)) {
      bs.push(fmtSize(d.demographics.sizeTop, d.demographics.sizeBottom, d.demographics.shoe));
    }
    if (d.regionPublic && d.region?.city) bs.push(d.region.city + (d.region.area ? ' ' + d.region.area : ''));
    if (!bs.length) return '';
    return `<div class="pl-badges">${bs.map(b=>`<span class="pl-badge">${b}</span>`).join('')}</div>`;
  }

  function thumbUrl(d) {
    return d.mainThumbnailUrl || d.mainThumbnail || d.coverImageUrl || d.coverImage || d.subThumbnails?.[0] || d.subImages?.[0] || '';
  }

  function card(d) {
    const id   = d.id || d._id;
    const name = d.nickname || d.displayName || d.name || '포트폴리오';
    const sub  = d.headline || d.bio || '';
    const img  = thumbUrl(d);

    return `
      <article class="pl-card" data-id="${id}" role="button" aria-label="${name} 상세 보기">
        <div class="pl-thumb">
          ${img ? `<img alt="" src="${img}">` : ''}
        </div>
        <div class="pl-body">
          <div class="pl-name">${name}</div>
          <div class="pl-sub">${sub}</div>
          ${badgeRow(d)}
        </div>
        <i class="ri-arrow-right-s-line pl-arrow" aria-hidden="true"></i>
        <div class="pl-hint">카드를 누르면 상세 프로필을 보실 수 있어요.</div>
      </article>`;
  }

  async function load() {
    try {
      const r = await fetch(`${API}${EP}`);
      const j = await r.json().catch(()=>({}));
      const items = j.items || j.data || j.docs || [];
      $('#plGrid').innerHTML = items.map(card).join('');
      // 데이터가 있으면 empty 숨김
      const has = items.length > 0;
      $('#plEmpty')?.toggleAttribute('hidden', has);
      // 카드 클릭 이동
      $('#plGrid')?.addEventListener('click', (e)=>{
        const a = e.target.closest('.pl-card'); if (!a) return;
        const id = a.dataset.id;
        location.href = `portfolio.html?id=${encodeURIComponent(id)}`;
      }, { once: true });
    } catch (e) {
      console.warn('[portfolio load]', e);
      UI?.toast?.('목록을 불러오지 못했습니다');
    }
  }

  // 컨트롤(검색/정렬) UI만 통일 — 실제 검색/정렬 로직은 추후 서버 파라미터 적용
  $('#plSearch')?.setAttribute('placeholder','검색');
  load();
})();