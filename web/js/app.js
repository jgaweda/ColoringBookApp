// Main entry. Loads the catalog, manages routing and view lifecycle, and
// wires audio unlock on the first user gesture.

import { Audio } from "./audio.js";
import { mountHomeView } from "./views/home.js";
import { mountPagePickerView } from "./views/picker.js";
import { mountGalleryView } from "./views/gallery.js";
import { mountSettingsView } from "./views/settings.js";
import { mountCanvasView } from "./canvas/canvas-view.js";
import { maybeShowInstallHint } from "./install-hint.js";

const app = document.getElementById("app");
let categories = [];
let currentCleanup = null;

async function loadCatalog() {
  const r = await fetch("./data/categories.json");
  if (!r.ok) throw new Error("Failed to load catalog");
  const j = await r.json();
  categories = j.categories || [];
}

function clear() {
  if (currentCleanup) { try { currentCleanup(); } catch (_) {} currentCleanup = null; }
  app.replaceChildren();
}

const routes = {
  home: () => {
    clear();
    mountHomeView(app, {
      categories,
      onPick: (cat, page) => routes.canvas(cat, page),
      onPagePicker: (cat) => routes.picker(cat),
      onGallery: () => routes.gallery(),
      onSettings: () => routes.settings(),
    });
  },
  picker: (category) => {
    clear();
    mountPagePickerView(app, {
      category,
      onBack: () => routes.home(),
      onPick: (cat, page) => routes.canvas(cat, page),
    });
  },
  canvas: async (category, page) => {
    clear();
    const handle = await mountCanvasView(app, {
      category, page, onBack: () => routes.home(),
    });
    currentCleanup = handle?.cleanup;
  },
  gallery: () => {
    clear();
    mountGalleryView(app, { onBack: () => routes.home() });
  },
  settings: () => {
    clear();
    mountSettingsView(app, { onBack: () => routes.home() });
  },
};

// First user gesture unlocks audio on iOS Safari and starts bg music.
function unlockOnce() {
  Audio.unlock();
  window.removeEventListener("pointerdown", unlockOnce);
  window.removeEventListener("keydown", unlockOnce);
}
window.addEventListener("pointerdown", unlockOnce, { once: true });
window.addEventListener("keydown", unlockOnce, { once: true });

(async () => {
  try {
    await loadCatalog();
    Audio.preload();
    const params = new URLSearchParams(location.search);
    const r = params.get("route");
    if (r === "gallery") routes.gallery();
    else if (r === "settings") routes.settings();
    else routes.home();
    maybeShowInstallHint();
  } catch (e) {
    app.innerHTML = `<div style="padding:32px;text-align:center;">
      <h2>Something went wrong</h2>
      <p>${escapeHtml(e?.message || String(e))}</p>
      <button class="big-btn" onclick="location.reload()">Try again</button>
    </div>`;
  }
})();

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}
