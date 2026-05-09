// Tap-to-fill core. Mirrors iOS RegionMask + PaintLayer.
// Each page ships with a region label image where every closed line-art
// region has a unique RGB. A tap maps to a region label, then we recolor
// every pixel sharing that label in the paint layer in O(N), cached so a
// repeat tap on the same region is O(1).

export class RegionMask {
  /**
   * @param {ImageData} imageData The region label image as raw pixels.
   */
  constructor(imageData) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.data = imageData.data; // Uint8ClampedArray, RGBA
    this._indexCache = new Map(); // labelKey -> Uint32Array of pixel indices
  }

  /**
   * Look up the label color at a normalized point (0..1).
   * Returns null on transparent or near-black (line-art) pixels.
   */
  labelAtNormalized(x, y) {
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    const px = Math.min(this.width - 1, Math.max(0, Math.floor(x * this.width)));
    const py = Math.min(this.height - 1, Math.max(0, Math.floor(y * this.height)));
    const i = (py * this.width + px) * 4;
    const r = this.data[i], g = this.data[i + 1], b = this.data[i + 2], a = this.data[i + 3];
    if (a < 8) return null;
    if (r < 24 && g < 24 && b < 24) return null;
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Indices into the paint layer's Uint32 buffer for every pixel matching a
   * given label, computed lazily and cached.
   */
  pixelIndices(label) {
    const cached = this._indexCache.get(label);
    if (cached) return cached;
    const total = this.width * this.height;
    const out = new Uint32Array(total);
    let n = 0;
    const targetR = (label >> 16) & 0xff;
    const targetG = (label >> 8) & 0xff;
    const targetB = label & 0xff;
    for (let i = 0; i < total; i++) {
      const j = i * 4;
      if (this.data[j] === targetR && this.data[j + 1] === targetG && this.data[j + 2] === targetB) {
        out[n++] = i;
      }
    }
    const indices = out.slice(0, n);
    this._indexCache.set(label, indices);
    return indices;
  }
}

/** PaintLayer: a Uint32 buffer behind the line-art layer. */
export class PaintLayer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.imageData = new ImageData(width, height);
    this.u32 = new Uint32Array(this.imageData.data.buffer);
  }

  /** Fill every pixel at `indices` with the given [r,g,b,a]. Returns prior values. */
  fill(indices, rgba) {
    const packed = pack(rgba);
    const prev = new Uint32Array(indices.length);
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      prev[k] = this.u32[i];
      this.u32[i] = packed;
    }
    return prev;
  }

  restore(indices, prev) {
    for (let k = 0; k < indices.length; k++) {
      this.u32[indices[k]] = prev[k];
    }
  }

  clear() {
    this.u32.fill(0);
  }

  replace(u32) {
    if (u32.length === this.u32.length) this.u32.set(u32);
  }

  draw(ctx) {
    ctx.putImageData(this.imageData, 0, 0);
  }
}

/** Convert [r,g,b,a] (0..255) to a little-endian RGBA Uint32 (the layout used by ImageData on every modern engine). */
function pack(rgba) {
  return ((rgba[3] & 0xff) << 24) | ((rgba[2] & 0xff) << 16) | ((rgba[1] & 0xff) << 8) | (rgba[0] & 0xff);
}
