// Free-brush layer. Wraps a 2D canvas + Pointer Events to support finger,
// mouse, and Apple Pencil. Pressure is honored when reported by the platform.

export class BrushController {
  constructor(canvas, { onStrokeBegin, onStrokeEnd } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = "#FF3B30";
    this.size = 18;
    this.active = false;
    this.drawing = false;
    this._last = null;
    this._snapshotBefore = null;
    this.onStrokeBegin = onStrokeBegin;
    this.onStrokeEnd = onStrokeEnd;

    canvas.addEventListener("pointerdown", this._down);
    canvas.addEventListener("pointermove", this._move);
    canvas.addEventListener("pointerup", this._up);
    canvas.addEventListener("pointercancel", this._up);
    canvas.addEventListener("pointerleave", this._up);
  }

  setActive(active) {
    this.active = active;
    this.canvas.style.pointerEvents = active ? "auto" : "none";
  }
  setColor(hex) { this.color = hex; }
  setSize(px) { this.size = px; }

  /** Snapshot the current pixels so an undo can restore them. */
  snapshot() {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  restore(imageData) {
    this.ctx.putImageData(imageData, 0, 0);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _coords(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * this.canvas.width;
    const y = ((e.clientY - r.top) / r.height) * this.canvas.height;
    return { x, y };
  }

  _down = (e) => {
    if (!this.active) return;
    e.preventDefault();
    this.canvas.setPointerCapture?.(e.pointerId);
    this.drawing = true;
    this._snapshotBefore = this.snapshot();
    this._last = this._coords(e);
    this.onStrokeBegin?.();
    this._stroke(this._last, this._last, e.pressure || 0.5);
  };
  _move = (e) => {
    if (!this.active || !this.drawing) return;
    const cur = this._coords(e);
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      const c = this._coords(ev);
      this._stroke(this._last, c, ev.pressure || 0.5);
      this._last = c;
    }
    void cur; // ensure no-op for linters
  };
  _up = (e) => {
    if (!this.active || !this.drawing) return;
    this.drawing = false;
    this._last = null;
    this.canvas.releasePointerCapture?.(e.pointerId);
    const after = this.snapshot();
    const before = this._snapshotBefore;
    this._snapshotBefore = null;
    this.onStrokeEnd?.({ before, after });
  };

  _stroke(a, b, pressure) {
    const ctx = this.ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size * (0.5 + pressure);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}
