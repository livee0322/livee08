(() => {
  const { API_BASE } = window.LIVEE_CONFIG || {};
  const pills = document.querySelectorAll('#rolePills .pill');
  const form  = document.getElementById('loginForm');
  const err   = document.getElementById('loginError');

  let role = localStorage.getItem('lastRole') || 'brand';
  pills.forEach((p)=>{
    if (p.dataset.role === role) p.classList.add('active');
    p.addEventListener('click', ()=>{
      role = p.dataset.role;
      pills.forEach(x=>x.classList.toggle('active', x===p));
      localStorage.setItem('lastRole', role);
    });
  });

  async function tryLogin(payload){
    const res = await fetch(`${API_BASE}/users/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(json.message || '로그인 실패');
    return json;
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    err.style.display = 'none';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try{
      const data = await tryLogin({ email, password, role });
      const token = data.token || data.accessToken;
      if (!token) throw new Error('토큰이 없습니다.');
      localStorage.setItem('liveeToken', token);
      localStorage.setItem('liveeRole', role);
      location.href = './index.html';
    }catch(ex){
      err.textContent = ex.message;
      err.style.display = 'block';
    }
  });
})();