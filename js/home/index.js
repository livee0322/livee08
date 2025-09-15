<!-- /home/index.js — v3.0.1 (stable) -->
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, appendStyleOnce } = util;
  const { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts } = fetchers;
  const {
    tplLineupList, tplRecruitHScroll, tplNewsList,
    tplPortfolios, tplHotClips, tplCtaBanner, sectionBlock
  } = tpl;

  /* ---------- Hero (배경 이미지 2장 슬라이드 없이 고정) ---------- */
  function renderHero(el){
    if(!el) return;
    // 요구: 루트 /banner1.jpg / banner2.jpg 슬라이딩 → 우선 1장 고정 (추후 슬라이더 교체)
    const base = (H?.CFG?.BASE_PATH || '');
    const src = base ? (base.replace(/\/$/, '') + '/banner1.jpg') : 'banner1.jpg';
    appendStyleOnce('hero-fix-css', `
      .hero-card{position:relative;min-height:200px;border-radius:16px;overflow:hidden;background:#eaf2ff}
      .hero-media{position:absolute;inset:0;background-size:cover;background-position:center}
      @media (min-width:992px){ .hero-card{min-height:260px} }
    `);
    el.innerHTML = '<article class="hero-card"><div class="hero-media"></div></article>';
    const media = el.querySelector('.hero-media');
    if (media) media.style.backgroundImage = 'url("' + src + '")';
  }

  /* ---------- HOT clip 아래 이미지 배너 ---------- */
  function bannerHTML(){
    if (H.tpl && typeof H.tpl.tplImageBanner === 'function') {
      return H.tpl.tplImageBanner(); // ad_banner.jpg 사용
    }
    // fallback (거의 사용되지 않음)
    const base = (H?.CFG?.BASE_PATH || '');
    const img = base ? (base.replace(/\/$/, '') + '/ad_banner.jpg') : 'ad_banner.jpg';
    return '<a class="img-banner" href="byhen.html" aria-label="BYHEN 안내 배너">'+
             '<img src="'+img+'" alt="BYHEN 배너">'+
           '</a>';
  }

  /* ---------- Render ---------- */
  async function render(){
    const root = $('#home') || document.querySelector('main#home') || document.body;
    const heroRoot = $('#hero') || document.querySelector('[data-hero]');
    try{
      const [recruits, portfolios, shorts] = await Promise.all([
        fetchRecruits(), fetchPortfolios(), fetchShorts()
      ]);
      const news = await fetchNews(recruits);

      renderHero(heroRoot);

      const html =
        sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
        sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
        sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
        sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
        sectionBlock('<span class="hl-hot">HOT</span> clip','shorts.html', tplHotClips(shorts),'hotclips')+
        ('<div class="section">'+ bannerHTML() +'</div>')+
        '<div class="section">'+tplCtaBanner+'</div>';

      root.innerHTML = html;

      // HOT clips player bind
      hotclips.bindHotShorts();

      // 지원하기 버튼 바인딩: 브랜드 pick(=recruits)
      const recruitsSec = root.querySelector('[data-sec="recruits"]') || root;
      apply.bindApply(recruitsSec);
    }catch(err){
      console.error('[home render error]', err);
      root.innerHTML =
        '<div class="section"><div class="ed-grid">'+
          '<article class="card-ed"><div class="card-ed__body">'+
            '<div class="card-ed__title">데이터를 불러오지 못했습니다</div>'+
            '<div class="card-ed__meta">잠시 후 새로고침해주세요</div>'+
          '</div></article>'+
        '</div></div>';
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', render, { once:true });
  } else {
    render();
  }
})(window);