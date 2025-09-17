<!-- js/home/index.js -->
/* home/index.js — glue: hero + sections + binds (v2.14.1 with Models block) */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, on } = util;

  // fetchers: fetchModels가 있는 버전과 없는 버전 모두 호환
  const {
    fetchRecruits, fetchPortfolios, fetchNews, fetchShorts, fetchModels
  } = fetchers;

  const {
    tplHeroSlider, tplLineupList, tplRecruitHScroll, tplNewsList,
    tplPortfolios, tplHotClips, tplCtaBanner, tplImageBanner, sectionBlock
  } = tpl;

  /* ---------------- Hero ---------------- */
  function renderHero(root){
    if(!root) return;
    root.innerHTML = tplHeroSlider();
    const track = root.querySelector('.hero-track');
    const dots  = Array.from(root.querySelectorAll('.hero-dot'));
    let idx = 0, total = Math.max(dots.length, 1);

    function go(i){
      idx = (i + total) % total;
      if (track) track.style.transform = `translateX(-${idx*100}%)`;
      dots.forEach((d,k)=>d.classList.toggle('is-on',k===idx));
    }

    let tm = setInterval(()=>go(idx+1), 4000);
    on(root, 'touchstart', ()=>{ if (tm){ clearInterval(tm); tm=null; } }, {passive:true});
    dots.forEach((d,i)=> on(d,'click',()=>go(i)));
  }

  /* ---- 모델(카드) : 2.5장 보이는 가로 스크롤 ---- */
  function tplModelsGrid(items){
    if (!items || !items.length) {
      return `<div class="models-hscroll">
        <article class="model-card is-empty">
          <div class="thumb"></div>
          <div class="name">모델이 없습니다</div>
          <div class="meta">첫 모델 프로필을 등록해보세요</div>
        </article>
      </div>`;
    }
    return `<div class="models-hscroll">
      ${items.map(m => `
        <article class="model-card" onclick="location.href='model-detail.html?id=${encodeURIComponent(m.id)}'">
          <div class="thumb">
            <img src="${m.thumb || 'default.jpg'}" alt="${m.nickname || '모델'}" loading="lazy" decoding="async">
          </div>
          <div class="name">${m.nickname || '모델'}</div>
          <div class="meta">${m.headline || ''}</div>
        </article>
      `).join('')}
    </div>`;
  }
  // 템플릿 네임스페이스에 노출(선택)
  H.tpl.tplModelsGrid = tplModelsGrid;

  /* ---------------- Render ---------------- */
  async function render(){
    const heroRoot = document.getElementById('hero');
    renderHero(heroRoot);

    const root = document.getElementById('home');

    // 데이터 로드 (fetchModels가 없으면 빈 배열)
    const [recruits, portfolios, shorts, models] = await Promise.all([
      fetchRecruits(), fetchPortfolios(), fetchShorts(),
      (typeof fetchModels === 'function' ? fetchModels() : Promise.resolve([]))
    ]);
    const news = await fetchNews(recruits);

    // 홈 섹션 구성
    const html =
      sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
      sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
      sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
      sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
      // ⬇︎ 모델 섹션: 2.5장 보이는 가로 카드
      sectionBlock('컨셉에 맞는 <span class="hl">모델 찾기</span>','models.html', tplModelsGrid((models||[]).slice(0,10)),'models')+
      sectionBlock('<span class="hl-hot">HOT</span> clip','shorts.html', tplHotClips(shorts),'hotclips')+
      ('<div class="section">'+ tplImageBanner() +'</div>')+
      '<div class="section">'+tplCtaBanner+'</div>';

    root.innerHTML = html;

    // 바인딩
    hotclips.bindHotShorts();
    apply.bindApply(root.querySelector('[data-sec="recruits"]') || root);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})(window);