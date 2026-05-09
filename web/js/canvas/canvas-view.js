// CanvasView — composes the line-art, paint, brush, and sticker layers into
// a single coloring stage. Plays the same role as iOS CanvasView.swift +
// CanvasViewModel.swift.

import { loadPageAssets } from "./line-art.js";
import { RegionMask, PaintLayer } from "../region-mask.js";
import { BrushController } from "./brush.js";
import { StickerLayer, STICKER_GLYPHS } from "./stickers.js";
import { UndoStack } from "./undo-stack.js";
import { PRIMARY, EXTENDED, hexToRgba } from "../palette.js";
import { Audio, Voiceover } from "../audio.js";
import { Autosave, Gallery } from "../db.js";
import { runParentalGate } from "../views/parental-gate.js";

export async function mountCanvasView(host, { category, page, onBack }) {
  const tpl = document.getElementById("tpl-canvas").content.cloneNode(true);
  host.replaceChildren(tpl);

  const titleEl = host.querySelector(".page-title");
  titleEl.textContent = page.title;
  Voiceover.speakCategory(page.title);

  const stage = host.querySelector("[data-stage]");
  const paintCanvas = host.querySelector(".layer.paint");
  const lineCanvas = host.querySelector(".layer.line-art");
  const brushCanvas = host.querySelector(".layer.brush");
  const stickerHost = host.querySelector("[data-sticker-layer]");
  const paletteEl = host.querySelector("[data-palette]");
  const stickerSheet = host.querySelector("[data-sticker-sheet]");
  const toast = host.querySelector("[data-toast]");

  // ---------- Asset load ----------
  const assets = await loadPageAssets(page);
  const W = assets.mask.width;
  const H = assets.mask.height;

  for (const c of [paintCanvas, lineCanvas, brushCanvas]) {
    c.width = W; c.height = H;
  }
  paintCanvas.style.aspectRatio = `${W} / ${H}`;
  lineCanvas.style.aspectRatio  = `${W} / ${H}`;
  brushCanvas.style.aspectRatio = `${W} / ${H}`;

  const lineCtx = lineCanvas.getContext("2d");
  lineCtx.drawImage(assets.lineArt, 0, 0, W, H);

  // ---------- State ----------
  const mask = new RegionMask(assets.mask);
  const paint = new PaintLayer(W, H);
  const undoStack = new UndoStack();
  const paintCtx = paintCanvas.getContext("2d");
  const stickers = new StickerLayer(stickerHost, {
    onRemove: (snapshot) => {
      undoStack.push({ type: "sticker-remove", sticker: snapshot });
      refreshUndoButtons();
      scheduleAutosave();
    },
    onMove: (id, before, after) => {
      undoStack.push({ type: "sticker-move", id, before, after });
      refreshUndoButtons();
      scheduleAutosave();
    },
  });

  let currentColor = PRIMARY[0];
  let tool = "bucket";
  let saveLockedDone = false;

  // ---------- Brush ----------
  const brush = new BrushController(brushCanvas, {
    onStrokeEnd: ({ before, after }) => {
      undoStack.push({ type: "brush", prev: before, next: after });
      refreshUndoButtons();
      scheduleAutosave();
    }
  });
  brush.setColor(currentColor.id);
  brush.setActive(false); // bucket is the default tool

  // ---------- Palette ----------
  let extendedShown = false;
  function buildPalette() {
    paletteEl.replaceChildren();
    const list = extendedShown ? [...PRIMARY, ...EXTENDED] : PRIMARY;
    for (const c of list) {
      const b = document.createElement("button");
      b.className = "swatch";
      b.style.background = c.id;
      b.setAttribute("aria-label", c.name);
      b.setAttribute("aria-pressed", c.id === currentColor.id ? "true" : "false");
      b.addEventListener("click", () => {
        currentColor = c;
        brush.setColor(c.id);
        Voiceover.speakColor(c.name);
        Audio.playSFX("pop");
        for (const el of paletteEl.querySelectorAll(".swatch")) el.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-pressed", "true");
      });
      paletteEl.appendChild(b);
    }
  }
  buildPalette();

  host.querySelector("[data-action='palette-toggle']").addEventListener("click", () => {
    extendedShown = !extendedShown;
    buildPalette();
  });

  // ---------- Tools ----------
  const toolButtons = host.querySelectorAll(".tool[data-tool]");
  for (const tb of toolButtons) {
    tb.addEventListener("click", () => {
      tool = tb.dataset.tool;
      for (const t of toolButtons) t.setAttribute("aria-pressed", t === tb ? "true" : "false");
      brush.setActive(tool === "brush");
      Audio.playSFX("tap");
      if (tool === "sticker") {
        openStickerSheet();
      }
    });
  }

  // ---------- Tap-to-fill on the stage ----------
  stage.addEventListener("pointerdown", (e) => {
    if (tool !== "bucket" && tool !== "eraser") return;
    if (e.target.closest(".sticker")) return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const label = mask.labelAtNormalized(x, y);
    if (label === null) {
      Audio.playSFX("error");
      return;
    }
    const indices = mask.pixelIndices(label);
    const rgba = (tool === "eraser") ? [0, 0, 0, 0] : hexToRgba(currentColor.id);
    const prev = paint.fill(indices, rgba);
    const packed = ((rgba[3] & 0xff) << 24) | ((rgba[2] & 0xff) << 16) | ((rgba[1] & 0xff) << 8) | (rgba[0] & 0xff);
    undoStack.push({ type: "fill", indices, prev, next: packed });
    redrawPaint();
    Audio.playSFX(tool === "eraser" ? "erase" : "fill");
    refreshUndoButtons();
    scheduleAutosave();
  });

  // ---------- Stickers ----------
  function openStickerSheet() {
    const grid = stickerSheet.querySelector(".sticker-grid");
    grid.replaceChildren();
    for (const g of STICKER_GLYPHS) {
      const b = document.createElement("button");
      b.textContent = g;
      b.setAttribute("aria-label", `${g} sticker`);
      b.addEventListener("click", () => {
        const inst = stickers.add({ glyph: g, x: 0.5, y: 0.5 });
        undoStack.push({ type: "sticker-add", sticker: { id: inst.id, glyph: inst.glyph, x: inst.x, y: inst.y, scale: inst.scale, rotation: inst.rotation } });
        Audio.playSFX("sparkle");
        refreshUndoButtons();
        scheduleAutosave();
        stickerSheet.close();
      });
      grid.appendChild(b);
    }
    if (typeof stickerSheet.showModal === "function") stickerSheet.showModal();
    else stickerSheet.setAttribute("open", "");
  }
  host.querySelector("[data-action='close-stickers']").addEventListener("click", () => stickerSheet.close());

  // ---------- Toolbar actions ----------
  host.querySelector("[data-action='back']").addEventListener("click", () => {
    flushAutosave(true);
    onBack?.();
  });
  host.querySelector("[data-action='undo']").addEventListener("click", () => doUndo());
  host.querySelector("[data-action='redo']").addEventListener("click", () => doRedo());
  host.querySelector("[data-action='save']").addEventListener("click", () => doSave());
  host.querySelector("[data-action='share']").addEventListener("click", () => doShare());
  host.querySelector("[data-action='clear']").addEventListener("click", () => doClear());

  // ---------- Render helpers ----------
  function redrawPaint() { paint.draw(paintCtx); }

  function refreshUndoButtons() {
    host.querySelector("[data-action='undo']").toggleAttribute("disabled", !undoStack.canUndo);
    host.querySelector("[data-action='redo']").toggleAttribute("disabled", !undoStack.canRedo);
  }

  // ---------- Undo/redo ----------
  function applyAction(a, undo) {
    switch (a.type) {
      case "fill": {
        if (undo) paint.restore(a.indices, a.prev);
        else for (let i = 0; i < a.indices.length; i++) paint.u32[a.indices[i]] = a.next;
        redrawPaint();
        break;
      }
      case "brush": {
        brush.restore(undo ? a.prev : a.next);
        break;
      }
      case "sticker-add": {
        if (undo) stickers.remove(a.sticker.id);
        else stickers.add(a.sticker);
        break;
      }
      case "sticker-remove": {
        if (undo) stickers.add(a.sticker);
        else stickers.remove(a.sticker.id);
        break;
      }
      case "sticker-move": {
        const item = stickers.items.get(a.id);
        if (!item) break;
        const t = undo ? a.before : a.after;
        Object.assign(item, t);
        stickers._render(item);
        break;
      }
      case "clear": {
        if (undo) {
          paint.replace(a.prev);
          brush.restore(a.prevBrush);
          stickers.restore(a.prevStickers);
        } else {
          paint.clear(); brush.clear(); stickers.clear();
        }
        redrawPaint();
        break;
      }
    }
  }
  function doUndo() {
    const a = undoStack.popUndo(); if (!a) return;
    applyAction(a, true); refreshUndoButtons(); Audio.playSFX("tap");
  }
  function doRedo() {
    const a = undoStack.popRedo(); if (!a) return;
    applyAction(a, false); refreshUndoButtons(); Audio.playSFX("tap");
  }

  function doClear() {
    if (!confirm("Clear this page? You can undo it.")) return;
    const action = {
      type: "clear",
      prev: new Uint32Array(paint.u32),
      prevBrush: brush.snapshot(),
      prevStickers: stickers.list(),
    };
    paint.clear(); brush.clear(); stickers.clear();
    redrawPaint();
    undoStack.push(action);
    refreshUndoButtons();
    scheduleAutosave();
  }

  // ---------- Compose final image (paint + line-art + brush + stickers) ----------
  function compose() {
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.putImageData(paint.imageData, 0, 0);
    ctx.drawImage(lineCanvas, 0, 0);
    ctx.drawImage(brushCanvas, 0, 0);
    // Stickers (rendered as text glyphs)
    for (const s of stickers.list()) {
      const fontPx = 96 * s.scale;
      ctx.font = `${fontPx}px -apple-system, "SF Pro", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.translate(s.x * W, s.y * H);
      ctx.rotate(s.rotation || 0);
      ctx.fillText(s.glyph, 0, 0);
      ctx.restore();
    }
    return out;
  }

  async function doSave() {
    const c = compose();
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!blob) return;
    await Gallery.add({ blob, pageId: page.id, pageTitle: page.title, categoryId: category.id, categoryTitle: category.title });
    // Also offer a download (Photos library equivalent).
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${page.id}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    Audio.playSFX("applause");
    showToast("Saved!");
    saveLockedDone = true;
  }

  async function doShare() {
    const ok = await runParentalGate();
    if (!ok) return;
    const c = compose();
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], `${page.id}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: page.title }); return; } catch (_) {}
    }
    // Fallback: trigger a print dialog so AirPrint works on iPad.
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => { try { w.print(); } catch (_) {} }, 500);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { toast.hidden = true; }, 200);
    }, 1500);
  }

  // ---------- Autosave ----------
  let autosaveTimer = null;
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(flushAutosave, 2000);
  }
  async function flushAutosave(immediate = false) {
    if (immediate) clearTimeout(autosaveTimer);
    const brushBlob = await new Promise((r) => brushCanvas.toBlob(r, "image/png"));
    await Autosave.put({
      pageId: page.id,
      paint: new Uint32Array(paint.u32),
      brushBlob,
      stickers: stickers.list(),
      updatedAt: Date.now(),
    });
  }

  async function restoreAutosave() {
    const snap = await Autosave.get(page.id);
    if (!snap) return;
    if (snap.paint && snap.paint.length === paint.u32.length) paint.replace(snap.paint);
    redrawPaint();
    if (snap.brushBlob) {
      const img = await blobToImage(snap.brushBlob);
      brush.ctx.drawImage(img, 0, 0);
    }
    if (Array.isArray(snap.stickers)) stickers.restore(snap.stickers);
  }
  await restoreAutosave();

  function blobToImage(b) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(b);
    });
  }

  // Keep stickers positioned correctly when the stage resizes.
  const ro = new ResizeObserver(() => stickers.refreshLayout());
  ro.observe(stage);

  // Allow keyboard shortcuts.
  function key(e) {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
      else if (e.key === "z" && e.shiftKey) { e.preventDefault(); doRedo(); }
    }
  }
  window.addEventListener("keydown", key);

  // Initial paint pass so the layer canvas is visible (it's empty but
  // putImageData ensures the canvas is initialized).
  redrawPaint();
  refreshUndoButtons();

  return {
    cleanup() {
      ro.disconnect();
      window.removeEventListener("keydown", key);
      clearTimeout(autosaveTimer);
    }
  };
}
