(() => {
  const wrap = document.getElementById('banner');
  if (!wrap) return;

  const data = (window.LIVEE_BANNERS && window.LIVEE_BANNERS.length)
    ? window.LIVEE_BANNERS
    : [
        { id: 1, title: '샘플 배너', desc: '데이터가 없습니다', color: '#f5f5f5' },
        { id: 2, title: '샘플 배너2', desc: 'index.html에서 관리', color: '#eef2ff' },
        { id: 3, title: '샘플 배너3', desc: '좌우 스크롤',         color: '#fff7ee' },
      ];

  wrap.innerHTML = data.map(b => `
    <article class="bannerCard" style="background:${b.color}">
      <h3>${b.title}</h3>
      <p>${b.desc}</p>
    </article>
  `).join('');

  // 좌/우 버튼
  const prev = document.querySelector('.bannerNav.prev');
  const next = document.querySelector('.bannerNav.next');
  const step = () => wrap.clientWidth * 0.8;

  prev?.addEventListener('click', () => wrap.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => wrap.scrollBy({ left:  step(), behavior: 'smooth' }));
})();