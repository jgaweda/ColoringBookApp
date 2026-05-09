// Gallery view — finished pages stored in IndexedDB.

import { Gallery } from "../db.js";
import { runParentalGate } from "./parental-gate.js";

export async function mountGalleryView(host, { onBack }) {
  const tpl = document.getElementById("tpl-gallery").content.cloneNode(true);
  host.replaceChildren(tpl);
  host.querySelector("[data-action='back']").addEventListener("click", onBack);

  const grid = host.querySelector(".gallery-grid");
  const empty = host.querySelector(".empty-state");

  const items = await Gallery.list();
  if (items.length === 0) { empty.hidden = false; return; }

  for (const item of items) {
    grid.appendChild(buildCard(item, async () => {
      const ok = await runParentalGate();
      if (!ok) return;
      await Gallery.remove(item.id);
      grid.querySelector(`[data-id="${item.id}"]`)?.remove();
      if (grid.children.length === 0) empty.hidden = false;
    }));
  }
}

function buildCard(item, onDelete) {
  const card = document.createElement("article");
  card.className = "gallery-card";
  card.dataset.id = item.id;

  const art = document.createElement("div");
  art.className = "art";
  const img = new Image();
  img.alt = `${item.pageTitle} colored`;
  img.src = URL.createObjectURL(item.blob);
  art.appendChild(img);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <div class="titles">
      <strong>${escapeHtml(item.pageTitle)}</strong>
      <small>${escapeHtml(item.categoryTitle)}</small>
    </div>
  `;
  const del = document.createElement("button");
  del.setAttribute("aria-label", `Delete ${item.pageTitle}`);
  del.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12v12a2 2 0 01-2 2H8a2 2 0 01-2-2V9z" fill="currentColor"/></svg>`;
  del.addEventListener("click", onDelete);
  meta.appendChild(del);

  card.appendChild(art);
  card.appendChild(meta);
  return card;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}
