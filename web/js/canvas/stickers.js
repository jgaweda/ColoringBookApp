// Emoji sticker layer. Stickers are DOM elements with CSS transforms — no
// image assets needed, so the app stays self-contained and free.
// Drag to move, two-finger pinch to scale, long-press to delete.

export const STICKER_GLYPHS = [
  "⭐", "❤️", "😄", "✨", "🌈", "👑", "🌸", "☁️",
  "⚡", "🎈", "🍪", "🐾", "🦋", "🚀", "🎉", "🌟",
  "🦄", "🎂", "🍓", "🍩", "🐶", "🐱", "🐻", "🐸",
];

export class StickerLayer {
  constructor(host, { onRemove, onMove } = {}) {
    this.host = host;
    // Fired only for user-initiated removal (long-press) so the canvas can
    // record an undo entry. Programmatic remove() does NOT fire this.
    this.onRemove = onRemove;
    // Fired only after a user finishes dragging.
    this.onMove = onMove;
    /** @type {Map<string, {id, glyph, x, y, scale, rotation, el}>} */
    this.items = new Map();
    this._dragging = null;
  }

  add({ id = crypto.randomUUID(), glyph, x = 0.5, y = 0.5, scale = 1, rotation = 0 }) {
    const el = document.createElement("div");
    el.className = "sticker";
    el.textContent = glyph;
    el.dataset.id = id;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `${glyph} sticker`);
    this.host.appendChild(el);
    const item = { id, glyph, x, y, scale, rotation, el };
    this.items.set(id, item);
    this._render(item);
    this._attach(item);
    return item;
  }

  remove(id) {
    const item = this.items.get(id);
    if (!item) return;
    item.el.remove();
    this.items.delete(id);
  }

  clear() {
    for (const it of this.items.values()) it.el.remove();
    this.items.clear();
  }

  list() { return Array.from(this.items.values()).map((s) => ({ id: s.id, glyph: s.glyph, x: s.x, y: s.y, scale: s.scale, rotation: s.rotation })); }

  restore(records) {
    this.clear();
    for (const r of records) this.add(r);
  }

  _render(item) {
    const r = this.host.getBoundingClientRect();
    item.el.style.left = `${item.x * r.width}px`;
    item.el.style.top  = `${item.y * r.height}px`;
    item.el.style.transform = `translate(-50%,-50%) scale(${item.scale}) rotate(${item.rotation}rad)`;
  }

  refreshLayout() {
    for (const it of this.items.values()) this._render(it);
  }

  _attach(item) {
    let startCenter = null;
    let pressTimer = null;

    item.el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.el.setPointerCapture(e.pointerId);
      item.el.classList.add("grabbing");
      const r = this.host.getBoundingClientRect();
      startCenter = { x: item.x, y: item.y, clientX: e.clientX, clientY: e.clientY, w: r.width, h: r.height };
      this._dragging = { item, before: { x: item.x, y: item.y, scale: item.scale, rotation: item.rotation } };
      pressTimer = setTimeout(() => {
        if (this._dragging?.item === item) {
          this._dragging = null;
          const snapshot = snapshotOf(item);
          this.remove(item.id);
          this.onRemove?.(snapshot);
        }
      }, 700);
    });

    item.el.addEventListener("pointermove", (e) => {
      if (!startCenter || this._dragging?.item !== item) return;
      const dx = (e.clientX - startCenter.clientX) / startCenter.w;
      const dy = (e.clientY - startCenter.clientY) / startCenter.h;
      if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) clearTimeout(pressTimer);
      item.x = clamp(startCenter.x + dx, 0, 1);
      item.y = clamp(startCenter.y + dy, 0, 1);
      this._render(item);
    });

    item.el.addEventListener("pointerup", (e) => {
      clearTimeout(pressTimer);
      item.el.classList.remove("grabbing");
      try { item.el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (this._dragging?.item === item) {
        const before = this._dragging.before;
        const after = { x: item.x, y: item.y, scale: item.scale, rotation: item.rotation };
        this._dragging = null;
        if (before.x !== after.x || before.y !== after.y) {
          this.onMove?.(item.id, before, after);
        }
      }
      startCenter = null;
    });

    item.el.addEventListener("pointercancel", () => {
      clearTimeout(pressTimer);
      item.el.classList.remove("grabbing");
      this._dragging = null;
      startCenter = null;
    });
  }
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function snapshotOf(item) {
  return { id: item.id, glyph: item.glyph, x: item.x, y: item.y, scale: item.scale, rotation: item.rotation };
}
