/* 3장의 배너를 좌우 살짝 보이게, 스크롤-스냅 + 오토롤링 */
(() => {
  const el = document.getElementById('banner');
  if (!el) return;

  const cards = [
    { title:'라이브 캠페인 등록', sub:'지금 바로 공고를 올려보세요', img:'https://picsum.photos/seed/livee1/256/256', href:'recruit-new.html' },
    { title:'인플루언서 포트폴리오', sub:'나와 맞는 쇼호스트 찾기', img:'https://picsum.photos/seed/livee2/256/256', href:'#/portfolios' },
    { title:'베타 피드백 모집', sub:'의견을 보내주세요', img:'https://picsum.photos/seed/livee3/256/256', href:'#/feedback' },
  ];

  el.innerHTML = cards.map(c=>`
    <a class="banner-card" href="${c.href}">
      <img class="cover" src="${c.img}" alt="" />
      <div>
        <div class="title">${c.title}</div>
        <div class="sub">${c.sub}</div>
      </div>
    </a>
  `).join('');

  // 네비(스크롤)
  const wrap = el.parentElement;
  const prev = wrap.querySelector('.prev');
  const next = wrap.querySelector('.next');
  const step = () => el.scrollBy({left: el.clientWidth*0.86, behavior:'smooth'});
  const back = () => el.scrollBy({left: -el.clientWidth*0.86, behavior:'smooth'});
  next?.addEventListener('click', step);
  prev?.addEventListener('click', back);

  // 오토롤링
  let timer = setInterval(step, 3500);
  wrap.addEventListener('pointerenter', ()=>clearInterval(timer));
  wrap.addEventListener('pointerleave', ()=>timer=setInterval(step, 3500));
})();