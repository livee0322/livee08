/* home/index.js — glue: hero + render sections + binds */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, on } = util;
  const { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts } = fetchers;
  const { tplLineupList, tplRecruitHScroll, tplNewsList, tplPortfolios, tplHotClips, tplCtaBanner, sectionBlock } = tpl;

  function renderHero(el){
    if(!el) return;
    const heroSrc = (H.CFG.BASE_PATH ? (H.CFG.BASE_PATH + '/bannertest.jpg') : 'bannertest.jpg');
    el.innerHTML = '<article class="hero-card"><div class="hero-media"></div><div class="hero-body"><div class="hero-kicker">LIVEE</div><h1 class="hero-title">신제품 론칭 LIVE</h1><p class="hero-sub">브랜드와 호스트를 가장 빠르게</p></div></article>';
    const media = el.querySelector('.hero-media');
    if (media) media.style.backgroundImage = 'linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,.08)), url("' + heroSrc + '")';
    const nav = document.querySelector('.hero-nav'); if (nav) nav.style.display = 'none';
  }

  async function render(){
    const root = $('#home') || $('main#home') || $('main') || document.body;
    const heroRoot = $('#hero') || document.querySelector('[data-hero]');
    try{
      const [recruits, portfolios, shorts] = await Promise.all([fetchRecruits(), fetchPortfolios(), fetchShorts()]);
      const news = await fetchNews(recruits);

      renderHero(heroRoot);

      const html =
        sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
        sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
        sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
        sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
        sectionBlock('<span class="hl-hot">HOT</span> clip','shorts.html', tplHotClips(shorts),'hotclips')+
        '<div class="section">'+tplCtaBanner+'</div>';

      if(root){
        root.innerHTML = html;
        hotclips.bindHotShorts();
        apply.bindApply(document.getElementById('brandPickH') || root);
      }
    }catch(err){
      console.error('[home render error]', err);
      const r = $('#home') || $('main') || document.body;
      if(r){
        r.innerHTML =
          '<div class="section"><div class="ed-grid">'+
            '<article class="card-ed"><div class="card-ed__body">'+
              '<div class="card-ed__title">데이터를 불러오지 못했습니다</div>'+
              '<div class="card-ed__meta">잠시 후 새로고침해주세요</div>'+
            '</div></article>'+
          '</div></div>';
      }
    }
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', render, { once:true }); }
  else { render(); }
})(window);