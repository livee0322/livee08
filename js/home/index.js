(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, on } = util;
  const { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts } = fetchers;
  const { tplHeroSlider, sectionBlock, tplLineupList, tplRecruitHScroll, tplNewsList, tplPortfolios, tplHotClips, tplImageBanner } = tpl;

  /* hero mount */
  function mountHero(){
    const root = $('#hero');
    if(!root) return;
    root.innerHTML = tplHeroSlider();

    // 아주 가벼운 자동 슬라이드
    const track = root.querySelector('[data-hero-slides]');
    const dots  = [...root.querySelectorAll('[data-hero-dots] .dot')];
    if(!track) return;
    let idx = 0;
    const go = (n)=>{
      idx = (n+2)%2;
      track.style.transform = `translateX(-${idx*100}%)`;
      track.style.transition = 'transform .5s ease';
      dots.forEach((d,i)=> d.classList.toggle('is-active', i===idx));
    };
    setInterval(()=>go(idx+1), 4000);
  }

  async function render(){
    const main = $('#home');
    if(!main) return;

    const [recruits, portfolios, shorts] = await Promise.all([
      fetchRecruits(), fetchPortfolios(), fetchShorts()
    ]);
    const news = await fetchNews(recruits);

    // 본문(여백 있는) 섹션들만 넣음
    main.innerHTML =
      sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
      sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
      sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
      sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
      sectionBlock('<span class="hl-hot" style="color:#ef4444">HOT</span> clip','shorts.html', tplHotClips(shorts),'hotclips')+
      `<div class="section">${tplImageBanner()}</div>`;

    // 바인딩
    hotclips.bindHotShorts();
    apply.bindApply(main.querySelector('[data-sec="recruits"]'));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ mountHero(); render(); }, {once:true});
  }else{
    mountHero(); render();
  }
})(window);