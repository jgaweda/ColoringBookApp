// Netflix-Kids style category browser.

import { Voiceover, Audio } from "../audio.js";

const CATEGORY_GLYPHS = {
  heroes: "🦸", princesses: "👑", unicorns: "🦄", dinosaurs: "🦖",
  butterflies: "🦋", fantasy: "🐉", space: "🚀", undersea: "🧜",
  jungle: "🦁", farm: "🐄", vehicles: "🚒", robots: "🤖",
  holidays: "🎄", sweets: "🍪", letters: "🔤",
};

export function mountHomeView(host, { categories, onPick, onPagePicker, onGallery, onSettings }) {
  const tpl = document.getElementById("tpl-home").content.cloneNode(true);
  host.replaceChildren(tpl);

  host.querySelector("[data-action='gallery']").addEventListener("click", () => {
    Audio.playSFX("tap");
    onGallery();
  });
  host.querySelector("[data-action='settings']").addEventListener("click", () => {
    Audio.playSFX("tap");
    onSettings();
  });

  const list = host.querySelector(".categories");
  list.replaceChildren();
  for (const cat of categories) {
    list.appendChild(buildRow(cat, { onPick, onPagePicker }));
  }
}

function buildRow(category, { onPick, onPagePicker }) {
  const row = document.createElement("section");
  row.className = "category-row";

  const head = document.createElement("div");
  head.className = "row-header";
  head.innerHTML = `<h3>${escapeHtml(category.title)}</h3>`;
  const seeAll = document.createElement("button");
  seeAll.className = "see-all";
  seeAll.textContent = "See all";
  seeAll.setAttribute("aria-label", `See all ${category.title}`);
  seeAll.addEventListener("click", () => {
    Voiceover.speakCategory(category.title);
    onPagePicker(category);
  });
  head.appendChild(seeAll);
  row.appendChild(head);

  const track = document.createElement("div");
  track.className = "row-track";
  track.appendChild(buildHeroCard(category, () => {
    Voiceover.speakCategory(category.title);
    onPagePicker(category);
  }));
  for (const page of category.pages.slice(0, 8)) {
    track.appendChild(buildThumbCard(category, page, () => onPick(category, page)));
  }
  row.appendChild(track);
  return row;
}

function buildHeroCard(category, onClick) {
  const accent = category.accentHex || "#FFE066";
  const card = document.createElement("button");
  card.className = "cat-hero";
  card.style.background = `linear-gradient(135deg, ${accent}, ${darken(accent, 0.15)})`;
  card.setAttribute("aria-label", category.title);
  card.innerHTML = `
    <span class="glyph" aria-hidden="true">${CATEGORY_GLYPHS[category.id] || "🎨"}</span>
    <span class="label">${escapeHtml(category.title)}</span>
  `;
  card.addEventListener("click", onClick);
  return card;
}

function buildThumbCard(category, page, onClick) {
  const card = document.createElement("button");
  card.className = "thumb-card";
  card.setAttribute("aria-label", `Color ${page.title}`);
  card.innerHTML = `
    <div class="thumb" style="background:${tint(category.accentHex)};">${CATEGORY_GLYPHS[category.id] || "🎨"}</div>
    <div class="name">${escapeHtml(page.title)}</div>
  `;
  card.addEventListener("click", onClick);
  return card;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}
function tint(hex) {
  const c = (hex || "#FFE066").replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.25)`;
}
function darken(hex, amt) {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - 255 * amt);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - 255 * amt);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - 255 * amt);
  return `rgb(${r|0},${g|0},${b|0})`;
}
