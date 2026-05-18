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

// 외부 라이브러리 준비 대기 (defer 로드 + 모듈은 비동기 실행되므로 race 조건 방지)
function waitForLibs() {
  return new Promise((resolve) => {
    const check = () => {
      if (typeof window.Plotly !== "undefined" && typeof window.jQuery !== "undefined" && typeof window.DataTable !== "undefined") {
        resolve();
      } else {
        setTimeout(check, 30);
      }
    };
    check();
  });
}

const bootProgress = document.getElementById("boot-progress");
const setBoot = (msg) => { if (bootProgress) bootProgress.textContent = msg; };

(async () => {
  try {
    setBoot("데이터 로드 중…");
    await loadAll();
    setBoot("라이브러리 준비 중…");
    await waitForLibs();
    if (state.meta?.generated_at) {
      document.getElementById("meta-time").textContent =
        state.meta.generated_at.slice(0, 19).replace("T", " ");
    }
    setBoot("첫 탭 렌더 중…");
    initNav();
  } catch (e) {
    console.error("[boot]", e);
    document.querySelector(".boot .msg").textContent = "로드 실패: " + e.message;
    return;
  }
  document.querySelector(".boot")?.remove();
})();
