/* Livee v2.5 – Home (Lineup + Recruits)
 * - GET {API_BASE}{endpoints.recruits}  (기본: /recruit-test?status=published&limit=20)
 * - GET {API_BASE}{endpoints.schedule}  (없으면 클라에서 오늘 일정 필터)
 * - window.LIVEE_CONFIG 사용
 */
(() => {
  const $ = (s) => document.querySelector(s);

  // ==== config ====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  let BASE_PATH = CFG.BASE_PATH || "";
  if (BASE_PATH && !BASE_PATH.startsWith("/")) BASE_PATH = `/${BASE_PATH}`;
  if (BASE_PATH === "/") BASE_PATH = "";
  const EP = CFG.endpoints || {};
  const EP_RECRUITS = EP.recruits || "/recruit-test?status=published&limit=20";
  const EP_SCHEDULE = EP.schedule || ""; // 없으면 클라 필터로 대체

  const DEFAULT_IMG = "default.jpg";

  // ==== utils ====
  const pad2 = (n) => String(n).padStart(2, "0");
  const n2 = (v) =>
    (v === 0 || Number.isFinite(Number(v)))
      ? Number(v).toLocaleString("ko-KR")
      : "";

  // ‘YYYY-MM-DD’ 로컬기준으로 뽑기
  const toLocalYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  // 서버 응답(배열/객체 다양성) → items 배열로 정규화
  const pickItems = (data) =>
    (Array.isArray(data) && data) ||
    data.items ||
    data.data?.items ||
    data.docs ||
    data.data?.docs ||
    [];

  // 통합 구조로 매핑
  const mapCampaign = (c) => ({
    id: c.id || c._id,
    title: c.title || "",
    brand: c.brand || c.recruit?.brand || "",
    thumb: c.thumbnailUrl || c.coverImageUrl || DEFAULT_IMG,
    closeAt: c.closeAt || c.recruit?.deadline || "",
    // recruit block
    shootDate: c.recruit?.shootDate,
    shootTime: c.recruit?.shootTime || [c.recruit?.timeStart, c.recruit?.timeEnd].filter(Boolean).join("~"),
    pay: c.recruit?.pay,
    payNegotiable: !!c.recruit?.payNegotiable,
  });

  function fmtDateYYYYMMDD(dateISO) {
    if (!dateISO) return "";
    const d = new Date(dateISO);
    if (isNaN(d)) return String(dateISO).slice(0, 10);
    return toLocalYMD(d);
  }

  function metaForLineup(it) {
    const payLabel = it.payNegotiable
      ? "협의 가능"
      : it.pay
      ? `${n2(it.pay)}원`
      : "모집중";
    // 시작 시각(있으면 앞쪽만)
    const hm = (it.shootTime || "").split("~")[0] || "";
    return `${payLabel} · ${hm ? hm + " " : ""}예정`;
  }

  // ==== fetchers ====
  async function fetchRecruits() {
    const url = `${API_BASE}${EP_RECRUITS.startsWith("/") ? EP_RECRUITS : `/${EP_RECRUITS}`}`;
    console.debug("[HOME] fetch recruits:", url);
    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      console.debug("[HOME] recruits status:", res.status, "payload:", json);
      if (!res.ok || json.ok === false) throw new Error(json.message || `HTTP_${res.status}`);
      return pickItems(json).map(mapCampaign);
    } catch (e) {
      console.warn("[HOME] fetch recruits error:", e);
      return [];
    }
  }

  async function fetchScheduleDirect() {
    if (!EP_SCHEDULE) return null; // 클라 필터로 대체
    const url = `${API_BASE}${EP_SCHEDULE.startsWith("/") ? EP_SCHEDULE : `/${EP_SCHEDULE}`}`;
    console.debug("[HOME] fetch schedule:", url);
    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      console.debug("[HOME] schedule status:", res.status, "payload:", json);
      if (!res.ok || json.ok === false) throw new Error(json.message || `HTTP_${res.status}`);
      return pickItems(json).map(mapCampaign);
    } catch (e) {
      console.warn("[HOME] fetch schedule error:", e);
      return null; // null이면 클라 필터로 폴백
    }
  }

  // ==== templates ====
  function tplLineup(items) {
    if (!items.length) {
      return `
        <div class="list-vert">
          <article class="item">
            <img class="thumb" src="${DEFAULT_IMG}" alt="">
            <div style="min-width:0">
              <div class="title">등록된 라이브가 없습니다</div>
              <div class="meta one-line">새 공고를 등록해보세요</div>
            </div>
          </article>
        </div>`;
    }
    return `
      <div class="list-vert">
        ${items
          .map(
            (it) => `
          <article class="item">
            <img class="thumb" src="${it.thumb || DEFAULT_IMG}" alt="라이브 썸네일" onerror="this.src='${DEFAULT_IMG}'">
            <div style="min-width:0">
              <div class="title">${it.title}</div>
              <div class="meta one-line">${metaForLineup(it)}</div>
            </div>
          </article>`
          )
          .join("")}
      </div>`;
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
            <img class="mini-thumb" src="${DEFAULT_IMG}" alt="">
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
              <div class="mini-meta">
                출연료 ${
                  r.payNegotiable ? "협의 가능" : r.pay ? `${n2(r.pay)}원` : "미정"
                } · 마감 ${fmtDateYYYYMMDD(r.closeAt)}
              </div>
            </div>
            <img class="mini-thumb" src="${r.thumb || DEFAULT_IMG}" alt="공고 썸네일"
                 onerror="this.src='${DEFAULT_IMG}'">
          </article>`
          )
          .join("")}
      </div>`;
  }

  // ==== render ====
  async function renderHome() {
    const allRecruits = await fetchRecruits();

    // 1) 라인업: 서버가 별도 엔드포인트 제공하면 사용, 없으면 ‘오늘’만 클라 필터
    let lineup = await fetchScheduleDirect();
    if (!Array.isArray(lineup)) {
      const todayYMD = toLocalYMD(new Date());
      lineup = allRecruits
        .filter((r) => {
          if (!r.shootDate) return false;
          const ymd = toLocalYMD(new Date(r.shootDate));
          return ymd === todayYMD;
        })
        .map((r) => {
          // 정렬용 시작 시각 계산
          const startHM = (r.shootTime || "").split("~")[0] || "00:00";
          const d = new Date(r.shootDate);
          const [hh, mm] = startHM.split(":").map(Number);
          d.setHours(hh || 0, mm || 0, 0, 0);
          return { ...r, _start: d };
        })
        .sort((a, b) => a._start - b._start)
        .slice(0, 6);
    }

    // 2) 추천 공고: 최신 등록 순 (이미 서버에서 정렬되어 올 가능성 높음)
    const recruits = allRecruits.slice(0, 10);

    const moreHref = BASE_PATH ? `${BASE_PATH}/index.html#recruits` : "./index.html#recruits";

    $("#app").innerHTML = `
      <!-- 오늘의 라이브 라인업 -->
      <section class="section">
        <div class="section-head">
          <h2>오늘의 라이브 라인업</h2>
          <a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplLineup(lineup)}
      </section>

      <!-- 추천 공고 -->
      <section class="section">
        <div class="section-head">
          <h2>추천 공고</h2>
          <a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplRecruits(recruits)}
      </section>
    `;
  }

  // kick
  renderHome();
})();