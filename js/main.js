/* Livee Home (TEST MODE)
 * - 등록된 공고가 무엇이든 보이게 3단계 폴백으로 불러온다.
 *   1) {API_BASE}/recruit-test?status=published&limit=20   (config 우선)
 *   2) {API_BASE}/recruit-test?limit=20                    (status 제거)
 *   3) {API_BASE}/campaigns?type=recruit&limit=20          (구 라우터 폴백)
 *
 * - 이미지 기본값은 외부 placeholder 사용(프로젝트 이미지 유무와 무관)
 * - 콘솔에 상세 디버그 로그를 남긴다.
 */
(() => {
  const $ = (s) => document.querySelector(s);

  // ==== config ====
  const CFG = window.LIVEE_CONFIG || {};
  const API_BASE = (CFG.API_BASE || "/api/v1").replace(/\/$/, "");
  const EP = CFG.endpoints || {};
  const EP_RECRUITS =
    EP.recruits ||
    "/recruit-test?status=published&limit=20"; // 우선 시도 엔드포인트

  // 이미지 placeholder (프로젝트에 파일 없어도 안깨지게)
  const IMG_PLACEHOLDER_SQ = "https://via.placeholder.com/112?text=IMG";
  const IMG_PLACEHOLDER_CARD = "https://via.placeholder.com/640x360?text=IMG";

  // ===== 날짜/문자 포맷 =====
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const fmtStartHM = (timeRange) => (String(timeRange || "").split("~")[0] || "").trim();

  // ===== 공통 fetch + 파서 =====
  async function tryFetch(url) {
    const full = `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
    console.log(`[HOME] fetch:`, full);
    const res = await fetch(full);
    let data = {};
    try { data = await res.json(); } catch (_) {}
    const list =
      (Array.isArray(data) && data) ||
      data.items || data.data?.items ||
      data.docs  || data.data?.docs  ||
      data.result|| data.data?.result|| [];

    console.log(`[HOME] response ${res.status}`, {
      ok: res.ok, payloadKeys: Object.keys(data || {}),
      parsedCount: Array.isArray(list) ? list.length : 0
    });

    if (!res.ok) throw { status: res.status, data };
    return Array.isArray(list) ? list : [];
  }

  // 테스트 모드: 3단계 폴백으로 무조건 리스트 받기
  async function fetchRecruitsAny() {
    const attempts = [
      EP_RECRUITS,
      "/recruit-test?limit=20",
      "/campaigns?type=recruit&limit=20",
    ];
    const errors = [];
    for (const u of attempts) {
      try {
        const items = await tryFetch(u);
        if (items.length) return items;
      } catch (e) {
        console.warn(`[HOME] attempt failed`, u, e);
        errors.push({ u, e });
      }
    }
    console.warn("[HOME] all attempts failed", errors);
    return [];
  }

  // ===== 템플릿 =====
  function tplLineup(items) {
    if (!items.length) {
      return `
        <div class="list-vert">
          <article class="item">
            <img class="thumb" src="${IMG_PLACEHOLDER_CARD}" alt="">
            <div style="min-width:0">
              <div class="title">등록된 라이브가 없습니다</div>
              <div class="meta one-line">새 공고를 등록해보세요</div>
            </div>
          </article>
        </div>`;
    }
    return `
      <div class="list-vert">
        ${items.map((it) => `
          <article class="item">
            <img class="thumb"
                 src="${it.thumb || IMG_PLACEHOLDER_CARD}"
                 alt="라이브 썸네일"
                 onerror="this.src='${IMG_PLACEHOLDER_CARD}'" />
            <div style="min-width:0">
              <div class="title">${it.title || "무제"}</div>
              <div class="meta one-line">
                ${it.when || ""} ${it.brand ? `· ${it.brand}` : ""}
              </div>
            </div>
          </article>
        `).join("")}
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
            <img class="mini-thumb" src="${IMG_PLACEHOLDER_SQ}" alt="" />
          </article>
        </div>`;
    }
    return `
      <div class="hscroll-mini">
        ${items.map((r) => `
          <article class="mini-card">
            <div class="mini-body">
              <div class="mini-title">${r.title || "무제"}</div>
              <div class="mini-meta">
                출연료 ${r.payNegotiable ? "협의 가능" :
                  (r.pay ? `${Number(r.pay).toLocaleString("ko-KR")}원` : "미정")}
                · 마감 ${fmtDate(r.closeAt)}
              </div>
            </div>
            <img class="mini-thumb"
                 src="${r.thumb || IMG_PLACEHOLDER_SQ}"
                 alt="공고 썸네일"
                 onerror="this.src='${IMG_PLACEHOLDER_SQ}'" />
          </article>
        `).join("")}
      </div>`;
  }

  // ===== 렌더 =====
  async function renderHome() {
    const raw = await fetchRecruitsAny();

    // 백엔드 응답 필드 통합
    const items = raw.map((c) => {
      const r = c.recruit || {};
      return {
        id: c.id || c._id || "",
        title: c.title || r.title || "",
        brand: c.brand || r.brand || "",
        closeAt: c.closeAt || r.deadline,
        shootDate: r.shootDate || r.date,
        shootTime: r.shootTime || r.timeStart || r.time,
        pay: r.payWan ? Number(r.payWan) * 10000 : (r.pay || ""),
        payNegotiable: !!r.payNegotiable,
        thumb: c.thumbnailUrl || c.coverImageUrl || IMG_PLACEHOLDER_SQ,
      };
    });

    // 라인업(그냥 가장 최근 2개 노출: 테스트 모드)
    const lineup = items.slice(0, 2).map((it) => ({
      ...it,
      when: (() => {
        const d = fmtDate(it.shootDate);
        const hm = fmtStartHM(it.shootTime);
        return [d, hm].filter(Boolean).join(" ");
      })(),
    }));

    // 렌더
    const moreHref = "./index.html#recruits";
    $("#app").innerHTML = `
      <!-- 오늘의 라이브 라인업 -->
      <section class="section">
        <div class="section-head">
          <h2>오늘의 라이브 라인업</h2><a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplLineup(lineup)}
      </section>

      <!-- 추천 공고 -->
      <section class="section">
        <div class="section-head">
          <h2>추천 공고</h2><a class="more" href="${moreHref}">더보기</a>
        </div>
        ${tplRecruits(items)}
      </section>
    `;
  }

  // kick
  renderHome().catch((e) => {
    console.error("[HOME] render error", e);
    $("#app").innerHTML = `
      <section class="section">
        <div class="section-head"><h2>오늘의 라이브 라인업</h2></div>
        <div class="list-vert"><article class="item">
          <img class="thumb" src="${IMG_PLACEHOLDER_CARD}" alt="">
          <div><div class="title">로딩 실패</div>
          <div class="meta one-line">네트워크 상태를 확인해주세요</div></div>
        </article></div>
      </section>`;
  });
})();