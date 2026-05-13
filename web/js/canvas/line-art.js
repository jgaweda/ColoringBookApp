// Resolves a coloring page's line-art image and paired region label image.
// If real assets aren't shipped, generate a deterministic, page-unique
// composition using a seeded PRNG so every page looks distinct.

const PAGE_W = 1024;
const PAGE_H = 1024;

/**
 * Try to load both the line-art and region mask images for a page.
 * Returns { lineArt: HTMLImageElement | HTMLCanvasElement, mask: ImageData, w, h }.
 */
export async function loadPageAssets(page) {
  const lineArtUrl = `./assets/line-art/${page.lineArt.replace("LineArt/", "")}`;
  const maskUrl = `./assets/line-art/${page.regionMask.replace("LineArt/", "")}`;

  const realLineArt = await loadImage(lineArtUrl).catch(() => null);
  const realMask    = await loadImage(maskUrl).catch(() => null);

  if (realLineArt && realMask) {
    const mask = imageToImageData(realMask);
    return { lineArt: realLineArt, mask, w: realLineArt.naturalWidth || PAGE_W, h: realLineArt.naturalHeight || PAGE_H };
  }

  // Fall back to a procedural placeholder unique per page.
  const seed = hashString(page.id);
  const lineArtCanvas = renderProcedural(seed, "lineart");
  const maskCanvas    = renderProcedural(seed, "mask");
  const mask          = canvasToImageData(maskCanvas);
  return { lineArt: lineArtCanvas, mask, w: PAGE_W, h: PAGE_H };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function imageToImageData(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

function canvasToImageData(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ---------- Procedural placeholder line art ----------
// A small library of shapes. Each one knows how to draw itself in either
// "lineart" mode (black stroke on transparent) or "mask" mode (filled with a
// unique RGB so the tap-to-fill engine can resolve regions).

const SHAPES = ["circle", "star", "heart", "flower", "cloud", "diamond", "triangle", "butterfly", "ring", "drop"];

function renderProcedural(seed, mode) {
  const rng = mulberry32(seed);
  const c = document.createElement("canvas");
  c.width = PAGE_W;
  c.height = PAGE_H;
  // Make naturalWidth/Height available so callers can treat it like an Image.
  c.naturalWidth = PAGE_W;
  c.naturalHeight = PAGE_H;

  const ctx = c.getContext("2d");
  if (mode === "mask") {
    // Background = label A
    ctx.fillStyle = labelColor(1);
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  } else {
    ctx.clearRect(0, 0, PAGE_W, PAGE_H);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1C1C1E";
    ctx.lineWidth = 8;
  }

  // Outer rounded rect = label B (and a frame in line-art mode).
  if (mode === "mask") {
    ctx.fillStyle = labelColor(2);
    roundRect(ctx, 60, 60, PAGE_W - 120, PAGE_H - 120, 80);
    ctx.fill();
  } else {
    roundRect(ctx, 60, 60, PAGE_W - 120, PAGE_H - 120, 80);
    ctx.stroke();
  }

  // Pick 5–8 random shapes laid out in a soft grid so they don't overlap.
  const shapeCount = 5 + Math.floor(rng() * 4);
  const positions = layoutGrid(shapeCount, rng);
  let labelId = 3;
  for (let i = 0; i < shapeCount; i++) {
    const shape = SHAPES[Math.floor(rng() * SHAPES.length)];
    const { cx, cy, r } = positions[i];
    drawShape(ctx, shape, cx, cy, r, mode, labelColor(labelId++));
  }

  return c;
}

/** mulberry32 PRNG seeded by an integer; fast, deterministic, ~1-line. */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a page id to a 32-bit seed. */
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Spread N shape centers across a soft grid inside the safe area. */
function layoutGrid(n, rng) {
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const padX = 180, padY = 200;
  const cw = (PAGE_W - 2 * padX) / cols;
  const ch = (PAGE_H - 2 * padY) / rows;
  const out = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = padX + col * cw + cw / 2 + (rng() - 0.5) * cw * 0.2;
    const cy = padY + row * ch + ch / 2 + (rng() - 0.5) * ch * 0.2;
    const r  = Math.min(cw, ch) * (0.30 + rng() * 0.10);
    out.push({ cx, cy, r });
  }
  return out;
}

function labelColor(idx) {
  // Map idx to a unique non-black RGB. Spread across the cube.
  const r = (idx * 73)  & 0xFF;
  const g = (idx * 151) & 0xFF;
  const b = (idx * 211) & 0xFF;
  const safe = (v) => (v < 32 ? v + 64 : v);
  return `rgb(${safe(r)}, ${safe(g)}, ${safe(b)})`;
}

function drawShape(ctx, kind, cx, cy, r, mode, fillColor) {
  ctx.save();
  if (mode === "mask") ctx.fillStyle = fillColor;
  else { ctx.strokeStyle = "#1C1C1E"; ctx.lineWidth = 8; }
  switch (kind) {
    case "circle":  shapeCircle(ctx, cx, cy, r, mode); break;
    case "star":    shapeStar(ctx, cx, cy, r, mode); break;
    case "heart":   shapeHeart(ctx, cx, cy, r, mode); break;
    case "flower":  shapeFlower(ctx, cx, cy, r, mode); break;
    case "cloud":   shapeCloud(ctx, cx, cy, r, mode); break;
    case "diamond": shapeDiamond(ctx, cx, cy, r, mode); break;
    case "triangle": shapeTriangle(ctx, cx, cy, r, mode); break;
    case "butterfly": shapeButterfly(ctx, cx, cy, r, mode); break;
    case "ring":    shapeRing(ctx, cx, cy, r, mode); break;
    case "drop":    shapeDrop(ctx, cx, cy, r, mode); break;
  }
  ctx.restore();
}

function fillOrStroke(ctx, mode) {
  if (mode === "mask") ctx.fill(); else ctx.stroke();
}

function shapeCircle(ctx, cx, cy, r, mode) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  fillOrStroke(ctx, mode);
}

function shapeStar(ctx, cx, cy, r, mode) {
  const points = 5;
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  fillOrStroke(ctx, mode);
}

function shapeHeart(ctx, cx, cy, r, mode) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.6);
  ctx.bezierCurveTo(cx + r * 1.1, cy - r * 0.2, cx + r * 0.6, cy - r * 0.9, cx, cy - r * 0.3);
  ctx.bezierCurveTo(cx - r * 0.6, cy - r * 0.9, cx - r * 1.1, cy - r * 0.2, cx, cy + r * 0.6);
  ctx.closePath();
  fillOrStroke(ctx, mode);
}

function shapeFlower(ctx, cx, cy, r, mode) {
  // 6 petals around a center.
  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const px = cx + Math.cos(a) * r * 0.55;
    const py = cy + Math.sin(a) * r * 0.55;
    ctx.beginPath();
    ctx.arc(px, py, r * 0.4, 0, Math.PI * 2);
    fillOrStroke(ctx, mode);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.30, 0, Math.PI * 2);
  fillOrStroke(ctx, mode);
}

function shapeCloud(ctx, cx, cy, r, mode) {
  ctx.beginPath();
  ctx.arc(cx - r * 0.5, cy + r * 0.2, r * 0.45, 0, Math.PI * 2);
  ctx.arc(cx,           cy - r * 0.1, r * 0.55, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.5, cy + r * 0.2, r * 0.45, 0, Math.PI * 2);
  fillOrStroke(ctx, mode);
}

function shapeDiamond(ctx, cx, cy, r, mode) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  fillOrStroke(ctx, mode);
}

function shapeTriangle(ctx, cx, cy, r, mode) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.95, cy + r * 0.7);
  ctx.lineTo(cx - r * 0.95, cy + r * 0.7);
  ctx.closePath();
  fillOrStroke(ctx, mode);
}

function shapeButterfly(ctx, cx, cy, r, mode) {
  // Two ovals as wings + a body line.
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.55, cy - r * 0.15, r * 0.55, r * 0.75, -0.3, 0, Math.PI * 2);
  fillOrStroke(ctx, mode);
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.55, cy - r * 0.15, r * 0.55, r * 0.75,  0.3, 0, Math.PI * 2);
  fillOrStroke(ctx, mode);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.12, r * 0.55, 0, 0, Math.PI * 2);
  fillOrStroke(ctx, mode);
}

function shapeRing(ctx, cx, cy, r, mode) {
  // Ring = outer disc minus inner disc → produced as one path with
  // even-odd fill, then traced for line art.
  if (mode === "mask") {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function shapeDrop(ctx, cx, cy, r, mode) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx + r * 1.1, cy - r * 0.1, cx + r * 0.7, cy + r * 0.95, cx, cy + r * 0.95);
  ctx.bezierCurveTo(cx - r * 0.7, cy + r * 0.95, cx - r * 1.1, cy - r * 0.1, cx, cy - r);
  ctx.closePath();
  fillOrStroke(ctx, mode);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
