/* home/index.js — glue: hero + sections + binds */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, on } = util;
  const { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts } = fetchers;
  const { tplHeroSlider, tplLineupList, tplRecruitHScroll, tplNewsList,
          tplPortfolios, tplHotClips, tplCtaBanner, tplImageBanner, sectionBlock } = tpl;

  /* Hero render */
  function renderHero(root){
    if(!root) return;
    root.innerHTML = tplHeroSlider();

    // 간단한 슬라이더(자동/도트)
    const track = root.querySelector('.hero-track');
    const dots  = [...root.querySelectorAll('.hero-dot')];
    let idx = 0, total = dots.length;
    function go(i){
      idx = (i+total)%total;
      track.style.transform = `translateX(-${idx*100}%)`;
      dots.forEach((d,k)=>d.classList.toggle('is-on',k===idx));
    }
    let tm = setInterval(()=>go(idx+1), 4000);
    on(root, 'touchstart', ()=>{ clearInterval(tm); tm=null; }, {passive:true});
    dots.forEach((d,i)=> on(d,'click',()=>go(i)));
  }

  async function render(){
    const heroRoot = document.getElementById('hero');
    renderHero(heroRoot);

    const root = document.getElementById('home');
    const [recruits, portfolios, shorts] = await Promise.all([
      fetchRecruits(), fetchPortfolios(), fetchShorts()
    ]);
    const news = await fetchNews(recruits);

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
    apply.bindApply(root.querySelector('[data-sec="recruits"]') || root);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})(window);