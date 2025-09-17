<!-- js/home/index.js -->
/* home/index.js — glue: hero + sections + binds (v2.14 with Models block) */
(function (w) {
  'use strict';
  const H = w.LIVEE_HOME;
  const { util, fetchers, tpl, hotclips, apply } = H;
  const { $, on } = util;
  const { fetchRecruits, fetchPortfolios, fetchNews, fetchShorts, fetchModels } = fetchers;
  const {
    tplHeroSlider, tplLineupList, tplRecruitHScroll, tplNewsList,
    tplPortfolios, tplHotClips, tplCtaBanner, tplImageBanner, sectionBlock
  } = tpl;

  /* Hero */
  function renderHero(root){
    if(!root) return;
    root.innerHTML = tplHeroSlider();
    const track = root.querySelector('.hero-track');
    const dots  = [...root.querySelectorAll('.hero-dot')];
    let idx = 0, total = dots.length || 1;
    const go = (i) => {
      idx = (i + total) % total;
      track.style.transform = `translateX(-${idx*100}%)`;
      dots.forEach((d,k)=>d.classList.toggle('is-on',k===idx));
    };
    let tm = setInterval(()=>go(idx+1), 4000);
    on(root, 'touchstart', ()=>{ clearInterval(tm); tm=null; }, {passive:true});
    dots.forEach((d,i)=> on(d,'click',()=>go(i)));
  }

  /* 모델 섹션 템플릿: 2.5 칼럼 가로 스크롤 */
  function tplModelCardsHScroll(models){
    if (!models || !models.length) {
      return `<div class="hscroll models-h">
        <article class="mdl-card" aria-disabled="true">
          <div class="mdl-thumb" style="background:#f3f4f6"></div>
          <div class="mdl-body">
            <div class="mdl-name">모델이 없습니다</div>
            <div class="mdl-intro">첫 모델 프로필을 등록해보세요</div>
          </div>
        </article>
      </div>`;
    }
    return `<div class="hscroll models-h">
      ${models.map(m => `
        <article class="mdl-card" onclick="location.href='models.html#/${encodeURIComponent(m.id || m._id || '')}'">
          <img class="mdl-thumb" src="${m.mainThumbnailUrl || m.coverImageUrl || m.thumb || 'default.jpg'}" alt="" loading="lazy" decoding="async">
          <div class="mdl-body">
            <div class="mdl-name">${m.nickname || '모델'}</div>
            <div class="mdl-intro">${m.headline || ''}</div>
          </div>
        </article>`).join('')}
    </div>`;
  }

  async function render(){
    const heroRoot = document.getElementById('hero');
    renderHero(heroRoot);

    const root = document.getElementById('home');

    // 새로 추가: 모델 데이터 동시 로드
    const [recruits, portfolios, shorts, models] = await Promise.all([
      fetchRecruits(), fetchPortfolios(), fetchShorts(),
      (fetchModels ? fetchModels() : Promise.resolve([]))
    ]);
    const news = await fetchNews(recruits);

    // 홈 섹션 구성
    const html =
      sectionBlock('<span class="hl">지금 뜨는</span> 쇼핑라이브 공고','recruit-list.html', tplLineupList(recruits.slice(0,6)),'lineup')+
      sectionBlock('브랜드 <span class="hl">pick</span>','recruit-list.html', tplRecruitHScroll(recruits.slice(0,8)),'recruits')+
      sectionBlock('<span class="hl">라이비</span> 뉴스','news.html', tplNewsList(news.slice(0,8)),'news')+
      sectionBlock('<span class="hl">이런 쇼호스트</span>는 어떠세요?','portfolio-list.html', tplPortfolios(portfolios),'pf')+
      // ★ 추가된 섹션: 컨셉에 맞는 모델 찾기 (2.5 카드 보이기)
      sectionBlock('컨셉에 맞는 <span class="hl">모델 찾기</span>','models.html', tplModelCardsHScroll((models||[]).slice(0,10)),'models')+
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