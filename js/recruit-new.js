(() => {
  const { API_BASE, CLOUDINARY } = window.LIVEE_CONFIG || {};
  const token = localStorage.getItem('liveeToken');
  const msg = document.getElementById('recruitMsg');
  const fileInput = document.getElementById('imageFile');

  let imageUrl = '';

  if (!token) {
    msg.innerHTML = '로그인이 필요합니다. <a href="./login.html">로그인 이동</a>';
  }

  async function uploadToCloudinary(file){
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY.uploadPreset);
    fd.append('cloud_name', CLOUDINARY.cloudName);

    const res = await fetch(CLOUDINARY.uploadApi, { method:'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '업로드 실패');
    return json.secure_url || json.url;
  }

  fileInput?.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    msg.textContent = '이미지 업로드 중...';
    try{
      imageUrl = await uploadToCloudinary(f);
      msg.textContent = '업로드 완료 ✅';
    }catch(e){
      console.error(e);
      msg.textContent = '이미지 업로드 실패';
    }
  });

  document.getElementById('recruitForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (!token) { alert('로그인이 필요합니다.'); location.href='./login.html'; return; }

    const payload = {
      title: document.getElementById('title').value.trim(),
      scheduledAt: document.getElementById('date').value,
      pay: document.getElementById('pay').value.trim(),
      category: document.getElementById('category').value,
      description: document.getElementById('desc').value.trim(),
      imageUrl
    };

    try{
      const res = await fetch(`${API_BASE}/recruits`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.message || '등록 실패');

      msg.textContent = '공고가 등록되었습니다.';
      // 필요시 상세 이동: location.href = `./recruit-detail.html?id=${json.data?._id || json._id}`;
    }catch(ex){
      msg.textContent = ex.message;
    }
  });
})();