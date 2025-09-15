/* home/index.js — v3.0.1 */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, on } = util;
  const { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts } = fetchers;
  const { tplHeroSlider, sectionBlock, tplLineupList, tplRecruitHScroll, tplNewsList, tplPortfolios, tplHotClips, tplCtaBanner, tplImageBanner } = tpl;

  /* ----- Hero 렌더 ----- */
  function renderHero(el){
    if(!el) return;
    el.innerHTML = tplHeroSlider();
    const slider = el.querySelector('.hero-slider');
    const cards = [...slider.querySelectorAll('.hero-card')];
    const dots  = [...slider.querySelectorAll('.dot')];
    let cur = 0;

    function go(i){
      cur = (i+cards.length)%cards.length;
      cards.forEach((c,idx)=>{ c.style.display = (idx===cur)?'block':'none'; });
      dots.forEach((d,idx)=>{ d.classList.toggle('is-active', idx===cur); });
    }
    dots.forEach(d => on(d,'click',()=>go(Number(d.dataset.idx))));
    go(0);                         // 첫 장 보이기
    setInterval(()=>go(cur+1), 5000); // 5초 자동 슬라이드
  }

  async function render(){
    const root = $('#home') || document.body;
    const heroRoot = $('#hero') || document.querySelector('[data-hero]');
    const [recruits, portfolios, shorts] = await Promise.all([fetchRecruits(), fetchPortfolios(), fetchShorts()]);
    const news = await fetchNews(recruits);

    renderHero(heroRoot);

    const html =
      sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
      sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
      sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
      sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
      sectionBlock('<span class="hl-hot">HOT</span> clip','shorts.html', tplHotClips(shorts),'hotclips')+
      ('<div class="section">'+ tplImageBanner() +'</div>')+
      '<div class="section">'+tplCtaBanner+'</div>';

    root.innerHTML = html;

    // 바인딩
    hotclips.bindHotShorts();
    const recruitsSec = root.querySelector('[data-sec="recruits"]') || root;
    apply.bindApply(recruitsSec);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else { render(); }
})(window);