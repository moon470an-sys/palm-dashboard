// 6 탭 라우팅 + 데이터 로딩 + 섹션 렌더
import { state, loadAll } from "./data.js";
import { renderOverview } from "./sections/overview.js";
import { renderAnnual } from "./sections/annual.js";
import { renderIspo } from "./sections/ispo.js";
import { renderRspo } from "./sections/rspo.js";
import { renderBdsp } from "./sections/bdsp.js";
import { renderGapki } from "./sections/gapki.js";

const RENDERERS = {
  overview: renderOverview,
  annual: renderAnnual,
  ispo: renderIspo,
  rspo: renderRspo,
  bdsp: renderBdsp,
  gapki: renderGapki,
};

const rendered = new Set();

function showTab(tabId) {
  document.querySelectorAll(".tabs a").forEach((a) =>
    a.classList.toggle("active", a.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((p) =>
    p.classList.toggle("active", p.id === tabId));
  if (!rendered.has(tabId) && RENDERERS[tabId]) {
    try {
      RENDERERS[tabId](document.getElementById(tabId));
      rendered.add(tabId);
    } catch (e) {
      console.error(`[render ${tabId}]`, e);
      document.getElementById(tabId).innerHTML =
        `<div class="card"><b>렌더 오류</b><pre>${e.message}</pre></div>`;
    }
  }
}

function initNav() {
  document.querySelectorAll(".tabs a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = a.dataset.tab;
      history.replaceState(null, "", `#${tab}`);
      showTab(tab);
    });
  });
  const hash = location.hash.replace("#", "") || "overview";
  showTab(RENDERERS[hash] ? hash : "overview");
}

(async () => {
  try {
    await loadAll();
    if (state.meta?.generated_at) {
      document.getElementById("meta-time").textContent =
        state.meta.generated_at.slice(0, 19).replace("T", " ");
    }
    initNav();
  } catch (e) {
    console.error("[boot]", e);
    document.querySelector(".boot .msg").textContent = "로드 실패: " + e.message;
    return;
  }
  document.querySelector(".boot")?.remove();
})();
