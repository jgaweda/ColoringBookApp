// Resolves a coloring page's line-art image and paired region label image.
// Falls back to programmatic placeholders so the canvas remains functional
// before any AI-generated assets ship.

const PAGE_W = 1024;
const PAGE_H = 1024;

/**
 * Try to load both the line-art and region mask images for a page.
 * Returns { lineArt: HTMLImageElement, mask: ImageData, w, h }.
 */
export async function loadPageAssets(page) {
  const lineArtUrl = `./assets/line-art/${page.lineArt.replace("LineArt/", "")}`;
  const maskUrl = `./assets/line-art/${page.regionMask.replace("LineArt/", "")}`;

  const lineArt = await loadImage(lineArtUrl).catch(() => null) || placeholderLineArt();
  const maskImg = await loadImage(maskUrl).catch(() => null) || placeholderMask();
  const mask = imageToImageData(maskImg);
  return { lineArt, mask, w: lineArt.naturalWidth || PAGE_W, h: lineArt.naturalHeight || PAGE_H };
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

/** Placeholder line art: a friendly nested-shapes stand-in. */
function placeholderLineArt() {
  const c = document.createElement("canvas");
  c.width = PAGE_W; c.height = PAGE_H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.strokeStyle = "#1C1C1E";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";

  // Outer rounded rect
  roundRect(ctx, 80, 80, PAGE_W - 160, PAGE_H - 160, 80);
  ctx.stroke();

  // Big sun-ish circle
  ctx.beginPath();
  ctx.arc(PAGE_W / 2, PAGE_H / 2 - 80, 220, 0, Math.PI * 2);
  ctx.stroke();

  // Smile
  ctx.beginPath();
  ctx.arc(PAGE_W / 2, PAGE_H / 2 - 80, 100, Math.PI * 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Eyes
  ctx.beginPath();
  ctx.arc(PAGE_W / 2 - 80, PAGE_H / 2 - 130, 14, 0, Math.PI * 2);
  ctx.arc(PAGE_W / 2 + 80, PAGE_H / 2 - 130, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#1C1C1E";
  ctx.fill();

  // Decorative star at the bottom
  drawStar(ctx, PAGE_W / 2 - 200, PAGE_H - 250, 5, 80, 35);
  drawStar(ctx, PAGE_W / 2,       PAGE_H - 220, 5, 90, 40);
  drawStar(ctx, PAGE_W / 2 + 200, PAGE_H - 250, 5, 80, 35);

  const img = new Image();
  img.src = c.toDataURL("image/png");
  // Build an HTMLImageElement-shaped object that draws synchronously.
  return makeImageBitmapShim(c);
}

/** Placeholder region mask: 5 distinct labels in solid colors. */
function placeholderMask() {
  const c = document.createElement("canvas");
  c.width = PAGE_W; c.height = PAGE_H;
  const ctx = c.getContext("2d");
  // Outer = label A
  ctx.fillStyle = "rgb(255, 90, 90)";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  // Rounded rect = label B
  ctx.fillStyle = "rgb(120, 200, 255)";
  roundRect(ctx, 80, 80, PAGE_W - 160, PAGE_H - 160, 80);
  ctx.fill();
  // Sun circle = label C
  ctx.fillStyle = "rgb(255, 220, 80)";
  ctx.beginPath();
  ctx.arc(PAGE_W / 2, PAGE_H / 2 - 80, 220, 0, Math.PI * 2);
  ctx.fill();
  // Stars = label D, E, F
  ctx.fillStyle = "rgb(180, 120, 255)";
  drawStar(ctx, PAGE_W / 2 - 200, PAGE_H - 250, 5, 80, 35); ctx.fill();
  ctx.fillStyle = "rgb(120, 255, 180)";
  drawStar(ctx, PAGE_W / 2,       PAGE_H - 220, 5, 90, 40); ctx.fill();
  ctx.fillStyle = "rgb(255, 180, 120)";
  drawStar(ctx, PAGE_W / 2 + 200, PAGE_H - 250, 5, 80, 35); ctx.fill();
  return makeImageBitmapShim(c);
}

function makeImageBitmapShim(canvas) {
  // Returns a thing that drawImage understands and that has naturalWidth/Height.
  canvas.naturalWidth = canvas.width;
  canvas.naturalHeight = canvas.height;
  return canvas;
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

function drawStar(ctx, cx, cy, points, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
