(() => {
  const el = document.getElementById('banner');
  if (!el) return;

  // index.html에서 관리하듯, 이 배열만 수정해서 문구 교체
  const cards = [
    { title: '베타 피드백 모집', desc: '여러분의 의견을 들려주세요.' },
    { title: '쇼호스트 지원', desc: '새로운 기회를 지금 만나보세요.' },
    { title: '브랜드 파트너스', desc: '함께 성장할 파트너를 찾습니다.' },
  ];

  function randHsl() {
    const h = Math.floor(Math.random()*360);
    return `hsl(${h} 80% 55%)`;
  }

  el.innerHTML = cards.map(c => `
    <article class="banner-card" style="background:${randHsl()}">
      <div>
        <div style="font-size:18px;font-weight:800">${c.title}</div>
        <small>${c.desc}</small>
      </div>
    </article>
  `).join('');

  // 간단한 좌우 버튼 스크롤
  const wrap = el.closest('.banner-wrap');
  wrap?.querySelector('.prev')?.addEventListener('click', ()=> el.scrollBy({left:-300,behavior:'smooth'}));
  wrap?.querySelector('.next')?.addEventListener('click', ()=> el.scrollBy({left: 300,behavior:'smooth'}));
})();