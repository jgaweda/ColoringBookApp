// Page picker view — grid of pages within a category.

const CATEGORY_GLYPHS = {
  heroes: "🦸", princesses: "👑", unicorns: "🦄", dinosaurs: "🦖",
  butterflies: "🦋", fantasy: "🐉", space: "🚀", undersea: "🧜",
  jungle: "🦁", farm: "🐄", vehicles: "🚒", robots: "🤖",
  holidays: "🎄", sweets: "🍪", letters: "🔤",
};

export function mountPagePickerView(host, { category, onBack, onPick }) {
  const tpl = document.getElementById("tpl-page-picker").content.cloneNode(true);
  host.replaceChildren(tpl);
  host.querySelector(".category-title").textContent = category.title;
  host.querySelector(".picker-subtitle").textContent = category.subtitle || "";
  host.querySelector("[data-action='back']").addEventListener("click", onBack);

  const grid = host.querySelector(".picker-grid");
  for (const page of category.pages) {
    const c = document.createElement("button");
    c.className = "picker-card";
    c.setAttribute("aria-label", `Color ${page.title}`);
    c.innerHTML = `
      <div class="thumb" style="background:${tint(category.accentHex)};">${CATEGORY_GLYPHS[category.id] || "🎨"}</div>
      <div class="name">${escapeHtml(page.title)}</div>
    `;
    c.addEventListener("click", () => onPick(category, page));
    grid.appendChild(c);
  }
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
