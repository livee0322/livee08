/* Livee v2.5 – Home Recruit List
 * - GET {API_BASE}/recruit-test?status=published
 * - window.LIVEE_CONFIG.endpoints.recruits 사용
 */
(() => {
  const $ = (sel) => document.querySelector(sel);

  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  let BASE_PATH = CFG.BASE_PATH || "";
  if (BASE_PATH && !BASE_PATH.startsWith("/")) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === "/") BASE_PATH = "";
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || "/recruit-test?status=published&limit=20";

  const DEFAULT_IMG = "default.jpg";

  const pad2 = (n) => String(n).padStart(2, "0");

  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return "";
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function metaForLineup(item) {
    const pay = item.payNegotiable
      ? "협의 가능"
      : item.pay
      ? `${Number(item.pay).toLocaleString("ko-KR")}원`
      : "모집중";
    const day = item.shootDate ? new Date(item.shootDate).getDate() : "";
    const hm = (item.shootTime || "").split("~")[0] || "";
    return `${pay} · ${day}일 ${hm} 예정`;
  }

  async function fetchRecruits() {
    const url = `${API_BASE}${EP_RECRUITS.startsWith("/") ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    console.debug("[main] fetch", url);

    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      console.debug("[main] res", res.status, data);

      if (!res.ok || data.ok === false) throw new Error(data.message || `(${res.status})`);

      const list =
        (Array.isArray(data) && data) ||
        data.items ||
        data.data?.items ||
        data.docs ||
        data.data?.docs ||
        [];

      return list.map((c) => ({
        id: c.id || c._id,
        title: c.title || "",
        thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
        closeAt: c.closeAt,
        shootDate: c.recruit?.shootDate,
        shootTime: c.recruit?.shootTime,
        pay: c.recruit?.pay,
        payNegotiable: !!c.recruit?.payNegotiable,
      }));
    } catch (e) {
      console.warn("fetchRecruits error:", e.message || e);
      return [];
    }
  }

  function tplRecruits(items) {
    if (!items.length) {
      return `
        <div class="hscroll-mini">
          <article class="mini-card">
            <div class="mini-body">
              <div class="mini-title">추천 공고가 없습니다</div>
              <div class="mini-meta">최신 공고가 올라오면 여기에 표시됩니다</div>
            </div>
            <img class="mini-thumb" src="${DEFAULT_IMG}" alt="" />
          </article>
        </div>`;
    }
    return `
      <div class="hscroll-mini">
        ${items
          .map(
            (r) => `
          <article class="mini-card">
            <div class="mini-body">
              <div class="mini-title">${r.title}</div>
              <div class="mini-meta">출연료 ${
                r.payNegotiable
                  ? "협의 가능"
                  : r.pay
                  ? `${Number(r.pay).toLocaleString("ko-KR")}원`
                  : "미정"
              } · 마감 ${fmtDateYYYYMMDD(r.closeAt)}</div>
            </div>
            <img class="mini-thumb" src="${r.thumb || DEFAULT_IMG}" alt="공고 썸네일"
                 onerror="this.src='${DEFAULT_IMG}'"/>
          </article>`
          )
          .join("")}
      </div>
    `;
  }

  async function renderHome() {
    const recruits = await fetchRecruits();
    const moreHref = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : "./index.html#recruits";

    $("#app").innerHTML = `
      <section class="section">
        <div class="section-head"><h2>추천 공고</h2><a class="more" href="${moreHref}">더보기</a></div>
        ${tplRecruits(recruits)}
      </section>
    `;
  }

  renderHome();
})();